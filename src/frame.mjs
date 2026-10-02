// Presentation-only window frame: one active panel, stable content and bounded listeners.
import {symbol} from './symbol.mjs'
import {frameLayout} from './frame-layout.mjs'
export function windowFrame(root,{stage,title,state,panels}){
 const document=root.ownerDocument,abort=new AbortController(),buttons=new Map(),bodies=new Map()
 const make=(tag,attrs={})=>{const node=document.createElement(tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);return node}
 const dock=make('nav',{class:'frame-dock','aria-label':'Window tools'}),bar=make('header',{class:'frame-bar'})
 const panel=make('aside',{class:'frame-panel',role:'dialog','aria-modal':'false',tabindex:'-1'}),head=make('header'),heading=make('h2'),closeButton=make('button',{type:'button','aria-label':'Close panel',title:'Close panel'})
 closeButton.textContent='×';head.append(heading,closeButton);panel.append(head);panel.hidden=true
 let active=null,speaker=null,target=null,anchor=null
 const requestAnchor=()=>root.dispatchEvent(new document.defaultView.CustomEvent('world-anchor-request',{detail:{id:target}}))
 const position=()=>{
  if(!active){delete root.dataset.panelLayout;return}
  const layout=frameLayout(root.clientWidth,root.clientHeight,active,anchor),rect=layout.panel
  root.dataset.panelLayout=layout.mode
  panel.dataset.anchorId=target??''
  if(anchor)panel.dataset.anchorBounds=JSON.stringify(anchor);else delete panel.dataset.anchorBounds
  Object.assign(panel.style,{left:rect.x+'px',top:rect.y+'px',right:'auto',bottom:'auto',width:rect.width+'px',height:rect.height+'px',maxHeight:rect.height+'px'})
 }
 const describe=()=>{const talking=Boolean(speaker&&active==='actions');panel.dataset.book=String(active==='details');panel.dataset.conversation=String(talking);if(talking)heading.textContent=speaker.title;position()}
 root.addEventListener('world-anchor',event=>{if(event.detail.id!==target)return;anchor=event.detail.bounds;position()},{signal:abort.signal})
 const resize=new root.ownerDocument.defaultView.ResizeObserver(()=>{requestAnchor();position()});resize.observe(root)
 function close(restoreFocus=true){const previous=active;active=null;target=null;anchor=null;requestAnchor();panel.hidden=true;delete root.dataset.panel;position();for(const b of buttons.values())b.setAttribute('aria-expanded','false');if(restoreFocus)(buttons.get(previous)?.isConnected?buttons.get(previous):dock.querySelector('button'))?.focus({preventScroll:true})}
 function open(id,objectId=null){if(!bodies.has(id))return;active=id;target=objectId??(id==='actions'?speaker?.id:null);anchor=null;panel.hidden=false;heading.textContent=panels.find(p=>p.id===id).label;panel.setAttribute('aria-label',heading.textContent)
  for(const [key,body]of bodies)body.hidden=key!==id
  for(const [key,button]of buttons)button.setAttribute('aria-expanded',String(key===id))
  root.dataset.panel=id
  root.dispatchEvent(new document.defaultView.CustomEvent('frame-panel-open'))
  describe()
  requestAnchor()
  panel.focus({preventScroll:true})
 }
 for(const item of panels){
  if(item.activate){
   const button=make('button',{type:'button','aria-label':item.label,title:item.label,'data-panel':item.id})
   button.append(symbol(document,item.symbol),Object.assign(document.createElement('span'),{textContent:item.label}))
   button.addEventListener('click',()=>{close();item.activate()},{signal:abort.signal});dock.append(button);continue
  }
  const id='panel-'+crypto.randomUUID(),button=make('button',{type:'button','aria-label':item.label,title:item.label,'aria-expanded':'false','aria-controls':id,'data-panel':item.id})
  button.append(symbol(document,item.symbol),Object.assign(document.createElement('span'),{textContent:item.label}));button.addEventListener('click',()=>active===item.id?close():open(item.id),{signal:abort.signal})
  const body=make('section',{id,class:'frame-panel-body'});body.hidden=true;body.append(...item.nodes);panel.append(body);if(item.dock!==false)dock.append(button);buttons.set(item.id,button);bodies.set(item.id,body)
 }
 closeButton.addEventListener('click',close,{signal:abort.signal})
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active!==null){event.preventDefault();close()}},{signal:abort.signal})
 bar.append(title,state);root.replaceChildren(stage,bar,dock,panel)
 return {open,close,speaker(value){speaker=value;describe()},label(id,value){const item=panels.find(p=>p.id===id),button=buttons.get(id);if(!item||!button)return;item.label=value;button.setAttribute('aria-label',value);button.title=value;button.querySelector('span:last-child').textContent=value;if(active===id){heading.textContent=value;panel.setAttribute('aria-label',value)}},notify(count){state.setAttribute('data-attention',String(count>0));state.title=count?count+' notifications':'Connection status'},dispose(){resize.disconnect();abort.abort();buttons.clear();bodies.clear();root.replaceChildren()}}
}
