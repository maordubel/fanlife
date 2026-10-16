import { REGISTRY } from '@/lib/master/registry'

/** A closed launch vocabulary. This is navigation, never an authorization grant. */
export const TELEGRAM_BOT_USERNAME = 'FanLife_appbot'
export const TELEGRAM_GAMES = [
  { key: 'trivia', number: 2, title: 'The Quiz Stand', description: 'Know your club? Take your place.' },
  { key: 'polls', number: 7, title: "The People’s Choice", description: 'Two names. Your side of the argument.' },
  { key: 'xi', number: 1, title: 'Your All-time XI', description: 'The ones you would build it around.' },
] as const
export type TelegramGame = typeof TELEGRAM_GAMES[number]['key']
export const telegramGame = (key: string) => TELEGRAM_GAMES.find(game => game.key === key)
export const knownClub = (id: string) => REGISTRY.some(club => club.id === id)

export function telegramGameHref(club: string, game: string): string | null {
  return knownClub(club) && telegramGame(game) ? `/telegram/${club}/${game}` : null
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

/** Keep only the three shared games inside the Mini App. Other site links remain normal links. */
export function telegramInternalHref(url: URL): string | null {
  if (url.pathname === '/') return '/telegram'
  const match = /^\/clubs\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/.exec(url.pathname)
  if (!match || !knownClub(match[1]!)) return null
  if (!match[2] || match[2] === 'play') return `/telegram?club=${match[1]}`
  const game = telegramGameHref(match[1]!, match[2])
  return game ? game + url.search + url.hash : null
}
