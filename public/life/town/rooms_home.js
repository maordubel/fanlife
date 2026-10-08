/* rooms_home — AAA-ish procedural home/school/work rooms */
(function(){var RM=window.RM;var T=THREE,PI=Math.PI;
function lib(c){
var g=c.g,rnd=c.rnd,rr=c.rr,U=c.U,L={};
function C(w,h){return c.cvs(w,h)}function X(cv){return cv.getContext('2d')}
function hsl(h,s,l){return'hsl('+h+','+s+'%,'+l+'%)'}
function nz(x,w,h,a){var d=x.getImageData(0,0,w,h),p=d.data;for(var i=0;i<p.length;i+=4){var n=(rnd()-.5)*a;p[i]+=n;p[i+1]+=n;p[i+2]+=n}x.putImageData(d,0,0)}
L.C=C;L.X=X;L.nz=nz;L.hsl=hsl;L.PI=PI;
function M(col,o){o=o||{};var p={roughness:o.rough===undefined?.8:o.rough,metalness:o.metal||0};if(o.map)p.map=o.map;if(o.emis){p.emissive=o.emis;p.emissiveIntensity=o.ei||1}if(o.tr){p.transparent=true;p.opacity=o.op===undefined?.5:o.op;p.depthWrite=false}if(o.side)p.side=o.side;return c.std(col,p)}
L.M=M;
L.box=function(w,h,d,col,x,y,z,o){o=o||{};var r=o.r===undefined?Math.min(w,h,d)*.2:o.r;r=Math.max(.002,Math.min(r,Math.min(w,h,d)/2-.002));var m=c.mesh(c.rbox(w,h,d,r,o.s||3),o.mat||M(col,o),x,y+h/2,z,o.par||g);if(o.ry)m.rotation.y=o.ry;if(o.rx)m.rotation.x=o.rx;if(o.rz)m.rotation.z=o.rz;if(o.ns)m.castShadow=false;return m};
L.cyl=function(rt,rb,h,col,x,y,z,o){o=o||{};var m=c.mesh(new T.CylinderGeometry(rt,rb,h,o.seg||16),o.mat||M(col,o),x,y+h/2,z,o.par||g);if(o.rx)m.rotation.x=o.rx;if(o.rz)m.rotation.z=o.rz;if(o.ns)m.castShadow=false;return m};
L.sph=function(r,col,x,y,z,o){o=o||{};var m=c.mesh(new T.SphereGeometry(r,o.seg||14,o.seg2||10),o.mat||M(col,o),x,y,z,o.par||g);m.scale.set(o.sx||1,o.sy||1,o.sz||1);if(o.ns)m.castShadow=false;return m};
L.pl=function(w,h,mat,x,y,z,o){o=o||{};var m=new T.Mesh(new T.PlaneGeometry(w,h,o.sw||1,o.sh||1),mat);m.position.set(x,y,z);if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;m.receiveShadow=o.rs!==false;m.castShadow=!!o.cs;(o.par||g).add(m);return m};
L.grp=function(x,y,z,ry,par){var G=new T.Group();G.position.set(x,y,z);G.rotation.y=ry||0;(par||g).add(G);return G};
L.pt=function(col,int,x,y,z,dist){return c.light('point',col,int,x*U,y*U,z*U,dist||9)};
L.key=function(col,int,px,py,pz,tx,tz,ext){var s=c.light('dir',col,int,px,py,pz);s.target.position.set(tx,0,tz);c.add(s.target);c.shadows(s,ext||7);return s};
L.glow=function(x,y,z,col,sz,op,par){var sp=new T.Sprite(new T.SpriteMaterial({color:col,map:c.glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:op===undefined?.5:op,depthWrite:false}));sp.scale.set(sz,sz,1);sp.position.set(x,y,z);(par||g).add(sp);return sp};
/* ---------- textures ---------- */
L.woodTex=function(h,s,l,rows,rx,ry){var cv=C(512,512),x=X(cv),bh=512/rows;for(var i=0;i<rows;i++){x.fillStyle=hsl(h+rr(-3,3),s,l+rr(-5,5));x.fillRect(0,i*bh,512,bh);var jx=rnd()*512;x.fillStyle='rgba(30,16,8,.32)';x.fillRect(jx,i*bh,2,bh);if(rnd()<.5)x.fillRect((jx+256)%512,i*bh,2,bh);
 for(var k=0;k<12;k++){x.strokeStyle=rnd()<.6?'rgba(40,20,8,'+rr(.04,.08)+')':'rgba(255,225,205,'+rr(.03,.06)+')';x.lineWidth=rr(1,2.2);x.beginPath();var yy=i*bh+rr(2,bh-2);x.moveTo(0,yy);for(var q=1;q<=8;q++)x.lineTo(q*64,yy+Math.sin(q*1.3+i)*rr(.5,2.2));x.stroke()}
 x.fillStyle='rgba(20,10,4,.5)';x.fillRect(0,(i+1)*bh-2,512,2)}nz(x,512,512,8);c.weather(x,512,512,{mottle:.22,scale:.45,specks:900});return c.tex(cv,rx||1,ry||1)};
L.terrazzo=function(base,rx,ry){var cv=C(512,512),x=X(cv);x.fillStyle=base;x.fillRect(0,0,512,512);var cols=['#a8644e','#7a7570','#ece6dc','#5e5650','#b48a76','#6e8a86','#9a8f86','#c9b8a8'];for(var i=0;i<2800;i++){x.fillStyle=cols[Math.floor(rnd()*cols.length)];x.globalAlpha=rr(.55,.95);var px=rnd()*512,py=rnd()*512,s=rr(1.4,5.2);x.beginPath();x.moveTo(px,py);x.lineTo(px+s,py+rr(0,s));x.lineTo(px+rr(0,s),py+s);x.lineTo(px-rr(0,s*.6),py+rr(s*.3,s));x.closePath();x.fill()}x.globalAlpha=1;
 x.strokeStyle='rgba(90,80,70,.55)';x.lineWidth=3;[0,256].forEach(function(p){x.beginPath();x.moveTo(p,0);x.lineTo(p,512);x.stroke();x.beginPath();x.moveTo(0,p);x.lineTo(512,p);x.stroke()});
 var gr=x.createLinearGradient(0,0,512,512);gr.addColorStop(0,'rgba(255,255,255,.06)');gr.addColorStop(1,'rgba(0,0,0,.07)');x.fillStyle=gr;x.fillRect(0,0,512,512);nz(x,512,512,7);c.weather(x,512,512,{mottle:.2,stain:.35,scale:.6,specks:1400});return c.tex(cv,rx||1,ry||1)};
L.tileTex=function(a,b,grout,n,rx,ry,pat){var cv=C(512,512),x=X(cv),s=512/n;x.fillStyle=grout;x.fillRect(0,0,512,512);for(var i=0;i<n;i++)for(var j=0;j<n;j++){x.fillStyle=(pat==='check'?((i+j)%2?b:a):a);x.fillRect(j*s+2,i*s+2,s-4,s-4);var gr=x.createLinearGradient(j*s,i*s,j*s+s,i*s+s);gr.addColorStop(0,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(0,0,0,.08)');x.fillStyle=gr;x.fillRect(j*s+2,i*s+2,s-4,s-4);if(pat==='motif'&&(i+j)%2==0){x.strokeStyle=b;x.lineWidth=3;x.beginPath();x.arc(j*s+s/2,i*s+s/2,s*.28,0,7);x.stroke();x.beginPath();x.moveTo(j*s+s*.2,i*s+s*.5);x.lineTo(j*s+s*.8,i*s+s*.5);x.moveTo(j*s+s*.5,i*s+s*.2);x.lineTo(j*s+s*.5,i*s+s*.8);x.stroke()}}nz(x,512,512,7);c.weather(x,512,512,{mottle:.14,stain:.3,scale:.5,specks:600,cracks:2});return c.tex(cv,rx||1,ry||1)};
L.lino=function(a,b,rx,ry){var cv=C(256,256),x=X(cv);x.fillStyle=a;x.fillRect(0,0,256,256);x.fillStyle=b;for(var i=0;i<4;i++)for(var j=0;j<4;j++)if((i+j)%2==0)x.fillRect(j*64,i*64,64,64);for(var k=0;k<120;k++){x.fillStyle='rgba(255,255,255,.06)';x.fillRect(rnd()*256,rnd()*256,rr(4,20),2)}nz(x,256,256,9);return c.tex(cv,rx||1,ry||1)};
L.fabric=function(kind,c1,c2,rx,ry){var cv=C(256,256),x=X(cv),i;x.fillStyle=c1;x.fillRect(0,0,256,256);
 if(kind==='stripe'){x.fillStyle=c2;for(i=0;i<8;i++)x.fillRect(i*32+8,0,14,256)}
 else if(kind==='check'){x.fillStyle=c2;x.globalAlpha=.5;for(i=0;i<4;i++){x.fillRect(i*64,0,26,256);x.fillRect(0,i*64,256,26)}x.globalAlpha=1}
 else if(kind==='dots'){x.fillStyle=c2;for(i=0;i<6;i++)for(var j=0;j<6;j++){x.beginPath();x.arc(i*44+(j%2?22:0)+10,j*44+12,6,0,7);x.fill()}}
 else if(kind==='floral'){for(i=0;i<5;i++)for(j=0;j<5;j++){var cx=i*56+(j%2?28:0),cy=j*56+14;x.fillStyle=c2;for(var k=0;k<5;k++){x.beginPath();x.arc(cx+Math.cos(k*1.256)*8,cy+Math.sin(k*1.256)*8,5.5,0,7);x.fill()}x.fillStyle='#f0e8e0';x.beginPath();x.arc(cx,cy,4,0,7);x.fill();x.strokeStyle='#4a7a5a';x.lineWidth=3;x.beginPath();x.moveTo(cx+10,cy+18);x.quadraticCurveTo(cx+22,cy+22,cx+30,cy+14);x.stroke()}}
 else if(kind==='tweed'){for(i=0;i<1400;i++){x.fillStyle=rnd()<.5?c2:'rgba(0,0,0,.25)';x.globalAlpha=.3;x.fillRect(rnd()*256,rnd()*256,rr(2,5),2)}x.globalAlpha=1}
 x.globalAlpha=.07;x.strokeStyle='#000';x.lineWidth=1;for(i=0;i<256;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke()}x.globalAlpha=.05;for(i=0;i<256;i+=3){x.beginPath();x.moveTo(0,i);x.lineTo(256,i);x.stroke()}x.globalAlpha=1;nz(x,256,256,10);c.weather(x,256,256,{mottle:.14,scale:.3});return c.tex(cv,rx||1,ry||1)};
L.rug=function(w,d,c1,c2,c3,c4,y,o){o=o||{};var pw=512,ph=Math.round(512*d/w),cv=C(pw,ph),x=X(cv),i;x.fillStyle=c1;x.fillRect(0,0,pw,ph);var b=26;x.fillStyle=c2;x.fillRect(b,b,pw-2*b,ph-2*b);x.strokeStyle=c4;x.lineWidth=4;x.strokeRect(b*2.2,b*2.2,pw-b*4.4,ph-b*4.4);
 x.fillStyle=c3;for(i=0;i<pw/22;i++){x.fillRect(b*.3+i*22,b*.25,12,b*.5);x.fillRect(b*.3+i*22,ph-b*.75,12,b*.5)}for(i=0;i<ph/22;i++){x.fillRect(b*.25,b*.3+i*22,b*.5,12);x.fillRect(pw-b*.75,b*.3+i*22,b*.5,12)}
 var cx=pw/2,cy=ph/2;[[ph*.34,c3],[ph*.26,c1],[ph*.18,c4],[ph*.1,c3]].forEach(function(s){x.fillStyle=s[1];x.beginPath();x.moveTo(cx,cy-s[0]);x.lineTo(cx+s[0]*1.5,cy);x.lineTo(cx,cy+s[0]);x.lineTo(cx-s[0]*1.5,cy);x.closePath();x.fill()});
 for(i=0;i<14;i++){var ax=b*2.6+rnd()*(pw-b*5.2),ay=b*2.6+rnd()*(ph-b*5.2);if(Math.abs(ax-cx)<ph*.55&&Math.abs(ay-cy)<ph*.4)continue;x.fillStyle=i%2?c3:c4;x.beginPath();x.moveTo(ax,ay-8);x.lineTo(ax+8,ay);x.lineTo(ax,ay+8);x.lineTo(ax-8,ay);x.fill()}
 for(i=0;i<1800;i++){x.fillStyle='rgba(0,0,0,.05)';x.fillRect(rnd()*pw,rnd()*ph,rr(1,4),1)}nz(x,pw,ph,8);var t=c.tex(cv,1,1);var G=L.grp(o.x||0,y||.04,o.z||0,o.rot||0,o.par);L.pl(w,d,M('#fff',{map:t,rough:.97}),0,0,0,{rx:-PI/2,par:G});[-1,1].forEach(function(s){L.box(.4,.03,d-.2,'#e6dccb',s*(w/2+.2),0,0,{par:G,r:.01,ns:1})});return G};
L.paperTex=function(lines,w,h,o){o=o||{};var cv=C(w,h),x=X(cv);x.fillStyle=o.bg||'#f2eee6';x.fillRect(0,0,w,h);x.fillStyle=o.fg||'#2a2a30';x.direction='ltr';x.textAlign='right';var y=o.top||22;lines.forEach(function(l){x.font=(l.f||'bold 22px')+' Heebo, Arial, sans-serif';x.fillStyle=l.c||o.fg||'#2a2a30';x.fillText(l.t,w-14,y);y+=l.dy||26});if(o.rule){x.fillStyle='rgba(60,60,70,.5)';for(var i=0;i<(o.rule);i++){x.fillRect(14,y+i*8,w-28,2)}}return c.tex(cv,1,1)};
L.ball=function(x,y,z,r,par){var cv=C(256,128),k=X(cv);k.fillStyle='#f4f1ee';k.fillRect(0,0,256,128);k.fillStyle='#1c1c22';for(var i=0;i<8;i++)for(var j=0;j<3;j++){var cx=i*32+(j%2?16:0),cy=24+j*38;k.beginPath();for(var q=0;q<5;q++){var a=q*1.2566-1.57;k.lineTo(cx+Math.cos(a)*11,cy+Math.sin(a)*11)}k.closePath();k.fill()}k.strokeStyle='rgba(40,40,50,.5)';k.lineWidth=1.5;for(i=0;i<8;i++){k.beginPath();k.moveTo(i*32+16,0);k.lineTo(i*32+16,128);k.stroke()}
 var m=L.sph(r,'#fff',x,y,z,{map:c.tex(cv,1,1),rough:.45,par:par,seg:20,seg2:14});return m};
/* ---------- shell ---------- */
L.wallTex=function(W,H,o){o=o||{};var pw=1024,ph=Math.round(pw*H/W),cv=C(pw,ph),x=X(cv),u=pw/W,i;x.fillStyle=o.base;x.fillRect(0,0,pw,ph);
 var dh=(o.dado||0)*u,top=ph-dh;
 if(o.paper==='stripe'){var n=Math.round(W/(o.sw||1.4));for(i=0;i<n;i++){x.fillStyle=o.p2;x.globalAlpha=o.pa||.5;x.fillRect(i*pw/n,0,pw/n*.5,top);x.globalAlpha=1}}
 else if(o.paper==='motif'){x.fillStyle=o.p2;x.globalAlpha=.55;for(i=0;i<W/1.8;i++)for(var j=0;j<H/1.8;j++){var cx=i*1.8*u+(j%2?.9*u:0)+.4*u,cy=j*1.8*u+.6*u;if(cy<top-8){x.beginPath();x.ellipse(cx,cy,5,8,0,0,7);x.fill();x.beginPath();x.ellipse(cx-8,cy+5,4,6,.6,0,7);x.fill();x.beginPath();x.ellipse(cx+8,cy+5,4,6,-.6,0,7);x.fill()}}x.globalAlpha=1}
 if(o.blotch!==false){for(i=0;i<26;i++){var gx=rnd()*pw,gy=rnd()*ph,gr=x.createRadialGradient(gx,gy,0,gx,gy,rr(40,140));var dark=rnd()<.5;gr.addColorStop(0,dark?'rgba(60,40,30,.07)':'rgba(255,245,235,.07)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,pw,ph)}}
 if(o.dado){if(o.tiles){var ts=o.tiles*u;x.fillStyle='#d8d4cc';x.fillRect(0,top,pw,dh);for(var tx=0;tx<pw;tx+=ts)for(var ty=top;ty<ph;ty+=ts){x.fillStyle=((tx/ts+(ty-top)/ts)%2<1)?o.dadoCol:o.dadoCol2||o.dadoCol;x.fillRect(tx+2,ty+2,ts-4,ts-4);var gr2=x.createLinearGradient(tx,ty,tx+ts,ty+ts);gr2.addColorStop(0,'rgba(255,255,255,.16)');gr2.addColorStop(1,'rgba(0,0,0,.08)');x.fillStyle=gr2;x.fillRect(tx+2,ty+2,ts-4,ts-4)}}
  else{x.fillStyle=o.dadoCol;x.fillRect(0,top,pw,dh);x.fillStyle='rgba(0,0,0,.12)';for(i=0;i<W*2;i++)x.fillRect(i*pw/(W*2),top,2,dh);}
  x.fillStyle=o.rail||'#efe8dc';x.fillRect(0,top-.22*u,pw,.3*u);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,top+.08*u,pw,3)}
 if(o.stain){var sg=x.createLinearGradient(0,ph-1.6*u,0,ph);sg.addColorStop(0,'rgba(60,40,30,0)');sg.addColorStop(1,'rgba(60,40,30,.2)');x.fillStyle=sg;x.fillRect(0,ph-1.6*u,pw,1.6*u)}
 var vg=x.createLinearGradient(0,0,0,ph);vg.addColorStop(0,'rgba(0,0,0,.12)');vg.addColorStop(.25,'rgba(0,0,0,0)');x.fillStyle=vg;x.fillRect(0,0,pw,ph);
 c.weather(x,pw,ph,{mottle:.2,peel:o.peel==null?.16:o.peel,stain:.28,grime:.55,cracks:3,specks:1600,scale:1.1,peelCol:o.base});nz(x,pw,ph,9);var t=c.tex(cv,1,1);return t};
L.shell=function(o){var PLAY=!!(c.o&&c.o.play),W=o.W||24,D=o.D||14,H=o.H||(PLAY?13:9);L.W=W;L.D=D;L.H=H;var m;
 m=c.mesh(new T.BoxGeometry(W+1.4,.8,D+1.4),M(o.slab||'#4a3a34'),W/2,-.4,D/2+.1,g);m.castShadow=false;
 var FX=PLAY?7:0,fgeo=new T.PlaneGeometry(W,D+FX);if(FX){var fu=fgeo.attributes.uv;for(var q=0;q<fu.count;q++)fu.setY(q,1-(1-fu.getY(q))*(D+FX)/D)}var fl=new T.Mesh(fgeo,M('#ffffff',{map:o.floor,rough:o.floorRough===undefined?.55:o.floorRough}));fl.rotation.x=-PI/2;fl.position.set(W/2,.01,(D+FX)/2);fl.receiveShadow=true;g.add(fl);L.floorMesh=fl;
 if(c.o&&c.o.play&&fl.material.map){var aC=new T.Color(o.apron||'#2a2420').convertSRGBToLinear();var am=new T.MeshBasicMaterial({color:aC});var ap=new T.Mesh(new T.PlaneGeometry(W+80,70),am);ap.rotation.x=-PI/2;ap.position.set(W/2,-.005,D+35);ap.receiveShadow=true;g.add(ap)}
 var ec=o.edge||'#d8cdbd';
 m=c.mesh(new T.BoxGeometry(W+1.4,H,.7),M(ec),W/2,H/2,-.36,g);m.castShadow=false;
 var bf=new T.Mesh(new T.PlaneGeometry(W,H),M('#fff',{map:o.wallB,rough:.95}));bf.position.set(W/2,H/2,.005);bf.receiveShadow=true;g.add(bf);
 m=c.mesh(new T.BoxGeometry(.7,H,D+.7),M(ec),-.36,H/2,D/2+.05,g);m.castShadow=false;
 var lf=new T.Mesh(new T.PlaneGeometry(D,H),M('#fff',{map:o.wallL||o.wallB,rough:.95}));lf.rotation.y=PI/2;lf.position.set(.005,H/2,D/2);lf.receiveShadow=true;g.add(lf);
 if(o.right){m=c.mesh(new T.BoxGeometry(.7,H,D+.7),M(ec),W+.36,H/2,D/2+.05,g);m.castShadow=false;var rf=new T.Mesh(new T.PlaneGeometry(D,H),M('#fff',{map:o.wallR||o.wallL||o.wallB,rough:.95}));rf.rotation.y=-PI/2;rf.position.set(W-.005,H/2,D/2);rf.receiveShadow=true;g.add(rf)}
 var sc2=o.skirt||'#efe8dc',sh=o.skirtH||.6;L.box(W,sh,.22,sc2,W/2,0,.11,{r:.04,ns:1});L.box(.22,sh,D,sc2,.11,0,D/2,{r:.04,ns:1});if(o.right)L.box(.22,sh,D,sc2,W-.11,0,D/2,{r:.04,ns:1});
 if(o.crown!==false){L.box(W,.35,.3,o.crownCol||sc2,W/2,H-.35,.15,{r:.05,ns:1});L.box(.3,.35,D,o.crownCol||sc2,.15,H-.35,D/2,{r:.05,ns:1})}
 return{fl:fl}};
L.wg=function(side){var G=new T.Group();if(side==='left'){G.rotation.y=PI/2}else if(side==='right'){G.rotation.y=-PI/2;G.position.set(L.W,0,0)}g.add(G);return G};
/* ---------- wall fixtures (wall-local coords: x along wall, z out of wall) ---------- */
L.door=function(par,x,w,h,o){o=o||{};var fc=o.frame||'#6a4a3a',lc=o.col||'#7a4c34',inside=o.inside||'#241c20';
 var op=new T.Mesh(new T.PlaneGeometry(w,h),o.glow?new T.MeshBasicMaterial({color:o.glow}):M(inside,{rough:1}));op.position.set(x,h/2,.02);par.add(op);
 if(o.light){var gg=L.glow(x,h*.55,.5,o.light,w*3.2,.35,par)}
 L.box(.4,h+.4,.55,fc,x-w/2-.2,0,.27,{par:par,r:.06});L.box(.4,h+.4,.55,fc,x+w/2+.2,0,.27,{par:par,r:.06});L.box(w+1.1,.45,.55,fc,x,h-.05,.27,{par:par,r:.06});
 var hx=o.hinge==='right'?x+w/2-.08:x-w/2+.08,sg=o.hinge==='right'?-1:1,pv=new T.Group();pv.position.set(hx,0,.14);par.add(pv);pv.rotation.y=-(o.open||0)*sg;
 var lw=w-.18;var lf=L.box(lw,h-.1,.22,lc,sg*lw/2,0,0,{par:pv,r:.05,map:o.leafMap,rough:.6});
 [[.62,.52],[.62,.16]].forEach(function(p,i){L.box(lw*.62,(h-.4)*(i?.42:.34),.06,new T.Color(lc).multiplyScalar(.85).getStyle(),sg*lw/2,h*(i?.1:.55),.12,{par:pv,r:.02,rough:.7})});
 L.sph(.1,'#c9c4bc',sg*(lw-.35),h*.46,.2,{par:pv,metal:.8,rough:.3});L.box(.12,.34,.05,'#b8b2aa',sg*(lw-.2),h*.46-.05,.14,{par:pv,metal:.8,rough:.3});
 if(o.peep){L.cyl(.06,.06,.08,'#b8b2aa',sg*lw/2,h*.78,.15,{par:pv,metal:.8,rx:PI/2})}
 return pv};
L.sky=function(kind,w,h){var cv=C(512,Math.round(512*h/w)),x=X(cv),ph=cv.height,i;var gr=x.createLinearGradient(0,0,0,ph);
 if(kind==='night'){gr.addColorStop(0,'#0a1230');gr.addColorStop(1,'#3a3a6a')}else if(kind==='dusk'){gr.addColorStop(0,'#3a4a8a');gr.addColorStop(.6,'#c88a9a');gr.addColorStop(1,'#f0c0a8')}else if(kind==='grey'){gr.addColorStop(0,'#aab4c0');gr.addColorStop(1,'#dfe2e4')}else{gr.addColorStop(0,'#6aa6e0');gr.addColorStop(.7,'#bfdcf0');gr.addColorStop(1,'#eef0f2')}
 x.fillStyle=gr;x.fillRect(0,0,512,ph);if(kind==='day'||kind==='grey'){x.fillStyle='rgba(255,255,255,.55)';for(i=0;i<5;i++){x.beginPath();x.ellipse(60+i*100,ph*(.2+rnd()*.25),rr(30,60),rr(8,16),0,0,7);x.fill()}}
 var cols=kind==='night'?['#10142a','#181c36','#1c2040']:['#c9b6a8','#b8a4a0','#d4c6b8','#a8a0a4','#cdbfb4'];var bx=0;while(bx<512){var bw=rr(40,80),bh=rr(.25,.55)*ph;x.fillStyle=cols[Math.floor(rnd()*cols.length)];x.fillRect(bx,ph-bh,bw,bh);for(var wy=ph-bh+8;wy<ph-8;wy+=14)for(var wx=bx+6;wx<bx+bw-8;wx+=14){x.fillStyle=kind==='night'?(rnd()<.45?'#ffd9c4':'#22284a'):'rgba(70,80,100,.35)';x.fillRect(wx,wy,7,8)}bx+=bw+rr(0,6)}
 if(kind==='dusk'||kind==='night'){}return c.tex(cv,1,1)};
L.window=function(par,x,y,w,h,o){o=o||{};var fc=o.frame||'#f1ece4',vt=o.view||L.sky('day',w,h);
 var gl=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:vt,color:'#fff'}));gl.position.set(x,y+h/2,.03);par.add(gl);L.winGlass=gl;
 var t=.28;L.box(w+t*2,t,.55,fc,x,y-t+.02,.27,{par:par,r:.05});L.box(w+t*2,t,.55,fc,x,y+h-.02,.27,{par:par,r:.05});L.box(t,h+t*2-.04,.55,fc,x-w/2-t/2+.02,y-t+.02,.27,{par:par,r:.05});L.box(t,h+t*2-.04,.55,fc,x+w/2+t/2-.02,y-t+.02,.27,{par:par,r:.05});
 var nv=o.cols||2;for(var i=1;i<nv;i++)L.box(.16,h,.3,fc,x-w/2+i*w/nv,y,.2,{par:par,r:.04});if(o.rows!==0)L.box(w,.16,.3,fc,x,y+h*.62,.2,{par:par,r:.04});
 L.box(w+1.5,.28,.95,fc,x,y-t-.1,.46,{par:par,r:.07});
 if(o.curtain){L.curtain(par,x,y,w,h,o.curtain,o.curtain2)}
 if(w>.5&&o.blinds!==false)L.blinds(par,x,y,w,h,o.blindCol||'#e8e4dc');
 if(w>.5&&o.shaft!==false&&!(c.o&&c.o.time==='night'))L.shaft(par,x,y,w,h,o);
 return gl};
/* venetian blinds, half drawn: thin slats that cut the daylight into bars */
L.blinds=function(par,x,y,w,h,col){var n=Math.round(h*.55/.17),top=y+h-.05,G=new T.Group();par.add(G);var mat=M(col,{rough:.5});var geo=new T.BoxGeometry(w-.05,.035,.24);
 for(var i=0;i<n;i++){var sl=new T.Mesh(geo,mat);sl.position.set(x,top-i*.17,.24);sl.rotation.x=.55;sl.castShadow=true;sl.receiveShadow=true;G.add(sl)}
 L.box(w+.1,.16,.34,col,x,top+.02,.24,{par:par,r:.03,ns:1});[-1,1].forEach(function(s){L.cyl(.012,.012,n*.17,'#d8d2c6',x+s*w*.33,top-n*.17,.36,{par:par,ns:1})});return G};
/* light coming in: a soft volume from the glass down onto the floor, with dust turning in it */
L.shaft=function(par,x,y,w,h,o){if(c.o&&c.o.lowFx)return;var len=o.shaftLen||11,dn=o.shaftDown||.62;
 var geo=new T.BoxGeometry(w*.92,h*.8,len,1,1,1);geo.translate(0,0,len/2);var P=geo.attributes.position;for(var i=0;i<P.count;i++){var z=P.getZ(i);P.setY(i,P.getY(i)-z*dn);P.setX(i,P.getX(i)*(1+z/len*.35))}
 var m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,uniforms:{col:{value:new T.Color(o.shaftCol||'#ffe7c6').convertSRGBToLinear()},k:{value:o.shaftK||.075},L:{value:len},t:{value:0}},
  vertexShader:'varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 col;uniform float k,L,t;varying vec3 vP;varying vec3 vN;varying vec3 vV;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){float z=clamp(vP.z/L,0.,1.);float edge=pow(abs(dot(normalize(vN),normalize(vV))),1.4);float slat=.72+.28*step(.45,fract(vP.y*2.9+vP.z*1.8));float a=k*(1.-z)*(1.-z)*edge*slat*(.85+.15*sin(t*.3+vP.z));gl_FragColor=vec4(col*a,1.);}'});
 var sh=new T.Mesh(geo,m);sh.position.set(x,y+h/2,.06);sh.renderOrder=3;par.add(sh);
 /* dust */
 var n=70,pg=new T.BufferGeometry(),pp=new Float32Array(n*3),seed=[];for(i=0;i<n;i++){var zz=rnd()*len*.6;pp[i*3]=(rnd()-.5)*w*.8;pp[i*3+1]=(rnd()-.5)*h*.7-zz*dn;pp[i*3+2]=zz;seed.push(rnd()*6.28)}pg.setAttribute('position',new T.BufferAttribute(pp,3));
 var pm=new T.PointsMaterial({color:'#fff2dc',size:.07,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true});var pts=new T.Points(pg,pm);pts.position.copy(sh.position);par.add(pts);
 var b0=pp.slice();c.tick(function(tt){m.uniforms.t.value=tt;for(var q=0;q<n;q++){pp[q*3]=b0[q*3]+Math.sin(tt*.2+seed[q])*.25;pp[q*3+1]=b0[q*3+1]+Math.sin(tt*.13+seed[q]*2)*.3;pp[q*3+2]=b0[q*3+2]+Math.cos(tt*.17+seed[q])*.2}pg.attributes.position.needsUpdate=true})};
/* a standing fan, turning slowly */
L.fan=function(x,z,ry,o){o=o||{};var G=L.grp(x,0,z,ry||0),mc=o.col||'#d8d4cc';L.cyl(.75,.85,.12,'#2e2e32',0,0,0,{par:G,seg:24});L.cyl(.06,.06,4.2,'#bfbab0',0,.12,0,{par:G,metal:.5,rough:.35});
 var H=new T.Group();H.position.set(0,4.5,0);G.add(H);L.cyl(.32,.4,.6,mc,0,0,-.25,{par:H,rx:PI/2,seg:18,rough:.4});var cage=new T.Mesh(new T.TorusGeometry(1.05,.03,6,40),M('#cfcac0',{metal:.4,rough:.35}));cage.position.z=.25;H.add(cage);
 for(var i=0;i<12;i++){var sp=new T.Mesh(new T.CylinderGeometry(.012,.012,2.1,4),M('#cfcac0',{metal:.4}));sp.rotation.z=i*PI/12;sp.position.z=.3;H.add(sp)}
 var R=new T.Group();R.position.z=.15;H.add(R);for(i=0;i<3;i++){var bl=new T.Mesh(new T.SphereGeometry(.42,12,8),M(o.blade||'#9ab0b8',{rough:.3,tr:1,op:.82}));bl.scale.set(1,.42,.08);bl.position.set(Math.cos(i*2.094)*.5,Math.sin(i*2.094)*.5,0);bl.rotation.z=i*2.094;R.add(bl)}
 L.sph(.13,mc,0,0,.18,{par:H});var ph=rnd()*6;c.tick(function(t){R.rotation.z=t*7;H.rotation.y=Math.sin(t*.35+ph)*.6});return G};
/* a bare bulb on its cord */
L.bulb=function(x,y,z,o){o=o||{};L.cyl(.015,.015,o.cord||1.6,'#2a2624',x,y,z,{ns:1});L.cyl(.12,.1,.3,'#d8d2c6',x,y-.3,z,{ns:1});L.sph(.2,'#fff',x,y-.42,z,{mat:new T.MeshBasicMaterial({color:'#fff1d6'}),ns:1});L.glow(x,y-.42,z,'#ffd6a0',3.2,.55);return L.pt('#ffd9a8',o.int||.9,x,y-.6,z,o.dist||12)};
L.curtain=function(par,x,y,w,h,col,col2){var top=y+h+.9,len=top-(y-1.3),side=w*.34;var cv=C(256,256),k=X(cv);k.fillStyle=col;k.fillRect(0,0,256,256);if(col2){k.fillStyle=col2;for(var i=0;i<6;i++)k.fillRect(i*44+6,0,12,256)}nz(k,256,256,8);var tx=c.tex(cv,1,1);var mat=M('#fff',{map:tx,rough:.95,side:T.DoubleSide});
 L.cyl(.08,.08,w+3.4,'#3a3030',x,top+.1,.8,{par:par,rz:PI/2,ns:1});var out=[];
 [-1,1].forEach(function(s){var geo=new T.PlaneGeometry(side,len,12,6);var m=new T.Mesh(geo,mat);m.position.set(x+s*(w/2+side/2-.15),top-len/2,.7);m.castShadow=true;m.receiveShadow=true;par.add(m);var P=geo.attributes.position,b=P.array.slice();out.push({m:m,P:P,b:b,s:s})});
 c.tick(function(t){out.forEach(function(o,k){for(var i=0;i<o.P.count;i++){var bx=o.b[i*3],by=o.b[i*3+1];var f=(by+len/2)/len;o.P.array[i*3+2]=Math.sin(bx*6.5+k)*.2+Math.sin(t*.9+bx*2+k*1.7)*.06*(1-f)*(1-f)*1.5;o.P.array[i*3]=bx+o.s*(f)*.0}o.P.needsUpdate=true;o.m.geometry.computeVertexNormals()})});};
L.frame=function(par,x,yc,w,h,tx,o){o=o||{};var fc=o.frame||'#4a342a',t=o.t||.3;L.box(w+t*2,h+t*2,.3,fc,x,yc-h/2-t,.15,{par:par,r:.06,rough:.5});var mat=new T.MeshStandardMaterial({map:tx,roughness:.5,color:'#fff'});if(o.mat){L.box(w+.1,h+.1,.05,'#f0eae0',x,yc-h/2-.05,.3,{par:par,r:.01})}L.pl(w,h,mat,x,yc,.33,{par:par});return tx};
/* people-silhouette photo */
L.photoTex=function(w,h,kind,cols){cols=cols||['#8a9ab0','#d8b8a8',__CK.a2,'#3d5f63','#2e3a50'];var cv=C(w,h),k=X(cv),i;var gr=k.createLinearGradient(0,0,0,h);if(kind==='bw'){gr.addColorStop(0,'#cfcac2');gr.addColorStop(1,'#8e8a84')}else{gr.addColorStop(0,cols[0]);gr.addColorStop(1,cols[1])}k.fillStyle=gr;k.fillRect(0,0,w,h);
 if(kind==='team'){k.fillStyle='#4a6a50';k.fillRect(0,h*.62,w,h*.38);for(var r=0;r<2;r++){var n=r?5:6;for(i=0;i<n;i++){var px=w*.12+i*(w*.76/(n-1)),py=h*(r?.78:.58);k.fillStyle='#e8e4dc';k.beginPath();k.arc(px,py-h*.18,h*.05,0,7);k.fill();k.fillStyle=i%2?__CK.add:__CK.add;k.fillRect(px-w*.035,py-h*.13,w*.07,h*.2);k.fillStyle='#2a2a34';k.fillRect(px-w*.035,py+h*.07,w*.07,h*.1)}}k.fillStyle='rgba(0,0,0,.18)';k.fillRect(0,0,w,h);k.globalCompositeOperation='saturation';k.fillStyle='#808080';k.fillRect(0,0,w,h);k.globalCompositeOperation='source-over'}
 else if(kind==='family'){for(i=0;i<3;i++){var px2=w*(.25+i*.25),ph2=h*(i==1?.5:.62);k.fillStyle=cols[2+i];k.fillRect(px2-w*.07,h-ph2,w*.14,ph2);k.fillStyle='#d8a888';k.beginPath();k.arc(px2,h-ph2-h*.07,h*.09,0,7);k.fill()}}
 else if(kind==='kid'){k.fillStyle='#d8a888';k.beginPath();k.arc(w/2,h*.4,h*.2,0,7);k.fill();k.fillStyle='#8a2a30';k.fillRect(w*.3,h*.58,w*.4,h*.42);k.fillStyle='#2a1a14';k.beginPath();k.arc(w/2,h*.33,h*.19,PI,0);k.fill()}
 var vg=k.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,h*.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(30,20,10,.35)');k.fillStyle=vg;k.fillRect(0,0,w,h);nz(k,w,h,12);return c.tex(cv,1,1)};
L.posterTex=function(w,h,bg,lines,o){o=o||{};var cv=C(w,h),k=X(cv);k.fillStyle=bg;k.fillRect(0,0,w,h);if(o.band){k.fillStyle=o.band;k.fillRect(0,h*.42,w,h*.16)}k.textAlign='center';k.direction='ltr';var y=h*.18;lines.forEach(function(l){k.font=(l.f||'900 60px')+' Heebo, Arial, sans-serif';k.fillStyle=l.c||'#fff';k.fillText(l.t,w/2,l.y||y);y+=l.dy||70});k.strokeStyle=o.bd||'rgba(255,255,255,.5)';k.lineWidth=6;k.strokeRect(10,10,w-20,h-20);nz(k,w,h,10);return c.tex(cv,1,1)};
L.lamp=function(x,z,o){o=o||{};var h=o.h||5.2,sh=o.shade||'#efe4da';L.cyl(.55,.7,.18,'#3a2e2a',x,0,z,{rough:.5});L.cyl(.07,.07,h-1.4,'#3a2e2a',x,.18,z,{metal:.4,rough:.4});var sd=c.mesh(new T.CylinderGeometry(.62,1.0,1.3,20,1,true),M(sh,{rough:.9,side:T.DoubleSide,emis:'#ffd0b0',ei:.7}),x,h-.65,z,g);sd.castShadow=false;L.sph(.2,'#fff4ea',x,h-.8,z,{mat:new T.MeshBasicMaterial({color:'#ffe6cf'}),ns:1});L.glow(x,h-.8,z,'#ffb48a',5,.55);return L.pt('#ffb48a',o.int||.9,x,h-.8,z+.3,o.dist||10)};
L.plant=function(x,z,s,o){o=o||{};s=s||1;L.cyl(.55*s,.42*s,.9*s,o.pot||'#a8543c',x,0,z,{rough:.7});L.cyl(.5*s,.5*s,.08,'#3a2a22',x,.88*s,z);var cols=['#3a7a4a','#2e6a40','#4a8a54','#357048'];for(var i=0;i<(o.n||11);i++){var a=i*2.4,l=(1.1+rnd()*.9)*s;var lf=c.mesh(new T.SphereGeometry(.42*s,10,8),M(cols[i%4],{rough:.6}),x+Math.cos(a)*.45*s,.95*s+l*.5+rnd()*.3*s,z+Math.sin(a)*.45*s,g);lf.scale.set(.35,1.6*s*(.9+rnd()*.5),.9);lf.rotation.set(Math.sin(a)*.5,a,Math.cos(a)*.5)}};
L.books=function(par,x0,y,z,n,o){o=o||{};var pal=['#7a2a2e','#2d4a6b','#3a5a46','#d8d0c2','#5a3a5a','#8a4a3a','#2a2a36','#3a6a72','#c7c0b0',__CK.a2,'#4a5a8a','#6a3a2a'];var x=x0;for(var i=0;i<n;i++){var th=rr(.22,.5),bh=rr(o.hmin||1.1,o.hmax||1.7);var col=pal[Math.floor(rnd()*pal.length)];var tilt=(i===n-1&&o.lean)?-.25:0;var b=L.box(th,bh,o.d||.9,col,x+th/2,y,z,{par:par,r:.03,ns:i%2});b.rotation.z=tilt;if(rnd()<.5)L.box(th+.02,.08,o.d?o.d+.02:.92,'#e6dcc8',x+th/2,y+bh*.7,z,{par:par,r:.01,ns:1});x+=th+.02}return x};
L.shelf=function(par,x,y,z,w,rows,o){o=o||{};var wood=o.wood||'#6a4a38';L.box(.3,rows*2.2+.3,1.1,wood,x-w/2,y,z,{par:par,r:.04});L.box(.3,rows*2.2+.3,1.1,wood,x+w/2,y,z,{par:par,r:.04});L.box(w,rows*2.2+.3,.12,new T.Color(wood).multiplyScalar(.7).getStyle(),x,y,z-.5,{par:par,r:.02,ns:1});for(var r=0;r<=rows;r++)L.box(w,.22,1.1,wood,x,y+r*2.2,z,{par:par,r:.04});return wood};
L.chair=function(x,z,ry,o){o=o||{};var G=L.grp(x,0,z,ry,o.par),wd=o.wood||'#7a5a46',h=o.h||1.9;
 [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]].forEach(function(p){L.box(.14,h,.14,wd,p[0],0,p[1],{par:G,r:.03})});
 L.box(1.8,.18,1.8,wd,0,h,0,{par:G,r:.06});if(o.cush)L.box(1.6,.2,1.6,o.cush,0,h+.18,0,{par:G,r:.09,s:4,map:o.cmap});
 L.box(.14,2.4,.14,wd,-.7,h,-.75,{par:G,r:.03});L.box(.14,2.4,.14,wd,.7,h,-.75,{par:G,r:.03});L.box(1.6,.34,.12,wd,0,h+1.5,-.78,{par:G,r:.04});L.box(1.6,.34,.12,wd,0,h+2.0,-.78,{par:G,r:.04});
 return G};
L.cat=function(x,z,ry,col,o){o=o||{};var G=L.grp(x,0,z,ry,o.par);L.sph(.62,col,0,.62,-.05,{par:G,sx:.95,sy:1.15,sz:1.05,rough:.95});L.sph(.38,col,0,1.42,.2,{par:G,rough:.95});[-1,1].forEach(function(s){var e=c.mesh(new T.ConeGeometry(.14,.3,4),M(col,{rough:.95}),s*.2,1.78,.14,G);e.rotation.z=-s*.25;L.sph(.055,'#5a8a5a',s*.15,1.47,.54,{par:G,ns:1});L.sph(.025,'#101010',s*.15,1.47,.585,{par:G,ns:1})});L.sph(.05,'#c88a8a',0,1.36,.58,{par:G,ns:1});L.sph(.26,col,.18,.2,.5,{par:G,sx:1.4,sy:.7,rough:.95});L.sph(.26,col,-.18,.2,.5,{par:G,sx:1.4,sy:.7,rough:.95});
 var tp=new T.Group();tp.position.set(.5,.25,-.2);G.add(tp);var tail=c.mesh(new T.TorusGeometry(.5,.1,6,14,3.2),M(col,{rough:.95}),0,0,0,tp);tail.rotation.set(Math.PI/2,0,0);c.tick(function(t){tp.rotation.y=Math.sin(t*1.3+x)*.35});return G};
L.monitor=function(par,x,y,z,ry,kind,o){o=o||{};var G=L.grp(x,y,z,ry||0,par);L.box(1.7,.16,1.2,'#cfcbc2',0,0,0,{par:G,r:.05});L.box(.7,.3,.6,'#cfcbc2',0,.15,-.05,{par:G,r:.08});L.box(2.1,1.7,1.7,'#d6d2c8',0,.4,-.35,{par:G,r:.18,s:4,rough:.55});L.box(1.75,1.35,.1,'#1a1a20',0,.57,.5,{par:G,r:.05});
 var cv=L.C(128,96),k=L.X(cv);function draw(f){k.fillStyle=kind==='pitch'?'#2e6a42':'#14202e';k.fillRect(0,0,128,96);if(kind==='pitch'){k.strokeStyle='#e8f0e8';k.lineWidth=1.5;k.strokeRect(6,8,116,80);k.beginPath();k.moveTo(64,8);k.lineTo(64,88);k.stroke();k.beginPath();k.arc(64,48,12,0,7);k.stroke();k.fillStyle=__CK.a;k.fillRect(28+Math.sin(f)*6,40,4,4);k.fillStyle='#f4f1ff';k.fillRect(90+Math.cos(f)*6,50,4,4)}else{k.fillStyle='#bcd2ec';for(var q=0;q<9;q++){var w=30+((q*37+3)%70);k.fillRect(8,10+q*9,w,3)}k.fillStyle='#ff9a8a';k.fillRect(8,10,40,3);if(Math.floor(f*2)%2===0)k.fillRect(8+(30+((4*37+3)%70)),46,5,4)}}
 draw(0);var tx=c.tex(cv,1,1);var sc=new T.Mesh(new T.PlaneGeometry(1.55,1.15),new T.MeshBasicMaterial({map:tx,color:'#fff'}));sc.position.set(0,1.45,.56);G.add(sc);L.glow(0,1.45,.9,kind==='pitch'?'#a8e0b8':'#a8c8ff',2.6,.2,G);
 c.tick(function(t){if(Math.floor(t*2)%2===(o.ph||0)){draw(t);tx.needsUpdate=true}});return G};
L.keyboard=function(par,x,y,z,ry){var G=L.grp(x,y,z,ry||0,par);L.box(1.5,.1,.55,'#d6d2c8',0,0,0,{par:G,r:.03});for(var q=0;q<3;q++)L.box(1.35,.02,.1,'#8a8a90',0,.1,-.16+q*.14,{par:G,r:.01,ns:1});return G};
L.mug=function(par,x,y,z,col,o){o=o||{};var m=L.cyl(.2,.17,.38,col||'#e8e2da',x,y,z,{par:par,rough:.4,seg:12});L.cyl(.17,.17,.02,'#4a2a1a',x,y+.36,z,{par:par,seg:12,ns:1});L.box(.06,.2,.04,col||'#e8e2da',x+.22,y+.1,z,{par:par,r:.02,ns:1});return m};
L.steam=function(par,x,y,z,n){var sp=[];for(var i=0;i<(n||5);i++){var s=new T.Sprite(new T.SpriteMaterial({color:'#f4f0ec',map:c.glowTex(),transparent:true,opacity:0,depthWrite:false}));s.scale.set(.4,.4,1);par.add(s);sp.push({s:s,a:i/(n||5)})}c.tick(function(t,dt){sp.forEach(function(o){o.a=(o.a+dt*.22)%1;var k=o.a;o.s.position.set(x+Math.sin(k*8+o.a*5)*.08,y+k*2,z);o.s.material.opacity=Math.sin(k*3.14)*.22;o.s.scale.setScalar(.35+k*.7)})})};
/* soft cloth strip (scarf) */
L.scarfTex=function(c1,c2,w,h){var cv=C(w||128,h||512),k=X(cv);k.fillStyle=c1;k.fillRect(0,0,cv.width,cv.height);k.fillStyle=c2;var n=7,sh=cv.height/(n*2);for(var i=1;i<n*2;i+=2)k.fillRect(0,i*sh,cv.width,sh);k.strokeStyle='rgba(0,0,0,.12)';k.lineWidth=1;for(i=0;i<cv.width;i+=4){k.beginPath();k.moveTo(i,0);k.lineTo(i,cv.height);k.stroke()}for(i=0;i<cv.width;i+=5){k.strokeStyle=i%2?c1:c2;k.lineWidth=3;k.beginPath();k.moveTo(i,cv.height-26);k.lineTo(i,cv.height);k.stroke()}k.fillStyle='#f4f1ff';k.font='bold 22px Heebo, Arial';k.textAlign='center';nz(k,cv.width,cv.height,10);return c.tex(cv,1,1)};
L.hang=function(par,x,y,z,w,h,tx,o){o=o||{};var geo=new T.PlaneGeometry(w,h,6,10);var m=new T.Mesh(geo,M('#fff',{map:tx,rough:.95,side:T.DoubleSide}));m.position.set(x,y-h/2,z);m.castShadow=true;par.add(m);var P=geo.attributes.position,b=P.array.slice();c.tick(function(t){for(var i=0;i<P.count;i++){var f=(h/2-b[i*3+1])/h;P.array[i*3+2]=Math.sin(b[i*3+1]*2.2+t*1.3+(o.ph||0))*.1*f+Math.sin(b[i*3]*3)*.05*f}P.needsUpdate=true});return m};
return L}
window.__hl=lib;
/* ===== room: living room ===== */
RM.def('room',{kind:'home',build:function(c){var L=lib(c),g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i;
 c.sky('indoor');
 var wB=L.wallTex(24,9,{base:'#d8d3c9',dado:3.3,dadoCol:'#8ea4a3',rail:'#b9bdb6',stain:1});
 var wL=L.wallTex(14,9,{base:'#d8d3c9',dado:3.3,dadoCol:'#8ea4a3',rail:'#b9bdb6',stain:1});
 L.shell({floor:L.terrazzo('#a29a8f',5.45,3.2),floorRough:.38,wallB:wB,wallL:wL,wallR:wL,right:true,skirt:'#f1eadf',edge:'#cfc3b3'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 /* lights */
 c.light('hemi','#ffe6cf',.34,0,0,0,'#352c30');
 L.key('#ffe6cf',.78,5.2,9.5,7.5,3.2,1.9,7);
 /* window on left wall (light from the left) */
 var wv=L.sky('day',3.6,4.2);
 L.window(LW,-3.4,3.5,3.6,4.2,{view:wv,frame:'#f1ece4',curtain:__CK.am,curtain2:'#c8605a'});
 L.pt('#dcecff',.6,1.6,5.2,3.4,12);
 /* floor sun patch */
 (function(){var cv=L.C(256,256),k=L.X(cv);k.fillStyle='rgba(255,236,220,1)';for(var a=0;a<2;a++)for(var b=0;b<2;b++)k.fillRect(10+a*122,10+b*122,112,112);var tx=c.tex(cv,1,1);var geo=new THREE.PlaneGeometry(6,6.4);var P=geo.attributes.position;for(var q=0;q<P.count;q++){P.setX(q,P.getX(q)+P.getY(q)*.55)}var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(5.2,.06,5.2);g.add(m)})();
 /* ---- back wall ---- */
 // vitrine (glass cabinet)
 L.box(3.6,6.4,1.5,'#6a4a3a',2.9,0,.85,{r:.08,rough:.55});
 L.box(3.1,3.3,.08,'#c6dad8',2.9,2.6,1.62,{tr:1,op:.28,ns:1,r:.02,metal:.3,rough:.1});
 L.box(3.1,2.1,.08,'#5a3e30',2.9,.4,1.62,{r:.02});L.sph(.12,'#c9c4bc',2.9,1.4,1.7,{metal:.8,rough:.3});
 [2.6,4.1,5.5].forEach(function(y,k){L.box(3.1,.1,1.2,'#8a6a56',2.9,y,.8,{r:.02,ns:1})});
 // contents: plates, cup, photo frames
 for(i=0;i<4;i++)L.cyl(.55,.55,.07,i%2?'#e8e2da':'#d4dde0',1.7+i*.7,2.72,1.0,{rx:1.2,rough:.3,seg:16}).rotation.y=0;
 L.cyl(.3,.12,.3,'#c8ccd0',3.9,2.7,1.0,{metal:.85,rough:.25});L.cyl(.4,.3,.45,'#c8ccd0',3.9,3.0,1.0,{metal:.85,rough:.25});L.cyl(.06,.06,.4,'#c8ccd0',3.9,3.4,1.0,{metal:.85});
 L.box(.9,1.1,.12,'#3a2a22',1.8,4.2,1.1,{r:.02});L.pl(.75,.95,L.M('#fff',{map:L.photoTex(80,100,'bw'),rough:.5}),1.8,4.77,1.17);
 for(i=0;i<3;i++)L.cyl(.25,.2,.55,[__CK.am,'#3d5f63','#e8e2da'][i],2.7+i*.55,4.1,1.0,{rough:.4});
 L.box(2.9,.1,1.0,'#8a6a56',2.9,5.5,.8,{r:.02,ns:1});
 for(i=0;i<5;i++)L.cyl(.12,.12,.8,'#d4dde0',1.7+i*.5,5.55,.95,{rough:.2});
 // side table + lamp
 L.box(2.3,.18,2.1,'#7a5a46',5.5,2.55,2.2,{r:.06});L.box(.2,2.55,.2,'#5a3e30',4.6,0,1.4,{r:.04});L.box(.2,2.55,.2,'#5a3e30',6.4,0,1.4,{r:.04});L.box(.2,2.55,.2,'#5a3e30',4.6,0,3.0,{r:.04});L.box(.2,2.55,.2,'#5a3e30',6.4,0,3.0,{r:.04});
 L.box(2.1,.7,1.9,'#6a4a38',5.5,.9,2.2,{r:.06});
 (function(){var x=5.6,z=2.4,yb=2.73;L.cyl(.45,.55,.3,'#3a2e2a',x,yb,z,{rough:.5});L.cyl(.06,.06,1.4,'#3a2e2a',x,yb+.3,z,{metal:.4});var sd=c.mesh(new THREE.CylinderGeometry(.6,.95,1.2,20,1,true),L.M('#f1e6dc',{rough:.9,side:THREE.DoubleSide,emis:'#ffd0b0',ei:.8}),x,yb+1.9,z,g);sd.castShadow=false;L.sph(.2,'#fff',x,yb+1.5,z,{mat:new THREE.MeshBasicMaterial({color:'#ffe6cf'}),ns:1});L.glow(x,yb+1.5,z,'#ffb48a',5.5,.6);L.pt('#ffb48a',1.1,x,yb+1.5,z+.6,10)})();
 L.mug(g,4.7,2.73,2.8,'#e8e2da');
 // sofa
 (function(){var G=L.grp(10,0,3.4,0),w=6.6,fab=L.fabric('floral','#5e4638','#8c6a4e',2,2);
  for(var s=-1;s<=1;s+=2)for(var t=-1;t<=1;t+=2)L.cyl(.14,.1,.45,'#2e2420',s*(w/2-.4),0,t*1.3,{par:G});
  L.box(w,1.15,3.4,'#7b4a40',0,.4,0,{par:G,map:fab,r:.25,s:4});
  for(i=0;i<2;i++)L.box((w-1.9)/2-.05,.75,2.6,'#7b4a40',-(w-1.9)/4+i*(w-1.9)/2+.025*(i?1:-1),1.4,.35,{par:G,map:fab,r:.3,s:4});
  for(i=0;i<2;i++){var bc=L.box((w-1.9)/2-.05,2.0,.95,'#7b4a40',-(w-1.9)/4+i*(w-1.9)/2,1.9,-1.05,{par:G,map:fab,r:.32,s:4});bc.rotation.x=-.12}
  L.box(w,2.9,1.0,'#6e4036',0,.4,-1.45,{par:G,map:fab,r:.3,s:4});
  [-1,1].forEach(function(s){L.box(.95,2.3,3.4,'#6e4036',s*(w/2-.45),.4,0,{par:G,map:fab,r:.3,s:4})});
  // pillows & blanket
  var p1=L.box(1.35,1.3,.5,__CK.a2,-2.4,2.2,.3,{par:G,r:.22,s:4,map:L.fabric('stripe',__CK.a2,'#f1e8e8',1,1)});p1.rotation.set(-.25,.3,.15);
  var p2=L.box(1.2,1.2,.45,'#3d5f63',2.3,2.15,.25,{par:G,r:.2,s:4});p2.rotation.set(-.2,-.25,-.1);
  var bl=L.box(2.3,.18,2.0,'#f1e8e8',2.3,2.05,.9,{par:G,r:.08,map:L.fabric('check','#f1e8e8',__CK.a2,2,2)});bl.rotation.y=.2})();
 // picture frame above wall (spot frame)
 L.frame(BW,15,6.7,2.4,3.0,L.photoTex(120,150,'team'),{frame:'#4a342a'});
 // hanging scarf above sofa
 L.hang(BW,10,8.7,.3,1.5,3.6,L.scarfTex(C1,'#f4f1ff'),{ph:1});L.box(2.4,.14,.25,'#3a2e2a',10,8.65,.18,{r:.04});
 // front door
 var dp=L.door(BW,18.1,2.2,7,{frame:'#5a4030',col:'#4e3426',open:.7,hinge:'left',inside:'#8ea0b2',peep:1,light:'#cfe0ee'});
 // coat hooks + coat beside door on back wall
 L.box(2.6,.25,.3,'#5a3e30',22,5.6,.15,{r:.05});for(i=0;i<4;i++)L.sph(.12,'#c9c4bc',20.9+i*.7,5.5,.35,{metal:.8,rough:.3,ns:1});
 L.box(1.7,3.3,.5,'#2e3a50',21.6,2.3,.55,{r:.25,s:4}).rotation.z=.03;L.box(1.1,2.0,.4,'#8a5a40',22.7,3.5,.5,{r:.2,s:4});
 L.hang(BW,20.9,5.5,.55,.55,2.2,L.scarfTex('#f4f1ff',C1),{ph:3});
 // gallery of frames
 var gy=[[20.5,7.3,1.1,1.4,'kid'],[22,7.5,1.5,1.1,'family'],[23.3,7.0,.9,1.2,'bw'],[20.9,5.7,0,0],[22.5,6.1,.9,.9,'bw']];
 gy.forEach(function(f,k){if(!f[2])return;L.frame(BW,f[0]+(k==2?-.2:0),f[1],f[2],f[3],L.photoTex(90,110,f[4],['#8a9ab0','#d8b8a8',__CK.a2,'#3d5f63','#2e3a50']),{frame:k%2?'#e6dccb':'#3a2a22',t:.2})});
 // console under gallery w/ key bowl + vase
 L.box(4.3,2.6,1.4,'#6a4a38',22,0,1.0,{r:.08,rough:.55});L.box(1.8,.6,.08,'#5a3e30',22,1.5,1.72,{r:.02});L.sph(.1,'#c9c4bc',22,1.8,1.78,{metal:.8,ns:1});L.box(1.8,.6,.08,'#5a3e30',22,.45,1.72,{r:.02});
 L.cyl(.55,.4,.3,'#5a7a8a',20.8,2.6,1.0,{rough:.3});for(i=0;i<3;i++)L.sph(.06,'#c9c4bc',20.6+i*.2,2.95,1.0,{metal:.8,ns:1});
 L.cyl(.4,.3,1.0,__CK.am,23.3,2.6,1.0,{rough:.35});for(i=0;i<5;i++){var st=L.cyl(.02,.02,1.4,'#3a7a4a',23.3+Math.sin(i)*.15,3.5,1.0,{});st.rotation.z=(i-2)*.18;L.sph(.2,[__CK.a,'#f4f1ff',__CK.a2][i%3],23.3+(i-2)*.28,4.8,1.0,{})}
 // east door (to kitchen) on right wall; kitchen light spills
 L.door(RW,5.4,2.6,7,{frame:'#5a4030',col:'#4e3426',open:1.35,hinge:'left',glow:'#ffd8c4',light:'#ffb48a'});
 L.pt('#ffb48a',.9,21.8,4,5.4,9);
 /* ---- left wall: TV unit & flag ---- */
 (function(){var G=L.grp(2.0,0,6.6,Math.PI/2);var bw='#6a4a38';
  L.box(3.4,2.8,3.9,bw,0,0,0,{par:G,r:.1,rough:.5});L.box(3.2,.08,.08,'#2a1e18',0,1.4,1.96,{par:G,ns:1});L.box(1.4,1.1,.06,'#5a3e30',-.9,1.3,1.97,{par:G,r:.02});L.box(1.4,1.1,.06,'#5a3e30',.9,1.3,1.97,{par:G,r:.02});
  L.box(3.0,.2,3.7,'#7a5a46',0,2.8,0,{par:G,r:.05});
  var tv=L.grp(0,0,0,0,G);tv.position.set(0,3.0,0);tv.rotation.y=.1;L.box(3.3,2.65,2.6,'#2a2a32',0,0,-.2,{par:tv,r:.2,s:4,rough:.45});L.box(2.7,2.05,.2,'#0e0e12',0,.3,1.1,{par:tv,r:.06});
  var cv=L.C(256,192),k=L.X(cv);var tvm=new THREE.MeshBasicMaterial({map:null,color:'#ffffff'});
  function draw(f){var gr=k.createLinearGradient(0,0,0,192);gr.addColorStop(0,'#4a8a5a');gr.addColorStop(1,'#2e6a42');k.fillStyle=gr;k.fillRect(0,0,256,192);for(var s=0;s<8;s++){k.fillStyle=s%2?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';k.fillRect(s*32,0,32,192)}k.strokeStyle='rgba(255,255,255,.85)';k.lineWidth=3;k.strokeRect(14,24,228,148);k.beginPath();k.moveTo(128,24);k.lineTo(128,172);k.stroke();k.beginPath();k.arc(128,98,24,0,7);k.stroke();var pl=[[60,70,__CK.a],[90,120,'#f4f1ff'],[150,90,__CK.a],[180,130,'#f4f1ff'],[120,60,__CK.a],[200,70,'#f4f1ff'],[70,140,__CK.a],[160,50,'#f4f1ff']];pl.forEach(function(p,q){k.fillStyle=p[2];k.beginPath();k.arc(p[0]+Math.sin(f*2+q)*6,p[1]+Math.cos(f*1.7+q*2)*5,5,0,7);k.fill()});k.fillStyle='#fff';k.beginPath();k.arc(128+Math.sin(f*3)*40,98+Math.cos(f*2.3)*30,3.5,0,7);k.fill();k.fillStyle='rgba(0,0,0,.7)';k.fillRect(8,8,64,16);k.fillStyle='#ffd9c4';k.font='bold 12px Arial';k.fillText('LIVE 1:0',14,20);for(var y=0;y<192;y+=3){k.fillStyle='rgba(0,0,0,.12)';k.fillRect(0,y,256,1)}}
  draw(0);var tt=c.tex(cv,1,1);tvm.map=tt;var scr=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.8),tvm);scr.position.set(0,1.3,1.21);tv.add(scr);
  L.glow(0,1.4,1.6,'#a8c8ff',6,.25,tv);var tl=L.pt('#a8c8ff',.7,4.4,3.2,6.6,9);var fr=0;
  c.tick(function(t){fr=t;if(Math.floor(t*6)%2===0){draw(t);tt.needsUpdate=true}tl.intensity=.6+Math.sin(t*23)*.12+Math.sin(t*7)*.1});
  L.cyl(.08,.08,.4,'#2a2a32',0,2.6,-.3,{par:tv});[-1,1].forEach(function(s){var a=L.cyl(.025,.025,2.0,'#c9c4bc',s*.2,2.9,-.3,{par:tv,metal:.8});a.rotation.z=s*-.7});
  // knobs
  for(i=0;i<3;i++)L.cyl(.13,.13,.1,'#c9c4bc',1.0+0*i,.5+i*.5,1.12,{par:tv,rx:Math.PI/2,metal:.5})})();
 // pennant above TV
 (function(){var cv=L.C(256,128),k=L.X(cv);k.fillStyle=C1;k.beginPath();k.moveTo(0,0);k.lineTo(256,64);k.lineTo(0,128);k.fill();k.fillStyle='#f4f1ff';k.font='900 46px Heebo, Arial';k.direction='ltr';k.textAlign='left';k.fillText(__CK.SHORT,14,80);L.pl(3.6,1.8,new THREE.MeshStandardMaterial({map:c.tex(cv,1,1),roughness:.9,side:THREE.DoubleSide,color:'#fff'}),-6.6,7.3,.12,{par:LW})})();
 /* ---- rug, coffee table, stool, phone table ---- */
 L.rug(9,6,__CK.add,'#4a2a34','#c8a89a','#2e3a50',.04,{x:12.2,z:6.8,rot:.3});
 (function(){var G=L.grp(11.8,0,6.6,.1);L.box(4.2,.18,2.4,'#7a5a46',0,1.55,0,{par:G,r:.07,rough:.45});[[-1.8,-.9],[1.8,-.9],[-1.8,.9],[1.8,.9]].forEach(function(p){L.box(.2,1.55,.2,'#5a3e30',p[0],0,p[1],{par:G,r:.04})});L.box(3.6,.1,1.8,'#6a4a38',0,.6,0,{par:G,r:.03});
  // newspaper
  var np=L.pl(1.8,1.3,L.M('#fff',{map:L.paperTex([{t:('Sport — '+__CK.Short),f:'900 44px',c:__CK.ad,dy:46},{t:'Round 12: Waiting for Saturday',f:'bold 26px',dy:34},{t:'Home Win, Big Hope',f:'20px',dy:26}],256,190,{rule:9}),rough:.9}),-.9,1.67,.1,{rx:-Math.PI/2,par:G});np.rotation.z=.2;
  // tea glass with steam, seeds bowl
  L.cyl(.2,.17,.5,'#e6eef0',.8,1.65,-.3,{par:G,tr:1,op:.55,rough:.1,seg:12});L.cyl(.16,.16,.3,'#8a3a22',.8,1.67,-.3,{par:G,seg:12,ns:1});L.cyl(.4,.3,.04,'#e8e2da',.8,1.65,-.3,{par:G,seg:14});L.steam(G,.8,2.2,-.3,5);
  L.cyl(.55,.35,.3,'#3d5f63',1.4,1.65,.35,{par:G,rough:.3,seg:16});for(i=0;i<12;i++)L.sph(.07,'#d8d4cc',1.4+Math.cos(i)*.3*Math.random(),1.95,.35+Math.sin(i)*.3*Math.random(),{par:G,sy:.6,ns:1});
  for(i=0;i<5;i++)L.sph(.05,'#2a2a30',-1.7+i*.22,1.7,.7+(i%2)*.1,{par:G,sy:.5,ns:1})})();
 (function(){var G=L.grp(5.5,0,7.4,-Math.PI/2);L.box(1.6,.2,1.6,'#8a5a40',0,1.15,0,{par:G,r:.08});[[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]].forEach(function(p){L.box(.14,1.15,.14,'#6a4a38',p[0],0,p[1],{par:G,r:.03})});L.box(1.3,.12,1.3,'#d8d0c4',0,1.33,0,{par:G,r:.05,map:L.fabric('stripe',__CK.a2,'#f1e8e8',1,1)})})();
 (function(){var G=L.grp(16.7,0,5.4,0);L.cyl(.9,.9,.14,'#8a5a40',0,2.75,0,{par:G,rough:.5});L.cyl(.12,.12,2.75,'#5a3e30',0,0,0,{par:G});L.cyl(.7,.8,.2,'#5a3e30',0,0,0,{par:G});
  // rotary phone
  L.box(1.0,.3,.9,__CK.ad,-.2,2.9,0,{par:G,r:.12,s:4,rough:.3});L.cyl(.3,.3,.06,'#e8e2da',-.2,3.18,0,{par:G,seg:14});L.box(1.1,.16,.28,__CK.add2,-.2,3.12,.5,{par:G,r:.07,rough:.3});
  L.box(.7,.04,.9,'#f1ece4',.45,2.89,.1,{par:G,r:.01,ns:1}).rotation.y=.3;L.cyl(.05,.05,.7,'#2a2a34',.5,2.93,.1,{par:G,rz:Math.PI/2});L.cyl(.1,.07,.32,__CK.ad,.1,2.9,-.4,{par:G});for(i=0;i<3;i++){var f=L.cyl(.02,.02,.9,'#3a7a4a',.1+(i-1)*.08,3.1,-.4,{par:G});f.rotation.z=(i-1)*.3;L.sph(.14,__CK.a,.1+(i-1)*.32,4.0,-.4,{par:G,sy:.8})}})();
 // cube radiator / bookshelf right wall front
 (function(){var G=L.grp(23.1,0,10.6,-Math.PI/2);L.shelf(G,0,0,0,4.2,3,{});var rows=[0,2.2,4.4];rows.forEach(function(y,k){L.books(G,-1.8,y+.22,0,k==2?7:11,{lean:k==0})});L.box(.9,.8,.5,__CK.am,1.0,6.62,0,{par:G,r:.06});L.cyl(.3,.3,.06,'#f4f1ff',1.0,7.45,0,{par:G,rx:Math.PI/2})})();
 // wall clock on right wall
 (function(){var cv=L.C(128,128),k=L.X(cv);k.fillStyle='#f4efe8';k.beginPath();k.arc(64,64,60,0,7);k.fill();k.strokeStyle='#3a2e2a';k.lineWidth=6;k.stroke();k.fillStyle='#2a2a34';for(var q=0;q<12;q++){k.save();k.translate(64,64);k.rotate(q*Math.PI/6);k.fillRect(-2,-54,4,10);k.restore()}var tx=c.tex(cv,1,1);L.pl(1.8,1.8,new THREE.MeshStandardMaterial({map:tx,roughness:.5,color:'#fff'}),10.8,7.2,.2,{par:RW});var sec=L.box(.04,.7,.03,__CK.ad,10.8,7.2,.26,{par:RW,r:.01,ns:1});sec.geometry.translate(0,.3,0);sec.position.y=7.2;L.box(.08,.5,.03,'#2a2a34',10.8,7.2,.24,{par:RW,r:.01,ns:1});L.box(.08,.7,.03,'#2a2a34',10.8,7.2,.25,{par:RW,r:.01,ns:1}).rotation.z=-1.3;c.tick(function(t){sec.rotation.z=-t*1.2})})();
 // plant in left front corner & lampshade etc
 L.plant(1.4,9.2,1.4,{pot:'#a8543c',n:13});
 // front-left door (to bedroom) on left wall
 L.door(LW,-12.0,2.2,7,{frame:'#5a4030',col:'#4e3426',open:.15,inside:'#201a1c'});
 /* the floor stays clear to walk: the pouf lives by the sofa */
 L.cyl(1.0,1.0,.5,__CK.ad,5.5,0,4.7,{rough:.9,seg:24});
 L.fan(14.8,2.3,-.4);
 /* ---- people ---- */
 c.person({skin:SK[1],top:__CK.a2,bot:'#2a3040',hair:'#4a4a50',style:'short',stubble:true,scarf:[C1,'#f4f1ff'],w:1.25,mode:'sit',s:1.1,ry:-.55,eye:'#4a3a2a'},{x:9.9,z:3.5});
 c.person({skin:SK[2],top:'#3d6a6a',bot:'#2e2a3a',hair:'#2a1a14',style:'bun',w:.92,mode:'listen',s:1.05,ry:-.9,lash:true,necklace:true,look:-.3},{x:20.8,z:8.4});
 c.setCam(3.25,3.65,8.7,3.25,.62,.95,37,56)}});
/* ===== bedroom ===== */
RM.def('bedroom',{kind:'home',build:function(c){var L=lib(c),g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i;
 c.sky('indoor');
 var wB=L.wallTex(24,9,{base:'#d6d4cc',paper:'motif',p2:'#c8c5bb',dado:3.1,dadoCol:'#869ba2',rail:'#b8bbb5',stain:1});
 var wL=L.wallTex(14,9,{base:'#d6d4cc',paper:'motif',p2:'#c8c5bb',dado:3.1,dadoCol:'#869ba2',rail:'#b8bbb5',stain:1});
 L.shell({floor:L.terrazzo('#9d968c',5.45,3.2),floorRough:.4,wallB:wB,wallL:wL,right:true,skirt:'#7d8c90',edge:'#bfc2bc'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 c.light('hemi','#ffe6cf',.34,0,0,0,'#322a2e');
 L.key('#ffe6cf',.78,5.4,9.5,7.5,3.2,1.9,7);
 /* window on right wall + light */
 L.window(RW,3.6,3.4,3.8,4.4,{view:L.sky('day',3.8,4.4),frame:'#f1ece4',curtain:'#5a86a8',curtain2:'#7aa4c4'});
 L.pt('#dcecff',.7,22.4,5.2,3.6,12);
 (function(){var cv=L.C(256,256),k=L.X(cv);k.fillStyle='#ffe6d8';for(var a=0;a<2;a++)for(var b=0;b<2;b++)k.fillRect(10+a*122,10+b*122,112,112);var tx=c.tex(cv,1,1);var geo=new THREE.PlaneGeometry(6,6.4);var P=geo.attributes.position;for(var q=0;q<P.count;q++){P.setX(q,P.getX(q)-P.getY(q)*.5)}var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:.14,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(18.2,.06,5.4);g.add(m)})();
 /* ---- bed (head at left wall, against back wall) ---- */
 (function(){var G=L.grp(5.0,0,3.3,0),wd='#7a5a46';
  [[-3.5,-1.95],[3.5,-1.95],[-3.5,1.95],[3.5,1.95]].forEach(function(p){L.box(.4,.7,.4,'#5a3e30',p[0],0,p[1],{par:G,r:.08})});
  L.box(7.6,.8,4.4,wd,0,.5,0,{par:G,r:.12,rough:.55});
  var hb=L.box(.55,4.2,4.8,wd,-3.9,.3,0,{par:G,r:.15,rough:.55});L.box(.2,3.2,4.2,'#8a6a54',-3.62,.9,0,{par:G,r:.08,rough:.5});
  L.box(.4,2.2,4.6,wd,3.9,.3,0,{par:G,r:.12});
  L.box(7.0,.7,4.0,'#e8e2da',-.05,1.2,0,{par:G,r:.25,s:4,map:L.fabric('plain','#ece6de','#fff',1,1)});
  var bl=L.box(4.6,.55,4.35,__CK.a2,1.5,1.8,0,{par:G,r:.22,s:4,map:L.fabric('stripe','#b02a38','#f1e8e8',2,2)});
  var bl2=L.box(1.0,.5,4.4,'#7a2228',-.9,1.95,0,{par:G,r:.2,s:4,map:L.fabric('stripe','#b02a38','#f1e8e8',2,2)});bl2.rotation.z=.12;
  var p1=L.box(2.2,.7,1.9,'#f4f1ee',-2.6,1.9,-.9,{par:G,r:.3,s:4,map:L.fabric('plain','#f4f1ee','#fff',1,1)});p1.rotation.y=.05;
  var p2=L.box(2.0,.65,1.7,'#e6ecf0',-2.5,1.9,1.0,{par:G,r:.3,s:4});p2.rotation.y=-.1;
  // scarf on bedpost
  L.hang(G,-3.9,4.3,2.5,.7,3.1,L.scarfTex(C1,'#f4f1ff'),{ph:2}).rotation.y=Math.PI/2;
  // teddy
  L.sph(.55,'#8a5a40',-2.9,2.5,1.1,{par:G,rough:.95});L.sph(.38,'#8a5a40',-2.9,3.15,1.1,{par:G,rough:.95});L.sph(.14,'#8a5a40',-3.15,3.5,1.0,{par:G});L.sph(.14,'#8a5a40',-2.65,3.5,1.0,{par:G})})();
 // boots under bed
 L.box(.8,.5,1.7,'#2a2a30',6.8,0,5.9,{r:.2,s:4}).rotation.y=.3;L.box(.8,.5,1.7,'#2a2a30',7.6,0,6.4,{r:.2,s:4}).rotation.y=.1;
 L.cyl(.1,.1,.4,'#f4f1ee',7.1,.5,5.2,{});
 /* shelf over bed + poster */
 L.box(6.0,.22,1.2,'#8a6a54',5.2,5.7,.7,{r:.05});L.box(.3,.5,.9,'#5a3e30',2.6,5.2,.7,{r:.05});L.box(.3,.5,.9,'#5a3e30',7.8,5.2,.7,{r:.05});
 L.books(BW,3.6,5.92,.65,9,{hmin:1,hmax:1.5,d:.9});
 for(i=0;i<3;i++){L.cyl(.3,.22,.9,'#c8ccd0',6.3+i*.7,5.92,.65,{metal:.85,rough:.25});L.cyl(.4,.3,.12,'#3a2e2a',6.3+i*.7,5.9,.65,{})}
 L.cyl(.32,.32,.1,'#f4f1ee',7.9,5.92,.7,{rx:Math.PI/2});
 L.pl(2.4,3.2,L.M('#fff',{map:L.posterTex(192,256,C1,[{t:__CK.SHORT,f:'900 62px',y:90},{t:__CK.City,f:'bold 38px',y:140,c:'#f4f1ff'},{t:'Champions',f:'900 40px',y:222,c:'#ffd9d0'}],{band:'#f4f1ff'}),rough:.7}),5.2,7.4,.08,{par:BW});
 L.pl(1.8,2.4,L.M('#fff',{map:L.posterTex(144,192,'#2e3a50',[{t:('GATE '+__CK.n2),f:'900 56px',y:80},{t:'Every Saturday',f:'bold 30px',y:130,c:'#e8d0d0'}],{bd:__CK.a2}),rough:.7}),8.3,6.6,.08,{par:BW});
 /* ---- wardrobe ---- */
 (function(){var G=L.grp(11.9,0,1.5,0),wd='#8a6a52';L.box(4.9,7.3,2.4,wd,0,0,0,{par:G,r:.1,rough:.55});L.box(5.3,.35,2.6,'#6a4a38',0,7.3,0,{par:G,r:.06});
  var cv=L.C(128,256),k=L.X(cv),gr=k.createLinearGradient(0,0,128,256);gr.addColorStop(0,'#c8d4de');gr.addColorStop(.5,'#9aaabb');gr.addColorStop(1,'#cdd8e2');k.fillStyle=gr;k.fillRect(0,0,128,256);k.fillStyle='rgba(255,255,255,.35)';k.beginPath();k.moveTo(20,0);k.lineTo(50,0);k.lineTo(10,256);k.lineTo(-20,256);k.fill();var mt=c.tex(cv,1,1);
  L.box(2.2,6.3,.1,'#6a4a38',-1.2,.5,1.22,{par:G,r:.03});L.pl(1.9,6.0,new THREE.MeshBasicMaterial({map:mt,color:'#fff'}),-1.2,3.5,1.28,{par:G});
  L.box(2.2,6.3,.1,'#7a5a44',1.2,.5,1.22,{par:G,r:.03});L.box(1.7,2.7,.06,'#6a4a38',1.2,.9,1.29,{par:G,r:.02});L.box(1.7,2.5,.06,'#6a4a38',1.2,3.9,1.29,{par:G,r:.02});
  L.cyl(.07,.07,.9,'#c9c4bc',.2,3.1,1.34,{par:G,metal:.8,rough:.3});L.cyl(.07,.07,.9,'#c9c4bc',-.2,3.1,1.34,{par:G,metal:.8,rough:.3});
  // red jersey on hanger on wardrobe
  L.box(.9,.05,.05,'#b8b2aa',1.2,6.3,1.36,{par:G,metal:.7,ns:1});var jt=L.box(1.9,2.1,.2,C1,1.2,3.9,1.42,{par:G,r:.12,rough:.8});L.box(.6,.4,.05,'#f4f1ff',1.2,5.3,1.54,{par:G,r:.05,ns:1});
  // sock peeking from drawer
  L.box(.9,.3,.5,'#f4f1ff',-.5,.3,1.55,{par:G,r:.1,ns:1}).rotation.y=.4;L.box(.3,.4,.3,__CK.a2,-.2,.35,1.58,{par:G,r:.1,ns:1}).rotation.y=-.2;
  // scarf tied on handle & cap on top
  L.cyl(.8,.9,.4,'#2e3a50',-1.4,7.65,0,{par:G,rough:.9});L.cyl(.9,.9,.1,'#2e3a50',-1.4,8.0,.4,{par:G});L.box(1.1,.15,1.0,'#1e2a40',-1.4,7.65,.9,{par:G,r:.05})})();
 /* ---- desk + chair + corkboard ---- */
 (function(){var G=L.grp(17.0,0,1.5,0),wd='#8a6a54';
  L.box(5.2,.2,2.6,wd,0,3.0,0,{par:G,r:.07,rough:.5});[[-2.4,-1.1],[2.4,-1.1],[-2.4,1.1],[2.4,1.1]].forEach(function(p){L.box(.22,3.0,.22,'#5a3e30',p[0],0,p[1],{par:G,r:.04})});L.box(1.8,2.0,2.3,'#7a5a44',1.5,1.0,0,{par:G,r:.07});for(i=0;i<3;i++){L.box(1.6,.55,.06,'#6a4a38',1.5,1.05+i*.62,1.18,{par:G,r:.02});L.sph(.08,'#c9c4bc',1.5,1.3+i*.62,1.25,{par:G,metal:.8,ns:1})}
  // desk lamp (peach), books, cassette recorder, mug, pencils
  L.cyl(.5,.55,.14,'#2a2a34',-1.8,3.2,-.4,{par:G});var arm=L.cyl(.05,.05,1.5,'#2a2a34',-1.7,3.3,-.4,{par:G});arm.rotation.z=-.3;var arm2=L.cyl(.05,.05,1.3,'#2a2a34',-1.2,4.6,-.4,{par:G});arm2.rotation.z=1.0;L.cyl(.2,.5,.5,__CK.a2,-.75,4.65,-.4,{par:G,seg:14}).rotation.z=.6;L.glow(-.7,4.4,-.35,'#ffb48a',3,.5,G);L.pt('#ffb48a',.8,15.4,5.2,1.9,8);
  L.books(G,-.4,3.2,-.7,5,{hmin:.8,hmax:1.2,d:1.0});L.box(1.6,.45,.9,'#2e3238',1.3,3.2,-.4,{par:G,r:.1,rough:.4});L.cyl(.18,.18,.04,'#c9c4bc',1.0,3.65,-.1,{par:G,rx:1.57,metal:.6});L.cyl(.18,.18,.04,'#c9c4bc',1.6,3.65,-.1,{par:G,rx:1.57,metal:.6});
  L.cyl(.25,.22,.55,'#e8e2da',-.6,3.2,.8,{par:G});for(i=0;i<5;i++){var pc=L.cyl(.025,.025,.9,[__CK.a,'#2d4a6b','#3a7a4a',__CK.a2,'#5a3a5a'][i],-.6+(i-2)*.07,3.5,.8,{par:G});pc.rotation.z=(i-2)*.18}
  L.box(1.5,.05,1.1,'#f1ece4',.2,3.2,.9,{par:G,r:.02,ns:1,map:L.paperTex([{t:'Homework',f:'bold 30px',dy:34},{t:'Maths',f:'24px',dy:28}],128,96,{rule:5})}).rotation.y=.12;
  // corkboard
  L.box(4.2,2.6,.16,'#8a5a40',0,4.9,-1.12,{par:G,r:.04});L.pl(3.9,2.3,L.M('#b88a6a',{rough:1}),0,6.05,-1.0,{par:G});
  var cards=[[-1.4,6.4,.7,.95,__CK.a2],[-.5,6.0,.7,.95,'#f4f1ff'],[.4,6.5,.7,.95,'#2d4a6b'],[1.3,6.0,.7,.95,__CK.a2],[-1.3,5.6,.5,.7,'#3a7a4a']];cards.forEach(function(q,k){var cd=L.box(q[2],q[3],.04,q[4],q[0],q[1]-q[3]/2,-.96,{par:G,r:.03,ns:1});cd.rotation.z=(k-2)*.07;L.sph(.07,__CK.a,q[0],q[1]-.05,-.92,{par:G,ns:1})});
  L.pl(1.1,.8,L.M('#fff',{map:L.photoTex(80,60,'team')}),.6,5.4,-.94,{par:G}).rotation.z=.04;
  var ct=L.pl(.9,.7,L.M('#fff',{map:L.paperTex([{t:'3 more days',f:'900 38px',c:__CK.ad,dy:44},{t:'TO THE MATCH!',f:'900 34px',c:__CK.ad}],128,96,{bg:'#f4f1ee'})}),-.2,5.0,-.94,{par:G});
  // chair
  var CH=L.grp(0,0,3.0,.15,G);L.box(1.9,.2,1.8,'#6a4a38',0,2.1,0,{par:CH,r:.07});[[-.8,-.7],[.8,-.7],[-.8,.7],[.8,.7]].forEach(function(p){L.box(.14,2.1,.14,'#4a3226',p[0],0,p[1],{par:CH,r:.03})});L.box(1.8,1.9,.14,'#6a4a38',0,2.3,-.85,{par:CH,r:.05});L.box(1.5,.3,.05,'#8a5a40',0,3.7,-.78,{par:CH,r:.02,ns:1});
  var sw=L.box(1.7,.12,1.6,__CK.a2,0,2.32,0,{par:CH,r:.05,map:L.fabric('plain',__CK.ad,__CK.a2)})})();
 /* ---- door (back wall) ---- */
 L.door(BW,20.9,2.2,7,{frame:'#efe8dc',col:'#9a6a50',open:.55,hinge:'left',inside:'#6a5a5a',glow:'#f0dcd0',light:'#ffd8c4'});
 L.box(1.7,2.3,.06,'#2e3a50',23.4,5.4,.08,{r:.02});L.pl(1.5,2.1,L.M('#fff',{map:L.paperTex([{t:'October',f:'900 30px',c:__CK.ad,dy:38},{t:'A  B  C  D  E  F  G',f:'18px',dy:24},{t:'1  2  3  4  5  6  7',f:'18px',dy:20},{t:'8  9  10  11  12  13  14',f:'18px',dy:20},{t:'15 16 17 18 19 20 21',f:'18px',dy:20},{t:'22 23 24 25 26 27 28',f:'18px',dy:20}],150,170,{bg:'#f4f1ee'})}),23.4,5.4,.12,{par:BW});
 /* ---- left wall: flag, red box on floor ---- */
 (function(){var cv=L.C(256,170),k=L.X(cv);k.fillStyle=C1;k.fillRect(0,0,256,170);k.fillStyle='#f4f1ff';k.fillRect(0,64,256,42);k.fillStyle=C1;k.font='900 44px Heebo, Arial';k.direction='ltr';k.textAlign='center';k.fillText(__CK.SHORT,128,98);k.fillStyle='#f4f1ff';k.font='900 24px Heebo, Arial';k.fillText((__CK.CITY+'  ·  TOGETHER'),128,32);k.fillText('FOREVER',128,150);L.nz(k,256,170,8);var fm=L.hang(LW,-5.3,8.2,.28,4.4,2.9,c.tex(cv,1,1),{ph:5});L.box(4.8,.14,.25,'#3a2e22',-5.3,8.14,.16,{par:LW,r:.04})})();
 (function(){var G=L.grp(4.6,0,6.3,.1);L.box(2.8,1.6,1.9,__CK.ad,0,0,0,{par:G,r:.12,rough:.55});L.box(3.0,.45,2.1,__CK.add2,0,1.6,0,{par:G,r:.1,rough:.55});L.pl(1.7,.5,L.M('#fff',{map:L.posterTex(180,52,__CK.ad,[{t:'The Red Box',f:'900 34px',y:40}],{bd:'rgba(255,255,255,0)'})}),0,.85,1.07,{par:G});L.box(.7,.4,.1,'#c9c4bc',0,1.3,1.06,{par:G,metal:.7,r:.04});
  L.box(1.2,.05,.9,'#f4f1ee',.5,2.05,.1,{par:G,r:.02,ns:1}).rotation.y=.3;L.box(.9,.04,.7,'#e8d0d0',-.4,2.06,-.3,{par:G,r:.02,ns:1}).rotation.y=-.5})();
 // toys / comics on floor and rug
 L.rug(7,4.4,'#2e3a50',__CK.add,'#c8a89a','#e0d6c8',.04,{x:13.4,z:8.4,rot:-.4});
 L.ball(11.9,.45,7.8,.45);
 /* (tidied: the comics are on the desk now, the bag is in the wardrobe) */
 // nightstand with alarm clock and glass
 L.box(1.6,2.1,1.6,'#7a5a46',9.3,0,2.7,{r:.08});L.box(.8,.55,.5,'#f4f1ee',9.3,2.1,2.5,{r:.1,s:4,rough:.4});L.glow(9.3,2.35,2.76,'#ffb48a',1.6,.5);L.mug(g,9.9,2.1,2.9,'#e6eef0');
 L.box(.6,.35,1.3,'#f4f1ee',8.6,0,4.9,{r:.15,s:4}).rotation.y=.1;L.box(.6,.35,1.3,'#f4f1ee',9.3,0,5.0,{r:.15,s:4}).rotation.y=-.05;
 L.fan(12.3,2.0,.3,{blade:'#c8c2b4'});L.bulb(12,10.5,6.5,{cord:2.2,int:.5});
 /* people */
 c.person({skin:SK[1],top:__CK.a2,bot:'#2a3040',hair:'#2a1a14',style:'short',w:.9,mode:'sit',s:.74,ry:1.57,eye:'#3a2a1c'},{x:5.7,z:3.4});
 c.person({skin:SK[2],top:'#e8e4de',bot:'#3a4a6a',hair:'#1a1210',style:'buzz',w:.9,mode:'talk',s:.78,ry:-1.2,eye:'#3a2a1c',look:.2},{x:14.4,z:7.2});
 c.setCam(3.25,3.6,8.7,3.25,.6,.95,35.5,55)}});
/* ===== kitchen ===== */
RM.def('kitchen',{kind:'home',build:function(c){var L=lib(c),g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i;
 c.sky('indoor');
 var wB=L.wallTex(24,9,{base:'#dcd8d0',dado:4.0,tiles:1.0,dadoCol:'#e4e3dc',dadoCol2:'#dad9d1',rail:'#93a3a1',stain:0});
 var wL=L.wallTex(14,9,{base:'#dcd8d0',dado:4.0,tiles:1.0,dadoCol:'#e4e3dc',dadoCol2:'#dad9d1',rail:'#93a3a1',stain:0});
 L.shell({floor:L.lino('#d4d0c8','#b4b1a9',6,3.6),floorRough:.4,wallB:wB,wallL:wL,right:true,skirt:'#8a6a58',edge:'#cfc3b3'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 c.light('hemi','#ffe6cf',.34,0,0,0,'#352c30');
 L.key('#ffe6cf',.8,5.4,9.5,7.5,3.2,1.9,7);
 /* window */
 L.window(BW,12.7,3.9,3.7,3.8,{view:L.sky('day',3.7,3.8),frame:'#f1ece4',cols:2,rows:1,curtain:__CK.a2,curtain2:'#f1e8e8'});
 L.pt('#dcecff',.8,12.7,5.4,2.6,11);
 (function(){var cv=L.C(256,256),k=L.X(cv);k.fillStyle='#ffe6d8';for(var a=0;a<2;a++)for(var b=0;b<2;b++)k.fillRect(10+a*122,10+b*122,112,112);var tx=c.tex(cv,1,1);var geo=new THREE.PlaneGeometry(4,5);var P=geo.attributes.position;for(var q=0;q<P.count;q++){P.setX(q,P.getX(q)+P.getY(q)*.25)}var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:.13,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(12.0,.06,4.6);g.add(m)})();
 // plants on sill
 for(i=0;i<3;i++){L.cyl(.32,.25,.55,'#a8543c',11.4+i*1.2,3.9,.7,{rough:.7});for(var q=0;q<6;q++)L.sph(.2,'#3a7a4a',11.4+i*1.2+Math.cos(q*1.05)*.18,4.7+(q%2)*.1,.7+Math.sin(q*1.05)*.18,{sy:.8})}
 /* counter along back wall */
 (function(){var wd='#8a6a54',top='#e8e4de';
  L.box(6.4,3.3,2.5,'#d8d2c8',5.2,0,1.45,{r:.08,rough:.5});for(i=0;i<3;i++){L.box(1.9,2.2,.07,'#4f7f78',3.2+i*2.0,.5,2.72,{r:.03,rough:.5});L.sph(.09,'#c9c4bc',3.9+i*2.0,1.9,2.78,{metal:.8,ns:1})}
  L.box(1.9,.6,.07,'#4f7f78',3.2,2.55,2.72,{r:.03});L.sph(.09,'#c9c4bc',3.2,2.75,2.78,{metal:.8,ns:1});
  L.box(6.8,.28,2.7,top,5.2,3.3,1.45,{r:.07,rough:.35});
  // sink
  L.box(1.9,.18,1.4,'#b8c0c6',7.0,3.5,1.6,{r:.05,metal:.8,rough:.25});L.cyl(.08,.08,1.2,'#b8c0c6',7.0,3.55,.7,{metal:.9,rough:.2});var sp=L.cyl(.06,.06,.6,'#b8c0c6',7.0,4.6,.9,{metal:.9,rough:.2,rx:Math.PI/2});
  // dish rack with plates
  L.box(1.5,.1,1.0,'#8a929a',4.2,3.58,.8,{r:.03,metal:.6});for(i=0;i<5;i++)L.cyl(.5,.5,.05,i%2?'#e8e2da':'#d4dde0',3.6+i*.28,3.65,.8,{rx:1.2,seg:14,rough:.3});
  // gas hob + pot + kettle (steam)
  L.box(2.4,.12,1.8,'#2e2e34',2.4,3.58,1.5,{r:.04,rough:.4});for(i=0;i<2;i++)L.cyl(.4,.4,.06,'#1a1a20',1.8+i*1.1,3.7,1.4,{seg:14});
  L.cyl(.65,.6,1.1,'#aab2ba',1.8,3.7,1.4,{metal:.8,rough:.3});L.cyl(.68,.68,.12,'#aab2ba',1.8,4.8,1.4,{metal:.8,rough:.3});L.cyl(.1,.1,.2,'#2a2a30',1.8,4.9,1.4,{});L.steam(g,1.8,5.1,1.4,6);
  L.cyl(.4,.45,.6,__CK.a2,3.0,3.7,1.4,{rough:.3});var sp2=L.cyl(.06,.06,.5,__CK.a2,3.4,4.1,1.4,{rotation:0});sp2.rotation.z=1.0;L.sph(.12,'#2a2a30',3.0,4.4,1.4,{});L.steam(g,3.55,4.5,1.4,4);
  // hanging utensils rail
  L.cyl(.05,.05,3.4,'#8a929a',2.7,6.0,.5,{rz:Math.PI/2,metal:.8});for(i=0;i<5;i++){L.cyl(.015,.015,.5,'#8a929a',1.4+i*.65,5.5,.5,{});L.cyl(.35,.3,.55,i%2?'#8a929a':__CK.a2,1.4+i*.65,4.9,.5,{metal:i%2?.7:.1,rough:.4})}
  L.box(.4,.08,.08,'#3a2a22',1.7,3.7+0,2.2,{ns:1})})();
 /* fridge */
 (function(){var G=L.grp(9.4,0,1.45,0);L.box(2.8,7.2,2.6,'#e6e4de',0,.2,0,{par:G,r:.28,s:4,rough:.3,metal:.1});L.box(2.7,.06,.1,'#9a9a9a',0,2.95,1.3,{par:G,ns:1});L.box(.18,2.4,.28,'#b8b2aa',-.95,3.5,1.4,{par:G,metal:.8,rough:.25,r:.07});L.box(.18,1.8,.28,'#b8b2aa',-.95,.9,1.4,{par:G,metal:.8,rough:.25,r:.07});
  L.box(1.2,.35,.04,__CK.a2,.5,5.9,1.3,{par:G,ns:1,r:.02});var mg=[__CK.a,'#3a7a8a','#f4f1ff','#2d4a6b','#5a3a5a'];
  L.pl(1.1,.8,L.M('#fff',{map:L.paperTex([{t:'Fixtures',f:'900 30px',c:__CK.ad,dy:36},{t:'Sat 17:00 Home',f:'22px',dy:26},{t:'Sat 20:00 Away',f:'22px'}],128,96,{bg:'#f4f1ee'})}),-.3,4.7,1.33,{par:G}).rotation.z=-.05;
  L.pl(.9,1.1,L.M('#fff',{map:L.photoTex(70,86,'kid')}),.7,4.3,1.33,{par:G}).rotation.z=.06;
  L.pl(.9,.7,L.M('#fff',{map:L.paperTex([{t:'Drawing: Dad & the Cup',f:'bold 18px',c:'#2d4a6b'}],110,70,{bg:'#e8d8d4'})}),-.2,3.5,1.33,{par:G});
  for(i=0;i<7;i++)L.sph(.1,mg[i%5],-1+Math.cos(i*2.1)*.7+.8,4+Math.sin(i*1.7)*1.3+.4,1.33,{par:G,sz:.4,ns:1,sy:.8});
  L.box(1.8,.55,1.1,'#7a5a46',0,7.4,0,{par:G,r:.1});L.cyl(.35,.3,.7,__CK.am,.9,7.4,0,{par:G,rough:.3})})();
 /* radio on shelf + wall shelf */
 L.box(2.9,.24,1.2,'#8a6a54',17.9,5.0,.7,{r:.05});L.box(.25,.7,.9,'#5a3e30',16.6,4.4,.6,{r:.05});L.box(.25,.7,.9,'#5a3e30',19.2,4.4,.6,{r:.05});
 (function(){var G=L.grp(17.9,5.24,.7,-.08);L.box(2.4,1.5,.9,'#2e2a28',0,0,0,{par:G,r:.15,s:4,rough:.45});var gc=L.C(128,128),k=L.X(gc);k.fillStyle='#1a1614';k.fillRect(0,0,128,128);k.strokeStyle='#6a5a52';k.lineWidth=3;for(var q=4;q<128;q+=8){k.beginPath();k.moveTo(q,0);k.lineTo(q,128);k.stroke()}var gm=L.pl(1.0,1.15,new THREE.MeshStandardMaterial({map:c.tex(gc,1,1),roughness:.6,color:'#fff'}),-.55,.75,.46,{par:G});
  L.box(.95,.4,.04,'#e6d8cc',.55,1.05,.46,{par:G,r:.02,emis:'#ffb090',ei:.9,ns:1});var nd=L.box(.03,.4,.05,__CK.a2,.4,1.05,.5,{par:G,r:.01,ns:1,emis:'#ff3a4a'});L.cyl(.17,.17,.08,'#c9c4bc',.2,.4,.47,{par:G,rx:Math.PI/2,metal:.6});L.cyl(.17,.17,.08,'#c9c4bc',.85,.4,.47,{par:G,rx:Math.PI/2,metal:.6});var an=L.cyl(.02,.02,2.4,'#c9c4bc',.9,1.4,0,{par:G,metal:.8});an.rotation.z=-.5;L.glow(.55,1.05,.6,'#ff9a7a',1.8,.35,G);
  c.tick(function(t){nd.position.x=.4+Math.sin(t*.4)*.1;gm.scale.set(1+Math.sin(t*14)*.01,1+Math.sin(t*14)*.01,1)})})();
 L.box(3.8,.24,1.1,'#8a6a54',18.6,7.0,.65,{r:.05});for(i=0;i<5;i++)L.cyl(.55,.55,.07,i%2?'#e8e2da':'#d4dde0',17.4+i*.55,7.5,.35,{rx:1.2,seg:14,rough:.3});for(i=0;i<3;i++)L.cyl(.32,.28,.7,[__CK.a2,'#3d5f63','#e8e2da'][i],19.2+i*.55,7.25,.65,{rough:.3});
 L.cat(7.6,7.6,.5,'#9a9aa0');L.box(1.4,1.1,1.0,'#6a4a38',3.2,0,11.0,{r:.15,s:4,map:L.fabric('check','#8a5a40','#a8765a',2,2)});L.cyl(.7,.6,.7,'#d8d0c4',5.0,0,11.6,{rough:.9});L.cyl(.05,.05,3.6,'#6a4a38',5.9,0,11.4,{rx:0}); L.hang(BW,22.9,6.0,.2,.9,1.7,L.scarfTex('#f1e8e8',__CK.a2),{ph:2});L.box(1.2,.12,.2,'#5a3e30',22.9,5.95,.12,{ns:1});
 /* door on back wall (to the living room) */
 L.door(BW,20.7,2.2,7,{frame:'#efe8dc',col:'#8a5a40',open:.5,hinge:'right',glow:'#ffd0b8',light:'#ffb48a'});
 /* table + chairs */
 (function(){var G=L.grp(13.4,0,6.5,0);var chk=L.fabric('check','#f1e8e8',__CK.a2,3,1.5);L.box(7.4,.2,3.0,'#8a6a54',0,3.0,0,{par:G,r:.07});[[-3.4,-1.2],[3.4,-1.2],[-3.4,1.2],[3.4,1.2]].forEach(function(p){L.box(.28,3.0,.28,'#5a3e30',p[0],0,p[1],{par:G,r:.05})});
  L.box(7.6,.12,3.2,'#f1e8e8',0,3.2,0,{par:G,r:.04,map:chk,rough:.9});L.box(7.6,.9,.1,'#f1e8e8',0,2.35,1.6,{par:G,r:.03,map:chk,rough:.9});
  // things on the table
  L.cyl(1.0,.75,.35,'#3d5f63',-1.8,3.32,-.3,{par:G,rough:.3});L.sph(.36,'#d8742a',-2.1,3.88,-.4,{par:G});L.sph(.34,'#d8742a',-1.6,3.84,-.15,{par:G});L.sph(.32,__CK.a2,-1.8,3.92,-.6,{par:G});
  L.box(1.5,.28,.7,'#c8895a',0,3.46,.5,{par:G,r:.14,s:4,rough:.8});L.box(1.1,.2,.5,'#c8895a',.1,3.7,.5,{par:G,r:.1,s:4});L.cyl(.6,.6,.06,'#e8e2da',.1,3.32,.5,{par:G,seg:16,rough:.3});
  L.mug(G,2.3,3.32,-.5,'#e6eef0');L.steam(G,2.3,3.85,-.5,4);L.cyl(.22,.18,.38,'#e6eef0',2.9,3.32,.3,{par:G,tr:1,op:.55,rough:.1,seg:12});L.cyl(.17,.17,.28,'#8a3a22',2.9,3.34,.3,{par:G,seg:12,ns:1});L.steam(G,2.9,3.8,.3,4);
  L.cyl(.14,.14,.4,'#e8e2da',1.0,3.32,-.8,{par:G});L.cyl(.14,.14,.4,'#e8e2da',1.35,3.32,-.8,{par:G});L.cyl(.55,.5,.08,'#e8e2da',-.3,3.32,.7,{par:G,seg:16});L.sph(.18,__CK.a2,-.4,3.5,.7,{par:G});L.sph(.16,'#3a7a4a',-.1,3.48,.75,{par:G});
  L.box(1.7,.04,1.2,'#e6e0d8',-2.8,3.3,.8,{par:G,r:.02,ns:1,map:L.paperTex([{t:'MAARIV  SPORT',f:'900 32px',c:__CK.ad,dy:38},{t:(__CK.Short+' Wins'),f:'bold 24px',dy:28},{t:'BIG!',f:'bold 24px'}],140,96,{bg:'#eee9e0',rule:4})}).rotation.y=.25})();
 L.chair(10.6,8.9,Math.PI,{cush:__CK.ad,h:1.9});L.chair(13.6,8.9,Math.PI+.15,{cush:__CK.ad,h:1.9});L.chair(16.3,8.8,Math.PI-.2,{cush:__CK.ad,h:1.9});
 L.chair(11.0,4.0,.1,{cush:'#3d5f63',h:1.9});
 L.chair(17.5,6.5,-Math.PI/2,{cush:__CK.ad,h:1.9});
 L.hang(g,17.4,4.5,6.7,.6,1.6,L.scarfTex(C1,'#f4f1ff'),{ph:4});
 /* pantry on left wall + bin */
 (function(){var G=L.grp(.9,0,4.6,Math.PI/2);L.box(3.2,8.0,1.8,'#5a8a82',0,0,0,{par:G,r:.1,rough:.5});L.box(1.5,6.0,.07,'#4f7f78',-.8,1.6,.9,{par:G,r:.03});L.box(1.5,6.0,.07,'#4f7f78',.8,1.6,.9,{par:G,r:.03});L.sph(.08,'#c9c4bc',-.1,3.5,.97,{par:G,ns:1});L.sph(.08,'#c9c4bc',.1,3.5,.97,{par:G,ns:1});L.box(3.0,1.2,.07,'#4f7f78',0,.3,.9,{par:G,r:.03})})();
 L.box(1.0,1.7,1.0,'#8a929a',2.6,0,10.4,{r:.2,s:4,metal:.5,rough:.4});L.cyl(.5,.5,.1,'#6a727a',2.6,1.7,10.4,{});
 (function(){var G=L.grp(23.0,0,8.2,-Math.PI/2);L.cyl(.9,.8,1.2,'#8a5a40',0,0,0,{par:G,rough:.7});L.sph(.65,'#d8742a',0,1.5,0,{par:G});L.sph(.5,__CK.a2,.5,1.4,.3,{par:G});L.sph(.45,'#3a7a4a',-.4,1.4,.3,{par:G})})();
 L.rug(4.4,2.4,__CK.ad,'#d8cfc2',__CK.ad,'#2e3a50',.04,{x:13.4,z:8.8,rot:0});
 /* people */
 c.person({skin:SK[2],top:'#e8e4de',bot:'#3a3a4a',hair:'#2a1a14',style:'bun',apron:__CK.am,w:.92,mode:'arrange',s:1.04,lash:true,ry:3.0},{x:5.0,z:4.5});
 c.person({skin:SK[1],top:'#8a9ab0',bot:'#2a3040',hair:'#4a4a50',style:'short',stubble:true,w:1.25,mode:'sit',s:1.1,ry:-1.45},{x:16.4,z:6.9});
 c.setCam(3.25,3.6,8.7,3.25,.6,.95,35.5,55)}});
/* ===== flat-abroad ===== */
RM.def('flat-abroad',{kind:'home',build:function(c){var L=lib(c),g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i;
 c.sky('indoor');
 var wB=L.wallTex(24,9,{base:'#e2e0dc',stain:1,blotch:true});
 var wL=L.wallTex(14,9,{base:'#d9d8d8',stain:1});
 L.shell({floor:L.woodTex(30,10,50,7,3,3.6),floorRough:.55,wallB:wB,wallL:wL,right:true,skirt:'#d4d0ca',edge:'#bdbab4',crownCol:'#d4d0ca'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 c.light('hemi','#dce6ff',.36,0,0,0,'#2a2a34');
 L.key('#e4ecff',.72,5.0,9.5,7.5,3.2,1.9,7);
 /* window (dusk), radiator, blind */
 L.window(BW,15.8,3.8,3.9,3.8,{view:L.sky('dusk',3.9,3.8),frame:'#ece8e2',cols:2,rows:1});
 L.pt('#c8d8ff',.9,15.8,5.6,2.8,11);
 L.box(4.0,.22,.4,'#8a929a',15.8,7.6,.5,{r:.05});for(i=0;i<9;i++)L.box(3.8,.1,.12,'#d4d0c8',15.8,7.7-i*.01,.7,{ns:1,r:.02}).visible=false;
 L.box(3.4,2.0,.5,'#f0eeea',15.8,.8,.55,{r:.1,s:4,rough:.35});for(i=0;i<9;i++)L.box(.08,1.8,.52,'#c8c6c0',14.4+i*.35,.9,.56,{ns:1,r:.02});
 L.cyl(.1,.1,.4,'#c8c6c0',14.2,.4,.8,{});
 /* desk + laptop + folding chair */
 (function(){var G=L.grp(8.0,0,1.6,0);L.box(5.4,.16,2.8,'#d8d4cc',0,3.2,0,{par:G,r:.05,rough:.5});[[-2.5,-1.2],[2.5,-1.2],[-2.5,1.2],[2.5,1.2]].forEach(function(p){L.cyl(.1,.1,3.2,'#8a929a',p[0],0,p[1],{par:G,metal:.6})});
  L.box(2.1,.1,1.5,'#7a8088',-.2,3.36,.35,{par:G,r:.04,metal:.6,rough:.4});var sc=L.C(256,160),k=L.X(sc);function drawCall(f){k.fillStyle='#1e2a3a';k.fillRect(0,0,256,160);var fc=[['#d8a888',__CK.a2],['#c68863','#e8e2da'],['#e0a982','#3d5f63'],['#8d5a3e',__CK.ad]];for(var q=0;q<4;q++){var x=8+(q%2)*124,y=8+Math.floor(q/2)*76;k.fillStyle='#2a3a52';k.fillRect(x,y,116,70);k.fillStyle=fc[q][1];k.fillRect(x+34,y+42+((q+Math.floor(f))%2)*1,48,28);k.fillStyle=fc[q][0];k.beginPath();k.arc(x+58,y+30+Math.sin(f*2+q)*1.5,15,0,7);k.fill();k.fillStyle='#2a1a14';k.beginPath();k.arc(x+58,y+24+Math.sin(f*2+q)*1.5,15,Math.PI,0);k.fill()}k.fillStyle='rgba(255,255,255,.7)';k.font='bold 11px Arial';k.fillText('MAMA',14,24)}
  drawCall(0);var st=c.tex(sc,1,1);var lid=L.grp(0,3.42,-.1,0,G);lid.position.set(-.2,3.44,-.35);lid.rotation.x=-.2;L.box(2.1,1.4,.08,'#7a8088',0,0,0,{par:lid,r:.03,metal:.6,rough:.4});var scr=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.2),new THREE.MeshBasicMaterial({map:st,color:'#fff'}));scr.position.set(0,.7,.05);lid.add(scr);
  L.glow(-.2,4.2,.3,'#a8c8ff',4.5,.28,G);var ll=L.pt('#a8c8ff',.6,8,4.4,3,7);c.tick(function(t){if(Math.floor(t*2.2)%3===0){drawCall(t);st.needsUpdate=true}ll.intensity=.55+Math.sin(t*5)*.06});
  L.mug(G,1.6,3.28,.3,'#e6eef0');L.steam(G,1.6,3.8,.3,4);L.books(G,1.6,3.28,-.85,4,{hmin:.8,hmax:1.2,d:.9});
  var pp=L.box(1.4,.04,1.0,'#f1ece4',-2.0,3.28,.4,{par:G,r:.01,ns:1,map:L.paperTex([{t:'DEUTSCHE POST',f:'900 24px',c:__CK.ad,dy:30},{t:'Mietvertrag',f:'bold 22px',dy:24},{t:'Miete: 480 €',f:'20px'}],128,90,{bg:'#f4f1ee',rule:3})});pp.rotation.y=.2;
  L.cyl(.2,.17,.35,__CK.a2,2.0,3.28,-.7,{par:G});for(i=0;i<3;i++){var pc=L.cyl(.025,.025,.8,['#2d4a6b',__CK.a,'#e8e2da'][i],2.0+(i-1)*.07,3.5,-.7,{par:G});pc.rotation.z=(i-1)*.2}
  // cables
  var cb=L.cyl(.025,.025,2.2,'#f4f1ee',-1.6,3.3,-.2,{par:G,rz:Math.PI/2.4});
  L.chair(0.2,3.9,.1,{par:g,wood:'#8a929a',h:1.9,cush:'#4a5260'}).position.x=8.2})();
 // banner on wall (above desk)
 (function(){var cv=L.C(256,160),k=L.X(cv);k.fillStyle=C1;k.fillRect(0,0,256,160);k.fillStyle='#f4f1ff';k.fillRect(0,56,256,44);k.fillStyle=C1;k.font='900 40px Heebo, Arial';k.direction='ltr';k.textAlign='center';k.fillText(__CK.Name,128,92);k.fillStyle='#f4f1ff';k.font='900 24px Heebo, Arial';k.fillText('Far Away, But With You',128,30);k.fillText(('GATE '+__CK.n2),128,140);L.nz(k,256,160,8);var bm=new THREE.MeshStandardMaterial({map:c.tex(cv,1,1),roughness:.9,color:'#fff',side:THREE.DoubleSide});var b=L.pl(4.2,2.65,bm,6.6,6.2,.1,{par:BW});b.rotation.z=.02;[[4.6,7.5],[8.6,7.5],[4.6,4.9],[8.6,4.9]].forEach(function(p){L.box(.5,.2,.04,'#e6e0d4',p[0],p[1],.14,{par:BW,r:.02,ns:1,tr:1,op:.7}).rotation.z=.6})})();
 /* door */
 L.door(BW,2.5,2.2,7,{frame:'#ece8e2',col:'#d4d0c8',open:.35,hinge:'right',inside:'#14161c',peep:1});
 L.box(.15,.5,.1,'#b8b2aa',3.5,4.2,.3,{par:BW,metal:.8,ns:1});for(i=0;i<3;i++)L.sph(.1,'#8a929a',5.2+i*.5,5.7,.2,{par:BW,metal:.6,ns:1});
 L.box(1.8,.9,.5,'#2e3a50',5.0,3.4,.3,{par:BW,r:.2,s:4}).visible=false;
 L.box(2.4,.18,.8,'#6a6a70',1.0,0,2.9,{r:.05}).rotation.y=0;
 L.box(.55,.35,1.2,'#2a2a30',1.4,0,3.2,{r:.18,s:4}).rotation.y=.6;L.box(.55,.35,1.2,'#2a2a30',2.4,0,3.5,{r:.18,s:4}).rotation.y=.4;
 L.box(.15,.15,.15,'#c9c4bc',.5,5.0,.3,{par:LW,ns:1}).visible=false;
 /* coat on hook beside door */
 L.box(1.4,.2,.3,'#6a6a70',4.0,5.9,.15,{r:.04});L.box(1.3,3.0,.5,'#3a4a60',3.7,2.9,.5,{r:.25,s:4}).rotation.z=.03;L.hang(BW,4.1,5.9,.62,.5,2.0,L.scarfTex(C1,'#f4f1ff'),{ph:6});
 /* side dresser + phone charging */
 (function(){var G=L.grp(11.8,0,1.5,0);L.box(2.6,3.3,2.2,'#d8d4cc',0,0,0,{par:G,r:.08,rough:.5});for(i=0;i<2;i++){L.box(2.2,1.3,.06,'#ece8e2',0,.25+i*1.45,1.1,{par:G,r:.03});L.sph(.08,'#8a929a',0,.9+i*1.45,1.17,{par:G,metal:.6,ns:1})}
  var ph=L.box(.45,.06,.85,'#14161c',.3,3.3,.2,{par:G,r:.04,metal:.5,rough:.3});ph.rotation.y=.4;L.pl(.38,.78,new THREE.MeshBasicMaterial({color:'#cfe0ff'}),.3,3.37,.2,{par:G,rx:-Math.PI/2}).rotation.z=.4;L.glow(.3,3.5,.2,'#a8c8ff',2.4,.4,G);
  L.cyl(.1,.1,.05,'#e8e2da',-.7,3.3,.5,{par:G});L.pl(1.1,.8,L.M('#fff',{map:L.photoTex(90,66,'family',['#9aa8b8','#e0c0b0',__CK.a2,'#3d5f63','#8a5a40'])}),-.6,3.9,-.5,{par:G,rx:-.3});L.box(1.2,.9,.12,'#3a2a22',-.6,3.32,-.52,{par:G,r:.02,ns:1}).visible=false;L.pt('#a8c8ff',.35,12.2,4.0,3.0,5)})();
 /* kitchenette */
 (function(){var G=L.grp(21.5,0,1.6,0);L.box(4.4,3.3,2.5,'#e6e2dc',0,0,0,{par:G,r:.08,rough:.45});L.box(.07,2.4,.0,'#c8c4bc',0,.6,1.27,{par:G,ns:1});L.box(1.9,2.3,.06,'#d4d0c8',-1.1,.5,1.28,{par:G,r:.03});L.box(1.9,2.3,.06,'#d4d0c8',1.1,.5,1.28,{par:G,r:.03});L.box(4.6,.22,2.7,'#8a8e94',0,3.3,0,{par:G,r:.06,metal:.2,rough:.45});
  for(i=0;i<2;i++){L.cyl(.55,.55,.07,'#1a1a20',-.8+i*1.3,3.55,.2,{par:G});L.cyl(.3,.3,.03,__CK.a2,-.8+i*1.3,3.62,.2,{par:G,emis:__CK.ad,ei:.5})}
  L.cyl(.6,.55,.9,'#aab2ba',-.8,3.6,.2,{par:G,metal:.8,rough:.3});L.cyl(.62,.62,.1,'#aab2ba',-.8,4.5,.2,{par:G,metal:.8,rough:.3});L.steam(G,-.8,4.7,.2,6);
  L.box(1.3,.12,.8,'#e6e2dc',1.0,3.55,-.7,{par:G,r:.04,ns:1}).visible=false;L.box(1.7,1.1,1.2,'#e8e6e2',1.5,3.55,-.5,{par:G,r:.1,s:4,rough:.4});L.box(1.0,.7,.04,'#2a2a30',1.3,3.8,.13,{par:G,r:.02,ns:1,metal:.3});L.cyl(.2,.2,.08,'#c9c4bc',1.8,4.0,.14,{par:G,rx:Math.PI/2,metal:.5});
  L.box(2.8,.2,.9,'#8a929a',.2,6.2,-.8,{par:G,r:.04,metal:.4});for(i=0;i<5;i++)L.mug(G,-.9+i*.55,6.4,-.8,['#e8e2da',__CK.a2,'#3d5f63','#e8e2da','#2d4a6b'][i]);L.box(1.1,.7,.6,'#d85a4a',-1.0,3.55,-.9,{par:G,r:.1,s:4}).visible=false;
  L.box(.9,.5,.9,'#d8c8b8',1.6,6.4,-.8,{par:G,r:.06,s:4}).visible=false})();
 /* bed (head to the right wall) */
 (function(){var G=L.grp(18.2,0,8.2,0);L.box(7.6,.7,4.4,'#6a6a72',0,.3,0,{par:G,r:.12,rough:.5});L.box(7.2,.8,4.1,'#d8d4cc',-.05,.95,0,{par:G,r:.28,s:4,map:L.fabric('plain','#e0dcd6','#fff',1,1)});L.box(.4,3.0,4.4,'#6a6a72',3.9,.3,0,{par:G,r:.1});
  L.box(4.6,.5,4.2,'#5a7aa8',-1.0,1.6,0,{par:G,r:.22,s:4,map:L.fabric('dots','#5a7aa8','#8aa4c8',2,2)});L.box(2.0,.5,1.8,'#f1ece4',3.0,1.75,-1.0,{par:G,r:.28,s:4});L.box(2.0,.5,1.7,'#e2dcd4',3.0,1.75,1.0,{par:G,r:.28,s:4}).rotation.y=.2;
  // Hapoel throw & open suitcase beside bed
  L.box(2.2,.1,3.8,__CK.a2,-3.0,1.95,0,{par:G,r:.05,map:L.fabric('stripe','#b02a38','#f1e8e8',2,2)}).rotation.z=.08;L.sph(.5,'#8a5a40',2.6,2.4,.2,{par:G,rough:.95,sy:.9});L.sph(.34,'#8a5a40',2.6,3.0,.2,{par:G,rough:.95}).visible=false;
  L.box(2.4,.55,1.7,'#6a7a90',-.4,0,3.4,{par:G,r:.12,s:4});L.box(2.4,1.1,.2,'#6a7a90',-.4,.35,2.6,{par:G,r:.08}).rotation.x=-.5;L.box(1.5,.2,1.2,__CK.a2,-.4,.5,3.4,{par:G,r:.1,s:4}).visible=true;L.box(1.0,.2,.8,'#e8e2da',.3,.6,3.4,{par:G,r:.1,s:4})})();
 // floor lamp with bare bulb (peach) near bed
 (function(){var x=14.0,z=5.0;L.cyl(.5,.6,.15,'#2a2a30',x,0,z,{});L.cyl(.05,.05,5.0,'#2a2a30',x,.15,z,{metal:.5});L.sph(.28,'#fff',x,5.4,z,{mat:new THREE.MeshBasicMaterial({color:'#ffe6cf'}),ns:1});L.glow(x,5.4,z,'#ffb48a',6,.7);L.pt('#ffb48a',1.0,x,5.4,z,12)})();
 /* boxes stack */
 (function(){var cb='#b28a68';[[7.0,9.6,0,.2],[8.7,9.0,0,-.3],[7.8,9.2,1.9,.1]].forEach(function(p,k){var b=L.box(2.0,1.8,1.7,cb,p[0],p[2],p[1],{r:.05,rough:.9,s:3});b.rotation.y=p[3];L.box(.4,.05,1.72,'#e0d6c8',p[0],p[2]+1.8,p[1],{r:.01,ns:1}).rotation.y=p[3];L.pl(1.2,.55,L.M('#fff',{map:L.paperTex([{t:['Books','Kitchen','Clothes'][k],f:'900 38px',c:'#2a2a30'}],128,40,{bg:'#b28a68'})}),p[0]+Math.sin(p[3])*.9+.05,p[2]+1.0,p[1]+Math.cos(p[3])*.87,{ry:p[3]})});L.box(1.6,.06,1.1,'#c8d0d4',9.8,0,9.9,{r:.03,ns:1}).visible=false})();
 /* rug */
 L.rug(6,4,'#3a4458','#6a7a90','#d8cfc2','#2a3040',.04,{x:11.6,z:8.2,rot:.3});
 // fairy lights on left wall
 (function(){var n=14;for(var q=0;q<n;q++){var z=2.2+q*(10.4/(n-1)),y=7.6-Math.sin(q/(n-1)*Math.PI)*.9+(q%2?0:.15);L.sph(.1,'#fff',.25,y,z,{mat:new THREE.MeshBasicMaterial({color:['#ffe6cf','#ff9a8a','#fff4ee'][q%3]}),ns:1});L.glow(.3,y,z,['#ffb48a','#ff7a7a','#ffd8c8'][q%3],1.1,.5)}})();
 // map + calendar + family photo on left wall
 (function(){var cv=L.C(256,170),k=L.X(cv);k.fillStyle='#d8ccb8';k.fillRect(0,0,256,170);k.fillStyle='#b4c4ae';[[30,30,60,40],[100,60,70,50],[170,20,60,60],[60,100,50,40],[150,110,80,40]].forEach(function(r){k.beginPath();k.ellipse(r[0]+r[2]/2,r[1]+r[3]/2,r[2]/2,r[3]/2,.3,0,7);k.fill()});k.strokeStyle=__CK.a2;k.lineWidth=2;k.beginPath();k.moveTo(190,60);k.lineTo(130,90);k.lineTo(60,120);k.stroke();k.fillStyle=__CK.a2;[[190,60],[130,90],[60,120]].forEach(function(p){k.beginPath();k.arc(p[0],p[1],4,0,7);k.fill()});k.fillStyle='#2a2a30';k.font='bold 14px Arial';k.fillText(__CK.CITY,196,56);k.fillText('HOME',62,134);L.nz(k,256,170,10);L.frame(LW,-5.4,5.6,3.4,2.2,c.tex(cv,1,1),{frame:'#3a2a22',t:.15});
  L.pl(1.6,1.9,L.M('#fff',{map:L.paperTex([{t:'Day 47',f:'900 40px',c:__CK.ad,dy:44},{t:'133 more',f:'bold 26px',dy:30},{t:'☓ ☓ ☓ ☓ ☓ ☓ ☓',f:'20px',dy:24},{t:'☓ ☓ ☓ ☓ ☓ ☓ ☓',f:'20px',dy:24},{t:'☓ ☓ ☓ ☓ ☓ ☓ ☓',f:'20px',dy:24}],120,140,{bg:'#f4f1ee'})}),-8.4,5.6,.1,{par:LW}).rotation.z=.03})();
 // clutter
 L.box(2.0,.3,2.0,'#d8d0c4',9.6,0,5.4,{r:.05,map:L.paperTex([{t:'PIZZA',f:'900 46px',c:__CK.a2}],64,64,{bg:'#e8dfd4'})}).rotation.y=.4;L.box(1.4,.35,1.0,'#8a929a',12.0,0,10.6,{r:.15,s:4}).rotation.y=.2;
 L.box(1.6,.3,1.0,__CK.a2,3.0,0,8.2,{r:.15,s:4,map:L.fabric('stripe',__CK.a2,'#f1e8e8')}).rotation.y=.5;L.box(1.1,.25,.9,'#3a4a60',4.1,0,8.6,{r:.15,s:4});
 /* people */
 c.person({skin:SK[1],top:'#3a4a60',bot:'#2a2a34',hair:'#2a1a14',style:'short',beanie:__CK.ad,stubble:true,scarf:[C1,'#f4f1ff'],w:1.05,mode:'sit',s:1.08,ry:-1.45,eye:'#3a2a1c'},{x:15.2,z:9.0});
 c.person({skin:SK[3],top:'#e8e2da',bot:'#2e3a50',hair:'#1a1210',style:'curly',w:.95,mode:'talk',s:1.06,ry:-1.35,look:.2},{x:19.4,z:11.4});
 c.setCam(3.25,3.6,8.7,3.25,.6,.95,35.5,55)}});
/* ===== classroom ===== */
RM.def('classroom',{kind:'school',build:function(c){var L=lib(c),rr=c.rr,rnd=c.rnd,g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i,j;
 c.sky('indoor');
 var W=27,D=15;
 var wB=L.wallTex(W,9,{base:'#ddd4c2',dado:3.2,dadoCol:'#7f9a8c',rail:'#c9c2b2',stain:1});
 var wL=L.wallTex(D,9,{base:'#ddd4c2',dado:3.2,dadoCol:'#7f9a8c',rail:'#c9c2b2',stain:1});
 L.shell({W:W,D:D,floor:L.terrazzo('#938e86',6,3.4),floorRough:.4,wallB:wB,wallL:wL,right:true,skirt:'#6a7a72',edge:'#c4c4b8'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 c.light('hemi','#eef2ff',.4,0,0,0,'#30343a');
 L.key('#f4f2ff',.78,6.2,10,8,3.6,2.0,8);
 /* window (right of board) */
 L.window(BW,22.4,3.3,4.2,4.4,{view:L.sky('day',4.2,4.4),frame:'#e4e4de',cols:3,rows:1});
 L.pt('#dcecff',.8,22.4,5.4,2.6,12);
 // venetian blind half down
 (function(){var cv=L.C(64,128),k=L.X(cv);k.fillStyle='#d8d4c8';k.fillRect(0,0,64,128);for(var q=0;q<16;q++){k.fillStyle='rgba(0,0,0,.18)';k.fillRect(0,q*8+6,64,2)}L.pl(4.2,1.8,L.M('#fff',{map:c.tex(cv,1,1),rough:.8}),22.4,6.6,.2,{par:BW})})();
 (function(){var cv=L.C(256,256),k=L.X(cv);k.fillStyle='#ffe6d8';for(var a=0;a<3;a++)for(var b=0;b<2;b++)k.fillRect(8+a*82,10+b*122,74,112);var tx=c.tex(cv,1,1);var geo=new THREE.PlaneGeometry(5,6);var P=geo.attributes.position;for(var q=0;q<P.count;q++)P.setX(q,P.getX(q)-P.getY(q)*.3);var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(21.4,.06,5.6);g.add(m)})();
 /* door */
 L.door(BW,1.9,2.2,7,{frame:'#6a7a72',col:'#8a6a50',open:.45,hinge:'left',glow:'#e8e4dc',light:'#e8e4dc'});
 L.box(.9,.9,.1,'#e8e4dc',3.7,5.2,.1,{par:BW}).visible=false;
 /* board */
 (function(){var bx=10.6,bw=9.0,bh=3.9,by=3.2;L.box(bw+.5,bh+.5,.3,'#7a5a46',bx,by-.25,.15,{r:.06,rough:.5});
  var cv=L.C(640,280),k=L.X(cv);var gr=k.createLinearGradient(0,0,0,280);gr.addColorStop(0,'#36584a');gr.addColorStop(1,'#2a463a');k.fillStyle=gr;k.fillRect(0,0,640,280);for(var q=0;q<40;q++){k.fillStyle='rgba(255,255,255,'+rr(.01,.05)+')';k.beginPath();k.ellipse(rnd()*640,rnd()*280,rr(20,90),rr(6,20),rnd()*3,0,7);k.fill()}
  k.fillStyle='#eef0ea';k.direction='ltr';k.textAlign='right';k.font='bold 34px Heebo, Arial';k.fillText('Maths — Class 3',610,50);k.direction='ltr';k.textAlign='right';k.font='28px Heebo, Arial';k.fillText('12 + 9 = 21',610,100);k.fillText('7 × 6 = 42',610,142);k.fillText('48 ÷ 8 = ?',610,184);k.direction='ltr';k.font='bold 26px Heebo, Arial';k.fillText('Homework: page 41',610,236);
  k.strokeStyle='#eef0ea';k.lineWidth=3;k.beginPath();k.moveTo(60,110);k.lineTo(60,240);k.moveTo(60,110);k.lineTo(200,110);k.stroke();k.lineWidth=2;k.strokeRect(70,200,120,40);k.beginPath();k.moveTo(130,200);k.lineTo(130,240);k.arc(130,220,10,0,7);k.stroke();k.fillStyle='#ffd0d0';k.font='20px Heebo, Arial';k.textAlign='left';k.fillText(('⚽  '+__CK.SHORT+'!'),74,190);
  L.pl(bw,bh,new THREE.MeshStandardMaterial({map:c.tex(cv,1,1),roughness:.9,color:'#fff'}),bx,by+bh/2-.05,.32,{par:BW});
  L.box(bw,.14,.5,'#7a5a46',bx,by-.55,.5,{r:.04});for(i=0;i<4;i++)L.box(.7,.16,.16,i%2?'#f4f1ee':'#ffd0d0',bx-3.0+i*.6,by-.4,.55,{r:.05,ns:1}).rotation.y=i*.7;L.box(.9,.34,.4,'#6a4a38',bx+2.9,by-.4,.55,{r:.06});
  // alphabet strip above the board
  var cv2=L.C(900,64),k2=L.X(cv2);k2.fillStyle='#f4f1ee';k2.fillRect(0,0,900,64);k2.fillStyle=__CK.ad;k2.direction='ltr';k2.textAlign='center';k2.font='900 40px Heebo, Arial';var al='ABCDEFGHIJKLMNOPQRSTUVWXYZ';for(var q=0;q<al.length;q++)k2.fillText(al[q],880-q*40,46);L.pl(8.8,.6,L.M('#fff',{map:c.tex(cv2,1,1),rough:.8}),bx,by+bh+.4,.1,{par:BW})})();
 /* bulletin board + map between board and window */
 (function(){var cv=L.C(200,260),k=L.X(cv);k.fillStyle='#b88a6a';k.fillRect(0,0,200,260);var cols=['#f4f1ee',__CK.a2,'#3d5f63','#e8d0d0','#4a6a98'];for(var q=0;q<7;q++){k.save();k.translate(30+(q%2)*80+rr(-8,8),30+Math.floor(q/2)*58);k.rotate(rr(-.12,.12));k.fillStyle=cols[q%5];k.fillRect(0,0,64,48);k.fillStyle='rgba(0,0,0,.4)';k.fillRect(8,10,40,3);k.fillRect(8,20,34,3);k.fillRect(8,30,44,3);k.fillStyle=__CK.a;k.beginPath();k.arc(32,3,4,0,7);k.fill();k.restore()}
  L.box(2.9,3.7,.16,'#7a5a46',17.8,3.6,.1,{r:.04});L.pl(2.6,3.4,L.M('#fff',{map:c.tex(cv,1,1),rough:.95}),17.8,5.3,.2,{par:BW})})();
 /* clock + flag + rules */
 (function(){var cv=L.C(128,128),k=L.X(cv);k.fillStyle='#f4efe8';k.beginPath();k.arc(64,64,60,0,7);k.fill();k.strokeStyle='#2a2a30';k.lineWidth=6;k.stroke();for(var q=0;q<12;q++){k.save();k.translate(64,64);k.rotate(q*Math.PI/6);k.fillRect(-2,-54,4,10);k.restore()}L.pl(1.6,1.6,new THREE.MeshStandardMaterial({map:c.tex(cv,1,1),roughness:.5,color:'#fff'}),15.2,8.0,.2,{par:BW});var sec=L.box(.04,.6,.03,__CK.ad,15.2,8.0,.26,{par:BW,r:.01,ns:1});sec.geometry.translate(0,.25,0);L.box(.07,.45,.03,'#2a2a30',15.2,8.0,.24,{par:BW,r:.01,ns:1});L.box(.07,.6,.03,'#2a2a30',15.2,8.0,.25,{par:BW,r:.01,ns:1}).rotation.z=-1.1;c.tick(function(t){sec.rotation.z=-t*1.3})})();
 L.pl(2.6,1.6,L.M('#fff',{map:L.posterTex(200,120,'#f4f1ee',[{t:'Class Rules',f:'900 36px',c:__CK.ad,y:42},{t:'Raise a Hand · Don’t Interrupt',f:'bold 18px',c:'#2a2a30',y:72},{t:'Listen · Play Fair',f:'bold 18px',c:'#2a2a30',y:98}],{bd:__CK.ad})}),5.0,8.0,.1,{par:BW}).rotation.z=-.02;
 /* teacher desk */
 (function(){var G=L.grp(20.8,0,4.3,Math.PI);L.box(5.2,.2,2.6,'#8a6a54',0,3.2,0,{par:G,r:.07});L.box(1.6,3.2,2.4,'#7a5a44',1.8,0,0,{par:G,r:.07});L.box(1.6,3.2,2.4,'#7a5a44',-1.8,0,0,{par:G,r:.07});L.box(1.9,2.6,.1,'#6a4a38',0,.2,-1.1,{par:G,r:.03}).visible=false;
  // items (G is rotated PI so facing; local z>0 faces back wall): books, globe, plant, papers
  L.books(G,-2.0,3.4,.2,6,{hmin:.9,hmax:1.3,d:1.2});L.cyl(.1,.1,.4,'#5a3e30',.9,3.4,0,{par:G});L.sph(.7,'#4a7aa0',.9,4.4,0,{par:G,rough:.4});L.cyl(.05,.05,.8,'#8a8a90',.9,3.6,0,{par:G,metal:.7});
  L.box(1.6,.06,1.2,'#f4f1ee',-.6,3.4,-.5,{par:G,r:.02,ns:1,map:L.paperTex([{t:'Test — Maths',f:'900 22px',c:__CK.ad,dy:30},{t:'Name: ________',f:'18px',dy:24}],128,100,{bg:'#f4f1ee',rule:4})}).rotation.y=.2;L.cyl(.22,.18,.45,'#3d5f63',1.9,3.4,.5,{par:G});for(i=0;i<3;i++){var pc=L.cyl(.025,.025,.9,[__CK.a,'#2d4a6b','#3a7a4a'][i],1.9+(i-1)*.07,3.7,.5,{par:G});pc.rotation.z=(i-1)*.2}
  L.cyl(.4,.32,.6,'#a8543c',2.2,3.4,-.7,{par:G});for(var q=0;q<7;q++)L.sph(.25,'#3a7a4a',2.2+Math.cos(q)*.25,4.2+(q%3)*.15,-.7+Math.sin(q)*.25,{par:G,sy:1.1});
  L.mug(G,-2.3,3.4,-.6,'#e8e2da');L.steam(G,-2.3,3.95,-.6,3)})();
 L.chair(20.8,5.4,Math.PI-.15,{wood:'#6a4a38',cush:'#3d5f63',h:2.0});
 /* student desks: 3 cols x 3 rows */
 var cols=[5.6,12.0,18.4],rows=[6.8,9.4,12.0];
 rows.forEach(function(z,rj){cols.forEach(function(x,ci){var G=L.grp(x,0,z,((ci+rj)%3-1)*.03);L.box(4.4,.14,1.7,'#7a5a40',0,2.9,0,{par:G,r:.05,rough:.5,map:L._dw||(L._dw=L.woodTex(28,30,34,3,1,1))});L.box(4.5,.2,1.8,'#7a5a46',0,2.82,0,{par:G,r:.05}).visible=false;[[-2.0,-.6],[2.0,-.6],[-2.0,.6],[2.0,.6]].forEach(function(p){L.cyl(.06,.06,2.9,'#34383a',p[0],0,p[1],{par:G,metal:.6,rough:.45})});L.box(4.0,.9,1.4,'#8a929a',0,1.7,.0,{par:G,r:.05,metal:.4}).visible=false;
  // book / notebook on desk
  if((ci+rj)%2==0)L.box(1.0,.1,1.3,[__CK.a2,'#2d4a6b','#e8e2da'][(ci+rj)%3],-.9,3.04,0,{par:G,r:.02,ns:1}).rotation.y=.2;if((ci*3+rj)%3==1)L.box(.85,.06,1.1,'#f4f1ee',1.0,3.04,.1,{par:G,r:.02,ns:1,map:L.paperTex([{t:'Notebook',f:'bold 20px',c:'#2d4a6b'}],64,70,{rule:5})}).rotation.y=-.15;
  [-1.0,1.0].forEach(function(dx){var ch=L.chair(x+dx,z+1.55,Math.PI+((ci+rj)%3-1)*.08,{wood:'#34383a',cush:'#6e5038',h:1.8});});
  // bag on floor
  if((ci+rj)%2==1)L.box(1.4,1.7,.8,['#2e3a50',__CK.ad,'#3d5f63'][(ci+rj)%3],x+1.0,0,z+2.5,{r:.25,s:4}).rotation.y=.5})});
 /* left wall: cabinet, kids' drawings */
 (function(){var G=L.grp(1.1,0,6.0,Math.PI/2);L.box(5.6,6.6,2.0,'#8a6a54',0,0,0,{par:G,r:.1,rough:.55});L.box(2.6,5.6,.06,'#6a4a38',-1.4,.5,1.02,{par:G,r:.02});L.box(2.6,5.6,.06,'#6a4a38',1.4,.5,1.02,{par:G,r:.02});L.sph(.09,'#c9c4bc',-.2,3.0,1.1,{par:G,metal:.8,ns:1});L.sph(.09,'#c9c4bc',.2,3.0,1.1,{par:G,metal:.8,ns:1});L.books(G,-2.2,6.6,0,9,{hmin:.8,hmax:1.5,d:1.2})})();
 (function(){L.cyl(.02,.02,9,'#8a8a90',-9.0,6.6,.6,{par:LW,rz:Math.PI/2,ns:1});for(i=0;i<5;i++){var cv=L.C(80,100),k=L.X(cv);k.fillStyle=['#f4f1ee','#e8d0d0','#d0dce8','#f4f1ee','#e0e8d0'][i];k.fillRect(0,0,80,100);k.fillStyle=[__CK.a2,'#3d5f63','#4a6a98',__CK.a2,'#3a7a4a'][i];k.beginPath();k.arc(40,40,22,0,7);k.fill();k.fillStyle='#2a2a30';k.fillRect(24,70,32,6);var p=L.pl(1.1,1.4,L.M('#fff',{map:c.tex(cv,1,1)}),-5.8-i*1.35,5.9,.15,{par:LW,rs:true});p.rotation.z=(i%2-.5)*.1;L.box(.1,.1,.06,__CK.a2,-5.8-i*1.35,6.65,.16,{par:LW,ns:1})}})();
 /* right wall: coat hooks with jackets */
 (function(){L.box(.3,.25,5,'#6a4a38',8,5.2,.15,{par:RW,r:.04});[[3.2,'#2e3a50'],[4.5,__CK.ad],[5.8,'#3d5f63'],[7.0,'#6a4a38'],[8.5,'#2e3a50']].forEach(function(p,k){L.box(1.1,2.4,.4,p[1],p[0]+3.4,2.6,.4,{par:RW,r:.2,s:4}).rotation.z=.02*(k-2)})})();
 // radiator under window
 L.box(3.6,2.0,.5,'#e8e6e0',22.4,.8,.45,{r:.1,s:4,rough:.35});for(i=0;i<9;i++)L.box(.08,1.8,.52,'#c0beb6',20.9+i*.37,.9,.46,{ns:1,r:.02});
 // football under a desk & wastebasket
 L.ball(15.3,.42,13.4,.42);L.cyl(.55,.45,1.2,'#8a929a',25.0,0,2.0,{metal:.4,rough:.5});
 /* people */
 c.person({skin:SK[2],top:'#6a8aa0',bot:'#3a3a4a',hair:'#3a3a40',style:'short',glasses:true,w:1.0,mode:'talk',s:1.1,ry:.2,eye:'#3a2a1c',look:.15},{x:7.4,z:3.2});
 c.person({skin:SK[1],top:__CK.a2,bot:'#2a3040',hair:'#2a1a14',style:'short',w:.9,mode:'listen',s:.74,ry:.7,eye:'#3a2a1c',look:.2},{x:11.2,z:4.4});
 c.person({skin:SK[2],top:'#e8e4de',bot:'#3a4a6a',hair:'#1a1210',style:'buzz',w:.9,mode:'sit',s:.72,ry:Math.PI-.3},{x:5.0,z:8.3});
 c.person({skin:SK[0],top:'#3d5f63',bot:'#2a2a30',hair:'#6a3a2a',style:'pony',w:.85,mode:'sit',s:.72,ry:Math.PI+.1,lash:true},{x:19.4,z:10.9});
 c.setCam(3.65,3.9,9.2,3.65,.65,1.0,38,58)}});
/* ===== schoolyard (outdoor) ===== */
RM.def('schoolyard',{kind:'school',build:function(c){var L=lib(c),rr=c.rr,rnd=c.rnd,g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i,j;
 c.sky('day');c.fog('#dfe8f2',22,70);
 L.W=44;L.D=26;L.H=12;
 c.light('hemi','#cfe4ff',.62,0,0,0,'#8a7a6a');
 var key=L.key('#fff0e0',1.35,-3.2,11,11,6.0,3.0,10);
 /* ground (yard slab) with painted markings */
 var X0=-6,Z0=7.4,GW=56,GD=19.5,PW=1536,PH=Math.round(PW*GD/GW);
 function P(x,z){return[(x-X0)/GW*PW,(z-Z0)/GD*PH]}
 var cv=L.C(PW,PH),k=L.X(cv);k.fillStyle='#a8a49c';k.fillRect(0,0,PW,PH);
 for(i=0;i<80;i++){var gx=rnd()*PW,gy=rnd()*PH,gr=k.createRadialGradient(gx,gy,0,gx,gy,rr(30,120));gr.addColorStop(0,rnd()<.5?'rgba(70,64,58,.10)':'rgba(255,250,240,.10)');gr.addColorStop(1,'rgba(0,0,0,0)');k.fillStyle=gr;k.fillRect(0,0,PW,PH)}
 k.strokeStyle='rgba(50,46,42,.35)';k.lineWidth=2;for(i=X0;i<=X0+GW;i+=7){var a=P(i,0);k.beginPath();k.moveTo(a[0],0);k.lineTo(a[0],PH);k.stroke()}for(i=8;i<28;i+=6.5){a=P(0,i);k.beginPath();k.moveTo(0,a[1]);k.lineTo(PW,a[1]);k.stroke()}
 function line(w,col){k.strokeStyle=col;k.lineWidth=w}
 // basketball court bits near the hoop (x~38.4,z~12.6)
 line(5,'rgba(244,241,238,.85)');var h0=P(38.4,12.6),pu=PW/GW;k.beginPath();k.arc(h0[0],h0[1],7.2*pu,Math.PI*.5,Math.PI*1.5);k.stroke();k.strokeRect(h0[0]-5.6*pu,h0[1]-2.5*pu,5.6*pu,5*pu);k.beginPath();k.arc(h0[0]-5.6*pu,h0[1],2.5*pu,Math.PI*1.5,Math.PI*.5,true);k.stroke();
 // hopscotch
 line(4,'rgba(244,241,238,.9)');k.font='bold 22px Arial';k.fillStyle='rgba(244,241,238,.95)';k.textAlign='center';var hs=P(28.5,19.5);for(i=0;i<8;i++){var yy=hs[1]-i*2.1*pu*.62,w=(i==3||i==6)?2:1;for(j=0;j<w;j++){var xx=hs[0]+(w==2?(j?1.0:-1.0):0)*pu*.82*1;k.strokeRect(xx-.8*pu,yy-1.95*pu*.62,1.6*pu,2.0*pu*.62);k.fillText(String(i*(w==2?1:1)+1+(i>3?1:0)+(i>6?1:0)),xx,yy-.5*pu*.62)}}
 // four-square
 var fs=P(33.5,18.0);k.strokeRect(fs[0]-2*pu,fs[1]-1.4*pu,4*pu,2.8*pu);k.beginPath();k.moveTo(fs[0],fs[1]-1.4*pu);k.lineTo(fs[0],fs[1]+1.4*pu);k.moveTo(fs[0]-2*pu,fs[1]);k.lineTo(fs[0]+2*pu,fs[1]);k.stroke();
 // chalk scribbles
 line(4,'rgba(255,170,170,.7)');k.font='900 54px Heebo, Arial';k.fillStyle='rgba(255,180,180,.65)';k.direction='ltr';var cs=P(12.5,21.5);k.fillText((__CK.SHORT+'!'),cs[0],cs[1]);line(3,'rgba(190,210,255,.65)');k.beginPath();var cp=P(17,22);k.moveTo(cp[0],cp[1]);k.bezierCurveTo(cp[0]+40,cp[1]-60,cp[0]+80,cp[1]+30,cp[0]+140,cp[1]-20);k.stroke();
 // football pitch lines (kids' marks between the bag goalposts)
 line(3,'rgba(244,241,238,.5)');var gp=P(18.5,15.5);k.setLineDash([14,10]);k.beginPath();k.moveTo(gp[0],gp[1]-90);k.lineTo(gp[0],gp[1]+90);k.stroke();k.setLineDash([]);
 L.nz(k,PW,PH,9);var gt=c.tex(cv,1,1);
 var gm=new THREE.Mesh(new THREE.PlaneGeometry(GW,GD),L.M('#fff',{map:gt,rough:.9}));gm.rotation.x=-Math.PI/2;gm.position.set(X0+GW/2,.01,Z0+GD/2);gm.receiveShadow=true;g.add(gm);
 var sl=c.mesh(new THREE.BoxGeometry(GW,.7,GD),L.M('#7a756c'),X0+GW/2,-.36,Z0+GD/2,g);sl.castShadow=false;
 /* school facade */
 (function(){var FZ=7.5,FW=62,FH=12.6,cx=22;var b=c.mesh(new THREE.BoxGeometry(FW,FH,3),L.M('#cdbfae',{rough:.95}),cx,FH/2,FZ-1.5,g);b.castShadow=false;
  var cv2=L.C(1536,Math.round(1536*FH/FW)),q=L.X(cv2),u=1536/FW,ph=cv2.height;q.fillStyle='#dccdbe';q.fillRect(0,0,1536,ph);for(i=0;i<60;i++){var gx=rnd()*1536,gy=rnd()*ph,gr=q.createRadialGradient(gx,gy,0,gx,gy,rr(40,160));gr.addColorStop(0,rnd()<.5?'rgba(90,70,60,.08)':'rgba(255,248,240,.08)');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.fillRect(0,0,1536,ph)}
  q.fillStyle='#5a7a78';q.fillRect(0,ph-1.6*u,1536,1.6*u);q.fillStyle='rgba(255,255,255,.4)';q.fillRect(0,ph-1.7*u,1536,.1*u);q.fillStyle='#efe8dc';q.fillRect(0,ph-6.6*u,1536,.35*u);q.fillRect(0,.4*u,1536,.5*u);
  function X1(x){return(x-(cx-FW/2))*u}function Y1(y){return ph-y*u}
  // handball goal on the wall (x 15-23)
  q.strokeStyle='rgba(244,241,238,.9)';q.lineWidth=.22*u;q.strokeRect(X1(15.6),Y1(4.4),7.6*u,4.4*u-1.6*u*0+0);q.fillStyle='rgba(90,70,60,.12)';for(i=0;i<22;i++){q.beginPath();q.arc(X1(16+rnd()*7),Y1(1+rnd()*3.2),rr(8,24),0,7);q.fill()}
  q.fillStyle='rgba(190,40,50,.55)';q.font='900 '+(1.7*u)+'px Heebo, Arial';q.direction='ltr';q.textAlign='center';q.fillText(__CK.SHORT,X1(19.4),Y1(2.4));q.font='bold '+(.7*u)+'px Heebo, Arial';q.fillStyle='rgba(60,60,70,.6)';q.fillText('1 : 0',X1(19.4),Y1(1.3));
  // sign
  q.fillStyle='#2e4a6a';q.fillRect(X1(1.0),Y1(11.4),9.4*u,1.6*u);q.fillStyle='#f4f1ee';q.font='900 '+(.9*u)+'px Heebo, Arial';q.fillText('Primary School  "Achdut"',X1(5.7),Y1(10.3));
  var tx=c.tex(cv2,1,1);var fp=new THREE.Mesh(new THREE.PlaneGeometry(FW,FH),L.M('#fff',{map:tx,rough:.95}));fp.position.set(cx,FH/2,FZ+.01);fp.receiveShadow=true;g.add(fp);
  // windows
  [5.2,10.8,16.4,22.0,27.6,33.2,38.8,44.4].forEach(function(x){[[7.2,3.0],[3.2,2.6]].forEach(function(r,ri){if(ri==1&&(x<7&&x>1||(x>14&&x<25)))return;var y=r[0],h=r[1],w=3.0;L.box(w+.5,h+.5,.4,'#efe8dc',x,y-.25,FZ+.2,{r:.06});var gl=L.box(w,h,.1,'#9ab4cc',x,y,FZ+.42,{r:.02,metal:.3,rough:.15});L.box(.14,h,.12,'#efe8dc',x,y,FZ+.48,{r:.02,ns:1});L.box(w,.14,.12,'#efe8dc',x,y+h*.55,FZ+.48,{r:.02,ns:1});L.box(w+.8,.3,.7,'#d8cdbd',x,y-.5,FZ+.5,{r:.06});if(ri==0){L.box(.9,h-.1,.1,'#4f7f78',x-w/2-.55,y,FZ+.42,{r:.03,ns:1});L.box(.9,h-.1,.1,'#4f7f78',x+w/2+.55,y,FZ+.42,{r:.03,ns:1})}else{for(var bi=0;bi<5;bi++)L.box(.08,h,.08,'#3a3a40',x-1.2+bi*.6,y,FZ+.6,{ns:1,r:.02})}})});
  // parapet / roof
  L.box(FW,.7,.9,'#bfb2a2',cx,FH,FZ-.2,{r:.1,rough:.9});
  // door area
  var DG=L.grp(0,0,FZ,0);L.door(DG,2.9,2.2,7,{frame:'#4f7f78',col:'#8a5a40',open:.6,hinge:'left',inside:'#2a2024'});
  var aw=L.box(5.0,.3,2.2,__CK.a2,2.9,7.6,FZ+1.3,{r:.1,map:L.fabric('stripe',__CK.a2,'#f1e8e8',3,1)});aw.rotation.x=.25;L.box(.14,2.8,.14,'#3a3a40',.6,5.0,FZ+2.2,{ns:1});L.box(.14,2.8,.14,'#3a3a40',5.2,5.0,FZ+2.2,{ns:1})
  // water fountain + drain pipe
  L.box(1.1,2.4,.9,'#8a929a',10.2,0,FZ+.5,{r:.15,metal:.4}); L.cyl(.4,.4,.15,'#c0c8cc',10.2,2.4,FZ+.6,{metal:.7,rough:.25});L.cyl(.06,.06,.5,'#c0c8cc',10.2,2.55,FZ+.2,{metal:.8});L.cyl(.1,.1,8.0,'#6a6a70',13.2,0,FZ+.2,{metal:.4});
  // bunting from the facade to a pole
  L.cyl(.1,.1,8.5,'#6a6a70',27.0,0,12.2,{metal:.5});L.box(.9,.12,.12,'#6a6a70',26.7,8.4,12.2,{ns:1});
  var A=[8.6,9.6,FZ+.4],B=[27.0,8.4,12.2],nF=16,fl=[];for(i=0;i<nF;i++){var tt=(i+.5)/nF,px=A[0]+(B[0]-A[0])*tt,pz=A[2]+(B[2]-A[2])*tt,py=A[1]+(B[1]-A[1])*tt-Math.sin(tt*Math.PI)*1.4;var tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute([-.35,0,0,.35,0,0,0,-.85,0],3));tg.computeVertexNormals();var m=c.mesh(tg,L.M(i%2?'#f4f1ff':C1,{side:THREE.DoubleSide,rough:.9}),px,py,pz,g);m.rotation.y=Math.atan2(B[0]-A[0],B[2]-A[2])-Math.PI/2;fl.push(m)}
  var ln=[];for(i=0;i<=20;i++){var t2=i/20;ln.push(new THREE.Vector3(A[0]+(B[0]-A[0])*t2,A[1]+(B[1]-A[1])*t2-Math.sin(t2*Math.PI)*1.4,A[2]+(B[2]-A[2])*t2))}
  var lg=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ln),20,.03,4),L.M('#3a3a40'));lg.castShadow=false;g.add(lg);
  c.tick(function(t){fl.forEach(function(m,ii){m.rotation.x=Math.sin(t*2.2+ii*.7)*.18})})})();
 /* left low wall with ivy + right fence & gate + street */
 (function(){L.box(.8,3.0,19,'#c8bcac',-.8,0,17,{r:.1,s:2});for(i=0;i<26;i++)L.sph(.5,['#3a7a4a','#2e6a40','#4a8a54'][i%3],-.55,rr(.8,3.4),rr(8.5,25),{sx:.6,sy:.8,sz:1.1,rough:.7});
  // fence on the right with gate opening at z 11..15
  var fx=43.8;[[8.0,11.0],[15.0,23.0]].forEach(function(r){var n=Math.round((r[1]-r[0])/.55);for(var q=0;q<=n;q++)L.box(.14,4.4,.14,'#2e3a50',fx,0,r[0]+q*(r[1]-r[0])/n,{r:.04,ns:q%2});L.box(.16,.2,r[1]-r[0],'#2e3a50',fx,4.2,(r[0]+r[1])/2,{r:.04});L.box(.16,.2,r[1]-r[0],'#2e3a50',fx,.8,(r[0]+r[1])/2,{r:.04})});
  L.box(.9,5.0,.9,'#c8bcac',fx,0,10.8,{r:.1});L.box(.9,5.0,.9,'#c8bcac',fx,0,15.2,{r:.1});
  var sg=L.box(.2,.2,.2,'#fff',fx,0,13,{ns:1});sg.visible=false;
  // street beyond
  var st=c.mesh(new THREE.BoxGeometry(14,.5,24),L.M('#4a4a52',{rough:.95}),52,-.5,18,g);st.castShadow=false;L.box(1.0,.12,6,'#e6e2da',50,-.2,12,{ns:1,r:.01});L.box(1.0,.12,6,'#e6e2da',50,-.2,20,{ns:1,r:.01});
  // palm
  var px=47.5,pz=7.5,tr=c.mesh(new THREE.CylinderGeometry(.3,.5,10,10),L.M('#7a6454',{rough:.95}),px,5,pz,g);tr.rotation.z=.08;for(i=0;i<9;i++){var a=i*.7,fr=c.mesh(new THREE.ConeGeometry(.5,5.4,5),L.M(i%2?'#3a7a4a':'#2e6a40',{rough:.7,side:THREE.DoubleSide}),px+Math.cos(a)*2.0+.6,10.3-Math.abs(Math.sin(a*2))*.3,pz+Math.sin(a)*2.0,g);fr.scale.set(1,1,.2);fr.rotation.set(Math.sin(a)*1.1,-a,Math.cos(a)*1.1+Math.PI/2*0+1.5)}
  // parked car outside the gate (metre-space)
  c.car(55*.27,16*.27,Math.PI/2,'#5a6a8a')})();
 /* basketball hoop */
 (function(){var G=L.grp(38.6,0,12.6,0);L.cyl(.18,.22,8,'#6a6a70',0,0,0,{par:G,metal:.5,rough:.4});L.box(.4,.25,1.0,'#6a6a70',-.3,7.6,0,{par:G,r:.06});L.box(.2,3.0,4.2,'#e8e4de',-.8,6.2,0,{par:G,r:.08,rough:.4});L.box(.05,1.4,1.7,__CK.a2,-.95,6.9,0,{par:G,ns:1});
  var rim=c.mesh(new THREE.TorusGeometry(.75,.07,6,20),L.M(__CK.a2,{metal:.3}),-1.65,6.2,0,G);rim.rotation.x=Math.PI/2;var net=c.mesh(new THREE.CylinderGeometry(.75,.4,1.2,12,1,true),L.M('#f4f1ee',{rough:1,side:THREE.DoubleSide,tr:1,op:.6}),-1.65,5.6,0,G);net.castShadow=false;L.cyl(.8,.8,.2,'#6a6a70',0,0,0,{par:G,seg:12})})();
 L.ball(36.5,.45,12.4,.45);
 /* bench with bag, trees, bins */
 (function(){var G=L.grp(12.4,0,16.4,.08);L.box(8.0,.22,1.5,'#8a6a54',0,1.7,0,{par:G,r:.07});L.box(8.0,1.4,.22,'#8a6a54',0,2.3,-.7,{par:G,r:.07,rx:0});for(i=-1;i<=1;i+=2)L.box(.26,1.8,1.4,'#2a2a30',i*3.4,0,0,{par:G,r:.06,metal:.5});L.box(1.3,1.6,.9,__CK.ad,2.6,1.92,.1,{par:G,r:.28,s:4}).rotation.y=.3;L.box(1.0,1.2,.7,'#2e3a50',3.6,1.92,.1,{par:G,r:.2,s:4}).rotation.y=-.2})();
 (function(){var tx=4.2,tz=12.6;L.cyl(.35,.55,7.5,'#6a5446',tx,0,tz,{rough:.95});[[0,8.4,0,2.8],[-1.7,7.4,.6,2.3],[1.8,7.6,-.4,2.4],[.3,9.6,.4,2.0],[-.8,8.6,-1.4,1.9],[1.2,8.2,1.5,1.8]].forEach(function(p,q){L.sph(p[3],['#3a7a4a','#2e6a40','#4a8a54'][q%3],tx+p[0],p[1],tz+p[2],{rough:.8,seg:14,seg2:10})});
  L.cyl(1.4,1.6,.25,'#8a7a6a',tx,0,tz,{rough:.9,seg:16}).visible=true})();
 L.cyl(.65,.55,1.8,'#2a5a3a',9.0,0,9.2,{rough:.6});L.cyl(.7,.7,.15,'#1a3a26',9.0,1.8,9.2,{});L.cyl(.65,.55,1.8,'#2a5a3a',30.0,0,9.2,{rough:.6});L.cyl(.7,.7,.15,'#1a3a26',30.0,1.8,9.2,{});
 // schoolbag goalposts + football on the pitch
 L.box(1.1,1.4,.7,'#2e3a50',17.0,0,13.2,{r:.25,s:4}).rotation.y=.4;L.box(1.0,1.2,.7,__CK.ad,17.2,0,17.8,{r:.25,s:4}).rotation.y=-.3;L.ball(23.3,.45,16.1,.45);L.box(.6,.12,1.5,'#6a4a38',30.5,0,11.2,{r:.04}).rotation.y=.9;
 L.cyl(.05,.05,3.4,'#e8e2da',20.5,.1,20.4,{rz:1.35}).visible=false;
 // leaves & cat on the wall
 for(i=0;i<16;i++)L.sph(.14,['#8a4a3a','#a2543a','#6a7a4a'][i%3],rr(2,42),.06,rr(10,24),{sy:.2,sx:1.4,ns:1});
 L.cat(32.4,9.0,.4,'#b8844a',{par:g});
 /* people (children) */
 c.person({skin:SK[2],top:__CK.a2,bot:'#2a3040',hair:'#1a1210',style:'buzz',w:.9,mode:'talk',s:.74,ry:1.0,eye:'#3a2a1c',look:.2},{x:21.5,z:15.6});
 c.person({skin:SK[1],top:'#4a6a98',bot:'#2a2a30',hair:'#4a2a1a',style:'short',w:1.05,mode:'cross',s:.8,ry:-1.2,look:-.15},{x:25.2,z:16.4});
 c.person({skin:SK[0],top:'#e8e4de',bot:'#3a4a6a',hair:'#6a3a2a',style:'pony',w:.82,mode:'sit',s:.7,ry:.2,lash:true},{x:10.4,z:16.5});
 c.person({skin:SK[3],top:'#3d5f63',bot:'#2a2a30',hair:'#14100e',style:'curly',w:.9,mode:'cheer',s:.72,ry:2.8},{x:34.5,z:12.4});
 c.person({skin:SK[1],top:__CK.ad,bot:'#2a3040',hair:'#2a1a14',style:'short',w:.9,mode:'idle',s:.72,ry:0},{x:18.8,z:11.0});
 c.setCam(5.9,4.5,12.0,5.9,1.0,3.3,40,66)}});
/* ===== newsroom ===== */
RM.def('newsroom',{kind:'work',build:function(c){var L=lib(c),rr=c.rr,rnd=c.rnd,g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i,j;
 c.sky('indoor');var W=28,D=15;
 var wB=L.wallTex(W,9.6,{base:'#e2e4e4',dado:2.4,dadoCol:'#5a6a7a',rail:'#cfd2d4',stain:1});
 var wL=L.wallTex(D,9.6,{base:'#e2e4e4',dado:2.4,dadoCol:'#5a6a7a',rail:'#cfd2d4',stain:1});
 L.shell({W:W,D:D,H:9.6,floor:L.fabric('tweed','#7a8694','#98a4b0',14,7.5),floorRough:.95,wallB:wB,wallL:wL,right:true,skirt:'#3a4450',edge:'#c4c8ca'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 c.light('hemi','#e6eeff',.4,0,0,0,'#2c3038');
 L.key('#f0f4ff',.78,6.4,10,8,3.8,2.0,8.5);
 /* windows on back wall */
 L.window(BW,19.6,3.5,4.2,4.2,{view:L.sky('day',4.2,4.2),frame:'#e4e4e0',cols:3,rows:1});L.window(BW,25.0,3.5,0.01,.01,{view:L.sky('day',1,1)}).visible=false;
 L.pt('#dcecff',.75,19.6,5.4,2.6,12);
 // venetian blinds
 (function(){var cv=L.C(64,128),k=L.X(cv);k.fillStyle='#d4d6d8';k.fillRect(0,0,64,128);for(var q=0;q<16;q++){k.fillStyle='rgba(0,0,0,.16)';k.fillRect(0,q*8+6,64,2)}L.pl(4.2,1.3,L.M('#fff',{map:c.tex(cv,1,1),rough:.8}),19.6,7.1,.2,{par:BW})})();
 /* cork wall of print-outs */
 (function(){var cb=L.C(900,420),k=L.X(cb);k.fillStyle='#b88a64';k.fillRect(0,0,900,420);for(var q=0;q<1400;q++){k.fillStyle='rgba(80,50,30,'+rr(.03,.08)+')';k.fillRect(rnd()*900,rnd()*420,rr(1,4),rr(1,3))}
  var heads=[(__CK.Short+' on the Road to the Title'),'Derby: Sold Out','Coach: "We are ready"','Captain Injured','Transfers: Who’s In?','Poll: Man of the Match?','Feature: Gate 5 From Inside','Saturday — 17:00'];
  var cols=['#f4f1ee','#e8e2da','#f1ece4','#e0e6ea','#f4f1ee'];for(q=0;q<22;q++){var px=rr(10,780),py=rr(10,320),pw=rr(70,130),ph=rr(60,100),rot=rr(-.1,.1);k.save();k.translate(px+pw/2,py+ph/2);k.rotate(rot);k.fillStyle='rgba(0,0,0,.25)';k.fillRect(-pw/2+3,-ph/2+4,pw,ph);k.fillStyle=cols[q%5];k.fillRect(-pw/2,-ph/2,pw,ph);if(q%4===0){k.fillStyle=['#8a5a50','#4a6a8a','#6a7a6a'][q%3];k.fillRect(-pw/2+6,-ph/2+6,pw-12,ph*.5)}else{k.fillStyle='#2a2a30';k.direction='ltr';k.textAlign='right';k.font='bold 12px Heebo, Arial';k.fillText(heads[q%8],pw/2-6,-ph/2+18);for(var l=0;l<5;l++)k.fillRect(-pw/2+8,-ph/2+26+l*7,(pw-16)*rr(.5,1),2)}k.fillStyle=__CK.a;k.beginPath();k.arc(0,-ph/2+3,3.5,0,7);k.fill();k.restore()}
  k.strokeStyle=__CK.a2;k.lineWidth=2;k.beginPath();var pts=[[120,60],[300,160],[200,260],[460,100],[620,230],[740,120]];k.moveTo(pts[0][0],pts[0][1]);pts.forEach(function(p){k.lineTo(p[0],p[1])});k.stroke();L.nz(k,900,420,6);
  L.box(9.4,4.6,.2,'#6a4a38',6.5,3.5,.1,{r:.05});L.pl(9.0,4.2,L.M('#fff',{map:c.tex(cb,1,1),rough:.95}),6.5,5.7,.22,{par:BW});
  L.pl(7.0,1.1,L.M('#fff',{map:L.posterTex(420,66,__CK.ad,[{t:'Sports Desk',f:'900 44px',c:'#f4f1ee',y:50}],{bd:'rgba(0,0,0,0)'}),rough:.7}),6.5,8.6,.12,{par:BW})})();
 /* whiteboard */
 L.box(4.8,3.3,.18,'#b8bcc0',13.6,3.9,.09,{r:.04,metal:.4});L.pl(4.5,3.0,L.M('#fff',{map:L.posterTex(360,240,'#f4f4f2',[{t:'Editorial Meeting — 10:00',f:'900 26px',c:__CK.ad,y:36},{t:'1. Gate 1 — Saturday Edition',f:'bold 20px',c:'#2a2a30',y:78},{t:'2. Interview with the Coach',f:'bold 20px',c:'#2a2a30',y:110},{t:'3. Opinion — Back Page',f:'bold 20px',c:'#2a2a30',y:142},{t:'Deadline: 22:30  ⏰',f:'bold 22px',c:'#2d4a6b',y:200}],{bd:'rgba(0,0,0,0)'}),rough:.3}),13.6,5.4,.2,{par:BW});
 L.box(2.2,.18,.5,'#8a8e92',13.6,3.5,.4,{r:.04});for(i=0;i<3;i++)L.box(.7,.12,.12,[__CK.a2,'#2d4a6b','#2a2a30'][i],12.8+i*.6,3.68,.4,{r:.04,ns:1});
 /* TV on wall (news) */
 (function(){var G=L.grp(24.5,5.2,.3,0,g);L.box(4.2,2.5,.45,'#16181d',0,0,0,{par:G,r:.1});var cv=L.C(256,150),k=L.X(cv);function draw(f){k.fillStyle='#1a3a5a';k.fillRect(0,0,256,150);k.fillStyle='#e8f0f8';k.fillRect(0,110,256,40);k.fillStyle=__CK.ad;k.fillRect(0,110,50,40);k.fillStyle='#fff';k.font='bold 14px Arial';k.direction='ltr';k.textAlign='right';k.fillText('Sports News',246,134);k.fillStyle='#2a2a30';k.fillRect(70+(f*20)%160,120,30,3);k.fillStyle='#6a8aa0';k.beginPath();k.arc(128,50,26,0,7);k.fill();k.fillStyle='#c68863';k.beginPath();k.arc(128,40,14,0,7);k.fill();k.fillStyle='#2a2a30';k.fillRect(106,66,44,40)}draw(0);var tx=c.tex(cv,1,1);var sc=new THREE.Mesh(new THREE.PlaneGeometry(3.9,2.2),new THREE.MeshBasicMaterial({map:tx,color:'#fff'}));sc.position.set(0,1.25,.25);G.add(sc);G.position.y=4.2;c.tick(function(t){if(Math.floor(t*3)%2===0){draw(t);tx.needsUpdate=true}})})();
 L.door(BW,26.6,2.2,7,{frame:'#c4c8ca',col:'#6a7a8a',open:.55,hinge:'right',inside:'#2a2e36',glow:'#cfd8e0',light:'#cfd8e0'});
 /* desks */
 var rowsZ=[4.9,9.6];
 [[5.4,0],[12.2,1],[19.0,2]].forEach(function(cp,ci){rowsZ.forEach(function(z,ri){var x=cp[0],G=L.grp(x,0,z,0);
  L.box(5.6,.16,2.6,'#8a7a66',0,3.0,0,{par:G,r:.05,rough:.5});[[-2.6,-1.1],[2.6,-1.1],[-2.6,1.1],[2.6,1.1]].forEach(function(p){L.box(.2,3.0,.2,'#4a4a52',p[0],0,p[1],{par:G,r:.04,metal:.4})});L.box(5.2,2.1,.1,'#6a6a72',0,.9,-1.1,{par:G,r:.03});
  L.monitor(G,-1.2,3.1,-.4,0,(ci+ri)%3===0?'pitch':'text',{ph:(ci+ri)%2});L.keyboard(G,-1.2,3.1,.75,0);L.box(.45,.08,.7,'#d6d2c8',-.1,3.1,.8,{par:G,r:.04,ns:1});
  L.box(1.2,.08,.9,'#f1ece4',1.5,3.1,.4,{par:G,r:.01,ns:1,map:L.paperTex([{t:('Draft — '+__CK.Short),f:'bold 20px',c:__CK.ad,dy:28}],128,90,{bg:'#f4f1ee',rule:6})}).rotation.y=.2;L.box(1.0,.5,.7,'#e8e2da',2.1,3.1,-.7,{par:G,r:.05,ns:1});L.box(.9,.4,.6,'#d6d2c8',1.5,3.6,-.7,{par:G,r:.04,ns:1}).rotation.y=.1;
  L.mug(G,2.2,3.1,.6,['#e8e2da',__CK.a2,'#2d4a6b'][(ci+ri)%3]);if((ci+ri)%2===0){var ph=L.box(.9,.4,.7,'#bfc2c6',2.1,3.1,-.1,{par:G,r:.12,s:4});L.cyl(.05,.05,.7,'#2a2a30',2.4,3.4,-.05,{par:G,rz:1.57})}
  if((ci+ri)%3===1){L.cyl(.55,.65,.14,'#2a2a30',-2.3,3.1,-.7,{par:G});L.cyl(.05,.05,1.4,'#2a2a30',-2.3,3.2,-.7,{par:G});L.cyl(.2,.5,.5,__CK.a2,-1.9,4.6,-.7,{par:G}).rotation.z=.8}
  var ch=L.chair(x-1.2,z+2.5,Math.PI+((ci+ri)%3-1)*.12,{wood:'#4a5260',cush:'#4a5a7a',h:1.9});})});
 /* right wall: copier, filing cabinet, cooler, newspaper bundles */
 (function(){L.box(3.0,3.4,2.4,'#d8dde2',12.4,0,0,{par:RW,r:.1,rough:.4});L.box(2.7,.4,2.1,'#3a3f48',12.4,3.4,0,{par:RW,r:.06});L.box(1.2,.1,.8,'#f4f1ee',12.4,3.8,.2,{par:RW,r:.02,ns:1}).rotation.y=.3;L.sph(.1,'#3d8a5a',11.4,3.1,1.25,{par:RW,ns:1,mat:new THREE.MeshBasicMaterial({color:'#7affb0'})});
  L.box(1.9,4.2,1.7,'#8a929a',9.0,0,0,{par:RW,r:.08,metal:.3,rough:.5});for(i=0;i<4;i++){L.box(1.6,.9,.06,'#7a828a',9.0,.2+i*1.0,.88,{par:RW,r:.02});L.box(.6,.1,.06,'#c9c4bc',9.0,.5+i*1.0,.95,{par:RW,metal:.8,ns:1})}L.books(RW,8.3,4.2,0,3,{hmin:.8,hmax:1.2,d:1.1});
  L.box(1.2,3.0,1.2,'#e8f0f4',5.6,0,0,{par:RW,r:.15,rough:.35});L.cyl(.5,.5,1.3,'#9ac8e8',5.6,3.0,0,{par:RW,tr:1,op:.55,rough:.1});L.cyl(.3,.3,.04,'#fff',5.6,.9,.62,{par:RW,rx:Math.PI/2,ns:1});
  for(i=0;i<3;i++)L.box(2.4,.5+i*.05,1.6,'#d4d0c4',3.0,i*.55,0,{par:RW,r:.04,map:L.paperTex([{t:'The Daily Edition',f:'900 20px',c:'#2a2a30'}],128,64,{bg:'#d8d4c8'}),ry:0});L.box(2.4,.08,.2,'#6a4a3a',3.0,1.6,0,{par:RW,ns:1}).visible=false})();
 // sign + clock
 L.pl(2.4,.9,L.M('#fff',{map:L.posterTex(240,90,'#2d4a6b',[{t:'Quiet — Working',f:'900 36px',c:'#f4f1ee',y:56}],{bd:'#f4f1ee'})}),23.4,7.6,.12,{par:BW});
 (function(){var cv=L.C(128,128),k=L.X(cv);k.fillStyle='#f4efe8';k.beginPath();k.arc(64,64,60,0,7);k.fill();k.strokeStyle='#2a2a30';k.lineWidth=6;k.stroke();for(var q=0;q<12;q++){k.save();k.translate(64,64);k.rotate(q*Math.PI/6);k.fillRect(-2,-54,4,10);k.restore()}L.pl(1.5,1.5,new THREE.MeshStandardMaterial({map:c.tex(cv,1,1),roughness:.5,color:'#fff'}),16.4,8.4,.2,{par:BW});var sec=L.box(.04,.55,.03,__CK.ad,16.4,8.4,.26,{par:BW,r:.01,ns:1});sec.geometry.translate(0,.22,0);L.box(.07,.4,.03,'#2a2a30',16.4,8.4,.24,{par:BW,r:.01,ns:1});L.box(.07,.55,.03,'#2a2a30',16.4,8.4,.25,{par:BW,r:.01,ns:1}).rotation.z=-2;c.tick(function(t){sec.rotation.z=-t*1.3})})();
 L.plant(1.6,13.0,1.2,{pot:'#6a727a',n:11});L.plant(26.4,13.0,1.2,{pot:'#6a727a',n:11});
 L.cyl(.55,.45,1.4,'#8a929a',2.4,0,4.0,{metal:.4});
 L.box(1.6,.2,1.1,'#f4f1ee',3.4,0,10.4,{r:.03,ns:1,map:L.paperTex([{t:'Article',f:'bold 20px',c:'#2a2a30'}],64,48,{bg:'#e8e2da'})}).rotation.y=.5;
 /* people */
 c.person({skin:SK[1],top:'#6a8aa0',bot:'#2a2a34',hair:'#3a3a40',style:'short',glasses:true,stubble:true,w:1.12,mode:'talk',s:1.1,ry:-.2,look:.2,watch:true},{x:8.6,z:5.8});
 c.person({skin:SK[2],top:'#e8e4de',bot:'#3a4a6a',hair:'#2a1a14',style:'short',w:.98,mode:'sit',s:1.08,ry:Math.PI-.1},{x:11.9,z:11.9});
 c.person({skin:SK[0],top:__CK.ad,bot:'#2a2a30',hair:'#6a3a2a',style:'long',w:.88,mode:'sit',s:1.04,ry:Math.PI+.1,lash:true},{x:4.3,z:7.4});
 c.person({skin:SK[3],top:'#3d5f63',bot:'#2a2a30',hair:'#14100e',style:'curly',w:1.0,mode:'listen',s:1.08,ry:2.6},{x:24.2,z:6.6});
 c.setCam(3.8,4.0,9.9,3.8,.75,1.0,38,59)}});

/* ===== office (supporters' club office) ===== */
RM.def('office',{kind:'work',build:function(c){var L=lib(c),rr=c.rr,rnd=c.rnd,g=c.g,SK=c.SK,C1=c.skin.c1,C2=c.skin.c2,i,j;
 c.sky('indoor');var W=24,D=14;
 var wB=L.wallTex(W,9.2,{base:'#e8dccb',dado:2.2,dadoCol:'#7a3a3a',rail:'#d8c8b4',stain:1});
 var wL=L.wallTex(D,9.2,{base:'#e8dccb',dado:2.2,dadoCol:'#7a3a3a',rail:'#d8c8b4',stain:1});
 L.shell({W:W,D:D,H:9.2,floor:L.woodTex(24,34,36,8,3,3.5),floorRough:.55,wallB:wB,wallL:wL,right:true,skirt:'#4a3028',edge:'#d8c8b4'});
 var BW=g,LW=L.wg('left'),RW=L.wg('right');
 c.light('hemi','#fff0e6',.6,0,0,0,'#3a2c28');
 L.key('#fff0e0',.7,-5,10,8,3.8,2.0,7.5);
 L.pt('#ffb48a',1.1,12,6.5,5,16);L.pt('#ffe6cf',.7,6,6,10,14);
 /* door on back wall */
 L.door(BW,20,2.2,7,{frame:'#d8c8b4',col:'#6a4a3a',open:.5,hinge:'right',inside:'#2a2024',glow:'#ffd8c4',light:'#ffb48a'});
 /* window on left wall */
 L.window(LW,-7.5,3.6,3.6,3.6,{view:L.sky('dusk',3.6,3.6),frame:'#d8c8b4',cols:2,rows:2});
 L.pt('#ffb48a',.6,2,5.4,7.5,10);
 /* big banner on back wall: text only */
 L.pl(8.6,2.4,L.M('#fff',{map:L.posterTex(520,150,C1,[{t:'Fans’ Room',f:'900 70px',c:'#f4f1ff',y:98}],{bd:'#f4f1ff'}),rough:.9}),8.4,6.9,.14,{par:BW});
 /* scarves line */
 for(i=0;i<5;i++)L.hang(BW,3.2+i*.9,5.2,.5,.7,2.8,L.scarfTex(i%2?C1:'#f4f1ff',i%2?'#f4f1ff':C1),{ph:i});
 /* bulletin boards */
 (function(){var cb=L.C(480,300),k=L.X(cb);k.fillStyle='#b88a64';k.fillRect(0,0,480,300);L.nz(k,480,300,6);
  var items=[['Fixtures',20,16,'#f4f1ee'],['Away Coach — 14:00',250,20,'#e0e6ea'],['Tifo: Sketch',30,150,'#f4f1ee'],['New Subscribers',270,150,'#e8e2da']];
  items.forEach(function(it){k.fillStyle='rgba(0,0,0,.25)';k.fillRect(it[1]+3,it[2]+4,190,110);k.fillStyle=it[3];k.fillRect(it[1],it[2],190,110);k.fillStyle=C1;k.fillRect(it[1],it[2],190,22);k.fillStyle='#2a2a30';k.direction='ltr';k.textAlign='right';k.font='bold 15px Heebo, Arial';k.fillText(it[0],it[1]+184,it[2]+42);for(var l=0;l<5;l++)k.fillRect(it[1]+10,it[2]+54+l*10,150*rr(.5,1),3)});
  L.box(5.6,3.7,.2,'#5a3a2a',17.6,3.2,.1,{par:LW?BW:BW,r:.05});L.pl(5.2,3.3,L.M('#fff',{map:c.tex(cb,1,1),rough:.95}),17.6,5.0,.22,{par:BW})})();
 /* trophy shelf (silver) on right wall */
 (function(){var G=L.wg('right');L.shelf(G,6.5,3.0,0,5.4,2,{wood:'#5a3a2a'});
  for(i=0;i<5;i++){var x=4.6+i*.95;L.cyl(.3,.2,.12,'#3a3a40',x,3.22,0,{par:G});L.cyl(.1,.1,.6,'#c8ccd0',x,3.34,0,{par:G,metal:.8,rough:.3});L.cyl(.3,.15,.5,'#c8ccd0',x,3.9,0,{par:G,metal:.8,rough:.3,seg:14})}
  L.books(G,4.2,5.42,0,8,{hmin:.8,hmax:1.2,d:.9});
  L.pl(2.6,1.6,L.M('#fff',{map:L.posterTex(260,160,'#f4f1ee',[{t:('GATE '+__CK.n2+' — FOREVER'),f:'900 40px',c:C1,y:70},{t:'Since 1923',f:'bold 28px',c:'#2a2a30',y:120}],{bd:'#2a2a30'}),rough:.6}),11.6,6.0,.2,{par:G})})();
 /* filing cabinet + membership box (right wall) */
 L.box(1.5,4.0,1.8,'#7a8590',15.2,0,1.0,{par:L.wg('right'),r:.05,metal:.4});for(i=0;i<4;i++)L.box(1.3,.04,.1,'#2a2a30',15.2,.5+i*.9,1.9,{par:L.wg('right'),ns:1});
 L.box(1.2,.6,.8,__CK.ad,15.3,4.0,1.0,{par:L.wg('right'),r:.06});
 /* rug */
 L.rug(10,6,'#6a2a2e','#3a2a3a','#c8a89a','#2d3a50',.04,{x:11,z:8.5,rot:0});
 /* big desk */
 var D1=L.grp(11,0,5,0,g);L.box(6.4,.3,2.8,'#7a5238',0,3.2,0,{par:D1,r:.08});L.box(.4,3.2,2.6,'#6a4630',-3,0,0,{par:D1,r:.05});L.box(.4,3.2,2.6,'#6a4630',3,0,0,{par:D1,r:.05});L.box(6,2.2,.2,'#6a4630',0,.6,-1.2,{par:D1,r:.03});
 L.box(1.8,.08,1.3,'#5a6a5a',-1.4,3.5,.2,{par:D1,r:.03});
 for(i=0;i<4;i++)L.box(1.3,.05,1,['#f4f1ee','#e8e2da','#f1ece4','#e0e6ea'][i],1+i*.3,3.5+i*.05,.1+i*.15,{par:D1,r:.01,ns:1}).rotation.y=rr(-.4,.4);
 L.mug(D1,2.4,3.5,-.6,C1);L.steam(D1,2.4,3.9,-.6,5);L.mug(D1,-2.5,3.5,-.7,'#e8e2da');
 (function(){var G=L.grp(-1.6,3.5,-.3,0,D1);L.box(1.9,.1,1.3,'#8a8e92',0,0,0,{par:G,r:.04,metal:.5});var lid=L.box(1.9,1.2,.08,'#8a8e92',0,.05,-.6,{par:G,r:.04,metal:.5});lid.rotation.x=-.2;
  var cv=L.C(256,160),k=L.X(cv);var sc=L.pl(1.7,1.05,new THREE.MeshBasicMaterial({map:c.tex(cv,1,1)}),0,.7,-.52,{par:G});sc.rotation.x=-.2;
  c.tick(function(t){k.fillStyle='#e8eef4';k.fillRect(0,0,256,160);k.fillStyle=C1;k.fillRect(0,0,256,24);k.fillStyle='#2a2a30';for(var q=0;q<7;q++)k.fillRect(14,40+q*15,180*(.5+.5*Math.abs(Math.sin(q*2.3+Math.floor(t*.4)))),6);k.fillStyle='#2d4a6b';k.fillRect(200,40,40,40);c.tex(cv,1,1).needsUpdate=true})})();
 L.lamp(14.3,4.6,{h:4.4,int:.6,dist:7});
 L.chair(11.6,2.4,0,{wood:'#4a2a22',cush:__CK.add,h:2.0});
 L.chair(9.8,8.4,Math.PI,{wood:'#4a2a22',cush:'#4a5a7a',h:1.9});
 /* paint cans + banner-making clutter, back-left */
 for(i=0;i<5;i++){L.cyl(.4,.4,.7,[__CK.ad,'#f4f1ee','#2d4a6b',__CK.ad,'#1c1c22'][i],2.4+i*.8,0,2.2+(i%2)*.7,{seg:14,metal:.3})}
 L.box(4.6,.06,1.8,'#f4f1ee',3.6,.08,4.4,{r:.02,ns:1,map:L.paperTex([{t:'To the End',f:'900 36px',c:C1}],128,48,{bg:'#f4f1ee'})}).rotation.y=.2;
 L.cyl(.3,.3,.7,__CK.ad,6.8,0,4.6,{seg:12});
 /* kettle table */
 L.box(3.0,2.4,1.6,'#6a4a38',20.2,0,11.4,{r:.06});L.cyl(.4,.35,.8,'#c8ccd0',19.6,2.4,11.4,{metal:.7,rough:.3});L.steam(g,19.6,3.3,11.4,5);L.mug(g,20.8,2.4,11.4,'#e8e2da');
 L.plant(1.6,12.3,1.2,{pot:'#7a4a3a',n:11});L.plant(22.4,3.0,1.0,{pot:'#7a4a3a',n:9});
 L.ball(6.4,.45,7.6,.45);
 /* people */
 c.person({skin:SK[1],top:'#e8e4de',bot:'#2a2a34',hair:'#8a8a90',style:'short',stubble:true,w:1.08,mode:'sit',s:1.1,ry:Math.PI,},{x:11.6,z:3.2});
 c.person({skin:SK[2],top:C1,bot:'#3a4a6a',hair:'#2a1a14',style:'curly',w:.96,mode:'talk',s:1.08,ry:.4,look:-.3},{x:15.4,z:9.6});
 c.person({skin:SK[0],top:'#2d4a6b',bot:'#2a2a30',hair:'#6a3a2a',style:'long',w:.88,mode:'idle',s:1.04,ry:-.5,lash:true},{x:5.6,z:6.4});
 c.setCam(3.3,3.8,9.0,3.3,.7,1.0,38,57)}});
})();
