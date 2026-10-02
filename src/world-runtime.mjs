import {layoutWorld,worldLimits,initialPose,movePose,lookPose,cameraMatrix,screenPoint,renderSize,clamp,pickWorld,fitPose,viewCamera} from './world-model.mjs'
import {MOUSE,TOUCH} from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {createGpu,worldGeometry} from './world-gpu.mjs'
import {spatialPattern,spatialPatterns,spatialGroupings} from './spatial-patterns.mjs'
import {objectForms,spacingPresets,objectBounds} from './object-presentation.mjs'
import {keyDirection} from './world-input.mjs'
import {frameLayout} from './frame-layout.mjs'
import {mapProjection} from './open-world-projection.mjs'

// Host-local presentation. No persistence, network, grants, inference or synthetic people.
export function createWorld(host,{objects=[],relations=[],pose:restored,onActivate=()=>{},conversation=null,activity=null,target=null,pattern='ground',context=null,activityPresentation={}}={}){
 if(restored?.target!==target)restored=null
 const document=host.ownerDocument,window=document.defaultView,controller=new AbortController(),{signal}=controller
 const make=(tag,className,text)=>{const n=document.createElement(tag);n.className=className;if(text)n.textContent=text;return n}
 const wrap=make('section','mind-world'),canvas=make('canvas','world-canvas'),labels=make('div','world-labels'),hud=make('div','world-hud')
 canvas.tabIndex=0;canvas.setAttribute('aria-label','Explore your world. W A S D or arrows to walk. Drag to look. E to interact. M for Map. Q to mark.')
 wrap.setAttribute('aria-label','Thinking garden');wrap.dataset.presentationOnly='true'
 const aim=make('span','world-aim','+'),hint=make('button','world-hint'),status=make('p','world-gpu-error')
 aim.setAttribute('aria-hidden','true');status.hidden=true;status.setAttribute('role','alert')
 const tools=make('div','world-controls'),nearby=make('details','world-nearby'),list=make('div','world-directory'),summary=make('summary','','In this space')
 hint.type='button';hint.addEventListener('click',()=>{nearby.open=true},{signal})
 nearby.append(summary,list);hud.append(hint,tools,nearby)
 wrap.append(canvas,labels,aim,hud,status);host.prepend(wrap)
 const roleStatus=(value,id)=>activityPresentation.describeRole?.(value,id)??null
 const engine=activityPresentation.createView?.(document,wrap)??{panel:document.createElement('div'),update(){}}
 engine.panel.hidden=pattern==='garden'
 let spacing='balanced',placedSpacing=null
 let pose=restored?Object.fromEntries(Object.keys(initialPose()).map(key=>[key,restored[key]])):initialPose(),model={items:[],relations:[]},gpu=null,geometry=null,actorRanges=[],closed=false,lost=false,dirty=true,frame=null,motionTimer=null,last=0,frames=0,drag=null,hovered=null,paused=false,zoom=1
 let projected=[],labelNodes=new Map(),directoryNodes=new Map(),geometryKey=null,uploads=0,initializations=0,navigation='overview',needsFit=!restored,lastWidth=0,lastHeight=0,selectedId=null,markedId=null
 const recent=new Map(),poses=new Map()
 let fittedPopulation=Boolean(restored?.populated)
 let sourceObjects=[],sourceRelations=relations,view=restored?.presentation??{pattern,groupBy:'declared',group:null,page:0},projection=null,inputKey=null
 wrap.dataset.target=target??''
 const bubble=make('aside','world-conversation');bubble.hidden=true;bubble.setAttribute('role','dialog');bubble.tabIndex=-1;wrap.append(bubble)
 let conversationId=null,returnFocus=null
 let anchorId=null
 const shell=host.closest('.delivery-shell')
 shell?.addEventListener('world-anchor-request',event=>{anchorId=event.detail.id;publishAnchor()},{signal})
 function objectRect(id){
  const item=model.items.find(item=>item.id===id),width=host.clientWidth,height=host.clientHeight
  if(!item||!width||!height)return null
  const [w,h,d]=objectBounds[item.form],matrix=cameraMatrix(pose,width/height,zoom),points=[]
  for(const x of [-w/2,w/2])for(const y of [0,h])for(const z of [-d/2,d/2]){
   const point=screenPoint(matrix,item.x+x,item.y+y,item.z+z,width,height)
   if(point?.visible)points.push(point)
  }
  if(!points.length)return null
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))}
 }
 function publishAnchor(){if(anchorId)shell?.dispatchEvent(new window.CustomEvent('world-anchor',{detail:{id:anchorId,bounds:objectRect(anchorId)}}))}
 const map=make('details','world-map'),mapList=make('div','world-map-list'),mapNote=make('small',''),mapButton=make('button','','Mark selected')
 mapButton.type='button';map.append(make('summary','','Map'),mapNote,mapList,mapButton);hud.append(map)
 const keys=new Set(),inputBlocked=()=>paused||nearby.open||map.open||!bubble.hidden||!document.hasFocus()||Boolean(document.querySelector('.frame-panel:not([hidden])'))
 const button=(text,label,action,parent=tools)=>{const b=make('button','',text);b.type='button';b.setAttribute('aria-label',label);b.addEventListener('click',action,{signal});parent.append(b);return b}
 const inspect=button('Inspect','Inspect aimed object',()=>activate(hovered))
 const reset=button('⛶','View all',()=>overview());reset.dataset.overviewControl='true'
 const settings=make('div','world-layout'),breadcrumb=make('div','world-breadcrumb'),location=make('output',''),pagination=make('div','world-pagination')
 const selector=(label,entries,change)=>{const field=make('label','',label),select=make('select','');select.setAttribute('aria-label',label);for(const [id,title]of entries){const option=make('option','',title);option.value=id;select.append(option)}select.addEventListener('change',()=>change(select.value),{signal});field.append(select);settings.append(field);return select}
 const navigationSelect=selector('Navigation',[['overview','Overview'],['explore','Walk through world']],value=>{navigation=value;walk.hidden=value!=='explore';if(value==='overview')overview();else{pose={...initialPose(),cameraMode:'third-person'};stopInput();invalidate()}})
 const patternSelect=selector('Spatial layout',spatialPatterns,value=>{view={...view,pattern:value,group:null,page:0};needsFit=true;update(sourceObjects,sourceRelations)})
 const groupSelect=selector('Group by',spatialGroupings,value=>{view={...view,groupBy:value,group:null,page:0};needsFit=true;update(sourceObjects,sourceRelations)})
 selector('Object spacing',Object.keys(spacingPresets).map(id=>[id,id[0].toUpperCase()+id.slice(1)]),value=>{spacing=value;needsFit=true;update(sourceObjects,sourceRelations)}).value=spacing
 const legend=make('p','world-legend',pattern==='garden'?'People are shown here. Their published information is available inside each person’s panel; movement is visual only.':'Placement follows layout settings; only lines represent declared relationships.');settings.append(legend)
 const back=button('All shelves','Return to all shelves',()=>{view={...view,group:null,page:0};needsFit=true;update(sourceObjects,sourceRelations)},breadcrumb)
 breadcrumb.append(location);hud.append(breadcrumb);nearby.append(pagination,settings)
 const previous=button('Previous','Previous objects',()=>{view={...view,page:view.page-1};needsFit=true;update(sourceObjects,sourceRelations)},pagination),pageCount=make('output','')
 pagination.append(pageCount)
 const nextPage=button('Next','Next objects',()=>{view={...view,page:view.page+1};needsFit=true;update(sourceObjects,sourceRelations)},pagination)
 const updates=make('details','world-updates'),updatesTitle=make('summary','','Observed changes'),updateList=make('div',''),updateHelp=make('p','','Changes observed while this view is open. Not execution history.')
 updates.setAttribute('aria-label','Changes in this view');updates.append(updatesTitle,updateHelp,updateList);hud.append(updates)
 const query=make('input',''),noMatches=make('p','','No matching objects in this scope.')
 query.type='search';query.maxLength=128;query.placeholder='Find in this space';query.setAttribute('aria-label','Find in this space');noMatches.hidden=true
 nearby.insertBefore(query,list);nearby.insertBefore(noMatches,list)
 function filterDirectory(){let count=0;const term=query.value.trim().toLocaleLowerCase();for(const row of directoryNodes.values()){row.hidden=!row.textContent.toLocaleLowerCase().includes(term);if(!row.hidden)count++}noMatches.hidden=!term||count>0}
 query.addEventListener('input',filterDirectory,{signal})
 host.closest('.delivery-shell')?.addEventListener('frame-panel-open',()=>{nearby.open=false;map.open=false;updates.open=false;closeConversation()},{signal})
 nearby.addEventListener('toggle',()=>{map.hidden=nearby.open;if(nearby.open){map.open=false;updates.open=false;closeConversation()}},{signal})
 updates.addEventListener('toggle',()=>{if(updates.open){nearby.open=false;closeConversation()}},{signal})
 map.addEventListener('toggle',()=>{if(map.open){nearby.open=false;updates.open=false;closeConversation();stopInput()}},{signal})
 const orbitCamera=viewCamera(pose,1),orbit=new OrbitControls(orbitCamera,canvas)
 orbit.enableDamping=false;orbit.autoRotate=false;orbit.enableRotate=false;orbit.screenSpacePanning=true;orbit.minDistance=3;orbit.maxDistance=1500
 orbit.mouseButtons.LEFT=MOUSE.PAN;orbit.touches.ONE=TOUCH.PAN;orbit.touches.TWO=TOUCH.DOLLY_PAN
 let syncing=false
 orbit.addEventListener('change',()=>{if(syncing)return;pose={x:orbitCamera.position.x,y:orbitCamera.position.y,z:orbitCamera.position.z,yaw:-orbitCamera.rotation.y,pitch:orbitCamera.rotation.x,focus:{x:orbit.target.x,y:orbit.target.y,z:orbit.target.z}};needsFit=false;invalidate()})
 function syncOrbit(){syncing=true;viewCamera(pose,Math.max(.1,host.clientWidth/Math.max(1,host.clientHeight)),zoom,orbitCamera);const focus=pose.focus??{x:pose.x,y:pose.y,z:pose.z-8};orbit.target.set(focus.x,focus.y,focus.z);orbit.update();syncing=false}
 function overview(){navigation='overview';navigationSelect.value=navigation;walk.hidden=true;lastWidth=host.clientWidth;lastHeight=host.clientHeight;pose=fitPose(model.items,lastWidth/Math.max(1,lastHeight));needsFit=false;stopInput();syncOrbit();invalidate()}
 function fitViewport(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height||(lastWidth===width&&lastHeight===height))return;lastWidth=width;lastHeight=height;if(navigation==='overview'){pose=fitPose(model.items,width/height);syncOrbit()}invalidate()}
 function focusObject(id){const item=model.items.find(i=>i.id===id);if(!item)return;selectedId=id;wrap.dataset.selectedId=id
  for(const [ref,node]of labelNodes)node.dataset.selected=String(ref===id)
  renderMap();pose=navigation==='overview'?fitPose([item],host.clientWidth/Math.max(1,host.clientHeight)):{...initialPose(),cameraMode:'third-person',x:item.x,y:item.y+1.85,z:item.z+6,pitch:0};syncOrbit();invalidate()}
 function renderMap(){
  const projected=mapProjection(model.items,{selected:selectedId,marked:markedId}),items=projected.items
  mapNote.textContent=projected.omitted?`${items.length} of ${projected.total} objects shown. Narrow this view to see the rest.`:`${items.length} objects in this view`
  mapButton.disabled=!selectedId||!model.items.some(item=>item.id===selectedId);mapButton.textContent=selectedId===markedId?'Clear marker':'Mark selected'
  mapList.replaceChildren();if(!items.length)return
  const xs=items.map(item=>item.x),zs=items.map(item=>item.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs)
  for(const item of items){const node=make('button','world-map-point',item.title.slice(0,1).toUpperCase());node.type='button';node.title=item.title;node.dataset.mapId=item.id;node.dataset.selected=String(item.selected);node.dataset.marked=String(item.marked)
   node.setAttribute('aria-label','Find '+item.title+' on map');node.style.left=(10+80*(item.x-minX)/Math.max(1,maxX-minX))+'%';node.style.top=(10+80*(item.z-minZ)/Math.max(1,maxZ-minZ))+'%';mapList.append(node)}
 }
 mapList.addEventListener('click',event=>{const id=event.target.closest('[data-map-id]')?.dataset.mapId;if(id)focusObject(id)},{signal})
 mapButton.addEventListener('click',()=>{if(!selectedId)return;markedId=markedId===selectedId?null:selectedId;wrap.dataset.markedId=markedId??'';for(const [id,node]of labelNodes)node.dataset.marked=String(id===markedId);renderMap()},{signal})
 const enableOrbit=()=>{orbit.enabled=navigation==='overview'&&!inputBlocked();if(orbit.enabled)syncOrbit()}
 canvas.addEventListener('pointerdown',enableOrbit,{signal,capture:true});canvas.addEventListener('wheel',enableOrbit,{signal,capture:true})
 function closeConversation(){conversationId=null;bubble.hidden=true;bubble.replaceChildren();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;invalidate()}
 function activate(id){const item=model.items.find(item=>item.id===id);if(!item||item.disabled)return;selectedId=id;wrap.dataset.selectedId=id;for(const [ref,node]of labelNodes)node.dataset.selected=String(ref===id);renderMap();stopInput();nearby.open=false;map.open=false
  if(item.kind==='group'){view={...view,group:view.pattern==='garden'&&view.group===item.id?null:item.id,page:0};needsFit=view.pattern!=='garden';update(sourceObjects,sourceRelations);if(view.pattern==='garden')focusObject(item.id);return}
  recent.delete(id);renderUpdates()
  const body=conversation?.(item,()=>{closeConversation();onActivate(id)})
  if(!body){onActivate(id);return}
  returnFocus=document.activeElement;conversationId=id;bubble.setAttribute('aria-label','Conversation with '+item.title)
  const title=make('strong','',item.title),dismiss=make('button','','×');dismiss.type='button';dismiss.setAttribute('aria-label','Close conversation');dismiss.addEventListener('click',closeConversation,{once:true})
  const head=make('header','');head.append(title,dismiss);bubble.replaceChildren(head,body);bubble.hidden=false;bubble.focus({preventScroll:true});positionBubble();invalidate()
 }
 function positionBubble(){
  if(!conversationId)return
  if(!model.items.some(item=>item.id===conversationId)){closeConversation();return}
  const {panel}=frameLayout(host.clientWidth,host.clientHeight,'actions',objectRect(conversationId))
  Object.assign(bubble.style,{left:panel.x+'px',top:panel.y+'px',width:panel.width+'px',height:panel.height+'px',maxHeight:panel.height+'px'})
 }
 function stopInput(){keys.clear();drag=null;if(document.pointerLockElement===canvas)document.exitPointerLock()}
 function stopFrame(){if(frame!==null){window.cancelAnimationFrame(frame);frame=null}if(motionTimer!==null){window.clearTimeout(motionTimer);motionTimer=null}last=0}
 function invalidate(){dirty=true;if(!closed&&!paused&&!lost&&!document.hidden&&frame===null)frame=window.requestAnimationFrame(tick)}
 function tick(now){
  frame=null;if(closed||paused||lost||document.hidden)return
  if(inputBlocked())keys.clear()
  const moving=keys.size>0
  if(now-last<1000/worldLimits.fps){if(dirty||moving)frame=window.requestAnimationFrame(tick);return}
  if(moving){pose=movePose(pose,Number(keys.has('forward'))-Number(keys.has('back')),Number(keys.has('right'))-Number(keys.has('left')),last?(now-last)/1000:1/30,Number(keys.has('rise'))-Number(keys.has('descend')));dirty=true}
  last=now
  if(dirty){dirty=false;draw()}
  if(moving)frame=window.requestAnimationFrame(tick)
 }
 function draw(){
  if(!gpu)return
  const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return
  fitViewport()
  const size=renderSize(width,height,window.devicePixelRatio||1)
  const matrix=cameraMatrix(pose,width/height,zoom)
  const visibleActors=new Set(model.items.filter(item=>item.kind==='character').filter(item=>{const point=screenPoint(matrix,item.x,item.y+1.5,item.z,width,height);return point?.visible&&point.depth<150}).map(item=>item.id))
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)visibleActors.clear()
  gpu.draw(pose,width/height,zoom,size,window.performance.now(),visibleActors);frames++;positionBubble()
  wrap.dataset.animatedNpcs=String(visibleActors.size)
  if(visibleActors.size&&motionTimer===null&&!paused&&!document.hidden)
   motionTimer=window.setTimeout(()=>{motionTimer=null;invalidate()},200)
  projected=[]
  for(const item of model.items){const point=screenPoint(matrix,item.x,item.y+objectBounds[item.form][1]+.45,item.z,width,height);if(point?.visible&&point.depth<1800)projected.push({item,...point})}
  projected.sort((a,b)=>a.depth-b.depth)
  const displayed=[],labelWidth=width<600?138:182
  for(const point of projected){
   const x=clamp(point.x,90,width-90),y=clamp(point.y,96,Math.max(96,height-80))
   if(displayed.some(p=>Math.abs(p.x-x)<labelWidth&&Math.abs(p.y-y)<85))continue
   displayed.push({...point,x,y});if(displayed.length===8)break
  }
  const visible=new Set(displayed.map(p=>p.item.id))
  for(const [id,node]of labelNodes)node.hidden=!visible.has(id)
  for(const point of displayed){const node=labelNodes.get(point.item.id);node.style.left=point.x+'px';node.style.top=point.y+'px';node.dataset.distance=point.depth.toFixed(1)}
  publishAnchor()
  hovered=pickWorld(model.items,pose,width/2,height/2,width,height,zoom)
  const target=model.items.find(item=>item.id===hovered)
  inspect.disabled=!hovered;inspect.hidden=navigation==='overview';aim.hidden=navigation==='overview'
  hint.textContent=navigation==='overview'?(view.pattern==='garden'?`Open people · ${model.items.filter(item=>item.kind==='character').length}`:`Browse this space · ${model.items.length}`):target?target.title+' · Inspect':model.items.length?'Select a person or a group':'No information is visible in this view'
  hint.hidden=navigation!=='overview'||!model.items.length
  canvas.setAttribute('aria-label',navigation==='overview'?'Explore your world. Drag to pan. Wheel or pinch to zoom. Select an object to focus. M for Map.':'Explore your world. W A S D or arrows to walk. Drag to look. E to interact. M for Map. Q to mark.')
  for(const [id,node]of labelNodes)node.dataset.aimed=String(id===hovered)
  wrap.dataset.pose=JSON.stringify(pose);wrap.dataset.frames=String(frames);wrap.dataset.instances=String(gpu.count);wrap.dataset.objects=String(model.items.length);wrap.dataset.bufferPixels=String(canvas.width*canvas.height);wrap.dataset.renderer='three';wrap.dataset.renderStats=JSON.stringify(gpu.stats);wrap.dataset.cameraMode=pose.cameraMode??'overview';wrap.dataset.avatar=pose.cameraMode==='third-person'?'present':'hidden'
  wrap.dataset.uploads=String(uploads);wrap.dataset.initializations=String(initializations);wrap.dataset.navigation=navigation
 }
 function fail(error){stopInput();stopFrame();status.hidden=false;status.textContent=(error.code??error.message??'WorldRenderingUnavailable')+' — The 3D view is unavailable. Use “In this space” to inspect the available information.';wrap.dataset.gpu='unavailable'}
 function initialize(){try{gpu=createGpu(canvas);initializations++;gpu.pattern(view.pattern);if(geometry){gpu.upload(geometry,actorRanges);gpu.motionStates(new Map(model.items.filter(i=>i.kind==='character').map(i=>[i.id,roleStatus(activity,i.id)?.state??'Idle'])));uploads++}lost=false;status.hidden=true;wrap.dataset.gpu='ready';invalidate()}catch(error){gpu?.close();gpu=null;fail(error)}}
 const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value}
 function renderUpdates(){
  const latest=[...recent.values()].at(-1)
  updatesTitle.textContent=latest?'Observed changes · '+recent.size+' · '+latest.title+' · '+latest.kind:'No changes observed in this view'
  updateList.replaceChildren()
  for(const [id,change]of [...recent].reverse()){
   const button=make('button','',change.title+' · '+change.kind);button.type='button';button.dataset.changeId=id
   button.disabled=!sourceObjects.some(item=>item.id===id);updateList.append(button)
  }
  for(const [id,node]of labelNodes)node.dataset.updated=String(recent.has(id))
 }
 updateList.addEventListener('click',event=>{
  const id=event.target.closest('[data-change-id]')?.dataset.changeId;if(!id)return
  if(view.pattern==='garden'&&!model.items.some(item=>item.id===id)){updates.open=false;onActivate(id);return}
  const group=projection?.groups.find(group=>group.memberIds.includes(id))
  if(group){view={...view,group:group.id,page:0};update(sourceObjects,sourceRelations)
   const index=(view.pattern==='garden'?group.memberIds:[...sourceObjects.filter(i=>i.kind==='character').map(i=>i.id),...group.memberIds]).indexOf(id)
   if(index>=24){view={...view,page:Math.floor(index/24)};update(sourceObjects,sourceRelations)}
  }
  updates.open=false;focusObject(id)
 },{signal})
 labels.addEventListener('click',event=>activate(event.target.closest('[data-world-id]')?.dataset.worldId),{signal})
 list.addEventListener('click',event=>{
  const control=event.target.closest('button'),id=control?.closest('[data-directory-id]')?.dataset.directoryId
  if(!id)return
  if(control.dataset.focus==='true'){focusObject(id);nearby.open=false;canvas.focus({preventScroll:true})}else activate(id)
 },{signal})
 function update(objects,relations=[]){
  engine.update(activity)
  const nextProjection=spatialPattern(objects,relations,view),next=layoutWorld(nextProjection.objects,nextProjection.relations,nextProjection.state.pattern,spacing)
  const nextInputKey=JSON.stringify([objects,relations,nextProjection.state,spacing,activity])
  if(inputKey===nextInputKey&&!needsFit)return
  // Keep remembered positions for unchanged membership, even if producer ordering changes.
  if(placedSpacing===spacing&&(model.pattern??'ground')===(next.pattern??'ground')&&model.items.length===next.items.length&&model.items.every(item=>next.items.some(n=>n.id===item.id&&n.anchor===item.anchor&&n.plot===item.plot&&n.member===item.member))){
   const previous=new Map(model.items.map(item=>[item.id,item]))
   for(const item of next.items){const before=previous.get(item.id);item.x=before.x;item.y=before.y;item.z=before.z}
  }
  placedSpacing=spacing
  const key=JSON.stringify([next.pattern,next.items.map(i=>[i.id,i.kind,i.form,i.needsReview,i.x,i.y,i.z,i.selected,i.disabled,i.memberIds?.length]),next.relations.map(r=>[r.from,r.to,r.active])])
  const changedGeometry=key!==geometryKey,nextActors=changedGeometry?[]:actorRanges,nextGeometry=changedGeometry?worldGeometry(next,nextActors):geometry
  const before=new Map(sourceObjects.map(item=>[item.id,item]));let changed=false
  if(before.size){
   for(const item of objects){const previous=before.get(item.id)
    const kind=!previous?'Added to this view':previous.disabled!==item.disabled?'Availability changed':previous.title!==item.title||previous.summary!==item.summary||previous.changeKey!==item.changeKey?'Content changed':null
    if(kind){recent.delete(item.id);recent.set(item.id,{title:item.title,kind});changed=true}
   }
   const ids=new Set(objects.map(item=>item.id));for(const item of before.values())if(!ids.has(item.id)){recent.delete(item.id);recent.set(item.id,{title:item.title,kind:'No longer in this view'});changed=true}
   while(recent.size>5)recent.delete(recent.keys().next().value)
  }
  sourceObjects=objects.map(item=>({...item}));sourceRelations=relations;projection=nextProjection;view=projection.state;inputKey=nextInputKey
  if(conversationId&&(changed||!objects.some(i=>i.id===conversationId)))closeConversation()
  model=next;geometry=nextGeometry;actorRanges=nextActors;geometryKey=key
  if(!fittedPopulation&&model.items.length){fittedPopulation=true;if(navigation==='overview')needsFit=true}
  const ids=new Set(model.items.map(item=>item.id))
  for(const [id,node]of labelNodes)if(!ids.has(id)){node.remove();labelNodes.delete(id);directoryNodes.get(id)?.remove();directoryNodes.delete(id)}
  patternSelect.value=view.pattern;groupSelect.value=view.groupBy;groupSelect.parentElement.hidden=view.pattern==='ground'||view.pattern==='garden'
  patternSelect.parentElement.hidden=pattern==='garden'
  breadcrumb.hidden=view.pattern==='ground'||view.pattern==='garden';back.hidden=!view.group;location.textContent=projection.label+' · '+projection.total+' objects'
  pagination.hidden=projection.pages===1;previous.disabled=view.page===0;nextPage.disabled=view.page===projection.pages-1;pageCount.textContent=(view.page+1)+' / '+projection.pages
  wrap.dataset.pattern=view.pattern;wrap.dataset.groupBy=view.groupBy;wrap.dataset.group=view.group??'';wrap.dataset.sourceObjects=String(objects.length)
  for(const [index,item]of model.items.entries()){
   let b=labelNodes.get(item.id),row=directoryNodes.get(item.id)
   if(!b){
    b=make('button','world-name');b.type='button';b.dataset.worldId=item.id;b.append(make('strong',''),make('span',''));labelNodes.set(item.id,b)
    row=make('div','');row.dataset.directoryId=item.id
    const focus=make('button',''),open=make('button','');focus.type=open.type='button';focus.dataset.focus='true';row.append(focus,open);directoryNodes.set(item.id,row)
   }
   const review=item.kind==='character'?roleStatus(activity,item.id):null,state=review?.state??null
   const detail=item.disabled?'Unavailable':review?review.label:objectForms[item.form]+' · '+(item.summary||'Inspect information')
   setText(b.children[0],item.title);setText(b.children[1],detail);b.dataset.worldKind=item.kind;b.disabled=Boolean(item.disabled);b.setAttribute('aria-label',item.title+'. '+detail)
   b.dataset.position=JSON.stringify([item.x,item.y,item.z])
   b.dataset.objectForm=item.form;b.dataset.activity=state??'';b.dataset.supportRef=item.supportRef??'';b.dataset.selected=String(item.id===selectedId);b.dataset.marked=String(item.id===markedId)
   if(labels.children[index]!==b)labels.insertBefore(b,labels.children[index]??null)
   const [focus,open]=row.children;setText(focus,item.title);focus.setAttribute('aria-label','Find '+item.title);open.disabled=Boolean(item.disabled)
   const action=item.kind==='group'?'Browse shelf':view.pattern==='garden'&&item.kind==='character'?'Talk to':'Inspect'
   setText(open,action);open.setAttribute('aria-label',action+' '+item.title)
   if(item.kind==='group')row.dataset.members=JSON.stringify(item.memberIds);else delete row.dataset.members
   if(list.children[index]!==row)list.insertBefore(row,list.children[index]??null)
  }
  summary.textContent=(view.pattern==='garden'?'People':'In this space')+' · '+model.items.length
  renderMap()
  filterDirectory()
  renderUpdates()
  if(needsFit){overview();needsFit=false}
  try{gpu?.pattern(view.pattern);if(changedGeometry&&gpu){gpu.upload(geometry,actorRanges);uploads++}gpu?.motionStates(new Map(model.items.filter(i=>i.kind==='character').map(i=>[i.id,roleStatus(activity,i.id)?.state??'Idle'])));invalidate()}catch(error){fail(error)}
 }
 function onKey(event){
  if(event.target!==canvas||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return
  if(event.type==='keydown'&&event.code==='KeyM'){event.preventDefault();map.open=!map.open;return}
  if(event.type==='keydown'&&event.code==='KeyQ'){event.preventDefault();const target=hovered??selectedId;if(target){selectedId=target;mapButton.click()}return}
  if(navigation==='overview'){if(event.type==='keydown'&&event.code==='KeyE')activate(hovered);return}
  const key=keyDirection(event.code)
  if(key){event.preventDefault();if(event.type==='keydown'&&!inputBlocked())keys.add(key);else keys.delete(key);invalidate()}
  else if(event.type==='keydown'&&!event.repeat){if(event.code==='KeyE'){event.preventDefault();activate(hovered)}if(event.code==='Escape'){stopInput();canvas.blur()}}
 }
 canvas.addEventListener('keydown',onKey,{signal});window.addEventListener('keyup',event=>{const key=keyDirection(event.code);if(key){keys.delete(key);invalidate()}},{signal})
 bubble.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();closeConversation()}},{signal})
 canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary){drag=null;return}if(event.button!==0||inputBlocked())return;canvas.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};canvas.setPointerCapture(event.pointerId)},{signal})
 canvas.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;if(navigation==='explore')pose=lookPose(pose,event.clientX-drag.x,event.clientY-drag.y);drag.x=event.clientX;drag.y=event.clientY;invalidate()},{signal})
 canvas.addEventListener('pointerup',event=>{if(drag?.id!==event.pointerId)return;const clicked=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<5;drag=null;if(clicked){const r=canvas.getBoundingClientRect();activate(pickWorld(model.items,pose,event.clientX-r.left,event.clientY-r.top,r.width,r.height,zoom))}},{signal,capture:true})
 for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>drag=null,{signal})
 canvas.addEventListener('wheel',event=>{if(navigation==='overview'||event.ctrlKey||event.metaKey||inputBlocked()||!Number.isFinite(event.deltaY))return;event.preventDefault();const amount=clamp(-event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?host.clientHeight:1)/100,-2,2);pose={...pose,x:clamp(pose.x+Math.sin(pose.yaw)*amount,-28,28),z:clamp(pose.z-Math.cos(pose.yaw)*amount,-350,28)};invalidate()},{signal,passive:false})
 const walk=make('div','world-walk');walk.hidden=true;walk.setAttribute('role','group');walk.setAttribute('aria-label','Walk controls');hud.append(walk)
 for(const [direction,icon]of [['forward','↑'],['left','←'],['back','↓'],['right','→'],['rise','⇧'],['descend','⇩']]){
  const b=button(icon,'Walk '+direction,()=>{},walk)
  b.addEventListener('pointerdown',event=>{if(event.button||inputBlocked())return;event.preventDefault();b.setPointerCapture(event.pointerId);keys.add(direction);invalidate()},{signal})
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{keys.delete(direction);invalidate()},{signal})
  b.addEventListener('click',event=>{if(event.detail===0&&!inputBlocked()){pose=movePose(pose,direction==='forward'?1:direction==='back'?-1:0,direction==='right'?1:direction==='left'?-1:0,.05,direction==='rise'?1:direction==='descend'?-1:0);invalidate()}},{signal})
 }
 nearby.addEventListener('toggle',()=>{if(nearby.open)stopInput()},{signal})
 window.addEventListener('blur',()=>{wrap.dataset.motionPaused='true';stopInput();stopFrame()},{signal});window.addEventListener('focus',()=>{wrap.dataset.motionPaused='false';invalidate()},{signal})
 document.addEventListener('visibilitychange',()=>{wrap.dataset.motionPaused=String(document.hidden);stopInput();if(document.hidden)stopFrame();else invalidate()},{signal})
 window.addEventListener('pagehide',()=>{paused=true;stopInput();stopFrame()},{signal})
 window.addEventListener('pageshow',()=>{paused=false;invalidate()},{signal})
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;gpu?.close();gpu=null;fail(Error('WorldGraphicsContextLost'))},{signal})
 canvas.addEventListener('webglcontextrestored',initialize,{signal})
 const resize=new window.ResizeObserver(fitViewport);resize.observe(host)
 update(objects,relations);initialize()
 function snapshot(){return {...pose,target,presentation:{...view},navigation,populated:fittedPopulation}}
 function park(){paused=true;stopInput();stopFrame();orbit.enabled=false;resize.disconnect();wrap.remove()}
 function mount(nextHost,options){
  if(closed)throw Error('WorldDisposed')
  const changedTarget=target!==(options.target??null)
  const changedContext=context!==(options.context??null);context=options.context??null
  if(changedTarget){poses.set(target,snapshot());while(poses.size>8)poses.delete(poses.keys().next().value)}
  host=nextHost;host.prepend(wrap);resize.disconnect();resize.observe(host)
  onActivate=options.onActivate;conversation=options.conversation;activity=options.activity??null;target=options.target??null;wrap.dataset.target=target??'';paused=false
  engine.panel.hidden=options.pattern==='garden'
  if(conversationId)closeConversation()
  if(changedTarget){const saved=poses.get(target);view=saved?.presentation??{pattern:options.pattern??'ground',groupBy:'declared',group:null,page:0};navigation=saved?.navigation??'overview';pose=saved??initialPose();fittedPopulation=Boolean(saved?.populated);needsFit=!saved;sourceObjects=[];recent.clear();query.value='';updates.open=false;nearby.open=false;map.open=false;selectedId=null;markedId=null;wrap.dataset.selectedId='';wrap.dataset.markedId='';inputKey=null;model={items:[],relations:[]}}
  else if(changedContext){view={...view,group:null,page:0};sourceObjects=[];recent.clear();query.value='';updates.open=false;inputKey=null}
  navigationSelect.value=navigation;walk.hidden=navigation!=='explore';update(options.objects,options.relations);syncOrbit();invalidate()
 }
 function close(){if(closed)return;closed=true;stopInput();stopFrame();resize.disconnect();controller.abort();orbit.dispose();gpu?.close();gpu=null;canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();geometry=null;labelNodes.clear();directoryNodes.clear();recent.clear();poses.clear();wrap.remove()}
 return {update,close,mount,park,snapshot,activity(value){activity=value??null;update(sourceObjects,sourceRelations)},apply(value){const next=clamp(value.z,.65,1.5);if(next!==zoom){zoom=next;syncOrbit();invalidate()}},change(action){
  fitViewport()
  if(action==='reset'){overview();return}
  if(navigation==='overview'){syncOrbit();if(action==='in')orbit.dollyIn(1/1.2);else if(action==='out')orbit.dollyOut(1/1.2);else orbit.pan(action==='left'?40:action==='right'?-40:0,action==='up'?40:action==='down'?-40:0);orbit.update();return}
  else if(['in','out','up','down','left','right'].includes(action)){const forward=['in','up'].includes(action)?1:['out','down'].includes(action)?-1:0,side=action==='left'?-1:action==='right'?1:0;for(let i=0;i<5;i++)pose=movePose(pose,forward,side,.05)}
  invalidate()
 },pause(value){paused=value;if(value){stopInput();stopFrame()}else invalidate()}}
}
