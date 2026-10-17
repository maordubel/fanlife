import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { TELEGRAM_GAMES, telegramBackHref, telegramSurface, telegramGameHref, telegramInternalHref, telegramInvite, telegramStartHref } from '@/lib/telegram/routes'
import { SHARED_GATES } from '@/lib/clubs/gates'
import { topAdAllowedOn } from '@/lib/top-ad'

describe('Telegram routes share the existing games', () => {
  it('covers every canonical gate and LIFE without opening arbitrary destinations', () => {
    expect(telegramGameHref('hapoel-tel-aviv', 'trivia')).toBe('/telegram/hapoel-tel-aviv/trivia')
    expect(telegramGameHref('unknown', 'trivia')).toBeNull()
    expect(TELEGRAM_GAMES.map(g=>g.key)).toEqual(SHARED_GATES.map(g=>g.key))
    for (const game of [...TELEGRAM_GAMES.map(g=>g.key),'life']) expect(telegramGameHref('hapoel-tel-aviv',game)).toBe(`/telegram/hapoel-tel-aviv/${game}`)
    expect(telegramGameHref('hapoel-tel-aviv', 'admin')).toBeNull()
  })
  it('decodes an exact round without arbitrary redirects', () => {
    expect(telegramStartHref('hapoel-tel-aviv__trivia__42__12')).toBe('/telegram/hapoel-tel-aviv/trivia?seed=42&r=12')
    expect(telegramStartHref('panathinaikos__polls')).toBe('/telegram/panathinaikos/polls')
    expect(telegramStartHref('panathinaikos__timeline')).toBe('/telegram/panathinaikos/timeline')
    expect(telegramStartHref('panathinaikos__life')).toBe('/telegram/panathinaikos/life')
    for (const value of ['https://evil.example', '../master__xi', 'hapoel-tel-aviv__trivia__0__1', 'hapoel-tel-aviv__trivia__1__10001', 'hapoel-tel-aviv__trivia__4294967296__0', 'unknown__xi', 'hapoel-tel-aviv__trivia__3', 'hapoel-tel-aviv__admin', 'x'.repeat(201), null]) expect(telegramStartHref(value)).toBeNull()
  })
  it('generates real bot launch links, without private credentials', () => {
    expect(telegramInvite('hapoel-tel-aviv', 'xi')).toBe('https://t.me/FanLife_appbot?startapp=hapoel-tel-aviv__xi')
    expect(telegramInvite('unknown', 'xi')).toBeNull()
  })
  it('keeps supported game links and club/home links inside the shell', () => {
    const link = (path: string) => telegramInternalHref(new URL(path, 'https://fanlife.dubelteam.com'))
    expect(link('/')).toBe('/telegram')
    expect(link('/#life')).toBe('/our-games')
    expect(link('/clubs/aek-athens')).toBeNull()
    expect(link('/clubs/aek-athens/play')).toBeNull()
    expect(link('/clubs/aek-athens/trivia?seed=42&r=3')).toBe('/telegram/aek-athens/trivia?seed=42&r=3')
    expect(link('/clubs/aek-athens/archive')).toBe('/telegram/aek-athens/archive')
    expect(link('/clubs/aek-athens/life')).toBe('/telegram/aek-athens/life')
    expect(link('/master')).toBeNull()
  })
  it('keeps native Back usable after canonical pages and cold launches', () => {
    expect(telegramBackHref('/telegram/celtic/timeline')).toBe('/telegram?club=celtic')
    expect(telegramBackHref('/clubs/celtic/history')).toBe('/clubs/celtic/play?lang=en')
    expect(telegramBackHref('/clubs/celtic')).toBe('/telegram?club=celtic')
    expect(telegramBackHref('/market/item/example')).toBe('/market')
    expect(telegramBackHref('/all-football/legends/career/example')).toBe('/all-football/legends')
    expect(telegramBackHref('/me')).toBe('/telegram')
    expect(telegramBackHref('/telegram/unknown/xi')).toBe('/telegram')
  })
  it('keeps app context on public features and off staff/auth/API surfaces', () => {
    for (const path of ['/clubs/celtic/play','/market/item/example','/closet','/me/file','/all-football/legends']) expect(telegramSurface(path)).toBe(true)
    for (const path of ['/master/admin','/auth/callback','/api/telegram/verify','/qa','/market/admin','/markets']) expect(telegramSurface(path)).toBe(false)
  })
  it('imports the canonical gate page and enforces live access without evaluation bypass', () => {
    const page = readFileSync('app/telegram/[club]/[gate]/page.tsx', 'utf8')
    expect(page).toContain("from '@/app/clubs/[slug]/[gate]/page'")
    expect(page).toContain('game.number, false')
    expect(page).not.toContain('evaluationMode')
    expect(readFileSync('app/telegram/page.tsx', 'utf8')).toContain('gateAvailability(core.data, game.key).playable')
  })
  it('never runs top ads on the Mini App', () => {
    expect(topAdAllowedOn('/telegram')).toBe(false)
    expect(topAdAllowedOn('/telegram/hapoel-tel-aviv/trivia')).toBe(false)
  })
})
