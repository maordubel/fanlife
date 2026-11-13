// Temporary probe (removed before merge): olympiacos-history.gr from GitHub Actions
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
for(const u of ['https://olympiacos-history.gr/?page_id=28973','https://olympiacos-history.gr/?p=29500','https://olympiacos-history.gr/?page_id=60212','https://olympiacos-history.gr/wp-json/wp/v2/posts?per_page=2','https://olympiacos-history.gr/wp-json/wp/v2/pages?per_page=1']){
 const r=await fetch(u,{headers:UA});const t=await r.text();console.log('##',r.status,u,'bytes',t.length)
 const i=t.indexOf('entry-content');console.log(t.slice(i>0?i:0,(i>0?i:0)+2500).replace(/\s+/g,' '));await new Promise(r=>setTimeout(r,1500))}
