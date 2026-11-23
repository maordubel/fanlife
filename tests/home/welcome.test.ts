import {describe,it,expect} from 'vitest'
import {readFileSync,existsSync,readdirSync} from 'node:fs'
import {WELCOME_BOOT,WELCOME_KEY,scene,bit} from '@/lib/home/art'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

const css=readFileSync('app/weekly/welcome.css','utf8'),page=readFileSync('app/page.tsx','utf8')
const boot=(search:string,stored:string|null,broken=false)=>{
 const attrs:Record<string,string|undefined>={},on:Record<string,(e:unknown)=>void>={},saved:Record<string,string>={}
 const root={setAttribute:(k:string,v:string)=>{attrs[k]=v},getAttribute:(k:string)=>attrs[k]??null,removeAttribute:(k:string)=>{delete attrs[k]}}
 const run=new Function('location','localStorage','document','setTimeout',WELCOME_BOOT)
 run({search},{getItem:(k:string)=>{if(broken)throw new Error('no storage');return k===WELCOME_KEY?stored:null},setItem:(k:string,v:string)=>{saved[k]=v}},
  {documentElement:root,addEventListener:(k:string,f:(e:unknown)=>void)=>{on[k]=f},getElementById:()=>null},(f:()=>void)=>f())
 return {state:()=>attrs['data-welcome']??null,on,saved}
}

describe('the welcome (docs/rules/welcome-and-picker.md)',()=>{
 it('rises on a first visit, stays down for a returning supporter, and can be called back',()=>{
  expect(boot('',null).state()).toBe('in')
  expect(boot('','1').state()).toBeNull()
  expect(boot('?welcome=1','1').state()).toBe('in')
 })
 it('never throws and never shows when storage is refused',()=>{expect(boot('',null,true).state()).toBeNull()})
 it('answers Kick off, Skip and Escape itself — before any bundle has loaded',()=>{
  const tap=(act:string)=>({target:{closest:(q:string)=>q==='[data-welcome-act]'?{getAttribute:()=>act}:null}})
  const a=boot('',null);a.on.click!(tap('go'));expect(a.state()).toBeNull();expect(a.saved[WELCOME_KEY]).toBe('1')
  const b=boot('',null);b.on.keydown!({key:'Escape'});expect(b.state()).toBeNull()
  const c=boot('',null);c.on.click!({target:{closest:()=>null}});expect(c.state()).toBe('in')   // a tap elsewhere keeps it up
 })
 it('streams: the welcome and the loading cover do not wait for the paper',()=>{
  expect(page).toMatch(/export default function Page\(/)
  expect(page).toContain('<Suspense fallback={null}><WelcomeDoor copy={copy}/></Suspense>')
  expect(page).toMatch(/<Suspense fallback=\{<div className="wkfl" data-front-loading=""[^>]*><PressWait label=\{copy\.frontLoading\}\/><\/div>\}><Home searchParams=\{searchParams\}\/><\/Suspense>/)
  expect(page.indexOf('async function WelcomeDoor')).toBeGreaterThan(-1)
  expect(css).toContain('html:has([data-front-loading]) .wko-wait { display: flex; }')
 })
 it('is hidden unless raised, and loads its pictures only when raised',()=>{
  expect(css).toMatch(/^\.wko \{ display: none; \}/m)
  for(const line of css.split('\n').filter(l=>l.includes('url(')))expect(line,line.slice(0,60)).toMatch(/^\s*html\[data-welcome\]/)
 })
 it('uses class prefixes nobody else owns',()=>{
  const others=['app/weekly','app/clubs','app'].flatMap(d=>readdirSync(d).filter(f=>f.endsWith('.css')&&f!=='welcome.css').map(f=>readFileSync(`${d}/${f}`,'utf8'))).join('\n')
  for(const p of ['wko','wkq','wkx','wkz','wkfl'])expect(others,p).not.toMatch(new RegExp(`\\.${p}(-|\\b)`))
 })
 it('has no hex colour and no physical side',()=>{expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|margin-(left|right)|padding-(left|right)|(?<![a-z-])(left|right):/i)})
 it('is on the new front page only, above the page grid',()=>{
  expect(page).toContain('if(!fd.open)return null')
  expect(page).toMatch(/\{short\?<ClubPicker live=/)
  expect(page).toMatch(/\{short\?<ContentsTiles title=/)
 })
 it('has its words in both catalogues',()=>{
  for(const k of ['welK','welTo','welLead','welS1','welS2','welS3','welGo','welSkip','pickSub','pickSurprise','pickAllClubs','pickNoClub','pickSoonT','pickVote','tileGames','tileLegends','tileAlbum','tileShop','tileMarket','tileFilms','tileCorner']){
   expect((en as Record<string,string>)[k],k).toBeTruthy();expect((he as Record<string,string>)[k],k).toBeTruthy()}
 })
 it('ships every picture it names',()=>{
  for(const s of ['matchday','terrace','duel','lineup','kit-detail','match-archive','sticker-pack'] as const)for(const u of scene(s).srcSet.split(', '))expect(existsSync('public'+u.split(' ')[0]),u).toBe(true)
  for(const b of ['vintage-football','supporter-scarf','football-boots','terrace-flag','trophy','match-ticket','referee-whistle','corner-flag','keeper'] as const)for(const u of bit(b).srcSet.split(', '))expect(existsSync('public'+u.split(' ')[0]),u).toBe(true)
  expect(existsSync('public/brand/fanlife/art/matchday-1536.webp')).toBe(true)
 })
})
