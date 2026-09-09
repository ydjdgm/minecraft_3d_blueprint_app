'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Blueprint,cottage,validate} from '../lib/blueprint';
import {emptyProgress,Entry,Library,Progress,readLibrary,recordEdit,travelHistory} from '../lib/editor';
const makeEntry=(document:Blueprint):Entry=>({id:crypto.randomUUID(),document,progress:emptyProgress(),updated:new Date().toISOString()});
export function useWorkspace(flash:(s:string)=>void){
 const [library,setLibrary]=useState<Library>({version:1,active:'initial',entries:[{id:'initial',document:cottage(),progress:emptyProgress(),updated:''}]});
 const [ready,setReady]=useState(false),[saved,setSaved]=useState('불러오는 중…');
 const state=useRef(library);state.current=library;const undo=useRef<Entry[]>([]),redo=useRef<Entry[]>([]);
 const entry=library.entries.find(e=>e.id===library.active)!;
 const write=useCallback((next:Library)=>{state.current=next;setLibrary(next);},[]);
 useEffect(()=>{try{const raw=localStorage.getItem('blockcraft-library');if(raw)write(readLibrary(JSON.parse(raw)));else{const old=localStorage.getItem('blockcraft-document');const e=makeEntry(old?validate(JSON.parse(old)):cottage());write({version:1,active:e.id,entries:[e]});}setReady(true);}catch{setSaved('저장 데이터 오류 · 원본 보존 중');flash('저장 데이터를 읽지 못했습니다. 보관함에서 백업 파일을 복원하세요. 원본은 덮어쓰지 않습니다.');}},[flash,write]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem('blockcraft-library',JSON.stringify(library));setSaved('이 기기에 자동 저장됨');}catch{setSaved('저장 공간 부족 · 보관함에서 파일 백업');}},[library,ready]);
 const commit=useCallback((input:Blueprint)=>{if(!ready){flash('보관함을 복원한 후 편집하세요.');return false;}try{const s=state.current,e=s.entries.find(e=>e.id===s.active)!,result=recordEdit(e,input,{undo:undo.current,redo:redo.current});if(result.entry===e)return false;undo.current=result.history.undo;redo.current=result.history.redo;write({...s,entries:s.entries.map(v=>v.id===e.id?result.entry:v)});return true;}catch(e){flash((e as Error).message);return false;}},[flash,ready,write]);
 const history=useCallback((forward=false)=>{const s=state.current,e=s.entries.find(e=>e.id===s.active)!,result=travelHistory(e,{undo:undo.current,redo:redo.current},forward);if(result.entry===e)return;undo.current=result.history.undo;redo.current=result.history.redo;write({...s,entries:s.entries.map(e=>e.id===s.active?result.entry:e)});},[write]);
 const progress=useCallback((fn:(p:Progress)=>Progress)=>{if(!ready)return;const s=state.current;write({...s,entries:s.entries.map(e=>e.id===s.active?{...e,progress:fn(e.progress)}:e)});},[ready,write]);
 const open=useCallback((id:string)=>{const s=state.current;if(!s.entries.some(e=>e.id===id))return;undo.current=[];redo.current=[];write({...s,active:id});},[write]);
 const add=useCallback((document:Blueprint,sourceProgress?:Progress)=>{if(!ready)return;const s=state.current;if(s.entries.length>=100){flash('보관함은 최대 100개입니다. 먼저 백업하고 정리하세요.');return;}try{const e=makeEntry(validate(document));if(sourceProgress)e.progress=structuredClone(sourceProgress);undo.current=[];redo.current=[];const next={...s,active:e.id,entries:[...s.entries,e]};localStorage.setItem('blockcraft-library',JSON.stringify(next));write(next);return true;}catch(e){flash((e as Error).message);}},[ready,flash,write]);
 const remove=useCallback((id:string)=>{const s=state.current;let entries=s.entries.filter(e=>e.id!==id);if(!entries.length)entries=[makeEntry({version:1,name:'새로운 설계도',blocks:[]})];if(id===s.active){undo.current=[];redo.current=[];}write({...s,active:id===s.active?entries[0].id:s.active,entries});},[write]);
 const restore=useCallback((input:unknown)=>{const next=readLibrary(input);localStorage.setItem('blockcraft-library',JSON.stringify(next));undo.current=[];redo.current=[];write(next);setReady(true);},[write]);
 return {library,entry,doc:entry.document,ready,saved,undo,redo,commit,history,progress,open,add,remove,restore};
}
