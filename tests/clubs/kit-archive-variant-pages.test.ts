import {describe,expect,it} from 'vitest'
import {existsSync,readFileSync} from 'node:fs'

type Kit={id:string;season:string;type:string;sponsor:string|null;photo?:string}
const clubs=['aek-athens','celtic','panathinaikos','st-pauli','zrinjski-mostar','olympiacos','hapoel-tel-aviv','hapoel-petah-tikva']
function page(club:string){
 const html=readFileSync(`public/kit-archive/${club}/index.html`,'utf8')
 const match=html.match(/const DATA=(.*);/)
 expect(match,`${club} archive data`).not.toBeNull()
 return JSON.parse(match![1]!) as {kits:Kit[]}
}

describe('static kit archive variants',()=>{
 it('keeps Olympiacos home shirts with different sponsors distinct',()=>{
  const kits=page('olympiacos').kits.filter(k=>k.season==='2013/14'&&k.type==='home')
  expect(kits.map(k=>k.sponsor)).toEqual(expect.arrayContaining(['ΣΤΟΙΧΗΜΑ','unicef']))
  expect(kits.every(k=>!k.photo)).toBe(true)
 })
 it.each(clubs)('%s never assigns a season photo to multiple shirt variants',club=>{
  const kits=page(club).kits
  for(const k of kits.filter(k=>k.photo))expect(kits.filter(other=>other.season===k.season&&other.type===k.type)).toHaveLength(1)
 })
 it.each(clubs)('%s leaves multiple candidate photos unassigned',club=>{
  type Photo={season:string;type:string;image:string;longSleeve?:boolean}
  const photos:Photo[]=[]
  for(const source of ['cfs','shop']){
   const path=`content/manual/kit-${source}-${club}.json`
   if(existsSync(path))photos.push(...(JSON.parse(readFileSync(path,'utf8')) as {kits:Photo[]}).kits)
  }
  for(const kit of page(club).kits){
   const matches=new Set(photos.filter(p=>!p.longSleeve&&p.season===kit.season&&p.type===kit.type).map(p=>p.image))
   if(matches.size>1)expect(kit.photo,`${club} ${kit.id}`).toBeUndefined()
  }
 })
})
