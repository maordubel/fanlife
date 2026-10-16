import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { telegramGameHref, telegramInternalHref, telegramInvite, telegramStartHref } from '@/lib/telegram/routes'
import { topAdAllowedOn } from '@/lib/top-ad'

describe('Telegram routes share the existing games', () => {
  it('only accepts registered clubs and the three selected games', () => {
    expect(telegramGameHref('hapoel-tel-aviv', 'trivia')).toBe('/telegram/hapoel-tel-aviv/trivia')
    expect(telegramGameHref('unknown', 'trivia')).toBeNull()
    expect(telegramGameHref('hapoel-tel-aviv', 'life')).toBeNull()
  })
  it('decodes an exact round without arbitrary redirects', () => {
    expect(telegramStartHref('hapoel-tel-aviv__trivia__42__12')).toBe('/telegram/hapoel-tel-aviv/trivia?seed=42&r=12')
    expect(telegramStartHref('panathinaikos__polls')).toBe('/telegram/panathinaikos/polls')
    for (const value of ['https://evil.example', '../master__xi', 'hapoel-tel-aviv__trivia__0__1', 'hapoel-tel-aviv__trivia__1__10001', 'hapoel-tel-aviv__trivia__4294967296__0', 'unknown__xi', 'hapoel-tel-aviv__trivia__3', 'hapoel-tel-aviv__life', 'x'.repeat(201), null]) expect(telegramStartHref(value)).toBeNull()
  })
  it('generates real bot launch links, without private credentials', () => {
    expect(telegramInvite('hapoel-tel-aviv', 'xi')).toBe('https://t.me/FanLife_appbot?startapp=hapoel-tel-aviv__xi')
    expect(telegramInvite('unknown', 'xi')).toBeNull()
  })
  it('keeps supported game links and club/home links inside the shell', () => {
    const link = (path: string) => telegramInternalHref(new URL(path, 'https://fanlife.dubelteam.com'))
    expect(link('/')).toBe('/telegram')
    expect(link('/clubs/aek-athens')).toBe('/telegram?club=aek-athens')
    expect(link('/clubs/aek-athens/play')).toBe('/telegram?club=aek-athens')
    expect(link('/clubs/aek-athens/trivia?seed=42&r=3')).toBe('/telegram/aek-athens/trivia?seed=42&r=3')
    expect(link('/clubs/aek-athens/archive')).toBeNull()
    expect(link('/master')).toBeNull()
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
