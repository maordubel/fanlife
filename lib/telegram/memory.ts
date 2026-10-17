import { knownClub, telegramGame } from './routes'

export const TELEGRAM_MEMORY_KEY = 'fanlife.telegram.visit.v1'
export type TelegramVisit = { v: 1; club: string; game?: string }
export function parseTelegramVisit(raw: string | null): TelegramVisit | null {
  try {
    const value = JSON.parse(raw || 'null')
    if (value?.v !== 1 || typeof value.club !== 'string' || !knownClub(value.club)) return null
    return { v: 1, club: value.club, ...(typeof value.game === 'string' && telegramGame(value.game) ? { game: value.game } : {}) }
  } catch { return null }
}
export function rememberTelegramVisit(storage: Pick<Storage, 'getItem' | 'setItem'>, club: string, game?: string) {
  if (!knownClub(club) || (game && !telegramGame(game))) return
  try {
    const prior = parseTelegramVisit(storage.getItem(TELEGRAM_MEMORY_KEY))
    storage.setItem(TELEGRAM_MEMORY_KEY, JSON.stringify({ v: 1, club, ...(game ? { game } : prior?.club === club && prior.game ? { game: prior.game } : {}) }))
  } catch { /* Private browsing and full storage must never prevent play. */ }
}
