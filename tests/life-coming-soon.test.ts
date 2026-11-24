import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {DEFAULT_FEATURES} from '@/lib/features'

const club=readFileSync('app/clubs/[slug]/life/page.tsx','utf8'),old=readFileSync('app/life/page.tsx','utf8'),entry=readFileSync('lib/clubs/life/entry.ts','utf8'),soon=readFileSync('components/clubs/LifeSoon.tsx','utf8')

describe('LIFE is closed to the public: Coming soon only (docs/rules/life-coming-soon.md)',()=>{
 it('is off unless the owner turns it on',()=>{expect(DEFAULT_FEATURES.life).toBe(false)})
 it('a club\'s LIFE address asks the switch before anything else and answers with the coming-soon screen',()=>{
  const body=club.slice(club.indexOf('export default async function Page'))
  const gate=body.indexOf('if (!(await lifeOpen())) return <LifeSoon')
  expect(gate).toBeGreaterThan(-1)
  for(const later of ['loadClub(','readState()','<LifeGame'])expect(body.indexOf(later),later).toBeGreaterThan(gate)
 })
 it('the old /life address asks the same switch before it resolves anything of the game',()=>{
  const body=old.slice(old.indexOf('export default async function LifePage'))
  const gate=body.indexOf('if (!(await lifeOpen())) return <LifeSoon')
  expect(gate).toBeGreaterThan(-1)
  for(const later of ['resolveChapterAnchor()','<LifeStage'])expect(body.indexOf(later),later).toBeGreaterThan(gate)
 })
 it('a closed door says Coming soon and links nowhere',()=>{
  expect(entry).toContain("const SOON: LifeEntry = {state: 'soon', href: null}")
  expect(entry).toMatch(/if \(!\(await lifeOpen\(\)\)\) return SOON/)
 })
 it('the coming-soon screen carries no way into the game',()=>{
  expect(soon).not.toMatch(/\/life['"`]/);expect(soon).toContain('copy.lifeSoon')
 })
})
