import { describe, expect, it } from 'vitest'
import clubsFile from '@/content/manual/clubs.json'
import { CLUB, CLUBS, clubById, fillClub, hasModule } from '@/lib/club/context'

describe('ClubContext', () => {
  it('the served club matches the canonical clubs table (no second source of identity)', () => {
    const us = (clubsFile.records as Array<{ slug: string; nameHe: string; nameEn?: string; isUs?: boolean }>).find((c) => c.isUs)
    expect(us?.slug).toBe(CLUB.slug)
    expect(us?.nameHe).toBe(CLUB.names.he)
    expect(us?.nameEn).toBe(CLUB.names.en)
  })

  it('the derby rival in the manifest is the one clubs.json flags (rule 13)', () => {
    const rival = (clubsFile.records as Array<{ slug: string; isDerbyRival?: boolean }>).filter((c) => c.isDerbyRival)
    expect([...new Set(rival.map((c) => c.slug))]).toEqual(CLUB.derbyRivalSlug ? [CLUB.derbyRivalSlug] : [])
  })

  it('club ids are unique and resolvable', () => {
    expect(new Set(CLUBS.map((c) => c.id)).size).toBe(CLUBS.length)
    expect(clubById(CLUB.id)).toBe(CLUB)
    expect(clubById('nobody')).toBeNull()
  })

  it('fills the shared placeholders', () => {
    expect(fillClub('{club} · {founded}')).toBe(`${CLUB.names.he} · ${CLUB.founded}`)
    expect(fillClub('{short} of {city}', CLUB, 'en')).toBe('Hapoel of Tel Aviv')
  })

  it('modules are opt-in', () => {
    expect(hasModule('derby')).toBe(true)
    expect(hasModule('derby', { ...CLUB, modules: [] })).toBe(false)
  })
})
