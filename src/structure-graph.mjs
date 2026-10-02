// Hatter 2026: bounded document-containment graph. No meaning inference or writes.
import {element} from './index.mjs'
import {inspectionOverview} from './inspection-overview.mjs'
export function graphDocuments(documents,{component='',query='',depth=3,maximum=256}={}){
 if(!Array.isArray(documents)||documents.length>32||!Number.isInteger(depth)||depth<1||depth>6)throw Error('GraphInputInvalid')
 const nodes=[],edges=[];let truncated=false
 const add=(value,label,path,level,parent,document)=>{
  if(nodes.length>=maximum){truncated=true;return}
  const id=document.id+':'+path,node={id,label,path,level,value,document}
  nodes.push(node);if(parent)edges.push({from:parent,to:id,label})
  if(value&&typeof value==='object'){
   const entries=Object.entries(value)
   if(level>=depth){if(entries.length)truncated=true;return}
   for(const [key,child]of entries){if(nodes.length>=maximum){truncated=true;break}add(child,key,path+'/'+key.replaceAll('~','~0').replaceAll('/','~1'),level+1,id,document)}
  }
 }
 for(const doc of documents)if(!component||doc.id===component)add(doc.value,doc.label,'',0,null,doc)
 if(query){const matches=new Set(nodes.filter(n=>(n.label+' '+n.path+' '+(n.value===null||typeof n.value!=='object'?String(n.value):'')).toLowerCase().includes(query.toLowerCase())).map(n=>n.id));return {nodes:nodes.filter(n=>matches.has(n.id)),edges:edges.filter(e=>matches.has(e.from)&&matches.has(e.to)),truncated}}
 return {nodes,edges,truncated}
}
export function structureGraph(document,host,view,onRole,onRefresh,{embedded=false}={}){
 const controller=new AbortController(),signal=controller.signal
 let drawing=new AbortController()
 let component='',query='',depth=1,zoom=1,pan={x:0,y:0},drag=null,selected=null,mode='overview'
 const wrap=element(document,'section',null,{'aria-label':'Semantic structure graph'})
 Object.assign(wrap.style,{position:'absolute',inset:'110px 12px 12px 110px',display:'grid',gridTemplateRows:'auto minmax(0,1fr) auto',background:'Canvas',border:'1px solid GrayText',borderRadius:'12px',overflow:'hidden'})
 const media=document.defaultView.matchMedia('(max-width:600px)'),resize=()=>{wrap.style.inset=embedded?'auto':media.matches?'105px 8px 84px':'110px 12px 12px 110px'};resize();media.addEventListener('change',resize,{signal})
 if(embedded)Object.assign(wrap.style,{position:'relative',height:'65dvh',minHeight:'300px',width:'100%'})
 const toolbar=element(document,'div'),footer=element(document,'div'),detail=element(document,'details'),summary=element(document,'summary','Select a node for exact source details'),body=element(document,'dl')
 Object.assign(toolbar.style,{display:'flex',gap:'6px',padding:'8px',flexWrap:'wrap'});Object.assign(footer.style,{padding:'8px',maxHeight:'35vh',overflow:'auto'})
 const control=(label,values,current,change)=>{const select=element(document,'select',null,{'aria-label':label});for(const [value,text]of values)select.append(element(document,'option',text,{value}));select.value=current;select.addEventListener('change',()=>change(select.value),{signal});toolbar.append(select);return select}
 const roleSelect=control('Role',view.roles.map(r=>[r.id,r.id]),view.selected??'',onRole)
 const tabs=element(document,'div',null,{role:'tablist','aria-label':'Inspection view'}),tabButtons=[]
 toolbar.append(tabs)
 const graphControls=element(document,'div',null,{class:'inspection-graph-controls'})
 Object.assign(graphControls.style,{display:'flex',gap:'6px',flexWrap:'wrap'})
 Object.assign(tabs.style,{display:'flex',gap:'6px'})
 const componentSelect=control('Component',[['','All components'],...view.documents.map(d=>[d.id,d.label])],'',value=>{component=value;selected=null;draw()})
 control('Structure depth',[1,2,3,4,5,6].map(n=>[String(n),'Depth '+n]),'1',value=>{depth=Number(value);draw()})
 const search=element(document,'input',null,{type:'search','aria-label':'Filter graph',placeholder:'Filter nodes'});search.style.width='140px';search.addEventListener('input',()=>{query=search.value;draw()},{signal});toolbar.append(search)
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),group=document.createElementNS(svg.namespaceURI,'g')
 svg.setAttribute('aria-label','Document containment graph');svg.setAttribute('role','group');Object.assign(svg.style,{width:'100%',height:'100%',minHeight:'0',touchAction:'none',background:'color-mix(in srgb,Canvas 96%,#5368df)'})
 svg.append(group);const status=element(document,'p',null,{role:'status'});status.style.margin='0'
 const button=(label,action)=>{const b=element(document,'button',label,{type:'button'});b.addEventListener('click',action,{signal});toolbar.append(b);return b}
 const apply=()=>group.setAttribute('transform',`translate(${pan.x} ${pan.y}) scale(${zoom})`)
 button('−',()=>{zoom=Math.max(.5,zoom/1.2);apply()});button('+',()=>{zoom=Math.min(8,zoom*1.2);apply()});button('Fit',()=>{zoom=1;pan={x:0,y:0};apply()})
 const refresh=button('Refresh',()=>void onRefresh())
 svg.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();zoom=Math.max(.5,Math.min(8,zoom*(e.deltaY<0?1.1:1/1.1)));apply()},{signal,passive:false})
 svg.addEventListener('pointerdown',e=>{if(e.button||e.target.closest('[data-graph-node]'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,pan:{...pan}};svg.setPointerCapture(e.pointerId)},{signal})
 svg.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const matrix=svg.getScreenCTM();if(matrix){pan={x:Math.max(-5000,Math.min(5000,drag.pan.x+(e.clientX-drag.x)/matrix.a)),y:Math.max(-5000,Math.min(5000,drag.pan.y+(e.clientY-drag.y)/matrix.d))};apply()}},{signal})
 for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,()=>drag=null,{signal})
 function inspect(node){selected=node.id;summary.textContent=node.document.label+' · '+(node.path||'/');detail.open=true;body.replaceChildren()
  const source=node.document.source??{},fields=[['path',node.path||'/'],['source',source.method??node.document.id],['semantic revision',source.semanticRevision??''],['role',source.roleRef?.id??''],['role revision',source.roleRef?.revision??''],['role digest',source.roleRef?.digest_sha256??''],['memory revision',source.memoryRevision??''],...Object.entries((node.value&&typeof node.value==='object')?node.value:{value:node.value}).slice(0,64).map(([k,v])=>['field: '+k,v])]
  for(const [key,value]of fields)body.append(element(document,'dt',key),element(document,'dd',value!==null&&typeof value==='object'?(Array.isArray(value)?'Array':'Object')+' ('+Object.keys(value).length+')':String(value)))
  highlight()
 }
 function highlight(){for(const n of group.querySelectorAll('[data-graph-node]'))n.querySelector('rect').setAttribute('stroke',n.dataset.graphNode===selected?'#d97706':'#5368df');for(const line of group.querySelectorAll('line'))line.setAttribute('stroke',line.dataset.from===selected||line.dataset.to===selected?'#d97706':'#a5adc6')}
 function draw(){
  drawing.abort();drawing=new AbortController()
  selected=null;detail.open=false;body.replaceChildren();summary.textContent='Select a node for exact source details'
  const graph=graphDocuments(view.documents,{component,query,depth}),levels=new Map(),positions=new Map()
  for(const node of graph.nodes){const list=levels.get(node.level)??[];list.push(node);levels.set(node.level,list)}
  const height=Math.max(240,...[...levels.values()].map(ns=>ns.length*64+30)),width=(Math.max(0,...levels.keys())+1)*220+20
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);group.replaceChildren()
  const make=(tag,attrs)=>{const n=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n}
  for(const [level,nodes]of levels)nodes.forEach((n,i)=>positions.set(n.id,{x:level*220+10,y:(i+.5)*height/nodes.length}))
  for(const edge of graph.edges){const a=positions.get(edge.from),b=positions.get(edge.to);group.append(make('line',{x1:a.x+170,y1:a.y,x2:b.x,y2:b.y,'data-from':edge.from,'data-to':edge.to,stroke:'#a5adc6','stroke-width':2}))}
  for(const node of graph.nodes){const p=positions.get(node.id),g=make('g',{transform:`translate(${p.x} ${p.y-20})`,'data-graph-node':node.id,role:'button',tabindex:0,'aria-label':node.document.label+' '+(node.path||'/')})
   g.append(make('rect',{width:170,height:40,rx:8,fill:'Canvas',stroke:'#5368df','stroke-width':2}));const title=make('title',{});title.textContent=node.document.label+' '+(node.path||'/');const text=make('text',{x:8,y:25,fill:'CanvasText','font-size':13});text.textContent=node.label.length>21?node.label.slice(0,20)+'…':node.label;g.append(title,text);g.addEventListener('click',()=>inspect(node),{signal:drawing.signal});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(node)}},{signal:drawing.signal});group.append(g)
  }
  status.textContent=graph.nodes.length+' nodes · '+graph.edges.length+' containment links'+(graph.truncated?' · Depth or node limit: increase depth or select a component.':'')+(view.documents.some(d=>d.source?.truncated)?' · Source incomplete.':'')
  if(!view.documents.length)status.textContent='No adopted semantic structure available. Inspect owner readiness in Notifications.'
  apply();highlight()
 }
 // One inspector, two views. Switching changes presentation only, not reads,
 // selected role, semantic state or the world/camera behind the inspector.
 for(const child of [...toolbar.children])if(child!==roleSelect&&child!==tabs&&child!==refresh)graphControls.append(child)
 toolbar.append(graphControls)
 const stage=element(document,'div',null,{class:'inspection-stage'}),overview=element(document,'div',null,{class:'inspection-overview',role:'tabpanel','aria-label':'Responsibility overview'}),graphPanel=element(document,'div',null,{class:'inspection-graph-panel',role:'tabpanel','aria-label':'Structure view'})
 Object.assign(stage.style,{minHeight:'0',overflow:'hidden'});Object.assign(overview.style,{height:'100%',overflow:'auto',padding:'1rem',overflowWrap:'anywhere'});graphPanel.style.height='100%'
 graphPanel.append(svg);stage.append(overview,graphPanel)
 function display(){
  overview.hidden=mode!=='overview';graphPanel.hidden=mode!=='structure';graphControls.hidden=mode!=='structure';footer.hidden=mode!=='structure'
  for(const b of tabButtons){const active=b.dataset.view===mode;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;b.style.borderColor=active?'Highlight':'GrayText';b.style.fontWeight=active?'bold':'normal'}
 }
 for(const [value,label]of [['overview','Overview'],['structure','Structure']]){
  const tab=element(document,'button',label,{type:'button',role:'tab','data-view':value})
  tab.style.minHeight='44px'
  tab.addEventListener('click',()=>{mode=value;display()},{signal})
  tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();mode=event.key==='Home'?'overview':event.key==='End'?'structure':mode==='overview'?'structure':'overview';display();tabButtons.find(b=>b.dataset.view===mode).focus()}},{signal})
  tabs.append(tab);tabButtons.push(tab)
 }
 let overviewEvents=new AbortController()
 function summaryView(){overviewEvents.abort();overviewEvents=new AbortController();inspectionOverview(document,overview,view.overview,id=>{component=id;componentSelect.value=id;mode='structure';draw();display()},overviewEvents.signal)}
 detail.append(summary,body);footer.append(status,detail);wrap.append(toolbar,stage,footer);host.replaceChildren(wrap);draw();summaryView();display()
 return {update(next){view=next;roleSelect.replaceChildren(...view.roles.map(r=>element(document,'option',r.id,{value:r.id})));roleSelect.value=view.selected??'';componentSelect.replaceChildren(element(document,'option','All components',{value:''}),...view.documents.map(d=>element(document,'option',d.label,{value:d.id})));if(!view.documents.some(d=>d.id===component))component='';componentSelect.value=component;draw();summaryView();display()},close(){overviewEvents.abort();drawing.abort();controller.abort();wrap.remove()}}
}
