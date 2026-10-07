import {afterAll,beforeEach,describe,expect,it,vi} from 'vitest'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {archiveParserFor} from '@/lib/research/parsers'
import {collectArchive,readObservations,readArchiveDocs} from '@/lib/research/archive'
import {exportArchiveStaging} from '@/lib/research/staging'
import {resetFetcherState,type FetchLike} from '@/lib/research/fetcher'

/**
 * Minimal reconstruction (facts only, no article prose) of the structure observed on the public AEKpedia listing,
 * 6.10.2026: post 7883 "Σπύρος Μιχαλάς", categories [31 Μ, 11 players], opening line "<strong>Σπύρος Μιχαλάς (1976/77)</strong>";
 * category index: 11 players, 8 coaches, 51 seasons, 9/10 coach-1/coach-2, letter categories.
 */
const p=archiveParserFor('aekpedia-football-v1')!
const doc=(over:Partial<Parameters<typeof p.parse>[0]>={})=>({url:'https://www.aekpedia.com/spyros-michalas/',title:'Σπύρος Μιχαλάς',html:'<p style="text-align: center;"><strong>Σπύρος Μιχαλάς (1976/77)</strong></p>\n<p>…</p>',providerKey:'aekpedia:posts:7883',meta:{slug:'spyros-michalas',categories:['%ce%bc','players'],parent:null},...over})

describe('aekpedia-football-v1',()=>{
 it('reads a player by the site’s own category, with the span the opening line prints — identity unresolved',()=>{
  const r=p.parse(doc())
  expect(r.observations).toEqual([expect.objectContaining({recordType:'player',nameAsReported:'Σπύρος Μιχαλάς',seasonsAsReported:'1976/77',identityState:'unresolved',status:'candidate',canonicalId:null,providerRecordKey:'aekpedia:posts:7883'})])
 })
 it('keeps a multi-span as written, reads coaches, and reads a season review label',()=>{
  expect(p.parse(doc({html:'<p><strong>Χ (1988/89 – 1990/91)</strong></p>'})).observations[0]!.seasonsAsReported).toBe('1988/89–1990/91')
  expect(p.parse(doc({meta:{slug:'x',categories:['coaches','coach-1'],parent:null}})).observations[0]!.recordType).toBe('coach')
  const s=p.parse(doc({title:'Σεζόν 1974-75',html:'<p>…</p>',meta:{slug:'season-1974-75',categories:['seasons','1971-1980'],parent:null}}))
  expect(s.observations[0]).toMatchObject({recordType:'season',seasonAsReported:'1974/75'})
 })
 it('extracts nothing from a document the site does not classify, and nothing it cannot read',()=>{
  expect(p.parse(doc({meta:{slug:'x',categories:['uncategorised'],parent:null}})).observations).toEqual([])
  const r=p.parse(doc({html:'<p>no span here</p>'}));expect(r.observations[0]!.seasonsAsReported).toBeNull();expect(r.diagnostics.join(' ')).toMatch(/no \(YYYY\/YY\) span/)
 })
})

describe('the collector runs the parser and stages candidates',()=>{
 const d=mkdtempSync(path.join(tmpdir(),'aek-'));vi.stubEnv('FAN_LIFE_DATA_DIR',d);vi.stubEnv('RESEARCH_DATA_DIR','')
 afterAll(()=>{vi.unstubAllEnvs();rmSync(d,{recursive:true,force:true})})
 beforeEach(()=>resetFetcherState())
 const src={providerId:'aekpedia',familyId:'aekpedia-editorial',publisher:'AEKpedia',reader:'wordpress-rest' as const,origin:'https://www.aekpedia.com',role:'mixed' as const,locale:'el-GR',collections:['posts' as const],allowedPathPrefixes:['/wp-json/wp/v2/'],parserId:'aekpedia-football-v1',budget:{perPage:25,maxRequests:5,minDelayMs:0,timeoutMs:5000,maxResponseBytes:1_000_000},retention:{rawBody:'metadata-only' as const,downloadImages:false as const}}
 const res=(status:number,body:unknown,headers:Record<string,string>={})=>({status,headers:{get:(n:string)=>({'content-type':'application/json',...headers} as Record<string,string>)[n.toLowerCase()]??null},arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(body)).buffer as ArrayBuffer,text:async()=>JSON.stringify(body)})
 it('reads the categories once, parses each post, and exports people as unresolved candidates',async()=>{
  const calls:string[]=[]
  const f:FetchLike=async url=>{const u=new URL(url);if(u.pathname==='/robots.txt')return res(404,'');calls.push(u.pathname)
   if(u.pathname.endsWith('/categories'))return res(200,[{id:11,slug:'players'},{id:31,slug:'%ce%bc'},{id:51,slug:'seasons'}])
   if(u.searchParams.get('page')==='1')return res(200,[{id:7883,link:'https://www.aekpedia.com/spyros-michalas/',slug:'spyros-michalas',title:{rendered:'Σπύρος Μιχαλάς'},content:{rendered:'<p><strong>Σπύρος Μιχαλάς (1976/77)</strong></p>'},categories:[31,11]},{id:9001,link:'https://www.aekpedia.com/season-1974-75/',slug:'season-1974-75',title:{rendered:'1974-75'},content:{rendered:'<p>…</p>'},categories:[51]}],{'x-wp-total':'2','x-wp-totalpages':'1'})
   return res(400,{code:'rest_post_invalid_page_number'})}
  const r=await collectArchive('aek-athens',[src],{maxRequests:5,fetchImpl:f})
  expect(calls.filter(c=>c.endsWith('/categories'))).toHaveLength(1)
  expect(r.counts.recordsExtracted).toBe(2);expect(r.approvedForProduction).toBe(0)
  expect(Object.values(await readArchiveDocs('aek-athens')).every(x=>x.parse==='parsed')).toBe(true)
  expect(Object.keys(await readObservations('aek-athens')).sort()).toEqual(['obs:aekpedia:posts:7883:player','obs:aekpedia:posts:9001:season'])
  const out=await exportArchiveStaging('aek-athens',[src])
  const people=JSON.parse(readFileSync(path.join(out.dir,'archive-players.json'),'utf8'))
  expect(people).toEqual([expect.objectContaining({nameAsReported:'Σπύρος Μιχαλάς',seasonsAsReported:'1976/77',identityState:'unresolved',status:'candidate'})])
  expect(JSON.parse(readFileSync(path.join(out.dir,'manifest.json'),'utf8')).approvedForProduction).toBe(0)
 })
})
