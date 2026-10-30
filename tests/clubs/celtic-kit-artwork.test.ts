import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'

describe('Celtic 2024/25 home kit illustration',()=>{
 const data=JSON.parse(readFileSync('content/manual/kit-archive-celtic.json','utf8')) as {kits:{id:string;shirt:{artwork?:{patternSleeves?:boolean;shoulderStripes?:boolean;hoopBands?:{y:number;height:number}[];sponsorSrc?:string}}}[]}
 const home=data.kits.find(k=>k.id==='cof-k-67')!
 const svg=readFileSync('public/club-kits/celtic/svg/cof-k-67.svg','utf8')
 it('stores the referenced details on this shirt only',()=>{
  expect(home.shirt.artwork).toMatchObject({patternSleeves:true,shoulderStripes:true})
  expect(home.shirt.artwork!.hoopBands).toHaveLength(3)
  expect(data.kits.filter(k=>k.id!=='cof-k-67'&&k.shirt.artwork?.patternSleeves)).toHaveLength(0)
 })
 it('exports the sponsor as a self-contained image and renders the chosen bands',()=>{
  expect(svg).toContain('data:image/svg+xml;base64,')
  expect(svg).toContain('y="150" width="340" height="60"')
  expect(svg).toContain('M111 30Q79 38 56 61')
  expect(svg).not.toContain('href="/club-kits/celtic/marks/')
 })
 it('includes the same shirt artwork in the static archive',()=>{
  const html=readFileSync('public/kit-archive/celtic/index.html','utf8')
  expect(html).toContain('"patternSleeves":true')
  expect(html).toContain(home.shirt.artwork!.sponsorSrc!)
 })
})
