import {REGISTRY} from '@/lib/master/registry'
import {clubTheme,typeOnPaper} from '@/lib/clubs/theme'
import {signatureFor,type Pattern,type Layout} from '@/lib/club-signature'

/**
 * A club's colours are fixed. The hue comes from its identity manifest (`clubTheme().primary`);
 * the way it is worn — solid, striped, sashed — is the club's own shirt, written once here.
 * Every club is dressed by the same rule, so none is the default.
 */
export type LiveryPattern = Pattern

export function livery(clubId: string): {primary: string; on: string; type: string; pattern: LiveryPattern; layout: Layout; initials: string; name: string} | null {
  const club = REGISTRY.find(c => c.id === clubId)
  if (!club) return null
  const theme = clubTheme(club)
  return {primary: theme.primary, on: theme.onPrimary, type: typeOnPaper(theme.primary), ...signatureFor(clubId), initials: club.initials, name: club.name}
}

/** The two custom properties a club's colour travels as: the colour and the ink that reads on it
 * (dark on AEK's or Dortmund's yellow, white on Hapoel's red). */
export function wearLivery(l: {primary: string; on: string; type?: string} | null | undefined): Record<string, string> | undefined {
  return l ? {['--club-primary']: l.primary, ['--club-on-primary']: l.on, ['--club-type']: l.type ?? typeOnPaper(l.primary), ...(l.on.toUpperCase() === '#FFFFFF' ? {} : {['--dye-shade']: '0.45'})} : undefined
}
