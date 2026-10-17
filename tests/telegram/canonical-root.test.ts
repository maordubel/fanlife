import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as React from 'react'

const request=vi.hoisted(()=>({path:'/our-games'}))
vi.mock('next/headers',()=>({headers:()=>new Headers({'host':'fanlife.dubelteam.com','x-fan-life-path':request.path}),cookies:()=>({get:()=>undefined})}))
vi.mock('@/lib/master/store',()=>({readState:async()=>({clubs:[{id:'hapoel-tel-aviv',status:'paused',gates:[]}],ads:{topAd:false}})}))
import RootLayout from '@/app/layout'

beforeAll(()=>vi.stubGlobal('React',React))
afterAll(()=>vi.unstubAllGlobals())
function contains(node:unknown,target:unknown):boolean {
  if(node===target)return true
  if(Array.isArray(node))return node.some(child=>contains(child,target))
  return React.isValidElement<{children?:unknown}>(node)&&contains(node.props.children,target)
}

describe('original multi-club pages inside a Telegram session',()=>{
  it('keeps Our Games and Legends English and independent of the Hapoel legacy switches',async()=>{
    for(const path of ['/our-games','/all-football','/all-football/legends','/all-football/legends/career/sample']){
      request.path=path
      const child=React.createElement('main',{id:'canonical-test'},'Original Fan Life page')
      const page=await RootLayout({children:child})
      expect(page.props.lang).toBe('en')
      expect(page.props.dir).toBe('ltr')
      expect(contains(page,child)).toBe(true)
    }
  })
  it('continues to apply the legacy publication guard to legacy Hapoel games',async()=>{
    request.path='/trivia'
    const child=React.createElement('main',{id:'legacy-test'},'Legacy game')
    expect(contains(await RootLayout({children:child}),child)).toBe(false)
  })
})
