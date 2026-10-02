import test from 'node:test'
import assert from 'node:assert/strict'
import {spatialPattern} from '../src/spatial-patterns.mjs'
import {layoutWorld,pickWorld,initialPose,worldLimits} from '../src/world-model.mjs'
import {worldGeometry} from '../src/world-gpu.mjs'

test('garden keeps exact person-linked information out of 3D while preserving its source membership',()=>{
 const actors=[{id:'a',kind:'character',title:'A'},{id:'b',kind:'character',title:'B'}]
 const records=Array.from({length:60},(_,i)=>({id:'record:'+i,kind:'record',anchor:'b',group:{kind:'structural',ref:i<30?'one':'two'}}))
 const collapsed=spatialPattern([...actors,...records],[],{pattern:'garden'})
 const expanded=spatialPattern([...actors,...records],[],{pattern:'garden',group:collapsed.groups[0].id})
 assert.deepEqual(collapsed.objects.map(o=>o.id),['a','b'])
 assert.deepEqual(expanded.objects.map(o=>o.id),['a','b'])
 assert.equal(expanded.state.group,null,'the garden cannot open a shelf as a world entity')
 assert.deepEqual(collapsed.groups.flatMap(g=>g.memberIds),records.map(r=>r.id))
 const before=layoutWorld(collapsed.objects,[],'garden'),after=layoutWorld(expanded.objects,[],'garden')
 assert.deepEqual(before,after)
 assert.equal(spatialPattern(actors,[],{pattern:'garden'}).groups.length,0)
 assert.equal(expanded.relations.length,0,'spatial placement never invents semantic relationships')
 assert(worldGeometry(after).length/9<=worldLimits.instances)
})

test('one exact target supports ground and grouped space without creating semantic identities or links',()=>{
 const objects=[{id:'person:1',kind:'character',title:'Person'},...['a','b','c'].map((id,i)=>({id,kind:'record',title:'Same label',group:{kind:'structural',ref:i<2?'g:1':'g:2'},semanticRef:i<2?'meaning:1':'meaning:2',sourceRefs:[{owner:i===1?'two':'one'}]}))]
 const before=structuredClone(objects),relations=[{id:'edge',from:'a',to:'b'}]
 const ground=spatialPattern(objects,relations,{pattern:'ground'})
 assert.deepEqual(ground.objects,objects);assert.deepEqual(ground.relations,relations)
 const overview=spatialPattern(objects,relations,{pattern:'constellation'})
 assert.equal(overview.groups.length,2);assert.deepEqual(overview.groups.flatMap(g=>g.memberIds),['a','b','c'])
 assert.equal(overview.objects[0].id,'person:1');assert.equal(overview.objects.filter(x=>x.kind==='group').length,2);assert.deepEqual(overview.relations,[])
 const expanded=spatialPattern(objects,relations,{pattern:'constellation',group:overview.groups[0].id})
 assert.deepEqual(expanded.objects.map(x=>x.id),['person:1','a','b']);assert.deepEqual(expanded.relations,relations)
 assert.equal(spatialPattern(objects,relations,{pattern:'constellation',groupBy:'source'}).groups.length,2)
 assert.equal(spatialPattern(objects,relations,{pattern:'constellation',groupBy:'meaning'}).groups.length,2)
 assert.deepEqual(objects,before)
 const model=layoutWorld(expanded.objects,expanded.relations,'constellation')
 assert(model.items.some(i=>i.y>0));assert(worldGeometry(model).length/9<=worldLimits.instances)
 assert.equal(pickWorld([{id:'raised',kind:'record',x:0,y:7,z:0}],{...initialPose(),y:7.3,pitch:0},400,400,800,800),'raised')
 // Missing metadata remains unclassified, regardless of names suggesting a meaning.
 const unknown=spatialPattern([{id:'x',title:'GitHub person'},{id:'y',title:'Account'}],[],{pattern:'constellation'})
 assert.equal(unknown.groups.length,1);assert.equal(unknown.groups[0].title,'Unclassified')
 assert.throws(()=>spatialPattern(objects,[],{pattern:'guess'}),/PatternInvalid/)
 assert.throws(()=>spatialPattern(objects,[],{groupBy:'title'}),/GroupingInvalid/)
})

test('bounded pages cover every source exactly; disappeared groups reset without retaining stale members',()=>{
 const objects=Array.from({length:512},(_,i)=>({id:'r:'+i,kind:'record',group:{kind:'structural',ref:'g:'+i}}))
 const seen=[]
 for(let page=0;page<22;page++)seen.push(...spatialPattern(objects,[],{pattern:'constellation',page}).objects.flatMap(i=>i.memberIds??[]))
 assert.deepEqual(seen,objects.map(i=>i.id));assert.equal(new Set(seen).size,512)
 const group=spatialPattern(objects,[],{pattern:'constellation'}).groups[0].id
 const removed=spatialPattern(objects.slice(1),[],{pattern:'constellation',group})
 assert.equal(removed.state.group,null);assert(!removed.objects.some(i=>i.memberIds?.includes('r:0')))
 const oneGroup=objects.map(i=>({...i,group:{kind:'structural',ref:'same'}})),overview=spatialPattern(oneGroup,[],{pattern:'constellation'}),members=[]
 for(let page=0;page<22;page++)members.push(...spatialPattern(oneGroup,[],{pattern:'constellation',group:overview.groups[0].id,page}).objects.map(i=>i.id))
 assert.deepEqual(members,objects.map(i=>i.id))
 assert.throws(()=>spatialPattern([...objects,objects[0]],[],{pattern:'constellation'}),/Capacity/)
 assert.throws(()=>spatialPattern([objects[0],objects[0]],[]),/Identity/)
})
