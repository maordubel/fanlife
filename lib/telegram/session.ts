/** UI context only; never a credential, subscription or grant of access. Tab-scoped, with no identity data. */
export const TELEGRAM_SESSION_KEY = 'fanlife.telegram.session.v1'
export const isTelegramPath = (path: string) => path === '/telegram' || path.startsWith('/telegram/')
export function telegramSurface(path: string): boolean {
  if (path.split('/').includes('admin')) return false
  return path === '/' || ['/telegram', '/clubs', '/market', '/closet', '/auction', '/shirts', '/me', '/all-football', '/our-games', '/sources', '/away-days', '/stand', '/circles']
    .some(prefix => path === prefix || path.startsWith(prefix + '/'))
}
export function telegramSessionActive(path: string, entry: boolean, remembered: boolean, mode: string): boolean {
  return telegramSurface(path) && (entry || isTelegramPath(path) || remembered || mode === 'guest' || mode === 'verify')
}
