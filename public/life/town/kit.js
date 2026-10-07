(function(){
var T=THREE,Q=new URLSearchParams(location.search);
var R=T.MathUtils;var seed=11;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}function rr(a,b){return a+rnd()*(b-a)}
var QL=Q.get('q')||(matchMedia('(pointer:coarse)').matches?'med':'high');if(QL!=='low'&&QL!=='med'&&QL!=='high')QL='high';
var ren=new T.WebGLRenderer({antialias:QL!=='low',alpha:false,preserveDrawingBuffer:Q.get('capture')==='1'||!Q.get('play')});ren.setPixelRatio(Math.min(devicePixelRatio,QL==='high'?2:QL==='med'?1.5:1));ren.shadowMap.enabled=QL!=='low';ren.shadowMap.type=T.PCFSoftShadowMap;ren.outputEncoding=T.sRGBEncoding;ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.0;
(document.getElementById('stage')||document.body).appendChild(ren.domElement);var sc=new T.Scene();
var cam=new T.PerspectiveCamera(36,1,.1,200);
/* ---------- procedural painted textures ---------- */
function cvs(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tex(c,rx,ry,srgb){var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.anisotropy=8;if(srgb!==false)t.encoding=T.sRGBEncoding;return t}
function paint(g,w,h,n,col,al){for(var i=0;i<n;i++){g.strokeStyle=col(i);g.globalAlpha=al;g.lineWidth=rr(2,9);g.lineCap='round';var x=rnd()*w,y=rnd()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rr(-30,30),y+rr(-30,30));g.stroke()}g.globalAlpha=1}
function wall(base,tone,rx,ry){var c=cvs(512,512),g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,512,512);paint(g,512,512,900,function(){return tone[Math.floor(rnd()*tone.length)]},.18);
 var d=g.getImageData(0,0,512,512),p=d.data;for(var i=0;i<p.length;i+=4){var n=(rnd()-.5)*10;p[i]+=n;p[i+1]+=n;p[i+2]+=n}g.putImageData(d,0,0);return tex(c,rx,ry)}
function brick(base,rx,ry){var c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#c9b9a6';g.fillRect(0,0,512,512);for(var r=0;r<16;r++)for(var k=-1;k<9;k++){var x=k*64+(r%2?32:0)+2,y=r*32+2;var l=.88+rnd()*.2;g.fillStyle='hsl('+(base+rr(-4,4))+',32%,'+(48*l)+'%)';rrect(g,x,y,60,28,5);g.fill()}return tex(c,rx,ry)}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function cobble(){var c=cvs(1024,1024),g=c.getContext('2d');g.fillStyle='#8a7a78';g.fillRect(0,0,1024,1024);for(var r=0;r<32;r++)for(var k=-1;k<17;k++){var x=k*64+(r%2?32:0)+rr(-2,2),y=r*32;var h=rr(18,32),l=rr(.85,1.15);g.fillStyle='hsl('+rr(10,30)+','+rr(10,22)+'%,'+(60*l)+'%)';rrect(g,x+3,y+3,58,26,10);g.fill();g.fillStyle='rgba(255,255,255,.12)';rrect(g,x+6,y+5,40,8,4);g.fill()}return tex(c,10,10)}
function planks(a){var c=cvs(512,512),g=c.getContext('2d');for(var i=0;i<8;i++){g.fillStyle='hsl('+rr(22,32)+','+rr(30,45)+'%,'+rr(38,50)+'%)';g.fillRect(0,i*64,512,62);g.fillStyle='rgba(60,30,10,.25)';g.fillRect(0,i*64+62,512,2);paint(g,512,64,10,function(){return'rgba(70,40,20,.5)'},.2)}return tex(c,a||1,a||1)}
function stripes(a,b,n){var c=cvs(256,64),g=c.getContext('2d');for(var i=0;i<n;i++){g.fillStyle=i%2?b:a;g.fillRect(i*256/n,0,256/n+1,64)}return tex(c,1,1)}
function sign(txt,bg,fg,w,h,font){var c=cvs(w||512,h||200),g=c.getContext('2d');g.fillStyle=bg;rrect(g,4,4,c.width-8,c.height-8,26);g.fill();g.strokeStyle=fg;g.lineWidth=6;rrect(g,14,14,c.width-28,c.height-28,20);g.stroke();g.fillStyle=fg;g.font=(font||'bold 96px')+' Heebo, Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.direction='rtl';g.fillText(txt,c.width/2,c.height/2+6);return tex(c,1,1)}
function chalk(){var c=cvs(256,320),g=c.getContext('2d');g.fillStyle='#2e3a35';g.fillRect(0,0,256,320);g.strokeStyle='#e8ece6';g.lineWidth=3;g.font='bold 30px Heebo, Arial';g.fillStyle='#e8ece6';g.textAlign='center';g.direction='rtl';g.fillText('היום',128,44);['שוקולד  8','קפה  6','לימונדה  7','חלה  12'].forEach(function(t,i){g.font='24px Heebo, Arial';g.fillText(t,128,100+i*38)});[['#ff8fa3',60],['#ffffff',128],['#b79cff',196]].forEach(function(f){g.fillStyle=f[0];for(var a=0;a<5;a++){g.beginPath();g.ellipse(f[1]+Math.cos(a*1.26)*10,270+Math.sin(a*1.26)*10,8,8,0,0,7);g.fill()}});return tex(c,1,1)}
/* ---------- geometry helpers ---------- */
function rbox(w,h,d,r,s){s=s||6;var g=new T.BoxGeometry(w,h,d,s,s,s),p=g.attributes.position,v=new T.Vector3(),c=new T.Vector3();var hw=w/2-r,hh=h/2-r,hd=d/2-r;for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(R.clamp(v.x,-hw,hw),R.clamp(v.y,-hh,hh),R.clamp(v.z,-hd,hd));v.sub(c);if(v.lengthSq()>1e-9)v.normalize().multiplyScalar(r);v.add(c);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g}
function capsule(r,len,seg){var pts=[],n=8;for(var i=0;i<=n;i++){var a=-Math.PI/2+i/n*Math.PI/2;pts.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r-len/2))}for(i=0;i<=n;i++){a=i/n*Math.PI/2;pts.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r+len/2))}return new T.LatheGeometry(pts,seg||14)}
var MT={};function std(c,o){o=o||{};return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.82,metalness:0},o))}
function mesh(g,m,x,y,z,par){var o=new T.Mesh(g,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;if(par)par.add(o);return o}
var world=new T.Group();sc.add(world);

/* ---------- GTA-ish night street: Tel Aviv south, matchday ---------- */
var anim={sway:[],glow:[],chars:[],flares:[],flags:[],cars:[],smoke:[],tick:[]};
var SK=['#f1c7a5','#e0a982','#c68863','#8d5a3e','#6b4430'];
function glowTex(){if(glowTex.t)return glowTex.t;var c=cvs(64,64),g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return glowTex.t=new T.CanvasTexture(c)}
function concrete(base,rx,ry){return wall(base,['#8a8a92','#6a6a74','#9a9aa4','#555560'],rx,ry)}
function asphalt(){var c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#2a2a32';g.fillRect(0,0,512,512);paint(g,512,512,1400,function(){return['#3a3a44','#1e1e26','#44444e'][Math.floor(rnd()*3)]},.35);for(var i=0;i<60;i++){g.fillStyle='rgba(10,10,14,.5)';g.beginPath();g.ellipse(rnd()*512,rnd()*512,rr(8,30),rr(3,10),rnd(),0,7);g.fill()}return tex(c,12,6)}
function graffiti(){var c=cvs(1024,512),g=c.getContext('2d');g.fillStyle='#6a6a74';g.fillRect(0,0,1024,512);paint(g,1024,512,1500,function(){return['#8a8a92','#555560','#7a7a84'][Math.floor(rnd()*3)]},.1);
 g.textAlign='center';g.direction='rtl';g.font='900 220px Heebo, Arial';g.lineJoin='round';g.lineWidth=22;g.strokeStyle='#14141c';g.strokeText('הפועל',380,250);g.fillStyle='#e0243a';g.fillText('הפועל',380,250);g.lineWidth=0;g.strokeStyle='#fff';g.lineWidth=5;g.strokeText('הפועל',376,246);
 g.font='900 120px Heebo, Arial';g.lineWidth=14;g.strokeStyle='#14141c';g.strokeText('אולטראס',760,430);g.fillStyle='#f4f1ff';g.fillText('אולטראס',760,430);
 g.fillStyle='#e0243a';for(var i=0;i<6;i++){g.beginPath();var x=120+i*40;g.moveTo(x,60);g.lineTo(x+13,100);g.lineTo(x-13,100);g.fill()}
 g.strokeStyle='#4a6aff';g.lineWidth=8;g.beginPath();g.moveTo(640,80);g.bezierCurveTo(700,20,780,140,860,60);g.stroke();g.strokeStyle='#e0243a';g.beginPath();g.moveTo(680,120);g.bezierCurveTo(740,60,820,180,900,100);g.stroke();
 g.fillStyle='rgba(224,36,58,.8)';for(i=0;i<30;i++){g.fillRect(300+rnd()*180,258,3,rr(20,110))}
 g.fillStyle='#f4f1ff';g.font='bold 44px Heebo, Arial';g.fillText('תל אביב 1923',270,330);
 var d=g.getImageData(0,0,1024,512),p=d.data;for(i=0;i<p.length;i+=4){var n=(rnd()-.5)*18;p[i]+=n;p[i+1]+=n;p[i+2]+=n}g.putImageData(d,0,0);return tex(c,1,1)}
function rollerShutter(){var c=cvs(256,256),g=c.getContext('2d');for(var i=0;i<32;i++){g.fillStyle=i%2?'#6a6a74':'#7a7a86';g.fillRect(0,i*8,256,8);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,i*8+7,256,1)}g.strokeStyle='#e0243a';g.lineWidth=14;g.lineCap='round';g.beginPath();g.moveTo(30,200);g.bezierCurveTo(80,40,160,260,226,70);g.stroke();return tex(c,1,1)}
function win(g,x,y,lit,col){var w=mesh(rbox(1.0,1.5,.14,.04,3),std('#2a2a34'),x,y,2.55,g);var gl=mesh(new T.PlaneGeometry(.82,1.32),new T.MeshStandardMaterial({color:lit?col:'#1a2030',emissive:lit?col:'#0a0e18',emissiveIntensity:lit?1.1:.3,roughness:.2}),x,y,2.64,g);gl.castShadow=false;if(lit){var sp=new T.Sprite(new T.SpriteMaterial({color:col,map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.35,depthWrite:false}));sp.scale.set(2.6,2.6,1);sp.position.set(x,y,2.9);g.add(sp);anim.glow.push(sp)}mesh(rbox(1.3,.1,.4,.03,2),std('#5a5a64'),x,y-.82,2.7,g)}
function lamp(x,z){var g=new T.Group();g.position.set(x,0,z);world.add(g);mesh(new T.CylinderGeometry(.08,.12,6.2,10),std('#2a2e3a',{metalness:.6,roughness:.4}),0,3.1,0,g);var arm=mesh(rbox(1.5,.1,.1,.03,2),std('#2a2e3a',{metalness:.6}),.7,6.1,0,g);var hd=mesh(rbox(.8,.14,.3,.05,2),std('#2a2e3a'),1.4,6.0,0,g);var l=mesh(new T.PlaneGeometry(.7,.24),new T.MeshBasicMaterial({color:'#ffb890'}),1.4,5.92,0,g);l.rotation.x=Math.PI/2;var sp=new T.Sprite(new T.SpriteMaterial({color:'#ff9a64',map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.75,depthWrite:false}));sp.scale.setScalar(5);sp.position.set(1.4,5.85,0);g.add(sp);anim.glow.push(sp);var pl=new T.PointLight('#ff9a64',1.2,16,1.6);pl.position.set(1.4,5.6,0);g.add(pl);var cone=mesh(new T.CylinderGeometry(.2,2.8,5.6,18,1,true),new T.MeshBasicMaterial({color:'#ff9a64',transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),1.4,2.9,0,g);cone.castShadow=false}
function car(x,z,ry,col){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;world.add(g);mesh(rbox(4.2,.9,1.8,.25,4),std(col,{roughness:.3,metalness:.4}),0,.75,0,g);mesh(rbox(2.2,.75,1.6,.22,4),std(col,{roughness:.3,metalness:.4}),-.1,1.5,0,g);mesh(rbox(2.0,.55,1.62,.18,3),new T.MeshStandardMaterial({color:'#10161e',roughness:.1,metalness:.5}),-.1,1.5,0,g);[[-1.4,.82],[1.4,.82],[-1.4,-.82],[1.4,-.82]].forEach(function(p){var w=mesh(new T.CylinderGeometry(.42,.42,.3,16),std('#14141a'),p[0],.42,p[1],g);w.rotation.x=Math.PI/2;mesh(new T.CylinderGeometry(.24,.24,.32,12),std('#aaaab4',{metalness:.7,roughness:.3}),p[0],.42,p[1],g).rotation.x=Math.PI/2});[-.6,.6].forEach(function(z2){var hl=mesh(new T.PlaneGeometry(.5,.22),new T.MeshBasicMaterial({color:'#fff4e8'}),2.12,.85,z2,g);hl.rotation.y=Math.PI/2;var sp=new T.Sprite(new T.SpriteMaterial({color:'#ffe8d0',map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.6,depthWrite:false}));sp.scale.setScalar(2);sp.position.set(2.3,.85,z2);g.add(sp)});[-.6,.6].forEach(function(z2){var tl=mesh(new T.PlaneGeometry(.4,.18),new T.MeshBasicMaterial({color:'#ff2a3a'}),-2.12,.9,z2,g);tl.rotation.y=-Math.PI/2});return g}
function banner(x,z,w,h,txt,bg,fg){var g=new T.Group();g.position.set(x,0,z);world.add(g);mesh(new T.CylinderGeometry(.05,.05,4.6,8),std('#2a2e3a',{metalness:.5}),0,2.3,0,g);var c=cvs(256,160),k=c.getContext('2d');k.fillStyle=bg;k.fillRect(0,0,256,160);k.fillStyle=fg;k.fillRect(0,60,256,16);k.font='900 74px Heebo, Arial';k.textAlign='center';k.direction='rtl';k.fillText(txt,128,134);k.fillStyle='#fff';k.fillRect(0,0,256,10);var pl=mesh(new T.PlaneGeometry(w,h,8,1),new T.MeshStandardMaterial({map:tex(c,1,1),side:T.DoubleSide,roughness:.9}),w/2,4.1-h/2,0,g);pl.castShadow=true;anim.flags.push({o:pl,ph:x,g:pl.geometry});return g}
function dumpster(x,z,ry){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;world.add(g);mesh(rbox(1.8,1.2,1.0,.08,3),std('#2a5a3a',{roughness:.7}),0,.8,0,g);mesh(rbox(1.9,.1,1.1,.04,2),std('#1a3a26'),0,1.45,0,g);[-.8,.8].forEach(function(x2){mesh(new T.CylinderGeometry(.1,.1,.1,8),std('#111'),x2,.1,.4,g).rotation.z=Math.PI/2})}
function flare(x,y,z){var g=new T.Group();g.position.set(x,y,z);world.add(g);var pl=new T.PointLight('#ff2a3a',.2,3.5,2);g.add(pl);var sp=new T.Sprite(new T.SpriteMaterial({color:'#ff3a4a',map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.95,depthWrite:false}));sp.scale.setScalar(1.3);g.add(sp);var core=mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:'#fff0f0'}),0,0,0,g);var smoke=[];for(var i=0;i<26;i++){var s=new T.Sprite(new T.SpriteMaterial({color:i%3?'#6a5a62':'#ff6a7a',map:glowTex(),transparent:true,opacity:.0,depthWrite:false,blending:i%3?T.NormalBlending:T.AdditiveBlending}));s.scale.setScalar(1.2);world.add(s);smoke.push({s:s,a:i/26*4,x:x,y:y,z:z})}anim.flares.push({g:g,pl:pl,sp:sp,smoke:smoke,x:x,y:y,z:z});return g}
function skinTex(){return null}
function tatTex(base){var c=cvs(64,128),g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,64,128);g.strokeStyle='rgba(30,40,70,.75)';g.lineWidth=3;for(var i=0;i<9;i++){g.beginPath();g.moveTo(rnd()*64,i*14);g.bezierCurveTo(rnd()*64,i*14+10,rnd()*64,i*14+4,rnd()*64,i*14+14);g.stroke()}g.fillStyle='rgba(180,40,50,.7)';g.fillRect(8,40,18,12);return tex(c,1,1)}
anim.flare=flare;
function loft(prof,seg,fn){var n=prof.length,pos=[],idx=[],i,j;seg=seg||28;
 for(i=0;i<n;i++)for(j=0;j<=seg;j++){var th=j/seg*Math.PI*2,y=prof[i][0],x=Math.cos(th)*prof[i][1],z=Math.sin(th)*(prof[i][2]||prof[i][1]);if(fn){var d=fn(x,y,z,th);x+=d[0];y+=d[1];z+=d[2]}pos.push(x,y,z)}
 for(i=0;i<n-1;i++)for(j=0;j<seg;j++){var a=i*(seg+1)+j,b=a+seg+1;idx.push(a,a+1,b,a+1,b+1,b)}
 var ends=[0,n-1];ends.forEach(function(e){var c=pos.length/3;pos.push(0,prof[e][0],0);for(j=0;j<seg;j++){var a=e*(seg+1)+j;if(e===0)idx.push(c,a+1,a);else idx.push(c,a,a+1)}});
 var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
function patternGeo(g,a,b,pat){var p=g.attributes.position,n=p.count,col=new Float32Array(n*3),A=new T.Color(a).convertSRGBToLinear(),B=new T.Color(b).convertSRGBToLinear();for(var i=0;i<n;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=0;if(pat==='hoops')k=Math.floor((y+.2)/.075)%2;else if(pat==='pinstripe')k=Math.floor((Math.atan2(x,z)+Math.PI)/(Math.PI*2)*30)%2;else if(pat==='sash')k=Math.abs(x+(y-.45)*.9)<.075?1:0;else if(pat==='diagonal')k=Math.floor((x+y*.8+1)/.09)%2;var c=k?B:A;col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(col,3))}
function G_(v,s){return Math.exp(-v*v/(2*s*s))}
function SS_(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function torsoGeo(W,sc){sc=sc||1;var P=[[-.14,.125,.092],[-.05,.158,.098],[.06,.155,.1],[.18,.148,.098],[.32,.168,.108],[.44,.2,.12],[.54,.226,.118],[.61,.25,.105],[.66,.2,.095],[.7,.14,.085],[.75,.092,.072],[.79,.075,.066]].map(function(p){return[p[0],p[1]*W*sc,p[2]*sc*(1+(W-1)*.3)]});
 return loft(P,36,function(x,y,z){var dz=0,f=z>0?1:0;dz+=.022*f*G_(Math.abs(x)-.085*W,.055)*G_(y-.47,.06);dz+=-.006*f*G_(x,.012)*G_(y-.47,.1);if(z<0)dz-=.012*G_(Math.abs(x)-.09*W,.07)*G_(y-.42,.1);return[0,0,dz*sc]})}
function sculptHead(o){var g=new T.SphereGeometry(1,80,60),p=g.attributes.position,n=p.count,col=new Float32Array(n*3);
 var C=function(h){return new T.Color(h)},sk=C(o.skin),hair=C(o.hair),lipC=sk.clone().lerp(C('#8a3a3c'),.55),blush=sk.clone().lerp(C('#c85a4c'),.35),dark=sk.clone().multiplyScalar(.74),jaw=(o.jaw||1.14)-1;
 var beard=!!o.beard,stub=!!(o.stubble||o.beard);
 for(var i=0;i<n;i++){var ux=p.getX(i),uy=p.getY(i),uz=p.getZ(i),x=ux*.146,y=uy*.172,z=uz*.158;var fr=SS_(-.05,.5,uz);
  x*=1-.3*SS_(.0,1,-uy-.15)*1; x*=1+jaw*.5*G_(uy+.5,.2);
  z+=.02*fr*G_(uy+.78,.2)*G_(ux,.5);
  var ax=Math.abs(x),dz=0;
  dz+=.024*G_(x,.012)*G_(y+.02,.034)+.03*G_(x,.016)*G_(y+.05,.015)+.007*G_(ax-.02,.009)*G_(y+.055,.012);
  dz+=.02*G_(ax-.05,.05)*G_(y-.045,.013)*(1-.5*G_(x,.015));
  dz-=.015*G_(ax-.055,.025)*G_(y-.012,.02);
  dz+=.009*G_(ax-.085,.024)*G_(y+.02,.024)-.008*G_(ax-.078,.024)*G_(y+.075,.03);
  dz+=.011*G_(x,.027)*G_(y+.082,.009)+.012*G_(x,.025)*G_(y+.103,.011)-.007*G_(x,.03)*G_(y+.0925,.0035);
  dz+=.013*G_(x,.024)*G_(y+.135,.02);
  dz+=.006*G_(ax-.1,.025)*G_(y+.065,.04)*(1+jaw*2);
  var bm=0;if(stub||beard){bm=fr*SS_(-.032,-.075,y)*(1-.92*G_(x,.034)*G_(y+.0925,.0155))*SS_(.14,.1,ax)*SS_(-.19,-.15,y);bm=Math.max(bm,fr*G_(x,.03)*G_(y+.066,.012)*.8);bm=Math.max(bm,SS_(.06,.04,ax)*0+fr*SS_(.12,.13,ax)*SS_(-.04,.0,y)*SS_(.05,-.05,y)*.7);if(beard){dz+=.004*bm}}
  var nx=ux,ny=uy,nz=uz;p.setXYZ(i,x+nx*0,y,z+dz*(fr>0?1:0)+(dz<0?0:0));
  var c=sk.clone(),b2=fr*G_(ax-.085,.03)*G_(y+.04,.04);c.lerp(blush,.5*b2);c.lerp(blush,.25*fr*G_(x,.012)*G_(y+.05,.016));
  c.lerp(dark,.4*fr*G_(ax-.055,.028)*G_(y-.01,.022));c.lerp(lipC,Math.min(1,fr*(G_(x,.027)*G_(y+.082,.007)+G_(x,.025)*G_(y+.103,.009))*1.2));
  c.lerp(dark,.5*fr*G_(x,.03)*G_(y+.0925,.0028));
  var br=fr*G_(ax-.056,.03)*G_(y-.047,.008);c.lerp(hair,Math.min(.92,br*1.4));
  c.lerp(hair,bm*(beard?.9:.5));
  if(uy<-.55&&uz<.2)c.multiplyScalar(.85);
  c.convertSRGBToLinear();col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
 g.setAttribute('color',new T.BufferAttribute(col,3));g.computeVertexNormals();return g}
function makeChar(o){
 var g=new T.Group(),skin=std(o.skin,{roughness:.55}),skinD=std(new T.Color(o.skin).multiplyScalar(.82).getStyle(),{roughness:.6});
 var hips=new T.Group();hips.position.y=.95;g.add(hips);
 var torso=new T.Group();torso.position.y=.02;hips.add(torso);
 var top=std(o.top,{roughness:.88}),bot=std(o.bot,{roughness:.9}),shoe=std(o.shoe||'#f4f1ff',{roughness:.5}),sole=std('#efe8de',{roughness:.7});
 var W_=o.w||1.0;var bgeo=torsoGeo(W_,1),topB=top;if(o.pat&&o.top2){patternGeo(bgeo,o.top,o.top2,o.pat);topB=std('#ffffff',{roughness:.88,vertexColors:true})}var body=mesh(bgeo,topB,0,0,0,torso);
 // clothing detail: hem band, chest seams
 var pel=mesh(loft([[-.13,.12*W_,.095],[-.06,.16*W_,.108],[.04,.162*W_,.108],[.12,.15*W_,.1]],30),bot,0,0,0,torso);var bt=mesh(new T.TorusGeometry(.157,.014,6,26),std(o.belt||'#2a2420',{roughness:.6}),0,.05,0,torso);bt.rotation.x=Math.PI/2;bt.scale.set(W_*1.04,.7,1);
 mesh(rbox(.04,.035,.01,.008,2),std('#c9a77a',{metalness:.6,roughness:.3}),0,0,.15,torso);
 if(o.jacket){var jk=mesh(torsoGeo(W_,1.07),std(o.jacket,{roughness:.85}),0,.0,0,torso);mesh(rbox(.012,.62,.01,.004,2),std(new T.Color(o.jacket).multiplyScalar(.5).getStyle()),0,.38,.134,torso);
  [-1,1].forEach(function(s){mesh(rbox(.04,.1,.02,.01,2),std(o.jacket),s*.07,.7,.14,torso).rotation.z=s*.4})}
 if(o.hoodie){var hd=mesh(new T.TorusGeometry(.14,.075,10,18),top,0,.68,-.045,torso);hd.rotation.x=Math.PI/2.5;hd.scale.set(1.15,1,1);[-1,1].forEach(function(s){mesh(new T.CylinderGeometry(.008,.008,.2,5),std('#f4f1ff'),s*.04,.5,.15,torso)})}
 if(o.collar){[-1,1].forEach(function(s){var cl=mesh(rbox(.08,.05,.02,.01,2),std(o.collar),s*.05,.7,.14,torso);cl.rotation.z=s*.7});mesh(new T.TorusGeometry(.1,.025,6,16),std(o.collar),0,.7,-.01,torso).rotation.x=Math.PI/2}
 if(o.scarf){var sc1=mesh(new T.TorusGeometry(.14,.06,10,20),std(o.scarf[0],{roughness:.95}),0,.72,0,torso);sc1.rotation.x=Math.PI/2;sc1.scale.set(1.15,1,1);var tl=mesh(rbox(.1,.42,.04,.02,2),std(o.scarf[0],{roughness:.95}),.1,.5,.14,torso);tl.rotation.z=.08;[.44,.5,.36].forEach(function(y,i){mesh(rbox(.102,.04,.044,.015,2),std(o.scarf[1],{roughness:.95}),.1,y,.14,torso).rotation.z=.08});for(var i=0;i<5;i++)mesh(new T.CylinderGeometry(.006,.006,.05,4),std(o.scarf[0]),.06+i*.02,.27,.145,torso)}
 if(o.apron){mesh(rbox(.36,.5,.04,.02,2),std(o.apron),0,.24,.14,torso);mesh(rbox(.14,.12,.03,.01,2),std(new T.Color(o.apron).multiplyScalar(.85).getStyle()),0,.18,.165,torso);[-1,1].forEach(function(s){mesh(new T.CylinderGeometry(.008,.008,.46,4),std(o.apron),s*.1,.5,.06,torso).rotation.z=s*-.3})}
 if(o.pack){mesh(rbox(.3,.38,.16,.06,3),std(o.pack),0,.35,-.2,torso)}
 if(o.bag){var bs=mesh(rbox(.2,.22,.08,.03,3),std(o.bag),-.2,.1,.1,torso);var st=mesh(new T.CylinderGeometry(.008,.008,.62,4),std(o.bag),-.06,.45,.1,torso);st.rotation.z=.6}
 if(o.necklace)mesh(new T.TorusGeometry(.085,.006,6,16),std('#d8c8a8',{metalness:.7,roughness:.3}),0,.66,.1,torso).rotation.x=Math.PI/2.4;
 // neck + head
 mesh(new T.CylinderGeometry(.066,.08,.17,14),skinD,0,.8,0,torso);
 var head=new T.Group();head.position.set(0,.82,0);head.scale.setScalar(.86);torso.add(head);
 var hs_=o.head||1;
 var sk=mesh(sculptHead(o),std('#ffffff',{vertexColors:true,roughness:.6}),0,.13,0,head);sk.receiveShadow=false;
 [-1,1].forEach(function(s){var ear=mesh(new T.SphereGeometry(.036,10,8),skin,s*.15,.12,-.01,head);ear.scale.set(.45,1,.9);mesh(new T.SphereGeometry(.02,8,6),skinD,s*.158,.12,0,head).scale.set(.3,.9,.7);if(o.earring)mesh(new T.SphereGeometry(.014,8,6),std('#d8c8a8',{metalness:.7,roughness:.2}),s*.155,.075,0,head)});
 // nose: bridge + tip + nostrils

 var eyes=[];[-1,1].forEach(function(s){var e=new T.Group();e.position.set(s*.058,.14,.132);head.add(e);
  e.scale.setScalar(o.eyeS||.62);var w=mesh(new T.SphereGeometry(.04,14,12),std('#fbfaf8',{roughness:.25}),0,0,0,e);w.scale.set(1,.9,.6);
  var ir=mesh(new T.SphereGeometry(.027,14,12),std(o.eye||'#3a2a1c',{roughness:.25}),0,0,.014,e);ir.scale.set(1,1,.5);
  var rg=mesh(new T.TorusGeometry(.026,.003,6,16),std(new T.Color(o.eye||'#3a2a1c').multiplyScalar(.5).getStyle()),0,0,.027,e);
  var pu=mesh(new T.SphereGeometry(.013,8,6),std('#0a0808'),0,0,.025,e);pu.scale.z=.4;
  mesh(new T.SphereGeometry(.0075,6,5),new T.MeshBasicMaterial({color:'#fff'}),.011,.011,.032,e);mesh(new T.SphereGeometry(.004,6,5),new T.MeshBasicMaterial({color:'#fff'}),-.008,-.01,.031,e);
  var ul=mesh(new T.SphereGeometry(.043,14,8,0,6.3,0,1.05),skinD,0,.002,.0,e);ul.scale.set(1,1.05,.66);ul.rotation.x=-.25;
  if(o.lash){var lh=mesh(rbox(.05,.006,.012,.003,2),std('#1a1210'),0,.038,.02,e);lh.rotation.z=-s*.2}
  var br=mesh(rbox(.074,.024,.03,.01,2),std(o.brow||o.hair,{roughness:.8}),s*.058,.2,.14,head);br.rotation.z=-s*(o.mood==='sad'?-.25:(o.mood==='soft'?.12:-.2));eyes.push({e:e})});
 [-1,1].forEach(function(s){var ch=mesh(new T.SphereGeometry(.03,10,8),std('#ee8a7a',{transparent:true,opacity:0,roughness:1}),s*.09,.07,.123,head);ch.scale.z=.3;ch.castShadow=false});
 var mouth=new T.Group();mouth.position.set(0,.0375,.142);head.add(mouth);
 var ml=mesh(new T.SphereGeometry(.024,12,8),new T.MeshBasicMaterial({color:'#2a0c10'}),0,0,0,mouth);ml.scale.set(1,.1,.28);ml.castShadow=false;var teeth=mesh(rbox(.04,.008,.01,.003,2),std('#fbfaf8'),0,-.002,-.002,mouth);
 // hair
 var hm=std(o.hair,{roughness:.5}),hr=new T.Group();hr.scale.set(1.06,1.1,1.06);hr.position.y=-.014;head.add(hr);
 function hs(r,x,y,z,sx,sy,sz){var m=mesh(new T.SphereGeometry(r,16,12),hm,x,y,z,hr);m.scale.set(sx||1,sy||1,sz||1);return m}
 function lock(x,y,z,len,rx,rz){var m=mesh(capsule(.03,len,6),hm,x,y,z,hr);m.rotation.set(rx||0,0,rz||0);return m}
 var st=o.style||'short';
 if(st==='short'){hs(.165,0,.185,-.02,1.01,.8,1.05);hs(.075,.07,.29,.1,1.4,.7,1);hs(.075,-.06,.28,.11,1.3,.7,1);hs(.065,0,.3,.04,1.4,.7,1);lock(.14,.1,.04,.05,0,0);lock(-.14,.1,.04,.05,0,0);hs(.05,.11,.22,.09,1,1.2,1);hs(.05,-.11,.22,.09,1,1.2,1)}
 else if(st==='spiky'){hs(.165,0,.17,-.02,1,.82,1.07);for(var i=0;i<9;i++){var sp=mesh(new T.ConeGeometry(.038,.13,7),hm,Math.cos(i*.7)*.09,.3,Math.sin(i*.7)*.075,hr);sp.rotation.set(Math.sin(i*.7)*.6,0,-Math.cos(i*.7)*.6)}hs(.05,.1,.2,.1,1,1.2,1);hs(.05,-.1,.2,.1,1,1.2,1)}
 else if(st==='bun'){hs(.165,0,.17,-.012,1,.88,1.07);hs(.065,0,.35,-.04,1,1,1);hs(.1,0,.34,-.07,1,1,1);var bn=mesh(new T.TorusGeometry(.08,.012,6,16),std(o.band||'#e0364e'),0,.33,-.07,hr);hs(.06,.07,.28,.1,1.4,.7,1);hs(.045,-.1,.2,.09,1,1.3,1);hs(.045,.1,.2,.09,1,1.3,1)}
 else if(st==='long'){hs(.168,0,.17,-.015,1,.9,1.1);var lg=mesh(capsule(.13,.4,14),hm,0,-.06,-.075,hr);lg.scale.set(1.2,1,.62);[-1,1].forEach(function(s){var sd=mesh(capsule(.04,.28,8),hm,s*.14,.04,.02,hr);sd.scale.set(1,1,1.3)});hs(.075,.07,.29,.1,1.4,.7,1);hs(.06,-.06,.28,.1,1.3,.7,1)}
 else if(st==='curly'){for(i=0;i<30;i++){var a=rnd()*6.28,bb=rnd()*1.35;hs(rr(.04,.065),Math.cos(a)*Math.sin(bb)*.15,.15+Math.cos(bb)*.16,Math.sin(a)*Math.sin(bb)*.15-.02,1,1,1)}}
 else if(st==='buzz'){hs(.157,0,.17,-.015,1.01,.82,1.05)}
 else if(st==='bald'){}
 else if(st==='slick'){hs(.166,0,.18,-.02,1.01,.84,1.08);hs(.07,0,.29,.02,1.5,.55,1.3);lock(0,.12,-.14,.1,.4,0)}
 else if(st==='pony'){hs(.165,0,.17,-.012,1,.88,1.07);var pn=mesh(capsule(.05,.26,10),hm,0,.12,-.2,hr);pn.rotation.x=-.55;hs(.065,.07,.29,.1,1.4,.7,1);mesh(new T.TorusGeometry(.05,.01,6,12),std(o.band||'#e0364e'),0,.2,-.16,hr).rotation.x=1}
 if(o.flower){var fl=new T.Group();fl.position.set(.1,.27,.06);hr.add(fl);for(i=0;i<5;i++)mesh(new T.SphereGeometry(.022,8,6),std('#ff9ec8'),Math.cos(i*1.26)*.028,Math.sin(i*1.26)*.028,0,fl);mesh(new T.SphereGeometry(.013,8,6),std('#f4f1ff'),0,0,.01,fl)}
 if(o.beanie){var bn=mesh(new T.SphereGeometry(.168,18,12,0,6.3,0,Math.PI/2),std(o.beanie,{roughness:.95}),0,.18,-.005,head);bn.scale.set(1,.95,1.07);var cf=mesh(new T.TorusGeometry(.155,.03,8,22),std(new T.Color(o.beanie).multiplyScalar(.85).getStyle(),{roughness:.95}),0,.2,0,head);cf.rotation.x=Math.PI/2;cf.scale.set(1.02,1.07,1)}
 if(o.cap){var cp=mesh(new T.SphereGeometry(.17,18,12,0,6.3,0,Math.PI/2),std(o.cap),0,.19,-.005,head);cp.scale.set(1,.9,1.07);var bi=mesh(rbox(.2,.02,.12,.012,2),std(o.cap),0,.2,.18,head);bi.rotation.x=.12;mesh(new T.SphereGeometry(.015,6,5),std('#f4f1ff'),0,.33,0,head)}
 if(o.glasses){[-1,1].forEach(function(s){mesh(new T.TorusGeometry(.049,.0045,6,20),std('#6a5a50',{metalness:.5}),s*.058,.14,.155,head)});mesh(rbox(.04,.006,.006,.002,2),std('#2a2a30'),0,.145,.155,head);[-1,1].forEach(function(s){mesh(new T.CylinderGeometry(.004,.004,.14,4),std('#2a2a30'),s*.105,.14,.085,head).rotation.x=Math.PI/2})}

 // arms: upper (sleeve) + forearm (skin or sleeve) + hand with thumb
 var arms=[-1,1].map(function(s){var sh=new T.Group();sh.position.set(s*.31*W_,.64,0);torso.add(sh);var UA=[[.05,.07],[.0,.078],[-.08,.074],[-.17,.064],[-.28,.052]];mesh(new T.SphereGeometry(.082,16,12),o.jacket?std(o.jacket,{roughness:.85}):top,0,-.005,0,sh);mesh(loft(UA,22),o.jacket?std(o.jacket,{roughness:.85}):top,0,0,0,sh);mesh(new T.SphereGeometry(.05,12,10),o.long||o.jacket?(o.jacket?std(o.jacket):top):skin,0,-.285,0,sh);var el=new T.Group();el.position.y=-.27;sh.add(el);var fa=mesh(loft([[.02,.044],[-.05,.054],[-.14,.047],[-.27,.034]],20),o.long?top:(o.tat?std(o.skin,{map:tatTex(o.skin),roughness:.55}):skin),0,0,0,el);
  var hand=new T.Group();hand.position.y=-.27;el.add(hand);var pm=mesh(rbox(.082,.09,.045,.022,3),skin,0,-.04,0,hand);var th=mesh(capsule(.015,.04,8),skin,s*-.046,-.035,.02,hand);th.rotation.z=s*.35;th.rotation.x=-.5;for(var f=0;f<4;f++){var fk=new T.Group();fk.position.set((f-1.5)*.02,-.085,.018);hand.add(fk);var p1=mesh(capsule(.011,.03,8),skin,0,-.016,0,fk);fk.rotation.x=-1.25;var f2=new T.Group();f2.position.y=-.034;fk.add(f2);mesh(capsule(.0105,.026,8),skin,0,-.014,0,f2);f2.rotation.x=-1.5}
  if(o.watch&&s===1)mesh(new T.TorusGeometry(.046,.01,6,14),std('#3a3a44',{metalness:.5}),0,-.2,0,el).rotation.x=Math.PI/2;
  return{sh:sh,el:el,hand:hand}});
 // legs
 var legs=[-1,1].map(function(s){var h=new T.Group();h.position.set(s*.095,-.02,0);hips.add(h);mesh(loft([[.04,.11],[-.1,.1],[-.26,.085],[-.47,.066]],24),bot,0,0,0,h);var kn=new T.Group();kn.position.y=-.47;h.add(kn);mesh(new T.SphereGeometry(.068,12,10),bot,0,0,0,kn);mesh(loft([[.0,.067],[-.1,.07],[-.24,.055],[-.43,.042]],22),bot,0,0,0,kn);
  var ft=new T.Group();ft.position.set(0,-.43,.05);kn.add(ft);mesh(rbox(.125,.065,.27,.03,3),shoe,0,.03,0,ft);mesh(rbox(.13,.03,.285,.012,2),sole,0,-.012,0,ft);mesh(rbox(.06,.03,.07,.012,2),shoe,0,.08,-.03,ft);mesh(rbox(.05,.012,.09,.005,2),std('#f4f1ff'),0,.065,.05,ft);
  return{h:h,kn:kn}});
 if(o.skirt){var sk3=mesh(new T.CylinderGeometry(.17,.31,.36,22,1,true),std(o.skirt,{side:T.DoubleSide,roughness:.9}),0,-.06,0,hips);for(var q=0;q<10;q++){var a2=q/10*6.28;mesh(rbox(.012,.34,.01,.004,2),std(new T.Color(o.skirt).multiplyScalar(.8).getStyle()),Math.cos(a2)*.25,-.06,Math.sin(a2)*.25,hips).rotation.y=-a2}}
 if(o.stripe){legs.forEach(function(l){mesh(rbox(.012,.62,.02,.004,2),std('#f4f1ff'),.07*(l===legs[0]?-1:1)*(-1),-.28,.0,l.h).position.x=(l===legs[0]?-1:1)*.078})}
 if(o.sc2){var sb=mesh(rbox(.34,.14,.01,.004,2),std(o.sc2[0],{roughness:.95,side:T.DoubleSide}),0,.0,0,torso);sb.visible=false;g.userData.scarfBand=sb}
 // contact shadow
 var cs=new T.Mesh(new T.CircleGeometry(.4,20),new T.MeshBasicMaterial({color:'#2a1a2a',transparent:true,opacity:.28,depthWrite:false}));cs.rotation.x=-Math.PI/2;cs.position.y=.012;cs.renderOrder=1;g.add(cs);
 g.scale.setScalar((o.s||1));g.userData={hips:hips,torso:torso,head:head,arms:arms,legs:legs,eyes:eyes,mouth:mouth,o:o,ph:rnd()*6,blink:2+rnd()*3};
 g.position.set(o.x,0,o.z);g.rotation.y=o.ry||0;world.add(g);anim.chars.push(g);return g}
function animChar(g,t,dt){var u=g.userData,o=u.o,m=o.mode||'idle',ph=u.ph;var T_=t+ph;
 u.torso.scale.y=1+Math.sin(T_*1.7)*.012;
 var ar=u.arms,lg=u.legs;
 if(m==='walk'){var sp=o.spd||1.1;o._d=(o._d||0)+dt*sp;var w=T_*5.2*sp/1.1;lg[0].h.rotation.x=Math.sin(w)*.55;lg[1].h.rotation.x=-Math.sin(w)*.55;lg[0].kn.rotation.x=Math.max(0,-Math.sin(w+.6))*.9;lg[1].kn.rotation.x=Math.max(0,Math.sin(w+.6))*.9;ar[0].sh.rotation.x=-Math.sin(w)*.5;ar[1].sh.rotation.x=Math.sin(w)*.5;u.hips.position.y=.95+Math.abs(Math.sin(w))*.035;u.torso.rotation.y=Math.sin(w)*.08;
  var A=o.path,L=o._len||(o._len=Math.hypot(A[1][0]-A[0][0],A[1][1]-A[0][1])),k=(o._d%(L*2));var f=k<L?k/L:2-k/L;g.position.x=A[0][0]+(A[1][0]-A[0][0])*f;g.position.z=A[0][1]+(A[1][1]-A[0][1])*f;var dir=k<L?1:-1;g.rotation.y=Math.atan2((A[1][0]-A[0][0])*dir,(A[1][1]-A[0][1])*dir)}
 else if(m==='ctrl'){var sv=o.sv||0,w2=o.sw||0;if(sv>.02){lg[0].h.rotation.x=Math.sin(w2)*.58*sv;lg[1].h.rotation.x=-Math.sin(w2)*.58*sv;lg[0].kn.rotation.x=Math.max(0,-Math.sin(w2+.6))*.9*sv;lg[1].kn.rotation.x=Math.max(0,Math.sin(w2+.6))*.9*sv;ar[0].sh.rotation.x=-Math.sin(w2)*.5*sv;ar[1].sh.rotation.x=Math.sin(w2)*.5*sv;u.hips.position.y=.95+Math.abs(Math.sin(w2))*.035*sv;u.torso.rotation.y=Math.sin(w2)*.08*sv;u.head.rotation.y=o.look||0;u.mouth.scale.y=1}else{lg[0].h.rotation.x=lg[1].h.rotation.x=lg[0].kn.rotation.x=lg[1].kn.rotation.x=0;u.hips.position.y=.95;u.torso.rotation.y=0;ar[0].sh.rotation.x=Math.sin(T_*1.2)*.04;ar[1].sh.rotation.x=-Math.sin(T_*1.2)*.04;u.head.rotation.y=Math.sin(T_*.4)*.2+(o.look||0);u.mouth.scale.y=1}}
 else if(m==='talk'){ar[0].sh.rotation.x=-.2+Math.sin(T_*2.3)*.1;var gx=Math.max(0,Math.sin(T_*1.1));ar[1].sh.rotation.x=-.6-gx*.9;ar[1].el.rotation.x=-.8-gx*.5;ar[1].sh.rotation.z=-.15;u.head.rotation.x=Math.sin(T_*2.4)*.05;u.head.rotation.y=Math.sin(T_*.7)*.18+(o.look||0);u.mouth.scale.y=.5+Math.abs(Math.sin(T_*9))*1.3;u.torso.rotation.y=Math.sin(T_*.6)*.08}
 else if(m==='listen'){ar[0].sh.rotation.x=-.1;ar[1].sh.rotation.x=-.1;u.head.rotation.y=(o.look||0)+Math.sin(T_*.5)*.05;u.head.rotation.x=Math.max(0,Math.sin(T_*1.1))*.12;u.mouth.scale.y=1}
 else if(m==='cheer'){var c=Math.sin(T_*6);ar[0].sh.rotation.x=-2.6+c*.3;ar[1].sh.rotation.x=-2.6-c*.3;ar[0].sh.rotation.z=.25;ar[1].sh.rotation.z=-.25;u.hips.position.y=.95+Math.abs(c)*.07;u.mouth.scale.y=2.2;u.head.rotation.x=-.12}
 else if(m==='cross'){ar[0].sh.rotation.x=-.9;ar[1].sh.rotation.x=-.9;ar[0].el.rotation.x=-1.6;ar[1].el.rotation.x=-1.6;ar[0].sh.rotation.z=-.5;ar[1].sh.rotation.z=.5;u.head.rotation.y=(o.look||0)+Math.sin(T_*.35)*.15;u.head.rotation.x=-.05}
 else if(m==='flare'){var fz=Math.sin(T_*1.4)*.12;ar[1].sh.rotation.x=-2.7+fz;ar[1].sh.rotation.z=-.3;ar[0].sh.rotation.x=-.3;u.head.rotation.x=-.25;u.head.rotation.y=Math.sin(T_*.5)*.2;u.mouth.scale.y=2;u.hips.position.y=.95+Math.max(0,Math.sin(T_*3))*.02}
 else if(m==='sing'){var c2=Math.sin(T_*4);ar[0].sh.rotation.x=-2.5+c2*.15;ar[1].sh.rotation.x=-2.5-c2*.15;ar[0].sh.rotation.z=.35;ar[1].sh.rotation.z=-.35;u.torso.rotation.z=Math.sin(T_*2)*.06;u.head.rotation.x=-.3;u.mouth.scale.y=2.4;u.hips.position.y=.95+Math.abs(Math.sin(T_*2))*.03}
 else if(m==='lean'){u.torso.rotation.z=.08;ar[0].sh.rotation.x=-.2;ar[1].sh.rotation.x=-.5;ar[1].el.rotation.x=-1.4;u.head.rotation.y=(o.look||0);u.head.rotation.x=.05;lg[0].h.rotation.z=.15}
 else if(m==='sit'){lg[0].h.rotation.x=lg[1].h.rotation.x=-1.5;lg[0].kn.rotation.x=lg[1].kn.rotation.x=1.5;u.hips.position.y=.55;ar[0].sh.rotation.x=ar[1].sh.rotation.x=-.9;ar[0].el.rotation.x=ar[1].el.rotation.x=-1.0;u.head.rotation.x=.35+Math.sin(T_*.6)*.04;u.head.rotation.y=Math.sin(T_*.3)*.1}
 else if(m==='arrange'){var b=Math.sin(T_*1.4);ar[0].sh.rotation.x=-.9+b*.2;ar[1].sh.rotation.x=-1.1-b*.2;ar[0].el.rotation.x=-.6;ar[1].el.rotation.x=-.6;u.torso.rotation.x=.35;u.head.rotation.x=.2;u.head.rotation.y=Math.sin(T_*.7)*.3}
 else {ar[0].sh.rotation.x=Math.sin(T_*1.2)*.04;ar[1].sh.rotation.x=-Math.sin(T_*1.2)*.04;u.head.rotation.y=Math.sin(T_*.4)*.25+(o.look||0);u.mouth.scale.y=1}
 u.blink-=dt;if(u.blink<0){u.blink=2+rnd()*4;u._bl=.12}if(u._bl>0){u._bl-=dt;u.eyes.forEach(function(e){e.e.scale.y=.1})}else u.eyes.forEach(function(e){e.e.scale.y=1})}


/* ================= room manager ================= */
var U=.27,extras=[],conv=new WeakSet(),TT=0,cur=null;
var RM={defs:{},def:function(id,o){RM.defs[id]=o},ids:function(){return Object.keys(RM.defs)}};
function L3(h){var c=new T.Color(h);c.convertSRGBToLinear();return c}
function addX(o,par){(par||sc).add(o);extras.push(o);return o}
function clearRoom(){while(world.children.length){var o=world.children[0];world.remove(o)}extras.forEach(function(o){if(o.parent)o.parent.remove(o)});extras=[];anim.sway=[];anim.glow=[];anim.chars=[];anim.flares=[];anim.flags=[];anim.cars=[];anim.smoke=[];anim.tick=[];sc.fog=null;sc.background=new T.Color('#080c22').convertSRGBToLinear()}
function skyDome(kind){var P={night:['#050914','#141a3a','#3a2650'],dusk:['#0c1230','#3a2a5e','#c4603a'],day:['#4a8ad8','#8ec0ec','#f4e6d0'],indoor:['#0a0a10','#0a0a10','#0a0a10'],overcast:['#6a7080','#9aa0ac','#c8c8c8']}[kind||'night'];
 var d=new T.Mesh(new T.SphereGeometry(90,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:L3(P[0])},mid:{value:L3(P[1])},hor:{value:L3(P[2])}},vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 top,mid,hor;void main(){float y=clamp(p.y,0.,1.);vec3 c=mix(hor,mid,smoothstep(0.,.25,y));c=mix(c,top,smoothstep(.2,.8,y));gl_FragColor=vec4(c,1.);}'}));d.position.y=0;addX(d);return d}
function mkctx(def,geo,o){var g=new T.Group();g.scale.setScalar(U);world.add(g);
 var c={T:T,Q:Q,g:g,world:world,geo:geo,o:o||{},U:U,skin:(o&&o.skinSet)||{name:(o&&o.club)||'FC',c1:'#d8283e',c2:'#f4f1ff',c3:'#14141c'},
  std:std,mesh:mesh,rbox:rbox,capsule:capsule,loft:loft,cvs:cvs,tex:tex,paint:paint,wall:wall,brick:brick,planks:planks,cobble:cobble,stripes:stripes,sign:sign,chalk:chalk,rrect:rrect,rnd:rnd,rr:rr,glowTex:glowTex,
  concrete:concrete,asphalt:asphalt,graffiti:graffiti,rollerShutter:rollerShutter,lamp:lamp,car:car,banner:banner,dumpster:dumpster,flare:flare,SK:SK,anim:anim,
  m:function(v){return v*U},
  /** metre position of a room-unit point */
  P:function(x,z){return[x*U,z*U]},
  slot:function(n){return geo&&geo.slots&&geo.slots[n]},
  spot:function(n){return geo&&geo.spots&&geo.spots[n]},
  person:function(po,slot){var s=typeof slot==='string'?(geo.slots[slot]):slot;if(s){po.x=s.x*U;po.z=s.z*U;po.ry=po.ry!==undefined?po.ry:(s.yaw||0)}if(!po.skin)po.skin=SK[Math.floor(rnd()*5)];var ch=makeChar(po);ch.scale.multiplyScalar(1.0);if(cur&&cur.decor)cur.decor.push(ch);return ch},
  light:function(type,col,int,x,y,z,dist,decay){var l;if(type==='point'){l=new T.PointLight(col,int,dist||12,decay||1.8);l.position.set(x,y,z)}else if(type==='dir'){l=new T.DirectionalLight(col,int);l.position.set(x,y,z)}else if(type==='hemi'){l=new T.HemisphereLight(col,dist||'#202030',int)}else if(type==='spot'){l=new T.SpotLight(col,int,dist||14,.7,.5,1.6);l.position.set(x,y,z)}
   l.userData.lc=1;l.color.convertSRGBToLinear();if(l.groundColor)l.groundColor.convertSRGBToLinear();addX(l);return l},
  shadows:function(l,ext){l.castShadow=true;var ms=QL==='high'?2048:QL==='med'?1024:512;l.shadow.mapSize.set(ms,ms);var s=l.shadow.camera;ext=ext||8;s.left=-ext;s.right=ext;s.top=ext;s.bottom=-ext;s.near=1;s.far=60;l.shadow.bias=-.0004;l.shadow.normalBias=.03},
  fog:function(h,n,f){sc.fog=new T.Fog(h,n,f);sc.fog.color.convertSRGBToLinear()},
  sky:skyDome,add:addX,
  tick:function(fn){anim.tick.push(fn)},
  cam:null,setCam:function(px,py,pz,lx,ly,lz,fov,fovP){c.cam={p:[px,py,pz],l:[lx,ly,lz],fov:fov||38,fovP:fovP||fov||52}},
  /** the standard indoor shell: floor, back wall, left wall, optional right wall; room units */
  shell:function(o){o=o||{};var W=24,D=14,H=o.h||9,w0=geo&&geo.walk?geo.walk:[.5,1,23.5,12.5];
   var fl=mesh(new T.BoxGeometry(W+1,.6,D+11),std('#fff',{map:o.floorMap||planks(4),roughness:.7}),W/2,-.3,D/2+5,g);fl.castShadow=false;if(fl.material.map){fl.material.emissiveMap=fl.material.map;fl.material.emissive=new T.Color(.22,.2,.19)}
   var bw=mesh(new T.BoxGeometry(W+1,H,.6),std('#fff',{map:o.wallMap||wall(o.wall||'#e8dcc8',['#d8c8b0','#f0e6d4','#cdbba0'],3,1.5),roughness:.95}),W/2,H/2,-.3,g);
   var lw=mesh(new T.BoxGeometry(.6,H,D+.6),std('#fff',{map:o.wallMap||wall(o.wall2||o.wall||'#e8dcc8',['#d8c8b0','#f0e6d4','#cdbba0'],3,1.5),roughness:.95}),-.3,H/2,D/2,g);
   if(o.right){var rw=mesh(new T.BoxGeometry(.6,H,D+.6),std('#fff',{map:o.wallMap||wall(o.wall2||o.wall||'#e8dcc8',['#d8c8b0','#f0e6d4','#cdbba0'],3,1.5),roughness:.95}),W+.3,H/2,D/2,g)}
   var sk=mesh(rbox(W+1,.5,.4,.05,2),std(o.skirt||'#f4f1ff',{roughness:.7}),W/2,.25,.2,g);return{fl:fl,bw:bw,lw:lw}},
 };
 return c}
RM.load=function(id,opts){opts=opts||{};var def=RM.defs[id];if(!def)throw new Error('no room '+id);clearRoom();cur={id:id,def:def,decor:[]};
 var geo=(window.ROOMGEO&&window.ROOMGEO[def.geo||id])||null;var c=mkctx(def,geo,opts);
 sc.background=new T.Color('#080c22').convertSRGBToLinear();
 def.build(c);
 sc.traverse(function(o){var ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(function(m){if(conv.has(m))return;conv.add(m);if(m.isShaderMaterial)return;if(m.color)m.color.convertSRGBToLinear();if(m.emissive)m.emissive.convertSRGBToLinear()})});
 cur.cam=c.cam||{p:[12*U,3.4,9.2],l:[12*U,1.2,1.2],fov:38,fovP:56};size();return c};
var VW={top:.8,bottom:-.4,fx:0,zoom:1,fov:null,on:false};
function size(){var W=innerWidth,H=innerHeight;ren.setSize(W,H,false);var sx=VW.on?(VW.top-VW.bottom)/2:1,a=W/(H*sx);cam.aspect=a;var K=(cur&&cur.cam)||{p:[3,3.4,9],l:[3,1.2,1],fov:38,fovP:56};
 var fN=Q.get('face');if(fN!==null&&anim.chars[+fN]){var cc=anim.chars[+fN],h=new T.Vector3();cc.userData.head.getWorldPosition(h);var f=new T.Vector3(Math.sin(cc.rotation.y),0,Math.cos(cc.rotation.y));cam.fov=26;cam.position.set(h.x+f.x*2+.3,h.y+.05,h.z+f.z*2);cam.lookAt(h.x,h.y+.02,h.z);cam.updateProjectionMatrix();return}
 cam.fov=VW.fov||(a<.8?K.fovP:K.fov);var fx=VW.fx||0,zm=VW.zoom||1;cam.position.set(K.l[0]+fx+(K.p[0]-K.l[0])/zm,K.l[1]+(K.p[1]-K.l[1])/zm,K.l[2]+(K.p[2]-K.l[2])/zm);cam.lookAt(K.l[0]+fx,K.l[1],K.l[2]);
 if(VW.on){var c=(VW.top+VW.bottom)/2,fh=H*sx;cam.setViewOffset(W,fh,0,fh/2-H*(1-c)/2,W,H)}else cam.clearViewOffset();cam.updateProjectionMatrix()}
addEventListener('resize',size);
function step(dt){TT+=dt;var t=TT;anim.chars.forEach(function(c){animChar(c,t,dt)});anim.tick.forEach(function(f){f(t,dt)});
 anim.glow.forEach(function(s,i){s.material.opacity=(s.userData.b||(s.userData.b=s.material.opacity))*(1+Math.sin(t*3+i)*.06)});
 anim.flags.forEach(function(f){var p=f.g.attributes.position;if(!f.o0)f.o0=p.array.slice();for(var i=0;i<p.count;i++){var x=f.o0[i*3];p.array[i*3+2]=Math.sin(t*4+x*2.2+f.ph)*.2*(x/2+.4)}p.needsUpdate=true;f.g.computeVertexNormals()});
 anim.flares.forEach(function(F,i){F.pl.intensity=1+Math.sin(t*24+i)*.3;F.sp.material.opacity=.8+Math.sin(t*17+i)*.15;F.smoke.forEach(function(s){s.a=(s.a+dt*.5)%4;var k=s.a/4;s.s.position.set(F.x+Math.sin(s.a*3+i)*.3*k,F.y+k*3.2,F.z);s.s.material.opacity=Math.sin(Math.min(1,k)*3.14)*.25;s.s.scale.setScalar(.8+k*2.2)})})}
var post=(function(){var w=innerWidth,h=innerHeight,pr=ren.getPixelRatio();var rt=new T.WebGLMultisampleRenderTarget(w*pr,h*pr,{format:T.RGBAFormat,type:T.HalfFloatType});rt.samples=QL==='high'?4:QL==='med'?2:0;var b1=new T.WebGLRenderTarget(w*pr/4|0,h*pr/4|0,{type:T.HalfFloatType}),b2=b1.clone();
 var qs=new T.Scene(),qc=new T.OrthographicCamera(-1,1,1,-1,0,1),vs='varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}';
 var mb=new T.ShaderMaterial({uniforms:{t:{value:null},d:{value:new T.Vector2()},th:{value:1}},vertexShader:vs,fragmentShader:'varying vec2 v;uniform sampler2D t;uniform vec2 d;uniform float th;void main(){vec3 c=vec3(0.);float w[5];w[0]=.227;w[1]=.19;w[2]=.12;w[3]=.06;w[4]=.02;c=texture2D(t,v).rgb*w[0];for(int i=1;i<5;i++){vec3 a=texture2D(t,v+d*float(i)*1.6).rgb,b=texture2D(t,v-d*float(i)*1.6).rgb;c+=(a+b)*w[i];}gl_FragColor=vec4(c,1.);}'});
 var mt=new T.ShaderMaterial({uniforms:{t:{value:null}},vertexShader:vs,fragmentShader:'varying vec2 v;uniform sampler2D t;void main(){vec3 c=texture2D(t,v).rgb;float l=dot(c,vec3(.3,.59,.11));gl_FragColor=vec4(c*smoothstep(.9,1.8,l),1.);}'});
 var mc=new T.ShaderMaterial({uniforms:{t:{value:null},b:{value:null},px:{value:new T.Vector2(1/w,1/h)}},vertexShader:vs,fragmentShader:`varying vec2 v;uniform sampler2D t,b;
 vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
 void main(){vec3 c=texture2D(t,v).rgb+texture2D(b,v).rgb*.45;c*=1.0;vec3 m=aces(c);float l=dot(m,vec3(.3,.59,.11));m=mix(vec3(l),m,.78);m=max((m-.5)*1.12+.5,0.);m=mix(m,m*vec3(.98,.98,1.04),1.-smoothstep(.0,.45,l));m=mix(m,m*vec3(1.1,.98,.88),smoothstep(.4,.9,l));m+=smoothstep(.55,1.,l)*vec3(.02,.005,.01);m=pow(m,vec3(1./2.2));float vg=smoothstep(.95,.35,length(v-.5));m*=mix(.62,1.,vg);m+=(fract(sin(dot(v*900.,vec2(12.9898,78.233)))*43758.5453)-.5)*.012;gl_FragColor=vec4(m,1.);}`});
 var quad=new T.Mesh(new T.PlaneGeometry(2,2),mb);qs.add(quad);
 function pass(m,tgt){quad.material=m;ren.setRenderTarget(tgt);ren.render(qs,qc)}
 return{render:function(){var pr2=ren.getPixelRatio(),W=ren.domElement.width,H=ren.domElement.height;if(rt.width!==W||rt.height!==H){rt.setSize(W,H);b1.setSize(W/4|0,H/4|0);b2.setSize(W/4|0,H/4|0);mc.uniforms.px.value.set(1/W,1/H)}
  ren.toneMapping=T.NoToneMapping;ren.outputEncoding=T.LinearEncoding;ren.setRenderTarget(rt);ren.render(sc,cam);
  mt.uniforms.t.value=rt.texture;pass(mt,b1);mb.uniforms.t.value=b1.texture;mb.uniforms.d.value.set(1/b1.width,0);pass(mb,b2);mb.uniforms.t.value=b2.texture;mb.uniforms.d.value.set(0,1/b1.height);pass(mb,b1);
  mc.uniforms.t.value=rt.texture;mc.uniforms.b.value=b1.texture;pass(mc,null)}}})();


window.__sc=sc;window.RM=RM;var hooks=[];window.__town={step:step,render:function(){post.render()},ready:false,T:T,world:world,cam:cam,ren:ren,quality:QL,hooks:hooks,
 makeChar:makeChar,dropChar:function(g){if(g.parent)g.parent.remove(g);var i=anim.chars.indexOf(g);if(i>=0)anim.chars.splice(i,1)},
 cur:function(){return cur},U:U,
 view:function(top,bottom,fov){VW.top=top;VW.bottom=bottom;VW.fov=fov||null;VW.on=true;size()},
 bg:function(c0,c1){var c=cvs(4,256),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(0,0,4,256);var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;sc.background=t},
 follow:function(fx,zm){zm=zm||1;if(Math.abs(fx-VW.fx)>1e-4||zm!==VW.zoom){VW.fx=fx;VW.zoom=zm;size()}},
 camInfo:function(){var K=cur&&cur.cam;return K?{p:K.p,l:K.l,fov:cam.fov,aspect:cam.aspect}:null},
 screen:function(x,y,z){var v=new T.Vector3(x,y,z).project(cam),r=ren.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}},
 time:function(){return TT}};
var last=performance.now();function loop(n){var dt=Math.min(.05,(n-last)/1000);last=n;if(!window.__manual)step(dt);for(var i=0;i<hooks.length;i++)hooks[i](TT,dt);post.render();requestAnimationFrame(loop)}
window.__start=function(){var id=Q.get('room')||RM.ids()[0];if(!Q.get('play'))RM.load(id,{club:Q.get('club'),time:Q.get('time')});window.__town.ready=true;requestAnimationFrame(loop)};
})();
