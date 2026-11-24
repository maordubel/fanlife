/**
 * LIFE is closed (owner, 24.11.2026): "close LIFE to the public, COMING SOON everywhere; nobody enters but the admin,
 * through a dedicated link". This is the one list of what counts as "inside LIFE". The middleware sends every one of
 * these to the Coming soon screen unless the request carries the owner's verified cookie; the owner's door is
 * `/master/life`. Assets the other games share (`/life/sfx`, `/life/art`, …) stay open: only pages and the game's own
 * HTML players are closed.
 */
export const LIFE_SOON_PATH = '/coming-soon/life'
export const LIFE_OWNER_DOOR = '/master/life'

export function isLifePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/life') return true
  // the game's own players and labs (town, voxel, cinema, display preview): HTML only
  if (p.startsWith('/life/') && (/\.html?$/i.test(p) || !/\.[a-z0-9]+$/i.test(p))) return true
  if (/^\/clubs\/[^/]+\/life(\/|$)/.test(p)) return true
  if (/^\/telegram\/[^/]+\/life(\/|$)/.test(p)) return true
  if (/^\/qa\/life-[^/]+/.test(p)) return true
  return false
}
