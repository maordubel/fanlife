import {cardFits,GROUPS,type DCard,type Group} from './types'

const BIG=1e6
/**
 * Cheapest way to fill `slots` (a list of groups) with DIFFERENT men from `cards`, each man fitting the group he fills — the minimum-cost
 * assignment (Hungarian), so a man who can stand in two groups (`alt`) or anywhere outfield (`free`) is counted once, where he helps most.
 * Only the cheapest `slots.length` men per needed group can matter, so the matrix stays tiny whatever the size of the club.
 * Returns null when no complete filling exists.
 */
export function minCompletion(slots:readonly Group[],cards:readonly DCard[]):number|null{
 const n=slots.length;if(!n)return 0
 const need=GROUPS.filter(g=>slots.includes(g)),cand=new Map<string,DCard>()
 for(const g of need)for(const c of cards.filter(x=>cardFits(x,g)).sort((a,b)=>a.price-b.price||a.id.localeCompare(b.id)).slice(0,n))cand.set(c.id,c)
 const m=cand.size;if(m<n)return null
 const col=[...cand.values()],a=(i:number,j:number)=>cardFits(col[j-1]!,slots[i-1]!)?col[j-1]!.price:BIG
 const u=new Array<number>(n+1).fill(0),v=new Array<number>(m+1).fill(0),p=new Array<number>(m+1).fill(0),way=new Array<number>(m+1).fill(0)
 for(let i=1;i<=n;i++){
  p[0]=i;let j0=0;const minv=new Array<number>(m+1).fill(Infinity),used=new Array<boolean>(m+1).fill(false)
  do{
   used[j0]=true;const i0=p[j0]!;let delta=Infinity,j1=0
   for(let j=1;j<=m;j++)if(!used[j]){const cur=a(i0,j)-u[i0]!-v[j]!;if(cur<minv[j]!){minv[j]=cur;way[j]=j0}if(minv[j]!<delta){delta=minv[j]!;j1=j}}
   for(let j=0;j<=m;j++)if(used[j]){u[p[j]!]!+=delta;v[j]!-=delta}else minv[j]!-=delta
   j0=j1
  }while(p[j0]!==0)
  do{const j1=way[j0]!;p[j0]=p[j1]!;j0=j1}while(j0)
 }
 let cost=0
 for(let j=1;j<=m;j++)if(p[j]){const c=a(p[j]!,j);if(c>=BIG)return null;cost+=c}
 return cost
}
