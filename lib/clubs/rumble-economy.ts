/**
 * Royal Rumble economy (rulebook rumble-economy-v1, 10.10.2026): five a side €15M, eleven €35M, both hard — a budget is never raised.
 * A price is a whole number of millions from 1 to 5 and is the club's own frozen list (`rumble-xi/prices.ts`). Every board offers at least
 * ONE €5M man who can really be bought: in a legal slot, and with a complete squad still possible inside the budget around him.
 */
export const ICON_PRICE=5

export type Priced={id:string;price:number}
/** the cheapest each slot's offers allow, summed — slots draw on disjoint men, so this is the exact floor of the squad */
export const floorOf=(board:readonly (readonly Priced[])[])=>board.reduce((t,cards)=>t+(cards.length?Math.min(...cards.map(c=>c.price)):Infinity),0)
/** can this man be bought and the other slots still be filled, at their cheapest, inside the budget? */
export function canBuy(board:readonly (readonly Priced[])[],slot:number,card:Priced,budget:number):boolean{
 let rest=0
 board.forEach((cards,i)=>{if(i!==slot)rest+=cards.length?Math.min(...cards.map(c=>c.price)):Infinity})
 return rest+card.price<=budget
}
/** is there at least one €5M offer that can really be bought? */
export const hasBuyableIcon=(board:readonly (readonly Priced[])[],budget:number)=>board.some((cards,i)=>cards.some(c=>c.price===ICON_PRICE&&canBuy(board,i,c,budget)))

/**
 * Makes sure the board holds a buyable €5M man. If it already does, it is left alone; otherwise one seeded slot swaps its dearest offer for
 * a seeded €5M man who fits that slot — and only if the squad is still completable around him. A price is never touched and the budget never grows.
 */
export function withFeatured<T extends Priced>(board:readonly (readonly T[])[],candidates:readonly T[],fitsSlot:(c:T,slot:number)=>boolean,rnd:()=>number,budget:number,ordered=false):T[][]|null{
 const copy=board.map(c=>[...c])
 if(floorOf(copy)>budget)return null
 if(hasBuyableIcon(copy,budget))return copy
 const inBoard=new Set(copy.flat().map(c=>c.id))
 const icons=candidates.filter(c=>c.price===ICON_PRICE&&!inBoard.has(c.id)),mix=<X,>(a:readonly X[])=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[x[i],x[j]]=[x[j]!,x[i]!]}return x}
 for(const icon of (ordered?icons:mix(icons)))for(const slot of mix(copy.map((_,i)=>i))){
  if(!fitsSlot(icon,slot))continue
  const cards=copy[slot]!,dearest=[...cards].sort((a,b)=>b.price-a.price)[0]
  const next=copy.map((c,i)=>i===slot?(dearest?c.map(x=>x.id===dearest.id?icon:x):[icon]):c)
  if(canBuy(next,slot,icon,budget)&&floorOf(next)<=budget)return next
 }
 return null
}
