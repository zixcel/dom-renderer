import test from 'node:test'
import assert from 'node:assert/strict'
import {layoutWorld,initialPose,movePose,lookPose,cameraMatrix,screenPoint,renderSize,worldLimits,pickWorld,fitPose} from '../src/world-model.mjs'
import {worldGeometry} from '../src/world-gpu.mjs'
test('overview fits all declared objects on wide and narrow viewports without changing identities',()=>{
 for(const aspect of [1280/800,390/844])for(const pattern of ['ground','constellation']){
  const model=layoutWorld(Array.from({length:24},(_,i)=>({id:String(i),kind:'record'})),[],pattern),pose=fitPose(model.items,aspect)
  for(const item of model.items){const point=screenPoint(cameraMatrix(pose,aspect),item.x,item.y+1,item.z,1000*aspect,1000);assert(point?.visible,JSON.stringify({item,pose,point}))}
 }
})
test('world preserves exact source identities and only declared links; budgets and duplicates fail closed',()=>{
 const input=[{id:'role:a',title:'<script>',kind:'character'},{id:'claim:a',title:'A',kind:'record'}],before=structuredClone(input)
 const view=layoutWorld(input,[{id:'edge',from:'role:a',to:'claim:a'},{id:'missing',from:'absent',to:'claim:a'}])
 assert.deepEqual(input,before);assert.deepEqual(view.items.map(x=>x.id),input.map(x=>x.id));assert.equal(view.relations.length,1)
 assert.deepEqual(layoutWorld(input).relations,[]);assert.throws(()=>layoutWorld([input[0],input[0]]),/Identity/)
 assert.throws(()=>layoutWorld(Array(513).fill(input[0])),/Capacity/);assert.deepEqual(layoutWorld([]),{items:[],relations:[]})
 const many=layoutWorld(Array.from({length:512},(_,i)=>({id:''+i,kind:'character'})),Array.from({length:512},(_,i)=>({from:''+i,to:''+((i+1)%512)})))
 assert(worldGeometry(many).length/9<=worldLimits.instances)
})
test('camera and movement bounds, diagonal speed, look bounds and physical buffer budget',()=>{
 const pose=initialPose(),straight=movePose(pose,1,0,.05),diagonal=movePose(pose,1,1,.05)
 assert.equal(pose.z,9);assert(straight.z<pose.z);assert(Math.abs(Math.hypot(diagonal.x,diagonal.z-9)-(9-straight.z))<1e-9)
 assert.deepEqual(movePose(pose,1,0,100),straight);assert.equal(lookPose(pose,0,10000).pitch,-.635)
 const center=screenPoint(cameraMatrix({...pose,pitch:0},1),0,1.85,0,800,800)
 assert(Math.abs(center.x-400)<.00001);assert(Math.abs(center.y-400)<.00001);assert.equal(screenPoint(cameraMatrix(pose,1),0,2,20,800,800),null)
 for(const [w,h,dpr]of [[3840,2160,3],[390,844,3],[1280,800,1]]){const size=renderSize(w,h,dpr);assert(size.width*size.height<=worldLimits.pixels);assert(size.width<=w*1.5)}
 const items=[{id:'near',kind:'character',x:0,z:0},{id:'far',kind:'character',x:0,z:-4}]
 assert.equal(pickWorld(items,pose,400,400,800,800),'near');assert.equal(pickWorld(items.map(i=>({...i,disabled:true})),pose,400,400,800,800),null)
 assert.equal(pickWorld(items,pose,0,0,800,800),null)
 const raised=movePose(pose,0,0,.05,1)
 assert(raised.y>pose.y);assert.equal(raised.x,pose.x);assert.equal(raised.z,pose.z)
 assert(movePose({...pose,y:18},0,0,.05,1).y<=18)
 assert(movePose({...pose,y:.4},0,0,.05,-1).y>=.4)
 const raisedCenter=screenPoint(cameraMatrix({...raised,pitch:0},1),0,raised.y,0,800,800)
 assert(Math.abs(raisedCenter.y-400)<.00001)
 assert.equal(pickWorld(items,{...pose,y:12,pitch:0},400,400,800,800),null)
 const spatial=movePose(pose,1,1,.05,1)
 assert(Math.abs(Math.hypot(spatial.x-pose.x,spatial.y-pose.y,spatial.z-pose.z)-(pose.z-straight.z))<1e-9)
})
