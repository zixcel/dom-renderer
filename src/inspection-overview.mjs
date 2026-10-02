// Owner-projected facts only. This renderer does not classify semantic modules.
import {element} from './index.mjs'
export function inspectionOverview(document,host,view,onSource,signal){
 host.replaceChildren()
 if(!view){host.append(element(document,'p','Responsibility overview is unavailable.'));return}
 host.append(element(document,'h2',view.title),element(document,'p',view.note,{class:'inspection-note'}))
 const groups=element(document,'ul',null,{class:'scene-items'})
 groups.style.gridTemplateColumns='repeat(auto-fit,minmax(min(250px,100%),1fr))'
 for(const group of view.groups){
  const section=element(document,'li',null,{'aria-label':group.title,'data-responsibility':group.id})
  const info=element(document,'details'),description=element(document,'summary','About these observations')
  info.append(description,element(document,'p',group.note))
  section.append(element(document,'h3',group.title),element(document,'p',group.state,{class:'inspection-state'}))
  for(const measure of group.measures){
   const row=element(document,'div',null,{class:'item-tools','data-measure':measure.unit})
   row.append(element(document,'strong',measure.value===null?'Unavailable':String(measure.value)+(measure.partial?' +':'')),element(document,'span',measure.unit))
   if(measure.documentId){const button=element(document,'button','Inspect',{type:'button','aria-label':'Inspect '+measure.unit});button.addEventListener('click',()=>onSource(measure.documentId),{signal});row.append(button)}
   section.append(row)
  }
  if(group.values?.length)section.append(element(document,'p',group.values.join(' · ')))
  section.append(info);groups.append(section)
 }
 host.append(groups,element(document,'h3','Adopted definition modules'))
 if(!view.modulesAvailable){host.append(element(document,'p','Module data unavailable.'));return}
 if(!view.modules.length){host.append(element(document,'p','No definition modules in the observed role.'));return}
 const list=element(document,'ul',null,{class:'inspection-modules'})
 for(const module of view.modules){
  const item=element(document,'li'),button=element(document,'button',module.id,{type:'button'})
  button.addEventListener('click',()=>onSource('definitions'),{signal})
  item.append(button,element(document,'p',`${module.version} · ${module.terms} terms · ${module.expressions} expressions`),element(document,'p',module.dependencies.length?'Imports: '+module.dependencies.join(', '):'No declared imports'))
  list.append(item)
 }
 host.append(list)
 if(view.modulesPartial)host.append(element(document,'p','Module inventory is incomplete.'))
}
