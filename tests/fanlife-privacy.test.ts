import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { handleLabel } from '@/lib/collector/labels'
import { closetPath, nicknameProblem } from '@/components/fanlife/closet/PrivacyPanel'
import { photoUrl } from '@/lib/collector/api'

const read = (p: string) => readFileSync(p, 'utf8')

describe('stage A privacy — client', () => {
  it('checks a nickname the way the database does', () => {
    expect(nicknameProblem('ab')).toBe('nick_short')
    expect(nicknameProblem('x'.repeat(21))).toBe('nick_long')
    expect(nicknameProblem('12345')).toBe('nick_chars')
    expect(nicknameProblem('a<b>c')).toBe('nick_chars')
    expect(nicknameProblem('  Red  Fan ')).toBeNull()
    expect(nicknameProblem('דני_האדום')).toBeNull()
  })

  it('shows an anonymous collector as nothing but "anonymous"', () => {
    expect(handleLabel({ handle: null, nickname: null, anonymous: true })).toBe('אספן אנונימי')
    expect(handleLabel({ handle: 7, nickname: 'Red Fan' })).toBe('Red Fan')
  })

  it('has no closet path for an anonymous or private collector', () => {
    const base = { handle: 7, nickname: null, showNickname: false, shareToken: 'tok' }
    expect(closetPath({ ...base, identityMode: 'anonymous', visibility: 'public' })).toBeNull()
    expect(closetPath({ ...base, identityMode: 'number', visibility: 'private' })).toBeNull()
    expect(closetPath({ ...base, identityMode: 'number', visibility: 'public' })).toBe('/closet/7')
    expect(closetPath({ ...base, identityMode: 'number', visibility: 'link_only' })).toContain('?t=tok')
  })

  it('reads an opaque photo from the public bucket and an old one from the closed bucket', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
    expect(photoUrl('p/0123456789abcdef0123456789abcdef.webp')).toContain('/public/worker-collector-pub/')
    expect(photoUrl('00000000-0000-0000-0000-000000000001/i/a.webp')).toContain('/public/worker-collector/')
  })

  it('never builds an upload path out of the owner id', () => {
    const api = read('lib/collector/api.ts')
    expect(api).not.toMatch(/\$\{userId\}\//)
    expect(api).toContain("'worker_photo_slot'")
    expect(api).toContain('PHOTO_BUCKET_PUB')
  })

  it('asks before going anonymous: a dialog above the navigation, with the plan text', () => {
    const src = read('components/fanlife/closet/PrivacyPanel.tsx')
    expect(src).toContain('z-[60]')
    expect(src).toContain('min-h-tap')
    const en = JSON.parse(read('messages/en.economy.json')) as Record<string, string>
    const he = JSON.parse(read('messages/he.collector.json')) as Record<string, string>
    expect(he['collector.identity.confirm.body']).toBe('כדי שלא נקשר בין הפריטים שלך, האוסף יהפוך לפרטי וקישור השיתוף יפסיק לפעול.')
    for (const key of Object.keys(en).filter((k) => /^collector\.(identity|display|reminder)\./.test(k))) {
      expect(he[key], key).toBeTruthy()
    }
  })

  it('blocks from a conversation, a listing or a lot when there is no handle', () => {
    const api = read('lib/collector/api.ts')
    expect(api).toMatch(/p_connection/)
    expect(api).toMatch(/p_lot/)
  })
})
