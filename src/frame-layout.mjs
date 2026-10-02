// Pure presentation policy: never resize the world or refit its camera for a panel.
// The exact object's projected bounds determine an adjacent, bounded bubble.
export function frameLayout(width,height,kind,anchor=null){
 const gap=12,left=8,top=56,right=width-8,bottom=height-64
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))
 const w=Math.min(kind==='actions'?320:['details','structure'].includes(kind)?640:432,right-left)
 const h=Math.min(kind==='actions'?360:kind==='details'?height*.6:480,bottom-top)
 let panel={x:right-w,y:top,width:w,height:h},mode='overlay'
 if(anchor){
  const areas=[
   {side:'right',x:Math.max(left,anchor.right+gap),y:top,right,bottom},
   {side:'left',x:left,y:top,right:Math.min(right,anchor.left-gap),bottom},
   {side:'above',x:left,y:top,right,bottom:Math.min(bottom,anchor.top-gap)},
   {side:'below',x:left,y:Math.max(top,anchor.bottom+gap),right,bottom}
  ].map(a=>({...a,width:Math.min(w,Math.max(0,a.right-a.x)),height:Math.min(h,Math.max(0,a.bottom-a.y))}))
  const best=areas.filter(a=>a.width>=Math.min(240,w)&&a.height>=80).sort((a,b)=>b.width*b.height-a.width*a.height)[0]
  if(best){
   const vertical=['above','below'].includes(best.side)
   panel={x:vertical?clamp((anchor.left+anchor.right-best.width)/2,best.x,best.right-best.width):best.side==='left'?best.right-best.width:best.x,
    y:vertical?(best.side==='above'?best.bottom-best.height:best.y):clamp(anchor.top,best.y,best.bottom-best.height),width:best.width,height:best.height}
   mode=best.side
  }
 }
 return {mode,world:{width,height},panel}
}
