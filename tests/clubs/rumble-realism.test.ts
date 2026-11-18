import {describe,expect,it} from 'vitest'
import {settle,POWER_SCALE,type Rated} from '@/lib/clubs/rumble'

/** 18.11.2026 — five-a-side reads like football: goals, draws and upsets possible, the better five clearly favoured */
const five=(rating:number,tag:string):Rated[]=>['GK','DF','MF','MF','FW'].map((p,i)=>({id:`${tag}${i}`,name:`${tag}${i}`,position:p as Rated['position'],price:3,fromYear:1990,toYear:1995,rating}))
function run(a:number,b:number,n=1500){let g=0,w=0,d=0,l=0,nil=0;for(let s=1;s<=n;s++){const r=settle(five(a,'a'),five(b,'b'),s*7919,15);const [x,y]=r.goals;g+=x+y;if(x+y===0)nil++;if(x>y)w++;else if(x===y)d++;else l++}return {g:g/n,w:w/n,d:d/n,l:l/n,nil:nil/n}}
describe('Royal Rumble five-a-side realism',()=>{
 it('two equal fives: about 2.6 goals, draws and 0–0s happen, neither side owns it',()=>{
  const r=run(70,70);expect(r.g).toBeGreaterThan(2.2);expect(r.g).toBeLessThan(3.2);expect(r.d).toBeGreaterThan(0.18);expect(r.nil).toBeGreaterThan(0.03);expect(Math.abs(r.w-r.l)).toBeLessThan(0.08)
 })
 it('the better five is favoured, never certain',()=>{
  const edge=30/POWER_SCALE/5,r=run(70+edge,70);expect(r.w).toBeGreaterThan(0.6);expect(r.w).toBeLessThan(0.9);expect(r.l).toBeGreaterThan(0.03)
 })
})
