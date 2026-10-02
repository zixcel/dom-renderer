// Read-only, bounded views over exact owner IDs. Coordinates are presentation,
// never evidence of a semantic relation or an action authority.
export function visibleProjection(sources,{x=0,z=0,radius=24,limit=200,marked=null}={}){
 if(!Array.isArray(sources)||sources.length>10000||!Number.isFinite(x)||!Number.isFinite(z)
  ||!Number.isFinite(radius)||radius<=0||!Number.isSafeInteger(limit)||limit<1||limit>200)throw Error('WorldProjectionLimitExceeded')
 const candidates=[],seen=new Set();let mark=null
 for(const source of sources){
  if(typeof source.id!=='string'||!source.id||seen.has(source.id)||!Number.isFinite(source.x)||!Number.isFinite(source.z))throw Error('WorldProjectionSourceInvalid')
  seen.add(source.id)
  const dx=source.x-x,dz=source.z-z,distance=dx*dx+dz*dz
  if(distance<=radius*radius)candidates.push({source,distance})
  if(source.id===marked)mark=source
 }
 candidates.sort((a,b)=>a.distance-b.distance||a.source.id.localeCompare(b.source.id))
 const items=candidates.slice(0,limit).map(({source})=>source)
 return {items,markers:mark&&!items.some(item=>item.id===mark.id)?[mark]:[],total:sources.length,omitted:candidates.length-items.length}
}

export function mapProjection(sources,{selected=null,marked=null,limit=128}={}){
 if(!Array.isArray(sources)||sources.length>10000||!Number.isSafeInteger(limit)||limit<1||limit>128)throw Error('WorldProjectionLimitExceeded')
 const seen=new Set()
 for(const item of sources){if(typeof item.id!=='string'||!item.id||seen.has(item.id)||!Number.isFinite(item.x)||!Number.isFinite(item.z))throw Error('WorldProjectionSourceInvalid');seen.add(item.id)}
 const priority=sources.filter(item=>item.id===selected||item.id===marked),base=sources.filter(item=>item.id!==selected&&item.id!==marked)
 const chosen=sources.length<=limit?sources:[...priority,...base].slice(0,limit)
 return {items:chosen.map(item=>({id:item.id,title:item.title,kind:item.kind,x:item.x,z:item.z,selected:item.id===selected,marked:item.id===marked})),total:sources.length,omitted:sources.length-chosen.length}
}
