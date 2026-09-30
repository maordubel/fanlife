import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * הארון, השוק והמכירה הפומבית — מה שהקובץ מבטיח, נבדק על המקור (22.9.2026).
 *
 * ההתנהגות עצמה נבדקת על Postgres אמיתי (`scripts/db/verify.sh`: כל התיקייה פעמיים, 85 טענות
 * של תקיפה וזרימה). כאן נשמרים הכללים שקריאה של הקובץ יכולה לתפוס לפני שמישהו מריץ אותו:
 * שמות, הרשאות, ואף פעולה שמכבדת משתמש אנונימי של DUBID.
 */
const ROOT = join(__dirname, '..')
const SQL = readFileSync(join(ROOT, 'supabase/migrations/20260922120000_worker_collector_market.sql'), 'utf8')
const CODE = SQL.split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')

function functionBodies(): Map<string, string> {
  const out = new Map<string, string>()
  const re = /create or replace function public\.(\w+)\(([\s\S]*?)\$\$([\s\S]*?)\$\$/g
  for (const match of CODE.matchAll(re)) out.set(match[1] as string, match[3] as string)
  return out
}

describe('הארון והשוק — פרויקט משותף עם DUBID', () => {
  it('names everything it creates worker_…', () => {
    const created = [
      ...CODE.matchAll(/create (?:table if not exists|or replace function|trigger|index if not exists|unique index if not exists|sequence if not exists)\s+(?:public\.)?(\w+)/gi),
    ].map((m) => m[1] as string)
    expect(created.length).toBeGreaterThan(90)
    for (const name of created) expect(name, name).toMatch(/^worker_/)
    const policies = [...CODE.matchAll(/create policy (\w+) on (\S+)/g)].map((m) => [m[1], m[2]])
    expect(policies.length).toBe(3)
    for (const [name, table] of policies) {
      expect(name).toMatch(/^worker_collector_/)
      expect(table).toBe('storage.objects')
    }
  })

  it('opens nothing in storage beyond its own bucket', () => {
    for (const block of CODE.match(/create policy [\s\S]*?\)\$p\$/g) ?? []) {
      expect(block).toContain("bucket_id = 'worker-collector'")
    }
    expect(CODE).toContain("values ('worker-collector', 'worker-collector', true, 2097152")
  })

  it('touches nothing of auth and copies nobody out of it', () => {
    expect(CODE).not.toMatch(/create trigger[^;]*\bon auth\./i)
    expect(CODE).not.toMatch(/from auth\.users/i)
    expect(CODE).not.toMatch(/alter default privileges/i)
    expect(CODE).not.toMatch(/drop\s+(table|function|schema|column)/i)
  })

  it('grants no table to anyone — every read and write is a function', () => {
    expect(CODE).not.toMatch(/grant\s+(select|insert|update|delete|all)[^;]*on\s+(table\s+)?public\.worker/i)
    expect(CODE).toMatch(/revoke all on public\.%I from anon, authenticated/)
  })

  it('pins the search path on every security definer function', () => {
    for (const block of CODE.match(/create or replace function[\s\S]*?as \$\$/g) ?? []) {
      if (block.includes('security definer')) expect(block, block.slice(0, 80)).toContain('set search_path = public')
    }
  })

  it('refuses an anonymous DUBID session on every market write', () => {
    const bodies = functionBodies()
    const writes = [
      'worker_collector_have', 'worker_collector_unhave', 'worker_collector_want_set', 'worker_collector_item_update',
      'worker_collector_photo_add', 'worker_collector_settings', 'worker_connect', 'worker_message_send',
      'worker_offer_make', 'worker_offer_respond', 'worker_connection_step', 'worker_block_set', 'worker_report',
      'worker_auction_submit', 'worker_auction_bid', 'worker_auction_complete',
    ]
    for (const name of writes) {
      expect(bodies.get(name), name).toContain('public.worker_market_uid()')
    }
    expect(bodies.get('worker_market_uid')).toContain("auth.jwt() ->> 'is_anonymous'")
  })

  it('checks the admin on the first line of every admin function', () => {
    const bodies = functionBodies()
    const admin = [...bodies.keys()].filter((name) => name.startsWith('worker_admin_') && name !== 'worker_admin_whoami')
    expect(admin.length).toBeGreaterThanOrEqual(12)
    for (const name of admin) {
      const firstStatement = (bodies.get(name) as string).split('begin')[1]?.trim().split('\n')[0] ?? ''
      expect(firstStatement, name).toBe("if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;")
    }
  })

  it('never lets the seller bid, and hides the reserve and every max', () => {
    const bodies = functionBodies()
    expect(bodies.get('worker_auction_bid')).toContain("if v_l.seller_id = v_me then return public.worker_fail('own_lot')")
    const state = bodies.get('worker_auction_state') as string
    expect(state).toContain("'reservePrice', case when v_me = v_l.seller_id then v_l.reserve_price end")
    expect(state).not.toMatch(/'max_amount'|'maxAmount'|'leaderMax'/)
  })

  it('refuses affiliate links and a replica dressed as the club store, in the table itself', () => {
    expect(CODE).toContain("product_url !~* '[?&](utm_[a-z]+|ref|aff|affiliate|tag|partner|clickid)='")
    expect(CODE).toContain("(offer_type <> 'replica' or not is_official_club_store)")
  })

  it('reports its own check line, and the counts match the file', () => {
    const tables = [...CODE.matchAll(/create table if not exists public\.(\w+)/g)].length
    const functions = new Set([...CODE.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1])).size
    expect(tables).toBe(18)
    expect(functions).toBe(72)
    expect(SQL).toContain('collector_tables 18 · collector_functions 72 · anon_can_write 0 · auth_triggers 0')
  })

  it('takes no money and records no donation', () => {
    expect(CODE).not.toMatch(/commission|fee_|donation/i)
  })
})
