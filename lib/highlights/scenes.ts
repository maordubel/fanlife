import {hash,rng} from '@/lib/clubs/rumble-rng'
import type {GoalGraphic,Moment,MomentKind,PixelKit,Reel,ReelPlayer,Shape} from './types'
import {attackDir,type Dir} from './pitch'

/**
 * The scene library (owner, 12.10.2026: "many possible scenes, so every match feels different — not the same action again").
 * Pure and deterministic from the reel's seed and the moment's place in it.
 *
 * Each moment becomes a CHOREOGRAPHY on the attacked half — x 0–68 across, y the distance from the goal line (the goal sits at
 * y = 0, posts at 30.34 and 37.66). Fourteen ways to build an attack (through ball, wing cross, cutback, long range, solo run,
 * one-two, corner, free kick, penalty, counter, rebound, lob, volley, deep free-kick header) × five endings (goal, save, miss,
 * post, block) × a mirror × randomised runs, plus foul / card / injury / offside scenes. A scene names the real men of the
 * night: the scorer, the provider, the keeper and the defenders around them come from the two elevens.
 *
 * The rest of both elevens stand where a football team would (13.10.2026, "both sides of the pitch"): the attacking side's back
 * line on halfway and its keeper in his own goal, the defending side's midfield chasing back and its forwards waiting for the
 * break — unnamed extras, never anybody twice. `dir` says which way the attack runs on the whole ground (`pitch.ts`): the teams
 * change ends at half-time, so the same move after the 45th minute is played toward the other goal.
 *
 * Set pieces are scenes of their own, picked by `Moment.shape` (the engine's `detail`): a penalty (the spot, the arc, the run-up,
 * the keeper on his line — scored, saved or missed), a free kick (struck over a wall paced at 9.15 m, or swung in from wide to
 * a header) and a corner (to the penalty spot, or flicked on at the near post).
 */
export type Pose='stand'|'run'|'kick'|'head'|'dive'|'slide'|'down'|'celebrate'|'card'|'flag'|'walk'|'catch'
export type Key={t:number;x:number;y:number;pose:Pose}
export type Actor={id:string;team:0|1|-1;role:'gk'|'out'|'ref'|'lino';no:number;name:string;kit:PixelKit|null;skin:number;hair:number;keys:Key[];dive?:-1|1;/** how high a keeper's dive reaches, metres — the height of the ball he goes for */lift?:number;/** the reel player he is (none for the officials) */pid?:string;/** a man filling the ground, away from the move */extra?:true}
export type BallKey={t:number;x:number;y:number;z:number;arc?:number}
export type CueKind='tag'|'net'|'whistle'|'card-yellow'|'card-red'|'flag'|'goal'|'kick'|'post'|'save'|'caption'
export type Cue={t:number;kind:CueKind;actor?:string;text?:string}
export type Scene={id:string;variant:string;duration:number;attack:0|1;/** the way the attack runs on the whole ground */dir:Dir;actors:Actor[];ball:BallKey[];cues:Cue[];outcome:MomentKind;moment:Moment;spectacular:boolean}

const GX=34,POST_L=30.34,POST_R=37.66
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
const lerp=(a:number,b:number,u:number)=>a+(b-a)*u
const ease=(u:number)=>u<.5?2*u*u:1-2*(1-u)*(1-u)

/* ───────── sampling (the theatre reads these) ───────── */
export function actorAt(a:Actor,t:number):{x:number;y:number;pose:Pose;face:-1|1;moving:boolean;/** how far through the stretch he is in, 0–1 */u:number}{
 const k=a.keys;if(!k.length)return {x:GX,y:20,pose:'stand',face:1,moving:false,u:1}
 if(t<=k[0]!.t)return {...k[0]!,face:1,moving:false,u:0}
 for(let i=1;i<k.length;i++){const p=k[i-1]!,n=k[i]!;if(t<=n.t){
  const h=n.t-p.t,u=h>0?(t-p.t)/h:1,moving=Math.hypot(n.x-p.x,n.y-p.y)>.2
  // a run that carries on through a key keeps its pace (a cubic with the neighbours' slope); a man who starts or stops eases
  // in or out — a player does not halt at every waypoint of his run (13.10 drew him stopping dead at each one)
  const tp=tangent(k,i-1),tn=tangent(k,i),h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u
  return {x:h00*p.x+h10*h*tp.x+h01*n.x+h11*h*tn.x,y:h00*p.y+h10*h*tp.y+h01*n.y+h11*h*tn.y,pose:moving&&n.pose==='stand'?'run':n.pose,face:n.x<p.x-.05?-1:1,moving,u}}}
 const l=k[k.length-1]!;return {x:l.x,y:l.y,pose:l.pose==='run'?'stand':l.pose,face:1,moving:false,u:1}
}
/** the slope through a key: the neighbours' chord when he is running both into and out of it, standing still otherwise */
function tangent(k:readonly Key[],i:number):{x:number;y:number}{
 const p=k[i-1],c=k[i]!,n=k[i+1]
 if(!p||!n||n.t<=p.t)return {x:0,y:0}
 const into=Math.hypot(c.x-p.x,c.y-p.y)>.2,out=Math.hypot(n.x-c.x,n.y-c.y)>.2
 if(!into||!out||['dive','slide','down','kick','head','catch','card','flag'].includes(c.pose))return {x:0,y:0}
 return {x:(n.x-p.x)/(n.t-p.t),y:(n.y-p.y)/(n.t-p.t)}
}
export function ballAt(b:readonly BallKey[],t:number):{x:number;y:number;z:number}{
 if(!b.length)return {x:GX,y:20,z:0}
 if(t<=b[0]!.t)return b[0]!
 for(let i=1;i<b.length;i++){const p=b[i-1]!,n=b[i]!;if(t<=n.t){const u=n.t>p.t?(t-p.t)/(n.t-p.t):1;return {x:lerp(p.x,n.x,u),y:lerp(p.y,n.y,u),z:lerp(p.z,n.z,u)+(n.arc??0)*4*u*(1-u)}}}
 return b[b.length-1]!
}

/* ───────── the builder ───────── */
type Man={id:string;no:number;name:string;kit:PixelKit}
class Sb{
 att:0|1=0
 actors=new Map<string,Actor>();ball:BallKey[]=[];cues:Cue[]=[];end=0
 constructor(readonly r:()=>number){}
 add(id:string,team:0|1|-1,role:Actor['role'],man:Man|null,x:number,y:number,pose:Pose='stand'){
  this.actors.set(id,{id,team,role,no:man?.no??0,name:man?.name??'',kit:man?.kit??null,skin:Math.floor(this.r()*5),hair:Math.floor(this.r()*5),keys:[{t:0,x,y,pose}],...(man?{pid:man.id}:{})});return id
 }
 last(id:string){const k=this.actors.get(id)!.keys;return k[k.length-1]!}
 go(id:string,t:number,x:number,y:number,pose:Pose='run'){const a=this.actors.get(id);if(!a)return;const l=this.last(id);if(t<=l.t)t=l.t+.05;a.keys.push({t,x:clamp(x,-2,70),y:clamp(y,-3,62),pose});this.end=Math.max(this.end,t)}
 hold(id:string,t:number,pose:Pose='stand'){const l=this.last(id);this.go(id,t,l.x,l.y,pose)}
 pos(id:string,t:number){const a=this.actors.get(id);return a?actorAt(a,t):{x:GX,y:20,pose:'stand' as Pose,face:1 as const,moving:false}}
 b(t:number,x:number,y:number,z=0,arc=0){const l=this.ball[this.ball.length-1];if(l&&t<=l.t)t=l.t+.04;this.ball.push({t,x,y,z,...(arc?{arc}:{})});this.end=Math.max(this.end,t)}
 /** the ball at a runner's feet, a stride ahead, from t0 to t1 */
 carry(id:string,t0:number,t1:number){for(let t=t0;t<=t1+1e-6;t+=.12){const p=this.pos(id,t),q=this.pos(id,Math.min(t1,t+.12)),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;this.b(t,p.x+dx/d*.6,p.y+dy/d*.6,0)}}
 cue(t:number,kind:CueKind,actor?:string,text?:string){this.cues.push({t,kind,...(actor?{actor}:{}),...(text?{text}:{})})}
 /** a defender who follows his man with a lag, a yard goal-side */
 shadow(def:string,att:string,t0:number,t1:number,lag=.35,side=1.4){if(!this.actors.has(def)||!this.actors.has(att))return;for(let t=t0+.3;t<=t1;t+=.3){const p=this.pos(att,Math.max(0,t-lag));this.go(def,t,p.x+side*(p.x<GX?1:-1)*.6,p.y-1.2)}}
 /** the keeper shuffles across his line with the ball */
 keeper(gk:string,t0:number,t1:number){for(let t=t0+.25;t<=t1;t+=.25){const bl=ballAt(this.ball,t);this.go(gk,t,clamp(GX+(bl.x-GX)*.22,GX-2.6,GX+2.6),clamp(1.2+Math.max(0,22-bl.y)*-.02,.6,1.6),'stand')}}
}
export type Roles={scorer:Man;assist:Man;mates:Man[];keeper:Man;defs:Man[];foes:Man[]}

/* ───────── endings ───────── */
type Finish={outcome:MomentKind;height:'low'|'high'|'head'|'chip';power:number;/** a penalty the keeper guesses wrong: he dives the other way */wrong?:boolean}
/** the shot and what follows it; returns the time the scene can end */
function finish(s:Sb,shooter:string,t:number,f:Finish,gk:string,blocker?:string):number{
 const r=s.r,from=s.pos(shooter,t),side=r()<.5?-1:1,low=f.height==='low'
 const z=f.height==='high'?1.8+r()*.5:f.height==='head'?1.0+r()*.9:f.height==='chip'?.9:.25+r()*.4
 const dist=Math.hypot(from.x-GX,from.y),fly=clamp(dist/(f.power*(low?24:20)),.32,1.3)
 s.hold(shooter,t,f.height==='head'?'head':'kick');s.cue(t,'kick',shooter);s.go(shooter,t+.35,from.x,from.y-.4,'stand')
 const arc=f.height==='chip'?4.2:f.height==='high'?.8+r():f.height==='head'?.3:.15
 const gkAt=s.pos(gk,t)
 switch(f.outcome){
  case 'goal':{
   const tx=GX+side*(2.3+r()*1.1),dv=(f.wrong?-side:side) as -1|1
   s.b(t+fly,tx,-.4,z,arc);s.go(gk,t+fly*.85,f.wrong?GX+dv*2.6:clamp(lerp(gkAt.x,tx,.6),GX-3,GX+3),.9,'dive');s.actors.get(gk)!.dive=dv;s.actors.get(gk)!.lift=f.wrong?.3:clamp(z-.4,0,1.5)
   s.cue(t+fly,'net');s.cue(t+fly,'goal',shooter);s.b(t+fly+.35,tx-side*.4,-1.6,0);s.hold(gk,t+fly+1.4,'down')
   // the scorer wheels away to the corner flag; his mates follow him
   // nobody celebrates before the ball is in: they hold where they are until it crosses the line
   const flag=from.x<GX?3:65,end=t+fly+2.6,inNet=t+fly+.15
   s.hold(shooter,inNet);s.go(shooter,end,flag,3,'celebrate')
   for(const a of s.actors.values())if(a.team===s.actors.get(shooter)!.team&&a.id!==shooter&&a.role==='out'){s.hold(a.id,inNet);s.go(a.id,end+.3,flag+(a.keys[0]!.x<GX?2:-2)*(.5+r()),4+r()*3,'celebrate')}
   return end+.6
  }
  case 'save':{
   const tx=GX+side*(1.4+r()*1.6),catchIt=low&&r()<.5
   s.b(t+fly,tx,.9,z,arc);s.go(gk,t+fly,tx,.9,catchIt?'catch':'dive');s.actors.get(gk)!.dive=side as -1|1;s.actors.get(gk)!.lift=clamp(z-.4,0,1.5);s.cue(t+fly,'save',gk)
   if(catchIt){s.b(t+fly+1.2,tx,1,.8);s.hold(gk,t+fly+1.3,'catch');return t+fly+1.6}
   s.b(t+fly+.7,tx+side*7,-2.5,0,1.6);s.hold(gk,t+fly+1.2,'down');return t+fly+1.6
  }
  case 'post':{
   const px=side<0?POST_L:POST_R
   s.b(t+fly,px,0,z,arc);s.cue(t+fly,'post');s.b(t+fly+.6,px-side*(3+r()*3),7+r()*4,0,.6);s.go(gk,t+fly,clamp(lerp(gkAt.x,px,.5),GX-3,GX+3),1,'dive');s.actors.get(gk)!.dive=side as -1|1;s.actors.get(gk)!.lift=clamp(z-.4,0,1.5)
   return t+fly+1.4
  }
  case 'block':{
   const bl=blocker&&s.actors.has(blocker)?blocker:gk,mx=lerp(from.x,GX,.35),my=lerp(from.y,0,.35)
   s.go(bl,t+fly*.3,mx,my,'slide');s.b(t+fly*.35,mx,my,.2);s.b(t+fly*.35+.6,mx+side*(8+r()*5),my+3,0,.8);s.cue(t+fly*.35,'save',bl)
   return t+fly+1.2
  }
  default:{ // miss: wide or over
   const over=r()<.4,tx=over?GX+side*r()*3:GX+side*(4.6+r()*3)
   s.b(t+fly,tx,-.2,over?2.9+r():z,arc+(over?.6:0));s.b(t+fly+.5,tx+side*1.5,-6,over?3:0)
   if(f.wrong!==undefined){s.go(gk,t+fly,GX-side*2.4,.9,'dive');s.actors.get(gk)!.dive=(-side) as -1|1}else s.go(gk,t+fly,clamp(lerp(gkAt.x,tx,.35),GX-3,GX+3),1.1,'stand')
   return t+fly+1.2
  }
 }
}

/* ───────── fourteen ways to build the attack ───────── */
type Build=(s:Sb,R:Roles,f:Finish)=>{end:number;variant:string;spectacular:boolean}
const ids={sc:'sc',as:'as',m1:'m1',m2:'m2',gk:'gk',d1:'d1',d2:'d2',d3:'d3',d4:'d4'}
function cast(s:Sb,R:Roles,att:0|1,place:{sc:[number,number];as:[number,number];m1?:[number,number];m2?:[number,number];d?:[number,number][]}){
 const def=(att?0:1) as 0|1
 s.add(ids.sc,att,'out',R.scorer,...place.sc);s.add(ids.as,att,'out',R.assist,...place.as)
 if(place.m1&&R.mates[0])s.add(ids.m1,att,'out',R.mates[0],...place.m1)
 if(place.m2&&R.mates[1])s.add(ids.m2,att,'out',R.mates[1],...place.m2)
 s.add(ids.gk,def,'gk',R.keeper,GX,1.3)
 ;(place.d??[[GX-6,12],[GX+6,12],[GX,16]]).forEach((p,i)=>{if(R.defs[i])s.add([ids.d1,ids.d2,ids.d3,ids.d4][i]!,def,'out',R.defs[i]!,p[0],p[1])})
}
const W=(r:()=>number)=>r()<.5?-1:1
const BUILDS:Record<Shape,Build>={
 through:(s,R,f)=>{const r=s.r,w=W(r),sx=GX+w*(6+r()*6)
  cast(s,R,s.att,{sc:[sx,30],as:[GX-w*4,38],m1:[GX-w*12,30],d:[[GX+w*2,22],[GX-w*5,21],[GX,26]]})
  s.b(0,GX-w*4,37.4);s.carry(ids.as,0,.9);s.go(ids.as,.9,GX-w*3.5,33);s.cue(.2,'tag',ids.as)
  const tx=GX+w*(2+r()*3),ty=13+r()*3;s.b(1.7,tx,ty,0);s.go(ids.sc,1.8,tx,ty-.4);s.cue(1,'tag',ids.sc)
  s.go(ids.m1,2.4,GX-w*8,16);s.shadow(ids.d1,ids.sc,.4,2.2,.5);s.go(ids.d2,2.2,GX-w*1,12);s.go(ids.d3,2.3,GX+w*1,18)
  s.carry(ids.sc,1.8,2.5);s.keeper(ids.gk,0,2.5);s.go(ids.gk,2.6,lerp(GX,tx,.3),4.2,'run')
  return {end:finish(s,ids.sc,2.6,f,ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'through ball',spectacular:false}},
 cross:(s,R,f)=>{const r=s.r,w=W(r),wx=GX+w*28
  cast(s,R,s.att,{sc:[GX-w*2,22],as:[wx,34],m1:[GX+w*6,24],d:[[GX-w*1,14],[GX+w*4,12],[wx-w*5,28]]})
  s.b(0,wx,33.4);s.go(ids.as,1.9,wx+w*1,10);s.carry(ids.as,0,1.9);s.go(ids.d3,1.9,wx-w*3,13);s.cue(.2,'tag',ids.as)
  const hx=GX+w*(r()*4-1),hy=6+r()*3;s.go(ids.sc,2.9,hx,hy);s.go(ids.m1,2.9,GX-w*4,9);s.go(ids.d1,2.9,hx-w*.8,hy-.7);s.go(ids.d2,2.9,GX+w*2,7)
  s.b(2,wx+w*1,9.6,0);s.b(2.95,hx,hy,1.9,4.5);s.cue(2.1,'tag',ids.sc);s.keeper(ids.gk,0,2.8)
  return {end:finish(s,ids.sc,2.95,{...f,height:'head',power:.7},ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'cross and header',spectacular:false}},
 cutback:(s,R,f)=>{const r=s.r,w=W(r),wx=GX+w*22
  cast(s,R,s.att,{sc:[GX-w*3,24],as:[wx,30],m1:[GX+w*2,22],d:[[GX+w*3,10],[GX-w*2,9],[wx-w*4,26]]})
  s.b(0,wx,29.5);s.go(ids.as,2,GX+w*13,2.5);s.carry(ids.as,0,2);s.shadow(ids.d3,ids.as,0,2,.4);s.cue(.2,'tag',ids.as)
  const cx=GX-w*(1+r()*4),cy=10+r()*3;s.go(ids.sc,2.7,cx,cy);s.go(ids.m1,2.7,GX+w*1,6);s.go(ids.d1,2.6,GX+w*4,4);s.go(ids.d2,2.6,GX,6)
  s.b(2.65,cx,cy,0);s.cue(2.1,'tag',ids.sc);s.keeper(ids.gk,0,2.6)
  return {end:finish(s,ids.sc,2.75,{...f,height:'low'},ids.gk,f.outcome==='block'?ids.d2:undefined),variant:'cutback',spectacular:false}},
 long:(s,R,f)=>{const r=s.r,w=W(r),sx=GX+w*(4+r()*10)
  cast(s,R,s.att,{sc:[sx,34],as:[GX-w*10,30],m1:[GX+w*16,20],d:[[sx-w*2,24],[GX-w*4,14],[GX+w*6,15]]})
  s.b(0,GX-w*10,29.4);s.carry(ids.as,0,.7);s.cue(.1,'tag',ids.as);s.b(1.4,sx,28.5,0);s.go(ids.sc,1.4,sx,29);s.cue(1,'tag',ids.sc)
  s.carry(ids.sc,1.4,2.1);s.go(ids.sc,2.1,sx-w*1,26.5);s.go(ids.d1,2.1,sx-w*1.5,22,'run');s.keeper(ids.gk,0,2.1)
  return {end:finish(s,ids.sc,2.2,{...f,height:r()<.55?'high':'low',power:1.25},ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'from long range',spectacular:true}},
 dribble:(s,R,f)=>{const r=s.r,w=W(r),sx=GX+w*(8+r()*6)
  cast(s,R,s.att,{sc:[sx,36],as:[GX-w*10,34],m1:[GX-w*4,26],d:[[sx-w*1,27],[GX+w*2,18],[GX-w*3,13]]})
  s.b(0,sx,35.4);s.cue(.1,'tag',ids.sc)
  s.go(ids.sc,1,sx-w*3,28);s.go(ids.d1,.9,sx-w*1.5,28.5,'slide');s.hold(ids.d1,1.6,'down')
  s.go(ids.sc,2,GX+w*2,19);s.go(ids.d2,1.9,GX+w*1,19.5,'slide');s.hold(ids.d2,2.6,'down')
  s.go(ids.sc,2.7,GX-w*1,12);s.carry(ids.sc,0,2.7);s.go(ids.d3,2.6,GX-w*1,9);s.go(ids.m1,2.6,GX-w*8,14);s.keeper(ids.gk,0,2.7)
  return {end:finish(s,ids.sc,2.8,f,ids.gk,f.outcome==='block'?ids.d3:undefined),variant:'a solo run',spectacular:true}},
 combo:(s,R,f)=>{const r=s.r,w=W(r),sx=GX+w*(3+r()*5)
  cast(s,R,s.att,{sc:[sx,30],as:[GX-w*3,22],m1:[GX+w*14,26],d:[[sx-w*1,25],[GX-w*4,19],[GX+w*4,13]]})
  s.b(0,sx,29.4);s.carry(ids.sc,0,.6);s.cue(.1,'tag',ids.sc);s.b(1,GX-w*3,22.4,0);s.go(ids.sc,1.6,GX+w*1,17);s.go(ids.d1,1.6,GX+w*2,20)
  s.b(1.55,GX+w*.5,16.6,0);s.cue(1,'tag',ids.as);s.go(ids.as,1.8,GX-w*4,19,'stand');s.carry(ids.sc,1.6,2.2);s.go(ids.sc,2.2,GX+w*1.5,13);s.go(ids.d3,2.1,GX+w*2,10);s.keeper(ids.gk,0,2.2)
  return {end:finish(s,ids.sc,2.3,f,ids.gk,f.outcome==='block'?ids.d3:undefined),variant:'a one-two',spectacular:false}},
 corner:(s,R,f)=>{const r=s.r,w=W(r),cx=w<0?0:68,flick=r()<.4&&R.mates.length>0
  cast(s,R,s.att,{sc:flick?[GX-w*4,12]:[GX+w*3,15],as:[cx,0],m1:flick?[GX+w*1,9]:[GX-w*4,13],m2:[GX,10],d:[[GX+w*2,7],[GX-w*3,6],[GX,8],[GX+w*6,5]]})
  s.add('ref',-1,'ref',null,GX-w*8,19)
  s.b(0,cx-w*.4,.4);s.go(ids.as,.5,cx+w*1.6,-1.2,'walk');s.hold(ids.as,.8,'stand');s.cue(.1,'caption',undefined,'Corner');s.cue(.6,'tag',ids.as);s.cue(.8,'whistle')
  s.go(ids.as,1.1,cx-w*.2,.2,'run');s.b(1.14,cx-w*.4,.4);s.hold(ids.as,1.15,'kick');s.cue(1.15,'kick',ids.as);s.keeper(ids.gk,0,1.2)
  if(flick){
   // the near post: the first man glances it on, the scorer arrives at the far post
   const nx=GX+w*3.4,ny=4.2+r(),fx=GX-w*(2+r()*1.5),fy=3+r()*1.6
   s.go(ids.m1,2,nx,ny);s.b(2.05,nx,ny,1.9,2.4);if(s.actors.has(ids.m1))s.hold(ids.m1,2.1,'head');s.cue(2.05,'kick',ids.m1);s.go(ids.d1,2,nx+w*.7,ny-.6)
   s.go(ids.sc,2.65,fx,fy);s.go(ids.d2,2.6,fx-w*.8,fy-.5);s.go(ids.m2,2.4,GX,7);s.go(ids.d3,2.4,GX+w*.5,5);s.b(2.7,fx,fy,1.3,.8);s.cue(1.6,'tag',ids.sc);s.go(ids.gk,2.3,GX+w*2,1.1)
   return {end:finish(s,ids.sc,2.7,{...f,height:'head',power:.6},ids.gk,f.outcome==='block'?ids.d2:undefined),variant:'a corner flicked on at the near post',spectacular:true}
  }
  const hx=GX+w*(r()*4-2),hy=5.5+r()*3;s.go(ids.sc,2.35,hx,hy);s.go(ids.m1,2.2,GX-w*1,7);s.go(ids.m2,2.2,GX+w*1,4);s.go(ids.d1,2.35,hx+w*.6,hy-.6);s.go(ids.d2,2.2,GX-w*2,4);s.go(ids.d3,2.2,GX,6)
  s.b(2.4,hx,hy,2.1,6);s.cue(1.4,'tag',ids.sc);s.keeper(ids.gk,1.2,2.3)
  return {end:finish(s,ids.sc,2.4,{...f,height:'head',power:.7},ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'from a corner',spectacular:false}},
 'free-kick':(s,R,f)=>{const r=s.r,w=W(r)
  // the wall is paced out at 9.15 m on the line from the ball to the middle of the goal
  const wall=(bx:number,by:number,n:number)=>{const dx=GX-bx,dy=-by,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,cx=bx+ux*9.15,cy=by+uy*9.15;return Array.from({length:n},(_,i)=>[cx+(-uy)*(i-(n-1)/2)*.7,cy+ux*(i-(n-1)/2)*.7] as [number,number])}
  if(r()<.42){
   // swung in from wide
   const fx=GX+w*(19+r()*8),fy=15+r()*10,wl=wall(fx,fy,2)
   cast(s,R,s.att,{sc:[GX-w*1,15],as:[fx+w*1.5,fy+1.8],m1:[GX+w*4,13.5],m2:[GX-w*6,12],d:[[GX+w*.5,11],[GX+w*5,10],wl[0]!,wl[1]!]})
   s.add('ref',-1,'ref',null,fx-w*3,fy+3)
   s.b(0,fx,fy);s.cue(.1,'caption',undefined,'Free kick');s.cue(.3,'tag',ids.as);s.go('ref',.9,wl[0]![0]-w*1,wl[0]![1]+1,'walk');s.cue(1.1,'whistle')
   s.go(ids.as,1.5,fx+w*.3,fy+.4,'run');s.b(1.54,fx,fy);s.hold(ids.as,1.55,'kick');s.cue(1.55,'kick',ids.as);s.keeper(ids.gk,0,1.6)
   for(const d of [ids.d3,ids.d4])if(s.actors.has(d))s.go(d,1.7,s.last(d).x,s.last(d).y,'head')
   const hx=GX+w*(r()*5-2),hy=6+r()*4;s.go(ids.sc,2.5,hx,hy);s.go(ids.d1,2.5,hx+w*.7,hy-.7);s.go(ids.m1,2.45,GX+w*3,6);s.go(ids.m2,2.45,GX-w*4,7);s.go(ids.d2,2.4,GX+w*2,5)
   s.b(2.55,hx,hy,1.9,4.2);s.cue(1.8,'tag',ids.sc)
   return {end:finish(s,ids.sc,2.55,{...f,height:'head',power:.72},ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'a free kick swung into the box',spectacular:false}
  }
  const fx=GX+w*(2+r()*9),fy=20+r()*7,wl=wall(fx,fy,4)
  cast(s,R,s.att,{sc:[fx-w*1.4,fy+2.6],as:[fx+w*2,fy+1],m1:[GX+w*7,14],d:wl})
  s.add('ref',-1,'ref',null,fx+w*4,fy+2)
  s.b(0,fx,fy);s.cue(.1,'caption',undefined,'Free kick');s.cue(.3,'tag',ids.sc);s.go('ref',.9,lerp(fx,wl[0]![0],.9)+w*1.6,lerp(fy,wl[0]![1],.9),'walk');s.go('ref',1.3,fx+w*5,fy-3,'walk');s.cue(1.3,'whistle')
  s.hold(ids.sc,1.35,'stand');s.go(ids.sc,1.75,fx-w*.3,fy+.35,'run');s.b(1.79,fx,fy);s.go(ids.as,1.5,fx+w*1.2,fy+.6,'run');s.keeper(ids.gk,0,1.75)
  for(const d of [ids.d1,ids.d2,ids.d3,ids.d4])if(s.actors.has(d))s.go(d,1.85,s.last(d).x,s.last(d).y,'head')
  return {end:finish(s,ids.sc,1.8,{...f,height:'high',power:1.05},ids.gk,f.outcome==='block'?ids.d2:undefined),variant:'a free kick over the wall',spectacular:true}},
 penalty:(s,R,f)=>{const r=s.r
  // the spot, the men outside the box and the arc, the keeper on his line
  cast(s,R,s.att,{sc:[GX-1.2,13.2],as:[GX-9,18.6],m1:[GX+8,18.9],m2:[GX+3,19.7],d:[[GX-5,18.8],[GX+5.5,19.3],[GX+11,18.5],[GX-12,18.9]]})
  s.add('ref',-1,'ref',null,GX+7,14)
  s.b(0,GX,11);s.cue(.1,'caption',undefined,'Penalty');s.cue(.3,'tag',ids.sc)
  s.go(ids.sc,.9,GX-1.7,15.4,'walk');s.hold(ids.sc,1.6,'stand')
  for(let t=.35,k=0;t<=1.95;t+=.35,k++)s.go(ids.gk,t,GX+(k%2?.6:-.6),.5,'stand')
  s.cue(1.7,'whistle');s.go(ids.sc,2.35,GX-.5,11.7,'run');s.b(2.39,GX,11)
  for(const id of [ids.as,ids.m1,ids.m2,ids.d1,ids.d2,ids.d3,ids.d4])if(s.actors.has(id)){const l=s.last(id);s.go(id,2.7,l.x,l.y-2.4)}
  const out=f.outcome==='block'?'save':f.outcome
  return {end:finish(s,ids.sc,2.4,{...f,outcome:out,height:r()<.25?'high':'low',power:1.15,wrong:out==='goal'?r()<.65:r()<.5},ids.gk),variant:'from the penalty spot',spectacular:false}},
 counter:(s,R,f)=>{const r=s.r,w=W(r)
  cast(s,R,s.att,{sc:[GX+w*8,52],as:[GX-w*2,54],m1:[GX-w*12,50],d:[[GX+w*2,38],[GX-w*6,36]]})
  s.b(0,GX-w*2,53.4);s.cue(.1,'caption',undefined,'On the break');s.cue(.2,'tag',ids.as)
  s.go(ids.as,2,GX-w*2,30);s.carry(ids.as,0,2);s.go(ids.sc,2.2,GX+w*9,22);s.go(ids.m1,2.2,GX-w*11,24);s.go(ids.d1,2.1,GX+w*1,24);s.go(ids.d2,2.1,GX-w*4,22)
  s.b(2.6,GX+w*7,16,0);s.go(ids.sc,2.7,GX+w*7,15.6);s.cue(2.2,'tag',ids.sc);s.carry(ids.sc,2.7,3.3);s.go(ids.sc,3.3,GX+w*4,11);s.shadow(ids.d1,ids.sc,2.2,3.3,.4);s.keeper(ids.gk,0,3.3)
  return {end:finish(s,ids.sc,3.4,f,ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'a counter-attack',spectacular:false}},
 rebound:(s,R,f)=>{const r=s.r,w=W(r)
  cast(s,R,s.att,{sc:[GX-w*4,14],as:[GX+w*6,22],m1:[GX+w*10,26],d:[[GX-w*2,10],[GX+w*3,12],[GX,16]]})
  s.b(0,GX+w*6,21.4);s.cue(.1,'tag',ids.as);s.carry(ids.as,0,.6);s.hold(ids.as,.8,'kick');s.cue(.8,'kick',ids.as)
  s.b(1.4,GX+w*1.5,1,.6);s.go(ids.gk,1.4,GX+w*1.5,1,'dive');s.actors.get(ids.gk)!.dive=w as -1|1;s.cue(1.4,'save',ids.gk);s.hold(ids.gk,2.2,'down')
  const rx=GX-w*(1+r()*2),ry=6+r()*2;s.b(1.9,rx,ry,0,.4);s.go(ids.sc,1.95,rx,ry+.3);s.cue(1.5,'tag',ids.sc);s.go(ids.d1,2,rx+w*1.5,ry-1)
  return {end:finish(s,ids.sc,2,{...f,height:'low',power:.9},ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'the rebound',spectacular:false}},
 lob:(s,R,f)=>{const r=s.r,w=W(r),sx=GX+w*(2+r()*4)
  cast(s,R,s.att,{sc:[sx,34],as:[GX-w*8,40],d:[[sx-w*2,30],[GX-w*6,28]]})
  s.b(0,GX-w*8,39.4);s.carry(ids.as,0,.6);s.cue(.1,'tag',ids.as);s.b(1.3,sx,24,0);s.go(ids.sc,1.35,sx,24.4);s.cue(.9,'tag',ids.sc)
  s.carry(ids.sc,1.35,2.4);s.go(ids.sc,2.4,sx-w*1,17);s.shadow(ids.d1,ids.sc,.5,2.4,.6);s.go(ids.gk,2.4,GX+w*1,10,'run')
  return {end:finish(s,ids.sc,2.45,{...f,height:'chip',power:.75},ids.gk),variant:'a chip over the keeper',spectacular:true}},
 volley:(s,R,f)=>{const r=s.r,w=W(r)
  cast(s,R,s.att,{sc:[GX+w*5,20],as:[GX-w*20,36],m1:[GX-w*2,14],d:[[GX+w*3,12],[GX-w*1,10],[GX+w*8,16]]})
  s.b(0,GX-w*20,35.4);s.cue(.1,'tag',ids.as);s.hold(ids.as,.6,'kick');s.cue(.6,'kick',ids.as)
  const vx=GX+w*(3+r()*3),vy=13+r()*4;s.go(ids.sc,1.8,vx,vy);s.b(1.85,vx,vy,1,5);s.cue(1.2,'tag',ids.sc);s.go(ids.d1,1.8,vx-w*1.5,vy-2);s.keeper(ids.gk,0,1.8)
  return {end:finish(s,ids.sc,1.85,{...f,height:r()<.5?'high':'low',power:1.2},ids.gk,f.outcome==='block'?ids.d1:undefined),variant:'a volley',spectacular:true}},
}
const GOAL_SHAPES:Shape[]=['through','cross','cutback','long','dribble','combo','corner','free-kick','counter','rebound','lob','volley','penalty']
const WEIGHTS:Record<Shape,number>={through:12,cross:12,cutback:9,long:7,dribble:6,combo:8,corner:7,'free-kick':4,counter:8,rebound:7,lob:4,volley:5,penalty:3}

/* ───────── fouls, cards, injuries, offside ───────── */
function foulScene(s:Sb,R:Roles,kind:'yellow'|'red'|'injury'):{end:number;variant:string}{
 const r=s.r,w=W(r),vx=GX+w*(4+r()*14),vy=26+r()*10,att=s.att
 // the victim (ids.as) carries the ball; the offender (ids.sc) comes in from the side. A card names the offender (R.scorer);
 // an injury names the man hurt (R.scorer), and the challenge comes from a defender of the other side.
 const victim=kind==='injury'?R.scorer:R.assist,offender=kind==='injury'?(R.defs[0]??R.keeper):R.scorer
 s.add(ids.as,att,'out',victim,vx,vy+6);s.add(ids.sc,att?0:1,'out',offender,vx+w*4,vy-2);s.add(ids.gk,att?0:1,'gk',R.keeper,GX,1.3)
 if(R.mates[0])s.add(ids.m1,att,'out',R.mates[0],vx-w*8,vy+4);if(R.defs[1])s.add(ids.d1,att?0:1,'out',R.defs[1],vx-w*3,vy-4)
 s.add('ref',-1,'ref',null,vx-w*10,vy+12)
 s.b(0,vx,vy+5.4);s.cue(.1,'tag',ids.as);s.go(ids.as,1.2,vx,vy);s.carry(ids.as,0,1.2)
 s.go(ids.sc,1.15,vx+w*.6,vy+.2,'slide');s.go(ids.as,1.45,vx-w*.4,vy-.6,'down');s.b(1.6,vx-w*3,vy-3,0,.5);s.cue(1.3,'whistle')
 s.hold(ids.sc,1.9,'stand');s.go('ref',2.6,vx-w*2,vy+2);s.hold(ids.as,kind==='injury'?4.6:3.4,'down')
 if(kind==='injury'){s.cue(2.4,'caption',undefined,'Injury');s.cue(2.6,'tag',ids.as);s.go(ids.m1,2.8,vx-w*1.5,vy+1,'stand');return {end:4.8,variant:'a heavy challenge'}}
 s.cue(2.9,'tag',ids.sc);s.hold('ref',3,'card');s.cue(3,kind==='red'?'card-red':'card-yellow');s.hold('ref',3.8,'card')
 if(kind==='red'){s.go(ids.sc,5,vx+w*8,vy+14,'walk');return {end:5.2,variant:'a straight red'}}
 return {end:4.2,variant:'a reckless tackle'}
}
function offsideScene(s:Sb,R:Roles):{end:number;variant:string}{
 const r=s.r,w=W(r)
 cast(s,R,s.att,{sc:[GX+w*5,24],as:[GX-w*3,36],d:[[GX+w*2,22],[GX-w*6,21.5]]})
 s.add('lino',-1,'lino',null,w<0?-1:69,20)
 s.b(0,GX-w*3,35.4);s.cue(.1,'tag',ids.as);s.go(ids.sc,1.2,GX+w*5,18);s.go(ids.d1,1.2,GX+w*2,23);s.go(ids.d2,1.2,GX-w*6,23)
 s.b(1.3,GX+w*5,14,0);s.go(ids.sc,1.5,GX+w*5,14.4);s.go('lino',1.6,s.last('lino').x,18,'flag');s.cue(1.5,'flag');s.cue(1.7,'whistle');s.cue(1.8,'caption',undefined,'Offside');s.hold(ids.sc,2.8,'stand')
 return {end:3,variant:'offside'}
}

/* ───────── human pace ───────── */
/**
 * A footballer sprints at about nine metres a second, and a scene written in round numbers asked men for twenty and thirty
 * (measured 27.10.2026: the through ball's runner at 32 m/s, the cutback's provider at 44). Two corrections, both deterministic:
 * 1. the BUILD-UP is played at a man's pace — every tenth of a second before the shot is slowed by however much the men on the
 *    ball would otherwise outrun a sprinter, so a pass, a carry and a run onto a ball still meet exactly where they were written;
 *    the shot itself, and everything after it, keeps its own speed;
 * 2. everybody else simply cannot get there: a man asked to cover more ground than a sprint allows runs as far as he can.
 */
export const SPRINT=9.2
const PACE:Partial<Record<Pose,number>>={walk:2.6,stand:SPRINT,run:SPRINT,celebrate:8,card:3,flag:7,head:SPRINT,kick:SPRINT,catch:7,slide:10.5,dive:12,down:12}
function govern(s:Sb):(t:number)=>number{
 const touch=new Set(s.cues.filter(q=>q.actor&&(q.kind==='tag'||q.kind==='kick')).map(q=>q.actor!))
 const runners=[...s.actors.values()].filter(a=>touch.has(a.id)&&a.role==='out')
 const shotOf=()=>{const kicks=s.cues.filter(q=>q.kind==='kick');return kicks.length?kicks[kicks.length-1]!.t:s.end}
 // a run is drawn between keys, so slowing the tenths of a second inside it slows the whole run by their average: a few
 // passes settle it (each one measures again what the last one left)
 const warps:((t:number)=>number)[]=[]
 for(let pass=0;pass<8;pass++){
  const shotT=shotOf(),STEP=.1,cut:number[]=[0];let worst=1
  for(let t=0;t<shotT-1e-9;t+=STEP){
   const t1=Math.min(shotT,t+STEP);let v=0
   for(const a of runners)for(let u=t;u<t1-1e-9;u+=.025){const p=actorAt(a,u),q=actorAt(a,u+.025);if(!['dive','slide','down'].includes(q.pose))v=Math.max(v,Math.hypot(q.x-p.x,q.y-p.y)/.025)}
   const f=clamp(v/SPRINT,1,2.6);worst=Math.max(worst,f);cut.push(cut[cut.length-1]!+(t1-t)*f)
  }
  if(worst<=1.02)break
  const warp=(t:number)=>{if(t>=shotT)return cut[cut.length-1]!+(t-shotT);const i=Math.floor(t/STEP),f=(t-i*STEP)/STEP;return lerp(cut[i]!,cut[i+1]??cut[i]!,Math.min(1,f))}
  for(const a of s.actors.values())for(const k of a.keys)k.t=warp(k.t)
  for(const b of s.ball)b.t=warp(b.t)
  for(const q of s.cues)q.t=warp(q.t)
  s.end=warp(s.end);warps.push(warp)
 }
 const warp=(t:number)=>warps.reduce((x,w)=>w(x),t),shot=shotOf()
 // the men not on the ball (and anyone after the shot) run as far as a man can, never further
 for(const a of s.actors.values()){
  const k=a.keys;for(let i=1;i<k.length;i++){
   if(touch.has(a.id)&&a.role==='out'&&k[i]!.t<=shot+1e-9)continue
   // a run that starts or stops inside the stretch peaks above its average (a cubic from rest tops out at 1.5×)
   const p=k[i-1]!,n=k[i]!,still=(j:number)=>{const g=tangent(k,j);return g.x===0&&g.y===0},peak=1+(still(i-1)?.25:0)+(still(i)?.25:0)
   const d=Math.hypot(n.x-p.x,n.y-p.y),most=(PACE[n.pose]??SPRINT)/peak*Math.max(.01,n.t-p.t)
   if(d>most){const f=most/d;n.x=p.x+(n.x-p.x)*f;n.y=p.y+(n.y-p.y)*f}
  }
 }
 return warp
}

/* ───────── the rest of the ground ───────── */
/**
 * Everybody the move does not need, standing where his side would be: the attacking side's keeper in his own goal (y ≈ 101 is
 * four metres off the far goal line), its back line around halfway, its midfield behind the ball; the defending side's midfield
 * tracking back and its forwards on halfway waiting for the break. They jog a few metres with the play and are never named.
 */
function fillGround(s:Sb,reel:Reel,end:number){
 const used=new Set([...s.actors.values()].map(a=>a.pid).filter((x):x is string=>!!x)),r=s.r
 const b0=s.ball[0]??{x:GX,y:20},b1=s.ball[s.ball.length-1]??b0,att=s.att,def=(att?0:1) as 0|1
 for(const team of [att,def] as const){
  const t=reel.teams[team]!,men=t.lineup.filter(p=>!p.bench&&!used.has(p.id)&&!(team===def&&p.pos==='GK')).slice(0,7)
  men.forEach((p,i)=>{
   const lane=8+((i*17+(team?9:0))%52)+r()*4
   let x=lane,y:number
   if(p.pos==='GK'){x=GX+(r()-.5)*2;y=101}
   else if(team===att)y=p.pos==='DF'?52+r()*10:clamp(b0.y+7+r()*12,10,70)
   else y=p.pos==='FW'?40+r()*14:clamp(b0.y*.75+3+r()*7,6,44)
   const id=`x${team}${i}`;used.add(p.id)
   s.actors.set(id,{id,team,role:p.pos==='GK'?'gk':'out',no:p.no,name:'',kit:p.pos==='GK'?t.keeper:p.kit,skin:Math.floor(r()*5),hair:Math.floor(r()*5),pid:p.id,extra:true,
    keys:p.pos==='GK'?[{t:0,x,y,pose:'stand'},{t:end,x:x+(b1.x-GX)*.04,y,pose:'stand'}]
     :[{t:0,x,y,pose:'stand'},{t:end*.55,x:lerp(x,b1.x,.12),y:y-(team===att?2.6:1.8),pose:'stand'},{t:end,x:lerp(x,b1.x,.18),y:y-(team===att?3.4:2.2),pose:'stand'}]})
  })
 }
}

/* ───────── the reel → scenes ───────── */
const pick=<T>(xs:readonly T[],r:()=>number)=>xs[Math.floor(r()*xs.length)]!
function rolesFor(reel:Reel,m:Moment,r:()=>number):Roles{
 const att=reel.teams[m.side]!,def=reel.teams[m.side?0:1]!,find=(t:typeof att,id?:string)=>id?t.lineup.find(p=>p.id===id):undefined
 // a small side (five a side) runs out of men: then the scene simply has fewer people in it, never the same man twice
 const out=(t:typeof att,ex:Set<string>,pos:ReelPlayer['pos'][]):ReelPlayer|null=>{const xs=t.lineup.filter(p=>p.pos!=='GK'&&!p.bench&&!ex.has(p.id)),pref=xs.filter(p=>pos.includes(p.pos));return pref.length?pick(pref,r):xs.length?pick(xs,r):null}
 const man=(p:ReelPlayer):Man=>({id:p.id,no:p.no,name:p.name,kit:p.kit})
 const foulish=m.kind==='yellow'||m.kind==='red'
 // a card's player is the offender: the attack belongs to the other side
 const attacking=foulish?def:att,defending=foulish?att:def
 // a named man the reel cannot find is never replaced by somebody else's name: a stand-in runs the move, unnamed
 const named=find(att,m.player),scorer=named??out(att,new Set(),foulish?['DF','MF']:['FW','MF'])??att.lineup[0]!,anon=!!m.player&&!named
 const used=new Set([scorer.id])
 const assist=(!foulish&&m.assist&&m.assist!==scorer.id?find(att,m.assist):undefined)??out(attacking,used,['MF','FW'])??scorer;used.add(assist.id)
 const mates:ReelPlayer[]=[];for(const p of [['FW','MF'],['MF','DF']] as ReelPlayer['pos'][][]){const x=out(attacking,used,p);if(x){mates.push(x);used.add(x.id)}}
 const gk=find(defending,m.keeper)??defending.lineup.find(p=>p.pos==='GK')??defending.lineup[0]!
 const defs:ReelPlayer[]=[],dUsed=new Set([gk.id,...(foulish?[scorer.id]:[])]);for(let i=0;i<4;i++){const d=out(defending,dUsed,['DF']);if(!d)break;dUsed.add(d.id);defs.push(d)}
 const keeperMan={...man(gk),kit:defending.keeper}
 return {scorer:anon?{...man(scorer),name:''}:man(scorer),assist:man(assist),mates:mates.map(man),keeper:keeperMan,defs:defs.map(man),foes:[]}
}
export function sceneFor(reel:Reel,m:Moment,index:number):Scene{
 const r=rng(hash(`${reel.seed}:${index}:${m.minute}:${m.kind}`)),s=new Sb(r),foul=m.kind==='yellow'||m.kind==='red'||m.kind==='injury'
 s.att=(m.kind==='yellow'||m.kind==='red'?(m.side?0:1):m.side) as 0|1
 const R=rolesFor(reel,m,r)
 let end=0,variant='',spectacular=false
 if(foul){const o=foulScene(s,R,m.kind as 'yellow'|'red'|'injury');end=o.end;variant=o.variant}
 else if(m.kind==='offside'){const o=offsideScene(s,R);end=o.end;variant=o.variant}
 else{
  let shape:Shape=m.shape??(m.header?(r()<.5?'cross':'corner'):'through')
  if(!m.shape&&!m.header){const total=GOAL_SHAPES.reduce((a,x)=>a+WEIGHTS[x],0);let x=r()*total;for(const g of GOAL_SHAPES){x-=WEIGHTS[g];if(x<0){shape=g;break}}}
  const o=BUILDS[shape](s,R,{outcome:m.kind,height:'low',power:1});end=o.end;variant=o.variant;spectacular=o.spectacular
 }
 end=govern(s)(end)
 fillGround(s,reel,Math.max(end,s.end))
 // a mirror half the time: the same move down the other wing
 if(r()<.5){for(const a of s.actors.values())for(const k of a.keys)k.x=68-k.x;for(const b of s.ball)b.x=68-b.x;for(const a of s.actors.values())if(a.dive)a.dive=(-a.dive) as -1|1}
 return {id:`${reel.id}:${index}`,variant,duration:Math.max(end,s.end)+.4,attack:s.att,dir:attackDir(m.minute,s.att),actors:[...s.actors.values()],ball:s.ball,cues:s.cues.sort((a,b)=>a.t-b.t),outcome:m.kind,moment:m,spectacular}
}
/** which moments a reel shows: every goal and red card, injuries, and a few chances and bookings so a 0-0 still has a story */
export function storyOf(reel:Reel,max=10):Moment[]{
 const must=reel.moments.filter(m=>m.kind==='goal'||m.kind==='red'||m.kind==='injury'),rest=reel.moments.filter(m=>!must.includes(m))
 const r=rng(hash(`${reel.seed}:story`)),room=Math.max(2,max-must.length),extra=[...rest].sort((a,b)=>(a.kind==='yellow'?1:0)-(b.kind==='yellow'?1:0)||r()-.5).slice(0,room)
 return [...must,...extra].sort((a,b)=>a.minute-b.minute).slice(0,Math.max(max,must.length))
}
/** after EVERY goal something plays (owner, 13.10.2026): the film for the side whose match it is, the muted "against" card for the other side */
export function goalGraphicFor(reel:Reel,m:Moment,scene:Scene,all:readonly Moment[]):GoalGraphic|null{
 if(m.kind!=='goal')return null
 const third=!!m.player&&all.filter(x=>x.kind==='goal'&&x.side===m.side&&x.player===m.player&&x.minute<=m.minute).length===3
 if(reel.mine!==null&&m.side!==reel.mine)return {kind:'against',hattrick:third}
 return {kind:'film',film:third?'hattrick':scene.spectacular?'fire-goal':'goal'}
}
/** the film for a goal, when the goal is the watching side's (null for the other side's — they get the "against" card) */
export function celebrationFor(reel:Reel,m:Moment,scene:Scene,all:readonly Moment[]):'goal'|'hattrick'|'fire-goal'|null{
 const g=goalGraphicFor(reel,m,scene,all);return g?.kind==='film'?g.film as 'goal'|'hattrick'|'fire-goal':null
}
export function closingFor(reel:Reel):'win'|'loss'|'game-over'|'champion'|null{
 if(reel.mine===null)return null
 const [a,b]=reel.final,me=reel.mine,us=me?b:a,them=me?a:b,pw=reel.pens?(reel.pens[me]>reel.pens[me?0:1]):null
 if(reel.champion&&(us>them||pw))return 'champion'
 if(us>them||pw===true)return 'win'
 if(us<them||pw===false)return them-us>=3?'game-over':'loss'
 return null
}
