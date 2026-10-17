import { describe, expect, it } from 'vitest'
import { telegramSessionActive } from '@/lib/telegram/session'

describe('tab-local Telegram app context',()=>{
  it('survives canonical pages and a reload without changing ordinary website visits',()=>{
    expect(telegramSessionActive('/telegram',false,false,'unavailable')).toBe(true)
    expect(telegramSessionActive('/market',true,false,'preview')).toBe(true)
    expect(telegramSessionActive('/me/file',false,true,'unavailable')).toBe(true)
    expect(telegramSessionActive('/clubs/celtic/history',false,false,'guest')).toBe(true)
    expect(telegramSessionActive('/market',false,false,'preview')).toBe(false)
    expect(telegramSessionActive('/',false,false,'unavailable')).toBe(false)
  })
  it('never treats an app session as permission to run native hooks on staff or auth pages',()=>{
    for(const path of ['/master/admin','/auth/callback','/api/master','/qa','/kits/admin']) expect(telegramSessionActive(path,true,true,'verify')).toBe(false)
  })
})
