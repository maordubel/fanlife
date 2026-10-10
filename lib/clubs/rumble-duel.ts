/**
 * A head-to-head link (client-safe). It carries ONE side: the club, the board seed it was drafted from and the five card ids. No rating
 * and no name travels — ids are opaque, the server re-deals that board from the seed and refuses a five it did not offer, so a link
 * cannot be forged into a better team. Whoever opens it picks ANY club (the same one included) and plays his five against it.
 */
export type DuelToken={c:string;s:number;p:string[]}
const b64=(s:string)=>typeof btoa==='function'?btoa(s):Buffer.from(s,'binary').toString('base64')
const unb64=(s:string)=>typeof atob==='function'?atob(s):Buffer.from(s,'base64').toString('binary')
export function encodeDuel(t:DuelToken):string{
 const json=JSON.stringify(t),bytes=encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)))
 return b64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
export function decodeDuel(raw:unknown):DuelToken|null{
 if(typeof raw!=='string'||raw.length<8||raw.length>2000||!/^[A-Za-z0-9_-]+$/.test(raw))return null
 try{
  const bin=unb64(raw.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((raw.length+3)%4)),json=decodeURIComponent(bin.split('').map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))
  const t=JSON.parse(json) as Partial<DuelToken>
  if(typeof t.c!=='string'||t.c.length>100||!Number.isSafeInteger(t.s)||!Array.isArray(t.p)||t.p.length>12||t.p.some(x=>typeof x!=='string'||x.length>200))return null
  return {c:t.c,s:t.s as number,p:t.p as string[]}
 }catch{return null}
}
