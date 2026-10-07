import {NextResponse} from 'next/server'
import {readState} from '@/lib/master/store'
import {publicDisplay} from '@/lib/master/lifeDisplay'
export const dynamic='force-dynamic'
/**
 * The published LIFE display settings, read by public/life/voxel/engine.js at boot. Serves the LIVE config only —
 * never the draft, the previous version or the audit. Nothing published yet = {} and the engine keeps its defaults.
 * A player's own choice (localStorage) still wins per key; the engine applies that order.
 */
export async function GET(){
 const s=await readState().catch(()=>null)
 return NextResponse.json(publicDisplay(s?.lifeDisplay),{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=300'}})
}
