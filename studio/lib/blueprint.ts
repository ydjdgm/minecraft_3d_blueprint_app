import {placementById} from './catalog';
export {palette} from './catalog';
export type Block = {x:number;y:number;z:number;type:string;facing?:string};
export type Blueprint = {version:1;name:string;blocks:Block[]};
export type Operation = {action:'set'|'remove'|'fill';from:number[];to:number[];type:string;facing:string};
export type Plan = {summary:string;operations:Operation[]};
export const key = (b:Pick<Block,'x'|'y'|'z'>) => `${b.x},${b.y},${b.z}`;
export function validate(input:unknown):Blueprint {
  const d=input as Blueprint;
  if(!d||d.version!==1||typeof d.name!=='string'||!d.name.trim()||d.name.length>80||!Array.isArray(d.blocks)||d.blocks.length>16000)throw Error('올바른 설계도가 아닙니다. 최대 16,000블록까지 지원합니다.');
  const seen=new Set<string>();
  const blocks=d.blocks.map(b=>{
    if(!b||![b.x,b.y,b.z].every(Number.isInteger)||b.x<0||b.x>47||b.z<0||b.z>47||b.y<0||b.y>47||!placementById.has(b.type)|| (b.facing!==undefined&&!['north','south','east','west','up','down'].includes(b.facing)))throw Error('지원하지 않는 블록, 방향 또는 좌표입니다 (0–47).');
    if(seen.has(key(b)))throw Error('중복된 블록 좌표가 있습니다.'); seen.add(key(b));
    return {x:b.x,y:b.y,z:b.z,type:b.type,...(b.facing?{facing:b.facing}:{})};
  }); return {version:1,name:d.name.trim(),blocks};
}
export function applyPlan(d:Blueprint,plan:Plan):Blueprint{
  if(!plan||typeof plan.summary!=='string'||!Array.isArray(plan.operations)||plan.operations.length>150)throw Error('AI 변경 계획이 올바르지 않습니다.');
  const map=new Map(d.blocks.map(b=>[key(b),b]));let work=0;
  for(const op of plan.operations){
    if(!['set','remove','fill'].includes(op.action)||!Array.isArray(op.from)||!Array.isArray(op.to)||op.from.length!==3||op.to.length!==3||![...op.from,...op.to].every(n=>Number.isInteger(n)&&n>=0&&n<=47)||!placementById.has(op.type)||!['north','south','east','west','up','down'].includes(op.facing))throw Error('AI가 잘못된 편집 명령을 생성했습니다.');
    const end=op.action==='fill'?op.to:op.from;
    for(let x=Math.min(op.from[0],end[0]);x<=Math.max(op.from[0],end[0]);x++)for(let y=Math.min(op.from[1],end[1]);y<=Math.max(op.from[1],end[1]);y++)for(let z=Math.min(op.from[2],end[2]);z<=Math.max(op.from[2],end[2]);z++){
      if(++work>32000)throw Error('한 번에 수정할 수 있는 범위를 넘었습니다. 요청을 나눠 주세요.');const b={x,y,z,type:op.type,facing:op.facing}; if(op.action==='remove')map.delete(key(b));else map.set(key(b),b);
    }
  }return validate({...d,blocks:[...map.values()]});
}
export function cottage():Blueprint{
  const m=new Map<string,Block>(); const set=(x:number,y:number,z:number,type:string)=>{const b={x,y,z,type};m.set(key(b),b);};
  for(let x=6;x<=22;x++)for(let z=6;z<=22;z++)set(x,0,z,'grass_block');
  for(let x=10;x<=18;x++)for(let z=10;z<=18;z++){
    set(x,1,z,'cobblestone');
    for(let y=2;y<=6;y++)if(x===10||x===18||z===10||z===18){let type=(x===10||x===18)&&(z===10||z===18)?'oak_log':'oak_planks';if(y>=3&&y<=4&&((x>=12&&x<=13)||(x>=15&&x<=16))&&(z===10||z===18))type='glass';set(x,y,z,type);}
  }
  for(let y=2;y<=4;y++)m.delete(`14,${y},18`);
  for(let i=0;i<=5;i++)for(let z=9;z<=19;z++){set(9+i,7+i,z,'spruce_planks');set(19-i,7+i,z,'spruce_planks');}
  for(let y=7;y<=10;y++)for(let x=10+(y-7);x<=18-(y-7);x++){set(x,y,10,'oak_planks');set(x,y,18,'oak_planks');}
  for(let z=19;z<=22;z++){set(14,1,z,'cobblestone');set(13,1,z,'cobblestone');}
  for(let y=1;y<=5;y++)set(8,y,8,'oak_log');
  for(let x=6;x<=10;x++)for(let z=6;z<=10;z++)for(let y=5;y<=7;y++)if(Math.abs(x-8)+Math.abs(z-8)+(y-5)<5)set(x,y,z,'oak_leaves');
  for(let y=8;y<=12;y++)set(17,y,12,'bricks');
  return {version:1,name:'숲속의 작은 오두막',blocks:[...m.values()]};
}
