/** Pure text helpers shared by the collector (no server-only, no storage) and the daily pass. */
export function htmlToText(html:string):string{
 return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>|<br\s*\/?>/gi,'\n\n').replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/[ \t]+/g,' ').replace(/ ?\n ?/g,'\n').replace(/\n{3,}/g,'\n\n').trim()
}
/** WordPress REST bodies are JSON with rendered HTML; archive pages are HTML. Anything else is not text we read. */
export function textOf(body:string):{title:string|null;text:string}|null{
 const t=body.trimStart()
 if(t.startsWith('{')||t.startsWith('[')){
  try{const j=JSON.parse(t) as unknown,items=Array.isArray(j)?j:[j]
   const parts=items.map(i=>i as {title?:{rendered?:string};content?:{rendered?:string}}).filter(i=>i?.content?.rendered)
   if(!parts.length)return null
   return {title:htmlToText(parts[0]!.title?.rendered??'')||null,text:parts.map(i=>htmlToText(i.content!.rendered!)).join('\n\n')}}catch{return null}
 }
 if(/<html|<body|<p[ >]|<div/i.test(t.slice(0,2000)))return {title:/<title[^>]*>([^<]*)/i.exec(t)?.[1]?.trim()||null,text:htmlToText(t)}
 return null
}

/** One date written in the document's opening, if exactly one is: ISO, or d.m.yyyy / d/m/yyyy. Otherwise null — never guessed. */
export function documentDate(text:string):string|null{
 const found=new Set<string>(),head=text.slice(0,900)
 for(const m of head.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g))found.add(`${m[1]}-${m[2]}-${m[3]}`)
 for(const m of head.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g)){const d=Number(m[1]),mo=Number(m[2]);if(d>=1&&d<=31&&mo>=1&&mo<=12)found.add(`${m[3]}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}
 return found.size===1?[...found][0]!:null
}

