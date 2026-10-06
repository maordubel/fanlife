import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {signatureFor,type Pattern,type Layout} from '@/lib/club-signature'

/**
 * A club's colours are fixed. The hue comes from its identity manifest (`clubTheme().primary`);
 * the way it is worn — solid, striped, sashed — is the club's own shirt, written once here.
 * Every club is dressed by the same rule, so none is the default.
 */
export type LiveryPattern = Pattern

export function livery(clubId: string): {primary: string; pattern: LiveryPattern; layout: Layout; initials: string; name: string} | null {
  const club = REGISTRY.find(c => c.id === clubId)
  if (!club) return null
  return {primary: clubTheme(club).primary, ...signatureFor(clubId), initials: club.initials, name: club.name}
}
