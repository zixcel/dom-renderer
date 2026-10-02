// Trusted presentation policy, not semantic classification or operation authority.
// Never infer meaning from a title, locator or a numeric magnitude.
export const spacingPresets=Object.freeze({compact:{person:5,group:3,member:1.3},balanced:{person:7,group:4,member:1.8},spacious:{person:10,group:6,member:2.6}})
export const objectForms=Object.freeze({person:'Person',organization:'Organization',system:'System',shelf:'Bookshelf',book:'Book'})
// Temporary placement policy. Furniture is derived from nonempty view groups,
// not persisted as semantic data. A page occupies six columns × four shelves.
export const libraryLayout=Object.freeze({columns:6,rows:4,slotWidth:.46,rowHeight:.63,baseY:.32,frontZ:.32})
export const objectBounds=Object.freeze({person:[1.5,2.5,1.1],organization:[2.8,3.2,2],system:[1.8,2,1],shelf:[3.4,3.2,.9],book:[.4,.62,.6]})
// Each part is [x,y,z,width,height,depth,tint]. Local coordinates and closed
// tint tokens keep assets declarative: no external scripts, images or model IO.
export const objectTemplates=Object.freeze({
 person:[[-.2,.48,0,.28,.8,.34,'dark'],[.2,.48,0,.28,.8,.34,'dark'],[0,1.26,0,.88,.86,.48,'accent'],[-.59,1.22,0,.25,.9,.3,'accent'],[.59,1.22,0,.25,.9,.3,'accent'],[0,2,0,.62,.62,.58,'face'],[0,2.34,0,.68,.15,.63,'dark'],[-.15,2.04,.302,.075,.08,.025,'dark'],[.15,2.04,.302,.075,.08,.025,'dark']],
 organization:[[0,1.55,0,2.6,3,1.8,'accent'],[0,3.1,0,2.8,.2,2,'dark'],[-.6,1.8,.92,.55,.65,.08,'light'],[.6,1.8,.92,.55,.65,.08,'light'],[0,.5,.94,.7,.95,.08,'dark']],
 system:[[0,.25,0,1.5,.5,.9,'dark'],[0,1.2,0,1.4,1.5,.3,'accent'],[0,1.35,.18,1.1,1,.05,'light'],[0,.6,.45,1.2,.1,.15,'warning']],
 shelf:[[-1.55,1.5,0,.15,3,.65,'dark'],[1.55,1.5,0,.15,3,.65,'dark'],[0,1.5,-.32,3.25,3,.08,'accent'],...Array.from({length:5},(_,i)=>[0,.25+i*.63,0,3.25,.1,.7,'dark'])],
 book:[[-.15,.3,0,.05,.58,.5,'accent'],[.15,.3,0,.05,.58,.5,'accent'],[0,.3,-.22,.3,.58,.06,'accent'],[0,.3,.025,.24,.5,.39,'light']]
})
export function objectPresentation(item){
 if(item.form&&Object.hasOwn(objectForms,item.form))return {form:item.form}
 if(item.kind==='character')return {form:'person'}
 if(item.kind==='group')return {form:'shelf'}
 const values=item.scalars??[],types=[...new Set(values.filter(v=>v!==null).map(v=>typeof v))]
 return {form:'book',dataType:types.length===1?({string:'text',number:'number',boolean:'boolean'}[types[0]]??'record'):'record',needsReview:Boolean(item.unresolved)}
}
