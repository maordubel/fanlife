import 'server-only'
import type {ClubData} from '@/lib/clubs/contract'
import {gateReadiness} from '@/lib/clubs/gate-data'
import {GATE_THRESHOLDS as T} from '@/lib/clubs/thresholds'
import {curateQuestions} from './curation'
import {forgeTrivia,SOMBRE,type ForgeReport} from './forge'
import {hapoelExtras} from './hapoel-extras'
import {isLatin} from './names'

/**
 * A club's FAN LIFE trivia = the Question Forge over its own records, plus the date checks the compiler already made
 * where they are English. Hapoel Tel Aviv's Hebrew Worker bank stays The Worker's (`/trivia`); in FAN LIFE the club plays
 * the forge's English bank built from the same archive, so no Hebrew ever reaches an English page (rule 107 §4, superseded
 * for trivia by the owner's "English, always", 12.10.2026).
 */
const reports=new Map<string,ForgeReport>()
const SCOREBOARD_ENOUGH=60
export const forgeReport=(club:string)=>reports.get(club)??null
export function withForgedTrivia(data:ClubData):ClubData{
 const hapoel=data.identity.id==='hapoel-tel-aviv'
 const {trivia,report}=forgeTrivia(data,hapoel?hapoelExtras():{})
 reports.set(data.identity.id,report)
 // A date check on a match line ("Maccabi Haifa 3-2 Hapoel Petah Tikva — 13 May 1978") repeats, as a bare date, what the
 // forge asks four better ways about the club's nights. Where the forge already reads the club's matches (a scoreboard of
 // its own), those bare-date lines step aside; a club whose matches the forge cannot read keeps them.
 const scoreboard=trivia.questions.filter(q=>q.template==='fl-match-opponent').length>=SCOREBOARD_ENOUGH
 const kept=hapoel?[]:data.trivia.questions.filter(q=>isLatin(q.prompt)&&isLatin(q.explanation)&&!SOMBRE.test(q.prompt)&&!(q.template==='event-date-check'&&/\d\s*[-–:]\s*\d/.test(q.prompt.split(' — ')[0]!)&&scoreboard))
 const questions=curateQuestions(data.identity.id,[...kept.map(q=>({...q,facets:[`club:${data.identity.id}`,`template:${q.template}`,'level:1']})),...trivia.questions])
 const pools={...(hapoel?{}:data.trivia.pools),...trivia.pools}
 return {...data,trivia:{questions,pools},gates:{...data.gates,trivia:gateReadiness(questions.length,T.trivia.target,T.trivia.minimum,T.trivia.unit)}}
}
