import {build} from 'esbuild';
import assert from 'node:assert/strict';
async function moduleAt(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',target:'node22'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {validate,cottage,applyPlan}=await moduleAt('lib/blueprint.ts');
const d=validate(cottage());assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);
assert.throws(()=>validate({}));assert.throws(()=>validate({...d,blocks:[...d.blocks,d.blocks[0]]}));assert.throws(()=>validate({...d,blocks:[{x:-1,y:0,z:0,type:'oak_log'}]}));
const empty={version:1,name:'한글 🏠',blocks:[]};assert.deepEqual(validate(JSON.parse(JSON.stringify(empty))),empty);
const plan={summary:'벽 만들기',operations:[{action:'fill',from:[0,0,0],to:[2,2,0],type:'stone_bricks',facing:'north'}]};
const changed=applyPlan(empty,plan);assert.equal(changed.blocks.length,9);assert.equal(empty.blocks.length,0);
assert.equal(applyPlan(changed,{summary:'삭제',operations:[{action:'remove',from:[1,1,0],to:[1,1,0],type:'stone_bricks',facing:'north'}]}).blocks.length,8);
assert.throws(()=>applyPlan(empty,{...plan,operations:[{...plan.operations[0],to:[48,1,1]}]}));assert.throws(()=>applyPlan(empty,{...plan,operations:[{...plan.operations[0],type:'bad'}]}));assert.throws(()=>applyPlan(empty,{...plan,operations:[{...plan.operations[0],to:[47,47,47]}]}));
const {POST}=await moduleAt('app/api/blueprint/route.ts');const req=(body,origin='http://localhost')=>new Request('http://localhost/api/blueprint',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
assert.equal((await POST(req({}))).status,400);assert.equal((await POST(req({},'https://evil.example'))).status,403);
const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});};
let r=await POST(req({apiKey:'sk-test',prompt:'벽 만들어 줘',model:'test-model',document:empty}));assert.equal(r.status,200);assert.deepEqual(await r.json(),plan);assert.equal(calls,1);
calls=0;globalThis.fetch=async()=>{calls++;return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({...plan,operations:[{...plan.operations[0],type:'invalid'}]})}]}]});};
r=await POST(req({apiKey:'sk-test',prompt:'벽',model:'test-model',document:empty}));assert.equal(r.status,422);assert.equal(calls,2);
globalThis.fetch=async()=>new Response('',{status:401});assert.equal((await POST(req({apiKey:'sk-test',prompt:'벽',model:'test-model',document:empty}))).status,401);globalThis.fetch=original;
console.log('PASS: Unicode document round trip, malformed documents, duplicate/bounds checks, atomic edits, operation budgets, API origin/auth validation, mocked generation and bounded repair.');
