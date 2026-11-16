import {describe,expect,it} from 'vitest'
import {streamed} from '@/lib/shop/personal/stream'

describe('a personal print answers as a stream when it is slow (16.11.2026)',()=>{
 it('keeps a quick answer as it is, streams a slow one, and carries errors',async()=>{
  const q=await streamed(async()=>new Response(JSON.stringify({error:'no'}),{status:422}))
  expect(q.status).toBe(422)
  const slow=await streamed(()=>new Promise(r=>setTimeout(()=>r(new Response(JSON.stringify({url:'u'}))),60)),10)
  expect(slow.status).toBe(200);expect(JSON.parse(await slow.text())).toEqual({url:'u'})
  const thrown=await streamed(()=>new Promise((_,j)=>setTimeout(()=>j(new Error('boom')),60)),10)
  expect(JSON.parse(await thrown.text()).error).toBe('boom')
 })
})
