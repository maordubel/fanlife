import { REGISTRY } from '@/lib/master/registry'
import { SHARED_GATES } from '@/lib/clubs/gates'
import games from '@/messages/games/en.json'

/** A closed launch vocabulary. This is navigation, never an authorization grant. */
export const TELEGRAM_BOT_USERNAME = 'FanLife_appbot'
export const TELEGRAM_GAMES = SHARED_GATES.map(gate => ({
  key: gate.key, number: gate.number,
  title: games[`gate.${gate.key}`], description: games[`blurb.${gate.key}`],
}))
export type TelegramGame = typeof TELEGRAM_GAMES[number]['key']
export const telegramGame = (key: string) => TELEGRAM_GAMES.find(game => game.key === key)
export const knownClub = (id: string) => REGISTRY.some(club => club.id === id)

export function telegramGameHref(club: string, game: string): string | null {
  return knownClub(club) && (telegramGame(game) || game === 'life') ? `/telegram/${club}/${game}` : null
}

/** startapp permits letters, digits, underscores and hyphens. No arbitrary URL is accepted. */
export function telegramStartHref(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 200) return null
  const parts = raw.split('__')
  if (parts.length !== 2 && parts.length !== 4) return null
  const [club, game, seed, cursor] = parts
  const base = telegramGameHref(club!, game!)
  if (!base) return null
  if (parts.length === 2) return base
  if (!/^\d{1,10}$/.test(seed!) || !/^\d{1,5}$/.test(cursor!)) return null
  if (Number(seed) < 1 || Number(seed) > 0xffffffff || Number(cursor) > 10000) return null
  return `${base}?seed=${Number(seed)}&r=${Number(cursor)}`
}

export function telegramInvite(club: string, game: string): string | null {
  if (!telegramGameHref(club, game)) return null
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?startapp=${club}__${game}`
}

/** Shared games stay on their launch URLs; other features use their original pages in the same WebView. */
export function telegramInternalHref(url: URL): string | null {
  if (url.pathname === '/') return '/telegram'
  const match = /^\/clubs\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/.exec(url.pathname)
  if (!match || !knownClub(match[1]!)) return null
  if (!match[2] || match[2] === 'play') return null
  const game = telegramGameHref(match[1]!, match[2])
  return game ? game + url.search + url.hash : null
}

export { TELEGRAM_SESSION_KEY, isTelegramPath, telegramSurface } from './session'

/** Deterministic native Back, including cold launches without browser history. */
export function telegramBackHref(path: string): string {
  const game = /^\/telegram\/([a-z0-9-]+)\/[^/]+\/?$/.exec(path)
  if (game && knownClub(game[1]!)) return `/telegram?club=${game[1]}`
  const club = /^\/clubs\/([a-z0-9-]+)(?:\/(.*))?$/.exec(path)
  if (club && knownClub(club[1]!)) return club[2] && club[2] !== 'play' ? `/clubs/${club[1]}/play?lang=en` : `/telegram?club=${club[1]}`
  if (/^\/all-football\/legends\/(career|friendlies)\//.test(path)) return '/all-football/legends'
  if (path.startsWith('/all-football/')) return '/all-football'
  for (const area of ['/market', '/closet', '/auction', '/me', '/stand']) if (path.startsWith(area + '/')) return area
  return '/telegram'
}
