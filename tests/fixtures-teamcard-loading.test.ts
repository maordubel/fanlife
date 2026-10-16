import {afterEach,describe,expect,it,vi} from 'vitest'

const mock=vi.hoisted(()=>({card:vi.fn()}))
vi.mock('@/lib/fixtures/provider',()=>({teamCardFor:mock.card}))
afterEach(()=>{vi.useRealTimers();vi.resetModules();mock.card.mockReset()})

describe('optional provider cannot block the control room',()=>{
 it('bounds cold reads, shares the pending refresh and exposes its cache after it completes',async()=>{
  vi.useFakeTimers()
  let resolve!:(value:null)=>void
  mock.card.mockImplementationOnce(()=>new Promise<null>(done=>{resolve=done})).mockResolvedValue(null)
  const {teamCards}=await import('@/lib/fixtures/teamcards')
  const first=expect(teamCards()).rejects.toThrow('still loading')
  const second=expect(teamCards()).rejects.toThrow('still loading')
  await vi.advanceTimersByTimeAsync(1500)
  await Promise.all([first,second])
  expect(mock.card).toHaveBeenCalledTimes(1)
  resolve(null)
  await vi.advanceTimersByTimeAsync(0)
  const rows=await teamCards()
  expect(rows.length).toBeGreaterThan(1)
  const calls=mock.card.mock.calls.length
  expect(await teamCards()).toBe(rows)
  expect(mock.card).toHaveBeenCalledTimes(calls)
  expect(vi.getTimerCount()).toBe(0)
 })
 it('returns a fast refresh without waiting for the budget or leaving timers',async()=>{
  vi.useFakeTimers()
  mock.card.mockResolvedValue(null)
  const {teamCards}=await import('@/lib/fixtures/teamcards')
  expect((await teamCards()).length).toBeGreaterThan(1)
  expect(vi.getTimerCount()).toBe(0)
 })
})
