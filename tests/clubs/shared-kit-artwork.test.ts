
import {existsSync,readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {kitArt} from '@/lib/clubs/kit-sources'
import {kitMark,kitPartsFor} from '@/lib/clubs/kit-parts'
import {kitFor,rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {KitView} from '@/lib/clubs/gate-content'
import {xiShare} from '@/lib/share/v3/adapters'
import {renderShare,type ShareAssets} from '@/lib/share/v3/render'
import {shirtArt} from '@/lib/highlights/board'

const kit=(id:string,season:string,type:string):KitView=>({
 id,season,type,colours:['red','white'],design:'stripes',maker:'Nike',sponsor:'IBI',sources:[],
})
const player={fromYear:2024,toYear:2024}
const pixel={shirt:'#aa0000',second:null,pattern:'plain' as const,shorts:'#222222',socks:'#222222'}

describe('shared kit artwork',()=>{
 it('maps every shipped drawing for the newer five collections by canonical id',()=>{
  for(const club of ['al-ahly','atalanta','maccabi-haifa','raja-casablanca','wydad-casablanca']){
   const folder='public/club-kits/'+club+'/svg/'
   const {kits}=JSON.parse(readFileSync(folder+'index.json','utf8')) as {kits:{id:string;season:string;type:string}[]}
   expect(kits.length).toBeGreaterThan(0)
   for(const row of kits){
    const match=kitArt(club,club+':'+row.id,row.season,row.type)
    expect(match?.svg).toBe('/club-kits/'+club+'/svg/'+row.id+'.svg')
    expect(existsSync(folder+row.id+'.svg')).toBe(true)
   }
  }
 })

 it('selects a dated kit by season, a keeper separately, and a sourced kit by id',()=>{
  const w=rumbleWardrobe([kit('past','2023/24','home'),kit('next','2024/25','home'),kit('keeper','2023/24','goalkeeper'),kit('alt','2023/24','away')],()=>false)
  for(const [ctx,id] of [
   [{playedOn:'2024-05-22'},'past'],
   [{playedOn:'2024-09-22'},'next'],
   [{playedOn:'2024-05-22',keeper:true},'keeper'],
   [{playedOn:'2024-05-22',kitId:'next'},'next'],
  ] as const)expect(kitFor(player,'us',w,ctx)).toMatchObject({source:'archive',kit:{id}})
  expect(kitFor(player,'them',w,{playedOn:'2024-05-22'})).toMatchObject({source:'archive',kit:{id:'alt'}})
  expect(kitFor({fromYear:null,toYear:null},'us',w)).toMatchObject({source:'livery'})
 })

 it('keeps the shirt, maker, sponsor and crest independently usable',()=>{
  const parts=kitPartsFor('hapoel-tel-aviv',kit('cof-k-31','2025/26','home'))
  expect(kitMark(parts,'maker')).toMatchObject({label:'Nike',art:{kind:'fill'}})
  expect(kitMark(parts,'sponsor')).toMatchObject({label:'IBI'})
  expect(parts.crest?.src).toBeTruthy()
  expect(kitMark({...parts,sponsor:null},'sponsor')).toBeNull()
 })

 it('embeds the resolved shirt in the share while leaving the rest of the lineup renderable',()=>{
  const svg='/club-kits/hapoel-tel-aviv/svg/cof-k-31.svg',data='data:image/svg+xml;base64,AAA='
  const eleven=Array.from({length:11},(_,i)=>'Name '+(i+1))
  const draft=xiShare('hapoel-tel-aviv',{formation:'4-4-2',lines:[eleven.slice(0,1),eleven.slice(1,5),eleven.slice(5,9),eleven.slice(9)],captain:null,kits:[{id:'cof-k-31',season:'2025/26',svg}]})
  const assets:ShareAssets={logo:'',shirt:'other-shirt',fontCss:'',kitImages:{[svg]:data},art:{'archive-objects':'','away-supporters':'','father-child':'',footballer:'','scarf-fan':'','shirt-exchange':'','terrace-crowd':'','vintage-shirt':''}}
  const image=renderShare(draft.template,draft.data,'story',{assets,measure:(s,n)=>s.length*n/2}).svg
  expect(image).toContain('href="'+data+'"')
  expect(image).toContain('href="other-shirt"')
  expect(image).not.toContain('href="'+svg+'"')
  expect(shirtArt({kit:pixel,kitSvg:svg})).toEqual({kind:'archive',svg})
  expect(shirtArt({kit:pixel,kitSvg:svg},{kit:pixel,kitSvg:svg,no:10,name:'A Player'},true)).toMatchObject({kind:'pixel',number:10})
 })
})
