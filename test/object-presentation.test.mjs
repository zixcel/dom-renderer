import test from 'node:test'
import assert from 'node:assert/strict'
import {objectPresentation,spacingPresets} from '../src/object-presentation.mjs'
import {layoutWorld} from '../src/world-model.mjs'
import {worldGeometry} from '../src/world-gpu.mjs'
test('typed forms, explicit distance presets and exact relations do not infer meaning or activity from names',()=>{
 for(const [scalars,type]of [[[1,2],'number'],[[false,true],'boolean'],[['a','b'],'text'],[['a',2],'record'],[[],'record']]){assert.equal(objectPresentation({scalars}).form,'book');assert.equal(objectPresentation({scalars}).dataType,type)}
 assert.equal(objectPresentation({title:'Person running local inference',id:'person:running'}).form,'book')
 assert.equal(objectPresentation({unresolved:true,scalars:[1]}).needsReview,true)
 const objects=[{id:'a',kind:'character'},{id:'b',kind:'character'},{id:'text',kind:'record',anchor:'a',scalars:['text']},{id:'n',kind:'record',anchor:'b',scalars:[42]}],relations=[{id:'exact',from:'text',to:'n'}]
 let before=0
 for(const spacing of Object.keys(spacingPresets)){
  const model=layoutWorld(objects,relations,'garden',spacing),distance=model.items[1].x-model.items[0].x
  assert(distance>before);before=distance;assert.deepEqual(model.relations,relations)
  assert.deepEqual(model.items.map(i=>i.form),['person','person','book','book']);assert(worldGeometry(model).length>0)
 }
 assert.equal(worldGeometry(layoutWorld([],[],'garden')).length,18,'empty garden has only two terrain instances, no trees or synthetic entities')
 assert.throws(()=>layoutWorld(objects,relations,'garden','guess'),/SpacingInvalid/)
})
