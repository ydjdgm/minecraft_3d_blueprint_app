import {validate} from './blueprint';
export const shareIdPattern=/^[a-f0-9]{32}$/;
const LIMIT=1_800_000;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
type Deps={database:()=>D1Database;user:()=>Promise<{userId:string}|null>};
export function shareApi(deps:Deps){
 async function handle(request:Request,id?:string):Promise<Response>{
  try{
   if(id&&!shareIdPattern.test(id))return json({error:'공유 링크를 찾을 수 없습니다.'},404);
   const write=request.method==='POST'||request.method==='DELETE';
   if(write&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'현재 사이트에서 다시 시도하세요.'},403);
   if(request.method==='GET'&&id){const row=await deps.database().prepare('SELECT name, snapshot, created_at FROM blueprint_shares WHERE id = ? AND block_count >= 0').bind(id).first<{name:string;snapshot:string;created_at:string}>();if(!row)return json({error:'공유가 해제되었거나 존재하지 않는 링크입니다.'},404);return json({document:validate(JSON.parse(row.snapshot)),createdAt:row.created_at});}
   const user=await deps.user();if(!user)return json({error:'링크를 만들거나 관리하려면 로그인하세요.',signIn:'/signin-with-chatgpt?return_to=%2F'},401);
   const db=deps.database();
   if(request.method==='GET'){const result=await db.prepare('SELECT id, name, block_count AS blockCount, created_at AS createdAt FROM blueprint_shares WHERE owner_id = ? AND block_count >= 0 ORDER BY created_at DESC').bind(user.userId).all();return json({shares:result.results});}
   if(request.method==='DELETE'&&id){const result=await db.prepare('UPDATE blueprint_shares SET snapshot = ?, name = ?, block_count = -1 WHERE id = ? AND owner_id = ? AND block_count >= 0').bind('', '', id,user.userId).run();return result.meta.changes?json({revoked:true}):json({error:'링크를 찾을 수 없거나 해제 권한이 없습니다.'},404);}
   if(request.method!=='POST'||id)return json({error:'지원하지 않는 요청입니다.'},405);
   if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON 형식으로 요청하세요.'},415);
   if(Number(request.headers.get('content-length')||0)>LIMIT)return json({error:'공유할 설계도가 너무 큽니다.'},413);
   const reader=request.body?.getReader();if(!reader)return json({error:'설계도가 비어 있습니다.'},400);let length=0;const chunks:Uint8Array[]=[];
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMIT){await reader.cancel();return json({error:'공유할 설계도가 너무 큽니다.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   let body,document;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!shareIdPattern.test(body?.id||''))throw Error('요청 ID가 올바르지 않습니다.');document=validate(body.document);}catch{return json({error:'설계도 형식 또는 좌표를 확인하세요.'},400);}
   const snapshot=JSON.stringify(document),createdAt=new Date().toISOString();
   // Atomic limit and unique id: retrying a successful request cannot create another link.
   await db.prepare('INSERT OR IGNORE INTO blueprint_shares (id, owner_id, name, block_count, snapshot, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM blueprint_shares WHERE owner_id = ? AND block_count >= 0) < 100').bind(body.id,user.userId,document.name,document.blocks.length,snapshot,createdAt,user.userId).run();
   const row=await db.prepare('SELECT owner_id, snapshot, created_at FROM blueprint_shares WHERE id = ?').bind(body.id).first<{owner_id:string;snapshot:string;created_at:string}>();
   if(!row)return json({error:'공유 링크는 최대 100개입니다. 사용하지 않는 링크를 해제하세요.'},409);
   if(row.owner_id!==user.userId||row.snapshot!==snapshot)return json({error:'공유 요청이 충돌했습니다. 창을 닫고 다시 시도하세요.'},409);
   return json({id:body.id,path:`/share/${body.id}`,name:document.name,blockCount:document.blocks.length,createdAt:row.created_at},201);
  }catch(error){console.error('Share storage unavailable',error instanceof Error?error.message:'Unknown error');return json({error:'공유 저장소에 연결하지 못했습니다. 잠시 후 다시 시도하세요.'},503);}
 }
 return handle;
}
