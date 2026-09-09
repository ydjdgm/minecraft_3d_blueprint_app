import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='outputs/minecraft-26.2';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const registry=read('registries.json'),components=read('components.json'),ko=read('ko_kr.json'),en=read('extracted/assets/minecraft/lang/en_us.json');
const blockIds=new Set(registry.block),itemIds=new Set(registry.item),placements=new Map();
// Identity block/item registrations, including collections registered by helper functions.
for(const id of registry.item)if(id!=='air'&&blockIds.has(id))placements.set(id,{id,kind:'block'});
// Read mismatched item/block names from the official Items class (seeds, redstone, crops, string...).
const bytecode=fs.readFileSync(path.join(root,'items-bytecode.txt'),'utf8');
let section='';for(const line of bytecode.slice(bytecode.indexOf('static {};')).split('\n')){
 section+=line+'\n';const field=line.match(/putstatic.*\/\/ Field ([A-Z_0-9]+):Lnet\/minecraft\/world\/item\/Item;/);
 if(field){const id=field[1].toLowerCase();const block=section.match(/Field net\/minecraft\/world\/level\/block\/Blocks\.([A-Z_0-9]+):Lnet\/minecraft\/world\/level\/block\/Block;/);if(itemIds.has(id)&&!placements.has(id)&&block&&/registerBlock|createBlockItem|BlockItemIds/.test(section)&&id!=='air')placements.set(id,{id:block[1].toLowerCase(),kind:'block'});section='';}
}
// Persistent placeable entities are useful in a building blueprint. Mob spawn eggs and projectiles aren't placements.
for(const id of registry.item){if(/(?:^|_)(boat|raft|minecart)$/.test(id)||['armor_stand','item_frame','glow_item_frame','painting','end_crystal'].includes(id))placements.set(id,{id,kind:'entity'});if(id.endsWith('_bucket')&&id!=='milk_bucket')placements.set(id,{id:({water_bucket:'water',lava_bucket:'lava',powder_snow_bucket:'powder_snow'})[id]||id,kind:['water_bucket','lava_bucket'].includes(id)?'fluid':id==='powder_snow_bucket'?'block':'entity'});}
const colors={white:'#deded5',orange:'#ce782d',magenta:'#ad4bb3',light_blue:'#65abc9',yellow:'#dcba34',lime:'#8bae35',pink:'#d993a4',gray:'#535b5e',light_gray:'#a2a8a4',cyan:'#398d96',purple:'#774fa4',blue:'#475eac',brown:'#785139',green:'#587141',red:'#b2493d',black:'#303436'};
// WHEAT is registered as a plain Item in official Items bytecode; WHEAT_SEEDS places the wheat block.
assert(/ItemIds\.WHEAT:/.test(bytecode));placements.delete('wheat');
function color(id){if(id==='water_bucket')return '#477fae';if(id==='lava_bucket')return '#e78327';if(id==='oak_planks')return '#b88a52';if(id==='oak_log')return '#715338';if(id==='spruce_planks')return '#594735';for(const [c,hex] of Object.entries(colors).sort((a,b)=>b[0].length-a[0].length))if(id.startsWith(c+'_'))return hex;if(/redstone/.test(id))return '#b73538';if(/sulfur/.test(id))return '#c9ca6a';if(/copper/.test(id))return /oxidized|weathered/.test(id)?'#569e85':'#bb7855';if(/gold/.test(id))return '#dfbf51';if(/iron/.test(id))return '#c1c7c5';if(/diamond/.test(id))return '#63c6c5';if(/emerald/.test(id))return '#4eb677';if(/glass/.test(id))return '#a6d8df';if(/leaves|grass|moss|sapling|vine|fern/.test(id))return '#739654';if(/log|wood|planks|chest|barrel|crafting|sign|boat/.test(id))return /cherry/.test(id)?'#cc9b99':/birch/.test(id)?'#c5bb8c':/spruce|dark_oak/.test(id)?'#624936':'#a7895c';if(/brick/.test(id)&&!/(stone|deepslate|tuff|mud|quartz|end|prismarine)/.test(id))return '#ac6451';if(/sand|end_stone/.test(id))return '#ccbf87';if(/nether|blackstone|obsidian/.test(id))return '#50444c';return '#8b9793';}
function category(id,kind){if(kind==='entity'||kind==='fluid')return '설치물';if(/redstone|repeater|comparator|piston|lever|button|pressure_plate|rail|observer|dispenser|dropper|hopper|target|tripwire|daylight|crafter|sculk_sensor|tnt|bulb|copper_golem/.test(id))return '레드스톤';if(/log|leaves|sapling|grass|dirt|sand$|gravel|ore$|flower|tulip|orchid|fern|vine|mushroom|coral|kelp|wheat|carrot|potato|beetroot|seeds|pod$|berries|moss|bush|sugar_cane|cactus|bamboo$|ice$|snow$/.test(id))return '자연';if(/torch|lantern|sign|banner|bed$|head$|skull|candle|carpet|pot$|shelf|chain|bars|bell|painting/.test(id))return '장식';return '건축';}
const items=registry.item.map(id=>{const c=components[id];assert(c,`Missing components: ${id}`);const k=c['minecraft:item_name']?.translate||`item.minecraft.${id}`;const placement=placements.get(id);return {id,name:ko[k]||en[k]||id,english:en[k]||id,stack:c['minecraft:max_stack_size']||1,color:color(id),category:placement?category(id,placement.kind):'아이템',...(placement?{placement}:{}),...(c['minecraft:use_remainder']?{remainder:c['minecraft:use_remainder']}:{}),...(c['minecraft:craft_remainder']?{remainder:c['minecraft:craft_remainder']}:{} )};});
const tagDir=path.join(root,'extracted/data/minecraft/tags/item');const tags={};
function tag(id,seen=new Set()){if(tags[id])return tags[id];assert(!seen.has(id),`Tag cycle: ${id}`);seen=new Set([...seen,id]);const file=path.join(tagDir,id+'.json');assert(fs.existsSync(file),`Missing tag ${id}`);const d=JSON.parse(fs.readFileSync(file,'utf8'));return tags[id]=[...new Set(d.values.flatMap(v=>{const raw=typeof v==='string'?v:v.id;return raw.startsWith('#')?tag(raw.slice(1).replace('minecraft:',''),seen):[raw.replace('minecraft:','')];}))].filter(v=>itemIds.has(v));}
function ingredient(raw){if(Array.isArray(raw))return {options:[...new Set(raw.flatMap(x=>ingredient(x).options))].sort()};if(typeof raw==='object'){if(raw.item)return ingredient(raw.item);if(raw.tag)return ingredient('#'+raw.tag);}assert.equal(typeof raw,'string');const isTag=raw.startsWith('#');const id=raw.replace(/^#?minecraft:/,'');const options=isTag?tag(id):[id];assert(options.length&&options.every(x=>itemIds.has(x)),`Bad ingredient ${raw}`);return {options:[...options].sort(),...(isTag?{tag:id}:{})};}
const recipes=[],special=[];const recipeDir=path.join(root,'extracted/data/minecraft/recipe');
for(const file of fs.readdirSync(recipeDir).sort()){
 const d=JSON.parse(fs.readFileSync(path.join(recipeDir,file),'utf8')),method=d.type.replace('minecraft:',''),id=file.replace('.json','');
 const out=typeof d.result==='string'?d.result:d.result?.id;
 let ingredients=[];
 if(method==='crafting_shaped')ingredients=d.pattern.join('').split('').filter(c=>c!==' ').map(c=>ingredient(d.key[c]));
 else if(method==='crafting_shapeless')ingredients=d.ingredients.map(ingredient);
 else if(['stonecutting','smelting','blasting','smoking','campfire_cooking'].includes(method))ingredients=[ingredient(d.ingredient)];
 else if(method==='smithing_transform')ingredients=[d.template,d.base,d.addition].map(ingredient);
 else if(method==='crafting_transmute'&&d.input&&d.material)ingredients=[ingredient(d.input),ingredient(d.material)];
 else {special.push({id,method,...(out?{output:out.replace('minecraft:','')}:{})});continue;}
 if(!out){special.push({id,method});continue;}
 const groups=new Map();for(const i of ingredients){const k=JSON.stringify(i);const prev=groups.get(k);if(prev)prev.count++;else groups.set(k,{...i,count:1});}
 const output=out.replace('minecraft:','');assert(itemIds.has(output),`Unknown output ${output}`);recipes.push({id,method,output,count:d.result?.count||d.count||1,ingredients:[...groups.values()]});
}
// Decorated pot has a data-dependent pattern, but four bricks is an exact vanilla plain-pot recipe.
if(!recipes.some(r=>r.output==='decorated_pot'))recipes.push({id:'decorated_pot_plain',method:'crafting_decorated_pot',output:'decorated_pot',count:1,ingredients:[{options:['brick'],count:4}]});
assert.equal(items.length,1537);assert.equal(placements.get('redstone')?.id,'redstone_wire');assert.equal(placements.get('wheat_seeds')?.id,'wheat');assert(!placements.has('iron_ingot'));
const sources=read('sources.json');const content={meta:{version:'26.2',edition:'Java Edition',items:items.length,placeable:items.filter(i=>i.placement).length,recipes:recipes.length,specialRecipes:special.length,sources,generatedAt:new Date().toISOString(),classification:'Official block registrations plus persistent entity and filled-bucket placements; excludes spawn eggs and projectiles.'},items,recipes,special};
fs.mkdirSync('lib/generated',{recursive:true});fs.writeFileSync('lib/generated/minecraft-26.2.json',JSON.stringify(content));
fs.writeFileSync('lib/generated/minecraft-26.2.sha256',createHash('sha256').update(JSON.stringify(content)).digest('hex')+'\n');
console.log(content.meta);console.log('Non-identity placements:',items.filter(i=>i.placement&&i.id!==i.placement.id).map(i=>[i.id,i.placement.id]));
