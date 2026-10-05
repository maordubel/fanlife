import {NextResponse} from 'next/server'
import {allSkins} from '@/lib/clubs/life/skins'

/** The club skins the voxel rooms are dressed with. Packs are immutable within a deployment. */
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({skins: allSkins()})
}
