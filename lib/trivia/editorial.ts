/** Club trivia's editorial policy. A date is useful context; memorising an arbitrary date is a specialist mode. */
import type {MasterQuestion} from '@/lib/game/questions/types'
import {isDateCheck,normKey} from '@/lib/clubs/trivia-bank'

export const TRIVIA_RULES=2
export const EDITORIAL_TAG='editorial:2026-10-21'
export const standardQuestion=(q:MasterQuestion)=>!q.deep&&!isDateCheck(q)&&!['fl-player-era','fl-shirt-number'].includes(q.template)&&!(q.template==='fl-match-opponent'&&q.facets?.includes('derby'))
export const interaction=(q:MasterQuestion)=>['match','order','multi'].includes(q.type)
export function questionFamily(q:MasterQuestion):string{
 if(/^fl-match-(opponent|score|season|tf)$/.test(q.template))return 'scoreboard'
 if(q.template.startsWith('fl-kit-'))return 'shirts'
 if(q.template.startsWith('fl-honour-'))return 'honours'
 return q.template
}
export const editorialKey=(q:MasterQuestion)=>`${q.type}|${normKey(q.prompt)}|${normKey(q.quoteHe??'')}`
