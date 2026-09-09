import {Block} from './blueprint';
export type Cuboid=[number,number,number,number,number,number];
export function blockBoxes(b:Block):Cuboid[]{
 if(b.type.endsWith('_slab'))return b.facing==='up'?[[0,.5,0,1,1,1]]:[[0,0,0,1,.5,1]];
 if(b.type.endsWith('_stairs')){const base:Cuboid=[0,0,0,1,.5,1];const upper:Record<string,Cuboid>={north:[0,.5,0,1,1,.5],south:[0,.5,.5,1,1,1],east:[.5,.5,0,1,1,1],west:[0,.5,0,.5,1,1]};return [base,upper[b.facing||'north']||upper.north];}
 if(['redstone_wire','repeater','lever'].includes(b.type))return [[0,0,0,1,.15,1]];
 return [[0,0,0,1,1,1]];
}
export function isFullCube(b:Block){const boxes=blockBoxes(b);return boxes.length===1&&boxes[0].every((n,i)=>n===(i<3?0:1));}
export function fitCamera(blocks:Block[],width:number,height:number){
 const angle=-.72,pitch=.62;const mins=[0,1,2].map(i=>blocks.length?Math.min(...blocks.map(b=>[b.x,b.y,b.z][i])):0),maxs=[0,1,2].map(i=>blocks.length?Math.max(...blocks.map(b=>[b.x,b.y,b.z][i]))+1:16);
 const center=mins.map((n,i)=>(n+maxs[i])/2),points:number[][]=[];
 for(const x of [mins[0],maxs[0]])for(const y of [mins[1],maxs[1]])for(const z of [mins[2],maxs[2]]){const u=(x-center[0])*Math.cos(angle)-(z-center[2])*Math.sin(angle),v=(x-center[0])*Math.sin(angle)+(z-center[2])*Math.cos(angle);points.push([u,v*Math.sin(pitch)-(y-center[1])*Math.cos(pitch)]);}
 const span=[0,1].map(i=>Math.max(...points.map(p=>p[i]))-Math.min(...points.map(p=>p[i])));
 const zoom=Math.max(.5,Math.min(65,Math.max(60,width-130)/span[0],Math.max(60,height-150)/span[1]));
 return {angle,pitch,zoom,panX:0,panY:0,center};
}
