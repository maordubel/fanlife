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
var CELL=.5,RADIUS=.45,REACH=3.5,SPEED=5.6,RUN=1.55;
var sink=function(){},cfg=null,grid=null,player=null,actors={},exits=[],spots=[],marks=[],decor=[],target=null,frozen=false,S=null,SKINS={};
var FR={top:.8,bottom:-.4},axis={x:0,y:0},running=false,path=null,pending=null,graceUntil=0,lastExit=null,focusId=null,stepAcc=0,now=0,camX=0,camZ=1,fade=null;
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
 decor.forEach(function(p){block(p.x-.8,p.z-.8,p.x+.8,p.z+.8)});
 (exits||[]).forEach(function(x){var e=x.def,i0=Math.max(0,Math.floor((e.x-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((e.x+e.w-w[0])/CELL)),j0=Math.max(0,Math.floor((e.z-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((e.z+e.d-w[1])/CELL));for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=0});
 Object.keys(actors).forEach(function(id){var a=actors[id];if(a.def.ghost||a.def.follow)return;var r=a.def.sit?1.0:.7;block(a.x-r,a.z-r,a.x+r,a.z+r)});
 (cfg.clear||[]).forEach(function(r){var i0=Math.max(0,Math.floor((r[0]-w[0])/CELL)),i1=Math.min(nx-1,Math.floor((r[2]-w[0])/CELL)),j0=Math.max(0,Math.floor((r[1]-w[1])/CELL)),j1=Math.min(nz-1,Math.floor((r[3]-w[1])/CELL));for(var i=i0;i<=i1;i++)for(var j=j0;j<=j1;j++)b[j*nx+i]=0});
 grid={nx:nx,nz:nz,b:b,x0:w[0],z0:w[1]};
}
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
 ['sex','age','build','style','mustache','beard','stubble','glasses','sleeves','jacket','denimJacket','cardigan','track','trackCol','denim','skirt','apron'].forEach(function(k){if(o[k]!=null)d[k]=o[k]});
 if(o.track&&!o.trackCol)d.trackCol=S&&S.p?S.p:'#b02d10';
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
Body.prototype.turn=function(to,dt,rate){var d=to-this.yaw;while(d>PI)d-=2*PI;while(d<-PI)d+=2*PI;this.yaw+=d*Math.min(1,dt*(rate||10))};
Body.prototype.stride=function(dist){this.o.sw=(this.o.sw||0)+dist*U/(1.5*this.s)*2*PI;this.o.sv=1};
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
 buildGrid();
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
 RM.load(c.room,{club:c.club,time:c.time==='night'?'night':'day',skinSet:sk,play:true});
 var def=RM.defs[c.room];pruneDecor(c,def&&def.kind);
 if(window.__gnd)window.__sc.remove(window.__gnd);if(def&&IND[def.kind]){var gm=new T.Mesh(new T.PlaneGeometry(300,300),new T.MeshBasicMaterial({color:new T.Color('#cdb592').convertSRGBToLinear()}));gm.rotation.x=-PI/2;gm.position.set(12*U,-.06,8*U);window.__sc.add(gm);window.__gnd=gm}
 if(window.__fill)window.__sc.remove(window.__fill);var fi=new T.DirectionalLight('#fff0e0',def&&IND[def.kind]?.3:.15);fi.position.set(0,6,14);window.__sc.add(fi);window.__fill=fi;
 var sp=c.spawn||{x:(c.walk[0]+c.walk[2])/2,z:(c.walk[1]+c.walk[3])/2,yaw:0};
 setView();skyOf(c.time==='night',def&&def.kind);
 (c.actors||[]).forEach(function(a){addActor(a,sp)});
 (c.spots||[]).forEach(addSpot);
 (c.exits||[]).forEach(addExit);
 buildGrid();
 var cell=nearestFree(sp.x,sp.z,6),pos=cell?centre(cell[0],cell[1]):[sp.x,sp.z];
 if(freeAt(sp.x,sp.z))pos=[sp.x,sp.z];
 player=new Body({x:pos[0],z:pos[1],yaw:sp.yaw||0,look:c.player||{}},'player');player.place();
 settleFollowers();
 camX=0;camZ=1;trackCam(0,true);
 graceUntil=now+.7;
 veil(false,420);
 emit({type:'entered',room:c.room,issues:audit()});
 retarget(true);
}
/* portrait: the picture is a window of about 4.6 m across the room, and it follows him */
function setView(){
 var top=FR.top==null?.8:FR.top,bottom=FR.bottom==null?-.4:FR.bottom,W=innerWidth,H=innerHeight,fov=null,info=K.camInfo();
 /* a phone: the picture IS the glass, edge to edge; the room is a window of about 3 m that follows him, lifted while somebody speaks */
 if(W/H<.9){var c=(top+bottom)/2*.3;top=1+c;bottom=-1+c}
 var a=W/(H*(top-bottom)/2);
 if(info&&a<1.15){var d=Math.hypot(info.p[1]-info.l[1],info.p[2]-info.l[2]),roomW=(cfg.walk[2]-cfg.walk[0]+2)*U,vis=Math.min(roomW,W/H<.9?(IND[((RM.defs[cfg.room]||{}).kind)]?3.3:4.2):4.6);fov=Math.max(20,Math.min(70,2*Math.atan(vis/2/(d*a))*180/PI))}
 K.view(top,bottom,fov);
}
function skyOf(night,kind){
 var inside=!!IND[kind];
 if(inside)window.__sc.children.forEach(function(o){if(o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.radius===90&&o.material.isShaderMaterial)o.visible=false});
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
 var k=snap?1:Math.min(1,dt*4.5);camX+=(fx-camX)*k;camZ+=(zm-camZ)*k;K.follow(camX,camZ);
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
 var c=nearestFree(p[0]+(player.x>p[0]?1.2:-1.2),p[1]+1.3,5)||nearestFree(p[0],p[1],6);if(!c)return false;
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
   var ox=player.x,oz=player.z;if(slide(player,dx,dz)){moved=Math.hypot(player.x-ox,player.z-oz);player.wantYaw=Math.atan2(player.x-ox,player.z-oz)}
  }else if(path){
   player.path=path;player.speed=SPEED*(running?RUN:1);moved=follow(player,dt);path=player.path;
   if(!path&&pending){var pd=pending;pending=null;retarget(true);var pr=reachOf(pd.kind,pd.id),pm=marks.filter(function(m){return m.kind===pd.kind&&m.id===pd.id})[0];if(target&&target.kind===pd.kind&&target.id===pd.id)act(pd);else if(pr&&pm&&pm.on&&(pr[0]-player.x)*(pr[0]-player.x)+(pr[1]-player.z)*(pr[1]-player.z)<pm.reach*pm.reach)act(pd);else{faceEachOther(pd.id)}}
  }
 }
 if(moved>0){player.stride(moved);stepAcc+=moved;if(stepAcc>2.6*player.s){stepAcc=0;emit({type:'step',surface:cfg.surface||'floor'})}}else player.rest(dt);
 if(player.wantYaw!=null)player.turn(player.wantYaw,dt,moved>0?12:7);
 player.o.mode=focusId&&!moved?'listen':'ctrl';player.place();
 Object.keys(actors).forEach(function(id){var a=actors[id];
  if(a.path){var m=follow(a,dt);if(m>0)a.stride(m);if(!a.path){a.rest(dt);emit({type:'arrived',id:id})}}
  else if(a.def.follow&&!frozen){
   var gx=player.x-Math.sin(player.yaw)*2.1+(a.def.side||1)*Math.cos(player.yaw)*1.5,gz=player.z-Math.cos(player.yaw)*2.1-(a.def.side||1)*Math.sin(player.yaw)*1.5,ddx=gx-a.x,ddz=gz-a.z,dd=Math.hypot(ddx,ddz);
   if(dd>1.1){var st2=Math.min(dd-.6,SPEED*1.05*dt),o1=a.x,o2=a.z;if(slide(a,ddx/dd*st2,ddz/dd*st2)){var mv=Math.hypot(a.x-o1,a.z-o2);a.stride(mv);a.wantYaw=Math.atan2(a.x-o1,a.z-o2)}else a.rest(dt)}else{a.rest(dt);a.wantYaw=player.yaw}
  }else a.rest(dt);
  if(a.wantYaw!=null&&!a.def.sit)a.turn(a.wantYaw,dt,6);
  if(id===focusId&&a.base!=='sit')a.o.mode='talk';else a.o.mode=a.base;
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
 trackCam(dt,false);
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
 engine:'town',
 on:function(fn){sink=fn||function(){}},
 enter:function(c){try{enter(c);return true}catch(er){err(er);return false}},
 axis:function(x,y){axis.x=x||0;axis.y=y||0},
 run:function(b){running=!!b},
 act:function(){return act()},
 tap:tap,walkTo:walkTo,goTo:goTo,
 freeze:function(b){frozen=!!b;if(frozen){axis.x=axis.y=0;path=null;pending=null}else{graceUntil=now+.35;retarget(true)}},
 emote:function(){},
 project:function(kind,id){var b=null,x=0,y=0,z=0;
  if(kind==='actor'){b=actors[id];if(b){x=b.x*U;y=b.g.position.y+b.hm+.3;z=b.z*U}}
  else if(kind==='spot'){for(var i=0;i<spots.length;i++)if(spots[i].id===id){b=spots[i];x=b.x*U;y=(b.y==null?2.6:b.y)*U+.3;z=b.z*U}}
  else if(kind==='exit'){var xx=exitOf(id);if(xx){b=1;x=(xx.def.x+xx.def.w/2)*U;y=.9;z=(xx.def.z+xx.def.d/2)*U}}
  return b?K.screen(x,y,z):null},
 focus:function(id){focusId=id||null;if(id)faceEachOther(id)},
 mark:function(kind,id,on){marks.forEach(function(m){if(m.kind===kind&&m.id===id)m.on=!!on});retarget(true)},
 lock:function(id,locked){var x=exitOf(id);if(x){x.locked=!!locked;retarget(true)}},
 actor:function(id,patch){var a=actors[id];if(!a)return false;if(patch.yaw!=null)a.wantYaw=patch.yaw;return true},
 move:function(id,x,z){var a=actors[id];if(!a||a.def.sit)return false;a.path=route(a.x,a.z,x,z);a.speed=a.def.speed||SPEED*.8;return !!a.path},
 player:function(look){if(!player)return;var old=player;cfg.player=look;player=new Body({x:old.x,z:old.z,yaw:old.yaw,look:look},'player');player.place();old.remove()},
 where:function(){return player?{room:cfg.room,x:player.x,z:player.z,target:target,frozen:frozen,moving:!!path}:null},
 update:function(n){try{return sync(n)}catch(er){err(er);return false}},
 audit:audit,grid:gridDump,
 celebrate:function(){var set=function(b,m){if(b&&!b.def.sit){b.o.mode=m;setTimeout(function(){if(b.o.mode===m)b.o.mode=b.base},6500)}};if(player)set(player,'cheer');Object.keys(actors).forEach(function(k){set(actors[k],'cheer')})},
 frame:function(f){if(!cfg)return;FR=f;setView()}
};
K.hooks.push(frame);

/* ---------- boot ---------- */
var q=new URLSearchParams(location.search),el=K.ren.domElement,down=null;
el.addEventListener('pointerdown',function(e){down={x:e.clientX,y:e.clientY,t:performance.now()}});
el.addEventListener('pointerup',function(e){if(!down)return;var d=Math.hypot(e.clientX-down.x,e.clientY-down.y),dt=performance.now()-down.t;down=null;if(d<12&&dt<600)tap(e.clientX,e.clientY)});
fetch('/life/voxel/skins').then(function(r){return r.ok?r.json():{skins:{}}}).catch(function(){return{skins:{}}}).then(function(d){
 SKINS=d.skins||{};window.__start();
 var l=document.getElementById('loader');if(l)l.classList.add('off');
 window.__ready=true;emit({type:'ready',quality:K.quality});
 if(window.parent!==window&&window.parent.__vxHostReady)window.parent.__vxHostReady(P);
}).catch(err);
})();
