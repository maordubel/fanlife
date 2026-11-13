// Temporary probe (removed before merge): olympiacos-history.gr all-matches and all-players pages as text
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
for(const u of ['https://olympiacos-history.gr/?page_id=34787','https://olympiacos-history.gr/?page_id=60212']){
 const t=await (await fetch(u,{headers:UA})).text()
 const a=t.indexOf('<article'),b=t.lastIndexOf('</article>');const art=t.slice(a,b)
 const txt=art.replace(/<(script|style)[\s\S]*?<\/\1>/g,'').replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|h\d|li|tr|div|td)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\n\s*\n+/g,'\n')
 console.log('##',u,'article',art.length,'text',txt.length,'tables',(art.match(/<table/g)||[]).length,'imgs',(art.match(/<img/g)||[]).length,'links',(art.match(/<a /g)||[]).length)
 console.log(txt.slice(0,3000).split('\n').map(l=>'  > '+l.trim()).join('\n'))
 const links=[...art.matchAll(/href="([^"]+)"[^>]*>([^<]{2,60})</g)].slice(0,30).map(x=>x[1].replace('https://olympiacos-history.gr','')+' :: '+x[2].trim());console.log(links.join('\n'))
}
