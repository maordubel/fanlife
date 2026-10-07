import {afterEach,describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {mkdtempSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {exportOverlays,loadClubProfile,profiledClubs,saveArchiveSource} from '@/lib/research/profiles'

const env={...process.env}
afterEach(()=>{process.env={...env};useDurableStore(undefined as unknown as null)})
const src={providerId:'club-wp',reader:'wordpress-rest',origin:'https://example.org',family:'club',collections:['posts'],maxRequestsPerRun:5} as never

describe('admin ⇄ runner: the run uses the sources the owner saved (Editor’s Desk plan §2)',()=>{
 it('the control room exports every saved overlay with a version',async()=>{
  useDurableStore(memoryStore())
  await saveArchiveSource('test-club',src)
  const a=await exportOverlays();expect(Object.keys(a.profiles)).toContain('test-club');expect(a.version).toMatch(/^[0-9a-f]{16}$/)
  const b=await exportOverlays();expect(b.version).toBe(a.version)
 })
 it('the runner reads the pinned overlay files, not a store, and lists their clubs',async()=>{
  useDurableStore(null)
  const dir=mkdtempSync(path.join(tmpdir(),'ov-'));process.env.RESEARCH_OVERLAY_DIR=dir
  writeFileSync(path.join(dir,'pinned-club.json'),JSON.stringify({clubId:'pinned-club',sources:[],archive:[{providerId:'p1',reader:'html-index',origin:'https://example.com'}]}))
  const p=await loadClubProfile('pinned-club');expect(p?.origin.admin).toBe(true);expect(p?.archive.map(x=>x.providerId)).toEqual(['p1'])
  expect(await profiledClubs()).toContain('pinned-club')
 })
})
