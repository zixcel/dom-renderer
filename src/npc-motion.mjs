// Ambient presentation only. This never changes semantic position or Work.
export function npcMotion(id,milliseconds,state='Idle'){
 const seed=[...id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,0)>>>0
 const active=['Runnable','Running','AwaitingResult'].includes(state)
 const phase=milliseconds/1000*(active?2.2:1.1)*(0.85+(seed%7)/20)+(seed%97)*.31
 return {x:Math.sin(phase)*(active?.2:.08),y:Math.max(0,Math.sin(phase*1.7))*(active?.12:.04),swing:Math.sin(phase*1.4)*(active?.16:.08)}
}
