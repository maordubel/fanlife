import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {BOOT_START,VOXEL_MESSAGE,bootReducer,classifyRendererError,failureCopyKey,probeWebgl,voxelFailure,type BootAction,type BootState} from '@/components/clubs/life/boot'
import en from '@/messages/life-universal/en.json'
import he from '@/messages/life-universal/he.json'
/**
 * Audit F13 (7.10.2026): a phone whose browser could not create a WebGL context showed the chapter card
 * with "Opening the room" disabled, the retry button hidden behind it, and after 30 s a network-timeout
 * message. The renderer failure is now detected early, shown above the card, and never called a timeout.
 */
const ROOT=path.resolve(__dirname,'..','..')
const src=(p:string)=>readFileSync(path.join(ROOT,p),'utf8')
const run=(...actions:BootAction[])=>actions.reduce<BootState>(bootReducer,BOOT_START)

describe('probeWebgl — ask the browser before loading the room',()=>{
 it('is true when any WebGL context can be created, and releases it',()=>{
  let lost=0,asked:string[]=[]
  const canvas={getContext:(k:string)=>{asked.push(k);return k==='webgl'?{getExtension:()=>({loseContext:()=>{lost++}})}:null}}
  expect(probeWebgl(()=>canvas)).toBe(true)
  expect(asked).toEqual(['webgl2','webgl'])
  expect(lost).toBe(1)
 })
 it('is false when every context is refused, when getContext throws, or there is no canvas',()=>{
  expect(probeWebgl(()=>({getContext:()=>null}))).toBe(false)
  expect(probeWebgl(()=>({getContext:()=>{throw new Error('blocked')}}))).toBe(false)
  expect(probeWebgl(()=>null)).toBe(false)
  expect(probeWebgl(()=>{throw new Error('no document')})).toBe(false)
 })
})

describe('bootReducer — a renderer failure is never a network timeout',()=>{
 it('fails as a device problem when the probe fails, and a later timeout does not relabel it',()=>{
  expect(run({type:'webgl-unavailable'})).toEqual({phase:'failed',failure:'webgl'})
  expect(run({type:'webgl-unavailable'},{type:'timeout'})).toEqual({phase:'failed',failure:'webgl'})
  expect(run({type:'webgl-unavailable'},{type:'renderer-error',message:'boom'})).toEqual({phase:'failed',failure:'webgl'})
 })
 it('classifies the renderer\'s own error (three.js says "Error creating WebGL context.")',()=>{
  expect(run({type:'renderer-error',message:'Error creating WebGL context.'})).toEqual({phase:'failed',failure:'webgl'})
  expect(run({type:'renderer-error',message:'The 3D engine did not load (no WebGL renderer).'}).failure).toBe('webgl')
  expect(run({type:'renderer-error',message:"Cannot read properties of undefined (reading 'walk')"}).failure).toBe('room')
  expect(classifyRendererError(undefined)).toBe('room')
 })
 it('only times out while still loading',()=>{
  expect(run({type:'timeout'})).toEqual({phase:'failed',failure:'timeout'})
  expect(run({type:'ready'},{type:'timeout'})).toEqual({phase:'ready',failure:null})
  expect(run({type:'renderer-error',message:'Error creating WebGL context.'},{type:'timeout'}).failure).toBe('webgl')
 })
 it('corrects a timeout when the renderer reports late',()=>{
  expect(run({type:'timeout'},{type:'renderer-error',message:'Error creating WebGL context.'})).toEqual({phase:'failed',failure:'webgl'})
 })
 it('starts again on retry, and a room that reports ready is ready',()=>{
  expect(run({type:'webgl-unavailable'},{type:'retry'})).toEqual(BOOT_START)
  expect(run({type:'timeout'},{type:'ready'})).toEqual({phase:'ready',failure:null})
 })
})

describe('the message the room posts',()=>{
 it('reads only our own boot-failure shape',()=>{
  expect(voxelFailure({type:VOXEL_MESSAGE,event:'error',message:'Error creating WebGL context.'})).toEqual({message:'Error creating WebGL context.'})
  expect(voxelFailure({type:VOXEL_MESSAGE,event:'ready'})).toBeNull()
  expect(voxelFailure({type:'other',event:'error'})).toBeNull()
  expect(voxelFailure('fan-life:voxel')).toBeNull()
  expect(voxelFailure(null)).toBeNull()
  expect(voxelFailure({type:VOXEL_MESSAGE,event:'error',message:'x'.repeat(1000)})!.message).toHaveLength(300)
 })
 it('is what play.js actually posts, to its own origin, on a boot failure',()=>{
  const play=src('public/life/voxel/play.js')
  expect(play).toContain(`postMessage({type:'${VOXEL_MESSAGE}',event:'error',message:msg},location.origin)`)
  expect(play).toContain('window.__bootError=msg')
  expect(play).toMatch(/\.catch\(function\(er\)\{vxBootFailed\(er\);/)
 })
})

describe('the shell shows the failure above the card, with Back and Try again',()=>{
 const game=src('components/clubs/life/LifeGame.tsx')
 it('probes before loading, listens to the room, and checks origin and source',()=>{
  expect(game).toContain("probeWebgl(() => document.createElement('canvas'))")
  expect(game).toContain("window.addEventListener('message', onMessage)")
  expect(game).toContain('e.origin !== window.location.origin || e.source !== frame.current?.contentWindow')
  expect(game).not.toContain("setFailed('timeout')")
 })
 it('renders one alertdialog above the chapter card (z-60) with both buttons',()=>{
  const dialog=game.match(/<section className=\{`\$\{styles\.failed\} z-\[(\d+)\]`\} role="alertdialog"[^>]*>/)
  expect(dialog,'the failure dialog').not.toBeNull()
  expect(Number(dialog![1])).toBeGreaterThan(60)
  expect(game).toContain('data-life="boot-back"')
  expect(game).toContain('data-life="boot-retry"')
  expect(game).toContain('retryEl.current?.focus()')
 })
 it('says the browser could not start the room — and keeps the timeout sentence for timeouts only',()=>{
  expect(en.noWebgl).toBe("This device's browser could not start the 3D room.")
  expect(failureCopyKey('webgl')).toBe('noWebgl')
  expect(failureCopyKey('room')).toBe('roomFailed')
  expect(failureCopyKey('timeout')).toBe('loadFailed')
  for(const copy of [en,he] as Record<string,string>[])for(const k of ['noWebgl','roomFailed','loadFailed','failTitle','back','retry'])expect(copy[k],k).toBeTruthy()
 })
})
