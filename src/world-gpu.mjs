// One instanced cube mesh, one program, no textures, physics, asset fetches or semantic state.
import {WebGLRenderer,Scene,PerspectiveCamera,BoxGeometry,MeshLambertMaterial,InstancedMesh,Matrix4,Color,DirectionalLight,AmbientLight,Fog} from 'three'
import {worldLimits,viewCamera} from './world-model.mjs'
import {objectTemplates} from './object-presentation.mjs'
import {npcMotion} from './npc-motion.mjs'
export function createGpu(canvas){
 let renderer=null,geometry=null,material=null,mesh=null,closed=false,bufferWidth=0,bufferHeight=0,previous=null,pendingStart=Infinity,pendingEnd=0,baseCount=0,actors=[],actorStates=new Map(),lastVisible=new Set()
 const scene=new Scene(),camera=new PerspectiveCamera(70,1,.08,120),matrix=new Matrix4(),color=new Color()
 function close(){if(closed)return;closed=true;previous=null;actors=[];actorStates.clear();lastVisible.clear();mesh?.dispose();geometry?.dispose();material?.dispose();scene.clear();renderer?.dispose()}
 try{
  renderer=new WebGLRenderer({canvas,alpha:false,antialias:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'})
  scene.background=new Color('#b8d4de');scene.fog=new Fog('#b8d4de',16,64)
  scene.add(new AmbientLight(0xffffff,1.7));const light=new DirectionalLight(0xffffff,2);light.position.set(-4,10,6);scene.add(light)
  geometry=new BoxGeometry(1,1,1);material=new MeshLambertMaterial()
  mesh=new InstancedMesh(geometry,material,worldLimits.instances);mesh.count=0;mesh.frustumCulled=false;scene.add(mesh)
  return {
   pattern(value){const space=value==='constellation',background=space?'#101b35':'#b8d4de';scene.background.set(background);scene.fog=new Fog(background,space?40:16,space?100:64)},
   upload(data,ranges=[]){
    if(closed)throw Error('WorldDisposed')
    if(data.length%9||data.length/9>=worldLimits.instances)throw Error('WorldGeometryLimitExceeded')
    baseCount=data.length/9;mesh.count=baseCount
    for(let i=0;i<baseCount;i++){
     const j=i*9;if(previous&&data.subarray(j,j+9).every((value,index)=>value===previous[j+index]))continue
     matrix.makeScale(data[j+3],data[j+4],data[j+5]);matrix.setPosition(data[j],data[j+1],data[j+2]);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,color.setRGB(data[j+6],data[j+7],data[j+8]))
     pendingStart=Math.min(pendingStart,i);pendingEnd=Math.max(pendingEnd,i+1)
    }
    previous=data;actors=ranges
   },
   motionStates(states){actorStates=states},
   draw(pose,aspect,zoom,size,milliseconds=0,visibleActors=new Set()){if(closed)return;if(size.width!==bufferWidth||size.height!==bufferHeight){renderer.setSize(size.width,size.height,false);bufferWidth=size.width;bufferHeight=size.height}const distance=pose.focus?Math.hypot(pose.x-pose.focus.x,pose.y-pose.focus.y,pose.z-pose.focus.z):0;scene.fog.near=Math.max(16,distance*.75);scene.fog.far=Math.max(64,distance*2+20)
    mesh.count=baseCount+(pose.cameraMode==='third-person'?1:0)
    let matrixStart=pendingStart,matrixEnd=pendingEnd,colorStart=pendingStart,colorEnd=pendingEnd
    for(const actor of actors){if(!visibleActors.has(actor.id)&&!lastVisible.has(actor.id))continue;const motion=visibleActors.has(actor.id)?npcMotion(actor.id,milliseconds,actorStates.get(actor.id)):{x:0,y:0,swing:0}
     for(let i=actor.start;i<actor.end;i++){const j=i*9,part=i-actor.start,limb=part===1||part===4?1:part===2||part===5?-1:0;matrix.makeScale(previous[j+3],previous[j+4],previous[j+5]);matrix.setPosition(previous[j]+motion.x,previous[j+1]+motion.y+limb*motion.swing,previous[j+2]);mesh.setMatrixAt(i,matrix)}
     matrixStart=Math.min(matrixStart,actor.start);matrixEnd=Math.max(matrixEnd,actor.end)
    }
    lastVisible=new Set(visibleActors)
    if(pose.cameraMode==='third-person'){
     matrix.makeScale(.48,.9,.42);matrix.setPosition(pose.x,pose.y-1.4,pose.z);mesh.setMatrixAt(baseCount,matrix);mesh.setColorAt(baseCount,color.setRGB(.96,.76,.28))
     matrixStart=Math.min(matrixStart,baseCount);matrixEnd=Math.max(matrixEnd,baseCount+1);colorStart=Math.min(colorStart,baseCount);colorEnd=Math.max(colorEnd,baseCount+1)
    }
    for(const [attribute,start,end,size]of [[mesh.instanceMatrix,matrixStart,matrixEnd,16],[mesh.instanceColor,colorStart,colorEnd,3]])if(attribute){attribute.clearUpdateRanges();if(start!==Infinity){attribute.addUpdateRange(start*size,(end-start)*size);attribute.needsUpdate=true}}
    viewCamera(pose,aspect,zoom,camera);renderer.render(scene,camera);pendingStart=Infinity;pendingEnd=0},
   get count(){return mesh.count},get stats(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}},close
  }
 }catch(error){close();throw error}
}
const palette=[[.39,.68,.64],[.62,.49,.79],[.89,.61,.38],[.37,.59,.79],[.76,.43,.53]]
export function worldGeometry(model,actors=[]){
 let offsetY=0
 const values=[],cube=(x,y,z,sx,sy,sz,color)=>values.push(x,y+offsetY,z,sx,sy,sz,...color)
 // A bounded, decorative thinking garden. Terrain does not assert knowledge or relationships.
 if(model.pattern==='constellation'){
  // Fixed procedural background, no texture loading or permanent animation loop.
  for(let i=0;i<96;i++)cube(Math.sin(i*2.399)*35,2+(i%13)*2.5,-15-(i%17)*3,.07,.07,.07,[.64,.74,.92])
 }else{
 cube(0,-.65,-150,60,1.2,370,[.55,.65,.55])
 cube(0,-.015,-150,2.3,.06,368,[.83,.82,.68])
 }
 const byId=new Map(model.items.map(item=>[item.id,item]))
 for(const edge of model.relations){
  const from=byId.get(edge.from),to=byId.get(edge.to),color=edge.active?[.92,.61,.21]:[.24,.55,.62],fy=(from.y??0)+.2,ty=(to.y??0)+.2
  // Orthogonal connectors use the same instanced mesh; only declared edges.
  cube((from.x+to.x)/2,fy,from.z,Math.abs(to.x-from.x)+.06,.06,.06,color)
  cube(to.x,(fy+ty)/2,from.z,.06,Math.abs(ty-fy)+.06,.06,color)
  cube(to.x,ty,(from.z+to.z)/2,.06,.06,Math.abs(to.z-from.z)+.06,color)
 }
 for(const item of model.items){
  const start=values.length/9
  const hash=[...item.id].reduce((v,c)=>(Math.imul(v,31)+c.charCodeAt(0))|0,0),color=item.disabled?[.52,.54,.56]:palette[(hash>>>0)%palette.length],{x,z}=item
  offsetY=item.y??0
  if(item.form!=='book')cube(x,.07,z,2,.18,1.8,item.selected?[.98,.77,.34]:[.75,.80,.70])
  const tints={accent:item.needsReview?[.9,.61,.16]:color,dark:[.25,.31,.4],face:[.89,.77,.63],light:[.94,.96,.96],warning:[.9,.61,.16]}
  for(const [dx,y,dz,sx,sy,sz,tint]of objectTemplates[item.form])cube(x+dx,y,z+dz,sx,sy,sz,tints[tint])
  if(item.kind==='character')actors.push({id:item.id,start,end:values.length/9})
 }
 if(values.length/9>=worldLimits.instances)throw Error('WorldGeometryLimitExceeded')
 return new Float32Array(values)
}
