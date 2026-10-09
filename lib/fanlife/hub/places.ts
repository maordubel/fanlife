/**
 * Countries a collector can say they are in. A short list on purpose: the clubs on the roll are in Europe and
 * Israel, and a country nobody can choose is simply not offered (the database accepts any two-letter code).
 */
export const COUNTRY_CODES = [
  'GR', 'IL', 'DE', 'GB', 'ES', 'IT', 'FR', 'NL', 'PT', 'TR', 'RS', 'HR', 'AT', 'CH', 'BE', 'DK', 'SE', 'NO', 'FI', 'PL',
  'CZ', 'HU', 'RO', 'BG', 'UA', 'CY', 'IE', 'SI', 'SK', 'AL', 'BA', 'ME', 'MK', 'GE', 'AM', 'AZ', 'LT', 'LV', 'EE', 'IS',
  'US', 'CA', 'BR', 'AR', 'MX', 'AU', 'JP', 'MA', 'EG', 'ZA',
] as const

/** "GR" → "Greece". Falls back to the code itself when the runtime does not know it. */
export function countryName(code: string, locale = 'en'): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** "GR" → 🇬🇷 — a flag is decoration; the name always travels with it */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export function placeLine(place: { country: string; city: string | null } | null | undefined): string | null {
  if (!place) return null
  return [place.city, countryName(place.country)].filter(Boolean).join(', ')
}
