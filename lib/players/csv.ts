/** A small, strict CSV reader: UTF-8 with or without a BOM, quoted cells, doubled quotes, CRLF. Limits are enforced by the caller. */
export function parseCsv(text:string):string[][]{
 const src=text.replace(/^﻿/,''),rows:string[][]=[];let row:string[]=[],cell='',q=false
 for(let i=0;i<src.length;i++){const ch=src[i]!
  if(q){if(ch==='"'){if(src[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch;continue}
  if(ch==='"'&&cell==='')q=true
  else if(ch===','){row.push(cell);cell=''}
  else if(ch==='\r'){/* swallowed: \n ends the row */}
  else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=''}
  else cell+=ch}
 if(cell!==''||row.length){row.push(cell);rows.push(row)}
 return rows.filter(r=>r.some(c=>c.trim()!==''))
}
/** a cell read back from an export was prefixed with ' to defuse a formula; strip exactly one */
export const unquoteCell=(s:string)=>s.replace(/^'(?=[=+\-@\t\r])/,'').trim()
