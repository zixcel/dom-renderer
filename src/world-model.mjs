import {PerspectiveCamera,Vector3,Raycaster,Vector2,Box3} from 'three'
import {objectPresentation,spacingPresets,libraryLayout,objectBounds} from './object-presentation.mjs'
// Presentation geometry only. IDs and declared relations are never inferred from position.
export const worldLimits=Object.freeze({objects:512,relations:512,pixels:1440000,dpr:1.5,fps:30,instances:8192,radius:28})
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
export function layoutWorld(objects,relations=[],pattern='ground',spacing='balanced'){
 const distances=spacingPresets[spacing];if(!distances)throw Error('SpatialSpacingInvalid')
 if(!['ground','constellation','garden'].includes(pattern))throw Error('SpatialPatternInvalid')
 if(!Array.isArray(objects)||objects.length>worldLimits.objects||!Array.isArray(relations)||relations.length>worldLimits.relations)throw Error('WorldCapacityExceeded')
 const ids=new Set()
 const items=objects.map((object,index)=>{
  object={...object,...objectPresentation(object)}
  if(typeof object.id!=='string'||!object.id||ids.has(object.id))throw Error('WorldIdentityInvalid')
  ids.add(object.id)
  if(pattern==='garden'){
   const actors=objects.filter(o=>o.kind==='character'),actor=object.kind==='character'?actors.findIndex(o=>o.id===object.id):actors.findIndex(o=>o.id===object.anchor)
   const base={x:actor<0?0:(actor%7-3)*distances.person,z:actor<0?-8:-Math.floor(actor/7)*distances.person*2},plot=object.plot??0
   if(object.kind==='character')return {...object,...base,y:0}
   const x=base.x+distances.group+(plot%4)*distances.group,z=base.z-distances.group-Math.floor(plot/4)*distances.group
   if(object.kind==='group')return {...object,x,y:0,z}
   const slot=object.member??0,l=libraryLayout
   return {...object,x:x+(slot%l.columns-(l.columns-1)/2)*l.slotWidth,y:l.baseY+Math.floor(slot/l.columns)*l.rowHeight,z:z+l.frontZ}
  }
  if(pattern==='constellation'){
   const actors=objects.filter(i=>i.kind==='character'),isActor=object.kind==='character',order=isActor?actors.findIndex(o=>o.id===object.id):objects.slice(0,index).filter(i=>i.kind!=='character').length
   const count=objects.length-actors.length,ring=Math.floor(order/8),angle=(order%8)/Math.min(8,count-ring*8)*Math.PI*2
   return {...object,x:isActor?(order-(actors.length-1)/2)*3.4:Math.sin(angle)*(5+ring*4),y:isActor?0:2+ring*3+(order%3)*1.2,z:isActor?-1:-8+Math.cos(angle)*(3+ring*2)}
  }
  const row=Math.floor(index/7),count=Math.min(7,objects.length-row*7),column=index%7
  return {...object,x:(column-(count-1)/2)*3.4,z:-row*4.5-1-Math.cos(column)*.4,y:0}
 })
 return {items,relations:relations.filter(edge=>ids.has(edge.from)&&ids.has(edge.to)),...(pattern!=='ground'?{pattern}:{})}
}
export function initialPose(){return {x:0,y:1.85,z:9,yaw:0,pitch:-.035}}
export function fitPose(items,aspect=1){
 if(!items.length)return {...initialPose(),y:8,z:14,pitch:-.6,focus:{x:0,y:0,z:0}}
 const box=new Box3()
 for(const item of items){box.expandByPoint(new Vector3(item.x-1,item.y??0,item.z-1));box.expandByPoint(new Vector3(item.x+1,(item.y??0)+3,item.z+1))}
 const center=box.getCenter(new Vector3()),radius=box.getSize(new Vector3()).length()/2
 const angle=Math.min(70*Math.PI/360,Math.atan(Math.tan(70*Math.PI/360)*Math.max(.1,aspect)))
 const distance=Math.max(8,radius/Math.sin(angle)*1.45)
 return {x:center.x,y:center.y+distance*.6,z:center.z+distance*.8,yaw:0,pitch:-Math.asin(.6),focus:{x:center.x,y:center.y,z:center.z}}
}
export function movePose(pose,forward,side,seconds,vertical=0){
 const length=Math.max(1,Math.hypot(forward,side,vertical)),speed=4.5*Math.min(.05,Math.max(0,seconds))/length
 return {...pose,x:clamp(pose.x+(Math.cos(pose.yaw)*side+Math.sin(pose.yaw)*forward)*speed,-worldLimits.radius,worldLimits.radius),y:clamp(pose.y+vertical*speed,.4,18),z:clamp(pose.z+(Math.sin(pose.yaw)*side-Math.cos(pose.yaw)*forward)*speed,-350,worldLimits.radius)}
}
export function lookPose(pose,dx,dy){return {...pose,yaw:(pose.yaw+clamp(dx,-150,150)*.004)%(Math.PI*2),pitch:clamp(pose.pitch-clamp(dy,-150,150)*.004,-.9,.9)}}
export function viewCamera(pose,aspect,zoom=1,camera=new PerspectiveCamera(70,aspect,.08,120)){
 camera.aspect=aspect;camera.far=2000;camera.zoom=clamp(zoom,.65,1.5)
 if(pose.cameraMode==='third-person')camera.position.set(pose.x-Math.sin(pose.yaw)*3,pose.y+1.2,pose.z+Math.cos(pose.yaw)*3)
 else camera.position.set(pose.x,pose.y,pose.z)
 camera.rotation.set(pose.pitch-(pose.cameraMode==='third-person'?.17:0),-pose.yaw,0,'YXZ');camera.updateProjectionMatrix();camera.updateMatrixWorld()
 return camera
}
export function cameraMatrix(pose,aspect,zoom=1){
 const camera=viewCamera(pose,aspect,zoom)
 return camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).elements
}
export function screenPoint(matrix,x,y,z,width,height){
 const v=[x,y,z,1],q=[0,0,0,0]
 for(let r=0;r<4;r++)for(let c=0;c<4;c++)q[r]+=matrix[c*4+r]*v[c]
 if(q[3]<=.08)return null
 const nx=q[0]/q[3],ny=q[1]/q[3]
 return {x:(nx*.5+.5)*width,y:(.5-ny*.5)*height,depth:q[3],visible:Math.abs(nx)<.95&&Math.abs(ny)<.88}
}
export function renderSize(width,height,dpr){
 const scale=Math.min(worldLimits.dpr,Math.max(1,dpr),Math.sqrt(worldLimits.pixels/Math.max(1,width*height)))
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))}
}
export function pickWorld(items,pose,x,y,width,height,zoom=1){
 const ray=new Raycaster(),camera=viewCamera(pose,width/height,zoom),point=new Vector3(),box=new Box3()
 ray.setFromCamera(new Vector2(2*x/width-1,1-2*y/height),camera)
 let best=null,distance=2000
 for(const item of items){
  if(item.disabled)continue
  const y=item.y??0
  const [width,height,depth]=objectBounds[item.form??objectPresentation(item).form]
  box.min.set(item.x-width/2,y,item.z-depth/2);box.max.set(item.x+width/2,y+height,item.z+depth/2)
  if(ray.ray.intersectBox(box,point)){const near=point.distanceTo(camera.position);if(near<distance){best=item.id;distance=near}}
 }
 return best
}
