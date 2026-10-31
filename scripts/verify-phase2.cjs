// Exercises only deterministic seed accounts and a temporary listing created here.
const fs = require('node:fs');
const {createHash,createHmac,randomUUID} = require('node:crypto');
const {execFileSync} = require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd());
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
const base = 'http://localhost:3000';
const checks = [];
const users = {};
let scratch;
let profileChanged = false;
let profile;
let revealBefore;
const marker = `Phase2-check-${randomUUID()}`;
function idFor(key) {
  const b=createHash('sha256').update(`propertylink-seed-v1:${key}`).digest().subarray(0,16);
  b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;
  const h=b.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function auth(user) {
  const iat=Math.floor(Date.now()/1000);
  const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const b=Buffer.from(JSON.stringify({userId:user.id,email:user.email,primaryRole:user.userRoles[0].role.code,tokenVersion:user.token_version,iat,exp:iat+1800,iss:'propertylink'})).toString('base64url');
  return `${h}.${b}.${createHmac('sha256',process.env.AUTH_SECRET).update(`${h}.${b}`).digest('base64url')}`;
}
function check(label,pass) { checks.push({label,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${label}`);if(!pass)throw new Error(label); }
async function api(label,method,url,role,status,body) {
  const response=await fetch(base+url,{method,headers:{authorization:`Bearer ${auth(users[role])}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  const data=await response.json();check(`${label} HTTP ${status}`,response.status===status);return data;
}
async function snapshot() {
  return {users:await p.user.count(),listings:await p.listing.count(),images:await p.listingImage.count(),inquiries:await p.inquiry.count(),notifications:await p.notification.count(),favorites:await p.favorite.count(),contacts:await p.contact_history.count()};
}
async function main() {
  const before=await snapshot();
  execFileSync(process.execPath,['scripts/seed-db.cjs'],{stdio:'pipe'});
  check('Seed rerun preserves record counts',JSON.stringify(before)===JSON.stringify(await snapshot()));
  for(const key of ['buyer-001','buyer-002','seller-001','admin-001']) {
    users[key]=await p.user.findUnique({where:{id:idFor(`user:${key}`)},include:{userRoles:{include:{role:true}}}});
    if(!users[key])throw new Error('Run seed before phase2 verification.');
  }
  const categories=await (await fetch(base+'/api/categories')).json();
  check('Database category exposed as Single house',categories.categories.some(c=>c.code==='house'&&c.name==='Single house'));
  const listings=await (await fetch(base+'/api/listings?category=house&limit=100')).json();
  check('Search category names come from DB',listings.listings.length>0&&listings.listings.every(l=>l.category.code==='house'&&l.category.name==='Single house'));
  const seeded=await p.listing.findUnique({where:{id:idFor('listing:prop-001')},include:{images:true}});
  const detail=await (await fetch(base+`/api/listings/${seeded.id}`)).json();
  check('Detail has DB category name and mapped image fields',detail.listing.category.name==='Single house'&&detail.listing.images.every(i=>typeof i.image_url==='string'));
  const contactCount=await p.listing.count({where:{listingNo:{startsWith:'SEED-'},contactPhone:{not:null},contactEmail:{not:null},contactLine:{not:null}}});
  check('All 10 seed listings persist Phone Email LINE',contactCount===10);
  check('Detail exposes published email and LINE',detail.listing.contactEmail===seeded.contactEmail&&!!seeded.contactEmail&&detail.listing.contactLine===seeded.contactLine&&!!seeded.contactLine);
  check('Public detail and list omit protected phone',!('contactPhone' in detail.listing)&&listings.listings.every(l=>!('contactPhone' in l)));
  await api('Seller cannot bypass Buyer phone reveal','POST',`/api/listings/${seeded.id}/reveal-phone`,'seller-001',403);
  revealBefore=(await p.phone_reveals.findMany({where:{buyer_id:users['buyer-001'].id,listing_id:seeded.id},select:{id:true}})).map(r=>r.id);
  const contact=await api('Buyer reveals seeded listing phone','POST',`/api/listings/${seeded.id}/reveal-phone`,'buyer-001',200);
  check('Revealed phone equals stored listing contact',contact.phone===seeded.contactPhone&&!!seeded.contactPhone);
  const favorites=await api('Nonempty Favorites serialization','GET','/api/buyer/favorites','buyer-001',200);
  check('Seed buyer favorites are populated',favorites.favorites.some(l=>l.id===seeded.id));
  for(const buyer of ['buyer-001','buyer-002']) {
    const inquiries=await api(`${buyer} inquiries`,'GET',`/api/inquiries?buyerId=${users[buyer==='buyer-001'?'buyer-002':'buyer-001'].id}`,buyer,200);
    const expected=await p.inquiry.count({where:{buyerId:users[buyer].id}});
    check(`${buyer} populated ownership filter`,inquiries.inquiries.length===expected&&expected>0&&inquiries.inquiries.every(i=>i.buyerId===users[buyer].id));
  }
  const otherInquiry=idFor('inquiry:inq-002');
  await api('Buyer A cannot read Buyer B messages','GET',`/api/inquiries/${otherInquiry}/messages`,'buyer-001',404);
  await api('Buyer A cannot update Buyer B inquiry','PUT',`/api/inquiries/${otherInquiry}`,'buyer-001',404,{status:'CLOSED'});
  await api('Buyer A cannot post to Buyer B inquiry','POST',`/api/inquiries/${otherInquiry}/messages`,'buyer-001',404,{message:marker});
  const notifications=await api('Seller seeded notifications','GET','/api/notifications','seller-001',200);
  check('Populated notifications scoped to seller',notifications.notifications.length>0&&notifications.notifications.every(n=>n.userId===users['seller-001'].id));
  await api('Buyer cannot mark seller notification read','PUT',`/api/notifications/${notifications.notifications[0].id}/read`,'buyer-001',404,{});
  profile={firstName:users['buyer-001'].firstName,lastName:users['buyer-001'].lastName};
  profileChanged=true;
  await api('Account profile save','PUT','/api/users/me','buyer-001',200,{firstName:'Phase2 verification',lastName:profile.lastName});
  const saved=await api('Account profile persisted','GET','/api/users/me','buyer-001',200);
  check('Profile update read-back',saved.user.firstName==='Phase2 verification');
  await api('Restore seed profile','PUT','/api/users/me','buyer-001',200,profile);profileChanged=false;
  const draft=await api('Create temporary listing','POST','/api/listings','seller-001',201,{title:marker,price:1234567,categoryId:String(seeded.categoryId),locationId:String(seeded.location_id),sellerId:users['buyer-002'].id});
  scratch=draft.listing.id;
  check('Listing seller comes from session',draft.listing.sellerId===users['seller-001'].id);
  const edited=await api('Seller edit serializes BigInt','PUT',`/api/seller/listings/${scratch}`,'seller-001',200,{title:marker+' edited'});
  check('Edited listing response is JSON-safe',typeof edited.listing.categoryId==='string');
  await api('Attach sample HTTPS image URLs','POST',`/api/listings/${scratch}/images`,'seller-001',201,{images:seeded.images.slice(0,3).map(i=>i.image_url)});
  await api('Submit temporary listing','PUT',`/api/listings/${scratch}/submit`,'seller-001',200,{});
  const moderated=await api('Admin approve serializes BigInt','PUT',`/api/admin/listings/${scratch}/moderate`,'admin-001',200,{action:'APPROVE'});
  check('Moderated listing response is JSON-safe',typeof moderated.listing.categoryId==='string'&&moderated.listing.status==='APPROVED');
  await api('Buyer saves temporary favorite','POST','/api/favorites','buyer-001',201,{listingId:scratch});
  const populated=await api('Favorites after save','GET','/api/buyer/favorites','buyer-001',200);
  check('Saved favorite visible with nonempty nested data',populated.favorites.some(l=>l.id===scratch&&l.category.name==='Single house'));
  await api('Buyer removes temporary favorite','DELETE',`/api/favorites/${scratch}`,'buyer-001',200);
  const sold=await api('Seller status serializes BigInt','PUT',`/api/seller/listings/${scratch}/status`,'seller-001',200,{status:'SOLD'});
  check('Sold listing response is JSON-safe',typeof sold.listing.categoryId==='string'&&sold.listing.status==='SOLD');
}
main().catch(error=>{if(!checks.some(c=>!c.pass))checks.push({label:'Unexpected verification error',pass:false});console.error('Verification stopped:',error.name);process.exitCode=1;}).finally(async()=>{
  try {
    if(revealBefore)await p.phone_reveals.deleteMany({where:{buyer_id:idFor('user:buyer-001'),listing_id:idFor('listing:prop-001'),id:{notIn:revealBefore}}});
    if(profileChanged&&profile)await p.user.update({where:{id:idFor('user:buyer-001')},data:profile});
    if(scratch)await p.$transaction(async tx=>{
      await tx.notification.deleteMany({where:{userId:idFor('user:seller-001'),body:{contains:marker}}});
      await tx.moderation_actions.deleteMany({where:{listing_id:scratch}});
      await tx.listing_status_history.deleteMany({where:{listing_id:scratch}});
      await tx.listing.deleteMany({where:{id:scratch,sellerId:idFor('user:seller-001')}});
    });
    check('Temporary listing cleaned up',!scratch||await p.listing.count({where:{id:scratch}})===0);
  }catch(error){checks.push({label:'Cleanup',pass:false});process.exitCode=1;console.error('Cleanup failed:',error.name);}
  fs.writeFileSync('PHASE2_VERIFICATION_RESULTS.json',JSON.stringify({at:new Date().toISOString(),summary:{passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length},checks},null,2)+'\n');
  await p.$disconnect();
});
