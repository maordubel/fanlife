import {REGISTRY, type RegistryClub} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {buildSkin, type VoxelSkin} from '@/lib/life/universal/skin'
import {LIFE_CAST, LIFE_SKINS} from './packs'

/** One club's skin. A club with no LIFE file still gets one — from its registry row and theme alone. */
export function clubSkin(club: RegistryClub): {skin: VoxelSkin; issues: string[]} {
  return buildSkin(club, clubTheme(club), Object.hasOwn(LIFE_SKINS, club.id) ? LIFE_SKINS[club.id]! : null)
}

/** Every club the portal knows, keyed by registry id — what the voxel lab and the game fetch. */
export function allSkins(): Record<string, VoxelSkin> {
  return Object.fromEntries(REGISTRY.map(club => {
    const skin = clubSkin(club).skin
    const names = Object.hasOwn(LIFE_CAST, club.id) ? (LIFE_CAST[club.id]!.names ?? {}) as Record<string, string> : {}
    const kiosk = typeof names.kiosk === 'string' && names.kiosk.trim() ? names.kiosk.trim().slice(0, 16) : null
    return [club.id, kiosk ? {...skin, cast: {kiosk}} : skin]
  }))
}
