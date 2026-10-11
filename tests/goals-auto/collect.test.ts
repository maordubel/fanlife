import {afterAll,beforeEach,describe,expect,it,vi} from 'vitest'
import {mkdtempSync,readdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {collectArchive} from '@/lib/research/archive'
import {resetFetcherState,type FetchLike} from '@/lib/research/fetcher'
import {dir,readJson} from '@/lib/research/store'
import type {ArchiveSource} from '@/lib/research/contract'
import type {Candidate} from '@/lib/goals-auto/types'

const tmp=mkdtempSync(path.join(tmpdir(),'goals-collect-'))
vi.stubEnv('FAN_LIFE_DATA_DIR',tmp)
afterAll(()=>{vi.unstubAllEnvs();rmSync(tmp,{recursive:true,force:true})})
beforeEach(()=>resetFetcherState())

const src:ArchiveSource={providerId:'goalwiki',familyId:'goalwiki',publisher:'Goal Wiki',reader:'wordpress-rest',origin:'https://wiki.example',role:'results',locale:'he',collections:['posts'],allowedPathPrefixes:['/wp-json/'],parserId:null,budget:{perPage:10,maxRequests:4,minDelayMs:0,timeoutMs:3000,maxResponseBytes:500000},retention:{rawBody:'metadata-only',downloadImages:false}}
const BODY='<p>20.11.2001</p><p>בדקה 78 שמעון גרשון נגח וכבש. בן לוז כדרר באגף ימין. בן לוז הרים מאחורי ההגנה. שמעון גרשון נגח בנקודת הפנדל.</p>'
const post=(tag:string)=>JSON.stringify([{id:1,link:'https://wiki.example/p/1/',title:{rendered:'דיווח'},content:{rendered:BODY+tag},date_gmt:'2026-01-01T00:00:00',modified_gmt:'2026-01-02T00:00:00'}])
const web=(tag:()=>string):FetchLike=>async url=>{
 const u=new URL(url);const body=u.pathname==='/robots.txt'?null:u.searchParams.get('page')==='1'?post(tag()):'{"code":"rest_post_invalid_page_number"}'
 return {status:u.pathname==='/robots.txt'?404:u.searchParams.get('page')==='1'?200:400,headers:{get:(n:string)=>({'content-type':'application/json','x-wp-total':'1','x-wp-totalpages':'1'} as Record<string,string>)[n.toLowerCase()]??null},arrayBuffer:async()=>new TextEncoder().encode(body??'').buffer} as never
}

describe('goal candidates are read while the page is in memory (every club, no body kept)',()=>{
 it('leaves candidates with their quote and locator, and no raw body on disk',async()=>{
  await collectArchive('club-g',[src],{maxRequests:4,fetchImpl:web(()=>'')})
  const found=await readJson<Candidate[]>(path.join(dir('club-g'),'goal-candidates.json'),[])
  expect(found).toHaveLength(1);expect(found[0]).toMatchObject({clubId:'club-g',playedOn:'2001-11-20',minute:'78',status:'sequence_candidate'})
  expect(found[0]!.steps.length).toBe(3);expect(found[0]!.evidence[0]!.quote).toContain('גרשון')
  expect(readdirSync(dir('club-g')).includes('snapshots')).toBe(false) // metadata-only retention is still true
 })
 it('an unchanged page adds nothing on the second pass; a changed page updates, never duplicates',async()=>{
  await collectArchive('club-h',[src],{maxRequests:4,fetchImpl:web(()=>'')})
  await collectArchive('club-h',[src],{maxRequests:4,fetchImpl:web(()=>'')})
  expect(await readJson<Candidate[]>(path.join(dir('club-h'),'goal-candidates.json'),[])).toHaveLength(1)
  await collectArchive('club-h',[src],{maxRequests:4,fetchImpl:web(()=>'<p>עדכון</p>')})
  expect(await readJson<Candidate[]>(path.join(dir('club-h'),'goal-candidates.json'),[])).toHaveLength(1)
 })
})
