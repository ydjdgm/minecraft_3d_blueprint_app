import {build} from 'esbuild';
import assert from 'node:assert/strict';
const bundled = await build({entryPoints:['app/api/blueprint/route.ts'],bundle:true,write:false,format:'esm',platform:'node',target:'node22'});
const {POST} = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const document = {version:1,name:'AI 테스트',blocks:[]};
const plan = {summary:'돌벽',operations:[{action:'fill',from:[0,0,0],to:[2,2,0],type:'stone_bricks',facing:'north'}]};
const request = (body) => new Request('http://localhost/api/blueprint',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost'},body:JSON.stringify(body)});
const success = (provider, text=JSON.stringify(plan)) => provider==='openai'
  ? {status:'completed',output:[{content:[{type:'output_text',text}]}]}
  : provider==='anthropic' ? {stop_reason:'end_turn',content:[{type:'text',text}]}
  : {candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text}]}}]};
const originalFetch = globalThis.fetch;
try {
  for (const provider of ['openai','anthropic','google']) {
    const apiKey = provider==='google'?'AIza-test-key':provider==='anthropic'?'sk-ant-test-key':'sk-test-key';
    const body = {provider,apiKey,model:'test-model',prompt:'벽을 만들어 줘',document};
    const calls=[];
    const mock = (reply, status=200) => {
      calls.length=0;
      globalThis.fetch=async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return Response.json(reply,{status});};
    };
    mock(success(provider));
    let response=await POST(request(body));
    assert.equal(response.status,200,provider);
    assert.deepEqual(await response.json(),plan);
    assert.equal(calls.length,1);
    const sent=calls[0];
    assert.equal(sent.init.redirect,'error');
    assert.ok(sent.init.signal instanceof AbortSignal);
    assert.ok(!sent.url.includes(apiKey));
    assert.ok(!sent.init.body.includes(apiKey));
    const headers=new Headers(sent.init.headers);
    if(provider==='openai') {
      assert.equal(sent.url,'https://api.openai.com/v1/responses');
      assert.equal(headers.get('authorization'),`Bearer ${apiKey}`);
      assert.equal(headers.get('x-api-key'),null);
      assert.equal(sent.body.store,false);
      assert.equal(sent.body.text.format.strict,true);
      assert.equal(sent.body.text.format.schema.properties.operations.maxItems,150);
    } else if(provider==='anthropic') {
      assert.equal(sent.url,'https://api.anthropic.com/v1/messages');
      assert.equal(headers.get('x-api-key'),apiKey);
      assert.equal(headers.get('anthropic-version'),'2023-06-01');
      assert.equal(headers.get('authorization'),null);
      const schema=sent.body.output_config.format.schema;
      assert.ok(!JSON.stringify(schema).includes('maxItems'));
      assert.ok(!JSON.stringify(schema).includes('minItems'));
      assert.match(schema.properties.operations.description,/150/);
      assert.match(schema.properties.operations.items.properties.from.description,/3/);
      assert.equal(schema.additionalProperties,false);
    } else {
      assert.equal(sent.url,'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent');
      assert.equal(headers.get('x-goog-api-key'),apiKey);
      assert.equal(headers.get('authorization'),null);
      assert.equal(sent.body.generationConfig.responseMimeType,'application/json');
      assert.equal(sent.body.generationConfig.responseJsonSchema.properties.operations.maxItems,150);
    }
    // Invalid plans must be repaired through the SAME provider, at most once.
    const invalid={...plan,operations:[{...plan.operations[0],from:[48,0,0]}]};
    calls.length=0;
    globalThis.fetch=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return Response.json(success(provider,JSON.stringify(calls.length===1?invalid:plan)));};
    response=await POST(request(body));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),plan);
    assert.equal(calls.length,2);
    assert.equal(calls[0].url,calls[1].url);
    assert.match(JSON.stringify(calls[1].body),/Previous output failed validation/);
    assert.deepEqual(document.blocks,[]);
    for(const invalidText of [JSON.stringify(invalid),'not json']) {
      mock(success(provider,invalidText));
      assert.equal((await POST(request(body))).status,422);
      assert.equal(calls.length,2);
    }
    for(const [upstream,status] of [[400,502],[401,401],[403,403],[404,502],[429,429],[500,502]]) {
      mock({error:{message:`private error ${apiKey}`}},upstream);
      response=await POST(request(body));
      assert.equal(response.status,status);
      assert.ok(!(await response.text()).includes(apiKey));
      assert.equal(calls.length,1);
    }
    const unfinished=provider==='openai'?{...success(provider),status:'incomplete'}
      :provider==='anthropic'?{...success(provider),stop_reason:'max_tokens'}
      :{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify(plan)}]}}]};
    const refusal=provider==='openai'?{status:'completed',output:[{content:[{type:'refusal'}]}]}
      :provider==='anthropic'?{stop_reason:'refusal',content:[]}
      :{promptFeedback:{blockReason:'SAFETY'}};
    for(const reply of [unfinished,refusal,success(provider,'')]) {
      mock(reply);
      assert.equal((await POST(request(body))).status,422);
      assert.equal(calls.length,1);
    }
    globalThis.fetch=async()=>{throw new DOMException('timeout','TimeoutError');};
    response=await POST(request(body));
    assert.match((await response.json()).error,/시간이 초과/);
    console.log(`PASS: ${provider} routing, credentials, schema, generation, repair, errors and incomplete output`);
  }
  let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json(success('openai'));};
  const base={apiKey:'sk-test',model:'test-model',prompt:'벽',document};
  for(const provider of ['unknown','__proto__','constructor','',null,{}]) assert.equal((await POST(request({...base,provider}))).status,400);
  for(const apiKey of ['', ' ', 'abc\nsecret', 'a b','x'.repeat(513)]) assert.equal((await POST(request({...base,apiKey}))).status,400);
  for(const model of ['../secret','test?key=secret','']) assert.equal((await POST(request({...base,model}))).status,400);
  assert.equal(calls,0);
  assert.equal((await POST(request(base))).status,200); // Existing clients default to OpenAI.
  assert.equal(calls,1);
  console.log('PASS: unsupported providers, malformed keys/models and backwards-compatible OpenAI requests');
} finally {globalThis.fetch=originalFetch;}
