// Trusted renderer output only. No user forms or independently owned DOM trees.
const key=(node,index)=>node.nodeType===1
 ?[node.tagName,...['data-item-id','data-world-object','data-region','data-control'].flatMap(k=>node.hasAttribute(k)?[k,node.getAttribute(k)]:[])].join(':')+(node.matches('[data-item-id],[data-world-object],[data-region],[data-control]')?'':':'+index)
 :node.nodeType+':'+index
export function reconcileChildren(parent,children){
 const old=new Map([...parent.childNodes].map((node,index)=>[key(node,index),node])),wanted=[]
 for(const [index,fresh]of [...children].entries()){
  const identity=key(fresh,index),existing=old.get(identity)
  if(existing&&existing.nodeType===fresh.nodeType&&existing.nodeName===fresh.nodeName){
   old.delete(identity)
   if(existing.nodeType===1){
    for(const attribute of [...existing.attributes])if(!fresh.hasAttribute(attribute.name))existing.removeAttribute(attribute.name)
    for(const attribute of fresh.attributes)if(existing.getAttribute(attribute.name)!==attribute.value)existing.setAttribute(attribute.name,attribute.value)
    reconcileChildren(existing,fresh.childNodes)
   }else if(existing.nodeValue!==fresh.nodeValue)existing.nodeValue=fresh.nodeValue
   wanted.push(existing)
  }else wanted.push(fresh)
 }
 for(const node of old.values())node.remove()
 for(let index=0;index<wanted.length;index++)if(parent.childNodes[index]!==wanted[index])parent.insertBefore(wanted[index],parent.childNodes[index]??null)
}
