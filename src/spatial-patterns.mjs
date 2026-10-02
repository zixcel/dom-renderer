import {layoutWorld} from './world-model.mjs'

// View-local partitions, never entities, inferred meanings, relationships or commands.
export const spatialPatterns=Object.freeze([['garden','Garden'],['ground','Ground · people and places'],['constellation','Constellation · information']])
export const spatialGroupings=Object.freeze([['declared','Declared structure'],['meaning','Meaning reference'],['source','Source owner']])
const pageSize=24
export function spatialPattern(objects,relations=[],options={}){
 layoutWorld(objects,relations) // Validate even when a collapsed view would hide bad input.
 const pattern=options.pattern??'ground',groupBy=options.groupBy??'declared'
 if(!spatialPatterns.some(([id])=>id===pattern))throw Error('SpatialPatternInvalid')
 if(!spatialGroupings.some(([id])=>id===groupBy))throw Error('SpatialGroupingInvalid')
 const state={pattern,groupBy,group:null,page:0}
 if(pattern==='ground')return {objects,relations,groups:[],state,total:objects.length,pages:1,label:'All objects'}
 const actors=objects.filter(i=>i.kind==='character'),records=objects.filter(i=>i.kind!=='character'),partitions=new Map(),ids=new Set(objects.map(i=>i.id))
 for(const item of records){
  let key=null,title='Unclassified'
  if(groupBy==='declared'&&item.group?.kind&&item.group?.ref){key=[item.group.kind,item.group.ref];title=item.groupLabel??item.group.ref}
  if(groupBy==='meaning'&&typeof item.semanticRef==='string'){key=item.semanticRef;title='Meaning · '+key}
  if(groupBy==='source'){
   const owners=[...new Set((item.sourceRefs??[]).map(s=>s.owner).filter(v=>typeof v==='string'))].sort()
   if(owners.length){key=owners;title=owners.join(' + ')}
  }
  const identity=JSON.stringify([groupBy,key]);let group=partitions.get(identity)
  if(!group){let id='view:group:'+identity;while(ids.has(id))id='view:'+id;ids.add(id);group={id,kind:'group',title,memberIds:[],members:[]};partitions.set(identity,group)}
  group.memberIds.push(item.id);group.members.push(item)
 }
 const groups=[...partitions.values()],selected=groups.find(g=>g.id===options.group)
 state.group=selected?.id??null
 if(pattern==='garden'){
  if(actors.length>32)throw Error('WorldCapacityExceeded')
  // Records remain in the exact focused projection. A shelf is a local index
  // for that person's information, not an entity standing beside the person.
  state.group=null;state.page=0
  const actorIds=new Set(actors.map(i=>i.id))
  return {objects:actors,relations:relations.filter(r=>actorIds.has(r.from)&&actorIds.has(r.to)),groups:groups.map(({members,...g})=>g),state,total:actors.length,pages:1,label:'People'}
 }
 const candidates=selected?selected.members:groups.map(({members,...g})=>({...g,summary:g.memberIds.length+' records · Browse shelf'}))
 // Actors share the same paging budget; no silent truncation or unbounded group expansion.
 const all=[...actors,...candidates],pages=Math.max(1,Math.ceil(all.length/pageSize))
 state.page=state.group!==options.group&&options.group?0:Math.min(pages-1,Math.max(0,Number.isSafeInteger(options.page)?options.page:0))
 const visible=all.slice(state.page*pageSize,(state.page+1)*pageSize),visibleIds=new Set(visible.filter(i=>i.kind!=='group').map(i=>i.id))
 return {objects:visible,relations:relations.filter(r=>visibleIds.has(r.from)&&visibleIds.has(r.to)),groups:groups.map(({members,...g})=>g),state,total:all.length,pages,label:selected?.title??'All groups'}
}
