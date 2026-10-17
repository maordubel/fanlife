import {afterEach,describe,expect,it} from 'vitest'
import {signingKey} from '@/lib/secrets'
import {qaAllowed} from '@/lib/qa'
const env=process.env.VERCEL_ENV
afterEach(()=>{if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env})
describe('signing keys',()=>{
 it('uses the first configured key',()=>{expect(signingKey([undefined,'real'],'dev')).toBe('real')})
 it('falls back off the live site',()=>{process.env.VERCEL_ENV='preview';expect(signingKey([undefined],'dev')).toBe('dev')})
 it('fails closed on the live site',()=>{process.env.VERCEL_ENV='production';expect(()=>signingKey([undefined,''],'dev')).toThrow()})
 it('never opens proofing screens on the live site',()=>{process.env.VERCEL_ENV='production';expect(qaAllowed()).toBe(false)})
})
