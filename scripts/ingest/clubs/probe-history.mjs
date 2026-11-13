// Temporary probe (removed before merge): olympiacos-history.gr text widgets
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
for(const u of ['https://olympiacos-history.gr/?p=29500','https://olympiacos-history.gr/?page_id=60212']){
 const t=await (await fetch(u,{headers:UA})).text()
 const w=[...t.matchAll(/elementor-widget-(text-editor|heading)[\s\S]*?<div class="elementor-widget-container">([\s\S]*?)<\/div>\s*<\/div>/g)].map(m=>m[2].replace(/<br\s*\/?>/g,'\n').replace(/<\/(p|h\d|li)>/g,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim()).filter(Boolean)
 console.log('##',u,'widgets',w.length);console.log(w.slice(0,40).join('\n---\n').slice(0,6000))
}
