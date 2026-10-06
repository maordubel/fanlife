import 'server-only'
type Raw=Record<string,unknown>
const arr=(v:unknown):Raw[]=>Array.isArray(v)?v as Raw[]:[]
/**
 * Wave files (`club-packs/<id>/wave-*.json`) are research deliveries: sources + matches/kits/rivals in the
 * same envelope as core.json. They are MERGED, never trusted — compilePack still applies every rule (checked
 * sources, two publishers for automated approval, complete approval metadata).
 * Colliding ids keep the core record; a wave can add, never silently overwrite.
 */
export function mergeWave<T extends Raw>(pack:T,wave:Raw|null|undefined):T {
 if(!wave)return pack
 const out:Raw={...pack}
 const have=new Set(arr(pack.sources).map(s=>s.id))
 out.sources=[...arr(pack.sources),...arr(wave.sources).filter(s=>!have.has(s.id))]
 for(const k of ['matches','kits','rivals'] as const){
  const ids=new Set(arr(pack[k]).map(f=>f.id))
  out[k]=[...arr(pack[k]),...arr(wave[k]).filter(f=>!ids.has(f.id))]
 }
 return out as T
}
