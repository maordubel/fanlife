import {crestSlug} from '@/ecosystem/crests/index.mjs'

/**
 * The universe's crest library (ecosystem/crests, OFFSIDES public/logos) served from FAN LIFE itself.
 * FAN LIFE bundles a copy of the files by slug in public/universe-crests, as DUBID does (contract rule 14 names one
 * library, not one host), so a crest on the hub never depends on another app being up. Refresh the copy from
 * OFFSIDES public/logos whenever ecosystem/crests is regenerated. A name the library cannot match stays null.
 */
export function universeCrest(name:string|null|undefined):string|null{
 const slug=crestSlug(name)
 return slug?`/universe-crests/${slug}.png`:null
}
