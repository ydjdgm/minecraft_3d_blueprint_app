import assert from 'node:assert/strict';
const origin='http://localhost:5173',id=crypto.randomUUID().replaceAll('-','');
// The bundled preview plugin's loopback-only simulated account; never production auth.
const cookie='__sites_local_auth=1';
const document={version:1,name:'공유 링크 검증 🏠',blocks:[{x:0,y:0,z:0,type:'oak_planks',facing:'north'}]};
let created=false;
try{
 const create=await fetch(origin+'/api/shares',{method:'POST',headers:{origin,cookie,'Content-Type':'application/json'},body:JSON.stringify({id,document})});
 assert.equal(create.status,201,await create.text());created=true;
 const read=await fetch(origin+'/api/shares/'+id);assert.equal(read.status,200);assert.deepEqual((await read.json()).document,document);
 const page=await fetch(origin+'/share/'+id);assert.equal(page.status,200);await page.text();
 const list=await fetch(origin+'/api/shares',{headers:{cookie}});assert.equal(list.status,200);assert((await list.json()).shares.some(s=>s.id===id));
 const revoke=await fetch(origin+'/api/shares/'+id,{method:'DELETE',headers:{origin,cookie}});assert.equal(revoke.status,200);created=false;
 assert.equal((await fetch(origin+'/api/shares/'+id)).status,404);
 console.log('PASS: local Worker/D1 HTTP create, read, preview route, owner list, revoke and revoked-link 404. Test share removed.');
}finally{if(created)await fetch(origin+'/api/shares/'+id,{method:'DELETE',headers:{origin,cookie}});}
