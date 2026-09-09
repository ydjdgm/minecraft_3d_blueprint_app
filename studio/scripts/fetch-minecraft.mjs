import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('outputs/minecraft-26.2');await fs.mkdir(root,{recursive:true});
async function get(url,file){const target=path.join(root,file);try{return await fs.readFile(target);}catch{}const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);const b=Buffer.from(await r.arrayBuffer());await fs.writeFile(target,b);console.log(file,b.length);return b;}
const manifest=JSON.parse(await get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json','manifest.json'));
const release=manifest.versions.find(v=>v.id==='26.2'&&v.type==='release');if(!release)throw Error('26.2 release missing');
const version=JSON.parse(await get(release.url,'version.json'));
await Promise.all([
 get('https://raw.githubusercontent.com/misode/mcmeta/26.2-summary/registries/data.json','registries.json'),
 get('https://raw.githubusercontent.com/misode/mcmeta/26.2-summary/item_components/data.json','components.json'),
 get('https://raw.githubusercontent.com/misode/mcmeta/26.2-summary/blocks/data.json','blocks.json'),
 get('https://codeload.github.com/misode/mcmeta/tar.gz/refs/tags/26.2-data-json','data.tar.gz'),
 get(version.assetIndex.url,'asset-index.json'),
 get(version.downloads.client.url,'client.jar').then(b=>{if(createHash('sha1').update(b).digest('hex')!==version.downloads.client.sha1)throw Error('Client SHA1 mismatch');}),
]);
const assets=JSON.parse(await fs.readFile(path.join(root,'asset-index.json')));const hash=assets.objects['minecraft/lang/ko_kr.json'].hash;
const lang=await get(`https://resources.download.minecraft.net/${hash.slice(0,2)}/${hash}`,'ko_kr.json');if(createHash('sha1').update(lang).digest('hex')!==hash)throw Error('Language SHA1 mismatch');
await fs.writeFile(path.join(root,'sources.json'),JSON.stringify({version:'26.2',releaseTime:release.releaseTime,manifest:release.url,clientSha1:version.downloads.client.sha1,languageSha1:hash,mcmeta:'https://github.com/misode/mcmeta/tree/26.2-data-json'},null,2));
