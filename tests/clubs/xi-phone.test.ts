import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {classicOf,kitFor,rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {SHIRT_VIEW,shirtView} from '@/components/clubs/rumble/shared'
import type {KitView} from '@/lib/clubs/gate-content'
import type {KitParts} from '@/lib/clubs/kit-parts'

/** 16.11.2026 — the best-XI page on a phone, and every club shirt shown as the measured drawing, shirt only. */
const kit=(id:string,season:string,design='stripes'):KitView=>({id,season,type:'home',maker:null,design,colours:['red','white'],sources:[]})
const drawn=(ids:string[])=>(k:KitView)=>({...(ids.includes(k.id)?{svg:`/club-kits/x/svg/${k.id}.svg`}:{}),parts:{} as KitParts})

describe('shirt only, from the measured drawings',()=>{
 it('frames a drawing on its shirt, whatever the file holds',()=>{
  expect(shirtView('/club-kits/olympiacos/svg/cof-k-69.svg')).toBe(`/club-kits/olympiacos/svg/cof-k-69.svg${SHIRT_VIEW}`)
  expect(SHIRT_VIEW).toBe('#svgView(viewBox(0,20,336,298))')
  // never stacked twice
  expect(shirtView(shirtView('/a.svg'))).toBe(`/a.svg${SHIRT_VIEW}`)
 })
 it('a full-set drawing keeps its shirt where the crop expects it (0..340 × 20..320) and its shorts and socks outside it',()=>{
  const svg=readFileSync(join(process.cwd(),'public/club-kits/olympiacos/svg/cof-k-69.svg'),'utf8')
  if(!svg.includes('0 0 430 470'))return
  expect(svg).toContain('translate(70 318)')
  expect(svg).toContain('translate(336 128)')
 })
 it('at an equal distance the drawn kit wins over a painted one',()=>{
  const w=rumbleWardrobe([kit('a','2000/01'),kit('b','2001/02')],()=>false,drawn(['b']))
  const worn=kitFor({fromYear:2000,toYear:2002},'us',w)
  expect(worn.source==='archive'&&worn.kit.id).toBe('b')
 })
 it('a man no kit reaches wears the club\'s classic drawing — its most worn design — with no season claimed',()=>{
  const w=rumbleWardrobe([kit('p','1990/91','plain'),kit('s1','1995/96'),kit('s2','2005/06'),kit('s3','2015/16')],()=>false,drawn(['p','s1','s2','s3']))
  expect(w.classic?.home).toBe('/club-kits/x/svg/s1.svg')
  expect(kitFor({fromYear:null,toYear:null},'us',w)).toEqual({source:'livery',variant:'home',neutral:true})
  expect(classicOf([])).toBeUndefined()
  expect(rumbleWardrobe([kit('a','2000/01')],()=>false).classic).toBeUndefined()
 })
})

describe('the XI board on a phone',()=>{
 const css=readFileSync(join(process.cwd(),'components/clubs/gates/xi/xi.module.css'),'utf8')
 const board=readFileSync(join(process.cwd(),'components/clubs/gates/xi/ClubXI.tsx'),'utf8')
 it('folds the era chips into one picker and opens on the men who fit the slot',()=>{
  expect(board).toContain('eras={false}')
  expect(board).toContain('data-testid="xi-era"')
  expect(board).toMatch(/\[fitOnly,setFitOnly\]=useState\(true\)/)
 })
 it('fills the width with a wider field and a fixed tray of four shirts a row, and never scrolls sideways',()=>{
  expect(css).toContain('--fit-r: .88 !important')
  expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
  expect(css).not.toMatch(/overflow-x:\s*(auto|scroll)/)
 })
 it('every new copy key exists in both locales',()=>{
  for(const l of ['en','he']){const m=JSON.parse(readFileSync(join(process.cwd(),`messages/games/gates/xi.${l}.json`),'utf8'));expect(m['xi.undoShort'],l).toBeTruthy();expect(m['xi.era'],l).toBeTruthy()}
 })
})
