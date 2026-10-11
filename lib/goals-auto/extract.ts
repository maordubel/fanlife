import {createHash} from 'node:crypto'
import {POSITION_PRECISION} from '@/lib/game/replay/truth'
import type {ReplayAction} from '@/lib/game/replay/vocab'
import type {ZoneId} from '@/lib/game/goal-zones'
import goalsFile from '@/content/manual/goals.json'
import type {Candidate,Evidence,GroundedStep} from './types'
import {EXTRACTOR_VERSION,PIPELINE_VERSION} from './types'

/**
 * Deterministic text extraction — no model, no translation. A paragraph that says WHO scored and WHEN is a
 * `candidate`; only a sentence that names an actor, a recognised verb and a position phrase the position table already
 * knows becomes a step. Everything else stays unread rather than guessed (rule 11).
 */
export type Lang='he'|'en'|'el'|'other'
export const sha=(s:string)=>createHash('sha256').update(s).digest('hex')

export function detectLanguage(text:string):Lang{
 const c={he:(text.match(/[֐-׿]/g)||[]).length,el:(text.match(/[Ͱ-Ͽ]/g)||[]).length,en:(text.match(/[A-Za-z]/g)||[]).length}
 const best=(Object.entries(c) as [Lang,number][]).sort((a,b)=>b[1]-a[1])[0]!
 return best[1]<8?'other':best[0]
}

/** Minute: `89`, `90+3`, `90'+3'`, "דקה 89", "בדקה ה-89", "στο 89'", "89th minute". Never returns a bare number from prose. */
const MINUTE=[
 /(?:בדקה|דקה)\s*(?:ה-?)?\s*(\d{1,3})(?:\s*\+\s*(\d{1,2}))?/,
 /(?:στο|στο\s+λεπτό|λεπτό)\s*(\d{1,3})(?:\s*\+\s*(\d{1,2}))?\s*['′]?/,
 /(\d{1,3})(?:\s*\+\s*(\d{1,2}))?\s*(?:'|′|th minute|st minute|nd minute|rd minute|\s*min\b)/i,
]
export function minuteOf(text:string):string|null{
 for(const re of MINUTE){const m=re.exec(text);if(m){const base=Number(m[1]);if(base<1||base>130)continue;return m[2]?`${base}+${Number(m[2])}`:String(base)}}
 return null
}

const SCORE_VERB=[/(?:^|\s)(?:כבש|הבקיע|שלח|סגר|קלע|נגח|בעט)(?=\s|$)/,/(?:^|\s)(?:σκόραρε|πέτυχε)(?=\s|$)/]
const SCORER_EN=/([A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+){0,2})\s+(?:scored|netted|headed|struck|converted|tapped)/u
/** The name is the (up to) two tokens right before the first scoring verb — never a stretch of prose. */
export function scorerOf(text:string):string|null{
 const en=SCORER_EN.exec(text);if(en)return en[1]!.trim()
 for(const re of SCORE_VERB){
  const m=re.exec(text);if(!m)continue
  const head=text.slice(0,m.index).replace(/[,;:"“”()]/g,' ').split(/\s+/).filter(t=>/^[\u0590-\u05FF\u0370-\u03FF'׳"-]+$/.test(t))
  const name=head.slice(-2).join(' ').trim();if(name&&!PRONOUN_SET.has(name))return name
 }
 return null
}
export const isOwnGoal=(t:string)=>/אוטו[- ]?גול|own goal|αυτογκόλ/i.test(t)

/**
 * Verb lexicon → the seven replay actions. Whole-word match; a verb not here is simply not a step.
 * (A "save" is a keeper's touch and the finish of a move is never one — truth.ts rejects that, which is the point.)
 */
const VERBS:ReadonlyArray<readonly [RegExp,ReplayAction]>=[
 [/\b(?:passed|played it|laid it off)\b|(?:^|\s)(?:מסר|מסרה|העביר)(?=\s)/i,'pass'],
 [/\bthrough ball\b|\bslipped (?:it )?through\b|(?:^|\s)(?:הוציא כדור עומק|כדור עומק)(?=\s|$)/i,'throughBall'],
 [/\bcrossed\b|(?:^|\s)(?:הרים|הרים כדור|העיף כדור)(?=\s)/i,'cross'],
 [/\bdribbled\b|\bburst\b|(?:^|\s)(?:כדרר|פרץ|חדר)(?=\s)/i,'dribble'],
 [/\bheaded\b|(?:^|\s)(?:נגח)(?=\s)/i,'header'],
 [/\bshot\b|\bstruck\b|\bfired\b|(?:^|\s)(?:בעט|שלח כדור)(?=\s)/i,'shot'],
 [/\bsaved\b|(?:^|\s)(?:הדף)(?=\s)/i,'save'],
]
export function actionOf(sentence:string):ReplayAction|null{for(const [re,a] of VERBS)if(re.test(sentence))return a;return null}

/**
 * phrase → zone, LEARNED from the bundled archive: only phrases that every bundled record puts in the same zone, and
 * that the truth table already knows. A phrase with two zones, or one naming a person ("מול נויר"), is not usable.
 */
export const PHRASE_ZONE:ReadonlyMap<string,ZoneId>=(()=>{
 const seen=new Map<string,Set<string>>()
 for(const r of (goalsFile as unknown as {records:{sequence:{positionHe:string;zone:string}[]}[]}).records)
  for(const s of r.sequence){if(!seen.has(s.positionHe))seen.set(s.positionHe,new Set());seen.get(s.positionHe)!.add(s.zone)}
 const out=new Map<string,ZoneId>()
 for(const [p,z] of seen)if(z.size===1&&p in POSITION_PRECISION&&!/^מול /.test(p))out.set(p,[...z][0] as ZoneId)
 return out
})()
export function positionIn(sentence:string):{phrase:string;zone:ZoneId}|null{
 let best:{phrase:string;zone:ZoneId}|null=null
 for(const [phrase,zone] of PHRASE_ZONE)if(sentence.includes(phrase)&&(!best||phrase.length>best.phrase.length))best={phrase,zone}
 return best
}

export function splitParagraphs(text:string):string[]{return text.split(/\n{2,}|\r\n\r\n/).map(s=>s.trim()).filter(Boolean)}
export function splitSentences(p:string):string[]{return p.split(/(?<=[.!?׃])\s+/).map(s=>s.trim()).filter(Boolean)}

/** An actor is the words before the verb in the same sentence — one to three tokens, never a pronoun. */
const PRONOUNS=new Set(['הוא','היא','הם','he','she','they','it','αυτός']),PRONOUN_SET=PRONOUNS
function actorBefore(sentence:string,verb:RegExp):string|null{
 const m=verb.exec(sentence);if(!m)return null
 const head=sentence.slice(0,m.index).replace(/[,;:"“”()]/g,' ').trim().split(/\s+/).filter(Boolean)
 if(head.length===0)return null
 const tail=head.slice(-2).join(' ');return PRONOUNS.has(tail.toLowerCase())||PRONOUNS.has(head[head.length-1]!.toLowerCase())?null:tail
}

export type ExtractInput={clubId:string;sourceId:string;url:string;body:string;fetchedAt:string;playedOn?:string|null;opponentHe?:string|null}

/** One candidate per paragraph that names a minute and a scorer. Same input → same ids (idempotent across passes). */
export function extractCandidates(input:ExtractInput):Candidate[]{
 const bodyHash=sha(input.body),out:Candidate[]=[]
 splitParagraphs(input.body).forEach((para,index)=>{
  const minute=minuteOf(para);if(!minute)return
  const scorer=scorerOf(para),language=detectLanguage(para)
  const evidence:Evidence={sourceId:input.sourceId,url:input.url,locator:`p${index+1}`,quote:para.slice(0,600),bodyHash,fetchedAt:input.fetchedAt,language}
  const steps:GroundedStep[]=[]
  for(const sentence of splitSentences(para)){
   const action=actionOf(sentence);if(!action)continue
   const verb=VERBS.find(([,a])=>a===action)![0]
   const actor=actorBefore(sentence,verb),pos=positionIn(sentence);if(!actor||!pos)continue
   steps.push({step:steps.length+1,actorHe:actor,action,zone:pos.zone,positionHe:pos.phrase,noteHe:sentence.slice(0,160),evidence:{...evidence,locator:`p${index+1}/s${steps.length+1}`,quote:sentence.slice(0,300)}})
  }
  // identity survives enrichment and re-fetch: club + date + minute + scorer, never the body hash
  const id=`ga-${sha([input.clubId,input.playedOn??'',minute,(scorer??'').toLowerCase()].join('|')).slice(0,16)}`
  out.push({id,clubId:input.clubId,sourceIds:[input.sourceId],playedOn:input.playedOn??null,opponentHe:input.opponentHe??null,minute,scorerAlias:scorer,ownGoal:isOwnGoal(para),evidence:[evidence],steps,status:steps.length>=2?'sequence_candidate':'candidate',issues:[],extractorVersion:EXTRACTOR_VERSION,pipelineVersion:PIPELINE_VERSION,createdAt:input.fetchedAt,updatedAt:input.fetchedAt})
 })
 return out
}

/** Merge evidence from a second source into one candidate; never overwrites a stronger fact. */
export function mergeCandidates(a:Candidate,b:Candidate):Candidate{
 if(a.id!==b.id)throw new Error('mergeCandidates: different goals')
 const keys=new Set(a.evidence.map(e=>`${e.url}|${e.locator}|${e.bodyHash}`)),add=b.evidence.filter(e=>!keys.has(`${e.url}|${e.locator}|${e.bodyHash}`))
 return {...a,sourceIds:[...new Set([...a.sourceIds,...b.sourceIds])],evidence:[...a.evidence,...add],steps:a.steps.length>=b.steps.length?a.steps:b.steps,scorerAlias:a.scorerAlias??b.scorerAlias,updatedAt:b.updatedAt>a.updatedAt?b.updatedAt:a.updatedAt}
}
