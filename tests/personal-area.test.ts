import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { TABS } from '@/app/tik/CardTabs'
import { MESSAGES } from '@/lib/i18n'
import {
  cleanPref,
  defaultPref,
  mergePref,
  publicIdentity,
  setMode,
  type PublicSupporterIdentity,
} from '@/lib/profile/identity'
import { MEMORIES, memoriesOf, sameNameAgain, softLine } from '@/lib/profile/memories'
import { DOMAINS, LEVELS, memoryMap } from '@/lib/profile/memoryMap'
import { peopleRefs, recordsFrom, type RawDevice } from '@/lib/profile/records'
import { standLinkFrom } from '@/lib/profile/standLink'
import { emptyProfile, type Profile } from '@/lib/profile/store'

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

/* ------------------------------------------------------------------ fixtures, as stored */

function profileWith(over: Partial<Profile> = {}): Profile {
  return { ...emptyProfile(), ...over }
}

function stat(plays: number, correct = 0) {
  return { plays, best: 0, bestRate: 0, lastOn: '2026-09-27', correct, asked: correct }
}

const range = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}${i}`)
const toggles = (ids: string[]) => ids.map((id) => `${id}#1`)

/** One raw device per memory, written in the SHAPE each gate stores it — never a hand-made Records. */
const REACH: Record<string, () => { raw: RawDevice; resolve?: (ref: string) => string | null }> = {
  'never-forgot': () => ({ raw: { profile: profileWith({ gates: { '/trivia/europe': stat(9, 60), '/trivia/players': stat(6, 40) } }) } }),
  'shirt-back': () => ({
    raw: {
      profile: profileWith({ collections: { kits: range(4, 'kit-19') } }),
      kits: Object.fromEntries(range(6, '').map((i) => [`198${i}/8${i}|home`, { builtOn: '2026-09-20' }])),
    },
  }),
  'deep-archive': () => ({ raw: { profile: profileWith({ collections: { archive: range(50, 'm_') } }) } }),
  'same-name': () => ({
    raw: {
      profile: profileWith(),
      xi: { best: { formation: '4-3-3', picks: { gk: 'p_1', st: 'p_9' }, savedOn: '2026-09-20' } },
      ballot: { striker: 'p_9', keeper: 'p_1' },
      rumble: [{ seed: 7, selected: ['gili-landau', 'someone'], formation: 'defensive', cost: 1, scoreFor: 1, scoreAgainst: 0, result: 'W' }],
    },
    resolve: (ref) => ({ 'gili-landau': 'p_9', someone: 'p_2' })[ref] ?? ref,
  }),
  'one-more-saturday': () => ({
    raw: {
      profile: profileWith({ collections: { 'daily.days': ['2026-09-20', '2026-09-21', '2026-09-22'] } }),
      daily: {
        '2026-09-23': { done: { remember: '2026-09-23T10:00:00Z' } },
        '2026-09-24': { done: { choose: '2026-09-24T10:00:00Z' } },
        '2026-09-25': { done: { discover: '2026-09-25T10:00:00Z' } },
        '2026-09-26': { done: { remember: '2026-09-26T10:00:00Z' } },
      },
    },
  }),
  'there-again': () => ({
    raw: {
      profile: profileWith({ collections: { archive: ['m_1986final'] } }),
      lifeEvents: [{ t: 'chapter.entered', chapter: '1986' }, { t: 'chapter.completed', chapter: '1986' }],
      livedIds: ['m_1986final', 'p_landau'],
    },
  }),
  'thread-closed': () => ({ raw: { profile: profileWith({ collections: { 'thread.routes': ['route-1'] } }) } }),
  'slip-signed': () => ({ raw: { profile: profileWith(), sealed: 1 } }),
  'that-is-how': () => ({ raw: { profile: profileWith({ collections: { 'goal.rebuilt': ['g1', 'g2'], goal: ['g3'] } }) } }),
  'stayed-with-you': () => ({ raw: { profile: profileWith({ collections: { memory: range(5, 'm_') } }) } }),
  'seven-gates': () => ({
    raw: {
      profile: profileWith({
        gates: Object.fromEntries(['/xi', '/trivia/europe', '/lineup', '/kits/build', '/memory', '/goal', '/timeline'].map((g) => [g, stat(1)])),
      }),
    },
  }),
  'what-do-you-say': () => ({ raw: { profile: profileWith(), debate: { d1: 'a', d2: 'b', d3: 'a', d4: 'c', d5: 'a' } } }),
}

/* ================================================================== §26 — memories */

describe('זיכרונות — each computed from stored records, and each reachable', () => {
  it('has the seven the plan names, plus a few more, and a fixture for every one', () => {
    const ids = MEMORIES.map((m) => m.id)
    for (const id of ['never-forgot', 'shirt-back', 'deep-archive', 'same-name', 'one-more-saturday', 'there-again', 'thread-closed']) {
      expect(ids).toContain(id)
    }
    expect(ids.length).toBeGreaterThan(7)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(REACH).sort()).toEqual([...ids].sort())
  })

  for (const def of MEMORIES) {
    it(`"${def.id}" is reached from what the gates actually store`, () => {
      const { raw, resolve } = REACH[def.id]!()
      const reading = memoriesOf(recordsFrom(raw, resolve)).find((m) => m.id === def.id)!
      expect(reading.reached).toBe(true)
      expect(reading.lineKey).toBe(def.lineKey)
    })
  }

  it('an empty device has none, and says where each one lives', () => {
    const readings = memoriesOf(recordsFrom({ profile: emptyProfile() }))
    expect(readings.every((m) => !m.reached)).toBe(true)
    for (const m of readings) expect(m.lineKey.endsWith('.where')).toBe(true)
    expect(softLine(recordsFrom({ profile: emptyProfile() }))).toBeNull()
  })

  it('"הייתי שם שוב" needs a COMPLETED chapter — entering is not living it', () => {
    const raw: RawDevice = {
      profile: profileWith({ collections: { archive: ['m_1986final'] } }),
      lifeEvents: [{ t: 'chapter.entered', chapter: '1986' }],
      livedIds: ['m_1986final'],
    }
    expect(memoriesOf(recordsFrom(raw)).find((m) => m.id === 'there-again')!.reached).toBe(false)
  })

  it('"אותו שם חוזר" compares people, not strings — a slug and an id are one man', () => {
    const { raw, resolve } = REACH['same-name']!()
    expect(sameNameAgain(recordsFrom(raw))).toBeNull()
    expect(sameNameAgain(recordsFrom(raw, resolve))).toBe('p_9')
    expect(peopleRefs(raw)).toEqual(expect.arrayContaining(['p_1', 'p_9', 'gili-landau']))
  })

  it('every line exists, is one line, and carries no points, rating or percentage', () => {
    for (const def of MEMORIES) {
      for (const key of [def.titleKey, def.lineKey, def.whereKey]) {
        const text = MESSAGES[key]
        expect(text, key).toBeTruthy()
        expect(text, key).not.toMatch(/\n/)
        for (const banned of ['%', 'ניקוד', 'נקודות', 'דירוג', 'הישג', 'ציון']) expect(text, key).not.toContain(banned)
      }
    }
  })

  it('no screen prints a total of memories — the list component holds no count', () => {
    const src = read('components/profile/MemoryList.tsx')
    expect(src).not.toMatch(/\.length/)
    expect(src).not.toMatch(/filter\([^)]*\)\.length/)
  })
})

/* ================================================================== §25 — the memory map */

describe('מפת הזיכרון — words and sizes, never a number', () => {
  function walk(value: unknown, path = '$'): string[] {
    if (typeof value === 'number') return [path]
    if (Array.isArray(value)) return value.flatMap((v, i) => walk(v, `${path}[${i}]`))
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => walk(v, `${path}.${k}`))
    return []
  }

  const devices: RawDevice[] = [
    { profile: emptyProfile() },
    { profile: profileWith({ gates: { '/trivia/europe': stat(50, 200) } }) },
    ...Object.values(REACH).map((make) => make().raw),
    {
      profile: profileWith({
        gates: { '/trivia/europe': stat(400, 3000), '/xi': stat(80), '/goal': stat(90), '/memory': stat(90), '/derby': stat(40), '/timeline': stat(90) },
        collections: { archive: range(400, 'x'), kits: range(90, 'k'), 'goal.rebuilt': range(60, 'g'), memory: range(60, 'm'), 'thread.routes': range(40, 'r') },
      }),
      ballot: Object.fromEntries(range(8, 'q').map((q) => [q, `p_${q}`])),
      sealed: 1,
      debate: Object.fromEntries(range(30, 'd').map((d) => [d, 'a'])),
    },
  ]

  it('returns no number anywhere, for any device', () => {
    for (const raw of devices) expect(walk(memoryMap(recordsFrom(raw)))).toEqual([])
  })

  it('has the seven grounds of §25, each with a word, a size and a door', () => {
    const reading = memoryMap(recordsFrom({ profile: emptyProfile() }))
    expect(reading.domains.map((d) => d.id)).toEqual([...DOMAINS])
    for (const d of reading.domains) {
      expect(MESSAGES[d.nameKey]).toBeTruthy()
      expect(MESSAGES[d.wordKey]).toBeTruthy()
      expect(MESSAGES[d.fedByKey]).toBeTruthy()
      expect(d.href.startsWith('/')).toBe(true)
    }
    expect(reading.domains.every((d) => d.level === 'quiet')).toBe(true)
    expect(reading.headlineKey).toBe('personal.map.headline.quiet')
  })

  it('every level is reachable from stored records', () => {
    const seen = new Set(devices.flatMap((raw) => memoryMap(recordsFrom(raw)).domains.map((d) => d.level)))
    expect([...seen].sort()).toEqual([...LEVELS].sort())
  })

  it('the component cannot render a raw value: it imports only the reading', () => {
    const src = read('components/profile/MemoryMap.tsx')
    expect(src).not.toMatch(/lib\/profile\/(records|store|summary|card)/)
    expect(src).not.toMatch(/\bRecords\b|recordsFrom|readProfile|\.plays\b|\.correct\b/)
    expect(src).toMatch(/MemoryMapReading/)
  })

  it('no "Fan Score" anywhere in the personal area', () => {
    const files = [
      'components/profile/MemoryMap.tsx',
      'components/profile/MemoryList.tsx',
      'components/profile/MeArea.tsx',
      'app/tik/file/FileArea.tsx',
    ]
    for (const file of files) expect(read(file), file).not.toMatch(/fan ?score|score:|ציון אוהד|דירוג/i)
    // the words may SAY "not a score, not a rating" (the map's lede does); they may not be one
    for (const [key, text] of Object.entries(MESSAGES).filter(([k]) => k.startsWith('personal.'))) {
      expect(text, key).not.toMatch(/fan ?score|ציון אוהד|\d+\s*%|\d+\s*נקודות/i)
    }
  })
})

/* ================================================================== §35 — privacy */

describe('שתי זהויות — accountIdentity מול publicSupporterIdentity', () => {
  it('anonymous is the default, and the label is אדום (no invented number)', () => {
    const id = publicIdentity(defaultPref())
    expect(id).toEqual({ kind: 'public', mode: 'anonymous', label: 'אדום', no: null })
    expect(publicIdentity({ ...defaultPref(), no: 7 }).label).toBe('אדום #7')
  })

  it('the public identity has exactly kind/mode/label/no — no id, no email, no account name', () => {
    const shapes: PublicSupporterIdentity[] = [
      publicIdentity(defaultPref()),
      publicIdentity(setMode({ ...defaultPref(), no: 12 }, 'nickname', '  שער   5 ')),
    ]
    for (const shape of shapes) expect(Object.keys(shape).sort()).toEqual(['kind', 'label', 'mode', 'no'])
    expect(shapes[1]!.label).toBe('שער 5')
  })

  it('a nickname chosen with no nickname stays anonymous; a kept nickname stays hidden while anonymous', () => {
    expect(setMode(defaultPref(), 'nickname', '   ').mode).toBe('anonymous')
    const kept = setMode(setMode(defaultPref(), 'nickname', 'שער 5'), 'anonymous', 'שער 5')
    expect(kept.nickname).toBe('שער 5')
    expect(publicIdentity(kept).label).toBe('אדום')
  })

  it('merges newest edit wins, and the number only ever comes from the account', () => {
    const device = { mode: 'nickname' as const, nickname: 'שער 5', editedAt: '2026-09-28T11:00:00Z', no: null }
    const account = { mode: 'anonymous' as const, nickname: '', editedAt: '2026-09-28T10:00:00Z', no: 41 }
    expect(mergePref(device, account)).toEqual({ ...device, no: 41 })
    expect(mergePref({ ...device, editedAt: '2026-09-27T10:00:00Z' }, account)).toEqual(account)
    expect(mergePref(defaultPref(), account).no).toBe(41)
  })

  it('reads garbage as the default', () => {
    for (const junk of [null, 3, 'x', [], { mode: 'public' }, { mode: 'nickname', nickname: '' }]) {
      expect(cleanPref(junk).mode).toBe('anonymous')
    }
  })

  it('public share and stand surfaces never read an email or a user id', () => {
    const surfaces = ['components/share', 'lib/share', 'lib/og', 'app/api/card', 'app/c', 'components/stand', 'app/stand']
    const files: string[] = ['components/profile/PublicIdentity.tsx', 'components/profile/AreaSwitch.tsx']
    const walkDir = (dir: string) => {
      const abs = join(ROOT, dir)
      if (!existsSync(abs)) return
      for (const name of readdirSync(abs)) {
        const rel = join(dir, name)
        if (statSync(join(ROOT, rel)).isDirectory()) walkDir(rel)
        else if (/\.(ts|tsx)$/.test(name)) files.push(rel)
      }
    }
    for (const dir of surfaces) walkDir(dir)
    expect(files.length).toBeGreaterThan(10)
    for (const file of files) {
      const code = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      expect(code, file).not.toMatch(/\bemail\b|user_id|userId|\.user\.id|auth\.getUser|currentAccount/)
    }
  })

  it('the SQL: worker_ only, nothing on auth, the label never returns an id, and verify.sh runs it', () => {
    const sql = read('supabase/migrations/20260928130000_worker_public_identity.sql')
    for (const m of sql.matchAll(/create (?:or replace )?(?:function|trigger|sequence|table)(?: if not exists)? (?:public\.)?([a-z_]+)/g)) {
      expect(m[1]!.startsWith('worker_'), m[1]).toBe(true)
    }
    expect(sql).not.toMatch(/\bon auth\./)
    expect(sql).not.toMatch(/from auth\.users/)
    expect(sql).toMatch(/grant execute on function public\.worker_public_identity_me\(\)\s+to authenticated/)
    expect(sql).not.toMatch(/^grant [^;]*worker_public_label[^;]*to/m)
    expect(sql).not.toMatch(/grant update[^;]*public_(mode|nickname)/)
    const label = sql.slice(sql.indexOf('function public.worker_public_label'), sql.indexOf('function public.worker_public_identity_me'))
    expect(label).not.toMatch(/'id'|'email'|display_name/)
    expect(read('scripts/db/verify.sh')).toContain('supabase/tests/60-public-identity.sql')
  })
})

/* ================================================================== §24 — two destinations */

describe('אני / התיק שלי — two destinations, old routes keep working', () => {
  it('/tik stays, and /tik/file exists', () => {
    expect(existsSync(join(ROOT, 'app/tik/page.tsx'))).toBe(true)
    expect(existsSync(join(ROOT, 'app/tik/file/page.tsx'))).toBe(true)
    expect(read('app/tik/page.tsx')).toMatch(/<AreaSwitch active="me"/)
    expect(read('app/tik/file/page.tsx')).toMatch(/<AreaSwitch active="file"/)
  })

  it('what was the "kept" tab is now the file, and an old #kept link is sent there', () => {
    expect(TABS).not.toContain('kept' as never)
    expect(read('app/tik/CardTabs.tsx')).toMatch(/#kept[\s\S]{0,80}\/tik\/file/)
    expect(read('app/tik/file/FileArea.tsx')).toMatch(/<KeptPanel/)
  })

  it('"אני" holds identity; "התיק שלי" holds the things', () => {
    const me = read('components/profile/MeArea.tsx')
    for (const piece of ['PublicIdentity', 'positionLabel', 'favouriteId', 'readStandLink', 'MemoryMap', '/polls']) expect(me).toContain(piece)
    const file = read('app/tik/file/FileArea.tsx')
    for (const piece of ['KeptPanel', 'MemoryList', 'LifePassport', 'trivia', 'timeline', 'debate', 'duels']) expect(file).toContain(piece)
  })

  it('the LIFE passport asks only about chapters the save completed', () => {
    const file = read('app/tik/file/FileArea.tsx')
    expect(file).toMatch(/readCompletedChapters\(\)/)
    const action = read('app/tik/file/actions.ts')
    expect(action).toMatch(/bridgeOf\(chapterId\)/)
    expect(action).not.toMatch(/lifeBridge\(\)/)
  })

  it('the home adds at most ONE soft line', () => {
    const now = read('components/home/NowLayer.tsx')
    expect(now.match(/personal\.home\.memory/g)?.length).toBe(1)
    expect(now).toMatch(/softLine\(/)
  })

  it('a stand link is read, never invented', () => {
    expect(standLinkFrom([])).toBeNull()
    expect(standLinkFrom([{ nope: 1 }, 'x'])).toBeNull()
    expect(standLinkFrom([{ code: '7F4K' }])).toEqual({ code: '7F4K', href: '/stand/7F4K' })
    expect(standLinkFrom([{ stands: [{ code: 'AB12CD' }] }])?.href).toBe('/stand/AB12CD')
  })

  it('records survive garbage in every store', () => {
    const junk: RawDevice = { profile: emptyProfile(), xi: 'x', kits: [1], ballot: 5, sealed: 'no', debate: null, daily: [], rumble: {}, lifeEvents: 'x' }
    const r = recordsFrom(junk)
    expect(r.xiSheets).toBe(0)
    expect(r.kits).toEqual([])
    expect(r.ballotSealed).toBe(false)
    expect(r.dailyDays).toEqual([])
    expect(r.lifeChapters).toEqual([])
  })
})
