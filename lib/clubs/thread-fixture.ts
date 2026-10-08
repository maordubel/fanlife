import {rngOf,type NodeType,type ThreadEdge,type ThreadGraph,type ThreadNode} from './thread-engine'

/**
 * A SYNTHETIC graph for tests and the dev-only QA board (`/qa/thread`). Every name says "Fixture", every edge says
 * "synthetic". It is never loaded for a real club: no real club has typed, approved evidence edges yet, and the
 * Thread stays honestly locked for them (THREAD_NO_VALID_LEVEL) until a reviewed `thread-graph.json` exists.
 */
export function syntheticGraph(seed = 1): ThreadGraph {
 const random=rngOf(seed*31+7)
 const nodes:ThreadNode[]=[]
 const add=(id:string,name:string,type:NodeType,from:number|null=null,to:number|null=null)=>{nodes.push({id,name,type,from,to})}
 for(let i=0;i<10;i+=1)add(`s${i}`,`Fixture season ${1990+i*3}`,'season',1990+i*3,1991+i*3)
 for(let i=0;i<4;i+=1)add(`t${i}`,`Fixture club ${String.fromCharCode(65+i)}`,'team')
 for(let i=0;i<5;i+=1)add(`pl${i}`,`Fixture ground ${i+1}`,'place')
 for(let i=0;i<24;i+=1){const a=1990+Math.floor(random()*27);add(`p${i}`,`Fixture person ${String(i+1).padStart(2,'0')}`,'person',a,a+4+Math.floor(random()*6))}
 for(let i=0;i<18;i+=1){const y=1990+Math.floor(random()*30);add(`m${i}`,`Fixture match ${String(i+1).padStart(2,'0')}`,'match',y,y)}
 for(let i=0;i<8;i+=1){const y=1990+Math.floor(random()*30);add(`o${i}`,`Fixture moment ${String(i+1).padStart(2,'0')}`,'moment',y,y)}
 const edges:ThreadEdge[]=[]
 const link=(a:string,b:string,kind:string)=>{if(a!==b&&!edges.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)))edges.push({a,b,kind,sources:['synthetic-fixture'],confidence:3,status:'approved'})}
 const near=(y:number)=>`s${Math.min(9,Math.max(0,Math.round((y-1990)/3)))}`
 for(const n of nodes){
  if(n.type==='person')for(let k=0;k<2;k+=1){link(n.id,near((n.from??1990)+k*3),'played in');link(n.id,`t${Math.floor(random()*4)}`,'played for')}
  if(n.type==='match'){link(n.id,near(n.from??1990),'played in');link(n.id,`pl${Math.floor(random()*5)}`,'played at');link(n.id,`p${Math.floor(random()*24)}`,'scored in');link(n.id,`p${Math.floor(random()*24)}`,'played in')}
  if(n.type==='moment'){link(n.id,near(n.from??1990),'happened in');link(n.id,`t${Math.floor(random()*4)}`,'involved')}
 }
 for(let i=0;i<4;i+=1)for(let j=0;j<2;j+=1)link(`t${i}`,`pl${(i+j)%5}`,'based at')
 for(let i=0;i<9;i+=1)link(`s${i}`,`s${i+1}`,'followed')
 // a link that must never be walkable: unsourced and unapproved
 edges.push({a:'p0',b:'p1',kind:'associated',sources:[],confidence:3,status:'approved'},{a:'p2',b:'p3',kind:'rumoured',sources:['x'],confidence:1,status:'draft'})
 return {nodes,edges}
}
