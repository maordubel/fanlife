// The closed list of clubs the portal knows. Adding a club = adding one row here
// (plus its pack). Nothing else in the portal hardcodes a club count.
export type Wave = 0 | 1 | 2 | 3 | 4 | 5
export type RegistryClub = { id: string; sub: string; name: string; city: string; country: string; initials: string; primary: string; wave: Wave; pack?: string }
const c = (id: string, sub: string, name: string, city: string, country: string, initials: string, primary: string, wave: Wave, pack?: string): RegistryClub => ({ id, sub, name, city, country, initials, primary, wave, pack })
export const REGISTRY: readonly RegistryClub[] = [
  c('hapoel-tel-aviv', 'hapoeltelaviv', 'Hapoel Tel Aviv', 'Tel Aviv', 'Israel', 'HT', '#B02D10', 0),
  c('hapoel-petah-tikva', 'hapoelpetahtikva', 'Hapoel Petah Tikva', 'Petah Tikva', 'Israel', 'HP', '#1F4E9C', 1),
  c('maccabi-haifa', 'maccabihaifa', 'Maccabi Haifa', 'Haifa', 'Israel', 'MH', '#0B7A3B', 1),
  c('zrinjski-mostar', 'zrinjski', 'Zrinjski Mostar', 'Mostar', 'Bosnia and Herzegovina', 'ZM', '#C92D39', 2, 'zrinjski-mostar'),
  c('olympiacos', 'olympiacos', 'Olympiacos', 'Piraeus', 'Greece', 'OL', '#D71920', 3),
  c('panathinaikos', 'panathinaikos', 'Panathinaikos', 'Athens', 'Greece', 'PA', '#0B7A3B', 3),
  c('aek-athens', 'aekathens', 'AEK Athens', 'Athens', 'Greece', 'AE', '#1F1F1F', 3),
  c('paok', 'paok', 'PAOK Thessaloniki', 'Thessaloniki', 'Greece', 'PK', '#1F1F1F', 3),
  c('dinamo-zagreb', 'dinamozagreb', 'Dinamo Zagreb', 'Zagreb', 'Croatia', 'DZ', '#1F4E9C', 4),
  c('hajduk-split', 'hajduksplit', 'Hajduk Split', 'Split', 'Croatia', 'HS', '#1F4E9C', 4),
  c('st-pauli', 'stpauli', 'FC St. Pauli', 'Hamburg', 'Germany', 'SP', '#5A3A22', 5),
  c('borussia-dortmund', 'dortmund', 'Borussia Dortmund', 'Dortmund', 'Germany', 'BD', '#1F1F1F', 5),
  c('leicester-city', 'leicestercity', 'Leicester City', 'Leicester', 'England', 'LC', '#1F4E9C', 5),
  c('atalanta', 'atalanta', 'Atalanta', 'Bergamo', 'Italy', 'AT', '#1F4E9C', 5),
]
export const PORTAL_HOST_ROOT = process.env.FANLIFE_ROOT_DOMAIN || 'fanlife.game'
export const DEFAULT_CLUB = 'hapoel-tel-aviv'
/** host → club id, or null for the neutral portal. Closed list: an unknown subdomain is the portal, never a guess. */
export function clubFromHost(host: string | null | undefined, reg: readonly RegistryClub[] = REGISTRY, root = PORTAL_HOST_ROOT): string | null {
  if (!host) return null
  const h = host.toLowerCase().split(':')[0] ?? ''
  const m = h.endsWith('.' + root) ? h.slice(0, -(root.length + 1)) : h.endsWith('.localhost') ? h.slice(0, -'.localhost'.length) : null
  if (!m || m.includes('.') || m === 'www') return null
  return reg.find(x => x.sub === m)?.id ?? null
}
