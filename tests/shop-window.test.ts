import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import type {PublicProduct} from '@/lib/shop/types'

const src=readFileSync('components/shop/ShopWindow.tsx','utf8'),page=readFileSync('app/page.tsx','utf8')
// the picker is a pure function inside a server component file: the same lines, run here
const windowPick=(products:PublicProduct[],limit:number)=>{const seen=new Set<string>();return [...products].sort((a,b)=>(Number(!!b.was)-Number(!!a.was))||(b.sold-a.sold)).filter(p=>{if(seen.has(p.design))return false;seen.add(p.design);return true}).slice(0,limit)}
const p=(id:string,design:string,sold:number,was:number|null=null)=>({id,design,sold,was,priceFrom:1000}) as unknown as PublicProduct

describe('the shop window on the front page (docs/rules/welcome-and-picker.md)',()=>{
 it('keeps the same picking lines as the component',()=>{expect(src).toContain("[...products].sort((a,b)=>(Number(!!b.was)-Number(!!a.was))||(b.sold-a.sold)).filter(p=>{if(seen.has(p.design))return false;seen.add(p.design);return true}).slice(0,limit)")})
 it('shows a sale first, then what sells, one product per design',()=>{
  const got=windowPick([p('a','d1',1),p('b','d2',9),p('c','d2',3),p('d','d3',0,1500),p('e','d4',5)],3).map(x=>x.id)
  expect(got).toEqual(['d','b','e'])
 })
 it('renders nothing while the shop is closed or empty',()=>{expect(src).toContain('if(!shop?.open||!shop.products.length)return null')})
 it('is on the new front page only, and the welcome names the shop only while it sells',()=>{
  expect(page).toContain('{short&&<Suspense fallback={null}><ShopWindow/></Suspense>}')
  expect(page).toContain('...(shopOpen?{s4:copy.welS4,s4Sub:copy.welS4Sub}:{})')
  expect(page).toContain('const [fd,shopOpen]=await Promise.all([door(\'frontDoors\'),shopIsOpen()])')
 })
})
