import {afterEach,describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {researchRoot,collectorStagingRoot,isReadOnlyError} from '@/lib/research/paths'
afterEach(()=>vi.unstubAllEnvs())
describe('research data location',()=>{
 it('defaults to the committed research-data/ folder, and honours the overrides',()=>{
  vi.stubEnv('RESEARCH_DATA_DIR','');vi.stubEnv('FAN_LIFE_DATA_DIR','')
  expect(researchRoot()).toBe(path.resolve('research-data','research'));expect(collectorStagingRoot()).toBe(path.resolve('research-data','research-staging'))
  vi.stubEnv('RESEARCH_DATA_DIR','/x');expect(researchRoot()).toBe('/x/research')
 })
 it('a read-only server is recognised, not reported as a source failure',()=>{
  expect(isReadOnlyError(Object.assign(new Error('x'),{code:'EROFS'}))).toBe(true);expect(isReadOnlyError(new Error('HTTP 403'))).toBe(false)
 })
 it('the GitHub workflow commits only research-data/ and never approves',()=>{
  const wf=readFileSync('.github/workflows/archive-collect.yml','utf8')
  expect(wf).toContain('git add research-data');expect(wf).not.toMatch(/git add (-A|\.)/);expect(wf).toContain('RESEARCH_DATA_DIR: research-data')
  const cfg=readFileSync('next.config.mjs','utf8');expect(cfg).toContain("'./research-data/**/*'")
 })
})
