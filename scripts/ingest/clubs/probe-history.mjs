// Temporary probe (removed before merge): the shape of an olympiacos-history.gr day page
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
const t=await (await fetch('https://olympiacos-history.gr/?p=29500',{headers:UA})).text()
const a=t.indexOf('<article'),b=t.indexOf('</article>');const art=t.slice(a,b)
console.log('ARTICLE bytes',art.length)
const i=art.indexOf('1932');console.log('RAW',art.slice(Math.max(0,i-1500),i+3500).replace(/\s+/g,' '))
console.log('TEXT',art.replace(/<(script|style)[\s\S]*?<\/\1>/g,'').replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|h\d|li|tr|div)>/g,'\n').replace(/<[^>]+>/g,'').replace(/\n\s*\n+/g,'\n').slice(0,6000))
const m=await (await fetch('https://olympiacos-history.gr/?page_id=28973',{headers:UA})).text()
console.log('MONTH LINKS',[...new Set(m.match(/olympiacos-history\.gr\/\?p=\d+/g)||[])].length,[...(m.matchAll(/href="([^"]*\?p=\d+)"[^>]*>([^<]{0,40})</g))].slice(0,40).map(x=>x[1].split('=').pop()+':'+x[2]).join(' | '))
console.log('MENU',[...(m.matchAll(/href="([^"]*\?page_id=\d+)"[^>]*>([^<]{0,40})</g))].map(x=>x[1].split('=').pop()+':'+x[2].trim()).join(' | ').slice(0,3000))
