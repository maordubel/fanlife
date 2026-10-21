import type {PublicQuestion} from '@/lib/game/questions/types'

/** Budget both reading and interaction. An ordering task never inherits an eleven-second single-tap clock.
 * Only public text/options are used. The server freezes these seconds in the signed run before a question opens. */
export function questionSeconds(q:Pick<PublicQuestion,'type'|'prompt'|'options'|'left'|'quoteHe'>,stage:number):number{
 const s=Math.max(0,Math.min(2,stage))
 const base=q.type==='tf'?[16,14,12]:q.type==='multi'?[32,30,28]:q.type==='match'||q.type==='order'?[38,35,32]:[24,21,18]
 const words=[q.prompt,q.quoteHe??'',...q.options,...q.left??[]].join(' ').trim().split(/\s+/).length
 return Math.min(45,base[s]!+Math.min(7,Math.max(0,Math.ceil((words-40)/8))))
}
