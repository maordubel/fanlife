/* LIFE 3D play — the smooth stylised engine behind the same contract as the voxel runtime.
 *
 * It decides NOTHING about the story. The host (the React shell) says which room, who stands where
 * and which doors exist; this answers with what the player did. Same object, same events:
 * `window.__vxPlay` — so the shell cannot tell which of the two renderers it is holding.
 * Every word the player reads is the host's DOM, never this canvas.
 * Room units: 1 unit = 27 cm (`K.U`). The walking rules (grid, A*, targets, doors) are the voxel
 * runtime's, unchanged. */
(function(){
"use strict";
window.__err=window.__err||[];
var IND={home:1,hall:1,school:1,work:1,'club-room':1};var K=window.__town,T=K.T,RM=window.RM,U=K.U,PI=Math.PI;
var SEAL=null,CELL=.5,RADIUS=.45,BODY=.55,SQUEEZE=.2,REACH=3.5,SPEED=5.6,RUN=1.55;
var sink=function(){},cfg=null,grid=null,player=null,actors={},exits=[],spots=[],marks=[],decor=[],target=null,frozen=false,S=null,SKINS={};
var lastMood=null,FR={top:.8,bottom:-.4},axis={x:0,y:0},running=false,path=null,pending=null,graceUntil=0,lastExit=null,focusId=null,stepAcc=0,now=0,camX=0,camZ=1,fade=null;
var ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
function emit(e){try{sink(e)}catch(er){(window.__err=window.__err||[]).push(String(er&&er.stack||er))}}
function err(er){(window.__err=window.__err||[]).push(String(er&&er.stack||er));emit({type:'error',message:String(er&&er.message||er)})}

/* ---------- walk grid ---------- */
function buildGrid(){
 var w=cfg.walk,nx=Math.ceil((w[2]-w[0])/CELL),nz=Math.ceil((w[3]-w[1])/CELL),b=new Uint8Array(nx*nz);
 function block(x0,z0,x1,z1){
  var i0=Math.max(0,Math.floor((x0-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((x1-w[0])/CELL)),j0=Math.max(0,Math.floor((z0-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((z1-w[1])/CELL));
  for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=1;
 }
 (cfg.blocks||[]).forEach(function(r){block(r[0]-RADIUS,r[1]-RADIUS,r[2]+RADIUS,r[3]+RADIUS)});
 /* a piece of furniture keeps a whole shoulder off it (rule 131): a body is half a metre wide, not a point */
 AUTO.forEach(function(r){var p=r[4]==null?BODY:r[4];block(r[0]-p,r[1]-p,r[2]+p,r[3]+p)});
 decor.forEach(function(p){block(p.x-.8,p.z-.8,p.x+.8,p.z+.8)});
 (exits||[]).forEach(function(x){var e=x.def,i0=Math.max(0,Math.floor((e.x-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((e.x+e.w-w[0])/CELL)),j0=Math.max(0,Math.floor((e.z-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((e.z+e.d-w[1])/CELL));for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=0});
 Object.keys(actors).forEach(function(id){var a=actors[id];if(a.def.ghost||a.def.follow)return;var r=a.def.sit?1.0:.7;block(a.x-r,a.z-r,a.x+r,a.z+r)});
 (cfg.clear||[]).forEach(function(r){var i0=Math.max(0,Math.floor((r[0]-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((r[2]-w[0])/CELL)),j0=Math.max(0,Math.floor((r[1]-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((r[3]-w[1])/CELL));for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=0});
 grid={nx:nx,nz:nz,b:b,x0:w[0],z0:w[1]};
 /* floor that cannot be walked to (the strip behind a desk, between a sofa and the wall) is not floor: a target there
    would send the player to a place he can see and never reach, so it is sealed — measured from where he stands */
 if(SEAL){var st=nearestFree(SEAL[0],SEAL[1],6);if(st){var seen=new Uint8Array(nx*nz),q=[st[1]*nx+st[0]];seen[q[0]]=1;
  while(q.length){var c=q.pop(),ci=c%nx,cj=(c-ci)/nx;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var i=ci+d[0],j=cj+d[1];if(i<0||j<0||i>=nx||j>=nz)return;var k=j*nx+i;if(seen[k]||b[k])return;seen[k]=1;q.push(k)})}
  for(var k=0;k<nx*nz;k++)if(!b[k]&&!seen[k])b[k]=2}}
}
/* the furniture is solid: every object the room actually built that stands on the floor and is taller than a step
   becomes a block, measured from its own mesh — so a sofa, a table, a stall or a bin is walked round, never through.
   Anything that would cut the player off from a door, a person or a spot is given back (largest first). */
var AUTO=[];
function autoBlocks(){var out=[],parts={},w=cfg.walk,Wd=w[2]-w[0],Dd=w[3]-w[1],box=new T.Box3(),root=window.__town&&window.__town.world;if(!root)return out;root.updateMatrixWorld(true);
 root.traverse(function(o){if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||o.isSprite||!o.visible)return;var m=o.material;if(Array.isArray(m))m=m[0];if(!m||m.isMeshBasicMaterial||m.blending===T.AdditiveBlending||(m.transparent&&m.opacity<.6)||m.isShaderMaterial)return;
  for(var q=o;q;q=q.parent){if(q.userData&&(q.userData.head||q.userData.arms||q.userData.noBlock))return;if(!q.visible)return}
  box.setFromObject(o);
  /* a chair is four thin legs, a thin seat and a thin back — no one part of it is furniture, the GROUP is: parts too
     thin to count alone are added up by the object they belong to, and the whole is judged like any other piece */
  var thin=box.max.y-box.min.y<.08||((box.max.x-box.min.x)/U<.3&&(box.max.z-box.min.z)/U<.3);
  if(thin&&o.parent&&o.parent!==root&&box.min.y<.95){var k=o.parent.uuid,g=parts[k];if(!g)g=parts[k]=new T.Box3();g.union(box);return}
  judge(box)});
 /* a group is a chair-sized thing (a row of desks is not one piece): it keeps a hand's width off, not a shoulder — a
    body brushes past a chair, it does not walk through it */
 Object.keys(parts).forEach(function(k){var b=parts[k];if((b.max.x-b.min.x)/U<=2.6&&(b.max.z-b.min.z)/U<=2.6)judge(b,SQUEEZE)});
 function judge(b,pad){if(b.min.y>.95||b.max.y<.3||b.max.y-b.min.y<.08)return;
  var x0=b.min.x/U,x1=b.max.x/U,z0=b.min.z/U,z1=b.max.z/U,dx=x1-x0,dz=z1-z0;
  if(dx>Wd*.55||dz>Dd*.75||dx*dz>70||(dx<.3&&dz<.3))return;
  if(x1<w[0]||x0>w[2]||z1<w[1]||z0>w[3])return;out.push(pad==null?[x0,z0,x1,z1]:[x0,z0,x1,z1,pad])}
 return out}
/* the places the player must be able to get to — judged exactly as audit() judges them: a person or a spot whose
   nearest standing place is out of arm's reach counts as cut off, so the furniture in the way is squeezed for it */
function targetsOf(){var T0=[];(cfg.exits||[]).forEach(function(e){T0.push(function(){return[e.x+e.w/2,e.z+e.d/2]})});
 (cfg.actors||[]).forEach(function(a){if(a.talk===false)return;T0.push(function(){var R=a.reach||REACH,c=nearestFree(a.x,a.z+1.2,R)||nearestFree(a.x,a.z,R);if(!c)return null;var p=centre(c[0],c[1]);return Math.hypot(p[0]-a.x,p[1]-a.z)>R-.1?null:p})});
 (cfg.spots||[]).forEach(function(t){T0.push(function(){var c=nearestFree(t.x,t.z,REACH-.4);if(!c)return null;var p=centre(c[0],c[1]);return Math.hypot(p[0]-t.x,p[1]-t.z)>REACH-.2?null:p})});return T0}
function reachable(sp,T0){return T0.map(function(f){var p=f();return!!(p&&route(sp[0],sp[1],p[0],p[1]))})}
/* Every piece stays solid. Where the full shoulder of padding would cut the player off from a door, a person or a
   spot, the pieces on the way there are first squeezed (a body turns sideways past a chair), and only then — the
   smallest first — given back. A sofa is never walked through because a lamp stood next to it. */
function settleBlocks(sp){var all=Q0.get('noblock')?[]:autoBlocks();AUTO=[];SEAL=null;buildGrid();var s0=freeAt(sp[0],sp[1])?sp:(function(){var c=nearestFree(sp[0],sp[1],6);return c?centre(c[0],c[1]):sp})();
 SEAL=s0;buildGrid();var T0=targetsOf(),base=reachable(s0,T0),open=T0.map(function(f){return f()}),paths=open.map(function(p){return p&&route(s0[0],s0[1],p[0],p[1])});
 AUTO=all.map(function(r){return r.slice()});buildGrid();
 function fails(){var now=reachable(s0,T0);return base.map(function(v,i){return v&&!now[i]?i:-1}).filter(function(i){return i>=0})}
 /* the way there, walked in quarter-cell steps (a route is its corners; the furniture is between them) */
 var walks=paths.map(function(w){if(!w)return null;var pts=[[s0[0],s0[1]]].concat(w),out=[];for(var k=0;k<pts.length-1;k++){var a=pts[k],b=pts[k+1],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(CELL*.25)));for(var m=0;m<=n;m++)out.push([a[0]+(b[0]-a[0])*m/n,a[1]+(b[1]-a[1])*m/n])}return out});
 function gapTo(r,i){var w=walks[i];if(!w)return 1e9;var best=1e9;w.forEach(function(q){var dx=Math.max(r[0]-q[0],0,q[0]-r[2]),dz=Math.max(r[1]-q[1],0,q[1]-r[3]);best=Math.min(best,Math.hypot(dx,dz))});return best}
 function onWay(r,i){return gapTo(r,i)<(r[4]==null?BODY:r[4])+CELL}
 var area=function(r){return(r[2]-r[0])*(r[3]-r[1])},guard=0,bad=fails();
 while(bad.length&&guard++<60){var hit=AUTO.filter(function(r){return bad.some(function(i){return onWay(r,i)})});
  var tight=hit.filter(function(r){return r[4]==null});
  if(tight.length){tight.forEach(function(r){r[4]=SQUEEZE});buildGrid();bad=fails();continue}
  /* still shut: brushing past is allowed (no padding at all) before anything is taken away */
  var brush=hit.filter(function(r){return r[4]===SQUEEZE});
  if(brush.length){brush.forEach(function(r){r[4]=0});buildGrid();bad=fails();continue}
  var near=function(r){return Math.min.apply(null,bad.map(function(i){return gapTo(r,i)}))},drop=hit.length?hit.sort(function(a,b){return area(a)-area(b)})[0]:AUTO.slice().sort(function(a,b){return near(a)-near(b)})[0];if(!drop)break;AUTO.splice(AUTO.indexOf(drop),1);(window.__settle=window.__settle||[]).push({room:cfg.room,drop:drop.slice(0,4).map(function(v){return+v.toFixed(1)}),for:bad.map(function(i){return open[i]})});buildGrid();bad=fails()}
 /* where he comes in is floor: a piece whose shoulder covers the spawn is squeezed */
 if(!freeAt(s0[0],s0[1])){AUTO.forEach(function(r){if(s0[0]>r[0]-BODY-CELL&&s0[0]<r[2]+BODY+CELL&&s0[1]>r[1]-BODY-CELL&&s0[1]<r[3]+BODY+CELL)r[4]=SQUEEZE});buildGrid()}
 /* nobody stands inside a piece: a standing person whose feet are in one steps out of it, to the nearest free floor */
 Object.keys(actors).forEach(function(id){var a=actors[id];if(a.def.sit||a.def.ghost||a.def.follow)return;var inside=AUTO.some(function(r){return a.x>r[0]-.3&&a.x<r[2]+.3&&a.z>r[1]-.3&&a.z<r[3]+.3});if(!inside)return;
  var best=null,bd=1e9;for(var k=0;k<48;k++){var an=k/48*PI*2;for(var d=.6;d<=3;d+=.3){var x=a.x+Math.sin(an)*d,z=a.z+Math.cos(an)*d;if(!AUTO.some(function(r){return x>r[0]-.35&&x<r[2]+.35&&z>r[1]-.35&&z<r[3]+.35})&&x>cfg.walk[0]&&x<cfg.walk[2]&&z>cfg.walk[1]&&z<cfg.walk[3]){if(d<bd){bd=d;best=[x,z]}break}}}
  if(best){a.x=best[0];a.z=best[1];if(a.place)a.place()}});
 buildGrid()}
var Q0=new URLSearchParams(location.search);
function cellOf(x,z){return[Math.floor((x-grid.x0)/CELL),Math.floor((z-grid.z0)/CELL)]}
function free(i,j){return i>=0&&j>=0&&i<grid.nx&&j<grid.nz&&!grid.b[j*grid.nx+i]}
function freeAt(x,z){var c=cellOf(x,z);return free(c[0],c[1])}
function centre(i,j){return[grid.x0+(i+.5)*CELL,grid.z0+(j+.5)*CELL]}
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
 var out=[],ax=fx,az=fz,k2=0;
 while(k2<pts.length){var far=k2;for(var q=pts.length-1;q>k2;q--)if(sight(ax,az,pts[q][0],pts[q][1])){far=q;break}out.push(pts[far]);ax=pts[far][0];az=pts[far][1];k2=far+1}
 return out;
}

/* ---------- bodies ---------- */
var BASE_SKIN=['#f1c7a5','#e0a982','#c68863','#8d5a3e','#6b4430'];
function hash(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function lookOf(o,id){
 var h=hash(id||'x'),d={skin:o.skin||BASE_SKIN[h%5],hair:o.hair||'#2a1a14',top:o.shirt||'#8a8a92',bot:o.pants||'#2a3040',s:((o.h||6.2)/6.2)*1.07,w:o.h&&o.h<5?.9:1,
  style:o.long?'bun':(h%4===0?'buzz':'short'),long:!!o.long,eye:'#3a2a1c',mode:'ctrl',sv:0,sw:0,_id:id};
 if(o.pat&&o.shirt2){d.top2=o.shirt2;d.pat=o.pat}
 if(o.kit&&S){d.top=S.ik?S.s:S.p;d.top2=S.ik?S.p:S.s;if(S.pattern&&S.pattern!=='solid')d.pat=S.pattern;else{d.pat=null;d.top2=null}}
 if(o.scarf===true&&S)d.scarf=[S.p,S.s];else if(o.scarf&&o.scarf.length)d.scarf=o.scarf;
 if(o.cap)d.beanie=o.cap===true?(S&&S.t||'#14141c'):o.cap;
 if(o.vest)d.jacket=o.vest;
 /* who this person is, for the human figure: passed through as authored */
 ['sex','age','build','style','mustache','beard','stubble','glasses','sleeves','jacket','denimJacket','cardigan','track','trackCol','denim','skirt','apron','yoke','trackPants','shoe','shoeStripe','armband','bangles','bag','necklace','watch'].forEach(function(k){if(o[k]!=null)d[k]=o[k]});
 ['trackCol','yoke','shoe','shoeStripe','armband','bag'].forEach(function(k){if(d[k]==='club')d[k]=S&&S.p?S.p:'#b02d10';else if(d[k]==='club2')d[k]=S&&S.s?S.s:'#f2ede4'});
 if(o.track&&!o.trackCol)d.trackCol=S&&S.p?S.p:'#b02d10';
 if(d.trackPants&&d.trackCol)d.bot=d.trackCol;
 if(o.cap===true)d.cap=S&&S.t||'#14141c',delete d.beanie;
 return d;
}
function Body(def,id){
 var o=lookOf(def.look||{},id);o.x=def.x*U;o.z=def.z*U;o.ry=def.yaw||0;
 this.base=def.sit?'sit':((def.look||{}).anim==='cheer'?'cheer':'ctrl');o.mode=this.base;
 var g=K.makeChar(o);g.position.y=def.sit&&def.y!=null?def.y*U:0;
 this.g=g;this.o=g.userData.o;this.def=def;this.x=def.x;this.z=def.z;this.yaw=o.ry;this.s=o.s;this.hm=1.72*o.s;this.w=0;this.moving=false;this.path=null;this.speed=def.speed||SPEED*.8;this.wantYaw=null;
}
Body.prototype.place=function(){this.g.position.x=this.x*U;this.g.position.z=this.z*U;this.g.rotation.y=this.yaw};
Body.prototype.turn=function(to,dt,rate){var d=to-this.yaw;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;var step=d*Math.min(1,dt*(rate||10)),cap=9*dt;step=step>cap?cap:step<-cap?-cap:step;this.yaw+=step;if(this.yaw>PI)this.yaw-=2*PI;else if(this.yaw<-PI)this.yaw+=2*PI;
 /* turning on the spot is a few small steps, never a statue spinning on its soles: when the body is not walking,
    the turn feeds a short shuffle into the same leg cycle the walk uses */
 if(!this.def.sit&&(this.o.sv||0)<.5&&Math.abs(step)>.0015){this.o.sw=(this.o.sw||0)+Math.abs(step)*3.2;this.o.sv=Math.max(this.o.sv||0,Math.min(.42,Math.abs(d)*.9))}};
/* one stride (two steps) is 1.5 body-scales of floor at a walk and longer at a run, so the captured feet stay planted */
Body.prototype.stride=function(dist){this.o.sw=(this.o.sw||0)+dist*U/((1.5+.9*(this.o.run||0))*this.s)*2*PI;this.o.sv=1};
Body.prototype.rest=function(dt){this.o.sv=Math.max(0,(this.o.sv||0)-dt*7)};
Body.prototype.remove=function(){K.dropChar(this.g)};

/* ---------- markers: a gem over whoever can be spoken to, a pad where a door is ---------- */
var CREAM=null,HALO=null;
function cream(){if(!CREAM){CREAM=new T.Color('#fff6e6');CREAM.convertSRGBToLinear()}return CREAM}
function halo(){if(HALO)return HALO;var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.3)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return HALO=new T.CanvasTexture(c)}
function marker(){
 var grp=new T.Group(),m=new T.Mesh(new T.OctahedronGeometry(.1,0),new T.MeshBasicMaterial({color:cream(),transparent:true,opacity:.95}));grp.add(m);
 var sp=new T.Sprite(new T.SpriteMaterial({map:halo(),color:cream(),transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending}));sp.scale.set(.7,.7,1);grp.add(sp);
 var rg=new T.Mesh(new T.RingGeometry(.3,.4,36),new T.MeshBasicMaterial({color:cream(),transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));rg.rotation.x=-PI/2;
 K.world.add(grp);K.world.add(rg);return{g:grp,m:m,halo:sp,ring:rg};
}
function dropMarker(mk){[mk.g,mk.ring].forEach(function(o){if(o.parent)o.parent.remove(o)})}
function pad(e){
 var mat=new T.MeshBasicMaterial({color:cream(),transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),m=new T.Mesh(new T.PlaneGeometry(e.w*U,e.d*U),mat);
 m.rotation.x=-PI/2;m.position.set((e.x+e.w/2)*U,.025,(e.z+e.d/2)*U);K.world.add(m);
 var amat=new T.MeshBasicMaterial({color:cream(),transparent:true,opacity:.9}),a=new T.Mesh(new T.ConeGeometry(.14,.34,4),amat),dir=e.dir||'n';
 a.rotation.set(dir==='n'?-PI/2:dir==='s'?PI/2:0,0,dir==='e'?-PI/2:dir==='w'?PI/2:0);a.position.set((e.x+e.w/2)*U,.62,(e.z+e.d/2)*U);K.world.add(a);
 return{m:m,a:a,mat:mat};
}

/* ---------- who and what is in the room ---------- */
function sigActor(a){return JSON.stringify([a.follow?0:a.x,a.follow?0:a.z,a.yaw||0,!!a.sit,a.seat||0,a.y==null?null:a.y,a.look||{},!!a.follow,!!a.ghost])}
function sigExit(e){return JSON.stringify([e.x,e.z,e.w,e.d,e.dir||'n'])}
function markAbove(b,a){return b.hm+.38}
function addActor(a,near){
 var def=a;
 if(a.follow&&near){def={};for(var k in a)def[k]=a[k];def.x=near.x-1.2;def.z=near.z+1.4;def.sit=false}
 var b=new Body(def,a.id);b.sig=sigActor(a);actors[a.id]=b;b.place();
 if(a.talk!==false){var mk=marker();marks.push({kind:'actor',id:a.id,mk:mk,on:a.mark!==false,reach:a.reach||REACH})}
}
function dropMark(kind,id){marks=marks.filter(function(m){if(m.kind===kind&&m.id===id){dropMarker(m.mk);return false}return true})}
function dropActor(id){var a=actors[id];if(!a)return;a.remove();dropMark('actor',id);delete actors[id];if(focusId===id)focusId=null}
function addSpot(s){var mk=marker();mk.g.position.set(s.x*U,(s.y==null?2.6:s.y)*U,s.z*U);spots.push(s);marks.push({kind:'spot',id:s.id,mk:mk,on:s.on!==false,reach:s.reach||REACH})}
function addExit(e){exits.push({def:e,sig:sigExit(e),locked:!!e.locked,vis:pad(e)})}
function dropExit(x){[x.vis.m,x.vis.a].forEach(function(m){if(m.parent)m.parent.remove(m)});exits.splice(exits.indexOf(x),1);if(lastExit===x)lastExit=null}
function settleFollowers(){Object.keys(actors).forEach(function(id){var a=actors[id];if(!a.def.follow||a.settled)return;a.settled=true;var c=nearestFree(player.x-1.2,player.z+1.4,5);if(c){var p=centre(c[0],c[1]);a.x=p[0];a.z=p[1];a.place()}})}
function sync(n){
 if(!cfg||!player)return false;
 var want={},i;
 (n.actors||[]).forEach(function(a){want[a.id]=a});
 Object.keys(actors).forEach(function(id){var w=want[id];if(!w||sigActor(w)!==actors[id].sig)dropActor(id)});
 (n.actors||[]).forEach(function(a){
  if(!actors[a.id]){addActor(a,a.follow?{x:player.x,z:player.z}:null);return}
  actors[a.id].def.talk=a.talk;var has=false;marks.forEach(function(m){if(m.kind==='actor'&&m.id===a.id){has=true;m.on=a.mark!==false;m.reach=a.reach||REACH}});
  if(a.talk===false&&has)dropMark('actor',a.id);
  if(a.talk!==false&&!has)marks.push({kind:'actor',id:a.id,mk:marker(),on:a.mark!==false,reach:a.reach||REACH});
 });
 var keepSpot={};(n.spots||[]).forEach(function(s){keepSpot[s.id]=s});
 spots.slice().forEach(function(s){if(!keepSpot[s.id]){dropMark('spot',s.id);spots.splice(spots.indexOf(s),1)}});
 (n.spots||[]).forEach(function(s){var have=false;for(i=0;i<spots.length;i++)if(spots[i].id===s.id)have=true;if(!have)addSpot(s);else marks.forEach(function(m){if(m.kind==='spot'&&m.id===s.id)m.on=s.on!==false})});
 var keepExit={};(n.exits||[]).forEach(function(e){keepExit[e.id]=e});
 exits.slice().forEach(function(x){var w=keepExit[x.def.id];if(!w||sigExit(w)!==x.sig)dropExit(x)});
 (n.exits||[]).forEach(function(e){var x=exitOf(e.id);if(!x)addExit(e);else{x.def=e;x.locked=!!e.locked}});
 cfg.actors=n.actors||[];cfg.spots=n.spots||[];cfg.exits=n.exits||[];
 SEAL=[player.x,player.z];buildGrid();
 if(!freeAt(player.x,player.z)){var c=nearestFree(player.x,player.z,6);if(c){var p=centre(c[0],c[1]);player.x=p[0];player.z=p[1];player.place()}}
 settleFollowers();
 if(n.player&&JSON.stringify(n.player)!==JSON.stringify(cfg.player||{}))P.player(n.player);
 path=null;pending=null;retarget(true);
 return true;
}

/* ---------- enter a room ---------- */
function veil(on,ms,cb){
 if(!fade)fade=document.getElementById('fade');
 if(!fade){if(cb)setTimeout(cb,0);return}
 fade.style.transition='opacity '+(ms||300)+'ms ease';fade.style.opacity=on?'1':'0';if(cb)setTimeout(cb,ms||300);
}
function pruneDecor(c,kind){
 var keep=[],cast=(c.actors||[]).map(function(a){return[a.x,a.z]}).concat([[c.spawn.x,c.spawn.z]]).concat((c.exits||[]).map(function(e){return[e.x+e.w/2,e.z+e.d/2]}));
 (K.cur().decor||[]).forEach(function(g){
  var x=g.position.x/U,z=g.position.z/U,near=cast.some(function(p){return Math.hypot(p[0]-x,p[1]-z)<2.6});
  if(kind==='home'||near){K.dropChar(g)}else keep.push({x:x,z:z})});
 decor=keep;
}
function enter(c){
 cfg=c;actors={};exits=[];spots=[];marks=[];decor=[];target=null;path=null;pending=null;focusId=null;frozen=!!c.frozen;axis.x=axis.y=0;lastExit=null;
 S=SKINS[c.club]||null;
 /* the picture never paints a colour this club may not wear: its legacy rules (Hapoel's yellow) and its rivals' families */
 if(K.colourGuard)K.colourGuard(S)
 FR=c.frame||{};
 var sk=S?{name:c.club,c1:S.p,c2:S.s,c3:S.t||'#14141c',club:S}:null;
 RM.load(c.room,{club:c.club,time:c.time==='night'?'night':'day',skinSet:sk,play:true,weather:c.weather||null,mood:c.mood||'normal',age:c.age==null?null:c.age,year:c.year==null?null:c.year,made:c.made||[]});
 var def=RM.defs[c.room];pruneDecor(c,def&&def.kind);
 if(window.__gnd)window.__sc.remove(window.__gnd);if(def&&IND[def.kind]){var gm=new T.Mesh(new T.PlaneGeometry(300,300),new T.MeshBasicMaterial({color:new T.Color('#1e1a17').convertSRGBToLinear()}));gm.rotation.x=-PI/2;gm.position.set(12*U,-.06,8*U);window.__sc.add(gm);window.__gnd=gm}
 if(window.__fill)window.__sc.remove(window.__fill);var fi=new T.DirectionalLight('#fff0e0',def&&IND[def.kind]?.3:.15);fi.position.set(0,6,14);window.__sc.add(fi);window.__fill=fi;
 var sp=c.spawn||{x:(c.walk[0]+c.walk[2])/2,z:(c.walk[1]+c.walk[3])/2,yaw:0};
 setView();skyOf(c.time==='night',def&&def.kind,c.weather==='rain'||c.mood==='rain',c.mood==='dusk');
 (c.actors||[]).forEach(function(a){addActor(a,sp)});
 (c.spots||[]).forEach(addSpot);
 (c.exits||[]).forEach(addExit);
 AUTO=[];SEAL=null;buildGrid();try{settleBlocks([sp.x,sp.z])}catch(e){AUTO=[];SEAL=null;buildGrid()}
 var cell=nearestFree(sp.x,sp.z,6),pos=cell?centre(cell[0],cell[1]):[sp.x,sp.z];
 if(freeAt(sp.x,sp.z))pos=[sp.x,sp.z];
 player=new Body({x:pos[0],z:pos[1],yaw:sp.yaw||0,look:c.player||{}},'player');player.place();
 settleFollowers();
 camX=0;camZ=1;trackCam(0,true);
 /* walking into a scene: the picture starts a step wide and pushes in, the way a film arrives in a room */
 ENTRY_T=now;camZ=.8;K.follow(camX,camZ);
 graceUntil=now+.7;
 veil(false,420);
 emit({type:'entered',room:c.room,issues:audit()});
 retarget(true);
}
/* portrait: the picture is a window of about 4.6 m across the room, and it follows him */
function setView(){
 var top=FR.top==null?.8:FR.top,bottom=FR.bottom==null?-.4:FR.bottom,W=innerWidth,H=innerHeight,fov=null,info=K.camInfo();
 /* a phone: the picture IS the glass, edge to edge; the room is a window of about 3 m that follows him, lifted while somebody speaks */
 /* in a stadium the glass is tall and the roof is the dull half: the window drops so the people and the stand fill it */
 if(W/H<.9){var c=(top+bottom)/2*.3+(((RM.defs[cfg.room]||{}).kind)==='stadium'?.28:0);top=1+c;bottom=-1+c}
 var a=W/(H*(top-bottom)/2);
 if(info&&a<1.15){var d=Math.hypot(info.p[1]-info.l[1],info.p[2]-info.l[2]),roomW=(cfg.walk[2]-cfg.walk[0]+2)*U,vis=Math.min(roomW,W/H<.9?(IND[((RM.defs[cfg.room]||{}).kind)]?3.3:4.2):4.6);fov=Math.max(20,Math.min(70,2*Math.atan(vis/2/(d*a))*180/PI))}
 K.view(top,bottom,fov);
}
function skyOf(night,kind,rain,dusk){
 var inside=!!IND[kind];
 if(inside||rain||(dusk&&!night))window.__sc.children.forEach(function(o){if(o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.radius===90&&o.material.isShaderMaterial)o.visible=false});
 /* the sky the street stands under: a low grey ceiling in rain, a warm-to-violet evening at dusk */
 if(!inside&&rain){K.bg(night?'#151a24':'#5d6670',night?'#0b0e14':'#8b939c');return}
 if(!inside&&dusk&&!night){K.bg('#4a4a78','#c87a6e');return}

 if(inside)K.bg(night?'#5a5066':'#d8c4a6',night?'#463e56':'#c8b090');
 else if(night)K.bg('#1a2a6a','#0a1030');else K.bg('#6f9bd0','#cfd9e6');
}
function trackCam(dt,snap){
 var info=K.camInfo();if(!info||!player)return;
 var fa=focusId&&actors[focusId],ux=fa?(player.x+fa.x)/2:player.x,zm=fa?(cfg.talkZoom||1.18):1;
 var dist=Math.hypot(info.p[1]-info.l[1],info.p[2]-info.l[2]),half=Math.tan(info.fov*PI/360)*info.aspect*dist/zm;
 var x0=(cfg.walk[0]-.6)*U,x1=(cfg.walk[2]+.6)*U,xm=ux*U,fx=0;
 if(x1-x0>2*half)fx=Math.max(x0+half,Math.min(x1-half,xm))-info.l[0];
 else if(fa)fx=Math.max(-.6,Math.min(.6,(xm-info.l[0])*.55));
 /* a mission starts: the camera dives at him (the cut to RUSH happens at the bottom of the dive) */
 var dv=now-DIVE_T;if(dv>=0&&dv<1.4){var dp=Math.min(1,dv/.75);zm=1+dp*dp*1.9;fx=Math.max(-2.5,Math.min(2.5,xm-info.l[0]));snap=false}
 var e=now-ENTRY_T,k=snap?1:Math.min(1,dt*(dv>=0&&dv<1.4?6:e<2.2?1.25:4.5));camX+=(fx-camX)*k;camZ+=(zm-camZ)*k;K.follow(camX,camZ);
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
function leave(x){if(frozen)return;frozen=true;path=null;pending=null;veil(true,300,function(){emit({type:'exit',id:x.def.id})})}
function faceEachOther(id){var a=actors[id];if(!a)return;player.wantYaw=Math.atan2(a.x-player.x,a.z-player.z);if(!a.def.sit&&!a.def.still)a.wantYaw=Math.atan2(player.x-a.x,player.z-a.z)}

/* ---------- input ---------- */
function goTo(kind,id,then){
 var p=reachOf(kind,id);if(!p||frozen)return false;
 if(kind==='exit'){var x=exitOf(id);if(!x)return false;if(x.locked){emit({type:'locked',id:id});return true}lastExit=null;path=route(player.x,player.z,p[0],p[1]);pending=null;if(path&&!path.length){path=null;leave(x)}return !!path||frozen}
 /* somebody seated has their legs out in front of them: stand off past the knees, not inside them */var seat=kind==='actor'&&actors[id]&&actors[id].def.sit,dz=seat?2.4:1.3,dx=seat?1.5:1.2;
 var c=nearestFree(p[0]+(player.x>p[0]?dx:-dx),p[1]+dz,5)||nearestFree(p[0],p[1],6);if(!c)return false;
 var q=centre(c[0],c[1]);path=route(player.x,player.z,q[0],q[1]);pending=then===false?null:{kind:kind,id:id};
 if(!path){pending=null;return false}return true;
}
function walkTo(x,z){if(frozen)return false;var c=nearestFree(x,z,8);if(!c)return false;var q=freeAt(x,z)?[x,z]:centre(c[0],c[1]);path=route(player.x,player.z,q[0],q[1]);pending=null;return !!path}
function pick(cx,cy){
 var el=K.ren.domElement,r=el.getBoundingClientRect(),best=null,bd=46*46;
 function near(x,y,z,kind,id){var s=K.screen(x,y,z),d=(s.x-cx)*(s.x-cx)+(s.y-cy)*(s.y-cy);if(d<bd){bd=d;best={kind:kind,id:id}}}
 marks.forEach(function(m){if(!m.on)return;var p=reachOf(m.kind,m.id);if(!p)return;
  if(m.kind==='actor'){var a=actors[m.id];near(p[0]*U,a.hm*.5,p[1]*U,'actor',m.id);near(p[0]*U,a.hm*.95,p[1]*U,'actor',m.id)}else near(p[0]*U,.4,p[1]*U,'spot',m.id)});
 if(best)return best;
 ndc.set(((cx-r.left)/r.width)*2-1,-(((cy-r.top)/r.height)*2-1));ray.setFromCamera(ndc,K.cam);plane.constant=0;
 if(!ray.ray.intersectPlane(plane,hit))return null;
 var hx=hit.x/U,hz=hit.z/U;
 for(var i=0;i<exits.length;i++){var e=exits[i].def;if(hx>=e.x-.8&&hx<=e.x+e.w+.8&&hz>=e.z-.8&&hz<=e.z+e.d+.8)return{kind:'exit',id:e.id}}
 return{kind:'ground',x:hx,z:hz};
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
   var sp=SPEED*(running?RUN:1)*Math.min(1,mag*1.15)*dt,dx=ax/mag*sp,dz=ay/mag*sp;
   var ox=player.x,oz=player.z;if(slide(player,dx,dz)){moved=Math.hypot(player.x-ox,player.z-oz);player.wantYaw=moved>sp*.35?Math.atan2(player.x-ox,player.z-oz):Math.atan2(dx,dz)}
  }else if(path){
   player.path=path;player.speed=SPEED*(running?RUN:1);moved=follow(player,dt);path=player.path;
   if(!path&&pending){var pd=pending;pending=null;retarget(true);var pr=reachOf(pd.kind,pd.id),pm=marks.filter(function(m){return m.kind===pd.kind&&m.id===pd.id})[0];if(target&&target.kind===pd.kind&&target.id===pd.id)act(pd);else if(pr&&pm&&pm.on&&(pr[0]-player.x)*(pr[0]-player.x)+(pr[1]-player.z)*(pr[1]-player.z)<pm.reach*pm.reach)act(pd);else{faceEachOther(pd.id)}}
  }
 }
 player.o.run=(player.o.run||0)+(((running&&moved>0)?1:0)-(player.o.run||0))*Math.min(1,dt*5);
 if(moved>0){player.stride(moved);stepAcc+=moved;if(stepAcc>2.6*player.s){stepAcc=0;emit({type:'step',surface:cfg.surface||'floor'})}}else player.rest(dt);
 if(player.wantYaw!=null)player.turn(player.wantYaw,dt,moved>0?12:7);
 player.o.mode=POSED.me?POSED.me.mode:(focusId&&!moved?'listen':'ctrl');player.place();
 Object.keys(actors).forEach(function(id){var a=actors[id];
  if(a.path){var m=follow(a,dt);if(m>0)a.stride(m);if(!a.path){a.rest(dt);emit({type:'arrived',id:id})}}
  else if(a.def.follow&&!frozen){
   var gx=player.x-Math.sin(player.yaw)*2.1+(a.def.side||1)*Math.cos(player.yaw)*1.5,gz=player.z-Math.cos(player.yaw)*2.1-(a.def.side||1)*Math.sin(player.yaw)*1.5,ddx=gx-a.x,ddz=gz-a.z,dd=Math.hypot(ddx,ddz);
   if(dd>1.1){var st2=Math.min(dd-.6,SPEED*1.05*dt),o1=a.x,o2=a.z;if(slide(a,ddx/dd*st2,ddz/dd*st2)){var mv=Math.hypot(a.x-o1,a.z-o2);a.stride(mv);if(mv>st2*.35)a.wantYaw=Math.atan2(a.x-o1,a.z-o2)}else a.rest(dt)}else{a.rest(dt);a.wantYaw=player.yaw}
  }else a.rest(dt);
  if(a.wantYaw!=null&&!a.def.sit)a.turn(a.wantYaw,dt,6);
  if(POSED[id])a.o.mode=POSED[id].mode;else if(id===focusId&&a.base!=='sit')a.o.mode='talk';else a.o.mode=a.base;
  /* a head that notices who walked in */
  if(a.def.head==null||focusId===id){var dxp=player.x-a.x,dzp=player.z-a.z,near=dxp*dxp+dzp*dzp<64;
   if((near&&a.def.notice!==false)||focusId===id){var want=Math.atan2(dxp,dzp)-a.yaw;while(want>PI)want-=2*PI;while(want<-PI)want+=2*PI;a.o.look=Math.max(-1.0,Math.min(1.0,want))}else a.o.look=0}else a.o.look=a.def.head;
  a.place();
 });
 if(!frozen&&t>graceUntil){
  var inside=null;for(var i=0;i<exits.length;i++){var e=exits[i].def;if(player.x>=e.x&&player.x<=e.x+e.w&&player.z>=e.z&&player.z<=e.z+e.d){inside=exits[i];break}}
  if(inside&&inside!==lastExit){lastExit=inside;if(inside.locked)emit({type:'locked',id:inside.def.id});else if(inside.def.auto!==false)leave(inside)}
  if(!inside)lastExit=null;
 }
 if(!frozen)retarget(false);
 marks.forEach(function(m,i){var on=m.on&&!frozen,hot=target&&target.kind===m.kind&&target.id===m.id;m.mk.g.visible=on;m.mk.ring.visible=on;if(!on)return;
  var a=m.kind==='actor'?actors[m.id]:null;
  if(a){m.mk.g.position.set(a.x*U,a.hm+.34+(a.g.position.y),a.z*U);m.mk.ring.position.set(a.x*U,a.g.position.y+.04,a.z*U)}
  else{var s=null;for(var q=0;q<spots.length;q++)if(spots[q].id===m.id)s=spots[q];if(s){m.mk.g.position.set(s.x*U,(s.y==null?2.6:s.y)*U+.2,s.z*U);m.mk.ring.position.set(s.x*U,.04,s.z*U)}}
  m.mk.m.position.y=Math.sin(t*(hot?5:2.2)+i)*.05;m.mk.m.rotation.y=t*(hot?2.4:1.1);m.mk.m.scale.setScalar(hot?1.35:1);
  var pl=hot?1+Math.sin(t*5)*.1:1+Math.sin(t*2+i)*.05;m.mk.ring.scale.setScalar((hot?1.35:1)*pl);m.mk.ring.material.opacity=hot?.8:.32;m.mk.halo.material.opacity=hot?.95:.42});
 exits.forEach(function(x,i){var hot=target&&target.kind==='exit'&&target.id===x.def.id,k=x.locked?.1:(.24+.12*Math.sin(t*2.4+i)+(hot?.18:0));x.vis.mat.opacity=k;x.vis.a.material.opacity=x.locked?.25:.9;x.vis.a.visible=!frozen;
  var bob=Math.sin(t*3+i)*.06,dir=x.def.dir||'n',cx=(x.def.x+x.def.w/2)*U,cz=(x.def.z+x.def.d/2)*U;x.vis.a.position.set(cx+(dir==='e'?bob:dir==='w'?-bob:0),.62,cz+(dir==='s'?bob:dir==='n'?-bob:0))});
 swingDoors(t,dt);kickProps(dt);
 if(CINE)cineTick(t,dt);else trackCam(dt,false);
}
/* a ball is a ball: walk into it and it goes, rolls, slows, comes off the furniture and the walls */
var lastPP=null;
function kickProps(dt){var P=window.__props;if(!P||!P.length||!player||dt<=0)return;var pw=new T.Vector3(player.x*U,0,player.z*U),pv=lastPP?pw.clone().sub(lastPP).divideScalar(dt):new T.Vector3();lastPP=pw.clone();pv.y=0;
 var w=cfg.walk,v=new T.Vector3();
 P.forEach(function(p){var m=p.m;if(!m.parent||m.userData.noKick)return;if(!p.r){var bb=new T.Box3().setFromObject(m);p.r=(bb.max.y-bb.min.y)/2;p.v=new T.Vector3()}
  m.getWorldPosition(v);var d=Math.hypot(v.x-pw.x,v.z-pw.z),reach=p.r+.3;
  if(d<reach&&pv.length()>.4){var dir=new T.Vector3(v.x-pw.x,0,v.z-pw.z).normalize();p.v.copy(dir.multiplyScalar(Math.min(4.2,pv.length()*1.35+.8)))}
  if(p.v.lengthSq()<1e-4)return;var nx=v.x+p.v.x*dt,nz=v.z+p.v.z*dt,ux=nx/U,uz=nz/U;
  if(ux<w[0]+.3||ux>w[2]-.3){p.v.x*=-.6;nx=v.x}if(uz<w[1]+.3||uz>w[3]-.3){p.v.z*=-.6;nz=v.z}
  if(grid&&!freeAt(nx/U,nz/U)&&freeAt(v.x/U,v.z/U)){if(!freeAt(nx/U,v.z/U)){p.v.x*=-.55;nx=v.x}if(!freeAt(v.x/U,nz/U)){p.v.z*=-.55;nz=v.z}}
  var sp=p.v.length(),dist=Math.hypot(nx-v.x,nz-v.z);if(dist>0){var ax=new T.Vector3(p.v.z,0,-p.v.x).normalize();m.rotateOnWorldAxis(ax,dist/p.r)}
  p.v.multiplyScalar(Math.exp(-1.6*dt));if(sp<.05)p.v.set(0,0,0);
  var wp=new T.Vector3(nx,v.y,nz);m.parent.worldToLocal(wp);m.position.copy(wp)})}
/* a door is a door: the leaf nearest each exit swings open as somebody walks up to it and settles back after;
   a locked one only rattles in its frame */
function swingDoors(t,dt){var D=window.__doors;if(!D||!D.length||!player)return;var v=new T.Vector3();
 D.forEach(function(d){if(d.ex===undefined){d.pv.getWorldPosition(v);var best=null,bd=1.9;exits.forEach(function(x){var e=x.def,cx=Math.max(e.x,Math.min(e.x+e.w,v.x/U))*U,cz=Math.max(e.z,Math.min(e.z+e.d,v.z/U))*U,dd=Math.hypot(cx-v.x,cz-v.z);if(dd<bd){bd=dd;best=x}});d.ex=best}
  var want=d.rest;if(d.ex){var e=d.ex.def,px=Math.max(e.x,Math.min(e.x+e.w,player.x)),pz=Math.max(e.z,Math.min(e.z+e.d,player.z)),near=Math.hypot(px-player.x,pz-player.z)<2.8;
   if(near&&!d.ex.locked)want=d.open;else if(near&&d.ex.locked)want=d.rest+Math.sin(t*38)*.012*(Math.sin(t*3)>0?1:0)}
  d.pv.rotation.y+=(want-d.pv.rotation.y)*Math.min(1,dt*(want===d.open?3.2:2.2))})}

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


/* ---------- Season One: the camera cuts, people act, and the interview studio (LIFE sends a shot; this frames it) ----------
   A shot holds the camera on one or two people for a while and pushes in a little; a cut is a hard cut. Nothing here
   decides the story: LIFE asks for 'close' on dad, 'two' on dad and the boy, 'wide' on the room, and gets it. */
var CINE=null,STU=null;
function bodyOf(id){return id==='me'||id==='player'?player:actors[id]}
function headOf(b){var y=b.g.position.y+(b.o.mode==='sit'||b.o.mode==='sittalk'||b.def&&b.def.sit?b.hm*.72:b.hm*.93);
 /* where the head really is, when the body has one: a guessed height aims a close-up over the head of anybody seated, posed or small */
 var hu=b.g.userData&&b.g.userData.human;if(hu&&hu.bones){var hb=b._hb||(b._hb=hu.bones.filter(function(x){return x.name==='head'})[0]);if(hb){var v=new T.Vector3();hb.getWorldPosition(v);v.y+=.07*(b.s||1)*U;if(Math.abs(v.x-b.x*U)<1.5*U&&Math.abs(v.z-b.z*U)<1.5*U)return v}}
 return new T.Vector3(b.x*U,y,b.z*U)}
function cineTick(t,dt){
 var c=CINE;if(!c)return;c.el+=dt;var k=Math.min(1,c.el/Math.max(.5,c.ms/1000));
 /* people walking for the scene keep walking while the shot runs */
 if(player&&player.cpath){player.path=player.cpath;var m=follow(player,dt);player.cpath=player.path;if(m>0)player.stride(m);else player.rest(dt);if(player.wantYaw!=null)player.turn(player.wantYaw,dt,10);player.place()}
 var info=K.camInfo();if(!info)return;
 var subs=(c.on||[]).map(bodyOf).filter(Boolean);
 if(c.cam==='wide'||!subs.length){K.cineCam(null);K.follow(camX,1+.06*k);return}
 var dir=new T.Vector3(info.p[0]-info.l[0],0,info.p[2]-info.l[2]).normalize(),side=new T.Vector3(dir.z,0,-dir.x);
 var heads=subs.map(headOf),mid=heads.reduce(function(a,h){return a.add(h)},new T.Vector3()).multiplyScalar(1/heads.length);
 /* a phone held upright sees a narrow slice: the camera stands further back so a close-up is a face and shoulders, not an eye */
 var asp=innerWidth/Math.max(1,innerHeight),back=asp<1?Math.pow(Math.min(2.2,.9/asp),.75):1;
 var p,l,fov;
 /* two people side by side (on a sofa, at a bar) have no shoulder to film over: the lens goes in front of the pair */
 if(c.cam==='over'&&heads.length>1&&sideBySide(subs[0],subs[1]))c.cam='two';
 if(c.cam==='close'){var h=heads[0],b0=subs[0],hm=b0.hm,d=(.55+hm*.42)*back*(1-.08*k);
  /* a close-up stands in front of the FACE: the room's camera may be behind a person who faces the wall, and a close-up from there is the back of a head */
  var fw=new T.Vector3(Math.sin(b0.yaw),0,Math.cos(b0.yaw));if(fw.dot(dir)<-.35)fw.lerp(dir,.35).normalize();var sd0=new T.Vector3(fw.z,0,-fw.x);if(sd0.dot(side)<0)sd0.negate();
  p=h.clone().add(fw.clone().multiplyScalar(d)).add(sd0.multiplyScalar(d*.22));p.y=h.y+.02;l=h.clone();l.y-=.06;fov=30}
 else if(c.cam==='over'&&heads.length>1){var a=heads[0],b=heads[1],ab=a.clone().sub(b);ab.y=0;ab.normalize();var sd=new T.Vector3(ab.z,0,-ab.x);p=a.clone().add(ab.multiplyScalar(.75)).add(sd.multiplyScalar(.32));p.y=a.y+.1;l=b.clone();l.y-=.08;fov=34}
 else{var span=heads.length>1?heads[0].distanceTo(heads[heads.length-1]):0,d2=(1.6+span*1.05)*back*(1-.07*k);var fw2=dir;if(c.cam==='two'){fw2=new T.Vector3(Math.sin(subs[0].yaw)+Math.sin(subs[1].yaw),0,Math.cos(subs[0].yaw)+Math.cos(subs[1].yaw));if(fw2.lengthSq()<.01)fw2=dir;else fw2.normalize()}p=mid.clone().add(fw2.clone().multiplyScalar(d2));p.y=mid.y+.28;l=mid.clone();l.y-=.18;fov=34}
 /* nothing stands between the lens and the face: the first time a shot frames somebody, a ray goes from the face to the
    lens; furniture or a wall on it brings the lens in front of it, or across to the other side when that is too close */
 var tg=c.cam==='over'&&heads.length>1?heads[1]:heads[0];/* the face the lens is pointed at — over a shoulder, that is the OTHER person */
 var key=(c.on||[]).join()+'|'+Math.round(tg.x*3)+','+Math.round(tg.z*3);if(c.key!==key){c.key=key;/* a framing aid never takes the picture down */try{c.fix=clearShot(tg,p,subs)}catch(e){c.fix=null}}
 if(c.fix&&c.fix.wide){K.cineCam(null);K.follow(camX,1+.06*k);return}
 if(c.fix&&c.fix.p)p=tg.clone().add(c.fix.p)
 /* and the lens gets there like a camera operator would, not in one jump: every frame used to place it afresh */
 if(!c.cp){c.cp=p.clone();c.cl=l.clone()}else{var ck=Math.min(1,dt*4.5);c.cp.lerp(p,ck);c.cl.lerp(l,ck)}
 K.cineCam({p:[c.cp.x,c.cp.y,c.cp.z],l:[c.cl.x,c.cl.y,c.cl.z],fov:fov});
}
var _ray=null;
function blocking(o){for(var q=o;q;q=q.parent){if(q.userData&&(q.userData.o||q.userData.human||q.userData.noBlock))return false;if(!q.visible)return false}var m=o.material;if(Array.isArray(m))m=m[0];return !!(o.isMesh&&!o.isSprite&&m&&!m.isMeshBasicMaterial&&!(m.transparent&&m.opacity<.6))}
function hitOn(from,to){if(!K.world)return null;_ray=_ray||new T.Raycaster();var v=to.clone().sub(from),len=v.length();_ray.set(from,v.normalize());_ray.far=len;
 /* only solid meshes: a Sprite cannot be raycast without a camera (r128 throws), and a person, a light or glass is not in the way */
 var solid=[];K.world.traverse(function(o){if(o.isMesh&&!o.isSprite&&!o.isSkinnedMesh&&!o.isInstancedMesh&&blocking(o))solid.push(o)});var hs=_ray.intersectObjects(solid,false);for(var i=0;i<hs.length;i++)if(hs[i].distance>.12)return hs[i].distance;return null}
function sideBySide(a,b){var dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1,fa=Math.sin(a.yaw)*dx/d+Math.cos(a.yaw)*dz/d,fb=Math.sin(b.yaw)*-dx/d+Math.cos(b.yaw)*-dz/d;return Math.abs(fa)<.5&&Math.abs(fb)<.5}
function segDist(a,b,c){var ab=b.clone().sub(a),t=Math.max(0,Math.min(1,c.clone().sub(a).dot(ab)/Math.max(1e-6,ab.lengthSq())));return a.clone().add(ab.multiplyScalar(t)).distanceTo(c)}
/* other people are in the way too: a head and a chest each, as spheres, for everybody who is not in the shot */
function peopleOn(from,to,subs){var all=[player].concat(Object.keys(actors).map(function(k){return actors[k]}));for(var i=0;i<all.length;i++){var b=all[i];if(!b||subs.indexOf(b)>=0||!b.g.visible)continue;var hd=headOf(b);if(segDist(from,to,hd)<.3)return true;hd.y-=.55*b.s;if(segDist(from,to,hd)<.4)return true}return false}
function clearShot(h,p,subs){var off=p.clone().sub(h),len=off.length(),best=null,bestD=0;
 /* round the face a few ways, and a little higher (over a sofa back); the first lens with nothing in front of it wins */
 var turns=[0,.6,-.6,1.1,-1.1],lifts=[0,.35,.9];/* .9: a high lens looking down over a sofa back or an armchair, the way a crew shoots a room full of furniture */
 for(var li=0;li<lifts.length;li++)for(var ti=0;ti<turns.length;ti++){var a=turns[ti],o=new T.Vector3(off.x*Math.cos(a)-off.z*Math.sin(a),off.y+lifts[li],off.x*Math.sin(a)+off.z*Math.cos(a)),q=h.clone().add(o);
  if(peopleOn(h,q,subs))continue;var at=hitOn(h,q);if(at==null){if(!a&&!lifts[li])return null;return{p:o}}if(at>bestD){bestD=at;best=o}}
 /* nothing clear: the nearest-to-clear lens only if it still frames a face and shoulders; otherwise the room's own camera */
 if(best&&bestD>len*.85)return{p:best.multiplyScalar((bestD-.1)/len)};return{wide:true}}
function cineShot(o){
 if(!o){CINE=null;unpose();window.__noAO=!!STU;K.cineCam(null);if(player){player.cpath=null}camX=0;trackCam(0,true);return true}
 CINE={cam:o.cam||'wide',on:o.on||[],ms:o.ms||2000,el:0};/* a close shot has the wall half a metre behind a face: screen-space obscurance prints a dark cloud round the head there */window.__noAO=CINE.cam==='close'||CINE.cam==='over';cineTick(now,0);return true}
/* a scene may put people where the walk cannot: him on the sofa beside his father, his father on his feet lifting him to
   the ceiling. Every such pose is undone when the scene ends, so the day picks up where it left them. */
var POSED={};
function poseBody(id,b,mode,x,z,yaw,y){if(!POSED[id])POSED[id]={keep:{x:b.x,z:b.z,yaw:b.yaw,y:b.g.position.y}};POSED[id].mode=mode;if(b===player)player.cpath=null;else b.path=null;if(x!=null){b.x=x;b.z=z}if(yaw!=null){b.yaw=yaw;b.wantYaw=yaw}if(y!=null)b.g.position.y=y;b.o.mode=mode;b.place()}
function unpose(){Object.keys(POSED).forEach(function(id){var b=bodyOf(id),k=POSED[id].keep;if(b){b.x=k.x;b.z=k.z;b.yaw=k.yaw;b.wantYaw=null;b.g.position.y=k.y;b.o.mode=b===player?'ctrl':b.base;b.place()}});POSED={}}
function cineAct(a){
 if(!a)return false;
 if(a.do==='sit'&&a.who==='me'&&player){var o=bodyOf(a.by);if(!o)return false;var yw=o.yaw,off=.6/U,sd=a.side||-1;/* the free seat of the flat's sofa is on the father's left (−x); a scene in another room names its side */poseBody('me',player,'sit',o.x+Math.cos(yw)*off*sd,o.z-Math.sin(yw)*off*sd,yw,o.g.position.y);return true}
 if(a.do==='stand'&&a.who==='me'){var kp=POSED.me;if(kp){player.x=kp.keep.x;player.z=kp.keep.z;player.g.position.y=kp.keep.y;delete POSED.me;player.o.mode='ctrl';player.place()}return true}
 if(a.do==='lift'&&player){var lb=bodyOf(a.who);if(!lb||lb===player)return false;var ly=lb.yaw,fx=Math.sin(ly)*.34/U,fz=Math.cos(ly)*.34/U;poseBody(a.who,lb,'cheer',null,null,ly,0);poseBody('me',player,'cheer',lb.x+fx,lb.z+fz,ly+PI,.42);return true}
 if(a.who==='all'&&a.do==='cheer'){P.celebrate();return true}
 var b=bodyOf(a.who);if(!b)return false;
 if(a.do==='walk'&&a.x!=null){if(b===player){player.cpath=route(player.x,player.z,a.x,a.z)}else{b.path=route(b.x,b.z,a.x,a.z);b.speed=SPEED*.7}return true}
 if(a.do==='face'){var o=bodyOf(a.to);if(o)b.wantYaw=Math.atan2(o.x-b.x,o.z-b.z);return true}
 if(a.do==='hold'){b.o.hold=a.item||null;return true}
 if(a.do==='emote'){b.o.expr={k:a.mood||null,t0:now,role:'say'};return true}
 return false}
/* the interview: a dark room, a chair, one warm lamp, and the person — older now — talking to somebody just off camera */
function studioOff(){if(!STU)return;var S=STU;STU=null;window.__sc.remove(S.g);if(S.who)K.dropChar(S.who);S.hidden.forEach(function(e){e[0].visible=e[1]});window.__sc.background=S.bg;window.__sc.fog=S.fog;window.__sc.environment=S.env;window.__noAO=false;K.cineCam(null);if(player)trackCam(0,true)}
var STUDIO_PLATE={mum:1,dad:1,friend:1,rival:1,wild:1,neighbour:1};
function studioOn(o){
 studioOff();var sc_=window.__sc,g=new T.Group(),X=60,Z=60;g.position.set(X,0,Z);
 var hidden=[];sc_.children.forEach(function(c){hidden.push([c,c.visible]);c.visible=false});
 var cv=document.createElement('canvas');cv.width=512;cv.height=320;var x=cv.getContext('2d'),gr=x.createRadialGradient(300,150,10,256,170,330);gr.addColorStop(0,o.warm||'#5a4a40');gr.addColorStop(.55,'#241c18');gr.addColorStop(1,'#0b0908');x.fillStyle=gr;x.fillRect(0,0,512,320);
 for(var i=0;i<14;i++){var bx=40+Math.random()*440,by=40+Math.random()*120,br=6+Math.random()*16,bg=x.createRadialGradient(bx,by,0,bx,by,br);bg.addColorStop(0,'rgba(255,214,170,.32)');bg.addColorStop(1,'rgba(255,214,170,0)');x.fillStyle=bg;x.fillRect(bx-br,by-br,br*2,br*2)}
 var tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;
 var back=new T.Mesh(new T.PlaneGeometry(9,5.6),new T.MeshBasicMaterial({map:tx}));back.position.set(0,2.2,-2.6);g.add(back);
 /* the person's own place behind them (public/life/town/studio, R5 of the realism pack): photographed out of focus, a little darker than the face */
 var plate=o.who&&STUDIO_PLATE[o.who];if(plate)new T.TextureLoader().load('/life/town/studio/'+o.who+'.webp',function(t){if(!STU||STU.g!==g)return;t.encoding=T.sRGBEncoding;back.material.map=t;back.material.color.setScalar(.8);back.material.needsUpdate=true;pole.visible=shade.visible=fl.visible=false;/* sized so the room reads as a room behind the head, not one corner of it */var wide=innerWidth>innerHeight;back.geometry.dispose();back.geometry=wide?new T.PlaneGeometry(10,6.25):new T.PlaneGeometry(6.4,4);back.position.set(wide?-1.4:0,wide?1.9:1.4,-2.6)});
 var fl=new T.Mesh(new T.PlaneGeometry(12,8),new T.MeshStandardMaterial({color:new T.Color('#1c1714'),roughness:.9}));fl.rotation.x=-PI/2;fl.receiveShadow=true;g.add(fl);
 /* the chair: dark wood, a curved back */
 /* (the chair is sized to the sitter: a boy of eleven does not sit at an adult's chair as if at a table) */
 var chair=new T.Group(),ch_=o.look&&o.look.h?Math.min(1,Math.max(.6,o.look.h/6.4)):1;chair.scale.setScalar(ch_);g.add(chair);
 var wood=new T.MeshStandardMaterial({color:new T.Color('#3a2418'),roughness:.55});[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]].forEach(function(q){var leg=new T.Mesh(new T.CylinderGeometry(.018,.022,.46,8),wood);leg.position.set(q[0],.23,q[1]);leg.castShadow=true;chair.add(leg)});
 var seat=new T.Mesh(new T.BoxGeometry(.46,.045,.44),wood);seat.position.set(0,.47,0);seat.castShadow=true;chair.add(seat);
 var bk=new T.Mesh(new T.BoxGeometry(.46,.36,.03),wood);bk.position.set(0,.74,-.21);bk.rotation.x=.08;bk.castShadow=true;chair.add(bk);
 /* a practical lamp behind, out of the way, warm */
 var pole=new T.Mesh(new T.CylinderGeometry(.012,.012,1.5,6),new T.MeshStandardMaterial({color:new T.Color('#2a2420'),roughness:.4,metalness:.5}));pole.position.set(-2.5,.75,-2.2);g.add(pole);
 var shade=new T.Mesh(new T.CylinderGeometry(.13,.2,.22,18,1,true),new T.MeshStandardMaterial({color:new T.Color('#b88a62'),emissive:new T.Color('#ff9a5a'),emissiveIntensity:.32,side:T.DoubleSide}));shade.position.set(-2.5,1.55,-2.2);g.add(shade);
 /* the key comes in from the other side of the lens (about 60° off the camera) so a face has a lit side and a shadow side, the way an interview is lit */
 var key=new T.SpotLight(new T.Color('#ffe2c2'),2.8,9,.55,.6,1.4);key.position.set(-1.2,2.4,2.5);key.target.position.set(0,.9,0);g.add(key);g.add(key.target);/* no cast shadows in the studio: at this distance a shadow map smears hair across a face; the lamps model the face, the chair and floor stay dark anyway */key.castShadow=false;
 var fill=new T.HemisphereLight(new T.Color('#9aa4c0'),new T.Color('#2a2018'),.2);g.add(fill);
 var bounce=new T.PointLight(new T.Color('#ffd2b0'),.35,4,2);bounce.position.set(1.2,.6,1.4);g.add(bounce);
 var rim=new T.DirectionalLight(new T.Color('#c8d4ff'),1.1);rim.position.set(1.4,2.3,-2.4);g.add(rim);
 var lamp=new T.PointLight(new T.Color('#ffb877'),.7,4,2);lamp.position.set(-2.5,1.5,-2.15);g.add(lamp);
 sc_.add(g);
 var who=null;if(o.look){var lk=lookOf(o.look,'studio');lk.x=X;lk.z=Z+.06;lk.ry=.62;lk.mode='sit';who=K.makeChar(lk);if(who.parent)who.parent.remove(who);who.position.set(0,0,.06);who.rotation.y=.62;who.userData.o.mode='sit';g.add(who)}
 /* no sky light in a studio: the room's environment would light a face evenly from everywhere; here only the lamps do */
 STU={g:g,who:who,hidden:hidden,bg:sc_.background,fog:sc_.fog,env:sc_.environment,t0:now};sc_.background=new T.Color('#0b0908');sc_.fog=null;sc_.environment=null;window.__noAO=true;
 studioCam(0);return true}
var _hv=new T.Vector3();
function studioCam(k){if(!STU)return;var X=STU.g.position.x,Z=STU.g.position.z,asp=innerWidth/Math.max(1,innerHeight),far=asp<1?.68:.6,d=(1-.06*Math.min(1,k))*far;
 /* framed on the person's own head, so a child of eleven and a man of sixty both sit with the eyes where an interview puts them */
 var hy=1.3,doll=false;if(STU.who){var hp=window.PEOPLE&&PEOPLE.headPos&&PEOPLE.headPos(STU.who,_hv);if(!hp&&STU.who.userData.head){doll=true;hp=STU.who.userData.head.getWorldPosition(_hv)}if(hp)hy=STU.hy=STU.hy==null?hp.y:STU.hy+(hp.y-STU.hy)*.15}
 /* (the light figures of the lite look have big heads: they are framed a step further back) */if(doll)d*=1.6;
 /* a documentary interview: head and shoulders, the eyes on the upper third (phone and desktop alike) */K.cineCam({p:[X+1.15*d,hy-.03,Z+1.62*d],l:[X+(asp<1?.0:-.14),hy-.1,Z],fov:asp<1?34:28})}
K.hooks.push(function(t){if(STU)studioCam((now-STU.t0)/14)});

/* ---------- the GPS: one light on the job ----------
   GTA never makes anybody wonder where the job is. The shell names ONE goal in this room — the person, the thing, or the
   door on the way — and it is drawn louder than every other marker: a column of the club's colour standing on it, a
   chevron bobbing over it, a ring breathing on the floor. The cream markers stay for everything else that can be touched. */
var GOAL=null,GB=null,ENTRY_T=-9,DIVE_T=-9;
function goalColour(){var c=S&&S.p?new T.Color(S.p):null;if(c){var h={};c.getHSL(h);if(h.s<.28||h.l>.82||h.l<.12)c=null}if(!c)c=new T.Color('#fff6e6');c.convertSRGBToLinear();return c}
function goalBuild(){
 var col=goalColour(),g=new T.Group();
 var colm=new T.Mesh(new T.CylinderGeometry(.5,.5,4.2,28,1,true),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{c:{value:col},t:{value:0}},
  vertexShader:'varying float vy;void main(){vy=position.y/4.2+.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 c;uniform float t;varying float vy;void main(){float a=(1.-vy)*(.62+.16*sin(t*3.))+.06;a*=smoothstep(0.,.08,vy);gl_FragColor=vec4(c*a*1.6,a);}'}));
 colm.position.y=2.1;g.add(colm);
 var chev=new T.Group(),cm=new T.MeshBasicMaterial({color:col,toneMapped:false});
 var tri=new T.Mesh(new T.ConeGeometry(.26,.44,3),cm);tri.rotation.x=PI;chev.add(tri);
 var ol=new T.Mesh(new T.ConeGeometry(.32,.54,3),new T.MeshBasicMaterial({color:new T.Color('#14141c'),side:T.BackSide}));ol.rotation.x=PI;chev.add(ol);
 g.add(chev);
 var ring=new T.Mesh(new T.RingGeometry(.48,.62,40),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.75,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false}));ring.rotation.x=-PI/2;ring.position.y=.03;g.add(ring);
 g.renderOrder=5;return{g:g,col:colm,chev:chev,ring:ring,key:S&&S.p};
}
function goalTick(t){
 if(!GOAL||!player||STU||CINE){if(GB)GB.g.visible=false;return}
 var p=reachOf(GOAL.kind,GOAL.id);if(!p){if(GB)GB.g.visible=false;return}
 if(!GB||GB.key!==(S&&S.p)){if(GB&&GB.g.parent)GB.g.parent.remove(GB.g);GB=goalBuild()}
 if(!GB.g.parent)K.world.add(GB.g);
 var top=1.4;
 if(GOAL.kind==='actor'){var a=actors[GOAL.id];top=a?a.g.position.y+a.hm+.62:2}
 else if(GOAL.kind==='spot'){for(var i=0;i<spots.length;i++)if(spots[i].id===GOAL.id){top=(spots[i].y==null?2.6:spots[i].y)*U+.55}}
 else top=1.35;
 GB.g.visible=true;GB.g.position.set(p[0]*U,0,p[1]*U);
 /* close enough to touch it: the column goes quiet so the person is not standing inside a light */
 var d=Math.hypot(p[0]-player.x,p[1]-player.z),near=d<2.6;
 GB.col.visible=!near;GB.col.material.uniforms.t.value=t;
 GB.chev.position.y=top+Math.abs(Math.sin(t*3.2))*.14;GB.chev.rotation.y=t*1.6;
 var k=1+.18*Math.sin(t*4);GB.ring.scale.set(k,k,k);GB.ring.material.opacity=near?.6:.8;
}
K.hooks.push(function(t){try{goalTick(t)}catch(er){}});

var P=window.__vxPlay={
 engine:'town',
 on:function(fn){sink=fn||function(){}},
 enter:function(c){try{enter(c);return true}catch(er){err(er);return false}},
 axis:function(x,y){axis.x=x||0;axis.y=y||0},
 run:function(b){running=!!b},
 act:function(){return act()},
 tap:tap,walkTo:walkTo,goTo:goTo,
 veil:function(on){veil(!!on,250)},
 freeze:function(b){frozen=!!b;if(frozen){axis.x=axis.y=0;path=null;pending=null}else{graceUntil=now+.35;retarget(true)}},
 /* the mood of the line being said (LIFE sends one per line): the speaker carries it in full, the player listening
    answers it smaller (people.js P.express). A null mood still marks a new line, so the gesture starts with it. */
 emote:function(k){lastMood={k:k||null,t:now};var sp=focusId&&actors[focusId];if(sp)sp.o.expr={k:k||null,t0:now,role:'say'};if(player)player.o.expr=k?{k:k,t0:now,role:'listen'}:null},
 /* something in the hand: 'cup' | 'ticket' | 'scarf' | 'bag' | 'phone', or null to put it down */
 hold:function(id,kind){var b=id==='player'?player:actors[id];if(!b)return false;b.o.hold=kind||null;return true},
 project:function(kind,id){var b=null,x=0,y=0,z=0;
  if(kind==='actor'){b=actors[id];if(b){x=b.x*U;y=b.g.position.y+b.hm+.3;z=b.z*U}}
  else if(kind==='spot'){for(var i=0;i<spots.length;i++)if(spots[i].id===id){b=spots[i];x=b.x*U;y=(b.y==null?2.6:b.y)*U+.3;z=b.z*U}}
  else if(kind==='exit'){var xx=exitOf(id);if(xx){b=1;x=(xx.def.x+xx.def.w/2)*U;y=.9;z=(xx.def.z+xx.def.d/2)*U}}
  return b?K.screen(x,y,z):null},
 /* LIFE may name the speaker a moment after it sends the line's mood: the line still starts on whoever says it */
 focus:function(id){focusId=id||null;if(id){faceEachOther(id);var a=actors[id];if(a&&lastMood&&now-lastMood.t<.5)a.o.expr={k:lastMood.k,t0:lastMood.t,role:'say'}}},
 /* the GPS: one goal ({kind,id}) or null */
 /* the engine change: dive in before a mission, land back out of it after (camera only — the day is untouched) */
 dive:function(){DIVE_T=now;return true},
 land:function(){DIVE_T=-9;ENTRY_T=now;camZ=2.2;return true},
 goal:function(kind,id){GOAL=kind&&id?{kind:kind,id:id}:null;return true},
 goalState:function(){return{goal:GOAL,shown:!!(GB&&GB.g.visible&&GB.g.parent),at:GB?GB.g.position.toArray():null,cine:!!CINE,stu:!!STU}},
 mark:function(kind,id,on){marks.forEach(function(m){if(m.kind===kind&&m.id===id)m.on=!!on});retarget(true)},
 lock:function(id,locked){var x=exitOf(id);if(x){x.locked=!!locked;retarget(true)}},
 actor:function(id,patch){var a=actors[id];if(!a)return false;if(patch.yaw!=null)a.wantYaw=patch.yaw;return true},
 move:function(id,x,z){var a=actors[id];if(!a||a.def.sit)return false;a.path=route(a.x,a.z,x,z);a.speed=a.def.speed||SPEED*.8;return !!a.path},
 player:function(look){if(!player)return;var old=player;cfg.player=look;player=new Body({x:old.x,z:old.z,yaw:old.yaw,look:look},'player');player.place();old.remove()},
 where:function(){return player?{room:cfg.room,x:player.x,z:player.z,target:target,frozen:frozen,moving:!!path}:null},
 update:function(n){try{return sync(n)}catch(er){err(er);return false}},
 audit:audit,grid:gridDump,
 celebrate:function(){window.__crowdPulse=performance.now()/1000;var set=function(b,m){if(b&&!b.def.sit){b.o.mode=m;setTimeout(function(){if(b.o.mode===m)b.o.mode=b.base},6500)}};if(player)set(player,'cheer');Object.keys(actors).forEach(function(k){set(actors[k],'cheer')})},
 frame:function(f){if(!cfg)return;FR=f;if(!CINE&&!STU)setView()},
 /* Season One: a shot (null ends the scene and gives the camera back), an act inside it, and the interview studio */
 shot:function(o){try{return cineShot(o)}catch(er){err(er);return false}},
 cineAct:function(a){try{return cineAct(a)}catch(er){err(er);return false}},
 studio:function(o){try{if(!o){studioOff();return true}return studioOn(o)}catch(er){err(er);return false}},
 studioSay:function(mood){if(!STU||!STU.who)return false;var oo=STU.who.userData.o;oo.mode=mood===false?'sit':'sittalk';oo.expr=mood===false?null:{k:mood||null,t0:now,role:'say'};return true},
 seats:function(){var out={};Object.keys(actors).forEach(function(k){out[k]={x:actors[k].x,z:actors[k].z}});if(player)out.me={x:player.x,z:player.z};return out}
};
K.hooks.push(frame);

/* ---------- boot ---------- */
var q=new URLSearchParams(location.search),el=K.ren.domElement,down=null;
/* a thumb on the picture is a stick wherever it lands (the way a phone game drives): drag and he goes that way, far and he
   runs, let go and he stops. A short touch that does not drag is still a tap — walk there, or go to whoever was touched. */
var STK=null,STR=62;
function stickUi(){var d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:fixed;z-index:9;pointer-events:none;width:'+(STR*2)+'px;height:'+(STR*2)+'px;margin:-'+STR+'px 0 0 -'+STR+'px;border-radius:50%;border:2px solid rgba(255,246,230,.55);background:rgba(20,20,28,.22);display:none';
 var k=document.createElement('div');k.style.cssText='position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,246,230,.9);box-shadow:0 2px 8px rgba(0,0,0,.35)';d.appendChild(k);document.body.appendChild(d);return{ring:d,knob:k}}
el.addEventListener('pointerdown',function(e){down={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId,drag:false}});
el.addEventListener('pointermove',function(e){
 if(!down||e.pointerId!==down.id||frozen||e.pointerType==='mouse')return;
 var dx=e.clientX-down.x,dy=e.clientY-down.y,d=Math.hypot(dx,dy);
 if(!down.drag&&d<14)return;
 if(!down.drag){down.drag=true;path=null;pending=null;if(!STK)STK=stickUi();STK.ring.style.left=down.x+'px';STK.ring.style.top=down.y+'px';STK.ring.style.display='block'}
 var k=Math.min(1,d/STR),nx=d?dx/d*k:0,ny=d?dy/d*k:0;axis.x=nx;axis.y=ny;running=k>.92;
 STK.knob.style.transform='translate('+(nx*STR)+'px,'+(ny*STR)+'px)';
});
function stickOff(){if(STK)STK.ring.style.display='none';axis.x=axis.y=0;running=false}
el.addEventListener('pointerup',function(e){if(!down)return;var wasDrag=down.drag,d=Math.hypot(e.clientX-down.x,e.clientY-down.y),dt=performance.now()-down.t;down=null;if(wasDrag){stickOff();return}if(d<12&&dt<600)tap(e.clientX,e.clientY)});
el.addEventListener('pointercancel',function(){if(down&&down.drag)stickOff();down=null});
fetch('/life/voxel/skins').then(function(r){return r.ok?r.json():{skins:{}}}).catch(function(){return{skins:{}}}).then(function(d){
 SKINS=d.skins||{};
 /* the stand-alone room viewer (no ?play) dresses a room for ?club= exactly as play does: the same skin, the same colour guard */
 window.__skinFor=function(id){var S=SKINS[id]||null;if(K.colourGuard)K.colourGuard(S);return S?{name:id,c1:S.p,c2:S.s,c3:S.t||'#14141c',club:S}:null};
 window.__start();
 var l=document.getElementById('loader');if(l)l.classList.add('off');
 window.__ready=true;emit({type:'ready',quality:K.quality});
 if(window.parent!==window&&window.parent.__vxHostReady)window.parent.__vxHostReady(P);
}).catch(err);
})();
