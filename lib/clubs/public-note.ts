/**
 * What a reader may see of a record's research note. The note is written for the archive's own bookkeeping: how a
 * fact was checked, which publishers agreed — and who approved it. Approvals, private exchanges and pipeline names are
 * never shown to a reader (17.11.2026). A sentence that names one is dropped whole; an empty note is no note.
 */
const PRIVATE=/\b(owner|maor|harel|in chat|chat\b|approv\w*|standing decision|blanket|automated|cross-source-review|package|held as|awaiting|proposed|reviewer|collected in)\b|מאשר|מאושר|תאשר|אישור/i
export function publicNote(raw:string|null|undefined):string|null{
 if(!raw)return null
 const text=raw.replace(/\([^()]*\)/g,m=>PRIVATE.test(m)?'':m)
 const kept=text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'“(])/).map(s=>s.trim()).filter(s=>s&&!PRIVATE.test(s))
 const out=kept.join(' ').replace(/\s{2,}/g,' ').replace(/\s+([.,;:])/g,'$1').trim()
 return out.length>=3?out:null
}
