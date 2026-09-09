'use client';
import {useCallback,useEffect,useState} from 'react';
import {Blueprint,validate} from '../../../lib/blueprint';
import {shareIdPattern} from '../../../lib/share-api';
import {useWorkspace} from '../../../hooks/use-workspace';
import Viewport from '../../viewport';
import MaterialsPanel from '../../materials-panel';
import {emptyProgress} from '../../../lib/editor';
export default function ShareViewer({id}:{id:string}){
 const [doc,setDoc]=useState<Blueprint|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[copied,setCopied]=useState(false),[retry,setRetry]=useState(0),[reset,setReset]=useState(0),[progress,setProgress]=useState(emptyProgress);
 const flash=useCallback((s:string)=>setNotice(s),[]),workspace=useWorkspace(flash);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setDoc(null);setCopied(false);async function load(){try{if(!shareIdPattern.test(id))throw Error('공유 링크 형식이 올바르지 않습니다.');const r=await fetch(`/api/shares/${id}`,{signal:controller.signal,cache:'no-store'}),data=await r.json() as {error?:string;document:unknown};if(!r.ok)throw Error(data.error||'설계도를 불러오지 못했습니다.');setDoc(validate(data.document));}catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message);}finally{if(!controller.signal.aborted)setLoading(false);}}void load();return()=>controller.abort();},[id,retry]);
 return <main data-theme="dark" className="shared-page"><header className="topbar"><a href="/" className="share-brand">blockcraft</a><span>공유 설계도</span><a href="/">내 작업 공간</a></header>{loading?<p role="status">공유 설계도를 불러오는 중…</p>:error?<section className="share-message"><h1>설계도를 열 수 없습니다</h1><p role="alert">{error}</p><button onClick={()=>setRetry(n=>n+1)}>다시 시도</button><a href="/">작업 공간으로 이동</a></section>:doc&&<><div className="shared-heading"><div><h1>{doc.name}</h1><p>{doc.blocks.length.toLocaleString()} 블록 · Java Edition 26.2 · 읽기 전용 사본</p></div><button className="primary" disabled={!workspace.ready||copied} onClick={()=>{if(workspace.add(doc)){setCopied(true);flash('내 보관함에 새 설계도로 저장했습니다. 기존 설계도는 그대로 남아 있습니다.');}}}>{copied?'보관함에 추가됨':'내 보관함에 추가'}</button>{copied&&<a href="/">편집하러 가기</a>}</div>{notice&&<p role="status" className="share-message">{notice}</p>}<div className="shared-layout"><section className="editor"><div className="editor-top"><span>드래그로 회전 · 휠로 확대</span><button onClick={()=>setReset(n=>n+1)}>전체 맞춤</button></div><div className="scene"><Viewport blocks={doc.blocks} tool="orbit" layer={-1} layerOnly={false} reset={reset} onEdit={()=>{}}/></div></section><aside className="details-panel"><MaterialsPanel blocks={doc.blocks} progress={progress} onProgress={setProgress}/></aside></div></>}</main>;
}
