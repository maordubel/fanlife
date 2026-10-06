/* LIFE voxel play — the game's hands inside a voxel room: a player who walks, people who can be
 * spoken to, doors that lead somewhere, a camera that goes with him.
 *
 * It decides NOTHING about the story. The host (the React shell) tells it which room, who stands
 * where and which doors exist; it answers with what the player did: walked into a door, pressed
 * the button next to somebody. Every word the player reads is the host's DOM, never this canvas. */
(function(){
"use strict";
var V=window.__vx,THREE=V.THREE,PI=Math.PI;
var CELL=.5,RADIUS=.45,REACH=3.5,SPEED=5.6,RUN=1.55;
var sink=function(){},cfg=null,grid=null,player=null,actors={},exits=[],spots=[],marks=[],target=null,frozen=false;
var axis={x:0,y:0},running=false,path=null,pending=null,wPhase=0,graceUntil=0,lastExit=null,focusId=null,stepAcc=0,now=0;
var ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function emit(e){try{sink(e)}catch(er){window.__err.push(String(er&&er.stack||er))}}

/* ---------- walk grid: the room's own boxes say where a body cannot stand ---------- */
function buildGrid(){
 var c=V.cur(),w=cfg.walk,fy=cfg.floorY||0,nx=Math.ceil((w[2]-w[0])/CELL),nz=Math.ceil((w[3]-w[1])/CELL),b=new Uint8Array(nx*nz);
 function block(x0,z0,x1,z1){
  var i0=Math.max(0,Math.floor((x0-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((x1-w[0])/CELL)),j0=Math.max(0,Math.floor((z0-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((z1-w[1])/CELL));
  for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=1;
 }
 c.solids.forEach(function(s){if(s[4]<fy+3.2&&s[5]>fy+.75)block(s[0]-RADIUS,s[1]-RADIUS,s[0]+s[2]+RADIUS,s[1]+s[3]+RADIUS)});
 c.bodies.forEach(function(p){block(p[0]-p[2]-RADIUS*.6,p[1]-p[2]-RADIUS*.6,p[0]+p[2]+RADIUS*.6,p[1]+p[2]+RADIUS*.6)});
 (cfg.blocks||[]).forEach(function(r){block(r[0]-RADIUS,r[1]-RADIUS,r[2]+RADIUS,r[3]+RADIUS)});
 /* every exit mouth is a hole in the furniture round it, so a door can always be reached and walked into */
 (exits||[]).forEach(function(x){var e=x.def,i0=Math.max(0,Math.floor((e.x-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((e.x+e.w-w[0])/CELL)),j0=Math.max(0,Math.floor((e.z-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((e.z+e.d-w[1])/CELL));for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=0});
 Object.keys(actors).forEach(function(id){var a=actors[id];if(a.def.ghost||a.def.follow)return;var r=a.def.sit?1.0:.7;block(a.x-r,a.z-r,a.x+r,a.z+r)});
 /* a door is a hole in whatever stands in front of it */
 (cfg.clear||[]).forEach(function(r){var i0=Math.max(0,Math.floor((r[0]-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((r[2]-w[0])/CELL)),j0=Math.max(0,Math.floor((r[1]-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((r[3]-w[1])/CELL));for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=0});
 grid={nx:nx,nz:nz,b:b,x0:w[0],z0:w[1]};
}
function cellOf(x,z){return[Math.floor((x-grid.x0)/CELL),Math.floor((z-grid.z0)/CELL)]}
function free(i,j){return i>=0&&j>=0&&i<grid.nx&&j<grid.nz&&!grid.b[j*grid.nx+i]}
function freeAt(x,z){var c=cellOf(x,z);return free(c[0],c[1])}
function centre(i,j){return[grid.x0+(i+.5)*CELL,grid.z0+(j+.5)*CELL]}
/* the nearest standable cell to a point (spiral) — a tap on a sofa walks to the edge of the sofa */
function nearestFree(x,z,max){
 var c=cellOf(x,z),best=null,bd=1e9,R=Math.ceil((max||8)/CELL);
 c[0]=Math.max(0,Math.min(grid.nx-1,c[0]));c[1]=Math.max(0,Math.min(grid.nz-1,c[1]));
 if(free(c[0],c[1]))return c;
 for(var r=1;r<=R&&!best;r++)for(var i=c[0]-r;i<=c[0]+r;i++)for(var j=c[1]-r;j<=c[1]+r;j++){
  if(Math.max(Math.abs(i-c[0]),Math.abs(j-c[1]))!==r||!free(i,j))continue;
  var p=centre(i,j),d=(p[0]-x)*(p[0]-x)+(p[1]-z)*(p[1]-z);if(d<bd){bd=d;best=[i,j]}}
 return best;
}
function sight(ax,az,bx,bz){var d=Math.hypot(bx-ax,bz-az),n=Math.ceil(d/(CELL*.5));for(var k=1;k<n;k++){var t=k/n;if(!freeAt(ax+(bx-ax)*t,az+(bz-az)*t))return false}return true}
function route(fx,fz,tx,tz){
 var s=nearestFree(fx,fz,4),g=nearestFree(tx,tz,10);if(!s||!g)return null;
 var nx=grid.nx,N=nx*grid.nz,si=s[1]*nx+s[0],gi=g[1]*nx+g[0];
 if(si===gi)return[[tx,tz]].filter(function(p){return freeAt(p[0],p[1])});
 var G=new Float32Array(N).fill(1e9),F=new Float32Array(N).fill(1e9),from=new Int32Array(N).fill(-1),open=[si],inOpen=new Uint8Array(N),closed=new Uint8Array(N);
 G[si]=0;F[si]=Math.hypot(g[0]-s[0],g[1]-s[1]);inOpen[si]=1;
 var DIR=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]],guard=0;
 while(open.length&&guard++<20000){
  var bi=0;for(var k=1;k<open.length;k++)if(F[open[k]]<F[open[bi]])bi=k;
  var cur=open[bi];open[bi]=open[open.length-1];open.pop();inOpen[cur]=0;
  if(cur===gi)break;closed[cur]=1;
  var ci=cur%nx,cj=(cur-ci)/nx;
  for(var d=0;d<8;d++){var ni=ci+DIR[d][0],nj=cj+DIR[d][1];if(!free(ni,nj))continue;
   if(DIR[d][2]>1&&(!free(ci+DIR[d][0],cj)||!free(ci,cj+DIR[d][1])))continue;
   var n=nj*nx+ni;if(closed[n])continue;var ng=G[cur]+DIR[d][2];
   if(ng<G[n]){G[n]=ng;from[n]=cur;F[n]=ng+Math.hypot(g[0]-ni,g[1]-nj);if(!inOpen[n]){open.push(n);inOpen[n]=1}}}
 }
 if(from[gi]<0)return null;
 var pts=[],c=gi;while(c!==si&&c>=0){var i=c%nx;pts.push(centre(i,(c-i)/nx));c=from[c]}
 pts.reverse();
 if(freeAt(tx,tz)&&pts.length){pts[pts.length-1]=[tx,tz]}
 /* pull the string: drop every corner the walker can see past */
 var out=[],ax=fx,az=fz,k2=0;
 while(k2<pts.length){var far=k2;for(var q=pts.length-1;q>k2;q--)if(sight(ax,az,pts[q][0],pts[q][1])){far=q;break}out.push(pts[far]);ax=pts[far][0];az=pts[far][1];k2=far+1}
 return out;
}

/* ---------- bodies ---------- */
function lookOf(o,S){
 var d={h:o.h||6.2,skin:o.skin,hair:o.hair,pants:o.pants,shirt:o.shirt,shirt2:o.shirt2,pat:o.pat||null,scarf:o.scarf||null,cap:o.cap||null,vest:o.vest||null,cane:!!o.cane,long:!!o.long,anim:o.anim||'idle'};
 if(o.kit){d.shirt=S.ik?S.s:S.p;d.shirt2=S.ik?S.p:S.s;d.pat=S.pattern&&S.pattern!=='solid'?S.pattern:null}
 if(o.scarf===true)d.scarf=[S.p,S.s];
 if(o.cap===true)d.cap=S.t;
 return d;
}
function Body(def,S,fy){
 var o=lookOf(def.look||{},S);o.x=def.x;o.z=def.z;o.y=def.y==null?fy:def.y;o.yaw=def.yaw||0;
 if(def.sit){o.sit=true;o.seat=def.seat;o.y=def.y==null?fy:def.y}
 if(def.head!=null)o.look=def.head;
 var P=V.person(o);V.cur().G.add(P.g);
 this.P=P;this.def=def;this.x=def.x;this.z=def.z;this.yaw=o.yaw;this.h=o.h;this.fy=fy;this.w=0;this.moving=false;this.path=null;this.speed=def.speed||SPEED*.8;
}
Body.prototype.place=function(){if(!this.P.sit){this.P.g.position.x=this.x;this.P.g.position.z=this.z}this.P.g.rotation.y=this.yaw};
Body.prototype.turn=function(to,dt,rate){var d=to-this.yaw;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;this.yaw+=d*Math.min(1,dt*(rate||10))};
Body.prototype.stride=function(dist,k){this.w+=dist*.95/this.P.s;this.P.walk=1;this.P.stride(this.w,k)};
Body.prototype.rest=function(dt){if(this.P.walk){this.P.walk=Math.max(0,this.P.walk-dt*6);if(this.P.walk>0)this.P.stride(this.w,this.P.walk);else this.P.stride(0,0)}};
Body.prototype.remove=function(){var g=this.P.g;if(g.parent)g.parent.remove(g)};

function marker(col,size){
 var g=new THREE.Group(),m=new THREE.Mesh(new THREE.OctahedronGeometry(size||.42,0),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.95}));
 g.add(m);V.cur().G.add(g);V.cur().mats.push(m.material);return{g:g,m:m};
}
function pad(e,col){
 var geo=new THREE.PlaneGeometry(e.w,e.d),mat=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.34,depthWrite:false,side:THREE.DoubleSide});
 var m=new THREE.Mesh(geo,mat);m.rotation.x=-PI/2;m.position.set(e.x+e.w/2,(cfg.floorY||0)+.06,e.z+e.d/2);V.cur().G.add(m);V.cur().mats.push(mat);
 /* a chevron that says which way the door takes you */
 var a=new THREE.Mesh(new THREE.ConeGeometry(.5,1,4),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9}));
 var dir=e.dir||'n';a.rotation.set(dir==='n'?-PI/2:dir==='s'?PI/2:0,0,dir==='e'?-PI/2:dir==='w'?PI/2:0);
 a.position.set(e.x+e.w/2,(cfg.floorY||0)+2.2,e.z+e.d/2);V.cur().G.add(a);V.cur().mats.push(a.material);
 return{m:m,a:a,mat:mat};
}

/* ---------- who and what is in the room ---------- */
var WHITE=null;
function white(){return WHITE||(WHITE=V.clean('#fff6e6'))}
function sigActor(a){return JSON.stringify([a.follow?0:a.x,a.follow?0:a.z,a.yaw||0,!!a.sit,a.seat||0,a.y==null?null:a.y,a.look||{},!!a.follow,!!a.ghost])}
function sigExit(e){return JSON.stringify([e.x,e.z,e.w,e.d,e.dir||'n'])}
function addActor(a,near){
 var cur=V.cur(),fy=cfg.floorY||0,def=a;
 if(a.follow&&near){def={};for(var k in a)def[k]=a[k];def.x=near.x-1.2;def.z=near.z+1.4;def.sit=false}
 var b=new Body(def,cur.S,fy);b.sig=sigActor(a);actors[a.id]=b;b.place();cur.anims.push(b.P.u);
 if(a.talk!==false){var mk=marker(white(),.36);mk.g.position.set(b.x,(a.sit?(a.seat||1.6):0)+fy+b.h*(a.sit?.78:1.05)+1.1,b.z);marks.push({kind:'actor',id:a.id,mk:mk,on:a.mark!==false,reach:a.reach||REACH})}
}
function dropMark(kind,id){marks=marks.filter(function(m){if(m.kind===kind&&m.id===id){if(m.mk.g.parent)m.mk.g.parent.remove(m.mk.g);return false}return true})}
function dropActor(id){var a=actors[id];if(!a)return;a.remove();var an=V.cur().anims,i=an.indexOf(a.P.u);if(i>=0)an.splice(i,1);dropMark('actor',id);delete actors[id];if(focusId===id)focusId=null}
function addSpot(s){var fy=cfg.floorY||0,mk=marker(white(),.34);mk.g.position.set(s.x,fy+(s.y==null?2.6:s.y),s.z);spots.push(s);marks.push({kind:'spot',id:s.id,mk:mk,on:s.on!==false,reach:s.reach||REACH})}
function addExit(e){exits.push({def:e,sig:sigExit(e),locked:!!e.locked,vis:pad(e,white())})}
function dropExit(x){[x.vis.m,x.vis.a].forEach(function(m){if(m.parent)m.parent.remove(m)});exits.splice(exits.indexOf(x),1);if(lastExit===x)lastExit=null}
/* somebody who walks with him starts a step behind him, never inside a wall */
function settleFollowers(){Object.keys(actors).forEach(function(id){var a=actors[id];if(!a.def.follow||a.settled)return;a.settled=true;var c=nearestFree(player.x-1.2,player.z+1.4,5);if(c){var p=centre(c[0],c[1]);a.x=p[0];a.z=p[1];a.place()}})}
/* The story moved: people came, went or changed places, a thing was taken, a door opened. The
 * room is NOT rebuilt — only what differs is touched, so nothing on screen blinks. */
function sync(n){
 if(!cfg||!player)return false;
 var want={},i;
 (n.actors||[]).forEach(function(a){want[a.id]=a});
 Object.keys(actors).forEach(function(id){var w=want[id];if(!w||sigActor(w)!==actors[id].sig)dropActor(id)});
 (n.actors||[]).forEach(function(a){
  if(!actors[a.id]){addActor(a,a.follow?{x:player.x,z:player.z}:null);return}
  actors[a.id].def.talk=a.talk;var has=false;marks.forEach(function(m){if(m.kind==='actor'&&m.id===a.id){has=true;m.on=a.mark!==false;m.reach=a.reach||REACH}});
  if(a.talk===false&&has)dropMark('actor',a.id);
  if(a.talk!==false&&!has){var b=actors[a.id],fy=cfg.floorY||0,mk=marker(white(),.36);mk.g.position.set(b.x,(a.sit?(a.seat||1.6):0)+fy+b.h*(a.sit?.78:1.05)+1.1,b.z);marks.push({kind:'actor',id:a.id,mk:mk,on:a.mark!==false,reach:a.reach||REACH})}
 });
 var keepSpot={};(n.spots||[]).forEach(function(s){keepSpot[s.id]=s});
 spots.slice().forEach(function(s){if(!keepSpot[s.id]){dropMark('spot',s.id);spots.splice(spots.indexOf(s),1)}});
 (n.spots||[]).forEach(function(s){var have=false;for(i=0;i<spots.length;i++)if(spots[i].id===s.id)have=true;if(!have)addSpot(s);else marks.forEach(function(m){if(m.kind==='spot'&&m.id===s.id)m.on=s.on!==false})});
 var keepExit={};(n.exits||[]).forEach(function(e){keepExit[e.id]=e});
 exits.slice().forEach(function(x){var w=keepExit[x.def.id];if(!w||sigExit(w)!==x.sig)dropExit(x)});
 (n.exits||[]).forEach(function(e){var x=exitOf(e.id);if(!x)addExit(e);else{x.def=e;x.locked=!!e.locked}});
 cfg.actors=n.actors||[];cfg.spots=n.spots||[];cfg.exits=n.exits||[];
 buildGrid();
 /* if the story stood somebody where he is standing, he steps aside */
 if(!freeAt(player.x,player.z)){var c=nearestFree(player.x,player.z,6);if(c){var p=centre(c[0],c[1]);player.x=p[0];player.z=p[1];player.place()}}
 settleFollowers();
 if(n.player&&JSON.stringify(n.player)!==JSON.stringify(cfg.player||{}))P.player(n.player);
 path=null;pending=null;retarget(true);
 return true;
}

/* ---------- enter a room ---------- */
function enter(c){
 cfg=c;WHITE=null;actors={};exits=[];spots=[];marks=[];target=null;path=null;pending=null;focusId=null;frozen=!!c.frozen;axis.x=axis.y=0;lastExit=null;
 var st=V.st;st.club=c.club&&V.SK[c.club]?c.club:st.club;st.scene=c.room;st.time=c.time==='night'?'night':'day';st.play=true;
 var stage=document.getElementById('stage');if(stage)stage.className='stage '+st.time;
 var f=c.frame||{};V.view.mode='follow';V.view.top=f.top==null?.86:f.top;V.view.bottom=f.bottom==null?-.8:f.bottom;V.view.side=.96;V.view.viewH=c.viewH||null;V.view.zoom=1;V.view.lift=2;
 V.rebuild();
 var sp=c.spawn||{x:(c.walk[0]+c.walk[2])/2,z:(c.walk[1]+c.walk[3])/2,yaw:0};
 (c.actors||[]).forEach(function(a){addActor(a,sp)});
 (c.spots||[]).forEach(addSpot);
 (c.exits||[]).forEach(addExit);
 buildGrid();
 var cur=V.cur(),S=cur.S,fy=c.floorY||0,cell=nearestFree(sp.x,sp.z,6),pos=cell?centre(cell[0],cell[1]):[sp.x,sp.z];
 if(freeAt(sp.x,sp.z))pos=[sp.x,sp.z];
 player=new Body({x:pos[0],z:pos[1],yaw:sp.yaw||0,look:c.player||{}},S,fy);player.place();cur.anims.push(player.P.u);
 settleFollowers();
 V.view.focus=player.x;V.fit();
 graceUntil=now+.7;
 emit({type:'entered',room:c.room,issues:audit()});
 retarget(true);
}

/* ---------- targets ---------- */
function reachOf(kind,id){
 if(kind==='actor'){var a=actors[id];return a?[a.x,a.z]:null}
 for(var i=0;i<spots.length;i++)if(spots[i].id===id)return[spots[i].x,spots[i].z];
 for(var j=0;j<exits.length;j++)if(exits[j].def.id===id){var e=exits[j].def;return[e.x+e.w/2,e.z+e.d/2]}
 return null;
}
function retarget(force){
 var best=null,bd=1e9;
 marks.forEach(function(m){if(!m.on)return;var p=reachOf(m.kind,m.id);if(!p)return;var d=(p[0]-player.x)*(p[0]-player.x)+(p[1]-player.z)*(p[1]-player.z);if(d<m.reach*m.reach&&d<bd){bd=d;best={kind:m.kind,id:m.id}}});
 if(!best)exits.forEach(function(x){var e=x.def,cx=Math.max(e.x,Math.min(e.x+e.w,player.x)),cz=Math.max(e.z,Math.min(e.z+e.d,player.z)),d=(cx-player.x)*(cx-player.x)+(cz-player.z)*(cz-player.z);if(d<2.2*2.2&&d<bd){bd=d;best={kind:'exit',id:e.id,locked:x.locked}}});
 var same=(best&&target&&best.kind===target.kind&&best.id===target.id&&!!best.locked===!!target.locked)||(!best&&!target);
 if(!same||force){target=best;emit({type:'target',target:target})}
}
function act(t){
 t=t||target;if(!t||frozen)return false;
 if(t.kind==='exit'){var x=exitOf(t.id);if(!x)return false;if(x.locked){emit({type:'locked',id:t.id});return true}leave(x);return true}
 if(t.kind==='actor'&&actors[t.id])faceEachOther(t.id);
 emit({type:'act',kind:t.kind,id:t.id});return true;
}
function exitOf(id){for(var i=0;i<exits.length;i++)if(exits[i].def.id===id)return exits[i];return null}
function leave(x){if(frozen)return;frozen=true;path=null;pending=null;emit({type:'exit',id:x.def.id})}
function faceEachOther(id){var a=actors[id];if(!a)return;player.wantYaw=Math.atan2(a.x-player.x,a.z-player.z);if(!a.def.sit&&!a.def.still)a.wantYaw=Math.atan2(player.x-a.x,player.z-a.z)}

/* ---------- input ---------- */
function goTo(kind,id,then){
 var p=reachOf(kind,id);if(!p||frozen)return false;
 /* a door is walked INTO: whoever stands beside it must not take the press meant for it */
 if(kind==='exit'){var x=exitOf(id);if(!x)return false;if(x.locked){emit({type:'locked',id:id});return true}lastExit=null;path=route(player.x,player.z,p[0],p[1]);pending=null;if(path&&!path.length){path=null;leave(x)}return !!path||frozen}
 var c=nearestFree(p[0]+(player.x>p[0]?1.2:-1.2),p[1]+1.3,5)||nearestFree(p[0],p[1],6);if(!c)return false;
 var q=centre(c[0],c[1]);path=route(player.x,player.z,q[0],q[1]);pending=then===false?null:{kind:kind,id:id};
 if(!path){pending=null;return false}return true;
}
function walkTo(x,z){if(frozen)return false;var c=nearestFree(x,z,8);if(!c)return false;var q=freeAt(x,z)?[x,z]:centre(c[0],c[1]);path=route(player.x,player.z,q[0],q[1]);pending=null;return !!path}
function pick(cx,cy){
 var cam=V.camera(),el=V.renderer().domElement,r=el.getBoundingClientRect(),best=null,bd=46*46,v=new THREE.Vector3();
 function near(x,y,z,kind,id,extra){v.set(x,y,z).project(cam);var sx=r.left+(v.x+1)/2*r.width,sy=r.top+(1-v.y)/2*r.height,d=(sx-cx)*(sx-cx)+(sy-cy)*(sy-cy);if(d<bd*(extra||1)){bd=d;best={kind:kind,id:id}}}
 marks.forEach(function(m){if(!m.on)return;var p=reachOf(m.kind,m.id),fy=cfg.floorY||0;if(!p)return;
  if(m.kind==='actor'){var a=actors[m.id];near(p[0],fy+a.h*.55,p[1],'actor',m.id);near(p[0],fy+a.h*1.05,p[1],'actor',m.id)}else near(p[0],fy+1.6,p[1],'spot',m.id)});
 if(best)return best;
 ndc.set(((cx-r.left)/r.width)*2-1,-(((cy-r.top)/r.height)*2-1));ray.setFromCamera(ndc,cam);plane.constant=-(cfg.floorY||0);
 if(!ray.ray.intersectPlane(plane,hit))return null;
 for(var i=0;i<exits.length;i++){var e=exits[i].def;if(hit.x>=e.x-.8&&hit.x<=e.x+e.w+.8&&hit.z>=e.z-.8&&hit.z<=e.z+e.d+.8)return{kind:'exit',id:e.id}}
 return{kind:'ground',x:hit.x,z:hit.z};
}
function tap(cx,cy){
 if(frozen||!player)return;var t=pick(cx,cy);if(!t)return;
 emit({type:'tap',kind:t.kind});
 if(t.kind==='ground'){walkTo(t.x,t.z);return}
 if(t.kind==='exit'){var e=exitOf(t.id).def;path=route(player.x,player.z,e.x+e.w/2,e.z+e.d/2);pending=null;return}
 if(target&&target.kind===t.kind&&target.id===t.id){act(t);return}
 goTo(t.kind,t.id);
}

/* ---------- frame ---------- */
function slide(b,dx,dz){
 var nx=b.x+dx,nz=b.z+dz;
 if(freeAt(nx,nz)){b.x=nx;b.z=nz;return true}
 if(dx&&freeAt(nx,b.z)){b.x=nx;return true}
 if(dz&&freeAt(b.x,nz)){b.z=nz;return true}
 return false;
}
function follow(b,dt){
 if(!b.path||!b.path.length){b.moving=false;b.path=null;return 0}
 var p=b.path[0],dx=p[0]-b.x,dz=p[1]-b.z,d=Math.hypot(dx,dz),stepLen=b.speed*dt;
 if(d<=stepLen+.02){b.x=p[0];b.z=p[1];b.path.shift();if(!b.path.length){b.moving=false;b.path=null}return d}
 b.x+=dx/d*stepLen;b.z+=dz/d*stepLen;b.wantYaw=Math.atan2(dx,dz);b.moving=true;return stepLen;
}
function frame(t,dt){
 now=t;if(!player||!cfg)return;
 var moved=0;
 if(!frozen){
  var ax=axis.x,ay=axis.y,mag=Math.hypot(ax,ay);
  if(mag>.12){
   path=null;pending=null;if(mag>1){ax/=mag;ay/=mag;mag=1}
   /* the stick is the screen: right is along the room, up is into it */
   var sp=SPEED*(running?RUN:1)*Math.min(1,mag*1.15)*dt,dx=ax/mag*sp,dz=ay/mag*sp;
   var ox=player.x,oz=player.z;if(slide(player,dx,dz)){moved=Math.hypot(player.x-ox,player.z-oz);player.wantYaw=Math.atan2(player.x-ox,player.z-oz)}
  }else if(path){
   player.path=path;player.speed=SPEED*(running?RUN:1);moved=follow(player,dt);path=player.path;
   if(!path&&pending){var pd=pending;pending=null;retarget(true);var pr=reachOf(pd.kind,pd.id),pm=marks.filter(function(m){return m.kind===pd.kind&&m.id===pd.id})[0];/* walked there on purpose: a neighbour standing closer must not take the press */if(target&&target.kind===pd.kind&&target.id===pd.id)act(pd);else if(pr&&pm&&pm.on&&(pr[0]-player.x)*(pr[0]-player.x)+(pr[1]-player.z)*(pr[1]-player.z)<pm.reach*pm.reach)act(pd);else{faceEachOther(pd.id)}}
  }
 }
 if(moved>0){player.stride(moved,1);stepAcc+=moved;if(stepAcc>2.6*player.P.s){stepAcc=0;emit({type:'step',surface:cfg.surface||'floor'})}}else player.rest(dt);
 if(player.wantYaw!=null)player.turn(player.wantYaw,dt,moved>0?12:7);
 player.place();
 Object.keys(actors).forEach(function(id){var a=actors[id];
  if(a.path){var m=follow(a,dt);if(m>0)a.stride(m,1);if(!a.path){a.rest(dt);emit({type:'arrived',id:id})}}
  else if(a.def.follow&&!frozen){/* a companion: keeps a step behind, on the side he started on */
   var gx=player.x-Math.sin(player.yaw)*2.1+(a.def.side||1)*Math.cos(player.yaw)*1.5,gz=player.z-Math.cos(player.yaw)*2.1-(a.def.side||1)*Math.sin(player.yaw)*1.5,ddx=gx-a.x,ddz=gz-a.z,dd=Math.hypot(ddx,ddz);
   if(dd>1.1){var st2=Math.min(dd-.6,SPEED*1.05*dt),o1=a.x,o2=a.z;if(slide(a,ddx/dd*st2,ddz/dd*st2)){var mv=Math.hypot(a.x-o1,a.z-o2);a.stride(mv,1);a.wantYaw=Math.atan2(a.x-o1,a.z-o2)}else a.rest(dt)}else{a.rest(dt);a.wantYaw=player.yaw}
  }else a.rest(dt);
  if(a.wantYaw!=null&&!a.def.sit)a.turn(a.wantYaw,dt,6);
  /* a head that notices who walked in */
  if(a.def.head==null||focusId===id){var dxp=player.x-a.x,dzp=player.z-a.z,near=dxp*dxp+dzp*dzp<64;
   if((near&&a.def.notice!==false)||focusId===id){var want=Math.atan2(dxp,dzp)-a.yaw;while(want>PI)want-=2*PI;while(want<-PI)want+=2*PI;a.P.look=Math.max(-1.1,Math.min(1.1,want))}else a.P.look=null}else a.P.look=a.def.head;
  a.place();
 });
 /* doors you walk into */
 if(!frozen&&t>graceUntil){
  var inside=null;for(var i=0;i<exits.length;i++){var e=exits[i].def;if(player.x>=e.x&&player.x<=e.x+e.w&&player.z>=e.z&&player.z<=e.z+e.d){inside=exits[i];break}}
  if(inside&&inside!==lastExit){lastExit=inside;if(inside.locked)emit({type:'locked',id:inside.def.id});else if(inside.def.auto!==false)leave(inside)}
  if(!inside)lastExit=null;
 }
 if(!frozen)retarget(false);
 /* marks breathe; the one in reach breathes faster */
 marks.forEach(function(m,i){var on=m.on&&!frozen,hot=target&&target.kind===m.kind&&target.id===m.id;m.mk.g.visible=on;if(!on)return;
  if(m.kind==='actor'){var a=actors[m.id];if(a){m.mk.g.position.x=a.x;m.mk.g.position.z=a.z}}
  m.mk.m.position.y=Math.sin(t*(hot?5:2.2)+i)*.18;m.mk.m.rotation.y=t*(hot?2.4:1.1);m.mk.m.scale.setScalar(hot?1.35:1)});
 exits.forEach(function(x,i){var hot=target&&target.kind==='exit'&&target.id===x.def.id,k=x.locked?.12:(.26+.14*Math.sin(t*2.4+i)+(hot?.2:0));x.vis.mat.opacity=k;x.vis.a.material.opacity=x.locked?.25:.9;x.vis.a.visible=!frozen;
  var dir=x.def.dir||'n',bob=Math.sin(t*3+i)*.25;x.vis.a.position.y=(cfg.floorY||0)+2.2+(dir==='n'||dir==='s'?0:bob*0);if(dir==='n')x.vis.a.position.z=x.def.z+x.def.d/2-bob;else if(dir==='s')x.vis.a.position.z=x.def.z+x.def.d/2+bob;else if(dir==='e')x.vis.a.position.x=x.def.x+x.def.w/2+bob;else x.vis.a.position.x=x.def.x+x.def.w/2-bob});
 /* camera: with the player; in a conversation, between the two of them and a step closer */
 var fa=focusId&&actors[focusId];V.view.focus=fa?(player.x+fa.x)/2:player.x;V.view.zoom=fa?(cfg.talkZoom||1.22):1;
}

/* ---------- checks the host (and the probe) can ask for ---------- */
function audit(){
 var out=[];if(!grid)return out;
 function reach(x,z,what){var r=route(player.x,player.z,x,z);if(!r)out.push(what+' unreachable')}
 (cfg.exits||[]).forEach(function(e){reach(e.x+e.w/2,e.z+e.d/2,'exit:'+e.id)});
 (cfg.spots||[]).forEach(function(s){var c=nearestFree(s.x,s.z,REACH-.4);if(!c)out.push('spot:'+s.id+' has nowhere to stand');else{var p=centre(c[0],c[1]);if(Math.hypot(p[0]-s.x,p[1]-s.z)>REACH-.2)out.push('spot:'+s.id+' out of reach');else reach(p[0],p[1],'spot:'+s.id)}});
 (cfg.actors||[]).forEach(function(a){if(a.talk===false)return;var R=a.reach||REACH,c=nearestFree(a.x,a.z+1.2,R)||nearestFree(a.x,a.z,R);if(!c)out.push('actor:'+a.id+' has nowhere to stand');else{var p=centre(c[0],c[1]);if(Math.hypot(p[0]-a.x,p[1]-a.z)>R-.1)out.push('actor:'+a.id+' out of reach');else reach(p[0],p[1],'actor:'+a.id)}});
 if(cfg.spawn&&!freeAt(cfg.spawn.x,cfg.spawn.z))out.push('spawn blocked');
 (cfg.exits||[]).forEach(function(e){if(cfg.spawn&&cfg.spawn.x>=e.x&&cfg.spawn.x<=e.x+e.w&&cfg.spawn.z>=e.z&&cfg.spawn.z<=e.z+e.d)out.push('spawn inside exit:'+e.id)});
 return out;
}
function gridDump(){return grid?{nx:grid.nx,nz:grid.nz,cell:CELL,x0:grid.x0,z0:grid.z0,rows:Array.from({length:grid.nz},function(_,j){var s='';for(var i=0;i<grid.nx;i++)s+=grid.b[j*grid.nx+i]?'#':'.';return s})}:null}

var P=window.__vxPlay={
 on:function(fn){sink=fn||function(){}},
 enter:function(c){try{enter(c);return true}catch(er){window.__err.push(String(er&&er.stack||er));emit({type:'error',message:String(er&&er.message||er)});return false}},
 axis:function(x,y){axis.x=x||0;axis.y=y||0},
 run:function(b){running=!!b},
 act:function(){return act()},
 tap:tap,walkTo:walkTo,goTo:goTo,
 freeze:function(b){frozen=!!b;if(frozen){axis.x=axis.y=0;path=null;pending=null}else{graceUntil=now+.35;retarget(true)}},
 focus:function(id){focusId=id||null;if(id)faceEachOther(id)},
 mark:function(kind,id,on){marks.forEach(function(m){if(m.kind===kind&&m.id===id)m.on=!!on});retarget(true)},
 lock:function(id,locked){var x=exitOf(id);if(x){x.locked=!!locked;retarget(true)}},
 actor:function(id,patch){var a=actors[id];if(!a)return false;if(patch.anim){a.P.mode=patch.anim}if(patch.yaw!=null)a.wantYaw=patch.yaw;return true},
 move:function(id,x,z){var a=actors[id];if(!a||a.def.sit)return false;a.path=route(a.x,a.z,x,z);a.speed=a.def.speed||SPEED*.8;return !!a.path},
 player:function(look){if(!player)return;var old=player;cfg.player=look;player=new Body({x:old.x,z:old.z,yaw:old.yaw,look:look},V.cur().S,cfg.floorY||0);player.place();old.remove();var an=V.cur().anims,i=an.indexOf(old.P.u);if(i>=0)an[i]=player.P.u;else an.push(player.P.u)},
 where:function(){return player?{room:cfg.room,x:player.x,z:player.z,target:target,frozen:frozen,moving:!!path}:null},
 update:function(n){try{return sync(n)}catch(er){window.__err.push(String(er&&er.stack||er));emit({type:'error',message:String(er&&er.message||er)});return false}},
 audit:audit,grid:gridDump,
 frame:function(f){if(!cfg)return;V.view.top=f.top;V.view.bottom=f.bottom;V.fit()}
};
V.onFrame(frame);

/* ---------- boot: the page is the stage ---------- */
var q=new URLSearchParams(location.search),canvas=document.getElementById('gl'),stage=document.getElementById('stage');
var down=null;
canvas.addEventListener('pointerdown',function(e){down={x:e.clientX,y:e.clientY,t:performance.now()}});
canvas.addEventListener('pointerup',function(e){if(!down)return;var d=Math.hypot(e.clientX-down.x,e.clientY-down.y),dt=performance.now()-down.t;down=null;if(d<12&&dt<600)tap(e.clientX,e.clientY)});
fetch('/life/voxel/skins').then(function(r){return r.ok?r.json():{skins:{}}}).catch(function(){return{skins:{}}}).then(function(d){
 V.setSkins(d.skins||{});
 return V.boot({canvas:canvas,stage:stage,pointer:false,quality:q.get('q')||undefined,capture:q.get('capture')==='1'});
}).then(function(){
 var l=document.getElementById('loader');if(l)l.classList.add('off');
 window.__ready=true;emit({type:'ready',quality:V.quality().name});
 if(window.parent!==window&&window.parent.__vxHostReady)window.parent.__vxHostReady(P);
}).catch(function(er){window.__err.push(String(er&&er.stack||er));emit({type:'error',message:String(er&&er.message||er)})});
})();
