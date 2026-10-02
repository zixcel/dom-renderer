// Trusted installed DOM primitives. All external values are text, never HTML.
// Hatter downstream 2026: one bounded DOM tree for spatial and structured Scenes.
import {validateInputDeclaration,validateInputValues} from '@zixcel/interaction/input'
import {spatialView} from './spatial.mjs'
import {symbol} from './symbol.mjs'
import {reconcileChildren} from './reconcile.mjs'
import {createWorldSurface} from './world-surface.mjs'
import {bookReader} from './book-reader.mjs'
export {createWorldSurface} from './world-surface.mjs'
export {symbol} from './symbol.mjs'
export {windowFrame} from './frame.mjs'
export {worldControlGuide} from './world-input.mjs'
export {spatialView} from './spatial.mjs'
export {structureGraph} from './structure-graph.mjs'
export const renderBounds=Object.freeze({nodes:8192,depth:20,textBytes:524288})
const fail=code=>{throw Object.assign(Error(code),{code})}
export function element(document,tag,text=null,attrs={}){
 const node=document.createElement(tag);if(text!==null)node.textContent=String(text)
 for(const [key,value]of Object.entries(attrs))if(value!==null)node.setAttribute(key,String(value))
 return node
}
export function valueView(document,value,budget={nodes:0,bytes:0}){
 const walk=(value,depth)=>{
  if(++budget.nodes>renderBounds.nodes||depth>renderBounds.depth)fail('RenderLimitExceeded')
  if(value===null||typeof value!=='object'){
   const text=JSON.stringify(value);if(typeof text!=='string')fail('InvalidRenderValue')
   budget.bytes+=new TextEncoder().encode(text).length;if(budget.bytes>renderBounds.textBytes)fail('RenderLimitExceeded')
   return element(document,'span',text,{'data-projection-scalar':text})
  }
  if(Object.keys(value).length>4096)fail('RenderLimitExceeded')
  if(!Object.keys(value).length)return element(document,'span',Array.isArray(value)?'[]':'{}',{'data-empty-value':Array.isArray(value)?'array':'object'})
  const list=element(document,Array.isArray(value)?'ol':'dl')
  for(const [key,child]of Object.entries(value)){
   if(Array.isArray(value)){const item=element(document,'li');item.append(walk(child,depth+1));list.append(item)}
   else{const name=element(document,'dt',key),item=element(document,'dd');item.append(walk(child,depth+1));list.append(name,item)}
  }
  return list
 }
 return walk(value,0)
}
export class SceneRenderer{
 #root;#events;#abort=null;#actionHandles=new Map();#spatial=null;#slots;#pose=null;#poseKey=null;#speaker=null;#surface;#ownsSurface;#garden=null
 constructor(root,onEvent,slots={},surface=null){this.#root=root;this.#events=onEvent;this.#slots=slots;this.#surface=surface??createWorldSurface();this.#ownsSurface=!surface}
 render(plan){
  const root=this.#root,document=root.ownerDocument,focused=document.activeElement?.dataset.control
  const previous=root.querySelector('[data-render-key]'),oldViewport=root.querySelector('.scene-viewport')
  const scroll=previous?.dataset.renderKey===plan.projectionKey&&previous.dataset.viewMode===plan.viewMode&&oldViewport
    ?{left:oldViewport.scrollLeft,top:oldViewport.scrollTop}:null
  if(this.#poseKey===plan.projectionKey)this.#pose=this.#spatial?.snapshot()??this.#pose
  else this.#pose=null
  this.#poseKey=plan.projectionKey
  this.#spatial?.close();this.#spatial=null;this.#abort?.abort();this.#abort=new AbortController();this.#actionHandles.clear()
  if(!['spatial','structured'].includes(plan.viewMode)||!Array.isArray(plan.relations)||plan.relations.length>512)fail('InvalidRenderPlan')
  const section=element(document,'section',null,{'data-render-revision':plan.projectionRevision,'data-render-key':plan.projectionKey,'data-view-mode':plan.viewMode,'aria-label':'Scene content',tabindex:'-1',class:'semantic-scene'})
  const button=(label,kind,id,attrs={})=>element(document,'button',label,{type:'button','data-kind':kind,'data-control':JSON.stringify([kind,id]),'data-target':id,...attrs})
  const views=element(document,'div',null,{role:'group','aria-label':'Scene view',class:'scene-view-controls'})
  for(const [mode,label]of [['spatial','Spatial view'],['structured','List view']])views.append(button(label,'view',mode,{'aria-pressed':plan.viewMode===mode}))
  const tools=this.#slots.tools??section;tools.replaceChildren();tools.append(views)
  const viewport=element(document,'div',null,{class:'scene-viewport',tabindex:'0','aria-label':'Explore information in this space'}),board=element(document,'div',null,{class:'spatial-board'})
  for(const person of this.#garden?.actors??(this.#speaker?[this.#speaker]:[])){const actor=button('',this.#garden?'actor':'conversation',person.id,{'data-world-object':person.id,'data-selected':person.id===this.#speaker?.id,'data-observation-label':person.preparation?.label??''});actor.append(element(document,'strong',person.title));actor.disabled=person.status!==undefined&&person.status!=='Available';board.append(actor)}
  const camera=element(document,'div',null,{role:'group','aria-label':'View position',class:'scene-camera'})
  for(const [id,label,icon]of [['left','Move left','←'],['right','Move right','→'],['in','Zoom in','+'],['out','Zoom out','−'],['reset','View all','⛶']])camera.append(button(icon,'camera',id,{'aria-label':label,title:label}))
  if(plan.viewMode==='spatial')tools.append(camera)
  viewport.append(board);(plan.viewMode==='structured'?tools:section).append(viewport)
  if(plan.empty)section.append(element(document,'p','No projected information is available.',{role:'status'}))
  if(plan.truncated)section.append(element(document,'p','The source reports incomplete information.',{role:'status'}))
  const groups=[...plan.regions,...(plan.unplaced.length?[{id:'unplaced',role:'Context',items:plan.unplaced}]:[])]
  if(groups.length>17||plan.actions.length>64)fail('RenderLimitExceeded')
  for(const group of groups){
   const region=element(document,'section',null,{'data-region':group.id}),list=element(document,'ul',null,{class:'scene-items'})
   region.append(element(document,'h2',group.role),list)
   for(const item of group.items){
    const row=element(document,'li',null,{'data-item-id':item.id,'data-selected':item.selected,'data-related':item.related,'data-focused':item.focused}),toolbar=element(document,'div',null,{class:'item-tools'})
    const itemButton=(label,kind,attrs={})=>button(label,kind,item.id,{'data-control':JSON.stringify([group.id,kind,item.id]),...attrs})
    toolbar.append(itemButton(item.display?.title??item.content.reason??'Display not configured','select',{'aria-pressed':item.selected}),itemButton('View details','inspect',{'aria-expanded':plan.inspector?.id===item.id,'aria-haspopup':'dialog'}))
    if(item.content.reason)toolbar.append(itemButton('Review','resolve'))
    const solid=element(document,'span',null,{class:'object-solid','aria-hidden':'true'})
    solid.append(symbol(document,item.display?.symbol??'nodes'));row.append(solid,toolbar)
    if(item.display?.summary)row.append(element(document,'p',item.display.summary,{'data-item-summary':item.id}))
    const fields=element(document,'dl',null,{class:'object-fields'})
    for(const field of item.display?.fields??[])fields.append(element(document,'dt',field.label),element(document,'dd',field.value===null?'Not set':String(field.value),{'data-projection-scalar':JSON.stringify(field.value)}))
    row.append(fields)
    if(!item.display)row.append(element(document,'p',item.content.reason?'This information is not yet resolved. Review the available choices or the missing requirements.':'Display information is not configured. Inspect this object in System.'))
    list.append(row)
   }
   board.append(region)
  }
  const time=element(document,'section',null,{'aria-label':'Scene time',class:'scene-time'})
  time.append(element(document,'h2',plan.temporal?.label??'Time'))
  if(plan.temporal?.items.length){
   time.append(button('All times','time','',{'aria-pressed':plan.temporal.cursor===null}))
   for(const item of plan.temporal.items){const control=button(item.at+' · '+item.itemId,'time',item.itemId,{'aria-pressed':plan.temporal.cursor===item.itemId});time.append(control)}
  }else time.append(element(document,'p','No event time has been declared by this source.',{role:'status'}))
  tools.append(time)
  if(plan.relations.length){
   const relations=element(document,'details',null,{'aria-label':'Relationships'}),list=element(document,'ul',null,{class:'scene-relations'})
   relations.append(element(document,'summary','Relationships ('+plan.relations.length+')'),list)
   for(const relation of plan.relations){
    const row=element(document,'li',null,{'data-relation-id':relation.id,'data-active':relation.active})
    row.append(button(relation.from,'select',relation.from,{'data-control':JSON.stringify(['relation',relation.id,'from']),'aria-label':'Select related '+relation.from}),element(document,'span','→ '+relation.relationRef+' →'),button(relation.to,'select',relation.to,{'data-control':JSON.stringify(['relation',relation.id,'to']),'aria-label':'Select related '+relation.to}))
    list.append(row)
   }
   tools.append(relations)
  }
  const actions=this.#slots.actions??tools;if(this.#slots.actions)actions.replaceChildren()
  // Unresolved owner observations are conversation material too, including
  // when no executable choice exists. This does not manufacture an action.
  const pending=groups.flatMap(group=>group.items).filter(item=>item.content.reason)
  if(pending.length){
   const questions=element(document,'section',null,{'aria-label':'Information needing clarification'})
   questions.append(element(document,'h3','Why this information needs review'))
   for(const item of pending){
    const row=element(document,'div',null,{'data-unresolved-ref':item.id})
    const explanation=this.#slots.describeUnresolved?.(item.content.reason)??{label:String(item.content.reason),detail:'The source owner reported this unresolved reason.'}
    row.append(button(item.display?.title??explanation.label,'resolve',item.id),element(document,'small',explanation.detail))
    questions.append(row)
   }
   actions.append(questions)
  }
  for(const action of plan.actions){this.#actionHandles.set(action.handle.actionId,action.handle);actions.append(button(action.descriptor.label,'action',action.handle.actionId))}
  const lastBook=(this.#slots.details??root).querySelector('[data-book-id]'),bookPosition=lastBook?{id:lastBook.dataset.bookId,revision:lastBook.dataset.bookRevision,page:Number(lastBook.dataset.bookPage)}:null
  this.#slots.details?.replaceChildren()
  if(plan.inspector){
   const chosen=groups.flatMap(r=>r.items).find(i=>i.id===plan.inspector.id)
   if(chosen)(this.#slots.details??section).append(bookReader(document,chosen,plan.projectionRevision,button('Close book','dismiss',plan.inspector.id),this.#abort.signal,bookPosition))
  }
  reconcileChildren(root,[section])
  const activeViewport=plan.viewMode==='spatial'?root.querySelector('.scene-viewport'):viewport,activeBoard=activeViewport.querySelector('.spatial-board')
  if(plan.viewMode==='spatial'||this.#garden)this.#spatial=spatialView(this.#garden?.host??activeViewport,activeBoard,plan.camera,plan.relations,this.#abort.signal,this.#pose,null,{
   surface:this.#surface,activity:this.#garden?.activity,target:this.#garden?'garden':plan.projectionKey,context:this.#garden?plan.projectionKey:null,pattern:this.#garden?'garden':'constellation',items:new Map(groups.flatMap(region=>region.items.map(item=>[item.id,{
    anchor:this.#speaker?.id,group:item.content.group,semanticRef:item.content.semanticRef,sourceRefs:item.content.sourceRefs,scalars:(item.display?.fields??[]).map(f=>f.value),unresolved:Boolean(item.content.reason),changeKey:JSON.stringify(item.display?.fields??[])
   }])))
  })
  if(this.#garden&&plan.viewMode==='structured')activeBoard.hidden=false
  for(const host of new Set([root,...Object.values(this.#slots)]))host.addEventListener('click',event=>{
   const target=event.target.closest('button[data-kind]');if(!target||!host.contains(target))return
   if(target.dataset.kind==='camera'){this.#spatial?.change(target.dataset.target);return}
   this.#events(target.dataset.kind,target.dataset.kind==='action'?this.#actionHandles.get(target.dataset.target):target.dataset.target)
  },{signal:this.#abort.signal})
  if(focused)[...root.querySelectorAll('[data-control]')].find(n=>n.dataset.control===focused)?.focus({preventScroll:true})
  if(scroll){viewport.scrollLeft=scroll.left;viewport.scrollTop=scroll.top}
 }
 camera(value){this.#spatial?.apply(value)}
 speaker(value){this.#speaker=value}
 garden(value){this.#garden=value}
 activity(value){this.#spatial?.activity(value)}
 changeCamera(action){this.#spatial?.change(action)}
 close(){this.#spatial?.close();this.#spatial=null;this.#abort?.abort();this.#actionHandles.clear();this.#root.replaceChildren();for(const slot of Object.values(this.#slots))slot.replaceChildren();if(this.#ownsSurface){this.#surface.close();this.#surface=createWorldSurface()}}
 dispose(){this.close();if(this.#ownsSurface)this.#surface.close()}
}
export function inputForm(document,declaration,onSubmit){
 if(validateInputDeclaration(declaration).length)fail('InvalidInputDeclaration')
 const form=element(document,'form'),fields=new Map(),abort=new AbortController(),prefix='input-'+crypto.randomUUID()
 const fieldIds=[...new Set([...declaration.action.input_schema.required,...Object.keys(declaration.fields)])]
 for(const id of fieldIds){
  const field=declaration.fields[id]
  const schema=declaration.action.input_schema.fields[id],label=element(document,'label'),name=element(document,'span',field.label)
  let input
  if(field.choices){input=element(document,'select');input.append(element(document,'option','Choose…',{value:''}));for(const choice of field.choices)input.append(element(document,'option',choice.label,{value:choice.value}))}
  else if(schema.type==='string'&&!field.sensitive&&schema.max_length>255){input=element(document,'textarea');input.rows=4;input.maxLength=schema.max_length}
  else{input=element(document,'input');input.type=schema.type==='boolean'?'checkbox':['integer','number'].includes(schema.type)?'number':field.sensitive?'password':'text'
   if(schema.type==='string')input.maxLength=schema.max_length??4096
   if(schema.type==='integer')input.step='1'
   if(schema.type==='number')input.step='any'
   if(schema.minimum!==undefined)input.min=String(schema.minimum)
   if(schema.maximum!==undefined)input.max=String(schema.maximum)
  }
  input.id=prefix+'-'+fields.size;input.name=id;input.autocomplete='off';label.htmlFor=input.id;label.append(name);form.append(label,input);fields.set(id,{input,schema})
 }
 const submit=element(document,'button','Submit',{type:'submit'}),status=element(document,'div','',{role:'status'});form.append(submit,status)
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return
  const values={};for(const [id,{input,schema}]of fields){
   // An absent optional value is not zero, null, false or an empty string.
   if(input.value===''&&schema.type!=='boolean'&&!declaration.action.input_schema.required.includes(id))continue
   values[id]=schema.type==='boolean'?input.checked:['number','integer'].includes(schema.type)?(input.value===''?null:Number(input.value)):input.value
  }
  if(validateInputValues(declaration,values).length){status.textContent='Check the declared input constraints.';return}
  submit.disabled=true;form.setAttribute('aria-busy','true')
  try{await onSubmit(values);if(!abort.signal.aborted)status.textContent='Submitted.'}
  catch(error){if(!abort.signal.aborted){status.setAttribute('role','alert');status.replaceChildren(valueView(document,{code:error.code??'OperationUnavailable',...(error.ownerFailure?{ownerFailure:error.ownerFailure}:{})}))}}
  finally{for(const {input}of fields.values())if(input.type==='password')input.value='';submit.disabled=false;form.setAttribute('aria-busy','false')}
 },{signal:abort.signal})
 return {form,close(){abort.abort();for(const {input}of fields.values())input.value='';form.remove()}}
}
