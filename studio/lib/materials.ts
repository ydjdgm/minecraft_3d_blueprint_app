import {Ingredient,itemById,itemName,placementById,Recipe,recipesByItem} from './catalog';
export type Choices={recipes:Record<string,string>;ingredients:Record<string,string>};
export type MaterialNode={id:string;required:number;recipe:Recipe|null;batches:number;produced:number;surplus:number;ingredients:{id:string;count:number;slot:number;options:string[]}[];reason?:string};
// Common gathered resources should not default to recycling their own storage blocks.
const acquired=new Set(['iron_ingot','gold_ingot','copper_ingot','diamond','emerald','coal','charcoal','redstone','lapis_lazuli','quartz','raw_iron','raw_gold','raw_copper','slime_ball','bone','bone_meal','honeycomb','amethyst_shard','wheat','leather']);
export function defaultRecipe(id:string):Recipe|null{
 if(acquired.has(id))return null;
 const candidates=(recipesByItem.get(id)||[]).filter(r=>!r.ingredients.some(i=>i.options.includes(id)));
 return candidates.sort((a,b)=>rank(a,id)-rank(b,id)||a.id.localeCompare(b.id))[0]||null;
}
function rank(r:Recipe,id:string){return (r.id===id?0:20)+(r.method.startsWith('crafting')?0:r.method==='stonecutting'?5:r.method==='smelting'?7:10)+(/from_.*(?:block|nuggets)|from_smelting_.*(?:sword|pickaxe|helmet)/.test(r.id)?100:0);}
export function choiceKey(r:Recipe,slot:number){return `${r.id}:${slot}`;}
export function chooseIngredient(r:Recipe,slot:number,choices:Choices){const ing=r.ingredients[slot],chosen=choices.ingredients[choiceKey(r,slot)];if(ing.options.includes(chosen))return chosen;return [...ing.options].sort((a,b)=>ingredientRank(a)-ingredientRank(b)||a.localeCompare(b))[0];}
function ingredientRank(id:string){if(['oak_planks','oak_log','egg','stone','cobblestone','sand','coal'].includes(id))return -20;if(id.startsWith('stripped_'))return 10;if(id.endsWith('_log'))return -10;return 0;}
export function recipeLabel(r:Recipe){return r.ingredients.map(i=>`${itemName(i.options[0])}${i.options.length>1?' 등':''} × ${i.count}`).join(' + ')+` → ${r.count}개`;}
export function requiredItems(blocks:{type:string}[]){const counts=new Map<string,number>();for(const b of blocks){const item=placementById.get(b.type);if(!item)throw Error(`알 수 없는 설치물: ${b.type}`);counts.set(item.id,(counts.get(item.id)||0)+1);}return [...counts].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));}
export function materialPlan(required:{id:string;count:number}[],choices:Choices={recipes:{},ingredients:{}}){
 const nodes=new Map<string,MaterialNode>(),warnings:string[]=[];
 function visit(id:string,path:string[]){
  if(nodes.has(id))return;
  if(!itemById.has(id))throw Error(`알 수 없는 아이템: ${id}`);
  const chosen=choices.recipes[id];let recipe=chosen==='gather'?null:chosen?(recipesByItem.get(id)||[]).find(r=>r.id===chosen)||defaultRecipe(id):defaultRecipe(id);
  const node:MaterialNode={id,required:0,recipe,batches:0,produced:0,surplus:0,ingredients:[]};nodes.set(id,node);
  if(!recipe)return;
  const selected=recipe.ingredients.map((i,slot)=>({id:chooseIngredient(recipe!,slot,choices),count:i.count,slot,options:i.options}));
  if(path.length>=48||selected.some(i=>[...path,id].includes(i.id))){node.recipe=null;node.reason='순환 제작법 · 직접 준비';warnings.push(`${itemName(id)}: 순환 또는 자기 복제 제작법이므로 직접 준비합니다.`);return;}
  node.ingredients=selected;for(const i of selected)visit(i.id,[...path,id]);
 }
 for(const {id,count} of required){if(!Number.isSafeInteger(count)||count<0||count>16000)throw Error('올바르지 않은 재료 수량');if(count)visit(id,[]);}
 const degrees=new Map([...nodes.keys()].map(id=>[id,0]));for(const n of nodes.values())for(const id of new Set(n.ingredients.map(i=>i.id)))degrees.set(id,degrees.get(id)!+1);
 for(const {id,count} of required){const n=nodes.get(id);if(n)n.required+=count;}
 const queue=[...nodes.keys()].filter(id=>degrees.get(id)===0),ordered:MaterialNode[]=[];const returned=new Map<string,number>();let heatBatches=0;
 for(let index=0;index<queue.length;index++){
  const n=nodes.get(queue[index])!;if(n.required>1e9)throw Error('하위 재료 계산 범위가 너무 큽니다.');
  if(n.recipe){n.batches=Math.ceil(n.required/n.recipe.count);n.produced=n.batches*n.recipe.count;n.surplus=n.produced-n.required;
   for(const i of n.ingredients){const quantity=i.count*n.batches;nodes.get(i.id)!.required+=quantity;const container=({milk_bucket:'bucket',water_bucket:'bucket',lava_bucket:'bucket',honey_bottle:'glass_bottle',dragon_breath:'glass_bottle'} as Record<string,string>)[i.id];if(container)returned.set(container,(returned.get(container)||0)+quantity);}
   if(['smelting','blasting','smoking'].includes(n.recipe.method))heatBatches+=n.batches;
  }
  ordered.push(n);for(const id of new Set(n.ingredients.map(i=>i.id))){degrees.set(id,degrees.get(id)!-1);if(degrees.get(id)===0)queue.push(id);}
 }
 if(ordered.length!==nodes.size)throw Error('제작법 순환을 해결하지 못했습니다. 직접 준비를 선택하세요.');
 return {nodes:ordered.filter(n=>n.required),base:ordered.filter(n=>!n.recipe&&n.required).sort((a,b)=>b.required-a.required),steps:ordered.filter(n=>n.recipe&&n.required),warnings,heatBatches,returned:[...returned].map(([id,count])=>({id,count}))};
}
