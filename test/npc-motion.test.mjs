import test from 'node:test'
import assert from 'node:assert/strict'
import {npcMotion} from '../src/npc-motion.mjs'
import {worldGeometry} from '../src/world-gpu.mjs'
import {layoutWorld} from '../src/world-model.mjs'

test('each NPC has bounded, independent presentation motion without changing semantic location',()=>{
 const model=layoutWorld([{id:'role:one',kind:'character'},{id:'role:two',kind:'character'}],[],'garden')
 const original=structuredClone(model),ranges=[],geometry=worldGeometry(model,ranges)
 assert.deepEqual(ranges.map(r=>r.id),['role:one','role:two'])
 for(const range of ranges)assert(range.start>=0&&range.end>range.start&&range.end<=geometry.length/9)
 const one=npcMotion('role:one',1000),two=npcMotion('role:two',1000),active=npcMotion('role:one',1000,'AwaitingResult')
 assert.notDeepEqual(one,two)
 for(const motion of [one,two,active]){assert(Math.abs(motion.x)<=.2);assert(motion.y>=0&&motion.y<=.12);assert(Math.abs(motion.swing)<=.16)}
 assert.deepEqual(model,original,'animation cannot persist a different position')
})
