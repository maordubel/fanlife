import 'server-only'
import type {ClubData,ClubMystery,Fact,MysteryClue} from './contract'
import {localizedDate} from './locale'
import {canonClub,competitionOn} from '@/lib/trivia/club-names'
import {enClub,enCompetition,isLatin} from '@/lib/trivia/names'
import overlay from '@/content/manual/mystery-english-overlay.json'

/** reviewed English renderings of written clues, keyed by clue id; the original travels beside it and must still match */
const OVERLAY=overlay.clues as Record<string,{label:string;value:string;he:string;scope?:{competition?:string}}>

/**
 * Gate 10 in English. A Blind Cow puzzle written in the club's own language (The Worker's 547 for Hapoel Tel Aviv, a few
 * of Hapoel Petah Tikva's) carries TYPED clues — `position:בלם`, `goal-in:גביע-המדינה`, `lineup:m_…:start` — so the clue
 * can be re-printed in English from the fact it states, through the same reviewed dictionaries the Question Forge reads.
 * The predicate does not change, so the counted ladder stays true. A clue whose fact has no reviewed English form (a
 * terrace song with a Hebrew title, a club the dictionary does not hold) is not guessed: that whole puzzle stays out of
 * the English bank, rather than shipping eight English clues and one Hebrew one.
 */
const POSITION:Record<string,string>={'שוער':'A goalkeeper.','בלם':'A centre-back.','בלם אחורי':'A sweeper.','מגן':'A full-back.','מגן ימני':'A right-back.','מגן שמאלי':'A left-back.',
 'קשר':'A midfielder.','קשר אחורי':'A defensive midfielder.','קשר הגנתי':'A defensive midfielder.','קשר התקפי':'An attacking midfielder.','קשר קדמי':'An attacking midfielder.',
 'קשר כנף':'A wide midfielder.','קשר שמאלי':'A left midfielder.','קיצוני ימני':'A right winger.','קיצוני שמאלי':'A left winger.','ווינגר':'A winger.','חלוץ':'A forward.'}
const CODE:Record<string,string>={GK:'A goalkeeper.',DF:'A defender.',MF:'A midfielder.',FW:'A forward.'}
const COUNTRY:Record<string,string>={'צרפת':'France','ברזיל':'Brazil','גאנה':'Ghana','בולגריה':'Bulgaria','קונגו':'Congo','פורטוגל':'Portugal'}
const NUM=['no','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']
const words=(n:number)=>NUM[n]??String(n)
const comp=(slug:string)=>slug==='euro'?'a European competition':slug==='league'?'the league':enCompetition(slug.replace(/-/g,' '))

export function englishMysteries(data:ClubData):ClubData{
 const matches=new Map((data.matches??[]).map(f=>[f.id.replace(/^.*:match-/,''),f.value as Record<string,unknown>]))
 const country=data.identity.country
 const night=(mid:string)=>{
  const v=matches.get(mid);if(!v||typeof v.on!=='string')return null
  const raw=v.us==='home'?v.away:v.us==='away'?v.home:null,opp=typeof raw==='string'?enClub(raw):null
  const c0=typeof v.competition==='string'?enCompetition(v.competition):null
  if(!opp||!c0)return null
  return {opp:canonClub(opp),comp:competitionOn(c0,v.on,country),on:localizedDate(v.on,'en'),season:typeof v.season==='string'?v.season:null,score:typeof v.homeGoals==='number'&&typeof v.awayGoals==='number'?(v.us==='home'?`${v.homeGoals}-${v.awayGoals}`:`${v.awayGoals}-${v.homeGoals}`):null}
 }
 function english(c:MysteryClue):{label:string;value:string;scope?:MysteryClue['scope']}|null{
  if(isLatin(c.label)&&isLatin(c.value))return {label:c.label,value:c.value}
  const o=OVERLAY[c.id];if(o&&o.he===c.value)return {label:o.label,value:o.value,...(o.scope?{scope:{...c.scope,...o.scope}}:{})}
  const k=c.factKey??'',[kind,...rest]=k.split(':'),arg=rest.join(':')
  switch(kind){
   case 'position':{const v=POSITION[arg];return v?{label:'Position',value:v}:null}
   case 'position-code':{const v=CODE[arg];return v?{label:'Position',value:v}:null}
   case 'origin':return arg==='israeli'?{label:'Origin',value:'Israeli.'}:arg==='foreign'?{label:'Origin',value:'A foreign player.'}:null
   case 'nationality':{const v=COUNTRY[arg];return v?{label:'Nationality',value:`${v}.`}:null}
   case 'era':return /^\d{4}$/.test(arg)?{label:'Era',value:`Joined the club in the ${arg}s.`}:null
   case 'decades':return /^\d+$/.test(arg)?{label:'Decades',value:`Played for the club in ${words(Number(arg))} different decades.`}:null
   case 'seasons':return /^\d+$/.test(arg)?{label:'Service',value:Number(arg)===1?'One season in the squad.':`${words(Number(arg))[0]!.toUpperCase()}${words(Number(arg)).slice(1)} seasons in the squad.`}:null
   case 'debut':return /^\d{4}\/\d{2}$/.test(arg)?{label:'Debut',value:`First season at the club: ${arg}.`}:null
   case 'last':return /^\d{4}\/\d{2}$/.test(arg)?{label:'Last season',value:`Last season at the club: ${arg}.`}:null
   case 'spells':return /^\d+$/.test(arg)?{label:'Spells',value:`${words(Number(arg))[0]!.toUpperCase()}${words(Number(arg)).slice(1)} separate spells at the club.`}:null
   case 'captain':return /^\d{4}\/\d{2}$/.test(arg)?{label:'Armband',value:`Captain in ${arg}.`}:null
   case 'goal-vs':{const v=enClub(arg.replace(/-/g,' '));return v?{label:'Goal',value:`Scored against ${canonClub(v)}.`}:null}
   case 'current':return /^\d{4}\/\d{2}$/.test(arg)?{label:'Today',value:`In the squad in ${arg}.`}:null
   case 'shirt':{const m=/^(\d{1,2})@(\d{4}\/\d{2})$/.exec(arg);return m?{label:'Shirt number',value:`Wore number ${m[1]} in ${m[2]}.`}:null}
   case 'club':{const v=enClub(arg);return v?{label:'Another club',value:`Also played for ${canonClub(v)}.`}:null}
   case 'goal-in':{const v=comp(arg);return v?{label:'Goal',value:`Scored in ${v.startsWith('a ')||v.startsWith('the ')?v:`the ${v}`}.`}:null}
   case 'title-any':{const v=comp(arg);return v?{label:'Honour',value:arg==='league'?'In a squad that won the league title.':`In a squad that won the ${v}.`}:null}
   case 'title-count':return /^\d+$/.test(arg)?{label:'Honours',value:`In the squad for ${words(Number(arg))} trophy wins.`}:null
   case 'title':{const m=/^(.+)@(\d{4}\/\d{2})$/.exec(arg),v=m?comp(m[1]!):null;return v?{label:'Honour',value:`In the squad that won the ${v} in ${m![2]}.`}:null}
   case 'goal-match':{const n=night(arg);return n?{label:'Goal',value:`Scored against ${n.opp} — ${n.comp}, ${n.on}${n.score?` (finished ${n.score})`:''}.`}:null}
   case 'lineup':{const n=night(arg.split(':')[0]!);return n?{label:'Team sheet',value:`Started against ${n.opp} — ${n.comp}, ${n.on}.`}:null}
   case 'goal-minute':{const [mid,min]=arg.split(':'),n=night(mid!);return n&&/^\d+$/.test(min??'')?{label:'Minute',value:`Scored in minute ${min} against ${n.opp}, ${n.on}.`}:null}
   case 'song':return isLatin(arg)?{label:'Terrace song',value:`The terrace sings his name to the tune of “${arg}”.`}:null
   default:return null
  }
 }
 let changed=false
 const out:Fact<ClubMystery>[]=[]
 for(const f of data.mysteries??[]){
  if(f.value.clues.every(c=>isLatin(c.label)&&isLatin(c.value))){out.push(f);continue}
  const clues=f.value.clues.map(c=>{const e=english(c);return e?{...c,...e}:null})
  changed=true
  if(clues.every((c):c is MysteryClue=>!!c))out.push({...f,value:{...f.value,clues}})
 }
 return changed?{...data,mysteries:out}:data
}
