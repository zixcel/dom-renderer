import test from 'node:test'
import assert from 'node:assert/strict'
import {mapProjection,visibleProjection} from '../src/open-world-projection.mjs'

test('World and Map preserve one exact owner reference and never create capabilities',()=>{
 const sources=[
  {id:'role:person',kind:'character',title:'Person',form:'person',x:0,z:0},
  {id:'entity:organization',kind:'record',title:'Organization',form:'organization',x:9,z:0},
  {id:'entity:system',kind:'record',title:'System',form:'system',x:40,z:0}
 ]
 const map=mapProjection(sources,{selected:'entity:system',marked:'entity:organization'})
 assert.deepEqual(map.items.map(item=>item.id),sources.map(item=>item.id))
 assert.equal(map.items.find(item=>item.id==='entity:system').selected,true)
 assert.equal(map.items.find(item=>item.id==='entity:organization').marked,true)
 assert(map.items.every(item=>!('action' in item)&&!('capability' in item)))
 const near=visibleProjection(sources,{x:0,z:0,radius:12,limit:2,marked:'entity:system'})
 assert.deepEqual(near.items.map(item=>item.id),['role:person','entity:organization'])
 assert.deepEqual(near.markers.map(item=>item.id),['entity:system'])
 assert.equal(near.total,3)
})

test('10,000 source identities have a bounded 200-object projection without source mutation',()=>{
 const sources=Array.from({length:10000},(_,i)=>({id:`entity:${i}`,kind:'record',title:`Entity ${i}`,x:i%100,z:Math.floor(i/100)}))
 const start=performance.now(),result=visibleProjection(sources,{x:50,z:50,radius:9,limit:200,marked:'entity:9999'}),elapsed=performance.now()-start
 assert.equal(result.total,10000)
 assert.equal(result.items.length,200)
 assert.equal(result.markers.length,1)
 assert(result.items.every(item=>item.id===sources[Number(item.id.slice(7))].id))
 assert.equal(sources.length,10000)
 assert(elapsed<1000,`projection took ${elapsed} ms`)
 assert.throws(()=>visibleProjection([{id:'same',x:0,z:0},{id:'same',x:1,z:1}]),/WorldProjectionSourceInvalid/)
 assert.throws(()=>mapProjection([{id:'same',x:0,z:0},{id:'same',x:1,z:1}]),/WorldProjectionSourceInvalid/)
})
