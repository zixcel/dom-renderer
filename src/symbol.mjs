// Installed vector primitives; labels/routes come from the site, never SVG/HTML input.
export function symbol(document,name='layers'){
 const paths={home:['m3 11 9-8 9 8','M5 9v12h14V9','M9 21v-8h6v8'],plus:['M12 4v16M4 12h16'],settings:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2'],clock:['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z','M12 6v6l4 2'],layers:['M12 3 2 8l10 5 10-5-10-5Z','m2 12 10 5 10-5','m2 17 10 5 10-5'],
  menu:['M4 6h16M4 12h16M4 18h16'],
  person:['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z','M4 22v-3a8 8 0 0 1 16 0v3'],
  nodes:['M9 5H5v4h4V5Z','M19 15h-4v4h4v-4Z','M9 15H5v4h4v-4Z','M7 9v6m2-8h8v8M9 17h6'],
  package:['m3 7 9-5 9 5v10l-9 5-9-5V7Z','m3 7 9 5 9-5M12 12v10M7 4l10 6'],
  book:['M4 3h14a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2V3Z','M4 18a2 2 0 0 1 2-2h14','M8 7h8m-8 4h6'],
  chip:['M6 6h12v12H6V6Z','M9 9h6v6H9V9Z','M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4'],
  info:['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z','M12 11v6m0-10v1'],
  search:['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z','m15 15 6 6'],
  play:['m8 4 12 8-12 8V4Z'],
  activity:['M2 12h4l3-8 6 16 3-8h4'],check:['m5 12 4 4L19 6'],warning:['m12 3 10 18H2L12 3Z','M12 9v5m0 3v1']}
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
 for(const [key,value]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false',class:'ui-symbol'}))svg.setAttribute(key,value)
 for(const d of paths[name]??paths.layers){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',d);svg.append(p)}
 return svg
}
