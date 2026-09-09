import ShareViewer from './viewer';
export const metadata={title:'공유 설계도 · Blockcraft',robots:{index:false,follow:false}};
export default async function SharePage({params}:{params:Promise<{id:string}>}){return <ShareViewer id={(await params).id}/>;}
