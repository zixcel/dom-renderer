import {createWorld} from './world-runtime.mjs'
// One explicit owner per delivery application; stale leases cannot pause a new view.
export function createWorldSurface(activityPresentation={}){
 for(const value of Object.values(activityPresentation))if(typeof value!=='function')throw Error('InvalidPresentationAdapter')
 const trustedPresentation=Object.freeze({...activityPresentation})
 let world=null,generation=0,closed=false
 return {attach(host,options){
  if(closed)throw Error('WorldSurfaceClosed')
  options={...options,activityPresentation:trustedPresentation}
  const lease=++generation
  if(world)world.mount(host,options);else world=createWorld(host,options)
  return {world,release(){if(lease===generation)world.park()}}
 },close(){if(closed)return;closed=true;++generation;world?.close();world=null}}
}
