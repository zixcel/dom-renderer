import {createWorld} from './world-runtime.mjs'
// Installed RenderPlan/role controls remain the only operation authority.
export function spatialView(viewport,board,camera,relations,signal,pose,conversation=null,presentation={}){
 const nodes=()=>[...board.querySelectorAll('[data-item-id],[data-world-object]')]
 const declarations=()=>nodes().filter(node=>!node.hidden).map(node=>({
  id:node.dataset.itemId??node.dataset.worldObject,
  ...presentation.items?.get(node.dataset.itemId),
  kind:node.hasAttribute('data-world-object')?'character':'record',
  title:node.querySelector('strong,[data-kind=select]')?.textContent??'Information',
  summary:node.querySelector('[data-item-summary]')?.textContent?.slice(0,80)??'',
  observationLabel:node.dataset.observationLabel??'',
  disabled:node.disabled===true,selected:node.dataset.selected==='true'
 }))
 const options={objects:declarations(),relations,pose,conversation,activity:presentation.activity,target:presentation.target,pattern:presentation.pattern,context:presentation.context,onActivate:id=>{
  const node=nodes().find(node=>(node.dataset.itemId??node.dataset.worldObject)===id)
  if(!node||node.hidden||node.disabled)return
  ;(node.hasAttribute('data-world-object')?node:node.querySelector('[data-kind=inspect]'))?.click()
 }}
 const lease=presentation.surface?.attach(viewport,options),world=lease?.world??createWorld(viewport,options)
 board.hidden=true;world.apply(camera)
 const observer=new viewport.ownerDocument.defaultView.MutationObserver(()=>world.update(declarations(),relations))
 observer.observe(board,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','data-selected','disabled']})
 let closed=false
 const close=()=>{if(closed)return;closed=true;observer.disconnect();if(lease)lease.release();else world.close();board.hidden=false}
 signal.addEventListener('abort',close,{once:true})
 return {change:world.change,apply:world.apply,snapshot:world.snapshot,pause:world.pause,activity:world.activity,close}
}
