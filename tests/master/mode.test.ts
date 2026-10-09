import {afterEach,describe,expect,it,vi} from 'vitest'
import {evaluationMode} from '@/lib/master/mode'

afterEach(()=>vi.unstubAllEnvs())
const set=(flag:string|undefined,url:string,key:string)=>{
 vi.stubEnv('NEXT_PUBLIC_FAN_LIFE_EVALUATION',flag as string);vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',url);vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY',key)
}
describe('evaluation mode follows the Supabase connection unless told otherwise',()=>{
 it('stays a preview with no Supabase project',()=>{set('','','');expect(evaluationMode()).toBe(true)})
 it('is the real thing once URL and key are both present',()=>{set('','https://x.supabase.co','k');expect(evaluationMode()).toBe(false)})
 it('a half-connected project is still a preview',()=>{set('','https://x.supabase.co','');expect(evaluationMode()).toBe(true)})
 it('an explicit flag always wins',()=>{set('true','https://x.supabase.co','k');expect(evaluationMode()).toBe(true);set('false','','');expect(evaluationMode()).toBe(false)})
})
