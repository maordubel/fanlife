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
 if(cur&&cur.glows&&k==='glow'&&Math.min(w,h,d)>.2&&w*h*d>.7)cur.glows.push([x+w/2,y+h/2,z+d/2,Math.max(w,h,d),o.c||'#ffd090']);
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
/* ---- display settings (admin-controlled, see display-admin.html): every visual dial in one place ---- */
var DISP={figure:'human',mirror:false,charScale:1,zoom:1,fov:20,azimuth:.22,elevation:.24,blob:true,blobOpacity:.3,faces:true,idle:true,vignette:1,grain:1,exposure:1,warmth:0,quality:'auto'};
var DKEY='life:display';
function dispLoad(){try{var s=JSON.parse(localStorage.getItem(DKEY)||'null');if(s)for(var k in s)if(k in DISP)DISP[k]=s[k]}catch(e){}
 try{var q=new URLSearchParams(location.search);for(var k2 in DISP){if(q.has('d.'+k2)){var v=q.get('d.'+k2),t=typeof DISP[k2];DISP[k2]=t==='boolean'?(v==='1'||v==='true'):t==='number'?parseFloat(v):v}}}catch(e){}}
dispLoad();
var dispHooks=[];
function dispSet(patch,persist){for(var k in patch)if(k in DISP)DISP[k]=patch[k];if(persist!==false){try{localStorage.setItem(DKEY,JSON.stringify(DISP))}catch(e){}}for(var i=0;i<dispHooks.length;i++)dispHooks[i](DISP)}
var BLOB=null;
function blobMat(){if(BLOB)return BLOB;var c=cv(64,64,function(g){var r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,'rgba(0,0,0,.9)');r.addColorStop(.55,'rgba(0,0,0,.45)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
 var t=new THREE.CanvasTexture(c);return BLOB=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,opacity:1})}
var SKINP=['#f0c8a8','#e8b896','#d79e78','#c68a63','#a8693f','#7a4a2e'];
var FRONT={noseTone:.88};
function shade(hex,f){hex=clean(hex);var r=Math.round(parseInt(hex.substr(1,2),16)*f),g=Math.round(parseInt(hex.substr(3,2),16)*f),b=Math.round(parseInt(hex.substr(5,2),16)*f);function h(n){n=Math.max(0,Math.min(255,n)).toString(16);return n.length<2?'0'+n:n}return '#'+h(r)+h(g)+h(b)}
function person(o){
 /* chibi proportions: big head, short torso, same hip height as before so seating maths is unchanged */
 var hgt=(o.h||6.6)*(DISP.charScale||1),s=hgt/6.9,g=new THREE.Group(),Bd=new THREE.Group();g.add(Bd);g.scale.setScalar(s);
 var skinC=o.skin||'#e0b08c',skinM=pm(skinC),pants=pm(o.pants||'#2c3345'),shoe=pm('#1b1b1f');
 var shirtM=o.pat?patMat(o.pat,o.shirt,o.shirt2||'#e9e5de'):pm(o.shirt||'#4a5a7a');
 var sleeve=o.pat?pm(o.shirt):shirtM;
 var hairC=o.hair||'#2a1d16',hairM=pm(hairC);
 var hsh=Math.abs(Math.floor((o.x||0)*13.7+(o.z||0)*7.3+(o.h||6)*3.1+(o.yaw||0)*5.9));
 var style=o.style!=null?o.style:(o.long?9:hsh%5);
 var legs=[-.5,.5].map(function(x){
  var th=part(Bd,.95,1.55,.95,pants,x,3.1,0,true);
  var sh=part(th,.9,1.55,.9,pants,0,-1.55,0,true);
  var ft=new THREE.Mesh(BG,shoe);ft.scale.set(.95,.4,1.5);ft.position.set(0,-1.35,.3);ft.castShadow=true;sh.add(ft);
  return{th:th,sh:sh};
 });
 var torso=new THREE.Group();torso.position.set(0,3.1,0);Bd.add(torso);
 cube(torso,2.0,1.9,1.1,shirtM,0,.95,0);
 cube(torso,2.04,.14,1.14,pm(shade(o.shirt||'#4a5a7a',.78)),0,.07,0);/* hem */
 if(o.vest)cube(torso,2.08,1.6,1.18,pm(o.vest),0,1.05,0);
 var arms=[-1.3,1.3].map(function(x){var a=part(Bd,.6,1.9,.65,sleeve,x,4.85,0,true);cube(a,.55,.45,.6,skinM,0,-1.9,0);return a});
 var H=new THREE.Group();H.position.set(0,5.0,0);Bd.add(H);
 var HW=1.78,HH=1.62,HD=1.52;
 cube(H,.5,.3,.5,skinM,0,-.05,0);/* neck */
 cube(H,HW,HH,HD,skinM,0,HH/2,0);
 /* hair — five styles + long, picked from where the person stands so rooms stay deterministic */
 var hasCap=!!o.cap,bald=(hairC==='#8a8a90'&&style%2===0);
 if(!hasCap){
  if(bald){cube(H,HW+.06,.2,HD+.06,hairM,0,HH+.02,0)}
  else{
   cube(H,HW+.08,.42,HD+.08,hairM,0,HH-.05,0);
   cube(H,HW+.08,1.0,.32,hairM,0,HH-.55,-HD/2-.02);
   if(style===1){cube(H,.9,.3,.4,hairM,-.35,HH+.28,.35);cube(H,.5,.5,.5,hairM,-.5,HH-.2,.5)}
   else if(style===2){[-.55,0,.55].forEach(function(x,i){cube(H,.62,.5,.62,hairM,x,HH+.3,(i%2?.1:-.1))});cube(H,.4,.7,.4,hairM,-.95,HH-.45,0);cube(H,.4,.7,.4,hairM,.95,HH-.45,0)}
   else if(style===3){cube(H,.7,.7,.7,hairM,0,HH+.35,-.45);cube(H,HW+.1,.5,.3,hairM,0,HH-.35,.62)}
   else if(style===4){cube(H,HW+.1,.3,HD+.1,hairM,0,HH+.1,0)}
   else if(style===9){cube(H,HW+.12,1.9,.34,hairM,0,HH-.8,-HD/2-.04);cube(H,.3,1.1,.9,hairM,-HW/2-.04,HH-.6,-.1);cube(H,.3,1.1,.9,hairM,HW/2+.04,HH-.6,-.1);cube(H,HW,.3,.34,hairM,0,HH-.1,HD/2+.02)}
   else cube(H,HW+.08,.34,.36,hairM,0,HH-.2,HD/2+.02);
  }
 }
 /* face: whites + pupils + brows + cheeks + mouth parts, all addressable for mood and blink */
 var FZ=HD/2+.01,white=pm('#f6f3ee'),ink=pm('#1a1a1f'),browM=pm(shade(hairC,.8)),blush=pm(shade('#e89a8a',1));
 var eyes=[-1,1].map(function(sx){var e=new THREE.Group();e.position.set(sx*.42,.86,FZ);H.add(e);
  var w=new THREE.Mesh(BG,white);w.scale.set(.44,.46,.06);e.add(w);
  var p=new THREE.Mesh(BG,ink);p.scale.set(.24,.32,.06);p.position.set(0,-.02,.04);e.add(p);
  var gl=new THREE.Mesh(BG,white);gl.scale.set(.08,.08,.06);gl.position.set(.05,.07,.08);e.add(gl);
  var br=new THREE.Mesh(BG,browM);br.scale.set(.5,.09,.07);br.position.set(0,.4,.01);e.add(br);
  return{g:e,w:w,p:p,br:br,sx:sx}});
 [-1,1].forEach(function(sx){var c=new THREE.Mesh(BG,blush);c.scale.set(.3,.15,.05);c.position.set(sx*.68,.5,FZ);c.material=blush;H.add(c)});
 cube(H,.14,.2,.1,pm(shade(skinC,.88)),0,.62,FZ+.03);/* nose */
 var mo=new THREE.Group();mo.position.set(0,.34,FZ);H.add(mo);
 var mouthM=pm('#6a2f2f'),mid=new THREE.Mesh(BG,mouthM),ml=new THREE.Mesh(BG,mouthM),mr=new THREE.Mesh(BG,mouthM),open=new THREE.Mesh(BG,pm('#3a1a1c'));
 mid.scale.set(.4,.08,.06);ml.scale.set(.09,.09,.06);mr.scale.set(.09,.09,.06);open.scale.set(.42,.28,.06);mo.add(mid);mo.add(ml);mo.add(mr);mo.add(open);
 [mid,ml,mr,open].forEach(function(m){m.castShadow=false});
 cube(H,.14,.34,.22,skinM,-HW/2-.06,.62,0);cube(H,.14,.34,.22,skinM,HW/2+.06,.62,0);
 if(o.cap){cube(H,HW+.1,.5,HD+.1,pm(o.cap),0,HH+.05,0);cube(H,1.3,.12,.7,pm(o.cap),0,HH-.2,HD/2+.35)}
 if(o.scarf){cube(Bd,2.1,.45,1.2,pm(o.scarf[0]),0,4.85,0);cube(Bd,.55,1.5,.1,pm(o.scarf[1]),.5,4.1,.62);cube(Bd,.55,.3,.12,pm(o.scarf[0]),.5,3.5,.62)}
 if(o.cane){var cn=new THREE.Mesh(BG,pm('#4b3a2e'));cn.scale.set(.15,3.8,.15);cn.position.set(0,-2.4,.3);cn.castShadow=true;arms[1].add(cn);cube(arms[1],.8,.15,.15,pm('#4b3a2e'),-.25,-.55,.3)}
 var hipW=0,floor=0;
 if(o.sit){
  hipW=o.seat+.475*s;g.position.set(o.x,hipW-3.1*s,o.z);
  var L=Math.max(.9,Math.min(1.7,(hipW-(o.y||0))/(s*1.55)));
  legs.forEach(function(l){l.th.rotation.x=-Math.PI/2;l.sh.rotation.x=Math.PI/2;l.sh.scale.y=L});
  arms.forEach(function(a){a.rotation.x=-.7});
  floor=-(hipW-3.1*s-(o.y||0))/s;
 }else g.position.set(o.x,o.y||0,o.z);
 /* soft contact shadow — reads as grounding on every quality tier, even with real shadows off */
 var blob=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.6),blobMat());blob.rotation.x=-Math.PI/2;blob.position.set(0,floor+.04,0);blob.renderOrder=2;blob.visible=!!DISP.blob;blob.material=blobMat();g.add(blob);
 g.rotation.y=o.yaw||0;
 var ph=(hsh%97)/16,P={g:g,legs:legs,arms:arms,Bd:Bd,H:H,s:s,mode:o.anim||'idle',look:o.look==null?null:o.look,sit:!!o.sit,walk:0,mood:o.mood||'neutral',blob:blob},hy=0,lastMood=null,nextBlink=1.5+ph%3.2,blinkT=-1,bw=0;
 function applyMood(m){
  var up=0,dn=0,op=0,br=0,sq=1;
  if(m==='happy'||m==='cheer'){up=1;br=.06}else if(m==='sad'){dn=1;br=-.08}else if(m==='angry'){br=-.1;dn=.4}else if(m==='tense'){br=.08}else if(m==='open'){op=1;up=.4;br=.1}
  if(m==='cheer')op=1;
  mid.visible=!op;open.visible=!!op;
  ml.visible=mr.visible=!!(up||dn);
  ml.position.set(-.26,up?.07:dn?-.06:0,0);mr.position.set(.26,up?.07:dn?-.06:0,0);
  if(up&&!op)mid.scale.x=.44;else mid.scale.x=.4;
  eyes.forEach(function(e){e.br.position.y=.4+br;e.br.rotation.z=(m==='angry'?1:m==='sad'?-1:0)*e.sx*.35});
 }
 P.setMood=function(m){P.mood=m};
 P.u=function(t,dt){
  blob.visible=!!DISP.blob;if(DISP.blob)blob.material.opacity=DISP.blobOpacity;
  if(P.mood!==lastMood){lastMood=P.mood;applyMood(P.mood)}
  if(DISP.faces){
   /* blink */
   if(blinkT<0&&t>nextBlink){blinkT=t}
   var by=1;if(blinkT>=0){var q=(t-blinkT)/.14;if(q>=1){blinkT=-1;nextBlink=t+2.2+((hsh*7+Math.floor(t))%30)/10}else by=Math.max(.12,Math.abs(q*2-1))}
   eyes.forEach(function(e){e.w.scale.y=.46*by;e.p.scale.y=.32*by;e.p.visible=by>.3});
   /* pupils follow the head's look, with a little life of their own */
   var gx=(P.look==null?Math.sin(t*.7+ph)*.35:Math.max(-.8,Math.min(.8,hy*.7)));
   eyes.forEach(function(e){e.p.position.x=gx*.09})
  }
  if(P.walk>0)return;
  if(P.mode==='idle'||P.sit){
   var br2=DISP.idle?Math.sin(t*1.6+ph):0;
   Bd.position.y=(P.sit?0:br2*.04);torso.scale.y=1+br2*.018;
   if(!P.sit){arms[0].rotation.x=Math.sin(t*1.1+ph)*.05;arms[1].rotation.x=-Math.sin(t*1.1+ph)*.05;arms[0].rotation.z=0;arms[1].rotation.z=0;
    if(DISP.idle){Bd.rotation.z=Math.sin(t*.45+ph)*.012;/* weight shifts from foot to foot */}}
   if(DISP.idle)H.rotation.z=Math.sin(t*.6+ph)*.025;
  }
  if(P.mode==='cheer'){var j=Math.abs(Math.sin(t*5+ph));Bd.position.y=j*.5;arms.forEach(function(a,i){a.rotation.x=-2.7+Math.sin(t*9+i)*.35;a.rotation.z=(i?1:-1)*.25});if(P.mood==='neutral')P.mood='cheer'}
  if(P.mode==='sad'){Bd.position.y=-.12;H.rotation.x=.22;arms.forEach(function(a){a.rotation.x=.08;a.rotation.z=0});if(P.mood==='neutral')P.mood='sad'}
  else if(P.mode!=='sad'&&H.rotation.x)H.rotation.x*=.85;
  if(P.look!=null){hy+=(P.look-hy)*Math.min(1,dt*2);H.rotation.y=hy}else if(hy){hy+=(0-hy)*Math.min(1,dt*2);H.rotation.y=hy}
 };
 /* stride: s = phase, k = 0..1 strength — one gait for strollers and for the player */
 P.stride=function(w,k){var sw=Math.sin(w)*.65*k;
  legs[0].th.rotation.x=sw;legs[1].th.rotation.x=-sw;legs[0].sh.rotation.x=Math.max(0,-sw)*.9;legs[1].sh.rotation.x=Math.max(0,sw)*.9;
  arms[0].rotation.x=-sw*.7;arms[1].rotation.x=sw*.7;arms[0].rotation.z=0;arms[1].rotation.z=0;Bd.position.y=Math.abs(Math.sin(w))*.14*k;Bd.rotation.z=Math.sin(w)*.03*k;torso.scale.y=1;H.rotation.z=0};
 applyMood(P.mood);
 return P;
}
/* ---------- human figure v2: painted head on all sides, builds, garments, skin with life ---------- */
var FT={},FABT={},HAIRT={},SKT={},HT={};
function nrm(t){t.encoding=THREE.sRGBEncoding;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t}
function hexRgb(h){h=clean(h);return[parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}
function mixc(a,b,t){return'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')'}
function lcg(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function fabMat(hex,kind){
 hex=clean(hex);var key=hex+(kind||'');if(FABT[key])return FABT[key];
 var c=hexRgb(hex),N=16,r=lcg(1234),cn=cv(N,N,function(g){
  for(var y=0;y<N;y++){var sh=1.06-y/N*.22;for(var x=0;x<N;x++){var n=1+(r()-.5)*.07;if(kind==='denim'&&(x+y)%4===0)n*=.94;if(kind==='knit'&&(x%2===y%2))n*=.95;if(kind==='jersey'&&y%3===0)n*=.965;
   var v=sh*n;g.fillStyle='rgb('+Math.min(255,Math.round(c[0]*v))+','+Math.min(255,Math.round(c[1]*v))+','+Math.min(255,Math.round(c[2]*v))+')';g.fillRect(x,y,1,1)}}
  g.fillStyle='rgba(0,0,0,.07)';g.fillRect(5,3,1,10);g.fillRect(11,5,1,8)});
 return FABT[key]=new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(cn)),roughness:.95,metalness:0});
}
function hairMat(hex){
 hex=clean(hex);if(HAIRT[hex])return HAIRT[hex];var c=hexRgb(hex),N=12,r=lcg(777),cn=cv(N,N,function(g){
  for(var x=0;x<N;x++){var col=.78+r()*.4;for(var y=0;y<N;y++){var v=col*(.92+r()*.16)*(1.08-y/N*.16);g.fillStyle='rgb('+Math.min(255,Math.round(c[0]*v))+','+Math.min(255,Math.round(c[1]*v))+','+Math.min(255,Math.round(c[2]*v))+')';g.fillRect(x,y,1,1)}}});
 return HAIRT[hex]=new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(cn)),roughness:.8,metalness:0});
}
/* skin that is not one flat colour: pores of variation, warmer in the middle, cooler at the edges */
function skinMat(hex){
 hex=clean(hex);if(SKT[hex])return SKT[hex];var c=hexRgb(hex),N=12,r=lcg(4242),cn=cv(N,N,function(g){
  for(var y=0;y<N;y++)for(var x=0;x<N;x++){var v=1+(r()-.5)*.06+(y<3?.025:0);g.fillStyle='rgb('+Math.min(255,Math.round(c[0]*v*1.01))+','+Math.min(255,Math.round(c[1]*v))+','+Math.min(255,Math.round(c[2]*v*.99))+')';g.fillRect(x,y,1,1)}});
 return SKT[hex]=new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(cn)),roughness:.85,metalness:0});
}
function hpx(g,x,y,w,h,hex,r){var c=hexRgb(hex);for(var i=0;i<w;i++){var col=.78+r()*.42;for(var j=0;j<h;j++){var v=col*(.92+r()*.16);g.fillStyle='rgb('+Math.min(255,Math.round(c[0]*v))+','+Math.min(255,Math.round(c[1]*v))+','+Math.min(255,Math.round(c[2]*v))+')';g.fillRect(x+i,y+j,1,1)}}}
/* hair outlines per style: rows of fringe, side-curtain depth, back depth */
var HS={0:{f:4,side:7,back:21},1:{f:5,side:7,back:20},2:{f:6,side:9,back:22},3:{f:3,side:6,back:12},4:{f:2,side:5,back:17},9:{f:5,side:20,back:31},bald:{f:0,side:5,back:12},cap:{f:0,side:2,back:8}};
function hsOf(P){return P.bald?HS.bald:(P.cap?HS.cap:(HS[P.hstyle]||HS[0]))}
function headSides(P){
 var key='H'+[P.skin,P.age,P.hstyle,P.bald?1:0,P.cap?1:0,P.hair,P.beard].join('|');if(HT[key])return HT[key];
 var sk=hexRgb(P.skin),hs=hsOf(P),r=lcg(55),shade=mixc(sk,[50,25,22],.18);
 function skinFill(g,w,h){for(var y=0;y<h;y++){g.fillStyle=y<5?mixc(sk,[255,240,222],.06):'rgb('+sk.join(',')+')';g.fillRect(0,y,w,1)}g.fillStyle=mixc(sk,[40,20,18],.22);g.fillRect(0,h-1,w,1)}
 var sideC=cv(27,31,function(g){skinFill(g,27,31);
  /* ear: rim, inner fold, lobe */
  g.fillStyle=mixc(sk,[110,55,50],.25);g.fillRect(12,12,5,8);g.fillStyle=mixc(sk,[255,215,195],.1);g.fillRect(13,13,3,6);g.fillStyle=mixc(sk,[90,40,36],.35);g.fillRect(14,14,1,4);g.fillRect(13,17,2,1);g.fillStyle='rgb('+sk.join(',')+')';g.fillRect(13,19,3,2);
  /* temple + cheek shading, jaw line */
  g.fillStyle=mixc(sk,[255,235,215],.08);g.fillRect(20,8,6,8);g.fillStyle=mixc(sk,[40,20,18],.14);g.fillRect(0,22,27,2);g.fillRect(18,24,9,7);
  if(P.beard==='full'){g.fillStyle='rgba(42,34,30,.9)';g.fillRect(8,20,19,11)}else if(P.beard==='stubble'){for(var i=0;i<60;i++)g.fillRect(8+Math.floor(r()*19),21+Math.floor(r()*9),1,1)}
  if(!P.cap||true){hpx(g,0,0,27,hs.side,P.hair,r);hpx(g,0,hs.side,hs.back>hs.side?9:0,Math.max(0,hs.back-hs.side),P.hair,r);if(P.hstyle!==9)hpx(g,19,hs.side-1,5,2,P.hair,r);/* sideburn */}
  if(P.hstyle===9){hpx(g,0,0,13,31,P.hair,r)}
  if(P.bald){g.clearRect(0,0,27,hs.side);skinFill(g,27,hs.side);g.fillStyle=mixc(sk,[255,245,225],.2);g.fillRect(2,1,25,3);hpx(g,0,4,9,8,P.hair,r)}
  if(P.age==='elder'){g.fillStyle=mixc(sk,[0,0,0],.08);g.fillRect(20,12,5,1);g.fillRect(21,13,3,1)}
 });
 var backC=cv(28,31,function(g){skinFill(g,28,31);var nape=mixc(sk,[30,18,16],.16);g.fillStyle=nape;g.fillRect(5,24,18,7);
  hpx(g,0,0,28,hs.back,P.hair,r);if(P.bald||P.cap){g.clearRect(0,0,28,hs.back);skinFill(g,28,31);g.fillStyle=nape;g.fillRect(5,24,18,7);hpx(g,0,6,28,Math.max(0,hs.back-6),P.hair,r);if(P.cap){g.fillStyle='rgba(0,0,0,0)'}}
  g.fillStyle='rgba(0,0,0,.1)';g.fillRect(0,hs.back-1,28,1)});
 var topC=cv(28,27,function(g){hpx(g,0,0,28,27,P.hair,new lcg(9));if(P.bald){g.fillStyle=mixc(sk,[255,240,220],.12);g.fillRect(4,4,20,19);hpx(g,0,0,28,4,P.hair,r);hpx(g,0,23,28,4,P.hair,r);for(var i=0;i<14;i++){g.fillStyle=mixc(sk,[200,190,180],.35);g.fillRect(6+Math.floor(r()*16),6+Math.floor(r()*15),1,1)}}
  if(P.hstyle!==9&&!P.bald&&!P.cap){/* parting */g.fillStyle='rgba(0,0,0,.28)';g.fillRect(P.hstyle===1?9:13,0,1,14)}});
 var sm=skinMat(P.skin);
 var flipC=cv(27,31,function(g){g.translate(27,0);g.scale(-1,1);g.drawImage(sideC,0,0)});var side=new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(sideC)),roughness:.88}),sideR=new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(flipC)),roughness:.88});
 var m={px:sideR,nx:side,py:new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(topC)),roughness:.85}),ny:sm,pz:sm,nz:new THREE.MeshStandardMaterial({map:nrm(new THREE.CanvasTexture(backC)),roughness:.88})};
 return HT[key]=[m.px,m.nx,m.py,m.ny,m.pz,m.nz];
}
function faceTex(P){
 var key=[P.skin,P.age,P.mood,P.blink?1:0,P.gaze,P.female?1:0,P.beard,P.glasses?1:0,P.brow,P.iris,P.hair,P.hstyle,P.bald?1:0,P.cap?1:0].join('|');
 if(FT[key])return FT[key];
 var W=28,H=31,sk=hexRgb(P.skin),hi=mixc(sk,[255,236,214],.2),lo=mixc(sk,[60,30,25],.2),mid='rgb('+sk.join(',')+')',deep=mixc(sk,[70,30,28],.38),lipc=mixc(sk,P.female?[170,50,60]:[150,70,66],.55),r=lcg(31);
 var c=cv(W,H,function(g){
  function px(x,y,w,h,f){g.fillStyle=f;g.fillRect(x,y,w||1,h||1)}
  for(var y=0;y<H;y++){var f=y<7?hi:mixc(sk,[255,240,220],.03);px(0,y,W,1,y>23?mixc(sk,[40,20,18],(y-23)/8*.3):f)}
  /* roundness: darker temples/jaw edges, warm centre */
  for(var e=0;e<3;e++){var a=.2-e*.06;px(e,0,1,H,'rgba(70,35,30,'+a+')');px(W-1-e,0,1,H,'rgba(70,35,30,'+a+')')}
  px(0,H-1,W,1,deep);px(0,H-2,W,1,mixc(sk,[40,20,18],.15));
  px(4,22,2,6,'rgba(70,35,30,.07)');px(22,22,2,6,'rgba(70,35,30,.07)');
  var bl=mixc(sk,[220,110,100],.26);px(3,17,5,2,bl);px(20,17,5,2,bl);
  /* nose: bridge, wings, tip, nostrils, philtrum */
  px(13,11,2,7,mixc(sk,[255,235,215],.08));px(12,12,1,6,mixc(sk,[60,30,25],.1));px(15,12,1,6,mixc(sk,[60,30,25],.06));px(11,18,6,1,deep);px(12,19,1,1,deep);px(15,19,1,1,deep);px(13,17,2,1,hi);px(13,20,2,2,mixc(sk,[60,30,25],.07));
  var br=hexRgb(P.brow),brc='rgb('+br.join(',')+')',ir=hexRgb(P.iris),irc='rgb('+ir.join(',')+')';
  function eye(x0,sx){
   var ey=11,gz=P.gaze;
   px(x0-1,ey+4,8,1,mixc(sk,[120,60,60],.16));/* under-eye shade */
   if(P.blink){px(x0,ey+1,7,1,mixc(sk,[20,12,12],.55));px(x0+1,ey+2,5,1,deep);return}
   px(x0,ey,7,4,'#ece8e0');px(x0,ey,7,1,mixc(sk,[30,16,16],.55));px(x0,ey-1,7,1,mixc(sk,[90,45,40],.25));/* lid + crease */
   var ix=x0+2+gz;px(ix,ey,3,4,irc);px(ix+1,ey+1,1,2,'#0e0e12');px(ix,ey+3,3,1,mixc(ir,[0,0,0],.4));px(ix,ey,1,1,'rgba(255,255,255,.8)');
   px(x0,ey+4,7,1,mixc(sk,[200,120,110],.18));
   if(P.female){px(x0-(sx<0?1:0),ey-1,8,1,'#1a1418');px(sx<0?x0-1:x0+7,ey,1,1,'#1a1418')}
  }
  eye(4,-1);eye(17,1);
  var bt=P.mood,by=8,up=(bt==='open'||bt==='cheer')?-1:0;
  function brow(x0,sx){for(var i=0;i<8;i++){var yy=by+up;if(bt==='angry')yy=by+(sx<0?Math.round(i*.4)-1:Math.round((7-i)*.4)-1);if(bt==='sad')yy=by+(sx<0?Math.round((7-i)*.35):Math.round(i*.35))-1;px(x0+i,yy,1,P.female?1:2,brc)}}
  brow(3,-1);brow(17,1);
  var mx=9,my=24,m=P.mood;
  px(mx-1,my-2,12,1,mixc(sk,[255,235,215],.1));/* upper-lip highlight */
  if(m==='open'||m==='cheer'){px(mx,my-1,10,1,lipc);px(mx+1,my,8,3,'#40181c');px(mx+2,my,6,1,'#f2eee8');px(mx+3,my+2,4,1,'#b0485a');px(mx,my+3,10,1,lipc)}
  else if(m==='happy'){px(mx+1,my,8,1,lipc);px(mx,my-1,1,1,lipc);px(mx+9,my-1,1,1,lipc);px(mx+2,my+1,6,1,mixc(sk,[170,60,60],.5));px(mx+3,my,4,1,'#efe9e1')}
  else if(m==='sad'){px(mx+1,my,8,1,lipc);px(mx,my+1,1,1,lipc);px(mx+9,my+1,1,1,lipc);px(mx+3,my+1,4,1,deep)}
  else if(m==='angry'){px(mx,my,10,1,deep);px(mx+1,my+1,8,1,lipc)}
  else if(m==='tense'){px(mx+1,my,8,1,deep);px(mx+2,my+1,6,1,lipc)}
  else{px(mx,my,10,1,deep);px(mx+1,my+1,8,1,lipc)}
  if(P.female)px(mx+1,my-1,8,1,lipc);
  px(12,my+3,4,1,mixc(sk,[60,30,25],.06));/* chin shade */
  if(P.beard==='stubble'){for(var i=0;i<130;i++){var x=2+Math.floor(r()*24),y=19+Math.floor(r()*11);if((y<22&&(x<6||x>21))||y>=22)px(x,y,1,1,'rgba(30,25,22,.4)')}}
  if(P.beard==='full'){px(2,20,24,11,'rgba(42,34,30,.9)');px(mx-1,my-1,12,4,deep);px(mx,my,10,1,lipc)}
  if(P.age==='elder'){px(5,4,18,1,mixc(sk,[0,0,0],.09));px(6,5,16,1,mixc(sk,[0,0,0],.06));px(2,13,3,1,deep);px(23,13,3,1,deep);px(7,20,1,4,deep);px(20,20,1,4,deep);px(11,15,1,1,deep);px(16,15,1,1,deep)}
  else if(P.age==='adult'){px(7,20,1,3,mixc(sk,[0,0,0],.09));px(20,20,1,3,mixc(sk,[0,0,0],.09))}
  if(P.age==='child'||P.age==='teen'){px(7,15,1,1,deep);px(10,16,1,1,deep);px(20,15,1,1,deep);px(17,16,1,1,deep)}
  /* hairline: fringe painted over the forehead in the style's own shape */
  var hs=hsOf(P);
  if(!P.cap&&!P.bald){var rr=lcg(9);hpx(g,0,0,W,hs.f,P.hair,rr);
   if(P.hstyle===1){hpx(g,0,hs.f,14,2,P.hair,rr);px(14,hs.f,1,2,'rgba(0,0,0,.25)')}
   if(P.hstyle===2){for(var x=0;x<W;x+=3)hpx(g,x,hs.f,2,1+(x%2),P.hair,rr)}
   if(P.hstyle===9){hpx(g,0,0,4,24,P.hair,rr);hpx(g,W-4,0,4,24,P.hair,rr);hpx(g,0,0,W,5,P.hair,rr)}
   else{hpx(g,0,0,2,hs.f+4,P.hair,rr);hpx(g,W-2,0,2,hs.f+4,P.hair,rr)}
   if(P.hstyle===0||P.hstyle===4)px(0,hs.f,W,1,'rgba(0,0,0,.18)')}
  if(P.bald){var rr2=lcg(5);hpx(g,0,0,3,10,P.hair,rr2);hpx(g,W-3,0,3,10,P.hair,rr2);px(3,0,W-6,2,mixc(sk,[255,240,222],.2))}
  if(P.cap){px(0,0,W,6,'rgba(0,0,0,.35)')}
  if(P.glasses){var gc='#1b1b22';px(2,10,11,1,gc);px(2,16,11,1,gc);px(2,10,1,7,gc);px(12,10,1,7,gc);px(15,10,11,1,gc);px(15,16,11,1,gc);px(15,10,1,7,gc);px(25,10,1,7,gc);px(13,11,2,1,gc);px(0,11,2,1,gc);px(26,11,2,1,gc);px(3,11,9,5,'rgba(255,255,255,.07)')}
 });
 return FT[key]=nrm(new THREE.CanvasTexture(c));
}
var BUILDS={lean:{w:.94,belly:0},average:{w:1,belly:0},broad:{w:1.08,belly:0},heavy:{w:1.1,belly:.38}};
function shoeSet(kind,col,sole){
 /* kind: sneaker | boot | loafer */
 return{kind:kind,col:fabMat(col,'knit'),sole:sole};
}
function personHuman(o){
 var hgt=(o.h||6.6)*(DISP.charScale||1),s=hgt/7.25,g=new THREE.Group(),Bd=new THREE.Group();g.add(Bd);g.scale.setScalar(s);
 var hsh=Math.abs(Math.floor((o.x||0)*13.7+(o.z||0)*7.3+(o.h||6)*3.1+(o.yaw||0)*5.9));
 var skinC=o.skin||'#e0b08c',skinM=skinMat(skinC),hairC=o.hair||'#2a1d16';
 var age=o.age||((o.h||6.6)<5.0?'child':(o.h||6.6)<5.9?'teen':(hairC==='#8a8a90'||o.cane)?'elder':'adult');
 var female=o.female!=null?o.female:(o.long?true:(hsh%3===0&&age!=='child'));
 var style=o.style!=null?o.style:(o.long?9:hsh%5);
 var beard=o.beard||((age==='adult'||age==='elder')&&!female&&hsh%4===1?(hsh%8===1?'full':'stubble'):'none');
 var glasses=o.glasses!=null?o.glasses:(age!=='child'&&hsh%7===2);
 var irisC=['#4a3a2a','#3a5a7a','#3d6a4a','#2a2220'][hsh%4];
 var build=BUILDS[o.build||(age==='elder'?(hsh%2?'average':'heavy'):age==='child'?'lean':['average','lean','broad','heavy'][(hsh>>2)%4])];
 var S=(cur&&cur.S)||null,shirtC=o.shirt||'#4a5a7a';
 var fan=!!(S&&shirtC===S.p&&!o.vest),garment=o.garment||(fan?'jersey':(age==='elder'&&hsh%2===0)?'cardigan':(hsh%5===0?'hoodie':(hsh%5===1?'polo':'tee')));
 var shortSleeve=(garment==='jersey'||garment==='tee'||garment==='polo')&&age!=='elder';
 var shirtM=o.pat?patMat(o.pat,shirtC,o.shirt2||'#e9e5de'):fabMat(shirtC,garment==='jersey'?'jersey':'knit');
 var sleeve=o.pat?fabMat(shirtC,'knit'):shirtM,pantsC=o.pants||'#2c3345',pantsM=fabMat(pantsC,'denim'),belt=pm('#1c1a1a');
 var shoeKind=age==='elder'?'loafer':(hsh%3===0?'boot':'sneaker'),shoeCol=shoeKind==='loafer'?'#3a2a22':shoeKind==='boot'?'#4a3626':['#e9e5de','#24262c','#8a2e2e','#3a5a8a'][hsh%4];
 var shoe=fabMat(shoeCol,'knit'),sole=pm(shoeKind==='sneaker'?'#f0ece3':'#1c1a1a');
 var hairM=hairMat(hairC),headK=age==='child'?1.2:age==='teen'?1.07:1;
 var legs=[-.5,.5].map(function(x){
  var th=part(Bd,.98,1.55,.98,pantsM,x,3.1,0,true),sh=part(th,.86,1.55,.86,pantsM,0,-1.55,0,true);
  cube(sh,.9,.1,.9,pm(shadeP(pantsC,.8)),0,-1.45,0);/* hem */
  var h=shoeKind==='boot'?.6:.36;var ft=new THREE.Mesh(BG,shoe);ft.scale.set(.92,h,1.5);ft.position.set(0,-1.55+h/2+.1,.3);ft.castShadow=true;sh.add(ft);
  if(shoeKind==='sneaker'){var tc=new THREE.Mesh(BG,sole);tc.scale.set(.9,.2,.5);tc.position.set(0,-1.55+.2,.88);sh.add(tc)}
  var sl=new THREE.Mesh(BG,sole);sl.scale.set(.96,.1,1.55);sl.position.set(0,-1.55+.05,.3);sh.add(sl);
  return{th:th,sh:sh};
 });
 var torso=new THREE.Group();torso.position.set(0,3.1,0);Bd.add(torso);
 var bw=build.w;
 cube(torso,1.96*bw,.5,1.04+build.belly*.3,pantsM,0,.25,0);cube(torso,2.0*bw,.12,1.08+build.belly*.3,belt,0,.56,0);cube(torso,.2,.12,.1,pm('#b9b3a6'),0,.56,.56+build.belly*.15);
 var waistW=(female?1.7:1.9)*bw;
 cube(torso,waistW,.9,1.0+build.belly,shirtM,0,1.06,build.belly*.5);
 cube(torso,((female?1.7:1.9)+(female?1.9:2.04))/2*bw,.34,1.05+build.belly*.3,shirtM,0,1.6,build.belly*.15);
 cube(torso,(female?1.9:2.04)*bw,1.0,1.1,shirtM,0,2.0,0);
 cube(torso,(female?1.76:2.0)*bw,.14,1.04,shirtM,0,2.5,0);
 /* neckline by garment */
 var dk=pm(shadeP(shirtC,.78));
 if(garment==='polo'||garment==='jersey'){cube(torso,.8,.16,.52,dk,0,2.54,.36);cube(torso,.28,.5,.06,pm(shadeP(shirtC,.7)),0,2.28,.56);if(garment==='polo')[0,1].forEach(function(i){cube(torso,.05,.05,.04,pm('#ddd7cc'),0,2.3+i*.14,.6)})}
 else if(garment==='hoodie'){cube(torso,1.2,.5,.5,fabMat(shirtC,'knit'),0,2.55,-.55);cube(torso,.5,.28,.06,dk,0,1.5,.6+build.belly*.5);cube(torso,.04,.7,.04,pm('#ddd7cc'),-.2,2.2,.57);cube(torso,.04,.7,.04,pm('#ddd7cc'),.2,2.2,.57)}
 else if(garment==='cardigan'){cube(torso,.1,1.9,.06,dk,0,1.6,.56+build.belly*.4);[0,1,2,3].forEach(function(i){cube(torso,.07,.07,.04,pm('#c9b89a'),.12,1.0+i*.38,.6+build.belly*.4)});cube(torso,.8,.14,.5,pm('#efe9de'),0,2.56,.34)}
 else{cube(torso,.7,.14,.5,dk,0,2.54,.36)}/* tee crew */
 if(o.vest)cube(torso,2.08*bw,1.7,1.16,fabMat(o.vest,'knit'),0,1.5,0);
 /* fan shirts carry the club's printed crest or monogram */
 if(fan&&S){var cc=cv(32,32,function(g){V.drawCrest(g,2,2,28,S)});var ct=new THREE.Mesh(new THREE.PlaneGeometry(.52,.52),new THREE.MeshStandardMaterial({map:ctex(cc),transparent:true,roughness:.9}));ct.position.set(female?.48:.5,1.95,.553);torso.add(ct)}
 var arms=[-1.34,1.34].map(function(x,i){var a=part(Bd,.62*bw,1.05,.68,sleeve,x*bw,5.18,0,true);
  var forearmM=shortSleeve?skinM:sleeve;
  var fa=part(a,.56,1.05,.62,forearmM,0,-1.05,0,true);fa.rotation.x=-.12;
  if(shortSleeve)cube(a,.66*bw,.14,.72,pm(shadeP(shirtC,.84)),0,-.96,0);else cube(fa,.6,.14,.66,pm(shadeP(shirtC,.82)),0,-.95,0);
  cube(fa,.5,.36,.44,skinM,0,-1.18,.02);/* palm */
  cube(fa,.46,.3,.32,skinM,0,-1.46,.12);/* fingers */
  cube(fa,.46,.04,.34,pm(shadeP(skinC,.75)),0,-1.4,.12);/* knuckle line */
  cube(fa,.13,.34,.2,skinM,(i?-1:1)*.3,-1.12,.14);/* thumb */
  a.fa=fa;return a});
 var H=new THREE.Group();H.position.set(0,5.38,0);H.scale.setScalar(headK);Bd.add(H);
 cube(H,.62,.42,.62,skinM,0,.05,0);cube(H,.62,.1,.1,pm(shadeP(skinC,.7)),0,.2,.3);/* neck + under-chin shadow */
 var HW=1.4,HH=1.52,HD=1.34,hy0=.22,T=hy0+HH;
 var fp={skin:skinC,age:age,mood:o.mood||'neutral',blink:false,gaze:0,female:female,beard:beard,glasses:glasses,brow:shadeP(hairC,.7),iris:irisC,hair:hairC,hstyle:style,bald:(age==='elder'&&style%2===0),cap:!!o.cap};
 var mats=headSides(fp);
 var head=new THREE.Mesh(BG,mats);head.scale.set(HW,HH,HD);head.position.set(0,hy0+HH/2,0);head.castShadow=true;head.receiveShadow=true;H.add(head);
 var fm=new THREE.MeshStandardMaterial({map:faceTex(fp),roughness:.9,metalness:0,polygonOffset:true,polygonOffsetFactor:-1});
 var face=new THREE.Mesh(new THREE.PlaneGeometry(HW,HH),fm);face.position.set(0,hy0+HH/2,HD/2+.006);H.add(face);
 [-1,1].forEach(function(sx){cube(H,.1,.4,.06,pm(shadeP(skinC,.9)),sx*(HW/2+.05),hy0+.65,-.28)});/* ear rims stand off the skull */
 /* a little volume on top of the painted hair (never a flat helmet) */
 if(!o.cap&&!fp.bald){
  if(style===1)cube(H,.9,.22,.42,hairM,-.25,T+.1,.3);
  else if(style===2){[-.5,0,.5].forEach(function(x,i){cube(H,.58,.34,.58,hairM,x,T+.14,i%2?.1:-.1)})}
  else if(style===3){cube(H,.62,.62,.62,hairM,0,T+.25,-.42)}
  else if(style===9){cube(H,HW+.16,1.9,.3,hairM,0,T-.95,-HD/2-.1);cube(H,.26,1.3,.9,hairM,-HW/2-.12,T-.8,-.05);cube(H,.26,1.3,.9,hairM,HW/2+.12,T-.8,-.05)}
  else cube(H,HW+.08,.2,HD+.08,hairM,0,T+.02,0);
  if(beard==='full')cube(H,HW*.84,.24,.14,hairM,0,hy0+.08,HD/2-.02);
 }else if(o.cap){cube(H,HW+.12,.5,HD+.12,pm(o.cap),0,T+.02,0);cube(H,1.2,.1,.7,pm(o.cap),0,T-.2,HD/2+.35)}
 if(o.scarf){cube(Bd,2.14*bw,.5,1.24,pm(o.scarf[0]),0,5.08,0);cube(Bd,.58,1.55,.1,pm(o.scarf[1]),.5,4.3,.62);cube(Bd,.58,.3,.12,pm(o.scarf[0]),.5,3.62,.62)}
 if(o.cane){var cn=new THREE.Mesh(BG,pm('#4b3a2e'));cn.scale.set(.15,3.9,.15);cn.position.set(0,-3.0,.3);cn.castShadow=true;arms[1].fa.add(cn);cube(arms[1].fa,.8,.15,.15,pm('#4b3a2e'),-.25,-1.2,.3)}
 var hipW=0,floor=0;
 if(o.sit){
  hipW=o.seat+.475*s;g.position.set(o.x,hipW-3.1*s,o.z);
  var L=Math.max(.9,Math.min(1.7,(hipW-(o.y||0))/(s*1.55)));
  legs.forEach(function(l){l.th.rotation.x=-Math.PI/2;l.sh.rotation.x=Math.PI/2;l.sh.scale.y=L});
  arms.forEach(function(a){a.rotation.x=-.7;a.fa.rotation.x=-.5});
  floor=-(hipW-3.1*s-(o.y||0))/s;
 }else g.position.set(o.x,o.y||0,o.z);
 var blob=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.6),blobMat());blob.rotation.x=-Math.PI/2;blob.position.set(0,floor+.04,0);blob.renderOrder=2;blob.visible=!!DISP.blob;g.add(blob);
 g.rotation.y=o.yaw||0;
 var ph=(hsh%97)/16,P={g:g,legs:legs,arms:arms,Bd:Bd,H:H,s:s,mode:o.anim||'idle',look:o.look==null?null:o.look,sit:!!o.sit,walk:0,mood:o.mood||'neutral',blob:blob,age:age},hy=0,nextBlink=1.5+ph%3.2,blinkT=-1,lastKey='';
 var wasTalk=false;
 P.setMood=function(m){P.mood=m};
 function setFace(blink,gaze){fp.mood=P.mood;fp.blink=blink;fp.gaze=gaze;var k=P.mood+blink+gaze;if(k===lastKey)return;lastKey=k;fm.map=faceTex(fp);fm.needsUpdate=true}
 P.u=function(t,dt){
  blob.visible=!!DISP.blob;if(DISP.blob)blob.material.opacity=DISP.blobOpacity;
  if(DISP.faces){
   if(blinkT<0&&t>nextBlink)blinkT=t;var closed=false;
   if(blinkT>=0){if(t-blinkT>.13){blinkT=-1;nextBlink=t+2.4+((hsh*7+Math.floor(t))%30)/10}else closed=true}
   var gz=P.look==null?(Math.sin(t*.7+ph)>.55?1:Math.sin(t*.7+ph)<-.55?-1:0):(hy>.35?1:hy<-.35?-1:0);
   setFace(closed,gz);
  }
  if(P.walk>0)return;
  if(P.mode==='idle'||P.sit){
   var br2=DISP.idle?Math.sin(t*1.6+ph):0;Bd.position.y=(P.sit?0:br2*.035);torso.scale.y=1+br2*.014;torso.scale.x=1+br2*.012;
   if(!P.sit){arms[0].rotation.x=Math.sin(t*1.1+ph)*.05;arms[1].rotation.x=-Math.sin(t*1.1+ph)*.05;arms[0].rotation.z=.03;arms[1].rotation.z=-.03;if(DISP.idle)Bd.rotation.z=Math.sin(t*.45+ph)*.012}
   if(DISP.idle){H.rotation.z=Math.sin(t*.6+ph)*.02;if(age==='elder'&&!P.sit)H.rotation.x=.12}
  }
  if(P.talk&&P.mode==='idle'){
   /* a speaker's hand moves with the sentence; a listener nods */
   var gs=Math.sin(t*2.1+ph)*.5+.5,g2=Math.max(0,Math.sin(t*1.3+ph*2));
   if(!P.sit){arms[1].rotation.x=-.5-g2*.5;arms[1].rotation.z=-.1-gs*.22;arms[1].fa.rotation.x=-.95-gs*.45;arms[0].rotation.x=-.18-g2*.15;arms[0].fa.rotation.x=-.5-gs*.2;wasTalk=true}
   H.rotation.x=.03+Math.max(0,Math.sin(t*3.3+ph))*.07;
  }else if(wasTalk){wasTalk=false;arms.forEach(function(a2){a2.fa.rotation.x=-.12;a2.rotation.z=0})}
  if(P.mode==='cheer'){var j=Math.abs(Math.sin(t*5+ph));Bd.position.y=j*.5;arms.forEach(function(a,i){a.rotation.x=-2.7+Math.sin(t*9+i)*.35;a.rotation.z=(i?1:-1)*.25;a.fa.rotation.x=-.2});if(P.mood==='neutral')P.mood='cheer'}
  if(P.mode==='sad'){Bd.position.y=-.14;H.rotation.x=.3;arms.forEach(function(a){a.rotation.x=.1;a.rotation.z=0});if(P.mood==='neutral')P.mood='sad'}
  else if(P.mode!=='sad'&&age!=='elder'&&H.rotation.x)H.rotation.x*=.85;
  if(P.look!=null){hy+=(P.look-hy)*Math.min(1,dt*2);H.rotation.y=hy}else if(hy){hy+=(0-hy)*Math.min(1,dt*2);H.rotation.y=hy}
 };
 P.stride=function(w,k){var sw=Math.sin(w)*.65*k;
  legs[0].th.rotation.x=sw;legs[1].th.rotation.x=-sw;legs[0].sh.rotation.x=Math.max(0,-sw)*.9;legs[1].sh.rotation.x=Math.max(0,sw)*.9;
  arms[0].rotation.x=-sw*.7;arms[1].rotation.x=sw*.7;arms[0].rotation.z=.03;arms[1].rotation.z=-.03;arms[0].fa.rotation.x=-.12-Math.max(0,sw)*.5;arms[1].fa.rotation.x=-.12-Math.max(0,-sw)*.5;
  Bd.position.y=Math.abs(Math.sin(w))*.14*k;Bd.rotation.z=Math.sin(w)*.03*k;Bd.rotation.y=Math.sin(w)*.05*k;torso.scale.y=1;torso.scale.x=1;H.rotation.z=0;H.rotation.y=-Bd.rotation.y*.6};
 setFace(false,0);
 return P;
}

function shadeP(h,f){return shade(h,f)}
var personChibi=person;
person=function(o){return(DISP.figure==='chibi')?personChibi(o):personHuman(o)};

function addPerson(o){
 /* in play the game supplies the named cast; a room's stand-ins step aside (rng still drawn, so the room is identical) */
 if(cur.play&&o.cast){rnd();if(o.path)rnd();return null}
 var p=person(o);cur.G.add(p.g);cur.anims.push(p.u);cur.people.push(p);
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
 cur={b:{},S:S,night:night,G:new THREE.Group(),anims:[],L:[],mats:[],lt:[],meta:null,root:root,solids:[],bodies:[],glows:[],win:[],crowd:[],people:[],indoor:false,play:!!st.play,id:st.scene};
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
 if(night){cur.hemi=new THREE.HemisphereLight(0x3b4a7a,0x15151c,.6);root.add(cur.hemi);dl(0x8aa0e0,.5,new THREE.Vector3(.5,1,.6))}
 else{cur.hemi=new THREE.HemisphereLight(0xcfe3f4,0x8a7a68,.75);root.add(cur.hemi);dl(0xffe0c0,1.05,new THREE.Vector3(-.55,1,.75))}
 cur.L.forEach(function(l){root.add(l)});
 view.focus=null;
 polishBuild(cur);
 for(var i=0;i<buildHooks.length;i++)buildHooks[i](cur);
 if(ren&&host&&DISP.warmth)applyDisplay();else fit();
 return cur;
}

/* ---------- camera ----------
 * 'fit'    — the whole room (portrait: the room's own fx window), as the lab shows it
 * 'follow' — the height is fitted between view.bottom..view.top of the glass and the camera
 *            travels along the room with view.focus (the player); a wide screen sees it all */
var AZ=.22,EL=.24;AZ=DISP.azimuth;EL=DISP.elevation;
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
 var dtr=Math.min(.1,(now-LAST)/1000);LAST=now;
 /* slow-mo eases in fast and out slower */
 if(FX.tsHold>0){FX.tsHold-=dtr;if(FX.tsHold<=0)FX.tsT=1}
 FX.ts+=(FX.tsT-FX.ts)*Math.min(1,dtr*(FX.tsT<FX.ts?10:2.5));
 var dt=dtr*FX.ts;FX.TT+=dt;var t=FX.TT;
 FX.intro=Math.min(1,FX.intro+dtr/1.7);FX.kick=Math.max(0,FX.kick-dtr*1.1);
 var k=Math.min(1,dt*4);sw.yaw+=(pointer.x-sw.yaw)*k;sw.pit+=(pointer.y-sw.pit)*k;
 for(var h=0;h<frameHooks.length;h++)frameHooks[h](t,dt);
 polishFrame(t,dtr);
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
 zc+=((view.mode==='follow'?view.zoom:1)-zc)*Math.min(1,dtr*2.6);var bd=base.dist/(zc*(DISP.zoom||1));
 /* camera life: a slow drift in on entry, a kick on a goal, a talk lean */
 var ie=1-Math.pow(1-FX.intro,3);bd*=1+.09*(1-ie)-.05*FX.kick*FX.kick;az+=.06*(1-ie);if(FX.kick>0)el+=Math.sin(now*.05)*.002*FX.kick;
 if(view.mode==='follow'&&view.lift)cy+=view.lift*(zc-1);
 cam.position.set(cx+Math.sin(az)*Math.cos(el)*bd,cy+Math.sin(el)*bd,cz+Math.cos(az)*Math.cos(el)*bd);
 tgt.set(cx,cy,cz);cam.lookAt(tgt);
 for(var i=0;i<cur.anims.length;i++)cur.anims[i](t,dt);
 if(now-LTV>100){LTV=now;tvDraw(t,cur.S)}
 ren.render(scene,cam);
 /* a phone that cannot hold the picture loses the shadows before it loses the game */
 frames++;if(frames>40&&Q.auto){slow=slow*.97+(dtr>.045?1:0)*.03;if(slow>.4){slow=0;frames=0;Q.stage=(Q.stage||0)+1;step(Q.stage);if(Q.stage>=2)Q.auto=false}}
}
function step(n){
 /* a phone that cannot hold the picture gives up, in order: sharpness and extras first, then shadows */
 Q.fxDown=true;
 if(n>=2||n==null){if(Q.shadows){Q.shadows=false;ren.shadowMap.enabled=false;if(cur&&cur.sun)cur.sun.castShadow=false;cur&&cur.mats.forEach(function(m){m.needsUpdate=true})}ren.setPixelRatio(1);FX.lvl=0;if(FX.motes)FX.motes.pts.visible=false;FX.halos.forEach(function(h){h.sp.visible=false})}
 else{ren.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));FX.lvl=Math.min(FX.lvl,1)}
 fit();
}


/* ---------- polish: window light, motes, night halos, corner shade, live crowd, confetti, slow-mo, fades ---------- */
var FX={lvl:2,ts:1,tsT:1,tsHold:0,intro:0,kick:0,TT:0,cheerUntil:0,crowdMode:'idle',crowdUntil:0,fade:null,flash:null,conf:null,crowd:null,motes:null,halos:[]};
var _soft=null;
function softTex(){if(_soft)return _soft;var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);_soft=new THREE.CanvasTexture(c);return _soft}
function gradTex(a0,a1){var c=document.createElement('canvas');c.width=4;c.height=64;var g=c.getContext('2d'),r=g.createLinearGradient(0,0,0,64);r.addColorStop(0,'rgba(255,255,255,'+a0+')');r.addColorStop(1,'rgba(255,255,255,'+a1+')');g.fillStyle=r;g.fillRect(0,0,4,64);var t=new THREE.CanvasTexture(c);return t}
function poolTex(){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d');g.filter='blur(5px)';g.fillStyle='#fff';g.fillRect(12,12,40,40);var t=new THREE.CanvasTexture(c);return t}
function quad(p0,p1,p2,p3){var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p0.concat(p1,p2,p3),3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);return g}
function fxMat(map,col,op,add){var m=new THREE.MeshBasicMaterial({map:map,color:col,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});cur.mats.push(m);return m}
function fxAdd(o){cur.root.add(o);return o}
function fxLevel(){return Q.name==='high'?2:Q.name==='medium'?1:0}
function polishBuild(c){
 FX.lvl=Math.min(FX.lvl,fxLevel());if(!Q.fxDown)FX.lvl=fxLevel();
 FX.intro=0;FX.halos=[];FX.motes=null;FX.conf=null;FX.crowd=null;
 var m=c.meta,W=m.W,D=m.D,H=m.H;
 /* corner shade: where wall meets wall and floor, light falls away */
 if(c.indoor){
  var sh=gradTex(0,.42);/* top transparent, bottom dark */
  fxAdd(new THREE.Mesh(quad([0,0,.04],[W,0,.04],[W,2.8,.04],[0,2.8,.04]),fxMat(sh,0x120c08,1,false))).renderOrder=2;
  var sh2=gradTex(0,.34);
  fxAdd(new THREE.Mesh(quad([.04,0,D],[.04,0,0],[.04,2.8,0],[.04,2.8,D]),fxMat(sh2,0x120c08,1,false))).renderOrder=2;
  var fl=gradTex(.4,0);
  fxAdd(new THREE.Mesh(quad([0,.05,0],[W,.05,0],[W,.05,1.8],[0,.05,1.8]),fxMat(fl,0x120c08,1,false))).renderOrder=2;
  fxAdd(new THREE.Mesh(quad([0,.05,D],[0,.05,0],[1.6,.05,0],[1.6,.05,D]),fxMat(fl,0x120c08,1,false))).renderOrder=2;
 }
 /* daylight through each window: a slanted shaft, a pool on the floor, dust in the beam */
 if(!c.night&&c.win.length&&FX.lvl>0){
  var bt=gradTex(.2,0),pt0=poolTex(),beams=[];
  c.win.forEach(function(w){
   var sx=(w[1]-w[0])*.3,zf=Math.min(D-1.2,7.5);
   var g=quad([w[0],w[3],.1],[w[1],w[3],.1],[w[1]+sx,.06,zf],[w[0]+sx,.06,zf]);
   var me=fxAdd(new THREE.Mesh(g,fxMat(bt,0xffe2b4,.9,true)));me.renderOrder=3;
   var pw=(w[1]-w[0])*1.05,pd=Math.min(5,zf*.7);
   var pool=new THREE.Mesh(new THREE.PlaneGeometry(pw,pd),fxMat(pt0,0xffd8a0,.36,true));pool.rotation.x=-Math.PI/2;pool.position.set((w[0]+w[1])/2+sx*.9,.07,zf*.62);fxAdd(pool).renderOrder=3;
   beams.push({w:w,sx:sx,zf:zf});
  });
  var N=22*FX.lvl,pos=new Float32Array(N*3),meta2=[];
  for(var i=0;i<N;i++){var b=beams[i%beams.length];meta2.push({b:b,u:Math.random(),v:Math.random(),ph:Math.random()*6.28,sp:.15+Math.random()*.25})}
  var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  var pm_=new THREE.PointsMaterial({map:softTex(),color:0xfff0d0,size:1.1,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});c.mats.push(pm_);
  var pts=new THREE.Points(geo,pm_);pts.frustumCulled=false;fxAdd(pts).renderOrder=4;FX.motes={pts:pts,meta:meta2,pos:pos};
 }
 /* a lit lamp glows */
 if(c.night&&FX.lvl>0){
  var st_=softTex();c.glows.slice(0,16).forEach(function(g){
   var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:st_,color:new THREE.Color(cleanNum(parseInt(g[4].replace('#',''),16)||0xffd090)).convertSRGBToLinear(),transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));
   c.mats.push(sp.material);var s=Math.min(5,Math.max(2.4,g[3]*2.6));sp.scale.set(s,s,1);sp.position.set(g[0],g[1],g[2]+.3);fxAdd(sp);FX.halos.push({sp:sp,ph:Math.random()*6})});
 }
 /* the stands come alive */
 if(c.crowd.length)buildCrowd(c);
 /* fade up from black */
 fadeIn();
}
/* ---- crowd: instanced, so hundreds of fans cost five draw calls ---- */
var CPARTS=[['body',1,1.15,.7,0,.575,0],['head',.8,.8,.6,0,1.55,0],['hair',.84,.3,.64,0,2.0,0],['armL',.3,.95,.3,0,0,0],['armR',.3,.95,.3,0,0,0],['flag',1.5,.9,.07,0,0,0],['pole',.1,2.6,.1,0,0,0]];
function buildCrowd(c){
 var list=c.crowd,n=list.length,S=c.S,flags=[];
 var meshes={},mat=new THREE.MeshStandardMaterial({roughness:.9,metalness:0});c.mats.push(mat);
 function col(h){return new THREE.Color(clean(h)).convertSRGBToLinear()}
 var skinC=list.map(function(p){return col(p.skin)}),hairC=list.map(function(p){return col(p.hair)}),shC=list.map(function(p){return col(p.shirt)});
 list.forEach(function(p,i){var hs=(Math.floor(p.x*7+p.z*13+p.y*5)%11+11)%11;p.ph=hs*.57;p.flag=hs===3&&i%4===0;if(p.flag)flags.push(i);p.sc=hs%3===0;});
 ['body','head','hair','armL','armR'].forEach(function(k){
  var d=CPARTS.filter(function(q){return q[0]===k})[0],im=new THREE.InstancedMesh(BG,mat,n);im.castShadow=false;im.receiveShadow=false;im.frustumCulled=false;
  for(var i=0;i<n;i++){im.setColorAt(i,k==='body'?shC[i]:k==='head'?skinC[i]:k==='hair'?hairC[i]:(list[i].sc?shC[i]:skinC[i]))}
  im.instanceColor.needsUpdate=true;c.root.add(im);meshes[k]=im});
 if(flags.length){var fl=new THREE.InstancedMesh(BG,mat,flags.length),pl=new THREE.InstancedMesh(BG,mat,flags.length);fl.frustumCulled=pl.frustumCulled=false;
  flags.forEach(function(ix,j){fl.setColorAt(j,col(j%2?S.s:S.p));pl.setColorAt(j,col('#d8d4ca'))});fl.instanceColor.needsUpdate=pl.instanceColor.needsUpdate=true;c.root.add(fl);c.root.add(pl);meshes.flag=fl;meshes.pole=pl}
 FX.crowd={list:list,meshes:meshes,flags:flags,d:new THREE.Object3D(),acc:0,static_:false};
 crowdPose(0,true);
}
function crowdPose(t,force){
 var C=FX.crowd;if(!C)return;var d=C.d,M=C.meshes,mode=(FX.TT<FX.cheerUntil)?'cheer':FX.crowdMode,L=C.list;
 for(var i=0;i<L.length;i++){var p=L[i],ph=p.ph,bob=0,sw=0,aL=.12,aR=.12;
  if(mode==='cheer'){bob=Math.abs(Math.sin(t*6+ph))*.55;aL=aR=2.5+Math.sin(t*9+ph)*.4;sw=Math.sin(t*3+ph)*.05}
  else if(mode==='sing'){bob=Math.abs(Math.sin(t*2.4+ph))*.1;sw=Math.sin(t*1.8+ph)*.14;aL=.2;aR=(i%3===0)?2.4+Math.sin(t*3+ph)*.3:.2}
  else{bob=Math.sin(t*1.3+ph)*.04;sw=Math.sin(t*.7+ph)*.02}
  var x=p.x,y=p.y+bob,z=p.z;
  function put(k,ox,oy,oz,sx,sy,sz,rz){d.position.set(x+ox,y+oy,z+oz);d.rotation.set(0,0,rz||0);d.scale.set(sx,sy,sz);d.updateMatrix();M[k].setMatrixAt(i,d.matrix)}
  put('body',0,.575,0,1,1.15,.7,sw);put('head',sw*.5,1.55,0,.8,.8,.6,sw);put('hair',sw*.5,1.9,-.02,.84,.3,.64,sw);
  [['armL',-1,aL],['armR',1,aR]].forEach(function(a){var s=a[1],ang=a[2],L2=.47,px=x+s*.64,py=y+1.05;d.position.set(px+s*Math.sin(ang)*L2,py-Math.cos(ang)*L2,z);d.rotation.set(0,0,s*ang);d.scale.set(.3,.95,.3);d.updateMatrix();M[a[0]].setMatrixAt(i,d.matrix)});
 }
 C.flags.forEach(function(ix,j){var p=L[ix],wv=Math.sin(t*(mode==='idle'?2:5)+p.ph);
  d.position.set(p.x+.9,p.y+2.6+(mode==='cheer'?Math.abs(Math.sin(t*6+p.ph))*.5:0),p.z+.3);d.rotation.set(0,0,0);d.scale.set(.1,2.6,.1);d.updateMatrix();M.pole.setMatrixAt(j,d.matrix);
  d.position.set(p.x+1.7,p.y+3.4+(mode==='cheer'?Math.abs(Math.sin(t*6+p.ph))*.5:0),p.z+.3);d.rotation.set(0,wv*.35,wv*.06);d.scale.set(1.5,.9,.07);d.updateMatrix();M.flag.setMatrixAt(j,d.matrix)});
 Object.keys(M).forEach(function(k){M[k].instanceMatrix.needsUpdate=true});
}
/* ---- confetti ---- */
function confetti(n){
 var S=cur.S,m=cur.meta,cols=[S.p,S.s,S.t,'#ffffff','#f2c14e'].map(function(h){var c=new THREE.Color(clean(h)).convertSRGBToLinear();return[c.r,c.g,c.b]});
 var N=n||(FX.lvl===2?520:FX.lvl===1?260:110),pos=new Float32Array(N*3),col=new Float32Array(N*3),vel=new Float32Array(N*3),ph=new Float32Array(N);
 for(var i=0;i<N;i++){pos[i*3]=m.W*(.1+Math.random()*.8);pos[i*3+1]=m.H*(.45+Math.random()*.5);pos[i*3+2]=m.D*(.3+Math.random()*.6);
  vel[i*3]=(Math.random()-.5)*7;vel[i*3+1]=2+Math.random()*8;vel[i*3+2]=(Math.random()-.5)*5;ph[i]=Math.random()*6.28;var c=cols[i%cols.length];col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2]}
 var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
 var mt=new THREE.PointsMaterial({size:1.5,vertexColors:true,transparent:true,opacity:1,depthWrite:false,sizeAttenuation:true});cur.mats.push(mt);
 var pts=new THREE.Points(g,mt);pts.frustumCulled=false;cur.root.add(pts);
 if(FX.conf&&FX.conf.pts.parent)FX.conf.pts.parent.remove(FX.conf.pts);
 FX.conf={pts:pts,pos:pos,vel:vel,ph:ph,N:N,age:0,mt:mt};
}
function confettiStep(dt){var C=FX.conf;if(!C)return;C.age+=dt;var p=C.pos,v=C.vel;
 for(var i=0;i<C.N;i++){var k=i*3;v[k+1]-=9*dt;v[k]*=1-.8*dt;v[k+2]*=1-.8*dt;if(v[k+1]<-2.4)v[k+1]=-2.4;p[k]+=(v[k]+Math.sin(C.age*5+C.ph[i])*1.4)*dt;p[k+1]+=v[k+1]*dt;p[k+2]+=v[k+2]*dt;if(p[k+1]<.1){p[k+1]=.1;v[k]=v[k+1]=v[k+2]=0}}
 C.pts.geometry.attributes.position.needsUpdate=true;if(C.age>7){C.mt.opacity=Math.max(0,1-(C.age-7)/1.5);if(C.age>8.5){C.pts.parent&&C.pts.parent.remove(C.pts);FX.conf=null}}}
function celebrate(o){
 o=o||{};if(!cur)return;confetti();
 FX.cheerUntil=FX.TT+6.5;FX.tsT=.32;FX.tsHold=.9;FX.kick=1;flash();
 (cur.people||[]).forEach(function(p){if(p&&!p.walk){p._m0=p.mode;p.mode='cheer';setTimeout(function(){if(p.mode==='cheer')p.mode=p._m0||'idle'},6500)}});
 FX.crowdMode='sing';
}
function flash(){if(!host)return;var el=FX.flash;if(!el){el=FX.flash=document.createElement('div');el.style.cssText='position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:4';host.stage.appendChild(el)}
 el.style.transition='none';el.style.opacity='.55';void el.offsetWidth;el.style.transition='opacity .7s ease-out';el.style.opacity='0'}
/* ---- fades between rooms ---- */
function fadeEl(){if(FX.fade||!host)return FX.fade;var el=FX.fade=document.createElement('div');el.style.cssText='position:absolute;inset:0;background:#07080c;opacity:1;pointer-events:none;z-index:4';host.stage.appendChild(el);return el}
function fadeIn(){if(!host||host.capture)return;FX.tok=(FX.tok||0)+1;var el=fadeEl();el.style.transition='none';el.style.opacity='1';void el.offsetWidth;el.style.transition='opacity .6s ease-out';el.style.opacity='0'}
function fadeOut(ms,cb){if(!host||host.capture){cb&&cb();return}var el=fadeEl();el.style.transition='opacity '+(ms||280)/1000+'s ease-in';el.style.opacity='1';var tk=FX.tok||0;setTimeout(function(){cb&&cb()},ms||280);/* if the host keeps the same room, the curtain lifts again */setTimeout(function(){if((FX.tok||0)===tk){el.style.transition='opacity .5s ease-out';el.style.opacity='0'}},(ms||280)+1500)}
/* ---- per-frame ---- */
function polishFrame(t,dtr){
 if(FX.motes){var M=FX.motes,pos=M.pos;for(var i=0;i<M.meta.length;i++){var q=M.meta[i],b=q.b,w=b.w;q.v=(q.v+dtr*q.sp*.12)%1;var v=q.v,x=w[0]+(w[1]-w[0])*q.u+b.sx*v+Math.sin(t*.6+q.ph)*.4,y=w[3]*(1-v)+.2+Math.sin(t*.8+q.ph)*.25,z=.2+(b.zf-.2)*v;pos[i*3]=x;pos[i*3+1]=y;pos[i*3+2]=z}M.pts.geometry.attributes.position.needsUpdate=true}
 for(var h=0;h<FX.halos.length;h++){var H_=FX.halos[h];H_.sp.material.opacity=.5+Math.sin(t*1.7+H_.ph)*.05+(Math.sin(t*23+H_.ph*9)>.97?-.06:0)}
 confettiStep(dtr*FX.ts);
 if(FX.crowd&&FX.lvl>0){FX.crowd.acc+=dtr;var step_=FX.lvl===2?1/30:1/20;if(FX.crowd.acc>=step_){FX.crowd.acc=0;crowdPose(t)}}
}

/* ---------- scene mood + display application ---------- */
var MOODS={normal:{exp:1,css:''},match:{exp:1.14,css:'saturate(1.14) contrast(1.05)'},grief:{exp:.86,css:'saturate(.5) brightness(.93) contrast(.97)'},dusk:{exp:.95,css:'sepia(.18) saturate(1.1)'},memory:{exp:1.08,css:'sepia(.32) saturate(.9) contrast(.96)'}};
var sceneMood='normal';
function applyDisplay(){
 if(!ren||!host)return;
 AZ=DISP.azimuth;EL=DISP.elevation;cam.fov=DISP.fov;cam.updateProjectionMatrix();
 var m=MOODS[sceneMood]||MOODS.normal;ren.toneMappingExposure=(DISP.exposure||1)*m.exp;
 var st2=host.stage,cvs=host.canvas;
 cvs.style.transform=DISP.mirror?'scaleX(-1)':'';
 var vg=st2.querySelector('.vig'),gr=st2.querySelector('.grain');
 if(vg)vg.style.opacity=DISP.vignette;if(gr)gr.style.opacity=.07*DISP.grain;
 var w=DISP.warmth||0,f=m.css+(w?' sepia('+Math.abs(w)*.4+') hue-rotate('+(w<0?170:-8)+'deg)':'');
 cvs.style.filter=f.trim();
 if(cur&&cur.hemi){var c=new THREE.Color(cur.night?0x3b4a7a:0xcfe3f4);if(w>0)c.lerp(new THREE.Color(0xffd7a8),w*.5);else if(w<0)c.lerp(new THREE.Color(0xa8c8ff),-w*.5);cur.hemi.color.copy(c)}
 var qn=DISP.quality;if(qn&&qn!=='auto'&&QUALITY[qn]&&Q.name!==qn){var q=QUALITY[qn];Q.name=qn;Q.auto=false;ren.setPixelRatio(Math.min(window.devicePixelRatio||1,q.dpr));if(Q.shadows!==q.shadows){Q.shadows=q.shadows;ren.shadowMap.enabled=q.shadows;if(cur&&cur.sun)cur.sun.castShadow=q.shadows;cur&&cur.mats.forEach(function(m2){m2.needsUpdate=true})}}
 fit();
}
function setMood(n){sceneMood=MOODS[n]?n:'normal';applyDisplay()}
dispHooks.push(applyDisplay);
/* ---------- boot ---------- */
function loadImg(key,url){return new Promise(function(res){var im=new Image();im.onload=function(){IM[key]=im;res()};im.onerror=function(){res()};im.src=url})}
function loadArt(){var jobs=[];Object.keys(SK).forEach(function(id){var a=SK[id].art;if(!a)return;
  if(a.crest&&!IM['crest:'+id])jobs.push(loadImg('crest:'+id,a.crest));if(a.shirt&&!IM['shirt:'+id])jobs.push(loadImg('shirt:'+id,a.shirt))});return Promise.all(jobs)}
function boot(opts){
 host={canvas:opts.canvas,stage:opts.stage,capture:!!opts.capture};
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
 return Promise.all(jobs).then(loadArt).then(function(){return fetch('/life/voxel/display.json').then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(d){if(d){var own={};try{own=JSON.parse(localStorage.getItem(DKEY)||'{}')||{}}catch(e){}for(var k in d)if(k in DISP&&!(k in own))DISP[k]=d[k]}})}).then(function(){applyDisplay();T0=LAST=performance.now();running=true;requestAnimationFrame(loop);return V});
}
function stop(){running=false;dispose()}

var V=window.__vx={THREE:window.THREE,box:box,face:face,wallZ:wallZ,decal:decal,decalY:decalY,addPerson:addPerson,person:person,cube:cube,part:part,pm:pm,pt:pt,rnd:rnd,pick:pick,seed:seed,lin:lin,cv:cv,ctex:ctex,FF:FF,drawCrest:drawCrest,clean:clean,
 cur:function(){return cur},DEC:function(){return DEC},SK:SK,SKIN:SKIN,HAIR:HAIR,PANTS:PANTS,st:st,rebuild:rebuild,TILE:TILE,IM:IM,GRADE:GRADE,
 boot:boot,stop:stop,fit:fit,view:view,setSkins:setSkins,loadArt:loadArt,skin:skin,
 onFrame:function(fn){frameHooks.push(fn)},onBuild:function(fn){buildHooks.push(fn)},
 camera:function(){return cam},renderer:function(){return ren},quality:function(){return Q},base:function(){return base},
 softTex:softTex,celebrate:celebrate,fx:FX,fadeOut:fadeOut,crowdMode:function(m){FX.crowdMode=m||'idle'},slowmo:function(k,s){FX.tsT=k;FX.tsHold=s||1},
 win:function(x0,x1,y0,y1){if(cur&&cur.win)cur.win.push([x0,x1,y0,y1])},interior:function(){if(cur)cur.indoor=true},
 addCrowd:function(o){if(cur&&cur.crowd)cur.crowd.push(o)},
 patMat:patMat,STR:STR,display:DISP,setDisplay:dispSet,setMood:setMood,MOODS:MOODS,onDisplay:function(fn){dispHooks.push(fn)},shade:shade};
})();
