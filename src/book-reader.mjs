// A world-local inspection view over declared scalar fields. Page position is
// presentation state only; neither the object nor its evidence is copied.
import {symbol} from './symbol.mjs'
export function bookReader(document,item,revision,close,signal,previous){
 const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
 const root=make('article',undefined,'entity-inspector game-book'),header=make('header'),title=make('h2',item.display?.title??'Display not configured')
 root.dataset.bookId=item.id;root.dataset.bookRevision=revision
 root.setAttribute('aria-label','Inspect '+title.textContent)
 const heading=make('div',undefined,'game-book-heading');heading.append(make('small','INSPECT'),title)
 if(item.display?.summary)heading.append(make('p',item.display.summary))
 header.append(heading,close)
 const object=make('div',undefined,'game-book-object');object.setAttribute('aria-hidden','true');object.append(symbol(document,'book'))
 const pageView=make('section',undefined,'game-book-page'),body=make('div',undefined,'game-book-body'),footer=make('nav'),counter=make('output')
 pageView.setAttribute('aria-live','polite');body.append(object,pageView)
 footer.setAttribute('aria-label','Book pages')
 const fields=item.display?.fields??[],pages=Math.max(1,Math.ceil(fields.length/2))
 let page=previous?.id===item.id&&previous.revision===revision&&Number.isInteger(previous.page)?Math.max(0,Math.min(pages-1,previous.page)):0
 const button=(text,delta)=>{const node=make('button',text);node.type='button';node.addEventListener('click',()=>{page=Math.max(0,Math.min(pages-1,page+delta));draw()},{signal});return node}
 const back=button('Previous pages',-1),next=button('Next pages',1);footer.append(back,counter,next);root.append(header,body,footer)
 function draw(){
  root.dataset.bookPage=String(page);pageView.setAttribute('aria-label','Page '+(page+1)+' of '+pages)
  const list=make('dl',undefined,'object-fields')
  for(const field of fields.slice(page*2,page*2+2))list.append(make('dt',field.label),make('dd',field.value===null?'Not set':String(field.value)))
  pageView.replaceChildren(make('small','PAGE '+String(page+1).padStart(2,'0')+' / '+String(pages).padStart(2,'0')),list)
  if(!list.children.length)pageView.append(make('p','No display fields have been declared.'))
  const focused=document.activeElement,refocus=focused===back&&page===0?next:focused===next&&page===pages-1?back:null
  counter.textContent=(page+1)+' / '+pages;back.disabled=page===0;next.disabled=page===pages-1;refocus?.focus({preventScroll:true})
 }
 document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return
  const panel=root.closest('.frame-panel'),focused=document.activeElement
  if(!panel?.contains(focused)||focused?.matches('input,select,textarea,[contenteditable]'))return
  event.preventDefault();page=Math.max(0,Math.min(pages-1,page+(event.key==='ArrowRight'?1:-1)));draw()
 },{signal})
 draw();return root
}
