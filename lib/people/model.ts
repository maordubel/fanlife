/**
 * The People Registry (18.11.2026) — one football person across every club of the universe.
 *
 * A club pack knows a man only as a STINT: his record at that club (`club:entityId`). The same person can hold several
 * stints (Walid Badir at Hapoel Petah Tikva and Hapoel Tel Aviv; Loukas Vyntra at Panathinaikos and Hapoel Tel Aviv), and two
 * different people can share a written name (Nemanja Nikolić, Cristian Ledesma). This module joins stints into PEOPLE only
 * through a recorded verdict — a link — never through a name (rule 7):
 *
 *   · a `same` link joins two stints (union–find, so links chain across three clubs);
 *   · a `different` link keeps them apart and takes the pair off the review queue;
 *   · a pair of stints at two clubs that share a written name and have no verdict is QUEUED for review, never guessed.
 *
 * Every stint carries a minted id (`pl_` + 10 hex, `content/manual/people-ids.json`, append-only). A person's id is the
 * smallest minted id among his stints, so a merge only ever retires ids, and every id ever minted still resolves to its
 * person. Pure and client-safe: no I/O.
 */
export type Pos='GK'|'DF'|'MF'|'FW'
export type StintKey=string
export const PERSON_ID=/^pl_[0-9a-f]{10}$/
export const isPersonId=(v:string)=>PERSON_ID.test(v)
export const stintKey=(club:string,eid:string):StintKey=>`${club}:${eid}`
export function splitStintKey(k:StintKey):{club:string;eid:string}|null{const i=k.indexOf(':');return i>0?{club:k.slice(0,i),eid:k.slice(i+1)}:null}

/** one man's record at one club, as the generated file holds it */
export type Stint={
 key:StintKey;club:string;eid:string;id:string
 name:string;aliases:string[];pos:Pos[];from:number|null;to:number|null
 apps:number|null;goals:number|null
 /** the club's hidden game strength (40–99), the same number the Royal Rumble and Legends read — server-only */
 rating:number|null;reputation:number|null
 /** Legends stars (1–5 in quarters), read inside the club's own pool; null when the man is not dealt as a card */
 stars:number|null
 archiveOnly:boolean
}
export type Verdict='same'|'different'
export type Basis='wikidata'|'source'|'owner'
/** a recorded verdict on two stints; `evidence` is a Wikidata item, a source id or the reviewer */
export type Link={a:StintKey;b:StintKey;verdict:Verdict;basis:Basis;evidence:string;on:string}
export const linkKey=(a:StintKey,b:StintKey)=>[a,b].sort().join('|')

/** a pair the generator found: two clubs, one written name */
export type Candidate={a:StintKey;b:StintKey;name:string}
export type Person={id:string;name:string;aliases:string[];stints:Stint[];qid:string|null;
 /** the person's best Legends stars over all his clubs (null when no stint is dealt) */
 stars:number|null}
export type QueueItem={key:string;name:string;a:Stint;b:Stint}
export type Registry={
 people:Person[]
 /** person id for any minted id (a retired one included) */
 resolve:(id:string|null|undefined)=>Person|null
 /** the person a club record belongs to */
 personOf:(club:string,eid:string)=>Person|null
 queue:QueueItem[]
 counts:{stints:number;people:number;multiClub:number;linked:{same:number;different:number};queued:number}
}

/** fold for comparing written names: case and diacritics only, never fuzzy */
export const foldName=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/\s+/g,' ').trim()

/**
 * Cross-club pairs that share a written name (the full name or an alias of two words or more) — the review candidates.
 * A one-word alias ("Nano", "Rivaldo") counts only when it is the man's whole recorded name on both sides.
 */
export function candidates(stints:readonly Stint[]):Candidate[]{
 const by=new Map<string,Stint[]>()
 for(const s of stints)for(const n of new Set([s.name,...s.aliases])){
  const k=foldName(n);if(!k)continue
  if(!k.includes(' ')&&foldName(s.name)!==k)continue
  const list=by.get(k)??[];if(!list.includes(s))list.push(s);by.set(k,list)
 }
 const out=new Map<string,Candidate>()
 for(const [k,list] of by){
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
   const a=list[i]!,b=list[j]!;if(a.club===b.club)continue
   const key=linkKey(a.key,b.key);if(!out.has(key))out.set(key,{a:a.key,b:b.key,name:a.name===b.name?a.name:k})
  }
 }
 return [...out.values()].sort((x,y)=>linkKey(x.a,x.b).localeCompare(linkKey(y.a,y.b)))
}

/** later verdicts win (the desk's overlay is passed after the repository's links) */
export function verdicts(links:readonly Link[]):Map<string,Link>{const m=new Map<string,Link>();for(const l of links)m.set(linkKey(l.a,l.b),l);return m}

export function buildRegistry(stints:readonly Stint[],links:readonly Link[],cands:readonly Candidate[]=candidates(stints)):Registry{
 const byKey=new Map(stints.map(s=>[s.key,s]))
 const parent=new Map<StintKey,StintKey>(stints.map(s=>[s.key,s.key]))
 const find=(k:StintKey):StintKey=>{let r=k;while(parent.get(r)!==r)r=parent.get(r)!;let c=k;while(parent.get(c)!==r){const n=parent.get(c)!;parent.set(c,r);c=n}return r}
 const v=verdicts(links)
 let same=0,different=0
 for(const l of v.values()){
  if(!byKey.has(l.a)||!byKey.has(l.b))continue
  if(l.verdict==='same'){same++;const ra=find(l.a),rb=find(l.b);if(ra!==rb)parent.set(ra<rb?rb:ra,ra<rb?ra:rb)}else different++
 }
 const groups=new Map<StintKey,Stint[]>()
 for(const s of stints){const r=find(s.key);groups.set(r,[...(groups.get(r)??[]),s])}
 const qidOf=new Map<StintKey,string>()
 for(const l of v.values())if(l.verdict==='same'&&l.basis==='wikidata'&&/^Q\d+$/.test(l.evidence)){qidOf.set(l.a,l.evidence);qidOf.set(l.b,l.evidence)}
 const people:Person[]=[],byId=new Map<string,Person>(),byStint=new Map<StintKey,Person>()
 for(const list of groups.values()){
  const ordered=[...list].sort((a,b)=>(a.from??9999)-(b.from??9999)||a.club.localeCompare(b.club))
  const id=[...list].map(s=>s.id).sort()[0]!
  const names=ordered.map(s=>s.name)
  // the most-written name is the person's name; ties go to his earliest club's spelling
  const count=new Map<string,number>();for(const n of names)count.set(n,(count.get(n)??0)+1)
  const name=[...count.entries()].sort((a,b)=>b[1]-a[1]||names.indexOf(a[0])-names.indexOf(b[0]))[0]![0]
  const aliases=[...new Set(ordered.flatMap(s=>[s.name,...s.aliases]))].filter(n=>n!==name)
  const stars=ordered.reduce<number|null>((m,s)=>s.stars===null?m:Math.max(m??0,s.stars),null)
  const qid=ordered.map(s=>qidOf.get(s.key)).find(Boolean)??null
  const p:Person={id,name,aliases,stints:ordered,qid,stars}
  people.push(p);for(const s of list){byId.set(s.id,p);byStint.set(s.key,p)}
 }
 people.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id))
 const queue:QueueItem[]=[]
 for(const c of cands){
  const key=linkKey(c.a,c.b);if(v.has(key))continue
  const a=byKey.get(c.a),b=byKey.get(c.b);if(!a||!b)continue
  if(find(c.a)===find(c.b))continue
  queue.push({key,name:c.name,a,b})
 }
 return {
  people,queue,
  resolve:id=>id?byId.get(id)??null:null,
  personOf:(club,eid)=>byStint.get(stintKey(club,eid))??null,
  counts:{stints:stints.length,people:people.length,multiClub:people.filter(p=>new Set(p.stints.map(s=>s.club)).size>1).length,linked:{same,different},queued:queue.length},
 }
}

/** what a reader may see of a stint: no hidden rating (rule 4) */
export type PublicStint=Omit<Stint,'rating'|'reputation'>
export const publicStint=({rating:_r,reputation:_p,...rest}:Stint):PublicStint=>rest
