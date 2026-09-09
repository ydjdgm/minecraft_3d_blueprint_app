import data from './generated/minecraft-26.2.json';
export type Item={id:string;name:string;english:string;stack:number;color:string;category:string;placement?:{id:string;kind:string}};
export type Ingredient={options:string[];count:number;tag?:string};
export type Recipe={id:string;method:string;output:string;count:number;ingredients:Ingredient[]};
export const catalogMeta=data.meta;
export const items:Item[]=data.items;
export const itemById=new Map(items.map(i=>[i.id,i]));
export const placeableItems=items.filter(i=>i.placement);
export const placementById=new Map(placeableItems.map(i=>[i.placement!.id,i]));
export const palette:[string,string,string,string][]=placeableItems.map(i=>[i.placement!.id,i.name,i.color,i.category]);
export const recipes:Recipe[]=data.recipes;
export const recipesByItem=new Map<string,Recipe[]>();
for(const r of recipes)recipesByItem.set(r.output,[...(recipesByItem.get(r.output)||[]),r]);
export const specialRecipeItems=new Set(data.special.map(r=>'output' in r?r.output:undefined).filter(Boolean));
export const methodLabels:Record<string,string>={crafting_shaped:'조합',crafting_shapeless:'조합',stonecutting:'석재 절단기',smelting:'화로',blasting:'용광로',smoking:'훈연기',campfire_cooking:'모닥불',smithing_transform:'대장장이 작업대',crafting_transmute:'변환 조합',crafting_decorated_pot:'장식된 도자기 조합'};
export function itemName(id:string){return itemById.get(id)?.name||id;}
export function stackText(id:string,count:number){const stack=itemById.get(id)?.stack||64;return stack===1?'겹쳐 쌓을 수 없음':`${Math.floor(count/stack)} 스택 + ${count%stack}개 (${stack}개/스택)`;}
export function matchesItem(item:Item,search:string){const q=search.trim().toLocaleLowerCase().replace(/^minecraft:/,'');return !q||[item.id,item.name,item.english,item.placement?.id||''].some(s=>s.toLocaleLowerCase().includes(q));}
