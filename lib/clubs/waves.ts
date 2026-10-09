import 'server-only'
type Raw=Record<string,unknown>
const arr=(v:unknown):Raw[]=>Array.isArray(v)?v as Raw[]:[]
/**
 * Wave files (`club-packs/<id>/wave-*.json`) are research deliveries: sources + canonical fact sections in the
 * same envelope as core.json. They are MERGED, never trusted — compilePack still applies every rule (checked
 * sources, two publishers for automated approval, complete approval metadata).
 * Colliding ids keep the core record; a wave can add, never silently overwrite.
 */
export function mergeWave<T extends Raw>(pack:T,wave:Raw|null|undefined):T {
 if(!wave)return pack
 const out:Raw={...pack}
 const have=new Set(arr(pack.sources).map(s=>s.id))
 out.sources=[...arr(pack.sources),...arr(wave.sources).filter(s=>!have.has(s.id))]
 for(const k of ['matches','kits','rivals','archive','goals','mysteries','competitions','seasons','trophies','stadiums','places','culture'] as const){
  if(!Array.isArray(wave[k])||!arr(wave[k]).length)continue
  const ids=new Set(arr(pack[k]).map(f=>f.id))
  out[k]=[...arr(pack[k]),...arr(wave[k]).filter(f=>!ids.has(f.id))]
 }
 // players: new ids are added; an existing id is replaced ONLY when the pack's record documents no position and the
 // wave's approved record does — a narrow fill that can never overwrite a documented position or a manual approval
 if(arr(wave.players).length){
  const incoming=new Map(arr(wave.players).map(f=>[f.id,f]))
  const has=(f:Raw)=>arr((f.value as Raw|undefined)?.positions).length>0
  const kept=arr(pack.players).map(f=>{const w=incoming.get(f.id);if(!w)return f;incoming.delete(f.id);return !has(f)&&has(w)&&w.status==='approved'&&f.approvedBy!=='legacy-curation'&&!String(f.approvedBy||'').startsWith('owner')?{...w,value:{...(f.value as Raw),...(w.value as Raw)}}:f})
  out.players=[...kept,...incoming.values()]
 }
 return out as T
}
