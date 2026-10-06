/* LIFE voxel engine — rooms built from data in three.js (r128), dressed by a ClubSkin.
 * Host-agnostic: the lab (lab.js) and the game (play.js) both boot it on their own canvas.
 * Everything a club changes is DATA (V.setSkins); no club is named in this file. */
(function(){
"use strict";
window.__err=window.__err||[];
window.addEventListener('error',function(e){window.__err.push(String(e.message))});
var BASE='/life/voxel/tex/';
var TEXd={plaster:'plaster.webp',terrazzo:'terrazzo.webp',asphalt:'asphalt.webp',sidewalk:'sidewalk.webp',concrete:'concrete.webp',gatePave:'gatePave.webp',plaza:'plaza.webp',facade:'facade.webp',pink:'pink.webp',ochre:'ochre.webp',woodPanel:'woodPanel.webp',kioskTile:'kioskTile.webp',blueWall:'blueWall.webp',sofaFab:'sofaFab.webp',doorWood:'doorWood.webp',awning:'awning.webp'};
/* printed artwork a club owns (crest, shirts): only loaded for the skin that names it */
var ART={};
var IM={};
var TILE={};Object.keys(TEXd).forEach(function(k){TILE[k]=1});

/* ---------- club skins (data) ---------- */
var STR={kiosk:'KIOSK',ticket:'TICKETS',school:'SCHOOL',club:'CLUB',news:'NEWS',bus:'BUS STATION',ground:'THE GROUND',cafe:'CAFÉ',snack:'SNACK',gate:'GATE',stand:'STAND',away:'AWAY END',since:'SINCE FOREVER',shop:'GROCERY',market:'MARKET',clock:'12:50'};
function normSkin(id,s){
 s=s||{};var k,str={};for(k in STR)str[k]=STR[k];if(s.strings)for(k in s.strings)if(s.strings[k])str[k]=s.strings[k];
 var name=s.name||'Club',short=(s.short||name).toUpperCase();
 var o={id:id,name:name,short:short,initials:(s.initials||short.replace(/[^A-Z0-9 ]/g,'').split(/\s+/).map(function(w){return w.charAt(0)}).join('').slice(0,3)||'FC').toUpperCase(),
  p:s.p||'#9a3324',s:s.s||'#efe9de',t:s.t||'#1a2036',pattern:s.pattern||'solid',ik:!!s.ik,crest:s.crest||'monogram',art:s.art||null,
  nums:(s.nums&&s.nums.length>=3)?s.nums:[1,2,3],city:s.city||'',strings:str,policy:s.policy||[],
  stadium:s.stadium||str.ground,stadiumKnown:!!s.stadium};
 o.kiosk=str.kiosk;o.ticket=str.ticket;o.school=str.school;
 return o;
}
var SK={};
var FALLBACK='club';
SK[FALLBACK]=normSkin(FALLBACK,{});
function setSkins(map){Object.keys(map||{}).forEach(function(id){SK[id]=normSkin(id,map[id])});return SK}
function skin(id){return SK[id]||SK[FALLBACK]}
var st={club:FALLBACK,scene:'room',time:'day',look:'voxel',play:false};

/* ---------- colour policy: a club's forbidden hue bands never reach a material ---------- */
function hsvOf(r,g,b){var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx?d/mx:0,mx]}
function rgbOf(h,s,v){var c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,r=0,g=0,b=0;if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}return[r+m,g+m,b+m]}
var POL=[];
function clean(hex){
 if(!POL.length||typeof hex!=='string'||hex.charAt(0)!=='#'||hex.length<7)return hex;
 var r=parseInt(hex.substr(1,2),16)/255,g=parseInt(hex.substr(3,2),16)/255,b=parseInt(hex.substr(5,2),16)/255,q=hsvOf(r,g,b),hit=false;
 for(var i=0;i<POL.length;i++){var p=POL[i],lo=p.hue[0]-6,hi=p.hue[1]+6;
  if(q[0]>=lo&&q[0]<=hi&&q[1]>=Math.max(0,(p.minSaturation||0)-.1)&&q[2]>=Math.max(0,(p.minValue||0)-.1)){q[0]=q[0]<(lo+hi)/2?lo-4:hi+4;hit=true}}
 if(!hit)return hex;
 var o=rgbOf(q[0],q[1],q[2]);
 return '#'+o.map(function(v){var n=Math.round(Math.max(0,Math.min(1,v))*255).toString(16);return n.length<2?'0'+n:n}).join('');
}
function cleanNum(n){if(!POL.length)return n;var h=n.toString(16);while(h.length<6)h='0'+h;return parseInt(clean('#'+h).substr(1),16)}

/* ---------- rng ---------- */
var _s=1;function seed(n){_s=n>>>0}
function rnd(){_s|=0;_s=_s+0x6D2B79F5|0;var t=Math.imul(_s^_s>>>15,1|_s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
function pick(a){return a[Math.floor(rnd()*a.length)]}

/* ---------- three (created at boot) ---------- */
var ren=null,scene=null,cam=null,tgt=null,MAXA=1,host=null,Q=null;
var QUALITY={high:{dpr:2,shadow:2048,shadows:true,aa:true},medium:{dpr:1.5,shadow:1024,shadows:true,aa:true},low:{dpr:1,shadow:0,shadows:false,aa:false}};
function suggestQuality(){
 var coarse=window.matchMedia&&window.matchMedia('(pointer:coarse)').matches,cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4;
 if(coarse&&(cores<=4||mem<=2))return 'low';
 if(coarse)return 'medium';
 return 'high';
}

var LC={};
function lin(hex){hex=clean(hex);if(LC[hex])return LC[hex];var c=new THREE.Color(hex).convertSRGBToLinear();return LC[hex]=[c.r,c.g,c.b]}
var TT={};
var RAMP={plaster:['#5d4c42','#907c6a','#bfae9a'],terrazzo:['#6c625c','#a69b90','#d2c9bd'],asphalt:['#2b2d31','#44474d','#62666d'],sidewalk:['#6a6866','#98958f','#c0bcb4'],concrete:['#4a4d52','#767a80','#a3a7ab'],gatePave:['#3c3f44','#5e6268','#868a90'],plaza:['#767067','#a59d92','#cfc8bb'],facade:['#6b5a50','#9b8777','#c7b6a3'],pink:['#7a4f4c','#b07e78','#d9aca4'],ochre:['#6e3f2a','#a5603f','#cf8d68'],woodPanel:['#3b2a21','#654532','#8e6648'],kioskTile:['#3a5a6a','#5e8393','#9dbcc6'],blueWall:['#243a5c','#3a5e8f','#6d93bf'],sofaFab:['#3e2a22','#6a4636','#94705a'],doorWood:['#2f2019','#523626','#7a5539'],awning:['#808080','#b4b4b4','#e6e6e6']};
var KEEP={terrazzo:.55,sofaFab:.25,plaza:.2,kioskTile:.15};
var GRADE={room:[1.05,.97,.9],street:[1.03,1,.96],gate:[.9,.96,1.1]};
function hx(h){return[parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}
function tileTex(k){var gk=GRADE[st.scene]?st.scene:'-',key=gk+k;if(TT[key])return TT[key];
 var N=32,c=document.createElement('canvas');c.width=c.height=N;var g=c.getContext('2d');g.imageSmoothingQuality='high';if(IM[k])g.drawImage(IM[k],0,0,N,N);else{g.fillStyle=RAMP[k][1];g.fillRect(0,0,N,N)}
 var d=g.getImageData(0,0,N,N),a=d.data,L=[],m=0,i;
 for(i=0;i<N*N;i++){var l=(a[i*4]*.3+a[i*4+1]*.59+a[i*4+2]*.11)/255;L.push(l);m+=l}m/=N*N;
 var sd=0;for(i=0;i<N*N;i++)sd+=(L[i]-m)*(L[i]-m);sd=Math.sqrt(sd/(N*N))+.02;
 var R=RAMP[k].map(hx),G=GRADE[st.scene]||[1,1,1],kp=KEEP[k]||0;
 for(i=0;i<N*N;i++){var v=.5+(L[i]-m)/(sd*3.4);v=Math.max(0,Math.min(1,v));v=Math.round(v*5)/5;
  var lo=v<.5?R[0]:R[1],hi=v<.5?R[1]:R[2],f=v<.5?v*2:(v-.5)*2,o=[0,0,0];
  for(var q=0;q<3;q++){var base=lo[q]+(hi[q]-lo[q])*f;o[q]=base*(1-kp)+a[i*4+q]*kp;o[q]=Math.max(0,Math.min(255,o[q]*G[q]))}
  a[i*4]=o[0];a[i*4+1]=o[1];a[i*4+2]=o[2];a[i*4+3]=255}
 g.putImageData(d,0,0);
 var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return TT[key]=t}
function cv(w,h,fn){var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');fn(g,w,h);return c}
function ctex(c){var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=MAXA;return t}

/* ---------- batching ---------- */
var cur=null,DEC={};
function Batch(){this.P=[];this.N=[];this.U=[];this.C=[];this.I=[];this.n=0}
Batch.prototype.vtx=function(p,n,u,v,c){this.P.push(p[0],p[1],p[2]);this.N.push(n[0],n[1],n[2]);this.U.push(u,v);this.C.push(c[0],c[1],c[2]);return this.n++};
function bt(k){return cur.b[k]||(cur.b[k]=new Batch())}
var SHADE=1;
function face(k,o,u,v,n,w,h,op){
 op=op||{};var b=bt(k);
 var tiled=!!TILE[k]&&!op.full;
 var cs=op.cell||(k==='flat'?1:2);
 var nx=op.full?1:Math.max(1,Math.round(w/cs)),ny=op.full?1:Math.max(1,Math.round(h/cs));
 var cw=w/nx,ch=h/ny,vert=Math.abs(n[1])<.5;
 var base=op.col?lin(op.col):[1,1,1];
 var jit=op.full?0:(op.jit==null?.07:op.jit),ao=(vert&&!op.full)?(op.ao==null?.2:op.ao):0;
 for(var i=0;i<nx;i++)for(var j=0;j<ny;j++){
  var s0=0,t0=0,s1=1,t1=1;
  if(tiled){var z=.5;s0=rnd()*(1-z);t0=rnd()*(1-z);s1=s0+z;t1=t0+z;if(rnd()<.5){var q=s0;s0=s1;s1=q}}
  var jf=1+(rnd()-.5)*2*jit;
  var lo=jf*(1-ao),hi=jf;
  var P=function(a,bb){return[o[0]+u[0]*a*cw+v[0]*bb*ch,o[1]+u[1]*a*cw+v[1]*bb*ch,o[2]+u[2]*a*cw+v[2]*bb*ch]};
  var cl=function(f){return[base[0]*f,base[1]*f,base[2]*f]};
  /* edge light: contact shade at the foot, a lit top lip, softened side edges, bevelled rims on tops — every box reads as an object, not a flat block */
  var G=function(a,bb){
   if(op.full||SHADE===0)return null;var A=a*cw,B=bb*ch;
   if(op.ao!=null)return null;
   var e=Math.min(A,w-A);
   if(vert){var g=1,fo=Math.min(h,2.4);if(h>1)g*=1-.2*Math.max(0,1-B/fo);if(h>.6&&h-B<.35)g*=1+.07*(1-(h-B)/.35);if(w>.6&&e<.3)g*=1-.07*(1-e/.3);return g}
   var e2=Math.min(e,B,h-B);return e2<.3&&w>.6&&h>.6?1-.09*(1-e2/.3):1;
  };
  var cv_=function(a,bb,f){var g=G(a,bb);return cl(g==null?f:jf*g)};
  var A=b.vtx(P(i,j),n,s0,t0,G(i,j)==null?cl(j===0?lo:hi):cv_(i,j)),B=b.vtx(P(i+1,j),n,s1,t0,G(i+1,j)==null?cl(j===0?lo:hi):cv_(i+1,j)),C=b.vtx(P(i+1,j+1),n,s1,t1,G(i+1,j+1)==null?cl(hi):cv_(i+1,j+1)),D=b.vtx(P(i,j+1),n,s0,t1,G(i,j+1)==null?cl(hi):cv_(i,j+1));
  b.I.push(A,B,C,A,C,D);
 }
}
function box(k,x,y,z,w,h,d,o){
 o=o||{};var s=(o.s||'')+'ny';var kp=o.kp||{};var op={col:o.c,cell:o.cell,full:o.full,jit:o.jit,ao:o.ao};
 var K=function(n){return kp[n]||k};
 if(s.indexOf('pz')<0)face(K('pz'),[x,y,z+d],[1,0,0],[0,1,0],[0,0,1],w,h,op);
 if(s.indexOf('nz')<0)face(K('nz'),[x+w,y,z],[-1,0,0],[0,1,0],[0,0,-1],w,h,op);
 if(s.indexOf('px')<0)face(K('px'),[x+w,y,z+d],[0,0,-1],[0,1,0],[1,0,0],d,h,op);
 if(s.indexOf('nx')<0)face(K('nx'),[x,y,z],[0,0,1],[0,1,0],[-1,0,0],d,h,op);
 if(s.indexOf('py')<0)face(K('py'),[x,y+h,z+d],[1,0,0],[0,0,-1],[0,1,0],w,d,op);
 /* footprint: what a walker cannot pass (play.js builds its walk grid from these) */
 if(cur&&cur.solids&&k!=='glow'&&w>0&&d>0)cur.solids.push([x,z,w,d,y,y+h]);
}
function wallZ(k,x0,x1,y0,y1,z,t,holes,o){
 holes=holes||[];o=o||{};
 var xs=[x0,x1];holes.forEach(function(h){xs.push(h[0],h[1])});
 var X=xs.filter(function(v,i){return xs.indexOf(v)===i}).sort(function(a,b){return a-b});
 var oo={};for(var q in o)oo[q]=o[q];oo.s=(o.s||'')+'nz';
 for(var i=0;i<X.length-1;i++){
  var a=X[i],b=X[i+1];if(b-a<.01)continue;
  var cov=holes.filter(function(h){return h[0]<=a+1e-6&&h[1]>=b-1e-6}).sort(function(p,q){return p[2]-q[2]});
  var y=y0;
  cov.forEach(function(h){if(h[2]>y)box(k,a,y,z,b-a,h[2]-y,t,oo);y=Math.max(y,h[3])});
  if(y1>y)box(k,a,y,z,b-a,y1-y,t,oo);
 }
}
function decal(k,x,y,z,w,h){face(k,[x,y,z],[1,0,0],[0,1,0],[0,0,1],w,h,{full:1})}
function decalY(k,x,z,y,w,d){face(k,[x,y,z+d],[1,0,0],[0,0,-1],[0,1,0],w,d,{full:1})}

/* ---------- decals / skin canvases ---------- */
var tvC=null,tvTex=null;
var FF="'Arial Narrow',Arial,'Helvetica Neue',Helvetica,sans-serif";
function drawCrest(g,x,y,h,S){
 if(S.crest==='real'&&IM['crest:'+S.id]){var im=IM['crest:'+S.id];g.drawImage(im,x,y,h*im.width/im.height,h)}
 else{/* monogram: initials on the club's own colours — a mark, never a redrawn crest */
  g.save();var r=h/2-3,cx=x+h/2,cy=y+h/2;
  g.beginPath();g.arc(cx,cy,r,0,7);g.fillStyle=S.s;g.fill();
  g.lineWidth=Math.max(3,h*.07);g.strokeStyle=S.t;g.stroke();
  g.beginPath();g.arc(cx,cy,r-h*.09,0,7);g.lineWidth=Math.max(2,h*.025);g.strokeStyle=S.p;g.stroke();
  g.fillStyle=S.p;g.textAlign='center';g.textBaseline='middle';
  var fs=Math.round(h*(S.initials.length>2?.3:.4));g.font='700 '+fs+'px '+FF;g.fillText(S.initials,cx,cy+fs*.06,r*1.5);
  g.restore()}
}
function mkDec(S){
 var D={};
 function add(name,w,h,fn,mode,dbl){D[name]={t:ctex(cv(w,h,fn)),mode:mode||'opaque',dbl:!!dbl}}
 var sP=clean(S.p),sS=clean(S.s),sT=clean(S.t);
 add('fence',64,64,function(g){g.fillStyle='#2b2f37';[6,22,38,54].forEach(function(x){g.fillRect(x,6,4,56);g.beginPath();g.moveTo(x-2,8);g.lineTo(x+2,0);g.lineTo(x+6,8);g.fill()});g.fillRect(0,14,64,4);g.fillRect(0,50,64,4)},'test',true);
 add('lace',64,128,function(g,w,h){g.strokeStyle='rgba(255,255,255,.82)';g.fillStyle='rgba(255,255,255,.22)';g.lineWidth=2;g.fillRect(0,0,w,h);for(var y=8;y<h-14;y+=12)for(var x=(y/12%2)*8;x<w;x+=16){g.beginPath();g.arc(x+8,y,5,0,7);g.stroke()}for(var x2=0;x2<w;x2+=16){g.beginPath();g.arc(x2+8,h-8,8,0,Math.PI);g.fillStyle='rgba(255,255,255,.7)';g.fill()}},'test',true);
 add('rug',256,160,function(g,w,h){g.fillStyle=sT;g.fillRect(0,0,w,h);g.fillStyle=sP;g.fillRect(8,8,w-16,h-16);g.fillStyle=sS;g.fillRect(20,20,w-40,h-40);g.fillStyle=sT;g.fillRect(28,28,w-56,h-56);g.fillStyle=sP;for(var i=0;i<5;i++){var cx=48+i*40,cy=h/2;g.beginPath();g.moveTo(cx,cy-30);g.lineTo(cx+18,cy);g.lineTo(cx,cy+30);g.lineTo(cx-18,cy);g.fill()}});
 add('graffiti',512,256,function(g,w,h){g.textAlign='center';g.lineJoin='round';g.font='italic 700 118px '+FF;g.lineWidth=18;g.strokeStyle=sT;g.strokeText(S.short,w/2,150,w*.92);g.fillStyle=sP;g.fillText(S.short,w/2,150,w*.92);g.lineWidth=4;g.strokeStyle=sS;g.strokeText(S.short,w/2-3,146,w*.92);g.fillStyle=sP;for(var i=0;i<7;i++){var x=60+i*62+(i%2)*10;g.fillRect(x,158,5,20+(i*37%46))}g.fillStyle=sS;g.font='600 34px '+FF;g.fillText(S.strings.since,w/2,222,w*.9)},'blend');
 add('banner',512,180,function(g,w,h){g.fillStyle=sP;g.fillRect(0,0,w,h);g.fillStyle=sS;g.fillRect(0,0,w,10);g.fillRect(0,h-10,w,10);g.fillStyle=sT;g.fillRect(0,10,w,5);g.fillRect(0,h-15,w,5);drawCrest(g,26,22,136,S);g.fillStyle=sS;g.textAlign='left';g.font='700 62px '+FF;g.fillText(S.short,190,92,300);g.font='500 26px '+FF;g.globalAlpha=.85;g.fillText((S.stadiumKnown?S.stadium:S.city||S.stadium).toUpperCase(),192,132,300)});
 add('shirtF',192,252,function(g,w,h){g.fillStyle='#4a392e';g.fillRect(0,0,w,h);g.fillStyle='#d9d3c7';g.fillRect(10,10,w-20,h-20);
  if(IM['shirt:'+S.id]){g.drawImage(IM['shirt:'+S.id],16,36,160,160)}
  else{g.fillStyle=S.ik?sS:sP;g.beginPath();g.moveTo(52,34);g.lineTo(78,28);g.quadraticCurveTo(96,48,114,28);g.lineTo(140,34);g.lineTo(176,70);g.lineTo(152,92);g.lineTo(140,80);g.lineTo(140,208);g.lineTo(52,208);g.lineTo(52,80);g.lineTo(40,92);g.lineTo(16,70);g.closePath();g.fill();
   g.save();g.clip();g.fillStyle=S.ik?sP:sS;
   if(S.pattern==='stripes'){for(var x=16;x<176;x+=28)g.fillRect(x,20,14,200)}
   else if(S.pattern==='hoops'){for(var y=40;y<210;y+=28)g.fillRect(0,y,192,14)}
   else if(S.pattern==='halves'){g.fillRect(96,0,96,252)}
   else if(S.pattern==='sash'){g.beginPath();g.moveTo(40,208);g.lineTo(70,208);g.lineTo(152,40);g.lineTo(122,40);g.closePath();g.fill()}
   else if(S.pattern==='checkers'){for(var a=0;a<8;a++)for(var b2=0;b2<9;b2++)if((a+b2)%2)g.fillRect(16+a*22,20+b2*22,22,22)}
   g.restore()}
  g.fillStyle='#3d332c';g.font='500 13px '+FF;g.textAlign='center';g.fillText(S.short,w/2,232,w-30)});
 add('photo',96,128,function(g,w,h){g.fillStyle='#5a4a3e';g.fillRect(0,0,w,h);g.fillStyle='#b8bcc2';g.fillRect(6,6,w-12,h-12);g.fillStyle='#8f949c';g.fillRect(6,70,w-12,52);g.fillStyle='#3d4048';[24,48,70].forEach(function(x){g.fillRect(x,40,14,50);g.beginPath();g.arc(x+7,32,8,0,7);g.fill()});g.fillStyle=sP;g.fillRect(24,44,14,10)});
 add('kioskSign',512,96,function(g,w,h){g.fillStyle=sT;g.fillRect(0,0,w,h);g.strokeStyle=sS;g.lineWidth=4;g.strokeRect(6,6,w-12,h-12);g.fillStyle=sS;g.textAlign='center';g.textBaseline='middle';g.font='700 54px '+FF;g.fillText(S.kiosk,w/2,h/2+3,w*.9)});
 S.nums.forEach(function(n,i){add('gn'+i,128,96,function(g,w,h){g.fillStyle='#16213a';g.fillRect(0,0,w,h);g.strokeStyle=sS;g.lineWidth=4;g.strokeRect(5,5,w-10,h-10);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='700 62px '+FF;g.fillText(String(n),w/2,h/2+3)})});
 add('flag',128,84,function(g,w,h){if(S.pattern==='stripes'||S.pattern==='hoops'){for(var i=0;i<7;i++){g.fillStyle=i%2?sS:sP;g.fillRect(0,i*12,w,12)}}else{g.fillStyle=sP;g.fillRect(0,0,w/2,h);g.fillStyle=sS;g.fillRect(w/2,0,w/2,h)}});
 return D;
}
function tvDraw(t,S){var g=tvC.getContext('2d'),w=128,h=96;g.fillStyle='#2d6a3c';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.14)';for(var i=0;i<w;i+=16)g.fillRect(i,0,8,h);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.5;g.strokeRect(6,8,w-12,h-16);g.beginPath();g.moveTo(w/2,8);g.lineTo(w/2,h-8);g.stroke();g.beginPath();g.arc(w/2,h/2,13,0,7);g.stroke();
 for(var k=0;k<6;k++){var a=t*.9+k*1.7;g.fillStyle=k<3?clean(S.p):clean(S.s);g.fillRect(24+k*13+Math.sin(a)*10,22+(k%3)*22+Math.cos(a*1.3)*6,5,5)}
 var bx=w/2+Math.sin(t*1.4)*40,by=h/2+Math.cos(t*1.9)*22;g.fillStyle='#fff';g.fillRect(bx,by,4,4);
 g.fillStyle='rgba(255,255,255,'+(.04+.04*Math.sin(t*30))+')';g.fillRect(0,0,w,h);tvTex.needsUpdate=true}

/* ---------- materials ---------- */
function mat(k){
 var m;
 if(TILE[k])m=new THREE.MeshStandardMaterial({map:tileTex(k),vertexColors:true,roughness:.95,metalness:0});
 else if(k==='flat')m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:0});
 else if(k==='glass')m=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.4,roughness:.08,metalness:.1,depthWrite:false});
 else if(k==='glow')m=new THREE.MeshBasicMaterial({vertexColors:true});
 else if(k==='tv')m=new THREE.MeshBasicMaterial({map:tvTex});
 else{var d=DEC[k];var o={map:d.t,vertexColors:true,roughness:.9,metalness:0,side:d.dbl?THREE.DoubleSide:THREE.FrontSide};
  if(d.mode==='test')o.alphaTest=.4;else if(d.mode==='blend'){o.transparent=true;o.polygonOffset=true;o.polygonOffsetFactor=-2;o.depthWrite=false}
  m=new THREE.MeshStandardMaterial(o)}
 return m;
}

/* ---------- people ---------- */
var BG=null,pmc={},ptc={};
function pm(hex){hex=clean(hex);return pmc[hex]||(pmc[hex]=new THREE.MeshStandardMaterial({color:new THREE.Color(hex).convertSRGBToLinear(),roughness:.9}))}
function patMat(kind,a,b){
 a=clean(a);b=clean(b);var key=kind+a+b;if(ptc[key])return ptc[key];
 var c=cv(16,16,function(g){g.fillStyle=a;g.fillRect(0,0,16,16);g.fillStyle=b;
  if(kind==='stripes'){for(var x=0;x<16;x+=4)g.fillRect(x,0,2,16)}
  else if(kind==='hoops'){for(var y=0;y<16;y+=4)g.fillRect(0,y,16,2)}
  else if(kind==='checkers'){for(var i=0;i<4;i++)for(var j=0;j<4;j++)if((i+j)%2)g.fillRect(i*4,j*4,4,4)}
  else if(kind==='sash'){g.beginPath();g.moveTo(0,16);g.lineTo(5,16);g.lineTo(16,3);g.lineTo(16,0);g.lineTo(12,0);g.lineTo(0,12);g.closePath();g.fill()}
  else g.fillRect(8,0,8,16)});
 var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;
 return ptc[key]=new THREE.MeshStandardMaterial({map:t,roughness:.9});
}
function part(par,w,h,d,m,x,y,z,top){var piv=new THREE.Group();piv.position.set(x,y,z);var me=new THREE.Mesh(BG,m);me.scale.set(w,h,d);me.position.y=top?-h/2:0;me.castShadow=true;me.receiveShadow=true;piv.add(me);par.add(piv);return piv}
function cube(par,w,h,d,m,x,y,z){var me=new THREE.Mesh(BG,m);me.scale.set(w,h,d);me.position.set(x,y,z);me.castShadow=true;me.receiveShadow=true;par.add(me);return me}
function person(o){
 var hgt=o.h||6.6,s=hgt/6.7,g=new THREE.Group(),Bd=new THREE.Group();g.add(Bd);g.scale.setScalar(s);
 var skinM=pm(o.skin||'#e0b08c'),pants=pm(o.pants||'#2c3345'),shoe=pm('#1b1b1f');
 var shirtM=o.pat?patMat(o.pat,o.shirt,o.shirt2||'#e9e5de'):pm(o.shirt||'#4a5a7a');
 var sleeve=o.pat?pm(o.shirt):shirtM;
 var legs=[-.5,.5].map(function(x){
  var th=part(Bd,.95,1.55,.95,pants,x,3.1,0,true);
  var sh=part(th,.9,1.55,.9,pants,0,-1.55,0,true);
  var ft=new THREE.Mesh(BG,shoe);ft.scale.set(.95,.4,1.5);ft.position.set(0,-1.35,.3);ft.castShadow=true;sh.add(ft);
  return{th:th,sh:sh};
 });
 cube(Bd,2.0,2.2,1.1,shirtM,0,4.2,0);
 if(o.vest)cube(Bd,2.08,1.9,1.18,pm(o.vest),0,4.3,0);
 var arms=[-1.3,1.3].map(function(x){var a=part(Bd,.6,2.1,.65,sleeve,x,5.2,0,true);cube(a,.55,.5,.6,skinM,0,-2.1,0);return a});
 var H=new THREE.Group();H.position.set(0,5.3,0);Bd.add(H);
 cube(H,1.25,1.25,1.15,skinM,0,.625,0);
 cube(H,1.32,.42,1.22,pm(o.hair||'#2a1d16'),0,1.28,0);
 cube(H,1.32,.9,.3,pm(o.hair||'#2a1d16'),0,.85,-.48);
 if(o.long)cube(H,1.36,1.5,.28,pm(o.hair||'#2a1d16'),0,.35,-.5);
 cube(H,.17,.2,.05,pm('#1a1a1f'),-.3,.72,.59);cube(H,.17,.2,.05,pm('#1a1a1f'),.3,.72,.59);
 cube(H,.4,.07,.05,pm('#8a4a40'),0,.3,.59);
 cube(H,.12,.3,.2,skinM,-.68,.62,0);cube(H,.12,.3,.2,skinM,.68,.62,0);
 if(o.cap){cube(H,1.4,.45,1.3,pm(o.cap),0,1.4,0);cube(H,1.2,.1,.6,pm(o.cap),0,1.25,.85)}
 if(o.scarf){cube(Bd,2.1,.45,1.2,pm(o.scarf[0]),0,5.05,0);cube(Bd,.55,1.6,.1,pm(o.scarf[1]),.5,4.3,.62);cube(Bd,.55,.3,.12,pm(o.scarf[0]),.5,3.65,.62)}
 if(o.cane){var cn=new THREE.Mesh(BG,pm('#4b3a2e'));cn.scale.set(.15,3.8,.15);cn.position.set(0,-2.4,.3);cn.castShadow=true;arms[1].add(cn);cube(arms[1],.8,.15,.15,pm('#4b3a2e'),-.25,-.55,.3)}
 var hipW=0;
 if(o.sit){
  hipW=o.seat+.475*s;g.position.set(o.x,hipW-3.1*s,o.z);
  var L=Math.max(.9,Math.min(1.7,(hipW-(o.y||0))/(s*1.55)));
  legs.forEach(function(l){l.th.rotation.x=-Math.PI/2;l.sh.rotation.x=Math.PI/2;l.sh.scale.y=L});
  arms.forEach(function(a){a.rotation.x=-.7});
 }else g.position.set(o.x,o.y||0,o.z);
 g.rotation.y=o.yaw||0;
 var ph=rnd()*6,P={g:g,legs:legs,arms:arms,Bd:Bd,H:H,s:s,mode:o.anim||'idle',look:o.look==null?null:o.look,sit:!!o.sit,walk:0},hy=0;
 P.u=function(t,dt){
  if(P.walk>0)return;
  if(P.mode==='idle'||P.sit){Bd.position.y=(P.sit?0:Math.sin(t*1.5+ph)*.05);if(!P.sit){arms[0].rotation.x=Math.sin(t*1.1+ph)*.05;arms[1].rotation.x=-Math.sin(t*1.1+ph)*.05;arms[0].rotation.z=0;arms[1].rotation.z=0}}
  if(P.mode==='cheer'){var j=Math.abs(Math.sin(t*5+ph));Bd.position.y=j*.5;arms.forEach(function(a,i){a.rotation.x=-2.7+Math.sin(t*9+i)*.35;a.rotation.z=(i?1:-1)*.25})}
  if(P.look!=null){hy+=(P.look-hy)*Math.min(1,dt*2);H.rotation.y=hy}else if(hy){hy+=(0-hy)*Math.min(1,dt*2);H.rotation.y=hy}
 };
 /* stride: s = phase, k = 0..1 strength — one gait for strollers and for the player */
 P.stride=function(w,k){var sw=Math.sin(w)*.65*k;
  legs[0].th.rotation.x=sw;legs[1].th.rotation.x=-sw;legs[0].sh.rotation.x=Math.max(0,-sw)*.9;legs[1].sh.rotation.x=Math.max(0,sw)*.9;
  arms[0].rotation.x=-sw*.7;arms[1].rotation.x=sw*.7;arms[0].rotation.z=0;arms[1].rotation.z=0;Bd.position.y=Math.abs(Math.sin(w))*.14*k};
 return P;
}
function addPerson(o){
 /* in play the game supplies the named cast; a room's stand-ins step aside (rng still drawn, so the room is identical) */
 if(cur.play&&o.cast){rnd();if(o.path)rnd();return null}
 var p=person(o);cur.G.add(p.g);cur.anims.push(p.u);
 if(!o.sit&&!o.path)cur.bodies.push([o.x,o.z,.9*p.s]);
 if(o.path){
  var A=o.path[0],B=o.path[1],dx=B[0]-A[0],dz=B[1]-A[1],Ln=Math.hypot(dx,dz),spd=o.spd||2,d=rnd()*Ln*2,w=0;
  p.walk=1;
  cur.anims.push(function(t,dt){
   d=(d+dt*spd)%(2*Ln);var f=d>Ln?(2*Ln-d)/Ln:d/Ln,sg=d>Ln?-1:1;
   p.g.position.x=A[0]+dx*f;p.g.position.z=A[1]+dz*f;
   p.g.rotation.y=Math.atan2(dx*sg,dz*sg);
   w+=dt*spd*1.9;p.stride(w,1);
  });
 }
 return p;
}
var SKIN=['#e8b896','#c68a63','#a8693f','#f0c8a8','#8a5a3a'],HAIR=['#2a1d16','#5a3a22','#1b1b1f','#8a8a90','#3a2a22'],PANTS=['#2c3345','#4a4f5c','#1e2a44','#3a3f48','#5a4a44'];
function pt(c,i,d,x,y,z){var l=new THREE.PointLight(cleanNum(c),i,d,2);l.position.set(x,y,z);return l}

/* ---------- rebuild / lights ---------- */
var SCENES=window.__vxScenes=window.__vxScenes||{};
var base=null,view={mode:'fit',top:.88,bottom:-.88,side:.96,focus:null,zoom:1,viewH:null,lift:0},pointer={x:0,y:0},sw={yaw:0,pit:0};
var frameHooks=[],buildHooks=[];
function dispose(){
 if(!cur)return;
 scene.remove(cur.root);cur.root.traverse(function(o){if((o.isMesh||o.isLine)&&o.geometry&&o.geometry!==BG)o.geometry.dispose();if(o.isLight&&o.shadow&&o.shadow.map)o.shadow.map.dispose()});
 cur.mats.forEach(function(m){m.dispose()});Object.keys(DEC).forEach(function(k){DEC[k].t.dispose()});
 cur=null;
}
function rebuild(){
 dispose();
 var S=skin(st.club),night=st.time==='night';
 if(JSON.stringify(POL)!==JSON.stringify(S.policy)){POL=S.policy;LC={};pmc={};ptc={}}
 seed(1234);
 var root=new THREE.Group();scene.add(root);
 cur={b:{},S:S,night:night,G:new THREE.Group(),anims:[],L:[],mats:[],lt:[],meta:null,root:root,solids:[],bodies:[],play:!!st.play,id:st.scene};
 root.add(cur.G);
 DEC=mkDec(S);
 var fn=SCENES[st.scene];if(!fn)throw new Error('voxel room not registered: '+st.scene);
 var meta=fn(S,night);
 cur.meta=meta;
 Object.keys(cur.b).forEach(function(k){
  var B=cur.b[k];if(!B.n)return;
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(B.P,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(B.N,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(B.U,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(B.C,3));geo.setIndex(B.I);
  var m=mat(k);cur.mats.push(m);var me=new THREE.Mesh(geo,m);
  var solid=!!TILE[k]||k==='flat';
  me.castShadow=solid;me.receiveShadow=(k!=='glow'&&k!=='tv');
  root.add(me);
 });
 var ctr=new THREE.Vector3(meta.W/2,meta.H/2,meta.D/2),R=Math.hypot(meta.W,meta.H,meta.D)*.55;
 function dl(hex,inten,dir){var l=new THREE.DirectionalLight(cleanNum(hex),inten);var d=dir.clone().normalize();l.position.copy(ctr).addScaledVector(d,R*2);l.target.position.copy(ctr);root.add(l.target);
  if(Q.shadows){l.castShadow=true;l.shadow.mapSize.set(Q.shadow,Q.shadow);var c=l.shadow.camera;c.left=-R;c.right=R;c.top=R;c.bottom=-R;c.near=1;c.far=R*5;l.shadow.bias=-.0004;l.shadow.normalBias=.3}root.add(l);cur.sun=l}
 if(night){root.add(new THREE.HemisphereLight(0x3b4a7a,0x15151c,.6));dl(0x8aa0e0,.5,new THREE.Vector3(.5,1,.6))}
 else{root.add(new THREE.HemisphereLight(0xcfe3f4,0x8a7a68,.75));dl(0xffe0c0,1.05,new THREE.Vector3(-.55,1,.75))}
 cur.L.forEach(function(l){root.add(l)});
 view.focus=null;
 for(var i=0;i<buildHooks.length;i++)buildHooks[i](cur);
 fit();
 return cur;
}

/* ---------- camera ----------
 * 'fit'    — the whole room (portrait: the room's own fx window), as the lab shows it
 * 'follow' — the height is fitted between view.bottom..view.top of the glass and the camera
 *            travels along the room with view.focus (the player); a wide screen sees it all */
var AZ=.22,EL=.24;
function fwdOf(az,el){return new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el))}
function solve(pts,ctr,dir,top,bottom,side){
 var tmp=new THREE.Vector3(),dist=100,right=new THREE.Vector3(),up=new THREE.Vector3(),mid=(top+bottom)/2,half=(top-bottom)/2;
 function place(d){cam.position.copy(ctr).addScaledVector(dir,d);cam.lookAt(ctr);cam.updateMatrixWorld(true)}
 for(var pass=0;pass<4;pass++){
  var lo=5,hi=3000;
  for(var it=0;it<24;it++){var m2=(lo+hi)/2;place(m2);var ex=0;
   pts.forEach(function(p){tmp.copy(p).project(cam);ex=Math.max(ex,side?Math.abs(tmp.x)/side:0,Math.abs(tmp.y)/half)});
   if(ex>1)lo=m2;else hi=m2}
  dist=hi;place(dist);
  var a=1e9,b=-1e9,c=1e9,d=-1e9;
  pts.forEach(function(p){tmp.copy(p).project(cam);a=Math.min(a,tmp.x);b=Math.max(b,tmp.x);c=Math.min(c,tmp.y);d=Math.max(d,tmp.y)});
  right.setFromMatrixColumn(cam.matrixWorld,0);up.setFromMatrixColumn(cam.matrixWorld,1);
  var hh=Math.tan(cam.fov*Math.PI/360)*dist;
  if(side)ctr.addScaledVector(right,(a+b)/2*hh*cam.aspect);
  ctr.addScaledVector(up,(c+d)/2*hh);
 }
 /* the fitted block sits between bottom..top of the glass: slide the aim by the offset of that band */
 right.setFromMatrixColumn(cam.matrixWorld,0);up.setFromMatrixColumn(cam.matrixWorld,1);
 var hh2=Math.tan(cam.fov*Math.PI/360)*dist;
 ctr.addScaledVector(up,-mid*hh2);
 return dist;
}
function corners(x0,x1,y0,y1,z0,z1){var p=[];[x0,x1].forEach(function(x){[y0,y1].forEach(function(y){[z0,z1].forEach(function(z){p.push(new THREE.Vector3(x,y,z))})})});return p}
function fit(){
 if(!host)return;
 var r=host.stage.getBoundingClientRect(),w=Math.max(10,r.width),h=Math.max(10,r.height);
 ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
 var m=cur&&cur.meta;if(!m)return;
 var dir=fwdOf(AZ,EL),ctr,dist;
 if(view.mode==='follow'){
  var H=Math.min(m.H,view.viewH||m.viewH||m.H),half=(view.top-view.bottom)/2;
  /* 1 — height only, at the room's middle */
  ctr=new THREE.Vector3(m.W/2,(H-1)/2,m.D/2);
  dist=solve(corners(m.W/2,m.W/2,-1,H,0,m.D),ctr,dir,view.top,view.bottom,0);
  var vis=2*Math.tan(cam.fov*Math.PI/360)*dist*cam.aspect*.94;
  /* the whole room, when showing it does not shrink the people to dots — a wide screen is a stage */
  var ctrW=new THREE.Vector3(m.W/2,(H-1)/2,m.D/2),distW=solve(corners(0,m.W,-1,H,0,m.D),ctrW,dir,view.top,view.bottom,view.side);
  if(distW<=dist*1.5){
   base={ctr:ctrW,dist:distW,span:null,y:ctrW.y,z:ctrW.z};
  }else{
   base={ctr:ctr,dist:dist,span:[vis/2-1.2,m.W-vis/2+1.2],y:ctr.y,z:ctr.z,half:half};
   if(base.span[0]>base.span[1])base.span=[m.W/2,m.W/2];
   var fx=view.focus==null?m.W/2:view.focus;base.x=Math.max(base.span[0],Math.min(base.span[1],fx));
  }
 }else{
  var xs=(w/h<.9)?m.fx:[0,m.W];
  ctr=new THREE.Vector3((xs[0]+xs[1])/2,(m.H-1)/2,m.D/2);
  dist=solve(corners(xs[0],xs[1],-1,m.H,0,m.D),ctr,dir,view.top,view.bottom,view.side);
  base={ctr:ctr,dist:dist,span:(w/h<.9)?[xs[0],m.W-xs[1]]:null,pan:0};
 }
}
var T0=0,LAST=0,LTV=0,running=false,slow=0,frames=0,zc=1;
function loop(now){
 if(!running)return;
 requestAnimationFrame(loop);
 if(!cur||!cur.meta||!base)return;
 var t=(now-T0)/1000,dt=Math.min(.1,(now-LAST)/1000);LAST=now;
 var k=Math.min(1,dt*4);sw.yaw+=(pointer.x-sw.yaw)*k;sw.pit+=(pointer.y-sw.pit)*k;
 for(var h=0;h<frameHooks.length;h++)frameHooks[h](t,dt);
 var az,el,cx=base.ctr.x,cy=base.ctr.y,cz=base.ctr.z;
 if(view.mode==='follow'){
  if(base.span){var fx=view.focus==null?cur.meta.W/2:view.focus,want=Math.max(base.span[0],Math.min(base.span[1],fx));base.x+=(want-base.x)*Math.min(1,dt*3.2);
   /* the aim point slides along the room's long axis; the fitted y/z stay */
   cx=base.ctr.x+(base.x-cur.meta.W/2);
   az=AZ+((base.x-cur.meta.W/2)/Math.max(1,cur.meta.W/2))*.05+Math.sin(t*.25)*.008}
  else az=AZ+(view.focus==null?0:((view.focus-cur.meta.W/2)/Math.max(1,cur.meta.W/2))*.05)+Math.sin(t*.25)*.01;
  el=EL;
 }else{
  if(base.span){base.pan+=((pointer.x<0?pointer.x*base.span[0]:pointer.x*base.span[1])-base.pan)*Math.min(1,dt*3);cx=base.ctr.x+base.pan;az=AZ+Math.sin(t*.25)*.015}
  else az=AZ+sw.yaw*.22+Math.sin(t*.25)*.015;
  el=EL-sw.pit*.06;
 }
 zc+=((view.mode==='follow'?view.zoom:1)-zc)*Math.min(1,dt*2.6);var bd=base.dist/zc;
 if(view.mode==='follow'&&view.lift)cy+=view.lift*(zc-1);
 cam.position.set(cx+Math.sin(az)*Math.cos(el)*bd,cy+Math.sin(el)*bd,cz+Math.cos(az)*Math.cos(el)*bd);
 tgt.set(cx,cy,cz);cam.lookAt(tgt);
 for(var i=0;i<cur.anims.length;i++)cur.anims[i](t,dt);
 if(now-LTV>100){LTV=now;tvDraw(t,cur.S)}
 ren.render(scene,cam);
 /* a phone that cannot hold the picture loses the shadows before it loses the game */
 frames++;if(frames>40&&Q.auto){slow=slow*.95+(dt>.05?1:0)*.05;if(slow>.6){Q.auto=false;step()}}
}
function step(){
 if(Q.shadows){Q.shadows=false;ren.shadowMap.enabled=false;if(cur&&cur.sun)cur.sun.castShadow=false;cur&&cur.mats.forEach(function(m){m.needsUpdate=true})}
 ren.setPixelRatio(1);fit();
}

/* ---------- boot ---------- */
function loadImg(key,url){return new Promise(function(res){var im=new Image();im.onload=function(){IM[key]=im;res()};im.onerror=function(){res()};im.src=url})}
function loadArt(){var jobs=[];Object.keys(SK).forEach(function(id){var a=SK[id].art;if(!a)return;
  if(a.crest&&!IM['crest:'+id])jobs.push(loadImg('crest:'+id,a.crest));if(a.shirt&&!IM['shirt:'+id])jobs.push(loadImg('shirt:'+id,a.shirt))});return Promise.all(jobs)}
function boot(opts){
 host={canvas:opts.canvas,stage:opts.stage};
 var name=opts.quality&&QUALITY[opts.quality]?opts.quality:suggestQuality(),q=QUALITY[name];
 Q={dpr:q.dpr,shadow:q.shadow,shadows:q.shadows,aa:q.aa,name:name,auto:!opts.quality};
 ren=new THREE.WebGLRenderer({canvas:host.canvas,antialias:Q.aa,alpha:true,preserveDrawingBuffer:!!opts.capture,powerPreference:'high-performance'});
 ren.setPixelRatio(Math.min(window.devicePixelRatio||1,Q.dpr));
 ren.outputEncoding=THREE.sRGBEncoding;
 ren.toneMapping=THREE.ACESFilmicToneMapping;
 ren.shadowMap.enabled=Q.shadows;ren.shadowMap.type=THREE.PCFSoftShadowMap;
 ren.setClearColor(0x000000,0);
 MAXA=ren.capabilities.getMaxAnisotropy();
 scene=new THREE.Scene();cam=new THREE.PerspectiveCamera(20,1,1,4000);tgt=new THREE.Vector3();
 BG=new THREE.BoxGeometry(1,1,1);
 tvC=cv(128,96,function(){});tvTex=ctex(tvC);
 if(opts.pointer!==false){
  var el=opts.pointerTarget||host.stage;
  el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=((e.clientY-r.top)/r.height)*2-1});
  ['pointerleave','pointerup','pointercancel'].forEach(function(n){el.addEventListener(n,function(){pointer.x=0;pointer.y=0})});
 }
 if(window.ResizeObserver)new ResizeObserver(function(){fit()}).observe(host.stage);
 window.addEventListener('resize',fit);
 var jobs=Object.keys(TEXd).map(function(k){return loadImg(k,BASE+TEXd[k])});
 return Promise.all(jobs).then(loadArt).then(function(){T0=LAST=performance.now();running=true;requestAnimationFrame(loop);return V});
}
function stop(){running=false;dispose()}

var V=window.__vx={THREE:window.THREE,box:box,face:face,wallZ:wallZ,decal:decal,decalY:decalY,addPerson:addPerson,person:person,cube:cube,part:part,pm:pm,pt:pt,rnd:rnd,pick:pick,seed:seed,lin:lin,cv:cv,ctex:ctex,FF:FF,drawCrest:drawCrest,clean:clean,
 cur:function(){return cur},DEC:function(){return DEC},SK:SK,SKIN:SKIN,HAIR:HAIR,PANTS:PANTS,st:st,rebuild:rebuild,TILE:TILE,IM:IM,GRADE:GRADE,
 boot:boot,stop:stop,fit:fit,view:view,setSkins:setSkins,loadArt:loadArt,skin:skin,
 onFrame:function(fn){frameHooks.push(fn)},onBuild:function(fn){buildHooks.push(fn)},
 camera:function(){return cam},renderer:function(){return ren},quality:function(){return Q},base:function(){return base},
 patMat:patMat,STR:STR};
})();
