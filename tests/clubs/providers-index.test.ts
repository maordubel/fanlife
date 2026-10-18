import {describe,expect,it} from 'vitest'
import {providers} from '@/lib/clubs/providers'
import {STATIC_CLUB_IDS} from '@/lib/clubs/resolver'
describe('static club index',()=>{
 it('names exactly the clubs the provider table builds (the resolver keeps the list so the compile path loads lazily)',()=>{expect([...STATIC_CLUB_IDS]).toEqual(Object.keys(providers))})
})
