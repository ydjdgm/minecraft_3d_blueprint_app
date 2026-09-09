'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Box,Layers,MousePointer2,Plus,Minus,Undo2,Redo2,RotateCcw,Share2,Download,Sun,Moon,Sparkles,Search,X,ArrowUp,Check,Settings2,FolderOpen,Compass,BrickWall} from 'lucide-react';
import Viewport from './viewport';
import BlockPalette from './catalog-panel';
import MaterialsPanel from './materials-panel';
import SharePanel from './share-panel';
import {APP_VERSION} from '../lib/version';
import {aiProviders,AIProvider,AIConnection,initialAIConnections} from '../lib/ai-providers';
import {requiredItems} from '../lib/materials';
import {applyPlan,Block,Blueprint,cottage,key,palette,Plan,validate} from '../lib/blueprint';
import {useWorkspace} from '../hooks/use-workspace';
import {diffBlocks} from '../lib/editor';
import {BuildGuide,LibraryPanel,RegionPanel} from './workspace-panels';
export default function Home(){
 const [theme,setTheme]=useState('dark');
 const [tool,setTool]=useState('orbit'),[selected,setSelected]=useState('oak_planks'),[facing,setFacing]=useState('north');
 const [search,setSearch]=useState(''),[category,setCategory]=useState('전체'),[layer,setLayer]=useState(-1),[layerOnly,setLayerOnly]=useState(false),[reset,setReset]=useState(0);
 const [modal,setModal]=useState(''),[notice,setNotice]=useState(''),[coords,setCoords]=useState([14,1,20]),[tab,setTab]=useState('materials');
 const [prompt,setPrompt]=useState(''),[busy,setBusy]=useState(false);
 const [provider,setProvider]=useState<AIProvider>('openai');
 const [connections,setConnections]=useState(initialAIConnections);
 const {apiKey,model}=connections[provider];
 const updateConnection=(patch:Partial<AIConnection>)=>setConnections(current=>({...current,[provider]:{...current[provider],...patch}}));
 const [proposal,setProposal]=useState<{plan:Plan;result:Blueprint;base:Blueprint}|null>(null);
 const flash=useCallback((s:string)=>setNotice(s),[]);
 const workspace=useWorkspace(flash);const {doc,ready,saved,undo,redo,commit,history}=workspace;
 const live=useRef(doc);live.current=doc;
 const [name,setName]=useState(doc.name),[view,setView]=useState('3d');
 useEffect(()=>{setName(doc.name);setProposal(null);},[doc]);
 useEffect(()=>{setLayer(-1);setReset(n=>n+1);},[workspace.entry.id]);
 const changes=useMemo(()=>proposal?diffBlocks(doc.blocks,proposal.result.blocks):[],[doc,proposal]);
 useEffect(()=>{try{const t=localStorage.getItem('blockcraft-theme');if(t==='dark'||t==='light')setTheme(t);}catch{}},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('blockcraft-theme',theme);}catch{}},[theme,ready]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(t);},[notice]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='Escape'){setModal('');return;}if((e.target as HTMLElement).closest('input,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey);}if(e.key==='1')setTool('orbit');if(e.key==='2')setTool('place');if(e.key==='3')setTool('erase');};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[history]);
 useEffect(()=>{if(!modal)return;const previous=document.activeElement as HTMLElement;const dialog=document.querySelector<HTMLElement>('.modal');const elements=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select')||[]);elements()[0]?.focus();const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const items=elements();if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}};window.addEventListener('keydown',trap);return()=>{window.removeEventListener('keydown',trap);previous?.focus();};},[modal]);
 const edit=(b:Block,n:number[])=>{if(tool==='orbit')return;const target=tool==='erase'?b:{x:b.x+n[0],y:b.y+n[1],z:b.z+n[2],type:selected,facing};if(target.type==='air')return;let blocks=doc.blocks.filter(x=>key(x)!==key(target));if(tool!=='erase')blocks=[...blocks,target];commit({...doc,blocks});};
 const materials=useMemo(()=>requiredItems(doc.blocks),[doc]);
 const maxY=Math.max(0,...doc.blocks.map(b=>b.y));
 const dimensions=doc.blocks.length?[Math.max(...doc.blocks.map(b=>b.x))-Math.min(...doc.blocks.map(b=>b.x))+1,maxY-Math.min(...doc.blocks.map(b=>b.y))+1,Math.max(...doc.blocks.map(b=>b.z))-Math.min(...doc.blocks.map(b=>b.z))+1]:[0,0,0];
 async function askAI(){if(!prompt.trim()||busy)return;if(!apiKey.trim()||!model.trim()){setModal('settings');return;}setBusy(true);setProposal(null);const base=doc;try{const res=await fetch('/api/blueprint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,document:base,provider,apiKey:apiKey.trim(),model:model.trim()})});const data=await res.json() as Plan & {error?:string};if(!res.ok)throw Error(data.error||'AI 요청에 실패했습니다.');const result=applyPlan(base,data);if(live.current!==base){flash('설계도가 변경되었습니다. 최신 상태로 다시 요청하세요.');return;}setProposal({plan:data,result,base});}catch(e){flash((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>Promise<void>}}).modelContext;if(!context)return;const lifecycle=new AbortController();const register=(t:unknown)=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_blueprint',description:'Read current blueprint and supported block IDs.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({document:live.current,palette:palette.map(p=>p[0])})});
 return()=>lifecycle.abort();},[]);
 return <main data-theme={theme}>
 <header className="topbar">
  <div className="brand"><div className="brand-mark"><Box size={25}/></div><strong>blockcraft<span>BLUEPRINT STUDIO · {APP_VERSION}</span></strong></div><div className="header-divider"/><span className="workspace-label">내 작업 공간</span>
  <div className="header-actions"><button onClick={()=>setModal('library')}><FolderOpen size={16}/>보관함</button><button onClick={()=>setModal('new')}><Plus size={16}/>새 설계도</button><button className="primary" onClick={()=>setModal('share')}><Share2 size={16}/>공유하기</button><button className="icon-button" aria-label="테마 전환" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div>
 </header>
 <div className="document-bar"><div className="document-name"><span className="file-icon"><Box size={21}/></span><div><input aria-label="설계도 이름" maxLength={80} value={name} onChange={e=>setName(e.target.value)} onBlur={()=>{if(name.trim())commit({...doc,name});else setName(doc.name);}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){setName(doc.name);}}}/><small><Check size={12}/>{saved}</small></div></div><span className="edition">Java Edition 26.2 <span>48 × 48 × 48</span></span></div>
 <div className="workspace">
 <BlockPalette selected={selected} onSelect={id=>{setSelected(id);setTool('place');}} facing={facing} onFacing={setFacing} onPlaceAt={coords=>commit({...doc,blocks:[...doc.blocks.filter(b=>key(b)!==coords.join(',')),{x:coords[0],y:coords[1],z:coords[2],type:selected,facing}]})} onEraseAt={coords=>commit({...doc,blocks:doc.blocks.filter(b=>key(b)!==coords.join(','))})}/>
 <section className="editor"><div className="editor-modes"><button className={view==='3d'?'active':''} onClick={()=>setView('3d')}>3D 편집</button><button className={view==='guide'?'active':''} onClick={()=>setView('guide')}>층별 건축 가이드</button></div>{view==='guide'?<BuildGuide key={workspace.entry.id} blocks={doc.blocks} completed={workspace.entry.progress.layers} onComplete={(y,signature)=>workspace.progress(p=>({...p,layers:{...p.layers,[y]:signature}}))}/>:<>
  <div className="editor-top"><div><span className="view-badge"><Box size={14}/>3D 뷰</span><span className="subtle"> / {layer<0?'전체 설계도':`Y = ${layer} 레이어`}</span></div><button className="text-button" onClick={()=>setReset(n=>n+1)}><RotateCcw size={14}/>전체 맞춤</button></div>
  <div className="scene"><Viewport blocks={doc.blocks} tool={tool} layer={layer} layerOnly={layerOnly} onEdit={edit} reset={reset} changes={changes}/>
   <div className="tool-rail">{[{id:'orbit',icon:MousePointer2,label:'둘러보기 (1)'},{id:'place',icon:Plus,label:'블록 배치 (2)'},{id:'erase',icon:Minus,label:'블록 삭제 (3)'}].map(t=><button title={t.label} aria-label={t.label} key={t.id} className={tool===t.id?'active':''} onClick={()=>setTool(t.id)}><t.icon size={20}/></button>)}<hr/><button aria-label="실행 취소" title="실행 취소 (Ctrl+Z)" disabled={!undo.current.length} onClick={()=>history()}><Undo2 size={19}/></button><button aria-label="다시 실행" disabled={!redo.current.length} onClick={()=>history(true)}><Redo2 size={19}/></button></div>
   <div className="scene-label"><span className="live-dot"/>{tool==='orbit'?'둘러보기':tool==='place'?'블록 배치':'블록 삭제'}<span>·</span>{doc.blocks.length.toLocaleString()} 블록</div><div className="compass" title="건축 가이드에서 북쪽을 확인하세요."><Compass size={29}/><span>N</span></div>
   <div className="scene-help">드래그로 회전 <i/> 휠로 확대 <i/> Shift + 드래그로 이동{tool!=='orbit'&&<><i/>클릭하여 {tool==='place'?'배치':'삭제'}</>}</div>
  </div>
  <div className="layer-control"><div className="layer-title"><Layers size={19}/><strong>레이어 보기</strong><span>한 층씩 차근차근 만들어 보세요</span></div><div className="layer-slider"><button className={layer===-1?'active':''} onClick={()=>setLayer(-1)}>전체</button><span>Y</span><input aria-label="표시할 레이어" type="range" min={0} max={Math.max(1,maxY)} value={layer<0?maxY:layer} onChange={e=>setLayer(Number(e.target.value))}/><strong>{layer<0?'전체':layer}</strong><label><input type="checkbox" checked={layerOnly} onChange={e=>setLayerOnly(e.target.checked)}/>한 층만</label></div></div>
  <footer className="editor-footer"><span>크기 <b>{dimensions.join(' × ')}</b></span><span>재료 <b>{materials.length}종</b></span><span>1 블록 = 1m</span><span className="footer-end">좌표 범위 0–47</span></footer></>}<RegionPanel doc={doc} selected={selected} facing={facing} onApply={next=>{if(commit(next))flash('영역 편집을 적용했습니다.');}}/>
 </section>
 <aside className="details-panel">
  <div className="detail-tabs"><button className={tab==='materials'?'active':''} onClick={()=>setTab('materials')}><Layers size={16}/>재료 목록</button><button className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}><Sparkles size={16}/>AI 설계</button></div>
  {tab==='materials'?<MaterialsPanel blocks={doc.blocks} progress={workspace.entry.progress} onProgress={workspace.progress}/>:<div className="ai-panel"><div className="ai-heading"><Sparkles size={24}/><h2>함께 설계해요</h2><p>새 건축물을 만들거나<br/>현재 설계도를 바꿔 보세요.</p></div>
   <button className="connection" disabled={busy} onClick={()=>setModal('settings')}><Settings2 size={15}/>{aiProviders[provider].label} · {apiKey.trim()?'모델 연결 설정':'API 키 연결하기'}</button>
   <div className="suggestions">{['빈 공간에 작은 돌 탑을 추가해 줘','오두막의 나무 벽을 흰색으로 바꿔 줘','레드스톤 회로 설계도를 만들어 줘'].map(s=><button key={s} onClick={()=>setPrompt(s)}>{s}</button>)}</div>
   <label className="prompt-label">어떤 설계를 원하시나요?<textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={2000} placeholder="예: 오두막 오른쪽에 높이 6블록의 돌 탑을 추가해 줘"/></label>
   <button className="primary" disabled={busy||!prompt.trim()} onClick={askAI}><Sparkles size={16}/>{busy?'설계를 구상하고 있어요…':'변경 계획 만들기'}</button>
   {proposal&&<div className="proposal"><strong>변경 제안</strong><div className="change-legend"><span className="added">추가 {changes.filter(c=>c.kind==='added').length}</span><span className="removed">삭제 {changes.filter(c=>c.kind==='removed').length}</span><span className="replaced">교체 {changes.filter(c=>c.kind==='replaced').length}</span></div><p>3D 화면의 색상으로 변경 위치를 확인하세요. 삭제 위치도 표시됩니다.</p><button onClick={()=>{setView('3d');setLayer(-1);setReset(n=>n+1);}}>변경 위치 전체 보기</button><p>{proposal.plan.summary}</p><small>{proposal.plan.operations.length}개 명령 · {doc.blocks.length} → {proposal.result.blocks.length} 블록</small><button className="primary" onClick={()=>{if(live.current!==proposal.base){setProposal(null);flash('설계도가 변경되었습니다. 다시 요청하세요.');return;}commit(proposal.result);flash('AI 변경을 적용했습니다. 실행 취소로 되돌릴 수 있습니다.');}}>설계도에 적용</button><button onClick={()=>setProposal(null)}>취소</button></div>}
   <p className="ai-note">블록과 좌표를 검증한 후 적용합니다. 레드스톤은 배치 설계만 지원하며 회로 작동을 시뮬레이션하지 않습니다.</p>
  </div>}
 </aside></div>
 {notice&&<div className="toast" role="status">{notice}<button aria-label="알림 닫기" onClick={()=>setNotice('')}><X size={15}/></button></div>}
 {modal&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModal('');}}><section className={'modal '+(modal==='library'?'library-modal':'')} role="dialog" aria-modal="true" aria-label={modal==='settings'?'AI 연결 설정':'설계도 관리'}>
  <button className="modal-close icon-button" aria-label="닫기" onClick={()=>setModal('')}><X size={20}/></button>
  {modal==='library'?<LibraryPanel library={workspace.library} onOpen={id=>{workspace.open(id);setModal('');}} onDuplicate={e=>workspace.add({...e.document,name:(e.document.name+' 복사본').slice(0,80)},e.progress)} onDelete={workspace.remove} onRestore={workspace.restore}/>:modal==='settings'?<><Settings2/><h2>AI 연결 설정</h2><label>AI 제공업체<select value={provider} disabled={busy} onChange={e=>{setProvider(e.target.value as AIProvider);setProposal(null);}}>{Object.entries(aiProviders).map(([id,config])=><option key={id} value={id}>{config.label}</option>)}</select></label><p>키는 제공업체별로 현재 탭의 메모리에만 보관합니다. 설계 요청 시 입력한 키와 설계도가 앱 서버를 거쳐 {aiProviders[provider].label}로 전달됩니다. 새로고침하면 키가 지워집니다.</p><label>{aiProviders[provider].label} API 키<input key={provider} type="password" value={apiKey} disabled={busy} onChange={e=>updateConnection({apiKey:e.target.value})} placeholder={aiProviders[provider].keyPlaceholder} maxLength={512} autoComplete="off" spellCheck={false}/></label><label>모델 ID<input value={model} disabled={busy} onChange={e=>updateConnection({model:e.target.value})} placeholder={aiProviders[provider].defaultModel} maxLength={80} autoComplete="off" spellCheck={false}/></label><p>선택한 제공업체의 구조화 출력을 지원하는 모델을 입력하세요. API 이용 요금은 해당 키의 계정에 부과됩니다.</p><button className="primary" disabled={busy} onClick={()=>{if(!apiKey.trim()||!model.trim()){flash('API 키와 모델 ID를 입력하세요.');return;}updateConnection({apiKey:apiKey.trim(),model:model.trim()});setModal('');flash('연결 설정을 저장했습니다. 실제 연결은 설계 요청 시 확인합니다.');}}>설정 완료</button><button disabled={busy||!apiKey} onClick={()=>{updateConnection({apiKey:''});flash('선택한 제공업체의 API 키를 지웠습니다.');}}>이 제공업체의 키 지우기</button></>
  :modal==='new'?<><FolderOpen/><h2>새 설계도 만들기</h2><p>현재 설계도는 보관함에 남습니다. 새 설계도를 만든 뒤에도 다시 열 수 있습니다.</p><button className="primary" onClick={()=>{workspace.add({version:1,name:'새로운 설계도',blocks:[]});setLayer(-1);setTool('place');setModal('');}}>빈 설계도로 시작</button><button onClick={()=>{workspace.add(cottage());setLayer(-1);setModal('');}}>오두막 예제 열기</button></>
  :<SharePanel doc={doc}/>}

 </section></div>}
 </main>;
}
