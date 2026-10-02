// Real WebGL/DOM input tests. Synthetic source data is isolated here; no product claims.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {readFile} from 'node:fs/promises'
import {build} from 'esbuild'
import {chromium,expect} from '@playwright/test'
const root=new URL('../',import.meta.url).pathname
const bundle=await build({stdin:{contents:`import {createWorld} from './src/world-runtime.mjs';import {createWorldSurface} from './src/world-surface.mjs';window.makeSurface=()=>createWorldSurface({describeRole:(activity,id)=>!activity?.available?{state:'Unavailable',label:'Source unavailable'}:(activity.roles??[]).some(x=>x.roleRef.id===id&&x.state==='Running')?{state:'AwaitingResult',label:'Awaiting result'}:{state:'Idle',label:'No active request'}});window.activations=[];window.objects=[{id:'role:guide',title:'Guide',kind:'character'},{id:'role:reviewer',title:'Reviewer',kind:'character'},{id:'claim:1',title:'Language',kind:'record'},{id:'role:offline',title:'Offline',kind:'character',disabled:true}];window.openWorld=()=>window.world=createWorld(document.getElementById('stage'),{objects:window.objects,onActivate:id=>window.activations.push(id),conversation:(item,activate)=>{if(item.kind!=='character')return null;const body=document.createElement('section'),text=document.createElement('p'),button=document.createElement('button');text.textContent='Published state for '+item.id;button.textContent='Review role';button.onclick=activate;body.append(text,button);return body}});window.openWorld();`,resolveDir:root},bundle:true,format:'esm',write:false,logLevel:'silent'})
assert.deepEqual(bundle.warnings,[])
const css=await readFile(root+'src/style.css','utf8')
const server=createServer((request,response)=>{response.setHeader('content-type',request.url==='/app.js'?'text/javascript':request.url==='/style.css'?'text/css':'text/html');response.end(request.url==='/app.js'?bundle.outputFiles[0].text:request.url==='/style.css'?css:'<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>Thinking garden · isolated renderer test</title><main id="stage" class="delivery-shell"></main><script type="module" src="/app.js"></script></html>')})
server.listen(0,'127.0.0.1');await once(server,'listening')
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),rows=[]
try{
 for(const [width,height,reducedMotion]of [[1280,800,'no-preference'],[390,844,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion,hasTouch:width<600}),page=await context.newPage(),errors=[];page.setDefaultTimeout(6000)
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text())})
  await page.goto('http://127.0.0.1:'+server.address().port);await expect(page.locator('.mind-world')).toHaveAttribute('data-gpu','ready')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-objects','4')
  const pose=()=>page.locator('.mind-world').getAttribute('data-pose').then(JSON.parse)
  const frames=()=>page.locator('.mind-world').getAttribute('data-frames').then(Number)
  await expect.poll(frames).toBeGreaterThan(0)
  assert.equal(await page.locator('.world-name').count(),4);assert.equal(await page.locator('[data-world-id="role:offline"]').isEnabled(),false)
  const pixels=Number(await page.locator('.mind-world').getAttribute('data-buffer-pixels'));assert(pixels<=1440000)
  // Inspect actual renderer draw calls without capturing or reading any image.
  const stats=JSON.parse(await page.locator('.mind-world').getAttribute('data-render-stats'))
  assert.equal(stats.calls,1);assert(stats.triangles>0);assert.equal(stats.geometries,1);assert.equal(stats.textures,0)
  await expect(page.locator('.mind-world')).toHaveAttribute('data-renderer','three')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-navigation','overview')
  const overviewPose=await pose()
  await page.setViewportSize({width:width===1280?900:420,height})
  await expect(page.locator('.mind-world')).toHaveAttribute('data-buffer-pixels',String((width===1280?900:420)*height))
  const resizedPose=await pose()
  await page.evaluate(()=>window.world.change('in'));await expect.poll(async()=>(await pose()).z).toBeLessThan(resizedPose.z)
  await page.setViewportSize({width,height});await expect(page.locator('.mind-world')).toHaveAttribute('data-buffer-pixels',String(width*height))
  await page.evaluate(()=>window.world.change('in'));await expect.poll(async()=>(await pose()).z).toBeLessThan(overviewPose.z)
  await page.evaluate(()=>window.world.change('out'));await expect.poll(async()=>Math.abs((await pose()).z-overviewPose.z)).toBeLessThan(.001)
  if(width<600){
   const cdp=await context.newCDPSession(page),touches=gap=>[{x:width/2-gap,y:height*.6,id:1},{x:width/2+gap,y:height*.6,id:2}]
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(25)})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(55)})
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
   await expect.poll(async()=>(await pose()).z).toBeLessThan(overviewPose.z)
   assert.deepEqual(await page.evaluate(()=>window.activations),[],'pinching never activates an object')
   await cdp.detach()
  }
  // Map is a second projection over exact source IDs, not a second entity store.
  const map=page.locator('.world-map');await map.locator('summary').click()
  await map.locator('[data-map-id="role:guide"]').click()
  await expect(page.locator('.mind-world')).toHaveAttribute('data-selected-id','role:guide')
  await expect(page.locator('[data-world-id="role:guide"]')).toHaveAttribute('data-selected','true')
  await map.getByRole('button',{name:'Mark selected',exact:true}).click()
  await expect(page.locator('.mind-world')).toHaveAttribute('data-marked-id','role:guide')
  await expect(map.locator('[data-map-id="role:guide"]')).toHaveAttribute('data-marked','true')
  await map.locator('summary').click();await page.getByRole('button',{name:'View all',exact:true}).click()
  const explore=async()=>{await page.locator('.world-nearby summary').click();await page.getByLabel('Navigation',{exact:true}).selectOption('explore');await page.locator('.world-nearby summary').click();await expect(page.locator('.mind-world')).toHaveAttribute('data-navigation','explore')}
  await explore()
  await expect(page.locator('.mind-world')).toHaveAttribute('data-camera-mode','third-person')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-avatar','present')
  const hold=async(code,check)=>{await page.locator('canvas').focus();await page.keyboard.down(code);try{await check()}finally{await page.keyboard.up(code)}}
  const initial=await pose();await hold('KeyW',()=>expect.poll(async()=>(await pose()).z).toBeLessThan(initial.z))
  await hold('KeyR',()=>expect.poll(async()=>(await pose()).y).toBeGreaterThan(initial.y))
  const raised=await pose();await hold('KeyF',()=>expect.poll(async()=>(await pose()).y).toBeLessThan(raised.y))
  const beforeRise=await pose();await page.getByRole('button',{name:'Walk rise',exact:true}).focus();await page.keyboard.press('Enter');await expect.poll(async()=>(await pose()).y).toBeGreaterThan(beforeRise.y)
  const beforeLook=await pose();await page.mouse.move(width*.6,height*.6);await page.mouse.down();await page.mouse.move(width*.6+60,height*.6);await page.mouse.up();await expect.poll(async()=>(await pose()).yaw).not.toBe(beforeLook.yaw)
  await page.getByRole('button',{name:'View all',exact:true}).click();await expect(page.locator('.mind-world')).toHaveAttribute('data-navigation','overview');await explore()
  await page.getByText('In this space · 4',{exact:true}).click();await page.getByRole('button',{name:'Find Guide',exact:true}).click();await expect.poll(async()=>(await pose()).x).toBe(-5.1)
  await page.locator('[data-world-id="role:guide"]').click();const bubble=page.getByRole('dialog',{name:'Conversation with Guide',exact:true});await expect(bubble).toContainText('Published state for role:guide')
  assert.deepEqual(await page.evaluate(()=>window.activations),[],'looking at a conversation is not execution')
  const box=await bubble.boundingBox();assert(box.width<=320&&box.x>=0&&box.x+box.width<=width&&box.y+box.height<=height)
  await bubble.getByRole('button',{name:'Review role',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.activations),['role:guide'])
  const before=await pose()
  // Actual touch/pointer input on the mobile control, including release outside its bounds.
  await page.getByRole('button',{name:'Walk forward',exact:true}).hover();await page.mouse.down();await page.waitForTimeout(160);await page.mouse.move(width-5,10);await page.mouse.up()
  await page.waitForTimeout(150);const stopped=await pose(),stableFrames=await frames();await page.waitForTimeout(300);const ambientFrames=(await frames())-stableFrames;assert.deepEqual(await pose(),stopped);assert(ambientFrames<4,'ambient NPC motion is capped');if(reducedMotion==='reduce')assert.equal(ambientFrames,0,'reduced motion stops ambient frames');assert(stopped.z<before.z)
  // Input updates retain camera, exact identity, no executable markup, and a bounded visible label set.
  await page.evaluate(()=>{window.savedCanvas=document.querySelector('canvas');window.savedLabel=document.querySelector('.world-name');window.savedUploads=document.querySelector('.mind-world').dataset.uploads})
  await page.evaluate(()=>{window.objects[0].title='<img src=x onerror=alert(1)>';window.world.update(window.objects)})
  await expect(page.locator('.world-name').first()).toContainText('<img src=x onerror=alert(1)>');assert.equal(await page.locator('.mind-world img').count(),0);assert.deepEqual(await pose(),stopped)
  assert(await page.evaluate(()=>window.savedCanvas===document.querySelector('canvas')&&window.savedLabel===document.querySelector('.world-name')&&window.savedUploads===document.querySelector('.mind-world').dataset.uploads),'text-only updates retain DOM/GPU geometry')
  await expect(page.locator('.world-updates summary')).toContainText('1')
  await page.evaluate(()=>{for(let i=0;i<30;i++)window.world.update(window.objects)})
  assert.equal(await page.locator('.world-updates [data-change-id]').count(),1)
  await page.evaluate(()=>window.world.update(Array.from({length:512},(_,i)=>({id:'item:'+i,title:'Record '+i,kind:'record'}))))
  await expect(page.locator('.mind-world')).toHaveAttribute('data-objects','512');assert((await page.locator('.world-name:visible').count())<=8)
  await expect(page.locator('.mind-world')).toHaveAttribute('data-animated-npcs','0')
  const rejection=await page.evaluate(()=>{try{window.world.update(Array.from({length:513},(_,i)=>({id:''+i,title:'Record'})))}catch(error){return error.message}});assert.equal(rejection,'WorldCapacityExceeded');assert.equal(await page.locator('.world-name').count(),512)
  await page.evaluate(()=>window.world.update(window.objects));await page.getByRole('button',{name:'View all',exact:true}).click()
  // Loss/restore must keep the exact source data and expose a typed failure.
  await page.evaluate(()=>{window.gpuLoss=document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');window.gpuLoss.loseContext()})
  await expect(page.getByRole('alert')).toContainText('WorldGraphicsContextLost')
  await page.evaluate(()=>window.gpuLoss.restoreContext());await expect(page.locator('.mind-world')).toHaveAttribute('data-gpu','ready');await expect(page.getByRole('alert')).toBeHidden()
  // Same source, different local pattern: grouping never invokes a product operation.
  await page.evaluate(()=>window.world.update([{id:'person',title:'Person',kind:'character'},...Array.from({length:30},(_,i)=>({id:'record:'+i,title:'Record '+i,kind:'record',group:{kind:'structural',ref:'group:declared'},semanticRef:'meaning:'+i%2,sourceRefs:[{owner:'owner:'+i%3}]}))]))
  const activations=await page.evaluate(()=>window.activations.slice())
  await page.locator('.world-nearby summary').click();await page.getByLabel('Spatial layout',{exact:true}).selectOption('constellation')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-pattern','constellation');await expect(page.locator('.world-name')).toHaveCount(2)
  await expect(page.locator('.mind-world')).toHaveAttribute('data-source-objects','31')
  await page.getByRole('button',{name:'Browse shelf group:declared',exact:true}).click()
  await expect(page.locator('.world-name')).toHaveCount(24)
  await page.locator('.world-nearby summary').click();await page.getByRole('button',{name:'Next objects',exact:true}).click()
  await expect(page.locator('.world-name')).toHaveCount(7)
  assert.deepEqual(await page.locator('.world-name').evaluateAll(nodes=>nodes.map(n=>n.dataset.worldId)),Array.from({length:7},(_,i)=>'record:'+(i+23)))
  await page.getByRole('button',{name:'Find Record 29',exact:true}).click();await expect.poll(async()=>(await pose()).y).toBeGreaterThan(1.85)
  await page.locator('[data-world-id="record:29"]').click();assert.deepEqual(await page.evaluate(()=>window.activations),[...activations,'record:29'])
  await page.getByRole('button',{name:'Return to all shelves',exact:true}).click()
  await page.locator('.world-nearby summary').click();await page.getByLabel('Group by',{exact:true}).selectOption('meaning');await expect(page.locator('.world-name')).toHaveCount(3)
  await page.getByLabel('Group by',{exact:true}).selectOption('source');await expect(page.locator('.world-name')).toHaveCount(4)
  await page.getByLabel('Spatial layout',{exact:true}).selectOption('ground');await expect(page.locator('.world-name')).toHaveCount(31)
  assert.deepEqual(await page.evaluate(()=>window.activations),[...activations,'record:29'])
  // One app-owned GPU across target changes, stale releases and 100 content updates.
  await page.evaluate(()=>{
   window.world.close();window.surface=window.makeSurface();const host=document.getElementById('stage')
   const options=target=>({target,objects:[{id:'record',kind:'record',title:'Initial value'}],onActivate:id=>window.activations.push(target+':'+id)})
   const old=window.surface.attach(host,options('old'));window.sharedCanvas=document.querySelector('canvas')
   window.lease=window.surface.attach(host,options('current'));old.release();window.world=window.lease.world
   window.sharedLabel=document.querySelector('.world-name')
  })
  await expect(page.locator('.mind-world')).toHaveAttribute('data-initializations','1')
  const uploads=await page.locator('.mind-world').getAttribute('data-uploads')
  await page.evaluate(()=>{for(let i=0;i<100;i++)window.world.update([{id:'record',kind:'record',title:'Value '+i}])})
  await expect(page.locator('.world-name strong')).toHaveText('Value 99')
  assert(await page.evaluate(()=>window.sharedCanvas===document.querySelector('canvas')&&window.sharedLabel===document.querySelector('.world-name')))
  assert.equal(await page.locator('.mind-world').getAttribute('data-uploads'),uploads)
  assert.equal(await page.locator('.world-updates [data-change-id]').count(),1)
  await page.locator('.world-name').click();assert.equal((await page.evaluate(()=>window.activations)).at(-1),'current:record')
  // Work state remains an owner observation. Bounded ambient NPC motion is not
  // token progress; a lost observation must remove the activity claim.
  await page.evaluate(()=>{
   window.workActivity={available:true,counts:{Runnable:0,Blocked:0,Running:1,Completed:0,Failed:0,Cancelled:0},roles:[{roleRef:{id:'guide'},kind:'inference',state:'Running'}],driverPhase:'dispatching'}
   window.activityOptions={target:'activity',pattern:'garden',objects:[{id:'guide',kind:'character',title:'Guide'},{id:'text',kind:'record',title:'Note',scalars:['hello']}],onActivate:()=>{},activity:window.workActivity}
   window.lease=window.surface.attach(document.getElementById('stage'),window.activityOptions);window.world=window.lease.world
  })
  await expect(page.locator('.world-engine summary')).toHaveText('Shared work · 1 awaiting outcome')
  await expect(page.locator('[data-world-id=guide]')).toHaveAttribute('data-activity','AwaitingResult')
  await page.waitForTimeout(100);const activeFrames=await frames();await page.waitForTimeout(180);assert((await frames())-activeFrames<3)
  assert.equal(await page.locator('[data-world-id=guide]').evaluate(n=>getComputedStyle(n,'::before').animationName),'none','a reservation never animates as proven model progress')
  await page.locator('.world-nearby summary').click();const oldPosition=await page.locator('[data-world-id=guide]').getAttribute('data-position')
  await page.getByLabel('Object spacing',{exact:true}).selectOption('spacious');assert.notEqual(await page.locator('[data-world-id=guide]').getAttribute('data-position'),oldPosition)
  await page.evaluate(()=>window.surface.attach(document.getElementById('stage'),{...window.activityOptions,activity:{available:false}}))
  await expect(page.locator('.world-engine summary')).toHaveText('Shared work · status unavailable')
  await expect(page.locator('[data-world-id=guide]')).toHaveAttribute('data-activity','Unavailable')
  await page.evaluate(()=>{window.lease=window.surface.attach(document.getElementById('stage'),{target:'late-arrival',pattern:'garden',objects:[]});window.world=window.lease.world})
  await expect(page.locator('.mind-world')).toHaveAttribute('data-objects','0')
  await page.evaluate(()=>window.world.update([{id:'arrived',kind:'character',title:'Arrived'}]))
  const arrivedX=JSON.parse(await page.locator('[data-world-id=arrived]').getAttribute('data-position'))[0]
  await expect.poll(async()=>(await pose()).x).toBe(arrivedX)
  await expect(page.locator('[data-world-id=arrived]')).toBeVisible()
  const arrivedPose=await pose()
  await page.evaluate(()=>{window.world.update([]);window.world.update([{id:'arrived',kind:'character',title:'Arrived'}])})
  await expect(page.locator('[data-world-id=arrived]')).toBeVisible();assert.deepEqual(await pose(),arrivedPose)
  await page.evaluate(()=>{window.lease.release();window.surface.close();window.surface.close();window.openWorld()})
  for(let i=0;i<20;i++)await page.evaluate(()=>{window.world.close();window.openWorld()})
  await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.mind-world')).toHaveAttribute('data-gpu','ready')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight))
  await page.evaluate(()=>window.world.close());assert.equal(await page.locator('canvas').count(),0)
  assert.deepEqual(errors,[]);rows.push({width,height,reducedMotion,pixels,stats,errors,ambientFrames,exactActivation:true,verticalMovement:true,conversation:true,screenshots:0,maxObjects:512,contextRecovery:true,disposeCycles:20});await context.close()
 }
 console.log(JSON.stringify({status:'PASS',rows}))
}finally{await browser.close();server.close();await once(server,'close')}
