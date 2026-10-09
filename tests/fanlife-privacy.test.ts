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

describe('stage C — contributions', () => {
  const read = (p: string) => require('node:fs').readFileSync(p, 'utf8') as string
  it('consent is per photo, defaults to nothing, and editors never see an owner', () => {
    const sql = read('supabase/migrations/20261009260000_worker_contributions.sql')
    expect(sql).toMatch(/archive_use\s+boolean not null default false/)
    expect(sql).toMatch(/marketing_use boolean not null default false/)
    const queue = sql.slice(sql.indexOf('worker_admin_contribution_queue'), sql.indexOf('worker_admin_contribution_review'))
    expect(queue).not.toMatch(/user_id'|'handle'|email|'owner'/)
    expect(sql).toMatch(/revoke all on public\.worker_photo_consent from public, anon, authenticated/)
  })
  it('every admin function checks the editor first', () => {
    const sql = read('supabase/migrations/20261009260000_worker_contributions.sql')
    for (const fn of ['worker_admin_contribution_queue', 'worker_admin_contribution_review', 'worker_admin_club_merge']) {
      const body = sql.slice(sql.indexOf(`function public.${fn}`))
      expect(body.slice(0, 600)).toContain("worker_is_admin()")
    }
  })
  it('the screens never print an owner and mark photos as user photos', () => {
    for (const f of ['components/fanlife/admin/AdminContributions.tsx', 'components/fanlife/closet/Contributions.tsx']) {
      const src = read(f)
      expect(src).toContain('data-user-photo')
      expect(src).not.toMatch(/userId|user_id|email/)
    }
  })
})
