import {build} from 'esbuild';
import assert from 'node:assert/strict';
async function moduleAt(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',target:'node22'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const c=await moduleAt('lib/catalog.ts'),m=await moduleAt('lib/materials.ts'),b=await moduleAt('lib/blueprint.ts');
assert.equal(c.items.length,1537);assert.equal(new Set(c.items.map(i=>i.id)).size,1537);assert.equal(c.placeableItems.length,c.placementById.size);
for(const id of ['iron_ingot','diamond_sword','wheat','milk_bucket','zombie_spawn_egg','snowball','air'])assert.equal(c.itemById.get(id).placement,undefined,id);
for(const id of ['iron_block','wheat_seeds','armor_stand','painting','water_bucket','powder_snow_bucket','oak_boat','sulfur_cube_bucket','string','redstone'])assert(c.itemById.get(id).placement,id);
assert.equal(c.placementById.get('redstone_wire').id,'redstone');assert.equal(c.placementById.get('wheat').id,'wheat_seeds');assert.equal(c.itemById.get('armor_stand').stack,16);assert.equal(c.itemById.get('water_bucket').stack,1);
assert(c.matchesItem(c.itemById.get('iron_block'),'철 블록'));assert(c.matchesItem(c.itemById.get('iron_block'),'IRON_BLOCK'));
const plan=(required,choices={recipes:{},ingredients:{}})=>m.materialPlan(required,choices),find=(p,id)=>p.nodes.find(n=>n.id===id);
let p=plan([{id:'iron_block',count:2}]);assert.equal(find(p,'iron_ingot').required,18);assert.equal(p.base.length,1);assert.equal(find(p,'iron_block').batches,2);
p=plan([{id:'iron_block',count:2},{id:'iron_ingot',count:3}]);assert.equal(find(p,'iron_ingot').required,21);
p=plan([{id:'chest',count:1},{id:'oak_planks',count:1}]);assert.equal(find(p,'oak_planks').required,9);assert.equal(find(p,'oak_planks').batches,3);assert.equal(find(p,'oak_log').required,3);assert.equal(find(p,'oak_planks').surplus,3);
p=plan([{id:'oak_stairs',count:5}]);assert.equal(find(p,'oak_stairs').batches,2);assert.equal(find(p,'oak_stairs').surplus,3);assert.equal(find(p,'oak_planks').required,12);
const chest=c.recipesByItem.get('chest').find(r=>r.id==='chest');p=plan([{id:'chest',count:1}],{recipes:{},ingredients:{[m.choiceKey(chest,0)]:'spruce_planks'}});assert.equal(find(p,'spruce_planks').required,8);assert.equal(find(p,'spruce_log').required,2);
p=plan([{id:'iron_block',count:1}],{recipes:{iron_ingot:'iron_ingot_from_iron_block'},ingredients:{}});assert(p.warnings.length);assert.equal(find(p,'iron_ingot').recipe,null);assert.equal(find(p,'iron_ingot').required,9);
p=plan([{id:'netherite_upgrade_smithing_template',count:2}],{recipes:{netherite_upgrade_smithing_template:'netherite_upgrade_smithing_template'},ingredients:{}});assert.equal(p.base[0].required,2);assert(p.warnings.length);
p=plan([{id:'iron_block',count:1}],{recipes:{iron_block:'gather'},ingredients:{}});assert.equal(p.base[0].id,'iron_block');assert.equal(p.steps.length,0);
assert.deepEqual(m.requiredItems([{type:'redstone_wire'},{type:'redstone_wire'},{type:'water'}]),[{id:'redstone',count:2},{id:'water_bucket',count:1}]);
const entire={version:1,name:'26.2 full placement round trip',blocks:c.placeableItems.map((i,k)=>({x:k%48,y:Math.floor(k/48),z:0,type:i.placement.id}))};assert.deepEqual(b.validate(JSON.parse(JSON.stringify(entire))),b.validate(entire));
// Every fixed recipe resolves to real item IDs; every placeable item has a finite default expansion.
for(const r of c.recipes){assert(c.itemById.has(r.output));assert(Number.isInteger(r.count)&&r.count>0);for(const i of r.ingredients){assert(i.count>0&&i.options.length);for(const id of i.options)assert(c.itemById.has(id));}}
for(const i of c.placeableItems){const one=plan([{id:i.id,count:1}]);assert(one.base.length>0,i.id);assert(one.nodes.every(n=>Number.isSafeInteger(n.required)&&n.required>0),i.id);}
console.log(`PASS: ${c.items.length} items, ${c.placeableItems.length} unique placements, ${c.recipes.length} recipes; every placement expands finitely. Iron 2→18, shared rounding, surplus, alternatives, cycles, Unicode/full palette sharing verified.`);
