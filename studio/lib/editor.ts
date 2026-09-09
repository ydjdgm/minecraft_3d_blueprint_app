import {Block,Blueprint,key,validate} from './blueprint';
import {Choices} from './materials';
export type Progress={choices:Choices;done:string[];layers:Record<string,string>};
export type Entry={id:string;document:Blueprint;progress:Progress;updated:string};
export type Library={version:1;active:string;entries:Entry[]};
export type EditHistory={undo:Entry[];redo:Entry[]};
export function recordEdit(entry:Entry,input:Blueprint,history:EditHistory){const document=validate(input);if(sameDocument(entry.document,document))return {entry,history};return {entry:{...entry,document,updated:new Date().toISOString()},history:{undo:[...history.undo.slice(-39),entry],redo:[]}};}
export function travelHistory(entry:Entry,history:EditHistory,forward=false){const source=forward?history.redo:history.undo,next=source.at(-1);if(!next)return {entry,history};return {entry:next,history:forward?{undo:[...history.undo,entry],redo:source.slice(0,-1)}:{undo:source.slice(0,-1),redo:[...history.redo,entry]}};}
export const emptyProgress=():Progress=>({choices:{recipes:{},ingredients:{}},done:[],layers:{}});
export function sameDocument(a:Blueprint,b:Blueprint){return a.name===b.name&&a.blocks.length===b.blocks.length&&diffBlocks(a.blocks,b.blocks).length===0;}
export type Change={block:Block;kind:'added'|'removed'|'replaced'};
export function diffBlocks(before:Block[],after:Block[]):Change[]{const old=new Map(before.map(b=>[key(b),b]));const changes:Change[]=[];for(const b of after){const prev=old.get(key(b));if(!prev)changes.push({block:b,kind:'added'});else if(prev.type!==b.type||(prev.facing||'north')!==(b.facing||'north'))changes.push({block:b,kind:'replaced'});old.delete(key(b));}for(const block of old.values())changes.push({block,kind:'removed'});return changes;}
export function regionEdit(doc:Blueprint,from:number[],to:number[],action:string,type:string,facing:string,replace:string){
 if(from.length!==3||to.length!==3||![...from,...to].every(n=>Number.isInteger(n)&&n>=0&&n<=47))throw Error('영역 좌표는 0–47의 정수여야 합니다.');
 if(!['fill','erase','replace'].includes(action))throw Error('지원하지 않는 영역 작업입니다.');
 const lo=from.map((n,i)=>Math.min(n,to[i])),hi=from.map((n,i)=>Math.max(n,to[i]));
 const inside=(b:Block)=>[b.x,b.y,b.z].every((n,i)=>n>=lo[i]&&n<=hi[i]);
 let blocks=doc.blocks;
 if(action==='fill'){const volume=hi.reduce((n,v,i)=>n*(v-lo[i]+1),1);const rest=blocks.filter(b=>!inside(b));if(rest.length+volume>16000)throw Error('설계도는 최대 16,000블록까지 지원합니다.');blocks=[...rest];for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)blocks.push({x,y,z,type,facing});}
 else if(action==='erase')blocks=blocks.filter(b=>!inside(b));
 else blocks=blocks.map(b=>inside(b)&&(!replace||b.type===replace)?{...b,type,facing}:b);
 return validate({...doc,blocks});
}
export function layerSignature(blocks:Block[],y:number){return JSON.stringify(blocks.filter(b=>b.y===y).map(b=>[b.x,b.z,b.type,b.facing||'north']).sort((a,b)=>String(a).localeCompare(String(b))));}
export function readLibrary(input:unknown):Library{
 const v=input as Library;if(!v||v.version!==1||!Array.isArray(v.entries)||!v.entries.length||v.entries.length>100)throw Error('보관함 파일 형식이 올바르지 않습니다 (최대 100개).');
 const seen=new Set<string>();const entries=v.entries.map(e=>{if(!e||typeof e.id!=='string'||!e.id||seen.has(e.id))throw Error('설계도 ID가 올바르지 않습니다.');seen.add(e.id);const p=e.progress||emptyProgress();if(!p.choices||!p.choices.recipes||!p.choices.ingredients||!Array.isArray(p.done)||!p.done.every(s=>typeof s==='string')||!p.layers||![p.choices.recipes,p.choices.ingredients,p.layers].every(o=>typeof o==='object'&&!Array.isArray(o)&&Object.values(o).every(s=>typeof s==='string')))throw Error('준비 상태가 올바르지 않습니다.');return {id:e.id,document:validate(e.document),progress:p,updated:typeof e.updated==='string'?e.updated:''};});
 if(!seen.has(v.active))throw Error('활성 설계도를 찾을 수 없습니다.');return {version:1,active:v.active,entries};
}
