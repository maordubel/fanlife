import {describe,it,expect} from 'vitest'
import names from '@/content/manual/player-names-en-overrides.json'
import merges from '@/content/manual/rumble-merges.json'
import prices from '@/content/generated/player-prices.json'

describe('Hapoel player identity safeguards',()=>{
 const en=names['hapoel-tel-aviv'] as Record<string,string>
 it('keeps verified Latin spelling',()=>{
  expect(en['אביחי ידין']).toBe('Avihai Yadin')
  expect(en["מאוויס צ'יבוטה"]).toBe('Mavis Tchibota')
 })
 it('never declares a player merged into himself, or reuses a drop id',()=>{
  const rows=merges['hapoel-tel-aviv']
  const dropped=new Set<string>()
  for(const m of rows){
   expect(m.keep).not.toBe(m.drop)
   expect(dropped.has(m.drop)).toBe(false)
   dropped.add(m.drop)
  }
 })
 it('preserves the ten canonical legacy icons in the Worker price table',()=>{
  for(const slug of ['יעקב-חודורוב','ריפעת-טורק','משה-סיני','יוסי-אבוקסיס','סלים-טועמה','שלום-תקוה','דוד-פרימו','שייע-פייגנבוים','גילי-לנדאו','שבתאי-לוי']){
   expect((prices.prices as Record<string,number>)[slug]).toBe(5)
  }
 })
})
