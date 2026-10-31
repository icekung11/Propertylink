// Read-only database checks and HTTP probes. Mutation probes use invalid input,
// anonymous requests, or a randomly generated missing record ID.
const fs = require('node:fs');
const path = require('node:path');
const { createHmac, randomUUID } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const base = process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const missing = randomUUID();
const results = [];
const skipped = [];
const sessions = {};

function token(user, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId: user.id, email: user.email, primaryRole: user.userRoles[0].role.code,
    tokenVersion: user.token_version, iat: now, exp: now + 1800,
    iss: 'propertylink', ...overrides,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac('sha256', process.env.AUTH_SECRET).update(unsigned).digest('base64url')}`;
}

async function probe(label, method, url, expected, options = {}) {
  try {
    const headers = {};
    const auth = options.token || sessions[options.role]?.token;
    if (auth) headers.authorization = `Bearer ${auth}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.headers) Object.assign(headers, options.headers);
    const response = await fetch(base + url, {
      method, headers, signal: AbortSignal.timeout(20000),
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    const valid = options.check ? !!options.check(data) : true;
    const result = { label, method, path: url, expected, actual: response.status,
      pass: expected === response.status && valid, validation: valid,
      format: data === null ? 'non-JSON' : 'JSON' };
    results.push(result);
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${label}: ${response.status}`);
    return data;
  } catch (error) {
    results.push({label, method, path: url, expected, actual: null, pass: false, error: error.name});
    console.log(`FAIL ${label}: ${error.name}`);
    return null;
  }
}

async function main() {
  const routes = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === 'route.ts') {
        const apiPath = '/' + path.relative('src/app', path.dirname(file)).split(path.sep).join('/');
        for (const match of fs.readFileSync(file, 'utf8').matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g)) {
          routes.push({method: match[1], path: apiPath});
        }
      }
    }
  }
  walk('src/app/api');
  const contracts = [...fs.readFileSync('API_INVENTORY.md', 'utf8').matchAll(/^\|\s*(\d+)\s*\|[^|]*\|\s*(GET|POST|PUT|DELETE|PATCH)\s*\|\s*`([^`]+)`/gm)]
    .map(m => ({number: Number(m[1]), method: m[2], path: m[3].replace(/:([^/]+)/g, '[$1]')}));
  const missingContracts = contracts.filter(c => !routes.some(r => r.method === c.method && r.path === c.path));
  const identity = await prisma.$queryRawUnsafe('SELECT current_user AS role, current_database() AS database');
  const users = await prisma.user.findMany({where: {status: 'active', deleted_at: null},
    select: {id: true, email: true, token_version: true, userRoles: {select: {role: {select: {code: true}}}}}});
  const roleCounts = {};
  const configured = Buffer.byteLength(process.env.AUTH_SECRET || '', 'utf8') >= 32;
  for (const user of users) {
    if (user.userRoles.length !== 1) continue;
    const role = user.userRoles[0].role.code;
    roleCounts[role] = (roleCounts[role] || 0) + 1;
    if (configured && !sessions[role]) sessions[role] = {user, token: token(user)};
  }
  const dbCounts = {users: await prisma.user.count(), listings: await prisma.listing.count(),
    approved: await prisma.listing.count({where: {status: 'APPROVED'}}),
    inquiries: await prisma.inquiry.count(), notifications: await prisma.notification.count(),
    favorites: await prisma.favorite.count()};
  const approved = await prisma.listing.findFirst({where: {status: 'APPROVED'}, select: {id: true}});
  const draft = await prisma.listing.findFirst({where: {status: 'DRAFT'}, select: {id: true}});
  await probe('Categories read', 'GET', '/api/categories', 200, {check: d => Array.isArray(d?.categories)});
  await probe('Locations read', 'GET', '/api/locations', 200, {check: d => Array.isArray(d?.locations)});
  await probe('Approved listings read', 'GET', '/api/listings?limit=100', 200,
    {check: d => d?.total === dbCounts.approved && d.listings.every(l => l.status === 'APPROVED')});
  await probe('Client status cannot expose drafts', 'GET', '/api/listings?status=DRAFT&limit=100', 200,
    {check: d => d?.total === dbCounts.approved && d.listings.every(l => l.status === 'APPROVED')});
  await probe('Invalid pagination rejected', 'GET', '/api/listings?limit=-1', 400);
  await probe('Missing listing', 'GET', `/api/listings/${missing}`, 404);
  await probe('Malformed listing ID', 'GET', '/api/listings/not-a-uuid', 400);
  if (approved) {
    await probe('Approved detail', 'GET', `/api/listings/${approved.id}`, 200, {check: d => d?.listing?.status === 'APPROVED'});
    await probe('Approved images', 'GET', `/api/listings/${approved.id}/images`, 200, {check: d => Array.isArray(d?.images)});
  }
  if (draft) {
    await probe('Draft detail private', 'GET', `/api/listings/${draft.id}`, 404);
    await probe('Draft images private', 'GET', `/api/listings/${draft.id}/images`, 404);
  }
  for (const c of contracts) {
    if (c.path.startsWith('/api/auth/') || ['GET /api/categories','GET /api/locations','GET /api/listings','GET /api/listings/[id]'].includes(`${c.method} ${c.path}`)) continue;
    await probe(`Anonymous ${c.method} ${c.path}`, c.method, c.path.replace(/\[[^\]]+\]/g, missing), 401,
      c.method === 'GET' ? {} : {body: {}});
  }
  await probe('Forged identity header', 'GET', '/api/users/me', 401, {headers: {'x-user-id': users[0]?.id || missing}});
  await probe('Login required fields', 'POST', '/api/auth/login', 400, {body: {}});
  await probe('Unknown login rejected', 'POST', '/api/auth/login', 401,
    {body: {email: `${missing}@example.invalid`, password: 'Audit-invalid-password'}});
  await probe('Register required fields', 'POST', '/api/auth/register', 400, {body: {}});
  await probe('Unsupported registration role rejected', 'POST', '/api/auth/register', 400,
    {body: {email: `${missing}@example.invalid`, password: 'Audit-invalid-password',firstName:'Audit',lastName:'Check',phone:'0891234567',role:'superadmin',termsAccepted:true}});
  await probe('OTP required fields', 'POST', '/api/auth/verify-otp', 400, {body: {}});
  await probe('Anonymous logout clears cookie', 'POST', '/api/auth/logout', 200, {body: {}});
  await probe('Mock seed disabled', 'GET', '/api/seed-mock', 410);
  await probe('Fallback property image asset', 'GET', '/placeholder-property.svg', 200);
  for (const [role, session] of Object.entries(sessions)) {
    await probe(`${role} own profile`, 'GET', `/api/users/me?userId=${missing}`, 200,
      {role, check: d => d?.user?.id === session.user.id});
    await probe(`${role} own notifications`, 'GET', `/api/notifications?userId=${missing}`, 200,
      {role, check: d => Array.isArray(d?.notifications) && d.notifications.every(n => n.userId === session.user.id)});
  }
  if (sessions.buyer) {
    await probe('Profile rejects empty update', 'PUT', '/api/users/me', 400, {role:'buyer',body:{}});
    await probe('Inquiry rejects empty creation', 'POST', '/api/inquiries', 400, {role:'buyer',body:{}});
    await probe('Favorite rejects empty creation', 'POST', '/api/favorites', 400, {role:'buyer',body:{}});
    await probe('Missing inquiry cannot be updated', 'PUT', `/api/inquiries/${missing}`, 404, {role:'buyer',body:{status:'CLOSED'}});
    await probe('Missing inquiry cannot receive message', 'POST', `/api/inquiries/${missing}/messages`, 404, {role:'buyer',body:{message:'Audit missing-record validation'}});
    await probe('Missing notification cannot be updated', 'PUT', `/api/notifications/${missing}/read`, 404, {role:'buyer',body:{}});
    await probe('Notification pagination rejects fractions', 'GET', '/api/notifications?limit=1.5', 400, {role:'buyer'});
    await probe('Buyer favorites', 'GET', '/api/buyer/favorites', 200, {role: 'buyer',check: d => Array.isArray(d?.favorites) && d.favorites.every(l => l.status === 'APPROVED')});
    await probe('Buyer inquiries owner filter', 'GET', `/api/inquiries?buyerId=${missing}&sellerId=${missing}`, 200,
      {role:'buyer',check:d => Array.isArray(d?.inquiries) && d.inquiries.every(i => i.buyerId === sessions.buyer.user.id || i.sellerId === sessions.buyer.user.id)});
    await probe('Buyer cannot read seller dashboard', 'GET', '/api/seller/listings', 403, {role:'buyer'});
    await probe('Buyer cannot read admin queue', 'GET', '/api/admin/listings/pending', 403, {role:'buyer'});
    await probe('Buyer cannot read owner dashboard', 'GET', '/api/owner/dashboard', 403, {role:'buyer'});
    await probe('Buyer cannot create seller listing', 'POST', '/api/listings', 403, {role:'buyer',body:{sellerId: missing}});
    await probe('Missing inquiry messages', 'GET', `/api/inquiries/${missing}/messages`, 404, {role:'buyer'});
    const baseToken = sessions.buyer.token;
    const parts = baseToken.split('.');
    parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
    await probe('Tampered signed session', 'GET', '/api/users/me', 401, {token:parts.join('.')});
    await probe('Expired signed session', 'GET', '/api/users/me', 401, {token:token(sessions.buyer.user,{iat:1,exp:2})});
    await probe('DB role overrides signed role claim', 'GET', '/api/owner/dashboard', 403,
      {token:token(sessions.buyer.user,{primaryRole:'owner'})});
  }
  if (sessions.seller) {
    await probe('Listing rejects empty creation', 'POST', '/api/listings', 400, {role:'seller',body:{}});
    await probe('Missing seller listing cannot be edited', 'PUT', `/api/seller/listings/${missing}`, 404, {role:'seller',body:{title:'Audit missing-record validation'}});
    await probe('Missing seller listing cannot be sold', 'PUT', `/api/seller/listings/${missing}/status`, 404, {role:'seller',body:{status:'SOLD'}});
    await probe('Missing seller listing cannot be submitted', 'PUT', `/api/listings/${missing}/submit`, 404, {role:'seller',body:{}});
    await probe('Seller pagination rejects fractions', 'GET', '/api/seller/listings?limit=1.5', 400, {role:'seller'});
    await probe('Seller own listings', 'GET', `/api/seller/listings?sellerId=${missing}`, 200,
      {role:'seller', check:d=>Array.isArray(d?.listings)&&d.listings.every(l=>l.sellerId===sessions.seller.user.id)});
    await probe('Seller own inquiries', 'GET', '/api/inquiries', 200,
      {role:'seller',check:d=>Array.isArray(d?.inquiries)&&d.inquiries.every(i=>i.buyerId===sessions.seller.user.id||i.sellerId===sessions.seller.user.id)});
  }
  if (sessions.admin) {
    await probe('Admin pending queue', 'GET', '/api/admin/listings/pending', 200, {role:'admin'});
    await probe('Missing listing cannot be moderated', 'PUT', `/api/admin/listings/${missing}/moderate`, 404, {role:'admin',body:{action:'APPROVE'}});
  }
  if (sessions.owner) {
    for (const url of ['/api/owner/dashboard','/api/owner/admins','/api/owner/audit-logs'])
      await probe(`Owner ${url}`, 'GET', url, 200, {role:'owner'});
    await probe('Missing user cannot become admin', 'POST', '/api/owner/admins', 404, {role:'owner',body:{userId:missing}});
    await probe('Audit pagination rejects fractions', 'GET', '/api/owner/audit-logs?limit=1.5', 400, {role:'owner'});
  }
  for (const role of ['buyer','seller','admin','owner']) if(!sessions[role]) skipped.push(configured
    ? `No active single-role ${role} account for signed-session GET probes`
    : `${role} signed-session probes blocked: AUTH_SECRET missing or shorter than 32 bytes`);
  skipped.push('This read-only suite does not execute password login, registration/OTP or successful business writes. Separate workflow and browser suites cover non-SMS password/session/business flows.');
  skipped.push('Signed test sessions exercise guards and existing data reads; they do not verify password login. No token or secret is saved.');
  skipped.push('RLS and browser interactions are outside this read-only suite; run test:rls and test:browser separately. This suite does not create populated cross-buyer inquiry fixtures.');
  const ts = require('typescript');
  const Module = require('node:module');
  const adapterModule = new Module(path.resolve('src/lib/property-adapter.ts'));
  adapterModule._compile(ts.transpileModule(fs.readFileSync('src/lib/property-adapter.ts','utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, path.resolve('src/lib/property-adapter.ts'));
  const adapterImages = adapterModule.exports.adaptListing({id:missing,images:[{image_url:'https://example.invalid/audit.jpg'}]}).images;
  const contactAdapter = adapterModule.exports.adaptListing({id:missing,contactEmail:'seed@example.invalid',contactLine:'@seed'});
  const sourceChecks = {imageAdapterAcceptsDatabaseImageUrl:adapterImages.length===1,
    listingContactMapping:contactAdapter.sellerEmail==='seed@example.invalid'&&contactAdapter.sellerLine==='@seed'};
  const constraints = await prisma.$queryRawUnsafe("SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.user_roles'::regclass AND contype IN ('u','p') ORDER BY conname");
  const registry = await prisma.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists");
  const roleIndexes = await prisma.$queryRawUnsafe("SELECT indexname AS name, indexdef AS definition FROM pg_indexes WHERE schemaname='public' AND tablename='user_roles' ORDER BY indexname");
  const rlsTables = await prisma.$queryRawUnsafe("SELECT relname AS table, relrowsecurity AS enabled, relforcerowsecurity AS forced FROM pg_class WHERE oid IN ('public.inquiries'::regclass,'public.audit_logs'::regclass,'public.user_consents'::regclass) ORDER BY relname");
  const report = {at:new Date().toISOString(), base, database:identity[0], authConfigured:configured,
    inventory:{required:contracts.length,methods:routes.length,routeFiles:new Set(routes.map(r=>r.path)).size,missingContracts},
    dbCounts,activeRoleCounts:roleCounts,sourceChecks,databaseMetadata:{userRoleConstraints:constraints,userRoleIndexes:roleIndexes,rlsTables,migrationRegistry:registry[0].exists},summary:{passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length},results,skipped};
  fs.writeFileSync('SYSTEM_RECHECK_RESULTS.json', JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({inventory:report.inventory,dbCounts,activeRoleCounts:roleCounts,summary:report.summary,skipped},null,2));
}
main().catch(error=>{console.error('Audit failed:',error.name,error.code||'');process.exitCode=1;}).finally(()=>prisma.$disconnect());
