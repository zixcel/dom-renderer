// Hatter 2026: presentation containment must never claim inferred equivalence.
import test from 'node:test'
import assert from 'node:assert/strict'
import {graphDocuments} from '../src/structure-graph.mjs'
test('exact paths, component/query filters, bounded depth and explicit truncation',()=>{
 const documents=[{id:'definitions',label:'definitions',value:{'a/b':{'~id':'exact'},empty:[]}},{id:'memory',label:'memory',value:[{id:'same'}]}]
 const graph=graphDocuments(documents,{depth:6});assert(graph.nodes.some(n=>n.path==='/a~1b/~0id'&&n.value==='exact'));assert.equal(graph.edges.length,graph.nodes.length-2)
 const filtered=graphDocuments(documents,{component:'memory'});assert(filtered.nodes.every(n=>n.document.id==='memory'))
 assert.equal(graphDocuments(documents,{query:'exact',depth:6}).nodes.length,1)
 assert.equal(graphDocuments(documents,{maximum:2}).truncated,true);assert.equal(graphDocuments(documents,{depth:1}).truncated,true)
 assert(graph.edges.every(e=>!('meaning' in e)));assert.deepEqual(documents[0].value['a/b'],{'~id':'exact'})
})
