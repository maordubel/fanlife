import {loadClub,CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {norm} from '@/lib/fixtures/names'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
/**
 * One man, one card (rulebook §1: identical names/ids are ONE membership). Two records of one club are the same man only on strict evidence,
 * never a fuzzy match (rule 7):
 *   · same last word; the first words are equal, or two spellings of ONE name in the nickname table (Billy/William, Kenny/Kenneth …),
 *     or the shorter name's words are all inside the longer's (Scott Banks ⊂ Scott Brian Banks);
 *   · the years do not contradict (an unknown span is compatible);
 *   · and each side has exactly ONE such counterpart — two possible Willie McStays means neither is merged.
 * This ONLY ADDS to content/manual/rumble-merges.json; a person edits it freely and nothing here overwrites a line.
 */
const NICK=[['william','will','willie','billy','bill','liam'],['robert','bob','bobby','bertie','rob','robbie'],['james','jim','jimmy','jamie','jimmie'],['thomas','tom','tommy'],['daniel','dan','danny'],['kenneth','kenny','ken'],['stephen','steven','stevie','steve'],['patrick','pat','paddy'],['charles','charlie','chas'],['alexander','alex','alec','sandy'],['joseph','joe','joey'],['michael','mike','mick','mickey'],['edward','ed','eddie','ted'],['andrew','andy','drew'],['david','dave','davie'],['peter','pete'],['henry','harry'],['francis','frank','frankie'],['george','geordie'],['hugh','hughie'],['richard','dick','rich','ricky'],['john','johnny','jackie'],['anthony','tony'],['nicholas','nick'],['matthew','matt'],['christopher','chris'],['benjamin','ben'],['samuel','sam'],['gerald','gerry'],['frederick','fred','freddie'],['jonathan','jon']]
const group=new Map<string,number>();NICK.forEach((g,i)=>g.forEach(n=>group.set(n,i)))
const same=(a:string,b:string)=>a===b||(group.has(a)&&group.get(a)===group.get(b))
const FILE='content/manual/rumble-merges.json'
type M={keep:string;drop:string;why:string}
const existing:Record<string,M[]>=existsSync(FILE)?JSON.parse(readFileSync(FILE,'utf8')):{}
const run=async()=>{
 for(const id of CORE_CLUB_IDS){const d=(await loadClub(id))!.data,ps=d.players.filter(p=>p.value.name).map(p=>p.value)
  const toks=(n:string)=>norm(n.replace(/Image:.*$/,'')).split(' ').filter(Boolean)
  const compat=(a:typeof ps[number],b:typeof ps[number])=>!(a.fromYear!==null&&b.fromYear!==null&&a.toYear!==null&&b.toYear!==null&&(a.toYear<b.fromYear-1||b.toYear<a.fromYear-1))
  const match=(a:typeof ps[number],b:typeof ps[number])=>{const ta=toks(a.name),tb=toks(b.name);if(ta.length<2||tb.length<2||ta.at(-1)!==tb.at(-1))return false
   if(!compat(a,b))return false
   const sub=(x:string[],y:string[])=>x.every(w=>y.includes(w))&&x[0]===y[0]
   return same(ta[0]!,tb[0]!)||sub(ta,tb)||sub(tb,ta)}
  const found:M[]=[],seen=new Set((existing[id]||[]).flatMap(m=>[m.keep,m.drop]))
  for(const a of ps){if(seen.has(a.id))continue;const cands=ps.filter(b=>b.id!==a.id&&match(a,b));if(cands.length!==1)continue
   const b=cands[0]!;if(ps.filter(x=>x.id!==b.id&&match(b,x)).length!==1)continue
   if(found.some(f=>f.keep===a.id||f.drop===a.id||f.keep===b.id||f.drop===b.id))continue
   // keep the record that carries years, else the longer name; the card shows the shorter, famous name
   const richA=Number(a.fromYear!==null)*2+Number(a.name.length>b.name.length),richB=Number(b.fromYear!==null)*2+Number(b.name.length>a.name.length)
   const [keep,drop]=richA>=richB?[a,b]:[b,a]
   found.push({keep:keep.id,drop:drop.id,why:`"${drop.name}" and "${keep.name}": one man (same last word, ${same(toks(a.name)[0]!,toks(b.name)[0]!)?'same or nickname first name':'name contained'}, years compatible, no other candidate)`})}
  existing[id]=[...(existing[id]||[]),...found];console.log(id,'+',found.length,found.slice(0,4).map(f=>f.why.split(':')[0]).join(' | '))}
 writeFileSync(FILE,JSON.stringify(existing,null,1)+'\n')
}
run()
