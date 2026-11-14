import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {REGISTRY} from '@/lib/master/registry'
import {DEMO_VOTES,SEED_TOTAL,rank,seedVotes} from '@/lib/home/vote'
import {isOpenClub} from '@/lib/home/hub-open'
import en from '@/messages/clubs/en.json'

const ids=REGISTRY.map(c=>c.id)
describe('hub ballot seed',()=>{
 it('keeps the requested five in order, one point apart, within the 42-point opening budget',()=>{
  const votes=seedVotes(ids)
  const top=['raja-casablanca','wydad-casablanca','al-ahly','maccabi-haifa','fenerbahce']
  expect(rank(votes,ids).slice(0,5)).toEqual(top)
  expect(top.map(id=>votes[id])).toEqual([8,7,6,5,4])
  expect(Object.values(votes).reduce((a,b)=>a+b,0)).toBe(SEED_TOTAL)
  expect(seedVotes(['fenerbahce','celtic'])).toEqual({fenerbahce:4,celtic:3})
 })
 it('is deterministic',()=>{expect(seedVotes(ids)).toEqual(seedVotes(ids))})
 it('keeps the demo label while the seed is in use',()=>{expect(DEMO_VOTES).toBe(true);expect(en.voteDemo.length).toBeGreaterThan(0)})
 it('a club is open only when a gate has a real address',()=>{
  expect(isOpenClub(undefined)).toBe(false)
  expect(isOpenClub({id:'x',name:'x',city:'x',gates:{xi:{key:'xi',href:null,state:'LOCKED'}}})).toBe(false)
  expect(isOpenClub({id:'x',name:'x',city:'x',gates:{xi:{key:'xi',href:'/clubs/x/xi',state:'OPEN'}}})).toBe(true)
 })
})

describe('the vote lives inside the workshop tiles (owner, 8.10.2026)',()=>{
 const page=readFileSync('app/page.tsx','utf8'),grid=readFileSync('components/home/WorkshopGrid.tsx','utf8')
 it('has no separate ballot section and no vote nav link',()=>{
  expect(page).not.toMatch(/id="vote"/)
  expect(page).not.toMatch(/href="#vote"/)
  expect(page).toContain('<WorkshopGrid')
 })
 it('every workshop tile carries its own vote button of tap size',()=>{
  expect(grid).toMatch(/className="mag-shop-vote min-h-tap"/)
  expect(grid).toContain('VOTE_KEY')
 })
 it('counts through the real ballot (cast / mine / tally), keeps the labelled early count, and shows accounts and guests apart',()=>{
  const sync=readFileSync('lib/home/vote-sync.ts','utf8')
  for(const fn of ['worker_hub_vote_cast','worker_hub_vote_mine','worker_hub_vote_tally'])expect(sync).toContain(fn)
  expect(grid).toContain('castVote')
  expect(grid).toContain('vote-split')
  expect(grid).toContain('copy.demo')
  expect(grid).toContain('String(opening)')
 })
 it('never lets the device id travel anywhere but the hub-vote calls',()=>{
  const sync=readFileSync('lib/home/vote-sync.ts','utf8')
  expect(sync.match(/deviceId\(\)/g)?.length).toBe(2)
 })
})
