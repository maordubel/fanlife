import {enClub} from '@/lib/trivia/names'
import {canonClub,canonText} from '@/lib/trivia/club-names'

/**
 * A timeline line in English. Hapoel Tel Aviv's archive (The Worker's) and much of AEK's write their match lines in the
 * script they were recorded in — "הפועל תל אביב 1 — מכבי חיפה 0", "ΑΕΚ 1-1 ΠΑΟΚ". On an English page that line is
 * printed through the same reviewed club dictionary the Question Forge reads: "Hapoel Tel Aviv 1-0 Maccabi Haifa". Only a
 * line whose every club resolves is re-printed; anything else (a sentence, an unknown side) comes back as written, never
 * half-translated and never guessed. The stored record is untouched — LIFE and the rivalry wall still read the original.
 */
const NONLATIN=/[Ͱ-Ͽἀ-῿Ѐ-ӿ֐-׿]/
// "A 1 — B 0" (The Worker's form) · "A 1-0 B" / "A 1–0 B" (score between the sides)
const SPLIT=/^\s*(.+?)\s+(\d{1,2})\s*[—–-]\s*(.+?)\s+(\d{1,2})\s*$/
const MID=/^\s*(.+?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(.+?)\s*$/
// The Worker abbreviates Jerusalem ("י-ם"); the dictionary holds the full name
const side=(s:string)=>{const t=s.replace(/[״"]/g,'"').trim(),en=enClub(t)??enClub(t.replace(/י-ם/g,'ירושלים'));return en&&!NONLATIN.test(en)?canonClub(en):null}

export function englishTitle(title:string):string{
 if(!NONLATIN.test(title))return canonText(title)
 let m=SPLIT.exec(title)
 if(m){const a=side(m[1]!),b=side(m[3]!);if(a&&b)return `${a} ${m[2]}-${m[4]} ${b}`}
 m=MID.exec(title)
 if(m){const a=side(m[1]!),b=side(m[4]!);if(a&&b)return `${a} ${m[2]}-${m[3]} ${b}`}
 return title
}
export const isEnglishLine=(s:string)=>!NONLATIN.test(s)

/** the timeline with every line it can re-print in English re-printed; ids, days and order unchanged */
export const englishTimeline=<T extends {value:{title:string}}>(rows:readonly T[]):T[]=>rows.map(f=>{const t=englishTitle(f.value.title);return t===f.value.title?f:{...f,value:{...f.value,title:t}}})
