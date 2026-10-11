import {afterEach,describe,expect,it} from 'vitest'
import {memoryStore,useDurableStore,type DurableStore} from '@/lib/master/durable'
import {ConflictError,inOrder,untilWon} from '@/lib/master/cas'
import {readJson,update} from '@/lib/players/store'

afterEach(()=>useDurableStore(null))
/** a store that loses the first n conditional writes, like a second instance writing at the same moment */
const losing=(n:number):DurableStore=>{const base=memoryStore();let lost=0;return {...base,kind:'vercel-blob',async write(name,text,etag){if(etag!==null&&lost<n){lost++;return false}return base.write(name,text,etag)}}}

describe('compare-and-swap that survives a busy store (owner, 11.10.2026)',()=>{
 it('a save that loses ten races in a row still lands (it used to give up after six, with no pause)',async()=>{
  useDurableStore(losing(10))
  await update('counter.json',{n:0},c=>({n:c.n+1}));await update('counter.json',{n:0},c=>({n:c.n+1}))
  expect(await readJson('counter.json',{n:0})).toEqual({n:2})
 },30000)
 it('two saves started together on one instance both land, in order (price and positions of one player)',async()=>{
  useDurableStore(memoryStore())
  await Promise.all([1,2,3,4,5].map(()=>update('p.json',{n:0},c=>({n:c.n+1}))))
  expect(await readJson('p.json',{n:0})).toEqual({n:5})
 })
 it('a store failure that is not a lost race reaches the screen as itself, not as "conflict"',async()=>{
  const base=memoryStore();useDurableStore({...base,kind:'vercel-blob',async write(){throw new Error('BlobError: token cannot write to this store')}})
  await expect(update('x.json',{},c=>c)).rejects.toThrow('token cannot write to this store')
 })
 it('after its budget a lost race says what to do, in words',async()=>{
  await expect(untilWon('The player file x',async()=>false,{budgetMs:0,minAttempts:2})).rejects.toBeInstanceOf(ConflictError)
  await expect(untilWon('The player file x',async()=>false,{budgetMs:0,minAttempts:2})).rejects.toThrow(/press Save again/)
 })
 it('jobs on one key run one after another',async()=>{
  const order:number[]=[];await Promise.all([1,2,3].map(i=>inOrder('k',async()=>{await new Promise(r=>setTimeout(r,10*(4-i)));order.push(i)})))
  expect(order).toEqual([1,2,3])
 })
})
