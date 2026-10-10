// Fills the one gap the Royal Rumble cannot guess: a squad man whose position no archive source states.
// Sources: the football-biography infobox of English / Hebrew / Greek Wikipedia (CC BY-SA), read through the public API at its stated rate limit.
// A page is accepted ONLY when: the title is exact, it is not a disambiguation page, it is a footballer, and its wikitext names THIS club.
// Anything else stays unplaced and is listed with the reason — never matched by surname, never guessed (rule 7).
// usage: NODE_USE_ENV_PROXY=1 node fill-positions.mjs missing.json out.json [en,he,el]   (an existing out.json is merged into)
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
const [,, inFile, outFile, only='en,he,el']=process.argv
const missing=JSON.parse(readFileSync(inFile,'utf8'))
const UA='FanLifeArchive/1.0 (maordubel@gmail.com; football archive research, polite)'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const L={
 en:{host:'en.wikipedia.org',test:/^[\p{Script=Latin}\s.'()\-]+$/u,suffix:[' (footballer)',' (soccer)'],box:/Infobox football biography|Infobox footballer/i,param:/\|\s*position\s*=\s*([^\n|]*(?:\n(?!\s*\|)[^\n|]*)*)/i,
  disamb:t=>/\{\{\s*(disambig|hndis|surname)/i.test(t)||/may refer to:/.test(t.slice(0,600)),
  club:{celtic:/Celtic/,'st-pauli':/St\.? Pauli/,'zrinjski-mostar':/Zrinjski/,'aek-athens':/AEK/,'hapoel-petah-tikva':/Hapoel Petah/i,'hapoel-tel-aviv':/Hapoel Tel[ -]Aviv/i,panathinaikos:/Panathinaikos/,olympiacos:/Olympiacos|Olympiakos/},
  fam:t=>{t=t.toLowerCase();return /goalkeeper|goalie/.test(t)?'GK':/back|defender|sweeper|stopper|centre-half|center-half|libero/.test(t)?'DF':/midfield|playmaker/.test(t)?'MF':/forward|striker|winger|wing\b|outside|inside|attacker/.test(t)?'FW':null}},
 he:{host:'he.wikipedia.org',test:/\p{Script=Hebrew}/u,suffix:[' (כדורגלן)'],box:/אישיות כדורגל|כדורגלן/,param:/\|\s*(?:תפקיד כשחקן|עמדה)\s*=\s*([^\n|]*)/,
  disamb:t=>/\{\{\s*פירוש\s*[|}]/.test(t.slice(0,300))||/ערכים נוספים/.test(t.slice(0,200)),
  club:{'hapoel-tel-aviv':/הפועל תל[ -]אביב/,'hapoel-petah-tikva':/הפועל פתח תקו/},
  fam:t=>/שוער/.test(t)?'GK':/מגן|בלם|ליברו|ספיר|מגנים/.test(t)?'DF':/קשר/.test(t)?'MF':/חלוץ|כנף|התקפה|תוקף/.test(t)?'FW':null},
 el:{host:'el.wikipedia.org',test:/\p{Script=Greek}/u,suffix:[' (ποδοσφαιριστής)'],box:/ποδοσφαιριστ|football biography/i,param:/\|\s*(?:θέση|position)\s*=\s*([^\n|]*)/i,
  disamb:t=>/\{\{\s*(αποσαφήνιση|disambig)/i.test(t),
  club:{'aek-athens':/Α\.?Ε\.?Κ\.?|ΑΕΚ/},
  fam:t=>{t=t.toLowerCase();return /τερματοφύλακ/.test(t)?'GK':/αμυντικ|στόπερ|μπακ|λιμπέρο/.test(t)?'DF':/μέσος|μέσο/.test(t)?'MF':/επιθετικ|φορ|εξτρέμ|φάλ/.test(t)?'FW':null}},
}
async function api(host,params){
 for(let i=0;i<14;i++){
  const r=await fetch(`https://${host}/w/api.php?`+new URLSearchParams({format:'json',action:'query',redirects:'1',...params}),{headers:{'User-Agent':UA}})
  if(r.status===429){await sleep((Number(r.headers.get('retry-after'))||20)*1000+1500);continue}
  if(!r.ok)throw new Error('HTTP '+r.status)
  await sleep(1300);return r.json()
 }
 throw new Error('rate limited')
}
const judge=(cfg,clubRe,pg,lang)=>{
 if(cfg.disamb(pg.text))return {why:'disambiguation page'}
 if(!cfg.box.test(pg.text))return {why:'not a football biography'}
 if(!clubRe.test(pg.text))return {why:'page does not name this club'}
 const m=cfg.param.exec(pg.text),raw=m?clean(m[1]):'',fam=raw?cfg.fam(raw):null
 if(!fam)return {why:raw?`position "${raw}" is not one of the four families`:'infobox states no position'}
 return {hit:{pos:fam,raw,title:pg.title,rev:pg.rev,lang}}
}
const clean=s=>s.replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g,'').replace(/\{\{[^{}]*\}\}/g,m=>m.replace(/\{\{(?:nowrap|small)\|?|\}\}/g,'')).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g,'$1').replace(/<br\s*\/?>/g,', ').trim()
const prev=existsSync(outFile)?JSON.parse(readFileSync(outFile,'utf8')):{positions:{},unplaced:{}}
const found=prev.positions||{},unplaced={}
for(const [club,list] of Object.entries(missing)){
 found[club]??={};unplaced[club]=(prev.unplaced?.[club]??[]).filter(u=>!only.split(',').some(l=>L[l].test.test(u.name)&&L[l].club[club]))
 for(const lang of only.split(',')){
  const cfg=L[lang],clubRe=cfg.club[club];if(!clubRe)continue
  const mine=list.filter(p=>!found[club][p.id]&&cfg.test.test(p.name)&&!(lang!=='en'&&L.en.test.test(p.name)))
  if(!mine.length)continue
  const base=p=>p.name.replace(/\s*\(Jnr\)/,' Jr.'),titles=mine.flatMap(p=>[base(p),...cfg.suffix.map(s=>base(p)+s)]),pages={}
  for(let i=0;i<titles.length;i+=40){
   const chunk=[...new Set(titles.slice(i,i+40))]
   const d=await api(cfg.host,{prop:'revisions',rvprop:'content|ids',rvslots:'main',titles:chunk.join('|')})
   const redirect=new Map((d.query.redirects||[]).map(r=>[r.from,r.to])),norm=new Map((d.query.normalized||[]).map(r=>[r.from,r.to]))
   for(const t of chunk){const n=norm.get(t)??t,to=redirect.get(n)??n,pg=Object.values(d.query.pages).find(x=>x.title===to);if(pg&&pg.revisions)pages[t]={title:pg.title,rev:pg.revisions[0].revid,text:pg.revisions[0].slots.main['*']}}
  }
  for(const p of mine){
   let hit=null,why='no page with that exact title'
   for(const t of [base(p),...cfg.suffix.map(s=>base(p)+s)]){const pg=pages[t];if(!pg)continue
    const j=judge(cfg,clubRe,pg,lang);if(j.hit){hit=j.hit;break}why=j.why}
   if(hit)found[club][p.id]=hit;else unplaced[club].push({id:p.id,name:p.name,why:`${lang}: ${why}`})
  }
  if(lang==='en'){
   // second chance: a disambiguation page names its footballers; a missing title may be found by search. Accepted only when exactly ONE
   // candidate is a footballer page that names this club — several of the same name stay unplaced.
   for(const u of unplaced[club].filter(x=>/disambiguation|no page with that exact/.test(x.why)&&!found[club][x.id])){
    const base=u.name.replace(/\s*\(Jnr\)/,' Jr.');let cands=[]
    const dp=pages[base]??pages[base+' (footballer)']
    if(dp&&cfg.disamb(dp.text))cands=[...dp.text.matchAll(/^\*.*$/gm)].filter(m=>/football|soccer/i.test(m[0])).flatMap(m=>[...m[0].matchAll(/\[\[([^\]|#]+)/g)].slice(0,1).map(x=>x[1]))
    else{const sr=await api(cfg.host,{list:'search',srsearch:`"${base}" ${clubRe.source.replace(/[\\^$.*+?()[\]{}|]/g,' ').split(' ')[0]} footballer`,srlimit:'4'});cands=(sr.query?.search||[]).map(x=>x.title).filter(t=>t.toLowerCase().startsWith(base.toLowerCase()))}
    cands=[...new Set(cands)].slice(0,5);if(!cands.length)continue
    const d=await api(cfg.host,{prop:'revisions',rvprop:'content|ids',rvslots:'main',titles:cands.join('|')})
    const ok=Object.values(d.query.pages).filter(pg=>pg.revisions).map(pg=>({title:pg.title,rev:pg.revisions[0].revid,text:pg.revisions[0].slots.main['*']})).map(pg=>judge(cfg,clubRe,pg,lang)).filter(j=>j.hit)
    if(ok.length===1){found[club][u.id]=ok[0].hit}else if(ok.length>1)u.why='en: several footballers of this name played for this club'
   }
   unplaced[club]=unplaced[club].filter(x=>!found[club][x.id])
  }
 }
 for(const p of list)if(!found[club][p.id]&&!unplaced[club].some(u=>u.id===p.id))unplaced[club].push({id:p.id,name:p.name,why:'no source consulted for this script/club'})
 console.log(club,'placed',Object.keys(found[club]).length,'of',list.length)
}
writeFileSync(outFile,JSON.stringify({generatedAt:new Date().toISOString().slice(0,10),source:'Wikipedia (English, Hebrew, Greek) football-biography infoboxes, position field — CC BY-SA 4.0',rule:'accepted only on an exact title, a footballer page that names this club; nothing matched by surname',positions:found,unplaced},null,1))
