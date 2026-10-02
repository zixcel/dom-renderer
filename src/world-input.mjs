// Presentation input only: shared movement bindings and on-demand control guide.
const movement=[
 ['forward','W / ↑',['KeyW','ArrowUp']],['back','S / ↓',['KeyS','ArrowDown']],
 ['left','A / ←',['KeyA','ArrowLeft']],['right','D / →',['KeyD','ArrowRight']],
 ['rise','R / Page Up',['KeyR','PageUp']],['descend','F / Page Down',['KeyF','PageDown']]
]
const directions=new Map(movement.flatMap(([action,,codes])=>codes.map(code=>[code,action])))
export const keyDirection=code=>directions.get(code)
export function worldControlGuide(document){
 const guide=document.createElement('section');guide.setAttribute('aria-label','World controls')
 const section=(title,rows)=>{const heading=document.createElement('h3'),list=document.createElement('dl');heading.textContent=title
  for(const [input,action]of rows){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=input;description.textContent=action;list.append(term,description)}
  guide.append(heading,list)
 }
 section('Overview', [['Drag','Pan across the world'],['Wheel / pinch','Zoom'],['Click / tap an object','Select a target and open its context'],['Map / M','Find a projected target by the same reference'],['View all','Fit the whole space']])
 const note=document.createElement('p');note.textContent='Choose Walk through world under In this space → Navigation, then close the panel and select the world to use movement keys.';guide.append(note)
 section('Walk through world',movement.map(([action,label])=>[label,action[0].toUpperCase()+action.slice(1)]).concat([['Drag','Look around'],['Wheel','Move forward / back'],['E','Inspect the aimed object'],['M','Open or close Map'],['Q','Mark the aimed or selected target'],['Escape','Pause movement or close the open panel']]))
 section('Keyboard navigation',[['Tab / Shift + Tab','Move between controls'],['Enter / Space','Activate the focused button']])
 return guide
}
