import test from 'node:test'
import assert from 'node:assert/strict'
import {frameLayout} from '../src/frame-layout.mjs'
test('object bubbles use stable adjacent bounds without changing the world viewport',()=>{
 for(const width of [280,320,390,759,760,844,1280,1920])for(const height of [240,390,844,1080])for(const kind of ['actions','details','structure','settings','status']){
  for(const anchor of [null,{left:width/2-10,right:width/2+10,top:height/2-10,bottom:height/2+10},{left:8,right:28,top:60,bottom:80},{left:width-28,right:width-8,top:height-100,bottom:height-80}]){
   const result=frameLayout(width,height,kind,anchor),{panel,world,mode}=result
   assert.deepEqual(world,{width,height});assert(panel.width>0&&panel.height>0)
   assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height)
   if(anchor&&mode!=='overlay')assert(panel.x>=anchor.right||panel.x+panel.width<=anchor.left||panel.y>=anchor.bottom||panel.y+panel.height<=anchor.top)
   if(!anchor)assert.equal(mode,'overlay')
   assert.deepEqual(frameLayout(width,height,kind,anchor),result)
  }
 }
 for(const width of [390,1280]){
  const anchor={left:width/2-20,right:width/2+20,top:350,bottom:460}
  assert.notEqual(frameLayout(width,844,'actions',anchor).mode,'overlay')
 }
})
