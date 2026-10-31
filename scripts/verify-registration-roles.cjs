// Real password/OTP/cookie flow using temporary accounts; secrets stay in memory.
const fs = require('node:fs');
const {randomBytes,randomInt,randomUUID} = require('node:crypto');
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
const base = 'http://localhost:3000';
const checks = [];
const fixtures = [];
function check(label,pass) {
  checks.push({label,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${label}`);
  if(!pass)throw new Error('Registration verification failed.');
}
async function request(label,method,url,expected,body,cookie) {
  const response = await fetch(base+url,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await response.json();
  if(response.status!==expected)console.log('Request result:',response.status,typeof data.error==='string'?data.error:'Unexpected response');
  check(`${label} (HTTP ${response.status})`,response.status===expected);
  return {data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function main() {
  for(const role of ['owner','admin','buyer','seller']) {
    const email=`register-check-${role}-${randomUUID()}@example.invalid`;
    fixtures.push(email);
    const password=randomBytes(24).toString('base64url');
    const registration=await request(`${role}: register 201`,'POST','/api/auth/register',201,{email,password,firstName:'Registration',lastName:'Verification',phone:`+6698${randomInt(10000000,99999999)}`,role,termsAccepted:true});
    const id=registration.data.userId;
    const roles=await p.userRole.findMany({where:{userId:id},include:{role:true}});
    check(`${role}: exactly one matching DB role`,roles.length===1&&roles[0].role.code===role);
    await request(`${role}: unverified login denied`,'POST','/api/auth/login',403,{email,password});
    await request(`${role}: verify OTP 200`,'POST','/api/auth/verify-otp',200,{userId:id,otpCode:registration.data.devOtp});
    const login=await request(`${role}: password login 200`,'POST','/api/auth/login',200,{email,password});
    check(`${role}: session cookie and role returned`,!!login.cookie&&login.data.user.primaryRole===role.toUpperCase());
    const me=await request(`${role}: cookie authenticates profile`,'GET','/api/users/me',200,undefined,login.cookie);
    check(`${role}: profile identity matches`,me.data.user.id===id&&me.data.user.roles.length===1&&me.data.user.roles[0]===role.toUpperCase());
    const dashboard={owner:'/api/owner/dashboard',admin:'/api/admin/listings/pending',buyer:'/api/buyer/favorites',seller:'/api/seller/listings'}[role];
    await request(`${role}: role dashboard API 200`,'GET',dashboard,200,undefined,login.cookie);
    await request(`${role}: logout 200`,'POST','/api/auth/logout',200,{},login.cookie);
    await request(`${role}: revoked session rejected`,'GET','/api/users/me',401,undefined,login.cookie);
  }
}
main().catch(error=>{if(!checks.some(c=>!c.pass))checks.push({label:'Unexpected test failure',pass:false});console.error(error.name);process.exitCode=1;}).finally(async()=>{
  try {
    for(const email of fixtures) {
      const user=await p.user.findUnique({where:{email},select:{id:true}});
      if(!user)continue;
      await p.$transaction(async tx=>{
        await tx.user_consents.deleteMany({where:{user_id:user.id}});
        await tx.otp_verifications.deleteMany({where:{user_id:user.id}});
        await tx.userRole.deleteMany({where:{userId:user.id}});
        await tx.user.delete({where:{id:user.id,email}});
      });
    }
    check('Temporary registration accounts removed',await p.user.count({where:{email:{in:fixtures}}})===0);
  }catch(error){checks.push({label:'Temporary-account cleanup',pass:false});process.exitCode=1;console.error('Cleanup:',error.name);}
  fs.writeFileSync('REGISTRATION_VERIFICATION_RESULTS.json',JSON.stringify({at:new Date().toISOString(),summary:{passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length},checks},null,2)+'\n');
  await p.$disconnect();
});
