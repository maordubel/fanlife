import { describe, expect, it } from 'vitest'
import { parseTelegramVisit, rememberTelegramVisit, TELEGRAM_MEMORY_KEY } from '@/lib/telegram/memory'

describe('local Telegram preferences',()=>{
  it('accepts only versioned registered clubs and supported games',()=>{
    expect(parseTelegramVisit(JSON.stringify({v:1,club:'celtic',game:'xi',name:'private'}))).toEqual({v:1,club:'celtic',game:'xi'})
    for(const value of [null,'{','{}',JSON.stringify({v:2,club:'celtic'}),JSON.stringify({v:1,club:'unknown'})]) expect(parseTelegramVisit(value)).toBeNull()
    expect(parseTelegramVisit(JSON.stringify({v:1,club:'celtic',game:'https://attacker.test'}))).toEqual({v:1,club:'celtic'})
  })
  it('keeps the same club last game, and clears it when choosing a different club',()=>{
    let value:string|null=null
    const storage={getItem:(key:string)=>key===TELEGRAM_MEMORY_KEY?value:null,setItem:(_key:string,raw:string)=>{value=raw}}
    rememberTelegramVisit(storage,'celtic','xi')
    rememberTelegramVisit(storage,'celtic')
    expect(parseTelegramVisit(value)).toEqual({v:1,club:'celtic',game:'xi'})
    rememberTelegramVisit(storage,'olympiacos')
    expect(parseTelegramVisit(value)).toEqual({v:1,club:'olympiacos'})
    rememberTelegramVisit(storage,'unknown','xi')
    expect(parseTelegramVisit(value)?.club).toBe('olympiacos')
  })
  it('continues to work when storage is unavailable',()=>{
    const storage={getItem:()=>{throw Error('private mode')},setItem:()=>{throw Error('quota')}}
    expect(()=>rememberTelegramVisit(storage,'celtic','xi')).not.toThrow()
  })
})
