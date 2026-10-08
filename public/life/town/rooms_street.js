(function(){var RM=window.RM,T=THREE;
var FAN={red:__CK.a,wht:'#f4f1ff',blk:'#14141c',nav:'#2a2e3a',blu:'#2a4a8a'};
var SKN=['#f1c7a5','#e0a982','#c68863','#8d5a3e','#6b4430'];
function pick(a,r){return a[Math.floor(r*a.length)%a.length]}
/* ---------- shared street kit (per room ctx) ---------- */
function kit(c){var K={c:c},W=c.world,std=c.std,mesh=c.mesh,rbox=c.rbox,rnd=c.rnd,rr=c.rr,anim=c.anim;
 var night=(c.o.time||K.def||'night')==='night';
 K.glow=function(x,y,z,col,sx,sy,op,par,pulse){var sp=new T.Sprite(new T.SpriteMaterial({color:col,map:c.glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:op==null?.5:op,depthWrite:false}));sp.scale.set(sx,sy||sx,1);sp.position.set(x,y,z);(par||W).add(sp);if(pulse!==false)anim.glow.push(sp);return sp};
 K.box=function(w,h,d,col,x,y,z,par,o){return mesh(rbox(w,h,d,Math.min(.04,w/3,h/3,d/3),2),std(col,o||{}),x,y,z,par||W)};
 K.plane=function(w,h,mat,x,y,z,par,ry,rx){var m=new T.Mesh(new T.PlaneGeometry(w,h),mat);m.position.set(x,y,z);if(ry)m.rotation.y=ry;if(rx)m.rotation.x=rx;(par||W).add(m);return m};
 K.flat=function(x0,x1,z0,z1,y,mat){var m=new T.Mesh(new T.PlaneGeometry(x1-x0,z1-z0),mat);m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,y,(z0+z1)/2);m.receiveShadow=true;W.add(m);return m};
 K.mat=function(map,rough,metal){return new T.MeshStandardMaterial({map:map,color:'#fff',roughness:rough==null?.8:rough,metalness:metal||0})};
 /* neon / lit sign text */
 K.neon=function(txt,col,w,h,x,y,z,par,o){o=o||{};var cv=c.cvs(512,Math.round(512*h/w)),g=cv.getContext('2d');
  if(o.plate){g.fillStyle=o.plate;c.rrect(g,2,2,cv.width-4,cv.height-4,18);g.fill()}
  var fpx=parseInt((o.font||'bold 120px').replace(/[^0-9]/g,''))||120,fw=/bold/.test(o.font||'bold')?'bold ':'';g.textAlign='center';g.textBaseline='middle';g.direction=o.dir||'ltr';var cx=cv.width/2,cy=cv.height/2+4;for(var it=0;it<30;it++){g.font=fw+fpx+'px Heebo, Arial, sans-serif';if(g.measureText(txt).width<cv.width*.86&&fpx<cv.height*.8)break;fpx-=4}
  g.shadowColor=col;g.shadowBlur=26;g.fillStyle=col;g.fillText(txt,cx,cy);g.shadowBlur=10;g.fillText(txt,cx,cy);g.shadowBlur=0;g.fillStyle=o.core||'#ffffff';g.globalAlpha=.85;g.fillText(txt,cx,cy);g.globalAlpha=1;
  var t=c.tex(cv,1,1);var m=new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false});var p=K.plane(w,h,m,x,y,z,par);
  if(o.back){K.box(w+.15,h+.15,.1,o.back,x,y,z-.06,par)}
  if(o.halo!==false)K.glow(x,y,z+.25,col,w*1.5,h*2.2,o.halo||.35,par);return p};
 /* sign panel */
 K.sign=function(txt,bg,fg,w,h,x,y,z,par,o){o=o||{};var spw=o.pw||512,sph=Math.round(spw*h/w),sfp=Math.min(96,Math.round(sph*.52));var sg=c.cvs(8,8).getContext('2d');while(sfp>14){sg.font='bold '+sfp+'px Heebo, Arial';if(sg.measureText(txt).width<spw*.8)break;sfp-=4}var m=new T.MeshStandardMaterial({map:c.sign(txt,bg,fg,spw,sph,o.font||('bold '+sfp+'px')),roughness:.5,emissive:o.em||'#000',emissiveIntensity:o.ei||0});if(o.em){m.emissiveMap=m.map}var b=K.box(w,h,.08,'#1a1a22',x,y,z-.04,par);var p=K.plane(w,h,m,x,y,z+.01,par);return p};
 /* hanging text strip / banner on wall (no logos) */
 K.cloth=function(txt,bg,fg,w,h,x,y,z,par,ry,o){o=o||{};var cv=c.cvs(512,Math.round(512*h/w)),g=cv.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,cv.width,cv.height);
  if(o.stripe){g.fillStyle=o.stripe;g.fillRect(0,cv.height*.08,cv.width,cv.height*.1);g.fillRect(0,cv.height*.82,cv.width,cv.height*.1)}
  g.fillStyle=fg;g.font=(o.font||'900 150px')+' Heebo, Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.direction=o.dir||'ltr';if(o.outline){g.lineWidth=16;g.strokeStyle=o.outline;g.lineJoin='round';g.strokeText(txt,cv.width/2,cv.height/2+8)}g.fillText(txt,cv.width/2,cv.height/2+8);
  var m=new T.MeshStandardMaterial({map:c.tex(cv,1,1),roughness:.95,side:T.DoubleSide});var p=K.plane(w,h,m,x,y,z,par,ry);p.castShadow=true;return p};
 /* windows */
 K.win=function(G,x,y,z,o){o=o||{};var w=o.w||1,h=o.h||1.5,lit=o.lit,col=o.col||'#ffb48a';
  K.box(w+.22,h+.22,.14,o.frame||'#2a2a34',x,y,z,G);
  var gl=new T.MeshStandardMaterial({color:lit?col:'#2a3450',emissive:lit?col:'#1a2238',emissiveIntensity:lit?1.15:.55,roughness:.15,metalness:.2});var p=K.plane(w,h,gl,x,y,z+.09,G);p.castShadow=false;
  if(lit&&rnd()<.55){var cw=w*(.3+rnd()*.35);K.plane(cw,h,new T.MeshBasicMaterial({color:pick(['#4a2030','#2a2a48','#5a3040'],rnd()),transparent:true,opacity:.5}),x+(rnd()<.5?-1:1)*(w-cw)/2,y,z+.1,G)}
  if(lit&&rnd()<.3){K.plane(w*.28,h*.55,new T.MeshBasicMaterial({color:'#120c14',transparent:true,opacity:.7}),x+(rnd()-.5)*w*.4,y-h*.22,z+.1,G)}
  K.box(w+.1,.07,.1,'#2a2a34',x,y,z+.1,G);K.box(w,.02,.1,'#2a2a34',x,y+h*.2,z+.1,G);
  K.box(w+.4,.1,.36,o.sill||'#6a6a74',x,y-h/2-.15,z+.1,G);
  if(lit&&o.glow)K.glow(x,y,z+.5,col,w*2.8,h*2.2,.3,G);
  if(o.shut){var sm=new T.MeshStandardMaterial({map:c.stripes('#5a6a7a','#4a5868',14),roughness:.7});var sh=o.shut;K.box(w+.3,.2,.22,'#3a3e48',x,y+h/2+.15,z+.05,G);K.plane(w,h*sh,sm,x,y+h/2-h*sh/2,z+.13,G)}
  return p};
 /* AC unit */
 K.ac=function(G,x,y,z){K.box(.9,.55,.5,'#c8c8d0',x,y,z,G);var f=new T.Mesh(new T.CircleGeometry(.2,12),std('#4a4a55'));f.position.set(x-.18,y,z+.26);G.add(f)};
 /* building block: front face at zf, centred x, width w, height h */
 /* a Tel Aviv street is plaster, not paint: weathered limestone-cream, sand and grey, sun-bleached, with the old coat showing */
 var PLASTER=[['#cbc2b2',['#bdb3a1','#d6cfc2','#a89e8c']],['#bfb5a3',['#b0a692','#cdc5b6','#9c927f']],['#d2ccc2',['#c4bdb1','#dcd7cf','#ada69a']],['#b5ad9f',['#a69e90','#c4bcae','#948c7e']],['#c6c0b6',['#b8b1a6','#d2ccc3','#a39c90']]];
 K._pl=[];K.bld=function(x,w,h,zf,o){o=o||{};var d=o.d||5,G=new T.Group();G.position.set(x,0,zf-d/2);W.add(G);var fz=d/2;
  var pi=Math.floor(Math.abs(Math.sin(x*12.9898+h*7.233)*43758.5453))%PLASTER.length,pl=PLASTER[pi];
  var map=o.map;if(!map){if(o.keep)map=c.wall(o.base||'#8a8a94',o.tones||['#7a7a86','#9a9aa6','#6a6a76'],Math.max(1,w/3),Math.max(1,h/3));else{var bt=K._pl[pi]||(K._pl[pi]=c.wall(pl[0],pl[1],1,1));map=bt.clone();map.repeat.set(Math.max(1,w/3),Math.max(1,h/3));map.needsUpdate=true}}
  var b=mesh(rbox(w,h,d,.06,4),std('#fff',{map:map,roughness:o.rough||.88}),0,h/2,0,G);
  K.box(w+.3,.32,d+.3,o.cornice||'#5a5a66',0,h+.1,0,G);K.box(w+.2,.5,.2,o.cornice||'#5a5a66',0,h-.4,fz+.05,G);
  if(o.band){K.box(w+.06,.22,.12,o.band,0,o.bandY||3.2,fz+.03,G)}
  var cols=o.cols||Math.max(1,Math.floor(w/2)),rows=o.rows||Math.max(1,Math.floor((h-(o.base0||3.4))/2.9)),y0=o.y0||(o.base0||3.4)+1.2;
  for(var r=0;r<rows;r++)for(var k=0;k<cols;k++){if(o.skip&&o.skip(r,k))continue;var wx=-w/2+(k+.5)*w/cols;K.win(G,wx,y0+r*2.9,fz+.02,{lit:rnd()<(o.litP==null?.5:o.litP),col:pick(o.litCols||['#ffb48a','#ffe6cf','#ff9a74','#cfe0ff'],rnd()),w:o.ww||.95,h:o.wh||1.5,shut:o.shut&&rnd()<.5?.45+rnd()*.4:0,sill:o.sill})}
  if(o.balc){for(r=0;r<rows;r++)for(k=0;k<cols;k++){if(rnd()<.55||(o.balcSkip&&o.balcSkip(r,k)))continue;var bx=-w/2+(k+.5)*w/cols,by=y0+r*2.9-1.05;K.box(1.5,.12,.9,'#7a7a86',bx,by,fz+.45,G);K.box(1.5,.05,.05,'#2a2e3a',bx,by+.86,fz+.88,G,{metalness:.4});
   for(var q=0;q<6;q++)K.box(.025,.8,.03,'#14141c',bx-.7+q*.28,by+.46,fz+.9,G);
   if(rnd()<.5){K.box(.3,.25,.25,'#6a3a30',bx+rr(-.5,.5),by+.2,fz+.65,G);K.box(.3,.2,.3,'#2a6a3a',bx+rr(-.5,.5),by+.45,fz+.65,G)}
   if(rnd()<.45){K.box(1.4,.012,.012,'#d8d4cc',bx,by+1.5,fz+.95,G);var LC=['#e8e4dc','#3a4a6a','#d8d0c0','#6a7a5a','#2a2a30','#8a7a6a',__CK.a2];for(var lq=0;lq<4;lq++){var lw=rr(.18,.32),lh=rr(.3,.55),cl=new T.Mesh(new T.PlaneGeometry(lw,lh),std(LC[Math.floor(rnd()*LC.length)],{side:T.DoubleSide,roughness:.95}));cl.position.set(bx-.55+lq*.36+rr(-.04,.04),by+1.5-lh/2,fz+.95);cl.rotation.y=rr(-.15,.15);G.add(cl)}}}}
  if(o.acs)for(var i=0;i<o.acs;i++)K.ac(G,rr(-w/2+.8,w/2-.8),rr(3.6,h-1.6),fz+.3);
  if(o.pipe)K.box(.14,h,.14,'#4a4a52',o.pipe,h/2,fz+.12,G,{metalness:.5});
  G.userData.fz=fz;G.userData.zf=zf;return G};
 /* shopfront in front of a building face: x centre, width, zf = plane z */
 K.shop=function(x,w,zf,o){o=o||{};var h=o.h||2.7,G=new T.Group();G.position.set(x,0,zf);W.add(G);
  K.box(w,h+.6,.3,o.frame||'#1a1a22',0,(h+.6)/2,.0,G);
  var gl=new T.MeshStandardMaterial({color:o.glass||'#ffe6cf',emissive:o.glass||'#ffd8b8',emissiveIntensity:o.lit===false?.05:.85,roughness:.1,metalness:.1});
  var gx=o.door?-w*.12:0,gw=o.door?w*.62:w-.5;K.plane(gw,h-.4,gl,gx,h/2-.1,.17,G).castShadow=false;
  if(o.door){K.box(w*.22,h-.3,.08,'#14141c',w*.33,(h-.3)/2,.17,G);K.plane(w*.16,h-.6,gl,w*.33,(h-.3)/2+.1,.22,G)}
  /* shelves silhouette */
  if(o.shelves){for(var s=0;s<3;s++){K.box(gw-.2,.06,.3,'#3a2a2a',gx,.7+s*.7,.3,G);for(var q=0;q<7;q++)K.box(.2,.32,.2,pick(o.shelfCols||[__CK.a,'#f4f1ff','#2a6aff','#ff7a5a','#e0e0ee'],rnd()),gx-gw/2+.4+q*(gw-.8)/6,.9+s*.7,.3,G)}}
  if(o.sign)K.sign(o.sign,o.signBg||'#14141c',o.signFg||'#ff7a8a',Math.min(w-.2,3.2),.6,0,h+.45,.2,G,{em:o.signEm||'#ff2a3a',ei:.25});
  if(o.awning){var aw=o.awning,n=8,cv=c.stripes(aw[0],aw[1],n);var am=new T.MeshStandardMaterial({map:cv,roughness:.9,side:T.DoubleSide});var a=new T.Mesh(new T.BoxGeometry(w+.3,.06,1.1),am);a.position.set(0,h-.12,.65);a.rotation.x=.2;a.castShadow=true;G.add(a);K.box(w+.3,.2,.04,aw[0],0,h-.28,1.2,G);}
  if(o.lit!==false)K.glow(0,h/2,.9,o.glowCol||'#ffb48a',w*1.6,h*1.4,.35,G);
  return G};
 /* ground */
 K.ground=function(w,d,map,rx,ry,y,x0,z0,rough,metal){var m=mesh(new T.PlaneGeometry(w,d),std('#fff',{map:map,roughness:rough==null?.4:rough,metalness:metal==null?.1:metal}),x0,y||0,z0,W);m.rotation.x=-Math.PI/2;m.castShadow=false;return m};
 K.curb=function(x0,x1,z,h){K.box(x1-x0,h||.18,.28,'#a8a4a8',(x0+x1)/2,(h||.18)/2,z,W)};
 K.pave=function(x0,x1,z0,z1,h,map){var m=mesh(rbox(x1-x0,h,z1-z0,.03,2),std('#fff',{map:map,roughness:.75}),(x0+x1)/2,h/2,(z0+z1)/2,W);m.castShadow=false;return m};
 K.streak=function(x,z,col,w,l,op){var s=new T.Mesh(new T.PlaneGeometry(w,l),new T.MeshBasicMaterial({color:col,map:c.glowTex(),transparent:true,opacity:op||.28,blending:T.AdditiveBlending,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(x,.025,z);W.add(s);return s};
 K.puddle=function(x,z,w,l){var m=new T.Mesh(new T.CircleGeometry(.5,24),new T.MeshStandardMaterial({color:'#1c2440',roughness:.05,metalness:0,transparent:true,opacity:.45,emissive:'#10162e',emissiveIntensity:.6}));m.rotation.x=-Math.PI/2;m.scale.set(w,l,1);m.position.set(x,.03,z);W.add(m);return m};
 /* street lamp with fake (sprite+cone) light and optional real light */
 K.lamp=function(x,z,dir,real,col){dir=dir||1;col=col||'#ff9a64';var g=new T.Group();g.position.set(x,0,z);W.add(g);K.box(.3,.2,.3,'#2a2e3a',0,.1,0,g);mesh(new T.CylinderGeometry(.07,.11,6,10),std('#2a2e3a',{metalness:.6,roughness:.4}),0,3,0,g);K.box(1.5,.1,.1,'#2a2e3a',dir*.7,5.95,0,g,{metalness:.6});K.box(.8,.14,.32,'#2a2e3a',dir*1.4,5.88,0,g);
  var l=K.plane(.7,.26,new T.MeshBasicMaterial({color:'#ffd8c0'}),dir*1.4,5.8,0,g,0,Math.PI/2);K.glow(dir*1.4,5.7,0,col,5,5,.6,g);
  var cone=mesh(new T.CylinderGeometry(.2,2.2,5.5,18,1,true),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.035,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),dir*1.4,2.9,0,g);cone.castShadow=false;
  if(real){var pl=new T.PointLight(col,1.1,15,1.6);pl.position.set(dir*1.4,5.2,.4);g.add(pl)}
  K.streak(x+dir*1.4,z+2.4,col,2,4.5,.22);return g};
 /* people */
 var PAL=[[__CK.a,'#14141c'],['#f4f1ff','#2a2e3a'],['#14141c','#2a2e3a'],['#2a2e3a','#14141c'],[__CK.a,'#2a2e3a'],['#3a4a6a','#14141c']];
 K.p=function(x,z,ry,mode,o){o=o||{};var pl=PAL[Math.floor(rnd()*PAL.length)];if(o.jacket&&!o.top2)o=Object.assign({},o,{top:o.jacket});var op={skin:o.skin||SKN[Math.floor(rnd()*5)],top:o.top||pl[0],bot:o.bot||pl[1],hair:o.hair||pick(['#1a1210','#2a1d16','#14100e','#4a3020','#8a8a90'],rnd()),style:o.style||pick(['short','buzz','spiky','slick','curly','bald'],rnd()),w:o.w||(1.04+rnd()*.14),mode:mode||'idle',s:o.s||1.08,x:x,z:z,ry:ry||0,eye:'#2a1a10'};for(var k in o)op[k]=o[k];if(op.stubble===undefined)op.stubble=rnd()<.45;return c.person(op)};
 /* fan scarf colours */
 K.car=function(x,z,ry,col,sc){var g=c.car(x,z,ry,col);g.scale.setScalar(sc||1);g.traverse(function(o){if(o.material&&o.material.metalness>.3&&o.material.metalness<.6&&o.material.roughness>.2){o.material.metalness=.22;o.material.roughness=.38}});return g};
 /* bus, side-on, facing +x (ry=Math.PI faces -x). door at local x=dx */
 K.bus=function(x,z,len,dest,col,o){o=o||{};var g=new T.Group();g.position.set(x,0,z);W.add(g);if(o.ry)g.rotation.y=o.ry;col=col||'#2a4a8a';var H=2.9,D=2.5;
  K.box(len,H-.5,D,col,0,.5+(H-.5)/2,0,g,{roughness:.4,metalness:.15});K.box(len+.04,.3,D+.04,'#d8d8e4',0,1.15,0,g);K.box(len-.1,.35,D+.02,'#14141c',0,.42,0,g);
  var nw=Math.floor((len-2.4)/1.3),dx=o.dx!=null?o.dx:len/2-1.5,lit=o.lit!==false;
  for(var i=0;i<nw;i++){var wx=-len/2+.9+i*1.3;if(Math.abs(wx-dx)<1.1)continue;K.plane(1.1,.95,new T.MeshStandardMaterial({color:lit?'#ffd8b8':'#10161e',emissive:lit?'#ff9a6a':'#050810',emissiveIntensity:lit?.55:.2,roughness:.15}),wx,2.05,D/2+.012,g);K.plane(1.1,.95,new T.MeshStandardMaterial({color:lit?'#ffe6cf':'#10161e',emissive:lit?'#ffb48a':'#050810',emissiveIntensity:lit?.5:.2}),wx,2.05,-D/2-.012,g,Math.PI)}
  K.plane(1.5,2.1,new T.MeshStandardMaterial({color:'#ffe0c8',emissive:'#ff9a6a',emissiveIntensity:lit?.8:.1}),dx,1.5,D/2+.02,g);K.box(.05,2.1,.06,'#14141c',dx,1.5,D/2+.05,g);
  K.box(len+.1,.25,D+.1,'#e8e8f0',0,H+.05,0,g);
  if(dest){K.neon(dest,o.led||'#ff5a40',2.6,.5,len/2-2.4,2.95-.02,D/2+.06,g,{back:'#050508',font:'bold 100px',halo:.2});K.neon(o.num||'5','#ff5a40',.7,.5,len/2-.7,2.95,D/2+.06,g,{back:'#050508',font:'bold 110px',dir:'ltr',halo:.2})}
  [-len/2+1.2,len/2-1.2].forEach(function(wx){[D/2-.1,-D/2+.1].forEach(function(wz){var w=mesh(new T.CylinderGeometry(.5,.5,.35,18),std('#14141a'),wx,.5,wz,g);w.rotation.x=Math.PI/2;var h=mesh(new T.CylinderGeometry(.28,.28,.37,12),std('#9a9aa4',{metalness:.6,roughness:.4}),wx,.5,wz,g);h.rotation.x=Math.PI/2})});
  [-.8,.8].forEach(function(zz){K.plane(.4,.25,new T.MeshBasicMaterial({color:'#fff4e8'}),len/2+.01,.85,zz,g,Math.PI/2);K.glow(len/2+.2,.85,zz,'#ffe8d0',1.8,1.8,.55,g,false)});
  K.plane(.3,.2,new T.MeshBasicMaterial({color:'#ff2a3a'}),-len/2-.01,.9,.8,g,-Math.PI/2);K.plane(.3,.2,new T.MeshBasicMaterial({color:'#ff2a3a'}),-len/2-.01,.9,-.8,g,-Math.PI/2);
  return g};
 K.bench=function(x,z,w,ry,col){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry||0;W.add(g);for(var i=0;i<4;i++)K.box(w,.05,.12,col||'#5a4a4a',0,.46,-.2+i*.13,g);K.box(w,.05,.5,col||'#5a4a4a',0,.46,0,g);for(i=0;i<3;i++)K.box(w,.06,.05,col||'#5a4a4a',0,.7+i*.15,-.27,g);[-1,1].forEach(function(s){K.box(.06,.46,.5,'#2a2e3a',s*(w/2-.1),.23,0,g);K.box(.06,.55,.06,'#2a2e3a',s*(w/2-.1),.7,-.26,g)});return g};
 K.tree=function(x,z,h,col,r){h=h||5;r=r||1.6;col=col||'#2a5a3a';var g=new T.Group();g.position.set(x,0,z);W.add(g);mesh(new T.CylinderGeometry(.12,.2,h*.55,8),std('#4a3a34'),0,h*.275,0,g);for(var i=0;i<7;i++){var s=mesh(new T.SphereGeometry(r*(.55+rnd()*.4),10,8),std(col,{roughness:.9}),rr(-r,r)*.8,h*.62+rr(-.3,r*.9),rr(-r,r)*.6,g);s.scale.y=.8}return g};
 K.palm=function(x,z,h,lean){h=h||5.5;lean=lean||0;var g=new T.Group();g.position.set(x,0,z);W.add(g);var tr=mesh(new T.CylinderGeometry(.09,.17,h,8),std('#6a5648',{roughness:.9}),lean*h*.5,h/2,0,g);tr.rotation.z=-lean;for(var i=0;i<9;i++){var a=i/9*6.28,fr=mesh(new T.ConeGeometry(.2,2.2,4),std('#2a5a3a',{roughness:.8,side:T.DoubleSide}),lean*h+Math.cos(a)*.95,h-.1-.25*Math.abs(Math.sin(a)),Math.sin(a)*.95,g);fr.rotation.set(Math.sin(a)*1.25,0,-Math.cos(a)*1.25);fr.scale.set(1,1,.35)}c.tick(function(t){g.rotation.z=Math.sin(t*.7+x)*.01});return g};
 /* laundry line */
 K.laundry=function(x0,y0,x1,y1,z,n){K.rope(x0,y0,x1,y1,z,.3,'#3a3a44');n=n||6;var sw=[];for(var i=0;i<n;i++){var t=(i+.5)/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t-Math.sin(t*Math.PI)*.3;var w=.35+rnd()*.3,h=.45+rnd()*.4;var m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({color:pick(['#f4f1ff',__CK.a,'#6a8ad0','#e8e0e8','#3a3a5a','#e08a9a'],rnd()),roughness:.95,side:T.DoubleSide}));m.position.set(x,y-h/2,z);m.rotation.y=rr(-.2,.2);W.add(m);sw.push(m)}c.tick(function(t){sw.forEach(function(m,i){m.rotation.y=Math.sin(t*1.3+i+x0)*.3})})};
 K.crate=function(x,z,col,y){return K.box(.5,.32,.38,col||'#8a5a3a',x,(y||0)+.16,z)};
 /* wire fence along x from x0..x1 at z (posts+mesh) */
 K.fence=function(x0,x1,z,h,ry){var g=new T.Group();g.position.set(x0,0,z);g.rotation.y=ry||0;W.add(g);var L=x1-x0;var n=Math.ceil(L/2);for(var i=0;i<=n;i++)mesh(new T.CylinderGeometry(.04,.04,h,6),std('#6a6a76',{metalness:.5}),i*L/n,h/2,0,g);var cv=c.cvs(128,128),q=cv.getContext('2d');q.strokeStyle='rgba(180,184,200,.9)';q.lineWidth=2;for(i=-128;i<256;i+=16){q.beginPath();q.moveTo(i,0);q.lineTo(i+128,128);q.stroke();q.beginPath();q.moveTo(i+128,0);q.lineTo(i,128);q.stroke()}var m=new T.MeshStandardMaterial({map:c.tex(cv,L/.8,h/.8),transparent:true,side:T.DoubleSide,roughness:.5,metalness:.4,depthWrite:false});var p=new T.Mesh(new T.PlaneGeometry(L,h),m);p.position.set(L/2,h/2,0);g.add(p);K.box(L,.05,.05,'#6a6a76',L/2,h,0,g);return g};
 /* ashlar stone texture (greys with a hint of rose, no yellow) */
 K.stone=function(rx,ry,base,hue){var cv=c.cvs(512,512),g=cv.getContext('2d');g.fillStyle='#6a6470';g.fillRect(0,0,512,512);var rows=8,bh=512/rows;for(var r=0;r<rows;r++){var x=-rr(0,60);while(x<512){var bw=rr(60,120);var l=(base||58)+rr(-9,9);g.fillStyle='hsl('+((hue==null?8:hue)+rr(-6,6))+','+rr(5,13)+'%,'+l+'%)';c.rrect(g,x+2,r*bh+2,bw-4,bh-4,7);g.fill();g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x+5,r*bh+5,bw-12,6);x+=bw}}c.paint(g,512,512,300,function(){return rnd()<.5?'#2a2630':'#aaa4b0'},.05);return c.tex(cv,rx,ry)};
 /* arched opening: dark or lit, framed */
 K.arch=function(x,y,z,w,h,o,par){o=o||{};var sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(-w/2,h-w/2);sh.absarc(0,h-w/2,w/2,Math.PI,0,true);sh.lineTo(w/2,0);sh.lineTo(-w/2,0);
  var fr=new T.Shape();var fw=w+.36;fr.moveTo(-fw/2,0);fr.lineTo(-fw/2,h-w/2);fr.absarc(0,h-w/2,fw/2,Math.PI,0,true);fr.lineTo(fw/2,0);fr.lineTo(-fw/2,0);
  var f=new T.Mesh(new T.ShapeGeometry(fr,12),std(o.frame||'#cfc8d0',{roughness:.9}));f.position.set(x,y,z);(par||W).add(f);f.castShadow=true;
  var m=o.lit?new T.MeshStandardMaterial({color:o.col||'#ffb48a',emissive:o.col||'#ff9a6a',emissiveIntensity:o.ei||1.1,roughness:.4}):new T.MeshStandardMaterial({color:o.col||'#10121c',roughness:.8});
  var d=new T.Mesh(new T.ShapeGeometry(sh,12),m);d.position.set(x,y,z+.02);(par||W).add(d);
  if(o.lit)K.glow(x,y+h/2,z+.5,o.col||'#ffb48a',w*3,h*1.6,.38,par);
  if(o.door){K.box(w-.1,h-w/2,.06,o.door,x,y+(h-w/2)/2,z+.05,par)}
  return f};
 /* water / sea plane, sunset glow column, no yellow */
 K.sea=function(x0,x1,z0,z1,y,top,bot,glowCol,glowX){var cv=c.cvs(256,256),g=cv.getContext('2d');var gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,256,256);
  if(glowCol){var gx=g.createLinearGradient(0,0,0,256);for(var i=0;i<60;i++){g.fillStyle=glowCol;g.globalAlpha=.05+rnd()*.25*(1-i/60);var yy=rnd()*256,ww=rr(8,80)*(1-yy/340);g.fillRect(((glowX||.5)*256)-ww/2+rr(-12,12),yy,ww,rr(1,3))}g.globalAlpha=1}
  var t=c.tex(cv,1,1);t.wrapS=t.wrapT=T.ClampToEdgeWrapping;var m=new T.Mesh(new T.PlaneGeometry(x1-x0,z1-z0),new T.MeshBasicMaterial({map:t,fog:true}));m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,y,(z0+z1)/2);W.add(m);return m};
 K.SC=[FAN.red,FAN.wht];
 K.rain=function(x0,x1,z0,z1,n,op,hy){n=n||600;hy=hy||9;var rp=new Float32Array(n*6),rv=[];for(var i=0;i<n;i++){var rx=x0+rnd()*(x1-x0),ry=rnd()*hy,rz=z0+rnd()*(z1-z0);rp.set([rx,ry,rz,rx-.04,ry-.55,rz],i*6);rv.push(5+rnd()*3)}
  var rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(rp,3));var r=new T.LineSegments(rg,new T.LineBasicMaterial({color:'#b8c4e0',transparent:true,opacity:op||.25,depthWrite:false}));r.frustumCulled=false;c.add(r);
  c.tick(function(t,dt){for(var i=0;i<n;i++){var y=rp[i*6+1]-rv[i]*dt;if(y<0)y+=hy;rp[i*6+1]=y;rp[i*6+4]=y-.55}rg.attributes.position.needsUpdate=true})};
 /* lighting presets */
 K.env=function(mode,o){o=o||{};
  if(mode==='night'){c.sky('night');c.fog(o.fog||'#1c2040',o.fn||16,o.ff||62);c.light('hemi',o.hemi||'#7a82aa',.5,0,0,0,'#2c2430');var s=c.light('dir',o.sun||'#ff9a78',.6,-9,10,6);c.shadows(s,o.ext||12);c.light('dir','#8aa8ff',.8,6,8,-12);c.light('dir','#9aaad0',.35,10,14,16)}
  else if(mode==='dusk'){c.sky('dusk');c.fog(o.fog||'#5a3a5e',o.fn||16,o.ff||70);c.light('hemi','#9a86b8',.8,0,0,0,'#3a2c3c');var s2=c.light('dir','#ff9a68',1.15,-12,5,8);c.shadows(s2,o.ext||12);c.light('dir','#8a9ae0',.6,8,9,-12);c.light('dir','#b0a0c0',.3,6,14,16)}
  else{c.sky('day');c.fog(o.fog||'#d6e4f0',o.fn||26,o.ff||90);c.light('hemi','#cfe0f4',.78,0,0,0,'#7a6e60');var s3=c.light('dir','#ffe6c8',1.65,-13,12,6);c.shadows(s3,o.ext||13);c.light('dir','#a0b8e0',.3,10,7,10)}};
 /* a city goes on: more of the street past both ends, and two rows of roofs behind the front row — each with what a Tel
    Aviv roof carries, a white water tank, a solar heater tilted at the sun, an aerial — so the sky is a skyline, not a gap */
 K._fl=[];K.facadeTex=function(pi){if(K._fl[pi])return K._fl[pi];var pl=PLASTER[pi],cv=c.cvs(512,512),g=cv.getContext('2d');g.fillStyle=pl[0];g.fillRect(0,0,512,512);c.paint(g,512,512,500,function(){return pl[1][Math.floor(rnd()*3)]},.12);
  /* a painted storey bay: shuttered or dark windows, a slab edge, a stain from the AC drip */
  for(var r=0;r<2;r++)for(var k=0;k<2;k++){var x0=k*256+70,y0=r*256+60;g.fillStyle='rgba(60,54,46,.35)';g.fillRect(x0-8,y0+150,132,10);var sh=rnd();if(sh<.45){g.fillStyle=['#8a8274','#6e7a78','#a49a88'][Math.floor(rnd()*3)];g.fillRect(x0,y0,116,140);g.fillStyle='rgba(0,0,0,.18)';for(var q=0;q<140;q+=7)g.fillRect(x0,y0+q,116,2)}else{g.fillStyle='#1c2028';g.fillRect(x0,y0,116,140);g.fillStyle='rgba(140,160,180,.18)';g.fillRect(x0+6,y0+6,48,128);g.fillStyle='#d8d2c6';g.fillRect(x0+56,y0,5,140);g.fillRect(x0,y0+66,116,5)}
   g.strokeStyle='#cfc8bb';g.lineWidth=6;g.strokeRect(x0,y0,116,140);if(rnd()<.4){g.fillStyle='#d8d6d0';g.fillRect(x0+130,y0+20,40,26);var gr=g.createLinearGradient(0,y0+46,0,y0+200);gr.addColorStop(0,'rgba(50,40,30,.35)');gr.addColorStop(1,'rgba(50,40,30,0)');g.fillStyle=gr;g.fillRect(x0+140,y0+46,14,154)}}
  c.weather(g,512,512,{mottle:.24,peel:.3,stain:.5,grime:.6,cracks:3,specks:600,scale:.8});var t=c.tex(cv,1,1);return K._fl[pi]=t};
 K.flatBld=function(cx,w,h,zf,d){d=d||4;var pi=Math.floor(Math.abs(Math.sin(cx*7.13+h*3.7)*9e4))%PLASTER.length,t=K.facadeTex(pi).clone();t.repeat.set(Math.max(1,Math.round(w/3.4)),Math.max(1,Math.round((h-1)/3.2)));t.needsUpdate=true;
  var m=mesh(new T.BoxGeometry(w,h,d),std('#fff',{map:t,roughness:.92}),cx,h/2,zf-d/2,W);K.box(w+.2,.3,d+.2,'#6e6a62',cx,h+.1,zf-d/2);return m};
 K.cityDepth=function(x0,x1,zf,o){o=o||{};var x;
  for(var side=0;side<2;side++){x=side?x1:x0;var dir=side?1:-1,n=0;while(n++<5){var w=rr(3,4.8),h=rr(8.5,13.5),cx=x+dir*w/2;K.flatBld(cx,w,h,zf-rr(0,.4),5);if(rnd()<.6)K.box(w*.6,.1,.8,'#7a766e',cx,rr(4,6.5),zf+.35);K.roof(cx,w,h,zf-2.5);x+=dir*w}}
  for(var row=1;row<=2;row++){var z=zf-6.5*row-rr(0,1.5);x=x0-16;while(x<x1+16){var w2=rr(3.5,6.5),h2=rr(10,15)+row*2.2,cx2=x+w2/2;K.flatBld(cx2,w2,h2,z,4);K.roof(cx2,w2,h2,z-2);x+=w2+rr(-.2,.6)}}};
 K.roof=function(cx,w,h,z){var G=new T.Group();G.position.set(cx,h+.26,z);W.add(G);
  K.box(w+.1,.5,.12,'#8a8478',0,.25,1.9,G);
  var nT=1+Math.floor(rnd()*2.4);for(var i=0;i<nT;i++){var tx=rr(-w/2+.6,w/2-.6),tz=rr(-.8,.8);mesh(new T.CylinderGeometry(.42,.42,.9,12),std(rnd()<.6?'#d8d4cc':'#9a958c',{roughness:.7}),tx,.6,tz,G);mesh(new T.CylinderGeometry(.44,.44,.06,12),std('#7a766e'),tx,1.07,tz,G)}
  if(rnd()<.8){var sx=rr(-w/2+.8,w/2-.8);var pan=K.box(1.0,.05,1.5,'#1e2a3a',sx,.75,.2,G,{metalness:.5,roughness:.3});pan.rotation.x=-.55;var tk=mesh(new T.CylinderGeometry(.22,.22,1.1,10),std('#c8c4bc',{roughness:.5}),sx,1.15,-.45,G);tk.rotation.z=Math.PI/2;K.box(.04,.7,.04,'#5a5a5a',sx-.45,.35,-.4,G);K.box(.04,.7,.04,'#5a5a5a',sx+.45,.35,-.4,G)}
  if(rnd()<.7){var ax=rr(-w/2+.4,w/2-.4);K.box(.03,1.8,.03,'#3a3a3e',ax,.9,rr(-.6,.6),G);K.box(.9,.025,.025,'#3a3a3e',ax,1.6,0,G);K.box(.6,.025,.025,'#3a3a3e',ax,1.3,0,G)}
  return G};
 /* overhead wires: wooden poles with a cross-arm and three sagging cables, the cheapest way to say "a real street" */
 K.wires=function(xs,z){var tops=[];xs.forEach(function(x){var g=new T.Group();g.position.set(x,0,z);W.add(g);mesh(new T.CylinderGeometry(.09,.13,7.4,8),std('#4a3a2e',{roughness:.9}),0,3.7,0,g);K.box(.1,.1,1.6,'#3a2e24',0,7.0,0,g);[-0.7,0,0.7].forEach(function(o){K.box(.06,.12,.06,'#d8d4cc',0,7.1,o,g)});tops.push(x)});
  for(var i=0;i<tops.length-1;i++)[-0.7,0,0.7].forEach(function(o){var a=new T.Vector3(tops[i],7.16,z+o),b=new T.Vector3(tops[i+1],7.16,z+o),m=a.clone().lerp(b,.5);m.y-=.55;var cv=new T.QuadraticBezierCurve3(a,m,b);var tb=new T.Mesh(new T.TubeGeometry(cv,16,.012,4,false),std('#141414',{roughness:.8}));tb.castShadow=false;W.add(tb)})};
 /* camera helper: room width W, focus z, height */
 K.cam=function(Wd,zf,o){o=o||{};var d=(o.d||Wd/2/.551*1.12);var cx=o.cx!=null?o.cx:Wd/2;c.setCam(cx,o.y||3.0,zf+d,cx,o.ly||2.9,zf,o.fov||38,o.fovP||62)};
 /* tiled paving texture */
 K.paver=function(base,line,rx,ry,n,w2){function warm(h,k){var q=new T.Color(h),l=(q.r*.3+q.g*.59+q.b*.11)*k;return'#'+new T.Color(Math.min(1,l*1.05),l,l*.9).getHexString()}base=warm(base,.92);line=warm(line,.95);var cv=c.cvs(512,512),g=cv.getContext('2d');g.fillStyle=base;g.fillRect(0,0,512,512);var s=512/n;for(var i=0;i<n;i++)for(var j=0;j<n;j++){g.fillStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+(rnd()*.06)+')';g.fillRect(i*s,j*(w2?s*w2:s),s,w2?s*w2:s)}
  g.strokeStyle=line;g.lineWidth=3;for(i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,512);g.stroke();g.beginPath();g.moveTo(0,i*s*(w2||1));g.lineTo(512,i*s*(w2||1));g.stroke()}c.paint(g,512,512,260,function(){return rnd()<.5?'#0e0c0a':'#a29a8e'},.05);if(c.weather)c.weather(g,512,512,{mottle:.26,stain:.5,grime:.7,cracks:4,specks:1400,scale:.8});return c.tex(cv,rx,ry)};
 /* graffiti / wall-art texture, text only */
 K.graf=function(w,h,o){o=o||{};var pw=1024,ph=Math.round(1024*h/w),cv=c.cvs(pw,ph),g=cv.getContext('2d');g.fillStyle=o.bg||'#6e6e7a';g.fillRect(0,0,pw,ph);c.paint(g,pw,ph,900,function(){return pick(['#8a8a96','#5a5a66','#7a7a86'],rnd())},.09);
  for(var i=0;i<5;i++){var px=rnd()*pw*.8,py=rnd()*ph*.7,pw2=rr(90,200),ph2=rr(120,230);g.fillStyle=pick(['#e8e4ee','#d8d0d8','#c8c0cc'],rnd());g.fillRect(px,py,pw2,ph2);g.fillStyle=pick([__CK.a,'#14141c','#2a4a8a'],rnd());g.fillRect(px+8,py+10,pw2-16,ph2*.35);g.fillStyle='rgba(20,20,30,.55)';for(var k=0;k<5;k++)g.fillRect(px+10,py+ph2*.5+k*9,pw2-20-rnd()*30,4)}
  var big=o.words||[__CK.SHORT,'ULTRAS'];g.textAlign='center';g.textBaseline='middle';g.direction='ltr';g.lineJoin='round';
  g.font='900 '+Math.round(pw*.26)+'px Heebo, Arial';g.lineWidth=26;g.strokeStyle='#14141c';g.strokeText(big[0],pw*.5,ph*.36);g.fillStyle=__CK.a;g.fillText(big[0],pw*.5,ph*.36);g.lineWidth=5;g.strokeStyle='#f4f1ff';g.strokeText(big[0],pw*.5-4,ph*.36-4);
  g.font='900 '+Math.round(pw*.13)+'px Heebo, Arial';g.lineWidth=16;g.strokeStyle='#14141c';g.strokeText(big[1],pw*.5,ph*.62);g.fillStyle='#f4f1ff';g.fillText(big[1],pw*.5,ph*.62);
  g.fillStyle='rgba(224,36,58,.85)';for(i=0;i<26;i++)g.fillRect(pw*.2+rnd()*pw*.6,ph*.4,3,rr(20,110));
  g.font='bold 54px Heebo, Arial';g.fillStyle='#f4f1ff';g.lineWidth=8;g.strokeStyle='#14141c';g.strokeText(o.tag||__CK.CITY,pw*.5,ph*.8);g.fillText(o.tag||__CK.CITY,pw*.5,ph*.8);
  g.strokeStyle='#4a6aff';g.lineWidth=10;g.beginPath();g.moveTo(pw*.1,ph*.12);g.bezierCurveTo(pw*.3,ph*.02,pw*.45,ph*.2,pw*.6,ph*.1);g.stroke();
  for(i=0;i<9;i++){var sx=rnd()*pw,sy=ph*.85+rnd()*ph*.14,sc=pick([__CK.a,'#f4f1ff','#14141c','#2a4a8a'],rnd());g.fillStyle=sc;c.rrect(g,sx,sy,60,30,6);g.fill();g.fillStyle=sc==='#f4f1ff'?'#14141c':'#f4f1ff';g.font='bold 16px Arial';g.fillText(pick(['ULTRAS','1923','TLV','W.A.'],rnd()),sx+30,sy+16)}
  var d=g.getImageData(0,0,pw,ph),p=d.data;for(i=0;i<p.length;i+=4){var n=(rnd()-.5)*14;p[i]+=n;p[i+1]+=n;p[i+2]+=n}g.putImageData(d,0,0);return c.tex(cv,1,1)};
 K.ball=function(x,z,r,y){r=r||.11;var cv=c.cvs(128,64),g=cv.getContext('2d');g.fillStyle='#f4f1ff';g.fillRect(0,0,128,64);g.fillStyle='#14141c';for(var i=0;i<8;i++){g.beginPath();g.arc(8+i*16,16+(i%2)*28,6.5,0,7);g.fill()}var bm=mesh(new T.SphereGeometry(r,16,12),std('#fff',{map:c.tex(cv,1,1),roughness:.5}),x,y==null?r:y,z,W);bm.userData.noBlock=1;(window.__props=window.__props||[]).push({m:bm,kind:'ball'});return bm};
 /* pennant bunting */
 K.rope=function(x0,y0,x1,y1,z,sag,col,seg){seg=seg||20;var pts=[];for(var i=0;i<=seg;i++){var t=i/seg;pts.push([x0+(x1-x0)*t,y0+(y1-y0)*t-Math.sin(t*Math.PI)*sag])}for(i=0;i<seg;i++){var a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);var cy=new T.Mesh(new T.CylinderGeometry(.012,.012,L,3),new T.MeshBasicMaterial({color:col||'#14141c'}));cy.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,z);cy.rotation.z=-Math.atan2(b[0]-a[0],b[1]-a[1]);W.add(cy)}return pts};
 K.bunting=function(x0,y0,x1,y1,z,sag,cols,n){n=n||14;cols=cols||[__CK.a,'#f4f1ff'];sag=sag||.35;K.rope(x0,y0,x1,y1,z,sag);for(var i=0;i<=n;i++){var t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t-Math.sin(t*Math.PI)*sag;var tri=new T.Mesh(new T.CircleGeometry(.17,3),new T.MeshStandardMaterial({color:cols[i%cols.length],roughness:.9,side:T.DoubleSide}));tri.rotation.z=Math.PI/2*3;tri.position.set(x,y-.14,z);tri.castShadow=true;W.add(tri)}};
 return K}

/* ======================= STREET ======================= */
RM.def('street',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rbox=c.rbox,rnd=c.rnd,rr=c.rr,tm=c.o.time||'night',day=tm==='day';
 K.env(day?'day':'night',{ext:15});
 var FZ=1.0;
 K.ground(70,36,c.asphalt(),0,0,0,6,12,.34,.12);
 K.pave(-5,17,FZ,3.9,.16,K.paver('#8c8890','#5a5660',5,2,6));K.curb(-5,17,3.92,.2);
 /* lane markings */
 for(var i=0;i<6;i++)K.flat(-3+i*3.4,-1.8+i*3.4,8.7,8.84,.012,new T.MeshBasicMaterial({color:'#9a98a4'}));
 K.flat(-5,17,4.0,4.25,.013,new T.MeshBasicMaterial({color:'#7a1a28'}));
 /* buildings along the back */
 var b0=K.bld(-1.8,5.2,10.5,FZ,{base:'#6a7a8c',cols:2,balc:true,litP:.5});
 var bH=K.bld(2.5,3.9,11,FZ,{map:c.brick(10,2,3.4),cols:2,rows:2,litP:.6,pipe:-1.8,acs:2});
 var bK=K.bld(5.9,3.0,9,FZ,{base:'#8a7a80',cols:2,rows:2,base0:3.6,litP:.5,shut:true});
 var bG=K.bld(8.0,1.7,9.5,FZ,{base:'#7a8286',cols:1,rows:2,base0:3.4,litP:.6,balc:true});
 var bW=K.bld(9.65,1.6,10.5,FZ,{base:'#6e6e7a',cols:1,rows:2,base0:4.2,litP:.3});
 var bS=K.bld(12.2,3.2,9,FZ,{base:'#6a6a7a',cols:2,rows:2,base0:3.4,litP:.4,acs:2});
 K.bld(15,3,10,FZ,{base:'#7a7a8a',cols:1,rows:2,balc:true});
 K.cityDepth(-4.4,16.5,FZ);K.wires([-7,4.45,10.55,19],FZ+.4);
 /* the real graffiti wall: lower storey of bW is covered by painted wall */
 var gw=K.plane(1.62,3.6,new T.MeshStandardMaterial({map:K.graf(1.62,3.6,{words:[__CK.SHORT,'ULTRAS']}),roughness:.9}),9.65,1.8,FZ+.012);
 /* ===== home entrance x=1.92 ===== */
 K.box(1.9,3.1,.28,'#2a2a34',1.92,1.55,FZ+.14);K.box(1.5,2.7,.2,'#1a1218',1.92,1.35,FZ+.3);
 var dm=new T.MeshStandardMaterial({color:'#7a1c2c',roughness:.55});K.plane(1.2,2.45,dm,1.92,1.27,FZ+.42);K.plane(.5,.9,new T.MeshStandardMaterial({color:'#ffb48a',emissive:'#ffa070',emissiveIntensity:1.2}),1.92,1.9,FZ+.43);
 K.box(.07,.2,.07,'#c8c8d0',2.35,1.15,FZ+.5);
 K.box(2.1,.2,.7,'#8a8690',1.92,.1,FZ+.55);K.box(1.8,.2,.5,'#9a96a0',1.92,.3,FZ+.35);
 K.sign('12','#14141c','#ff9a8a',.45,.3,2.95,2.2,FZ+.02,null,{pw:128});
 /* mailboxes */
 for(i=0;i<4;i++)K.box(.22,.28,.12,i%2?'#4a5a8a':'#8a2a3a',.85+i*.25,1.25,FZ+.08);
 K.box(.3,.3,.3,'#fff2e0',1.92,3.0,FZ+.4,null,{emissive:'#ffb48a',emissiveIntensity:1.4});K.glow(1.92,3.0,FZ+.7,'#ffb48a',3.2,3.2,.6);
 var dl=c.light('point','#ffb070',1.0,1.9,2.6,FZ+1.6,7);
 /* ===== kiosk x 4.5..7.1 ===== */
 var kx=5.8;K.box(2.8,.5,.05,'#14141c',kx,.25,1.9);
 /* front face with a real hatch hole: x kx+-1.15, y .95..2.25 */
 var FF=FZ+1.05;K.box(2.9,.95,.1,'#3a3e4e',kx,.475,FF);K.box(2.9,.7,.1,'#3a3e4e',kx,2.6,FF);K.box(.4,1.35,.1,'#3a3e4e',kx-1.25,1.6,FF);K.box(.4,1.35,.1,'#3a3e4e',kx+1.25,1.6,FF);
 K.plane(2.3,1.3,new T.MeshStandardMaterial({color:'#e8c8b0',emissive:'#ff9a6a',emissiveIntensity:.5,roughness:.8}),kx,1.6,FZ+.12);
 K.box(.06,1.4,.06,'#14141c',kx-1.15,1.6,FF+.04);K.box(.06,1.4,.06,'#14141c',kx+1.15,1.6,FF+.04);K.box(2.4,.08,.08,'#14141c',kx,2.27,FF+.04);
 /* interior shelves with snacks, magazines */
 for(var s=0;s<2;s++){K.box(2.2,.04,.3,'#6a4a4a',kx,1.55+s*.5,FZ+.5);for(var q=0;q<10;q++)K.box(.17,.26,.1,[__CK.a,'#f4f1ff','#2a6aff','#ff6a5a','#3a8a5a','#e0e0ee'][q%6],kx-1.0+q*.22,1.72+s*.5,FZ+.5)}
 /* fridge */
 K.box(.5,1.0,.3,'#cfe0ff',kx+.85,1.0,FZ+.45,null,{emissive:'#5a8aff',emissiveIntensity:.7});
 /* counter + hanging rack */
 K.box(2.9,.1,.6,'#4a4a56',kx,.98,FF+.3);
 for(q=0;q<6;q++)K.box(.22,.1,.14,[__CK.a,'#f4f1ff','#2a6aff','#ff7a5a'][q%4],kx-1.1+q*.4,1.07,FF+.3);
 /* mags side rack */
 for(q=0;q<8;q++)K.box(.16,.24,.02,[__CK.a,'#f4f1ff','#2a4a8a','#e07a8a','#3a7a5a'][q%5],kx+1.5+(q%2)*.18,1.0+Math.floor(q/2)*.3,FZ+1.1,null);
 /* striped awning */
 var aw=new T.Mesh(new T.BoxGeometry(3.2,.06,1.5),new T.MeshStandardMaterial({map:c.stripes(__CK.a,'#f4f1ff',8),roughness:.9}));aw.position.set(kx,2.8,FZ+1.55);aw.rotation.x=.2;aw.castShadow=true;W.add(aw);
 K.box(3.2,.22,.05,__CK.a,kx,2.62,FZ+2.28);
 K.neon(__CK.KIOSK,'#ff4a64',2.3,.6,kx,3.45,FZ+1.2,null,{back:'#0c0c14',font:'bold 110px'});
 K.box(3.2,.2,1.3,'#2a2e3a',kx,3.0,FZ+.65);
 /* bulbs under awning */
 for(i=0;i<5;i++){var bl=new T.Mesh(new T.SphereGeometry(.06,8,6),new T.MeshBasicMaterial({color:'#ffe6cf'}));bl.position.set(kx-1.2+i*.6,2.2+Math.sin(i)*.03,FZ+1.9);W.add(bl);K.glow(kx-1.2+i*.6,2.2,FZ+1.95,'#ffb48a',.9,.9,.5)}
 c.light('point','#ffb070',2.2,kx,2.0,FZ+2.0,7.5);
 /* newspaper stand + crates */
 K.box(.8,1.1,.5,'#3a3e4e',7.3,.55,2.05);for(q=0;q<3;q++)K.box(.72,.28,.04,['#e8e4ee',__CK.a,'#c8d0e0'][q],7.3,.55+q*.3,2.3);
 for(i=0;i<3;i++){K.box(.55,.34,.4,'#8a5a3a',6.8+(i%2)*.1,.17+Math.floor(i/2)*.36,2.35+(i%2)*.0)}K.box(.5,.2,.3,__CK.a,6.8,.7,2.35,null);
 /* ===== grocery x 7.2-8.8 ===== */
 K.shop(8.05,1.45,FZ+.02,{h:2.5,sign:'Grocery',signBg:'#14202a',signFg:'#8ae0ff',signEm:'#2a8aff',shelves:true,awning:['#2a4a8a','#f4f1ff'],door:false,glowCol:'#cfe0ff',glass:'#e0eaff'});
 for(i=0;i<3;i++){K.box(.5,.3,.34,'#7a5a3a',7.6+i*.45,.15,1.9);K.box(.46,.14,.3,['#d8483a','#3a8a4a','#c8c8d8'][i],7.6+i*.45,.38,1.9)}
 /* ===== shutter shop x 10.6..12 ===== */
 K.box(2.4,3.0,.2,'#2a2e3a',11.0,1.5,FZ+.1);K.plane(2.2,2.8,new T.MeshStandardMaterial({map:c.rollerShutter(),roughness:.6,metalness:.3}),11.0,1.45,FZ+.22);
 K.neon('Closed','#ff4a64',.9,.4,11.0,3.25,FZ+.3,null,{back:'#0c0c14',font:'bold 90px'});
 /* bin + dumpster */
 c.dumpster(11.8,1.7,-.1);
 /* pennant bunting over the street, lamp posts */
 K.lamp(-.2,3.95,1,true);K.lamp(11.8,3.95,-1,false);
 K.bunting(-.2,5.9,6,5.5,FZ+1.9,.5,null,16);K.bunting(6,5.5,11.8,5.9,FZ+1.9,.5,null,16);
 /* flag banner from window */
 K.cloth(__CK.SHORT,__CK.a,'#f4f1ff',1.6,1.0,.6,6.8,FZ+.3,null,0,{stripe:'#f4f1ff'});
 K.cloth(__CK.City,'#14141c',__CK.a,1.4,.8,12.0,6.4,FZ+.3,null,0);
 /* car at kerb, wet reflections */
 K.car(12.4,5.0,0,'#2a3450',.9);K.car(-1.2,5.6,Math.PI,'#5a1a2a',.9);
 K.puddle(5.2,3.6,1.8,.6);K.puddle(8.5,3.5,1.2,.4);K.puddle(2.6,7.4,2.2,.8);K.puddle(10,8,2.2,.7);
 K.streak(kx,3.6,'#ff6a5a',2.4,1.6,.3);K.streak(2.2,3.0,'#ffb48a',1.4,2.2,.28);K.streak(11,3.6,'#ff4a64',1,1.2,.15);
 if(!day)K.rain(-3,15,-.5,12,520,.2,9);
 /* ===== people ===== */
 var old=K.p(kx,1.55,0,'talk',{skin:SK1(),top:'#5a6a7a',jacket:'#3a4258',bot:'#2a2e3a',hair:'#9a9aa2',style:'short',glasses:true,w:1.2,s:1.05,stubble:true});
 var kid=K.p(6.55,2.65,Math.PI*.92,'idle',{s:.72,top:__CK.a,bot:'#2a3a6a',hair:'#2a1d16',style:'short',w:.95,stubble:false,skin:'#e0a982'});
 K.ball(6.9,2.9,.11);
 K.p(9.2,1.55,.3,'lean',{top:'#14141c',jacket:__CK.a,bot:'#1c2030',style:'buzz',scarf:[__CK.a,'#f4f1ff'],beanie:'#14141c',w:1.15,s:1.1,stubble:true,skin:'#c68863'});
 K.p(3.7,2.7,.9,'talk',{top:'#f4f1ff',jacket:'#2a2e3a',bot:'#14141c',style:'slick',w:1.12,scarf:[__CK.a,'#f4f1ff'],skin:'#f1c7a5',look:.2});
 K.p(4.35,2.7,-.9,'listen',{top:__CK.a,bot:'#2a2e3a',style:'curly',w:1.08,skin:'#6b4430',look:-.2,earring:true});
 var wk=K.p(2,3.2,0,'walk',{top:'#3a4a6a',jacket:'#1c2030',bot:'#14141c',style:'long',w:.95,bag:__CK.a,skin:'#e0a982',path:[[.4,3.3],[11.6,3.2]],spd:.9,s:1.0,stubble:false});
 K.p(10.8,2.4,0.2,'idle',{top:'#2a2e3a',jacket:'#14141c',bot:__CK.a,style:'spiky',w:1.1,skin:'#f1c7a5',stubble:true,s:1.08,cap:'#14141c'});
 K.cam(11.9,3.0,{y:3.8,ly:3.0});
}});
function SK1(){return SKN[1]}

/* ======================= PITCH (day) ======================= */
RM.def('pitch',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'day',night=tm==='night';
 K.env(night?'dusk':'day',{ext:14,fn:30,ff:100});
 /* yard surface: scuffed concrete with chalk */
 var cv=c.cvs(1024,512),g=cv.getContext('2d');g.fillStyle='#8a8280';g.fillRect(0,0,1024,512);c.paint(g,1024,512,1400,function(){return rnd()<.5?'#9a9290':'#767070'},.1);
 for(var i=0;i<40;i++){g.strokeStyle='rgba(40,36,40,.35)';g.lineWidth=1.5;g.beginPath();var x=rnd()*1024,y=rnd()*512;g.moveTo(x,y);for(var k=0;k<5;k++){x+=rr(-30,30);y+=rr(-20,20);g.lineTo(x,y)}g.stroke()}
 for(i=0;i<9;i++){g.fillStyle='rgba(60,56,60,.25)';g.beginPath();g.ellipse(rnd()*1024,rnd()*512,rr(20,70),rr(8,24),rnd(),0,7);g.fill()}
 g.strokeStyle='rgba(244,241,255,.85)';g.lineWidth=5;g.setLineDash([26,9]);g.strokeRect(70,44,880,430);g.beginPath();g.moveTo(512,44);g.lineTo(512,474);g.stroke();g.beginPath();g.arc(512,259,70,0,7);g.stroke();g.setLineDash([]);g.strokeRect(70,174,120,170);
 K.ground(60,26,c.tex(cv,2.6,1.4),0,0,0,5.6,8.5,.9,0);
 K.flat(0,0,0,0,0,new T.MeshBasicMaterial());
 /* back wall: ground floor of the apartment block, painted goal */
 var FZ=1.5;
 var wm=c.wall('#a8a0a8',['#98909a','#b8b0b8','#8a828c'],4,1);
 K.box(13,2.8,.5,'#fff',5.6,1.4,FZ-.2,null,{map:wm});
 K.plane(2.6,1.9,new T.MeshStandardMaterial({map:(function(){var q=c.cvs(256,180),h=q.getContext('2d');h.fillStyle='rgba(0,0,0,0)';h.strokeStyle='#f4f1ff';h.lineWidth=9;h.strokeRect(8,8,240,160);h.lineWidth=2;for(var j=1;j<10;j++){h.beginPath();h.moveTo(8+j*24,8);h.lineTo(8+j*24,168);h.stroke()}return c.tex(q,1,1)})(),transparent:true,roughness:.9}),2.5,1.05,FZ+.07);
 K.plane(1.6,1.3,new T.MeshStandardMaterial({map:K.graf(1.6,1.3,{words:[__CK.SHORT,'1923'],tag:'Neighbourhood'}),roughness:.9}),6.6,1.5,FZ+.07);
 /* apartment blocks above / behind */
 K.bld(-1.5,5,13,FZ-.4,{base:'#b0a4b0',cols:2,rows:3,base0:2.8,balc:true,litP:.4,shut:true,acs:3,sill:'#8a8490'});
 K.bld(3,4.2,12,FZ-.4,{base:'#9aa4b4',cols:2,rows:3,base0:2.8,balc:true,litP:.3,acs:2,shut:true});
 K.bld(7.5,5,13.5,FZ-.4,{base:'#a89aa4',cols:2,rows:3,base0:2.8,balc:true,litP:.3,shut:true,acs:3});
 K.bld(12.5,4.6,12,FZ-.4,{map:c.brick(8,2,4),cols:2,rows:3,base0:2.8,litP:.3,acs:2});K.cityDepth(-4.0,14.8,FZ);
 K.laundry(2.2,6.2,6.0,6.4,FZ-.1,6);K.laundry(7.4,8.3,11.2,8.1,FZ-.1,5);
 /* wire fence on the left + at the back top of the wall, street gate at right */
 K.fence(-.4,-.4+.01,2.0,3,0);
 var fl=K.fence(0,4.6,-1,3.4,Math.PI/2);fl.position.set(.1,0,1.8);
 K.box(.12,3.1,.12,'#4a4a56',11.4,1.55,2.6);K.box(.12,3.1,.12,'#4a4a56',11.4,1.55,4.6);K.sign('The Neighbourhood Pitch','#14141c','#ff8a9a',1.4,.4,11.4,3.0,3.6,null,{pw:512}).rotation.y=-Math.PI/2;
 /* makeshift pipe goal, side-on at right-middle */
 var gx=9.0,gz0=2.7,gz1=4.9;[gz0,gz1].forEach(function(z){K.box(.1,1.8,.1,'#e8e4ee',gx,.9,z,null,{metalness:.4})});K.box(.1,.1,gz1-gz0,'#e8e4ee',gx,1.8,(gz0+gz1)/2,null,{metalness:.4});
 var nm=new T.MeshStandardMaterial({map:(function(){var q=c.cvs(128,128),h=q.getContext('2d');h.strokeStyle='rgba(240,240,250,.8)';h.lineWidth=2;for(var j=0;j<=128;j+=16){h.beginPath();h.moveTo(j,0);h.lineTo(j,128);h.stroke();h.beginPath();h.moveTo(0,j);h.lineTo(128,j);h.stroke()}return c.tex(q,5,4)})(),transparent:true,side:T.DoubleSide,depthWrite:false,roughness:1});
 var net=new T.Mesh(new T.PlaneGeometry(gz1-gz0,1.8),nm);net.rotation.y=Math.PI/2;net.position.set(gx+.7,.9,(gz0+gz1)/2);W.add(net);
 /* jackets + bag as goalposts, left */
 [[2.6,2.3],[3.5,2.3]].forEach(function(p,i){K.box(.55,.22,.4,i?__CK.a:'#2a3a6a',p[0],.11,p[1])});K.box(.4,.3,.25,'#14141c',3.05,.15,2.5);
 /* crates + tyre + bin */
 K.crate(.7,2.6,'#6a3a30');K.crate(.7,2.6,'#6a3a30',.34);c.dumpster(10.2,1.6,.2);
 var tyre=mesh(new T.TorusGeometry(.32,.12,8,16),std('#1a1a20'),10.5,.44,2.0,W);
 
 /* ball + dribbling kid */
 var ball=K.ball(4.4,4.6,.11);ball.userData.noKick=1;
 var dr=K.p(3,4.4,1.4,'walk',{top:__CK.a,bot:'#2a2e3a',style:'short',s:.9,w:1,path:[[1.6,4.5],[7.4,4.0]],spd:1.7,stubble:false,skin:'#c68863',shoe:'#f4f1ff'});dr.userData.o._d=1.2;
 c.tick(function(t){var p=dr.position,a=dr.rotation.y;var k=(dr.userData.o._d%(2*dr.userData.o._len))>dr.userData.o._len?-1:1;var bx=p.x+Math.sin(a)*.55,bz=p.z+Math.cos(a)*.55;ball.position.set(bx,.11+Math.abs(Math.sin(t*5))*.1,bz);ball.rotation.z-=.2});
 K.p(6.0,4.4,-.2,'talk',{top:'#f4f1ff',jacket:__CK.a,bot:'#14141c',style:'slick',s:1.12,w:1.1,scarf:[__CK.a,'#f4f1ff'],skin:'#e0a982',look:.3});
 K.p(6.7,2.8,-.5,'lean',{top:'#2a3a6a',bot:'#14141c',style:'curly',s:1.0,w:1,skin:'#6b4430',look:.5,stubble:false});
 K.p(4.2,3.4,.6,'cheer',{top:__CK.a,bot:'#2a2e3a',style:'spiky',s:.85,w:1,skin:'#f1c7a5',stubble:false});
 K.p(2.0,3.6,-.3,'idle',{top:'#14141c',bot:__CK.a,style:'buzz',s:.95,w:1.05,skin:'#8d5a3e',stubble:false});
 var el=K.p(9.9,2.4,-.3,'sit',{top:'#6a6a7a',jacket:'#3a3e52',bot:'#2a2e3a',style:'short',hair:'#aaaab0',glasses:true,s:1.05,w:1.18,skin:'#e0a982',stubble:true,cap:'#2a2e3a'});
 K.box(.55,.45,.45,'#7a5a3a',9.9,.22,2.15);
 if(night){K.lamp(1.2,5.2,1,true);K.rain&&0}
 K.cam(11.2,3.4,{y:3.2,ly:1.3,fov:40});
}});

/* ======================= ROUTE (dusk) ======================= */
RM.def('route',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'dusk';
 K.env(tm==='day'?'day':'dusk',{ext:16,fn:18,ff:80});
 var FZ=.8,WID=12.8;
 K.ground(80,34,c.asphalt(),0,0,0,6,12,.45,.08);
 K.pave(-6,20,FZ,3.4,.16,K.paver('#8a8690','#555060',6,2.4,6));K.curb(-6,20,3.42,.2);
 for(var i=0;i<7;i++)K.flat(-3+i*3.4,-1.9+i*3.4,8.2,8.34,.012,new T.MeshBasicMaterial({color:'#9a98a4'}));
 /* long run of facades, receding heights; far glow of the ground at right */
 var cols=['#7a7a8c','#9a8088','#6a7e8c','#8a7a90'];
 K.bld(-2,4.4,9,FZ,{base:cols[0],cols:2,rows:2,base0:3.2,balc:true,litP:.5,acs:2});
 K.bld(2.2,4.2,10.5,FZ,{map:c.brick(6,2,3.4),cols:2,rows:3,base0:2.8,litP:.5});
 K.bld(6.4,4.2,8,FZ,{base:cols[2],cols:2,rows:2,base0:3.2,litP:.5,shut:true});
 K.bld(10.6,4.2,6.2,FZ,{base:cols[3],cols:2,rows:2,base0:3.2,balc:true,litP:.4,acs:2});
 K.bld(14.6,4.2,5.4,FZ,{base:cols[1],cols:2,rows:2,base0:3.2,litP:.4});K.cityDepth(-4.2,16.7,FZ);
 /* shopfronts */
 K.shop(2.4,2.8,FZ+.02,{h:2.4,sign:'Stand Café',signBg:'#14141c',signFg:'#ff8a9a',signEm:'#ff2a4a',shelves:true,awning:[__CK.a,'#f4f1ff'],door:true});
 K.shop(10.4,2.6,FZ+.02,{h:2.4,sign:'Sport',signBg:'#0c1224',signFg:'#8ab0ff',signEm:'#2a6aff',awning:['#2a4a8a','#f4f1ff'],glass:'#cfe0ff',glowCol:'#8ab0ff'});
 /* scarf seller stall, x~6.5 */
 var sx=6.5;K.box(2.6,.8,.9,'#2a2e3a',sx,.4,2.1);K.box(2.8,.06,1.0,'#4a4a56',sx,.82,2.1);
 K.box(.08,2.6,.08,'#2a2e3a',sx-1.3,1.3,1.7);K.box(.08,2.6,.08,'#2a2e3a',sx+1.3,1.3,1.7);K.box(2.9,.08,1.2,__CK.a,sx,2.6,1.9);
 K.neon('Scarves','#ff5a70',2.0,.5,sx,2.95,2.45,null,{back:'#0c0c14',font:'bold 110px'});
 for(i=0;i<7;i++){K.cloth('',__CK.a,'#f4f1ff',.34,1.1,sx-1.05+i*.35,1.9,2.0,null,0,{stripe:i%2?'#14141c':'#f4f1ff'})}
 for(i=0;i<6;i++)K.box(.4,.2,.3,[__CK.a,'#f4f1ff','#14141c'][i%3],sx-1+i*.4,.93,2.2);
 c.light('point','#ff9a74',1.6,sx,2.3,2.6,7);K.glow(sx,2.0,2.4,'#ffb48a',3.5,3,.35);
 /* banners across street from poles, text only */
 [[1.2,__CK.SHORT,__CK.a,'#f4f1ff'],[8.6,'ULTRAS',__CK.a,'#14141c']].forEach(function(b,i){var bn=c.banner(b[0],3.7,1.9,1.2,b[1],b[2],b[3])});
 K.lamp(4.0,3.7,1,false);K.lamp(12.6,3.7,-1,false);
 K.bunting(-.5,5.7,12.8,5.6,2.6,.55,null,26);
 /* stadium floodlights glowing in the far east */
 for(i=0;i<3;i++){var tx=14+i*3.4,tw=new T.Group();tw.position.set(tx,0,-6);W.add(tw);mesh(new T.CylinderGeometry(.25,.4,17,8),std('#2a2e3a'),0,8.5,0,tw);K.box(4,2.2,.4,'#1a1e28',0,17,0,tw);for(var q=0;q<10;q++){var bl=new T.Mesh(new T.CircleGeometry(.24,10),new T.MeshBasicMaterial({color:'#e8f0ff'}));bl.position.set(-1.6+(q%5)*.8,17.4-Math.floor(q/5)*.9,.22);tw.add(bl)}K.glow(0,17,1,'#bcd4ff',24,15,.8,tw)}
 K.glow(14,5,-3,'#ff7a8a',18,9,.45);K.glow(15,6.4,-5,'#ffd0e0',14,6,.5);
 /* flares on the right */
 c.flare(9.0,2.2,2.2);
 /* crowd walking east (one way) */
 var T1=[[__CK.a,'#14141c'],['#f4f1ff','#2a2e3a'],['#14141c',__CK.a],[__CK.a,'#2a2e3a'],['#2a2e3a','#f4f1ff']],styles=['buzz','short','bald','spiky','curly','slick'];
 for(i=0;i<9;i++){var z=1.75+(i%4)*.3+rr(-.1,.1),w=K.p(0,z,0,'walk',{top:T1[i%5][0],bot:T1[i%5][1],jacket:i%3?null:'#14141c',scarf:i%2?[__CK.a,'#f4f1ff']:null,style:styles[i%6],stubble:i%2==0,skin:SKN[i%5],path:[[-16,z],[34,z]],spd:1.0+(i%3)*.2,s:1.08,beanie:i%4==1?'#14141c':null,w:1.1});w.userData.o._d=15+i*2.4}
 /* some standing / singing */
 K.p(8.3,2.5,-.4,'sing',{top:'#f4f1ff',jacket:__CK.a,bot:'#14141c',style:'spiky',scarf:[__CK.a,'#f4f1ff'],skin:'#e0a982',s:1.12,w:1.15});
 K.p(11.2,2.6,.3,'flare',{top:'#14141c',bot:'#2a2e3a',style:'bald',stubble:true,skin:'#c68863',s:1.12,w:1.2,tat:true});
 K.p(6.5,1.5,0,'talk',{top:'#3a3e52',jacket:'#14141c',bot:'#14141c',style:'short',skin:'#e0a982',s:1.0,w:1.1,apron:__CK.a,look:.1});
 K.p(5.3,3.0,.6,'cheer',{top:__CK.a,bot:'#2a2e3a',style:'curly',skin:'#6b4430',s:.9,w:1});
 K.puddle(4.6,3.9,2,.7);K.puddle(9,4.2,1.8,.6);K.streak(sx,3.6,'#ff6a5a',2.6,1.8,.3);K.streak(11,3.2,'#ff2a3a',1.6,2,.25);
 K.cam(WID,2.4,{y:3.4,ly:3.1});
}});

/* ======================= BUS-STOP (night, rain) ======================= */
RM.def('bus-stop',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'night',day=tm==='day';
 K.env(day?'day':'night',{ext:13});var FZ=1.2,WID=9.6;
 K.ground(60,34,c.asphalt(),0,0,0,5,12,.32,.12);
 K.pave(-5,15,FZ,4.0,.16,K.paver('#7e7a84','#4a4654',5,2,6));K.curb(-5,15,4.02,.2);
 K.flat(-5,15,4.1,4.35,.013,new T.MeshBasicMaterial({color:'#7a1a28'}));
 for(var i=0;i<6;i++)K.flat(-3+i*3.4,-1.8+i*3.4,8.0,8.14,.012,new T.MeshBasicMaterial({color:'#8a88a0'}));
 /* backdrop: pharmacy corner (left), billboard wall (right) */
 K.bld(-.8,5.2,9.5,FZ,{base:'#6a7686',cols:2,rows:2,base0:3.6,litP:.5,balc:true,acs:2});
 K.shop(1.2,3.2,FZ+.02,{h:2.5,sign:'Pharmacy',signBg:'#08241a',signFg:'#7affc0',signEm:'#2aff9a',glass:'#d8fff0',glowCol:'#7affc0',shelves:true,shelfCols:['#f4f1ff','#7affc0','#e0e0ee',__CK.a]});
 K.bld(3.3,3,8.6,FZ,{base:'#6a7a8c',cols:1,rows:2,base0:3.6,litP:.6});K.bld(7.4,5.4,8.2,FZ,{base:'#7a6a7c',cols:2,rows:2,base0:3.6,litP:.4,shut:true});
 K.bld(12.2,4,9,FZ,{map:c.brick(8,2,3),cols:2,rows:2,base0:3.6,litP:.4});K.cityDepth(-3.4,14.2,FZ);
 K.plane(3.4,1.9,new T.MeshStandardMaterial({map:K.graf(3.4,1.9,{words:[__CK.City,'ULTRAS'],tag:__CK.SHORT}),roughness:.9}),8.2,2.0,FZ+.01);
 /* ===== shelter ===== */
 var sx=5.0;K.box(3.4,.12,1.6,'#2a2e3a',sx,3.0,2.4);K.box(.08,3.0,.08,'#2a2e3a',sx-1.6,1.5,1.7);K.box(.08,3.0,.08,'#2a2e3a',sx+1.6,1.5,1.7);K.box(.08,3.0,.08,'#2a2e3a',sx-1.6,1.5,3.1);K.box(.08,3.0,.08,'#2a2e3a',sx+1.6,1.5,3.1);
 K.plane(3.1,2.6,new T.MeshStandardMaterial({color:'#8ab0d0',transparent:true,opacity:.14,roughness:.1,side:T.DoubleSide,depthWrite:false}),sx,1.6,1.68);
 K.plane(3.1,2.6,new T.MeshStandardMaterial({color:'#8ab0d0',transparent:true,opacity:.1,roughness:.1,side:T.DoubleSide,depthWrite:false}),sx,1.6,3.1);
 /* lit ad panel (text only) */
 K.box(1.2,1.9,.12,'#14141c',sx+.9,1.5,1.62);K.plane(1.04,1.7,new T.MeshBasicMaterial({map:(function(){var q=c.cvs(256,420),h=q.getContext('2d');h.fillStyle=__CK.a;h.fillRect(0,0,256,420);h.fillStyle='#f4f1ff';h.font='900 78px Heebo, Arial';h.textAlign='center';h.direction='ltr';h.fillText('Tonight',128,130);h.fillText(('At '+__CK.Ground),128,220);h.fillStyle='#14141c';h.fillRect(0,260,256,12);h.fillStyle='#f4f1ff';h.font='bold 46px Heebo, Arial';h.fillText('Line 5 · 20:30',128,340);return c.tex(q,1,1)})()}),sx+.9,1.5,1.69);K.glow(sx+.9,1.5,1.9,'#ff5a70',3.4,3.6,.35);
 K.box(.5,.04,.5,'#e8f0ff',sx-.5,2.9,2.3,null,{emissive:'#cfe0ff',emissiveIntensity:1.6});K.glow(sx-.5,2.8,2.3,'#cfe0ff',3.5,3,.4);c.light('point','#cfe0ff',1.0,sx-.5,2.6,2.4,6);
 K.bench(sx-.5,2.35,1.7,0);
 /* stop sign pole */
 K.box(.07,3.2,.07,'#3a3e48',1.2,1.6,3.3);K.sign('5','#2a4a8a','#f4f1ff',.6,.6,1.2,3.1,3.35,null,{pw:128,font:'bold 90px'});K.sign('Stadium','#14141c','#ff8a9a',.9,.32,1.2,2.6,3.35,null,{pw:384,font:'bold 64px'});
 K.lamp(.2,4.4,1,true);K.lamp(9.6,4.4,-1,false);
 /* bin, flyers, puddles */
 K.box(.5,.9,.5,'#2a4a3a',8.9,.45,1.7);K.puddle(3.3,3.5,1.6,.5);K.puddle(7.4,3.7,1.8,.6);K.puddle(4.5,6.6,3,1);K.puddle(8,9,3,1);
 K.streak(1.4,3.4,'#ff9a64',1.4,2,.25);
 if(!day)K.rain(-3,13,-.5,12,520,.22,9);
 /* passing bus on the far lane */
 var bus=K.bus(-10,6.6,8.8,'Stadium',null,{dx:1.9,num:'5'});c.tick(function(t){bus.position.x=((t*2.6+4)%34)-12});
 /* people */
 K.p(2.6,2.9,.5,'idle',{top:'#14141c',jacket:__CK.a,bot:'#14141c',style:'short',beanie:'#14141c',scarf:[__CK.a,'#f4f1ff'],skin:'#e0a982',s:1.08,w:1.12});
 K.p(4.4,2.4,0,'sit',{top:'#3a4a6a',jacket:'#1c2030',bot:'#14141c',style:'long',bag:__CK.a,skin:'#c68863',s:1.0,w:.95,stubble:false});
 K.p(5.6,2.5,-.3,'listen',{top:'#f4f1ff',jacket:'#2a2e3a',bot:'#14141c',style:'curly',skin:'#6b4430',s:1.08,w:1.1,look:.3});
 K.p(8.2,2.9,-.3,'lean',{top:'#2a2e3a',jacket:'#14141c',bot:'#2a2e3a',style:'bald',stubble:true,skin:'#f1c7a5',s:1.12,w:1.15,cap:null});
 K.cam(WID,3.0,{y:3.4,ly:2.2});
}});

/* ======================= BUS-STATION (night platform) ======================= */
RM.def('bus-station',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rbox=c.rbox,rnd=c.rnd,rr=c.rr,tm=c.o.time||'night',day=tm==='day';
 K.env(day?'day':'night',{ext:14,fog:'#1a1c36',fn:12,ff:55});var WID=11.7;
 K.ground(70,30,c.asphalt(),0,0,0,5.8,8,.4,.1);
 K.pave(-3,15,-1,3.7,.2,K.paver('#7a7886','#46424f',6,2,6));K.curb(-3,15,3.72,.2);
 for(var i=0;i<6;i++)K.flat(-2.5+i*2.4,-1.5+i*2.4,3.74,3.95,.012,new T.MeshBasicMaterial({color:'#f4f1ff'}));
 /* station building back wall, concrete w/ big text */
 K.box(20,7.5,.6,'#fff',5.8,3.75,-1.8,null,{map:c.concrete('#5a5a68',6,2.5)});
 K.neon('Central Station','#ff4a64',4.2,.9,2.4,6.1,-1.45,null,{back:'#0c0c14',font:'bold 130px'});
 K.neon(__CK.CITY,'#8ab0ff',2.6,.5,9.4,6.0,-1.45,null,{back:'#0c0c14',font:'bold 90px',dir:'ltr'});
 /* bus bays: bus 1 lit with open door, bus 2 dark */
 c.light('point','#ff9a74',1.0,5.2,2.6,1.6,7);var b1=K.bus(5.0,-.15,9.2,'Stadium',null,{dx:.5,num:'5'});
 var b2=K.bus(14.6,-.15,9.2,'Out of Service','#3a3a4e',{dx:-2,lit:false,led:'#ff4a3a',num:'0'});
 /* canopy */
 K.box(14,.2,5.4,'#1a1c28',5.8,4.5,.8);K.box(14,.4,.2,__CK.a,5.8,4.3,3.5);
 [1.6,5.4,9.4,13.0].forEach(function(x){K.box(.28,4.4,.28,'#4a4a58',x,2.2,2.0,null,{metalness:.4});K.box(.5,.2,.5,'#2a2e3a',x,.1,2.0)});
 for(i=0;i<5;i++){var fx=.2+i*3,sr=K.box(2.2,.07,.22,'#f0f6ff',fx,4.35,2.4,null,{emissive:'#dfeaff',emissiveIntensity:2});K.glow(fx,4.1,2.4,'#cfe0ff',4,3,.4)}
 c.light('point','#cfe0ff',1.5,2.2,3.9,2.4,9);c.light('point','#cfe0ff',1.4,8.2,3.9,2.4,9);
 /* departures board */
 K.box(2.6,1.0,.12,'#08080e',5.9,3.75,1.8);K.neon((__CK.GROUND+'  '+__CK.n2),'#ff6a4a',2.4,.34,5.9,3.95,1.88,null,{font:'bold 52px',halo:.15});K.neon('20:30  ·  Platform 2','#ff6a4a',2.4,.34,5.9,3.55,1.88,null,{font:'bold 52px',halo:.15});
 /* pillar poster + benches + bin */
 K.cloth(('Today at '+__CK.Ground),__CK.a,'#f4f1ff',.9,1.5,1.58,2.0,2.2,null,0,{font:'900 86px'});
 K.bench(7.6,2.4,1.9,0,'#4a4a58');K.bench(10.6,2.2,1.9,0,'#4a4a58');K.box(.45,.85,.45,'#2a4a3a',11.4,.5,1.2);
 for(i=0;i<4;i++)K.puddle(1.8+i*2.8,2.6+(i%2)*.5,1.6,.5);K.streak(2.2,2.8,'#cfe0ff',3,2,.2);K.streak(8.2,2.8,'#cfe0ff',3,2,.2);
 K.lamp(-.4,4.8,1,false);
 if(!day)K.rain(-3,15,-1,8,420,.2,6);
 /* people */
 K.p(6.4,1.8,0,'talk',{top:'#2a4a8a',jacket:'#1c2a5a',bot:'#14141c',style:'short',skin:'#e0a982',s:1.08,w:1.2,cap:'#1c2a5a',stubble:true});
 K.p(5.7,2.0,.5,'listen',{top:__CK.a,jacket:'#14141c',bot:'#2a2e3a',style:'buzz',scarf:[__CK.a,'#f4f1ff'],skin:'#c68863',s:1.1,w:1.1,look:-.4});
 K.p(4.0,2.5,.5,'lean',{top:'#14141c',bot:'#2a2e3a',style:'curly',skin:'#6b4430',s:1.0,w:1,pack:__CK.a});
 K.p(8.0,2.4,0,'sit',{top:'#f4f1ff',jacket:__CK.a,bot:'#14141c',style:'slick',skin:'#f1c7a5',s:1.05,w:1.1,stubble:true});
 K.p(10.2,2.0,-.3,'idle',{top:'#3a3e52',jacket:'#14141c',bot:'#14141c',style:'long',skin:'#e0a982',s:1.0,w:.95,stubble:false,bag:__CK.a});
 K.p(2.0,2.5,.4,'walk',{top:__CK.a,bot:'#14141c',style:'spiky',skin:'#8d5a3e',s:1.08,w:1.1,path:[[.3,2.9],[11.4,2.8]],spd:.9,jacket:'#14141c'});
 K.cam(WID,2.6,{y:3.2,ly:2.4});
}});

function bulbs(K,c,x0,y0,x1,y1,z,sag,n,col){var W=c.world,T=THREE;var pts=K.rope(x0,y0,x1,y1,z,sag,'#14141c');for(var i=1;i<n;i++){var t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t-Math.sin(t*Math.PI)*sag;var b=new T.Mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:'#fff0e0'}));b.position.set(x,y-.08,z);W.add(b);K.glow(x,y-.08,z+.05,col||'#ffb48a',.8,.8,.55)}}


function bauhaus(K,c,x,w,h,zf,o){o=o||{};var T=THREE,rnd=c.rnd,W=c.world;var G=K.bld(x,w,h,zf,{base:o.base||'#e8e4ee',tones:['#d8d4e0','#f4f0f8','#cac6d4'],cols:0,rows:0,cornice:'#f4f0f8',base0:3.6});var fz=G.userData.fz;var floors=Math.floor((h-3.6)/2.7);
 for(var r=0;r<floors;r++){var y=4.2+r*2.7;
  var lit=rnd()<.75,col=['#ffb48a','#ffe6cf','#ff9a74','#cfe0ff'][Math.floor(rnd()*4)];
  K.plane(w*.8,1.0,new T.MeshStandardMaterial({color:lit?col:'#2a3450',emissive:lit?col:'#1a2238',emissiveIntensity:lit?1.0:.5,roughness:.2}),0,y,fz+.03,G);
  for(var m=0;m<7;m++)K.box(.05,1.05,.06,'#3a3a48',-w*.4+m*w*.8/6,y,fz+.06,G);
  K.box(w*.86,.12,.7,'#f8f4fc',0,y+.62,fz+.34,G);K.box(w*.86,.4,.04,'#e0dce8',0,y-.85,fz+.6,G);
  if(o.drum&&r>=0){var dm=new T.Mesh(new T.CylinderGeometry(1.0,1.0,.16,22,1,false,-Math.PI/2,Math.PI),c.std('#f4f0f8',{roughness:.85}));dm.scale.set(1.5,1,1.0);dm.position.set(-w/2+1.5,y-.65,fz+.02);G.add(dm);var rl=new T.Mesh(new T.CylinderGeometry(1.0,1.0,.55,22,1,true,-Math.PI/2,Math.PI),new T.MeshStandardMaterial({color:'#e8e4ee',side:T.DoubleSide,roughness:.8}));rl.scale.set(1.5,1,1.0);rl.position.set(-w/2+1.5,y-.4,fz+.02);G.add(rl)}
  }
 K.box(.9,h-3,.5,'#f4f0f8',w/2-.7,3+(h-3)/2,fz+.2,G);for(r=0;r<floors*2;r++)K.plane(.34,.5,new T.MeshStandardMaterial({color:'#ffe6cf',emissive:'#ffb48a',emissiveIntensity:.8}),w/2-.7,4+r*1.35,fz+.46,G);
 K.box(w+.2,.08,1.4,'#f4f0f8',0,h+.35,fz-.2,G);for(r=0;r<10;r++)K.box(.04,.7,.04,'#2a2e3a',-w/2+r*w/9,h+.7,fz+.4,G);
 return G}

/* ======================= DRIVE-IN (dusk) ======================= */
RM.def('drive-in',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'dusk';
 K.env(tm==='night'?'night':'dusk',{ext:16,fn:30,ff:110,fog:'#3a2a50'});
 /* lot */
 var cv=c.cvs(512,512),g=cv.getContext('2d');g.fillStyle='#34343e';g.fillRect(0,0,512,512);c.paint(g,512,512,1200,function(){return rnd()<.5?'#2a2a34':'#44444e'},.3);g.strokeStyle='rgba(230,226,240,.55)';g.lineWidth=4;for(var i=0;i<=8;i++){g.beginPath();g.moveTo(i*64,60);g.lineTo(i*64,200);g.stroke()}
 K.ground(60,40,c.tex(cv,5,3),0,0,0,6,6,.55,.05);
 /* far grass bank + dusk treeline */
 K.box(60,.6,10,'#2a4a38',6,.3,-9,null,{roughness:1});for(i=0;i<14;i++)K.tree(-8+i*3.6,-10-rnd()*3,4+rnd()*2.5,'#1a3a2c',1.4);
 /* the screen */
 var sx=6.0,sz=-5.2;
 [-3.9,3.9].forEach(function(dx){K.box(.35,7.4,.35,'#2a2e3a',sx+dx,3.7,sz-.4);K.box(.2,6.5,.8,'#2a2e3a',sx+dx*.9,3.2,sz-1.2,null,{metalness:.3}).rotation.x=.15});
 K.box(8.6,4.9,.4,'#1a1c28',sx,4.7,sz-.2);K.box(8.9,.2,.6,'#2a2e3a',sx,7.25,sz);
 var sc2=c.cvs(512,288),q=sc2.getContext('2d');var gr=q.createLinearGradient(0,0,0,288);gr.addColorStop(0,'#1a2a6a');gr.addColorStop(.45,'#6a8ad0');gr.addColorStop(.46,'#2a8a4a');gr.addColorStop(1,'#145a2a');q.fillStyle=gr;q.fillRect(0,0,512,288);
 q.strokeStyle='rgba(255,255,255,.7)';q.lineWidth=3;q.beginPath();q.moveTo(0,200);q.lineTo(512,200);q.moveTo(256,132);q.lineTo(256,288);q.stroke();q.beginPath();q.ellipse(256,215,70,22,0,0,7);q.stroke();
 for(i=0;i<60;i++){q.fillStyle=pick([__CK.a,'#f4f1ff','#2a4a8a','#14141c'],rnd());q.fillRect(rnd()*512,126+rnd()*8,3,6)}
 q.fillStyle='rgba(0,0,0,.45)';q.fillRect(0,0,512,70);q.fillStyle='#f4f1ff';q.font='900 54px Heebo, Arial';q.textAlign='center';q.direction='ltr';q.fillText('Cup Final · 1986',256,52);q.fillStyle=__CK.a;c.rrect(q,20,236,90,34,8);q.fill();q.fillStyle='#fff';q.font='bold 24px Arial';q.direction='ltr';q.fillText('LIVE',65,261);
 [[140,176,__CK.a],[196,188,'#f4f1ff'],[330,182,__CK.a],[388,170,'#2a4a8a'],[256,206,'#14141c']].forEach(function(p){q.fillStyle=p[2];q.beginPath();q.arc(p[0],p[1]-14,7,0,7);q.fill();q.fillRect(p[0]-7,p[1]-8,14,26);q.fillRect(p[0]-7,p[1]+18,5,16);q.fillRect(p[0]+2,p[1]+18,5,16)});
 q.fillStyle='#fff';q.beginPath();q.arc(300,230,6,0,7);q.fill();
 var scrM=new T.MeshBasicMaterial({map:c.tex(sc2,1,1),fog:false});var scr=K.plane(8.2,4.6,scrM,sx,4.7,sz+.02);K.glow(sx,4.7,sz+1,'#8ab0ff',16,10,.5);
 var sl=c.light('point','#8ab0ff',1.5,sx,3.8,sz+4,13);c.tick(function(t){sl.intensity=1.4+Math.sin(t*3.1)*.2+(Math.sin(t*7)>.9?.4:0);scrM.color.setRGB(1,1,1).multiplyScalar(.92+Math.sin(t*9)*.05)});
 /* speaker posts + cars (rears to camera, facing the screen) */
 for(i=0;i<6;i++){var px=.8+i*2.2;K.box(.07,1.4,.07,'#3a3e48',px,.7,2.3);K.box(.34,.26,.2,'#2a2e3a',px+.2,1.2,2.3);K.plane(.24,.16,new T.MeshBasicMaterial({color:'#14141c'}),px+.2,1.2,2.41);K.box(.04,.04,.4,'#14141c',px+.1,.9,2.45)}
 var cars=[[1.5,.6,'#6a1a2a'],[4.7,.9,'#2a3450'],[8.0,.7,'#3a3a46'],[11.2,1.0,'#7a2a3a']];cars.forEach(function(p){K.car(p[0],p[1],Math.PI/2,p[2],.95)});
 K.car(-.6,5.2,Math.PI*.46,'#2a2e3a',.95);
 /* snack booth, right */
 var bx=10.9,bz=2.1;K.box(2.6,2.7,2.0,'#3a3e52',bx,1.35,bz);K.box(2.8,.2,2.2,__CK.a,bx,2.8,bz);K.plane(1.7,1.0,new T.MeshStandardMaterial({color:'#ffe0c8',emissive:'#ff9a6a',emissiveIntensity:.9}),bx-.2,1.5,bz+1.02);K.box(1.9,.1,.5,'#6a4a4a',bx-.2,1.0,bz+1.2);
 var aw=new T.Mesh(new T.BoxGeometry(2.7,.06,.9),new T.MeshStandardMaterial({map:c.stripes(__CK.a,'#f4f1ff',8),roughness:.9}));aw.position.set(bx-.2,2.4,bz+1.35);aw.rotation.x=.25;W.add(aw);
 K.neon('Popcorn','#ff4a64',2.0,.5,bx,3.35,bz+.9,null,{back:'#0c0c14',font:'bold 100px'});c.light('point','#ffa070',1.4,bx-.2,2.0,bz+2,6);
 bulbs(K,c,bx-1.2,2.8,2.4,2.6,2.6,.5,12);bulbs(K,c,2.4,2.6,-.8,2.9,2.4,.4,6);
 /* chairs + people */
 function chair(x,z,ry){var gg=new T.Group();gg.position.set(x,0,z);gg.rotation.y=ry||0;W.add(gg);K.box(.5,.05,.45,'#3a4a8a',0,.45,0,gg);K.box(.5,.45,.05,'#3a4a8a',0,.7,-.22,gg);[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]].forEach(function(p){K.box(.03,.45,.03,'#aaaab8',p[0],.22,p[1],gg)})}
 chair(2.9,2.9,Math.PI);chair(3.7,2.95,Math.PI);
 K.p(2.9,2.9,Math.PI,'sit',{top:__CK.a,jacket:'#14141c',bot:'#14141c',style:'short',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],s:1.05});
 K.p(3.7,2.95,Math.PI+.2,'sit',{top:'#f4f1ff',bot:'#2a3a6a',style:'long',skin:'#c68863',s:.98,w:.95,stubble:false});
 K.p(6.3,2.7,Math.PI*.9,'cheer',{top:__CK.a,bot:'#14141c',style:'spiky',skin:'#6b4430',s:.8,w:1,stubble:false});
 K.p(7.5,3.0,Math.PI,'lean',{top:'#14141c',jacket:__CK.a,bot:'#2a2e3a',style:'buzz',skin:'#f1c7a5',scarf:[__CK.a,'#f4f1ff'],s:1.1,w:1.15,stubble:true,beanie:'#14141c'});
 K.p(8.6,3.1,Math.PI*1.1,'talk',{top:'#3a3e52',jacket:'#1c2030',bot:'#14141c',style:'slick',skin:'#e0a982',s:1.08,w:1.1});
 K.p(9.6,3.0,-.2,'listen',{top:'#e08a9a',bot:'#2a3a6a',style:'bun',skin:'#f1c7a5',s:1.0,w:.92,stubble:false,look:.5});
 K.p(10.2,4.0,.1,'walk',{top:__CK.a,bot:'#2a2e3a',style:'curly',skin:'#8d5a3e',s:1.05,w:1,path:[[.5,4.1],[11.5,3.9]],spd:.8});
 K.cam(12,3.0,{y:2.3,ly:3.4,fov:44,fovP:68,d:10.5});
}});

/* ======================= ALLENBY (night, Mediterranean downtown) ======================= */
RM.def('allenby',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'night',day=tm==='day';
 K.env(day?'day':'night',{ext:15,sun:'#ffa07a'});var FZ=1.0;
 K.ground(70,36,c.asphalt(),0,0,0,6,12,.34,.12);
 K.pave(-6,18,FZ,3.9,.16,K.paver('#8e8a96','#585462',5,2,6));K.curb(-6,18,3.92,.2);
 K.flat(-6,18,3.99,4.2,.013,new T.MeshBasicMaterial({color:'#8a8896'}));
 /* white Bauhaus left + right, ribbon windows, curved balconies */
 bauhaus(K,c,-1.4,5.6,11,FZ,{drum:true});
 var w2=K.bld(3.4,4.2,8.4,FZ,{base:'#8a8ca8',cols:2,rows:2,base0:3.6,litP:.5,balc:true,shut:true,sill:'#cfcad8'});
 bauhaus(K,c,8.0,4.8,10.5,FZ,{base:'#e0dce8'});
 var w4=K.bld(12.9,5.0,11,FZ,{base:'#9aa0b4',cols:2,rows:3,base0:3.4,litP:.5,acs:2,balc:true});
 K.shop(1.4,3.0,FZ+.02,{h:2.7,sign:'Allenby Salon',signBg:'#14141c',signFg:'#ff9ab0',signEm:'#ff4a8a',glass:'#ffe6f0',glowCol:'#ff9ab0',shelves:true,shelfCols:['#f4f1ff',__CK.a,'#ff9ab0','#cfe0ff'],door:true});
 K.shop(4.7,2.6,FZ+.02,{h:2.6,sign:'Swimwear',signBg:'#08142a',signFg:'#8ae0ff',signEm:'#2a8aff',awning:['#2a4a8a','#f4f1ff'],glass:'#cfe0ff',glowCol:'#8ab0ff',shelves:true,shelfCols:['#ff6a8a','#2a8aff','#f4f1ff','#8ae0ff',__CK.a]});
 /* cafe terrace */
 K.neon('Café Landwer','#ff6a5a',2.8,.7,8.0,3.1,FZ+.12,null,{back:'#14141c',font:'bold 100px'});
 K.shop(8.0,3.6,FZ+.02,{h:2.4,glass:'#ffe6cf',glowCol:'#ffb48a',shelves:true,awning:[__CK.a,'#f4f1ff'],door:true,sign:null});
 for(var i=0;i<3;i++){var tx=7.0+i*1.6,tz=2.3+(i%2)*.5;var tb=mesh(new T.CylinderGeometry(.4,.4,.05,16),std('#e8e4ee'),tx,.78,tz,W);K.box(.06,.78,.06,'#2a2e3a',tx,.39,tz);K.box(.03,2.3,.03,'#2a2e3a',tx,1.5,tz,null);var um=new T.Mesh(new T.ConeGeometry(1.1,.5,12),new T.MeshStandardMaterial({color:i%2?__CK.a:'#f4f1ff',roughness:.9}));um.position.set(tx,2.45,tz);um.castShadow=true;W.add(um);K.glow(tx,2.1,tz,'#ffb48a',1.6,1.6,.35)}
 /* plane tree, lamp posts, scooters */
 K.tree(12.2,1.7,5.6,'#2a4a38',1.2);K.lamp(.2,3.8,1,false);K.lamp(10.0,3.8,-1,false);
 [[10.4,3.3],[11.0,3.5]].forEach(function(p,j){var g2=new T.Group();g2.position.set(p[0],0,p[1]);g2.rotation.y=.2+j;W.add(g2);K.box(1.1,.16,.28,__CK.a,0,.4,0,g2);K.box(.2,.7,.3,'#14141c',.4,.7,0,g2);K.box(.5,.1,.3,'#14141c',-.3,.6,0,g2);var wh=mesh(new T.CylinderGeometry(.22,.22,.1,12),std('#14141a'),.5,.22,0,g2);wh.rotation.x=Math.PI/2;wh=mesh(new T.CylinderGeometry(.22,.22,.1,12),std('#14141a'),-.5,.22,0,g2);wh.rotation.x=Math.PI/2});
 K.puddle(5.5,3.7,1.8,.5);K.streak(1.4,3.5,'#ff9ab0',3,1.6,.28);K.streak(8,3.4,'#ffb48a',3.4,1.6,.28);
 K.bunting(-.4,5.4,6,5.1,FZ+2.6,.5,['#f4f1ff',__CK.a],16);
 K.cloth(__CK.SHORT,__CK.a,'#f4f1ff',1.3,.8,12.0,5.6,FZ+.9,null,0);
 /* people: tel-aviv evening */
 K.p(6.0,3.0,.5,'talk',{top:'#f4f1ff',jacket:__CK.a,bot:'#14141c',style:'slick',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],s:1.1,w:1.12,look:.3});
 K.p(6.9,3.0,-.5,'listen',{top:'#2a3a6a',bot:'#d8d0e0',style:'bun',skin:'#c68863',s:1.0,w:.92,stubble:false,look:-.2});
 K.p(7.6,2.6,0,'sit',{top:'#3a3e52',bot:'#14141c',style:'curly',skin:'#6b4430',s:1.0,w:1});K.box(.5,.45,.4,'#3a3a46',7.6,.22,2.55);
 K.p(2.2,2.5,.3,'lean',{top:'#14141c',bot:'#2a2e3a',style:'buzz',skin:'#f1c7a5',stubble:true,s:1.1,w:1.1,earring:true});
 K.p(0.8,3.1,0,'walk',{top:'#e08a9a',bot:'#14141c',style:'long',skin:'#e0a982',bag:__CK.a,s:1.0,w:.92,stubble:false,path:[[.3,3.2],[11.4,3.0]],spd:.8});
 K.p(10.2,2.4,-.4,'idle',{top:__CK.a,bot:'#2a2e3a',style:'spiky',skin:'#8d5a3e',s:1.08,w:1.1,stubble:true});
 K.cam(11.9,3.0,{y:3.7,ly:3.1});
}});

/* ======================= HATIKVA (market, night) ======================= */
RM.def('hatikva',{kind:'street',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'night',day=tm==='day';
 K.env(day?'day':'night',{ext:15,sun:'#ff8a6a'});var FZ=.9;
 K.ground(70,36,c.asphalt(),0,0,0,6,12,.45,.08);
 K.pave(-6,18,FZ,4.4,.14,K.paver('#7a7480','#464050',6,2,7));K.curb(-6,18,4.42,.18);
 /* low buildings with shutters */
 K.bld(-1.2,5,8,FZ,{base:'#8a6a70',cols:2,rows:2,base0:3.2,litP:.5,balc:true,acs:1,shut:true});
 K.bld(3.8,5,9.4,FZ,{map:c.brick(6,2,3),cols:2,rows:2,base0:3.2,litP:.5,shut:true});
 K.bld(8.8,5,8.4,FZ,{base:'#6a7a8c',cols:2,rows:2,base0:3.2,litP:.5,balc:true});
 K.bld(13.6,4.8,9.4,FZ,{base:'#8a7a90',cols:2,rows:2,base0:3.2,litP:.4,acs:2});K.cityDepth(-3.7,16.0,FZ);
 /* big fan wall mural between shops */
 K.plane(2.2,2.8,new T.MeshStandardMaterial({map:K.graf(2.2,2.8,{words:[__CK.SHORT,'Hope'],tag:'From the Neighbourhood'}),roughness:.9}),6.35,1.5,FZ+.015);
 /* stalls: x centres, awning colour pairs, produce colours */
 var stalls=[[1.0,'#2a4a8a','Fresh Vegetables'],[3.7,__CK.a,'Fruit'],[9.0,'#2a8a6a','Spices'],[11.6,'#8a2a6a','Nuts']];
 var prod=[[__CK.a,'#3a8a4a','#7a2a5a'],[__CK.a,'#8a2a4a','#3a8a4a'],['#8a4a5a',__CK.a,'#3a6a3a'],['#aa7a8a','#8a5a4a','#5a3a4a']];
 stalls.forEach(function(s,si){var x=s[0],col=s[1];
  K.box(.08,2.5,.08,'#2a2e3a',x-1.1,1.25,2.9);K.box(.08,2.5,.08,'#2a2e3a',x+1.1,1.25,2.9);K.box(.08,2.2,.08,'#2a2e3a',x-1.1,1.1,1.5);K.box(.08,2.2,.08,'#2a2e3a',x+1.1,1.1,1.5);
  var am=new T.MeshStandardMaterial({map:c.stripes(col,'#f4f1ff',7),roughness:.9,side:T.DoubleSide});var aw=new T.Mesh(new T.BoxGeometry(2.5,.05,1.6),am);aw.position.set(x,2.5,2.2);aw.rotation.x=.14;aw.castShadow=true;W.add(aw);K.box(2.5,.2,.04,col,x,2.34,3.04);
  K.box(2.2,.55,1.0,'#7a5a52',x,.28,2.3);K.box(2.2,.05,1.1,'#8a6a62',x,.58,2.3);
  for(var k=0;k<2;k++)for(var q=0;q<8;q++){var pc=prod[si][(q+k)%3];var pb=mesh(new T.SphereGeometry(.14,8,6),std(pc,{roughness:.6,emissive:pc,emissiveIntensity:.35}),x-.9+q*.26,.78+k*.14,1.9+k*.35,W);pb.scale.y=.85}
  K.box(2.2,.4,.04,'#14141c',x,.82,2.7);
  K.sign(s[2],'#14141c','#ff9ab0',1.5,.4,x,2.1,2.98,null,{pw:384});
  for(var b=0;b<4;b++){var bl=new T.Mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:'#fff0e0'}));bl.position.set(x-.8+b*.55,2.25,2.7);W.add(bl);K.glow(x-.8+b*.55,2.25,2.75,'#ffb48a',1,1,.5)}
  (si%2==0)&&c.light('point','#ffa070',1.3,x,2.0,2.6,6)});
 /* crates stacked beside stalls */
 [[2.3,2.3],[6.9,2.2],[7.6,2.4],[10.3,2.3]].forEach(function(p,i){K.crate(p[0],p[1],i%2?'#7a4a3a':'#6a5a4a');if(i%2==0)K.crate(p[0],p[1],'#8a5a3a',.32)});
 K.box(.5,.5,.5,__CK.a,2.3,.82,2.3);
 bulbs(K,c,-.4,4.8,12.8,4.9,3.6,.7,28);bulbs(K,c,-.4,5.3,12.8,5.4,2.0,.6,28,'#ff9ab0');
 K.cloth('HaTikva Market','#14141c','#ff6a7a',2.6,.6,5.4,5.3,FZ+.3,null,0,{font:'900 100px'});
 K.laundry(.2,5.6,3.6,5.8,FZ+.5,5);K.laundry(9,6.2,12.5,5.9,FZ+.5,5);
 K.lamp(-.1,4.8,1,true);K.lamp(12.4,4.8,-1,false);
 K.puddle(6.4,3.7,2,.6);K.puddle(10.3,3.9,1.8,.5);K.streak(3.7,3.6,'#ff9a74',3,1.8,.3);K.streak(9,3.6,'#ff9a74',3,1.8,.3);
 /* people */
 K.p(1.0,1.9,0,'talk',{top:'#f4f1ff',apron:'#2a4a8a',bot:'#14141c',style:'short',skin:'#c68863',s:1.08,w:1.15,stubble:true});
 K.p(3.7,1.8,0,'arrange',{top:'#6a6a7a',apron:__CK.a,bot:'#2a2e3a',style:'curly',skin:'#e0a982',s:1.05,w:1.2,glasses:true});
 K.p(9.0,1.8,.1,'talk',{top:'#8a2a4a',apron:'#f4f1ff',bot:'#14141c',style:'bald',skin:'#8d5a3e',s:1.1,w:1.2,stubble:true,look:.2});
 K.p(5.2,3.2,.4,'idle',{top:'#14141c',jacket:__CK.a,bot:'#14141c',style:'spiky',skin:'#f1c7a5',scarf:[__CK.a,'#f4f1ff'],s:1.1,w:1.12,stubble:true,bag:'#2a2e3a'});
 K.p(6.6,3.3,-.4,'listen',{top:'#e08a9a',bot:'#2a3a6a',style:'long',skin:'#e0a982',s:1.0,w:.9,stubble:false,bag:__CK.a});
 var kd=K.p(7.6,3.7,.3,'idle',{top:__CK.a,bot:'#2a3a6a',style:'short',skin:'#6b4430',s:.72,w:.95,stubble:false});K.ball(7.9,3.8,.11);
 K.p(0.5,3.4,0,'walk',{top:'#3a4a6a',bot:'#14141c',style:'slick',skin:'#c68863',s:1.05,w:1.1,path:[[.3,3.4],[11.8,3.5]],spd:.7,jacket:'#2a2e3a'});
 K.p(11.0,3.1,-.5,'lean',{top:'#14141c',bot:__CK.a,style:'buzz',skin:'#f1c7a5',stubble:true,s:1.1,w:1.1,cap:'#14141c'});
 if(!day)K.rain(-3,15,-.5,10,300,.15,8);
 K.cam(11.9,3.0,{y:3.7,ly:3.1});
}});

function cat(K,c,x,y,z,ry){var W=c.world,T=THREE,g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry||0;W.add(g);var m=c.std('#2a2630',{roughness:.9});c.mesh(c.capsule(.09,.22,8),m,0,.17,0,g).rotation.x=Math.PI/2.4;c.mesh(new T.SphereGeometry(.08,10,8),m,0,.3,.14,g);[-1,1].forEach(function(s){var e=c.mesh(new T.ConeGeometry(.03,.07,4),m,s*.045,.37,.14,g)});c.mesh(c.capsule(.025,.3,6),m,0,.1,-.2,g).rotation.x=1.3;[-1,1].forEach(function(s){c.mesh(new T.SphereGeometry(.012,6,5),new T.MeshBasicMaterial({color:'#ffb48a'}),s*.03,.32,.215,g)});return g}
function stairs(K,x0,z,w,n,rise,run,dir,col){for(var i=0;i<n;i++)K.box(run,rise*(i+1),w,col||'#8a8490',x0+dir*(i*run+run/2),rise*(i+1)/2,z)}

/* ======================= JAFFA (dusk, old stone port quarter) ======================= */
RM.def('jaffa',{kind:'city',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'dusk';
 K.env(tm==='night'?'night':'dusk',{ext:15,fn:22,ff:100,fog:'#4a3458'});c.light('dir','#ff8a6a',1.0,12,4,-12);
 var FZ=1.0,ST=K.stone(1,1);
 K.ground(70,40,c.cobble(),0,0,0,6,10,.6,.05);
 K.sea(-30,40,-80,-2.5,-.4,'#6a4a7a','#3a3466','#ff9a7a',.62);K.glow(8,.2,-30,'#ff8a6a',50,6,.55);
 /* parapet along the view gap */
 K.box(6,.9,.5,'#8a8490',7.8,.45,-.6);
 /* left: tall stone house with arched windows + passage */
 var L=K.bld(-1.2,6.4,10.5,FZ,{map:K.stone(2.2,3.2),cols:0,rows:0,cornice:'#7a7480'});
 for(var r=0;r<3;r++)[-2.2,-.5,1.2,2.6].forEach(function(dx,k){if(r===0&&k===2)return;K.arch(-1.2+dx,3.6+r*2.7,FZ+.02,.9,1.7,{lit:rnd()<.55,col:pick(['#ffb48a','#ff9a74','#ffe6cf'],rnd()),frame:'#b4aeb8'});K.box(1.0,.1,.3,'#8a8490',-1.2+dx,3.5+r*2.7,FZ+.15);if(rnd()<.6){K.box(.45,1.5,.05,'#2a7a8a',-1.2+dx-.62,3.6+r*2.7+.8,FZ+.08);K.box(.45,1.5,.05,'#2a7a8a',-1.2+dx+.62,3.6+r*2.7+.8,FZ+.08)}});
 K.arch(1.0,0,FZ+.03,2.0,3.5,{lit:true,col:'#ff9a74',ei:.85,frame:'#b4aeb8'});K.neon('Sea Kiosk','#ff6a5a',1.8,.45,1.0,4.3,FZ+.12,null,{back:'#14141c',font:'bold 100px'});
 /* middle-right: arcade of three arches, shop recesses */
 var R=K.bld(12.3,6.6,9,FZ,{map:K.stone(2.2,2.6),cols:0,rows:0,cornice:'#7a7480'});
 [9.6,11.9,14.2].forEach(function(ax,k){K.arch(ax,0,FZ+.03,1.9,3.0,{lit:k!==1,col:k===0?'#ff9a74':'#cfe0ff',ei:.8,frame:'#b4aeb8'});K.box(.45,.3,.4,'#8a8490',ax-1.15,3.0,FZ+.2)});
 [[10.7,'#2a7a8a'],[13.0,'#8a2a3a']].forEach(function(p){K.arch(p[0],4.1,FZ+.02,.9,1.7,{lit:true,col:'#ffb48a',frame:'#b4aeb8'})});
 /* clock tower, far silhouette with lit face */
 var tw=new T.Group();tw.position.set(7.4,0,-12);W.add(tw);K.box(3,13,3,'#5a4a68',0,6.5,0,tw);K.box(3.5,.5,3.5,'#7a6a88',0,8.6,0,tw);K.box(2.3,3.2,2.3,'#5a4a68',0,10.4,0,tw);var ct=mesh(new T.ConeGeometry(1.7,2.6,4),std('#4a3a58'),0,13.3,0,tw);ct.rotation.y=Math.PI/4;
 var cf=c.cvs(128,128),q=cf.getContext('2d');q.fillStyle='#ffe6cf';q.beginPath();q.arc(64,64,60,0,7);q.fill();q.strokeStyle='#14141c';q.lineWidth=4;q.beginPath();q.arc(64,64,58,0,7);q.stroke();for(var i=0;i<12;i++){var a=i*Math.PI/6;q.beginPath();q.moveTo(64+Math.sin(a)*48,64-Math.cos(a)*48);q.lineTo(64+Math.sin(a)*56,64-Math.cos(a)*56);q.stroke()}q.lineWidth=6;q.beginPath();q.moveTo(64,64);q.lineTo(64,28);q.stroke();q.beginPath();q.moveTo(64,64);q.lineTo(88,74);q.stroke();
 K.plane(1.8,1.8,new T.MeshBasicMaterial({map:c.tex(cf,1,1),fog:false}),0,10.4,1.16,tw);K.glow(0,10.4,1.6,'#ffb48a',7,7,.5,tw);
 /* hanging lanterns across the street */
 bulbs(K,c,-3.8,6.2,4.2,6.6,FZ+1.6,.7,10,'#ff9a74');bulbs(K,c,4.2,6.6,9.2,6.0,FZ+1.6,.5,7,'#ff9a74');bulbs(K,c,8.6,5.6,16,6.2,FZ+1.6,.6,10,'#ff9a74');
 /* flags & banner from balcony */
 K.cloth(__CK.SHORT,__CK.a,'#f4f1ff',1.3,.8,11.0,5.6,FZ+.2,null,0,{stripe:'#f4f1ff'});
 /* props: planters w/ trees, steps, lamps */
 K.tree(5.2,1.8,3.4,'#2a5a3a',1.0);K.box(.7,.5,.7,'#8a4a3a',5.2,.25,1.8);K.tree(8.8,1.4,2.6,'#3a6a3a',.8);K.box(.6,.45,.6,'#6a4a5a',8.8,.22,1.4);
 K.lamp(.4,3.6,1,true);K.lamp(10.2,3.6,-1,false);
 stairs(K,2.8,1.9,1.6,3,.18,.4,1,'#9a94a0');
 K.puddle(4.6,3.2,1.8,.6);K.streak(2.2,3.2,'#ff9a74',3,2,.28);K.streak(10,3.4,'#ff9a74',3,2,.25);
 cat(K,c,3.9,.55,1.9,-.4);
 /* people */
 K.p(3.4,2.0,0,'sit',{top:__CK.a,jacket:'#14141c',bot:'#14141c',style:'buzz',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],s:1.05,w:1.1,stubble:true});K.box(.6,.35,.45,'#9a94a0',3.4,.17,2.0);
 K.p(6.4,2.8,.4,'talk',{top:'#f4f1ff',jacket:'#2a2e3a',bot:'#14141c',style:'slick',skin:'#c68863',s:1.1,w:1.12,look:.3});
 K.p(7.2,2.8,-.5,'listen',{top:'#e08a9a',bot:'#2a3a6a',style:'long',skin:'#e0a982',s:1.0,w:.92,stubble:false,look:-.3});
 K.p(11.0,2.3,-.3,'lean',{top:'#14141c',jacket:__CK.a,bot:'#2a2e3a',style:'curly',skin:'#6b4430',s:1.08,w:1.1,cap:'#14141c'});
 K.p(1.0,2.9,0,'walk',{top:'#3a4a6a',jacket:'#1c2030',bot:'#14141c',style:'short',skin:'#f1c7a5',s:1.05,w:1.0,path:[[.4,3.2],[11.6,3.0]],spd:.75,bag:__CK.a});
 K.cam(11.9,3.0,{y:3.6,ly:3.5,fov:40});
}});

/* ======================= JAFFA-ALLEY (night) ======================= */
RM.def('jaffa-alley',{kind:'city',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'night';
 K.env('night',{ext:14,fn:12,ff:55,fog:'#241e3a'});var FZ=1.0;
 K.ground(60,40,c.cobble(),0,0,0,6,10,.5,.05);
 /* back wall of stacked stone houses */
 var B=K.bld(5.8,16,12,FZ,{map:K.stone(5,3.4,52,6),cols:0,rows:0,cornice:'#5a5460'});
 /* windows + doors with lit warm light */
 for(var r=0;r<3;r++)for(var k=0;k<6;k++){if(r===0&&(k===1||k===3||k===5))continue;K.arch(-1.2+k*2.5+(r%2)*.6,2.6+r*2.9+(r===0?.9:0),FZ+.02,.85,1.5,{lit:rnd()<.5,col:pick(['#ffb48a','#ff9a74','#ffe6cf'],rnd()),frame:'#8a8490'});if(rnd()<.6){K.box(.4,1.4,.05,'#2a6a7a',-1.2+k*2.5+(r%2)*.6-.6,3.3+r*2.9+(r===0?.9:0),FZ+.06);K.box(.4,1.4,.05,'#2a6a7a',-1.2+k*2.5+(r%2)*.6+.6,3.3+r*2.9+(r===0?.9:0),FZ+.06)}}
 K.arch(2.2,0,FZ+.03,1.5,2.6,{lit:true,col:'#ff9a74',ei:1.0,frame:'#8a8490'});K.arch(7.8,0,FZ+.03,1.5,2.6,{lit:false,col:'#241a2c',frame:'#8a8490',door:'#5a3a3a'});K.arch(11.2,0,FZ+.03,1.3,2.4,{lit:true,col:'#cfe0ff',ei:.7,frame:'#8a8490'});
 /* staircase ascending left->right to a landing */
 var sx0=3.6;for(var i=0;i<9;i++)K.box(.5,.26*(i+1),1.0,'#7a7482',sx0+i*.5+.25,.13*(i+1),1.9);K.box(1.6,2.34,1.2,'#7a7482',sx0+4.5+.8,1.17,1.9);K.box(1.6,.1,.1,'#2a2e3a',sx0+4.5+.8,3.4,2.5);
 K.box(.05,1.0,.05,'#2a2e3a',sx0+4.5+.1,2.85,2.5);
 K.arch(sx0+4.5+.9,2.34,FZ+.03,1.2,2.2,{lit:true,col:'#ff9a74',ei:1.1,frame:'#8a8490'});
 /* arch bridge overhead + lamps */
 K.box(16,1.1,1.8,'#5a5460',5.8,7.2,FZ+1.2,null,{map:K.stone(4,.5)});K.box(15,.2,.5,'#3a3640',5.8,6.55,FZ+1.9);
 K.neon('Sea Alley','#ff6a5a',1.6,.4,2.2,3.7,FZ+.12,null,{back:'#14141c',font:'bold 100px'});
 /* lanterns on walls (real peach glow) */
 [[.6,2.6],[5.6,2.9],[9.6,2.6],[12.4,3.2]].forEach(function(p,i){var lb=new T.Mesh(new T.SphereGeometry(.14,10,8),new T.MeshBasicMaterial({color:'#ffe0c0'}));lb.position.set(p[0],p[1],FZ+.5);W.add(lb);K.box(.3,.06,.3,'#14141c',p[0],p[1]+.18,FZ+.5);K.glow(p[0],p[1],FZ+.7,'#ffb48a',3,3,.7);if(i%2==0)c.light('point','#ffa070',1.2,p[0],p[1]-.2,FZ+1.1,7)});
 /* laundry + hanging flags */
 K.laundry(.2,6.0,4.4,6.2,FZ+.9,6);K.laundry(6.4,6.1,12.6,5.8,FZ+.9,7);K.cloth(__CK.SHORT,__CK.a,'#f4f1ff',1.2,.7,8.9,5.1,FZ+.12,null,0,{stripe:'#f4f1ff'});
 /* props: bicycle, cans with plants, crates, bins, stencil */
 K.box(.5,.5,.5,'#4a4a56',1.6,.25,2.0);K.tree(1.6,2.0,1.4,'#2a5a3a',.45);[3.0,3.3].forEach(function(x){K.box(.26,.3,.26,'#8a4a3a',x,.15,1.4);K.tree(x,1.4,.9,'#3a7a4a',.25)});
 var bk=new T.Group();bk.position.set(10.6,0,2.0);W.add(bk);[-.45,.45].forEach(function(x){var w=mesh(new T.TorusGeometry(.33,.025,6,18),std('#14141c'),x,.36,0,bk)});K.box(1.0,.03,.03,__CK.a,0,.58,0,bk).rotation.z=.2;K.box(.04,.5,.04,'#14141c',.35,.65,0,bk);
 K.puddle(6,3.2,2.2,.7);K.puddle(10,3.5,1.6,.5);K.streak(5.6,3.2,'#ffb48a',2.6,2.2,.3);K.streak(12.4,3.2,'#cfe0ff',1.8,2,.22);K.streak(2.2,3.0,'#ff9a74',2,2,.3);
 cat(K,c,3.6+.5*5.5,.7,1.9,.3);
 K.plane(1.1,.5,new T.MeshStandardMaterial({map:K.graf(1.1,.5,{words:[__CK.SHORT,'TLV'],tag:''}),roughness:.9}),11.5,1.2,FZ+.01);
 K.rain(-3,15,-.5,10,260,.14,8);
 K.p(5.6,2.4,.3,'talk',{top:__CK.a,jacket:'#14141c',bot:'#14141c',style:'buzz',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],beanie:'#14141c',s:1.1,w:1.12,stubble:true,look:.2});
 K.p(6.4,2.5,-.5,'listen',{top:'#f4f1ff',jacket:'#2a2e3a',bot:'#14141c',style:'curly',skin:'#6b4430',s:1.08,w:1.1,look:-.3});
 K.p(8.0,2.2,0,'sit',{top:'#3a3e52',jacket:'#1c2030',bot:'#14141c',style:'short',skin:'#c68863',s:1.0,w:1.05});K.box(.5,.4,.45,'#7a7482',8.0,.2,2.05);
 K.p(1.8,2.8,0,'walk',{top:'#6a6a7a',bot:'#14141c',style:'bun',skin:'#f1c7a5',s:.98,w:.95,stubble:false,bag:__CK.a,path:[[.3,2.9],[11.8,3.1]],spd:.6,jacket:'#6a3a4a'});
 var kd=K.p(10.0,2.8,.3,'idle',{top:__CK.a,bot:'#2a3a6a',style:'short',skin:'#8d5a3e',s:.72,w:.95,stubble:false});K.ball(10.4,2.9,.11);
 K.cam(11.9,3.0,{y:3.3,ly:3.6,fov:40,fovP:62});
}});

/* ======================= JAFFA-BOULEVARD (dusk) ======================= */
RM.def('jaffa-boulevard',{kind:'city',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'dusk';
 K.env(tm==='night'?'night':'dusk',{ext:15,fn:24,ff:100,fog:'#4a3458'});var FZ=-.6;
 K.ground(70,40,c.asphalt(),0,0,0,6,10,.4,.08);
 K.pave(-6,18,-1,4.0,.16,K.paver('#8c8694','#585260',5,2,6));K.curb(-6,18,4.02,.2);
 K.flat(-6,18,-1,.3,.17,new T.MeshStandardMaterial({color:'#2a4a38',roughness:1}));
 /* pre-war stone houses behind, tiled roofs */
 [[-1.4,5.4,7.5],[4.2,5.6,8.8],[10.0,5.8,7],[15.6,5.6,8.4]].forEach(function(b,i){var G=K.bld(b[0],b[1],b[2],FZ,{map:K.stone(2,2.4,60,i%2?4:10),cols:0,rows:0,cornice:'#7a7480'});
  for(var r=0;r<2;r++)for(var k=0;k<3;k++)K.arch(b[0]-b[1]/2+.9+k*(b[1]-1.8)/2,2.4+r*2.9,FZ+.02,.85,1.6,{lit:rnd()<.5,col:pick(['#ffb48a','#ffe6cf','#ff9a74'],rnd()),frame:'#b4aeb8'});
  var rf=mesh(new T.ConeGeometry(b[1]*.78,1.6,4),std('#8a3a2c',{roughness:.9}),b[0],b[2]+.9,FZ-2.2,W);rf.rotation.y=Math.PI/4;rf.scale.z=.55});
 K.arch(1.6,0,FZ+.03,1.6,2.8,{lit:true,col:'#ff9a74',ei:.9,frame:'#b4aeb8'});K.neon('Café','#ff6a5a',1.5,.4,1.6,3.5,FZ+.12,null,{back:'#14141c',font:'bold 100px'});
 /* boulevard trees: big ficus with warm lamp light inside the canopy */
 [-.8,3.4,7.6,11.8].forEach(function(x,i){var t=K.tree(x,1.0,6.4,i%2?'#2a5a3a':'#245232',2.0);K.glow(x+rr(-.4,.4),4.4,1.6,'#ffb48a',3.6,3.6,.45);K.lamp(x+1.8,3.6,i%2?-1:1,i===1);K.box(.9,.4,.9,'#4a4a52',x,.2,1.0)});
 for(var i=0;i<4;i++)K.bench(1.8+i*3.8,2.0,1.5,0,'#4a3a3a');
 bulbs(K,c,-.8,5.4,12.6,5.0,1.4,.5,24,'#ff9a74');
 K.puddle(5.2,3.4,1.8,.6);K.puddle(9,5.5,2.2,.8);K.streak(2.4,3.6,'#ff9a74',3,2,.25);K.streak(8.6,3.6,'#ff9a74',3,2,.25);
 K.p(2.9,2.6,.2,'talk',{top:'#f4f1ff',jacket:__CK.a,bot:'#14141c',style:'slick',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],s:1.1,w:1.12,look:.3});
 K.p(3.7,2.6,-.5,'listen',{top:'#14141c',bot:'#2a2e3a',style:'curly',skin:'#6b4430',s:1.08,w:1.1,look:-.3});
 K.p(5.7,2.5,0,'sit',{top:'#6a3a4a',bot:'#14141c',style:'bun',skin:'#f1c7a5',s:1.0,w:.95,stubble:false});
 K.p(9.0,2.9,.4,'walk',{top:__CK.a,bot:'#14141c',style:'buzz',skin:'#c68863',s:1.08,w:1.1,path:[[.3,3.1],[11.8,2.9]],spd:.8,jacket:'#14141c'});
 var kd=K.p(10.2,3.0,-.3,'idle',{top:__CK.a,bot:'#2a3a6a',style:'short',skin:'#8d5a3e',s:.72,w:.95,stubble:false});K.ball(10.6,3.2,.11);
 K.cam(11.9,3.0,{y:3.5,ly:3.5,fov:40});
}});

/* ======================= PORT-EUROPE (dusk) ======================= */
RM.def('port-europe',{kind:'travel',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'dusk';
 K.env(tm==='night'?'night':'dusk',{ext:16,fn:20,ff:120,fog:'#3a3a5e'});c.light('dir','#ff8a7a',.8,10,5,-14);
 K.ground(60,26,c.cobble(),0,0,0,6,6,.5,.05);
 /* water beyond the quay edge */
 K.box(60,.5,.5,'#5a5a66',6,.0,-1.6);K.sea(-30,50,-90,-1.7,-.5,'#6a5a8a','#2a2e56','#ff8a8a',.55);
 /* ferry */
 var f=new T.Group();f.position.set(7.2,-.5,-7);W.add(f);K.box(17,3.6,5,'#8a90b0',0,1.8,0,f);K.box(17.2,.5,5.2,'#2a4a8a',0,.55,0,f);K.box(17,1.0,5.1,'#2a4a8a',0,3.6,0,f);
 for(var r=0;r<2;r++)for(var i=0;i<14;i++)K.plane(.7,.55,new T.MeshStandardMaterial({color:'#ffe6cf',emissive:'#ffa070',emissiveIntensity:rnd()<.75?.9:.15}),-7.6+i*1.17,2.3+r*1.3,2.54,f);
 K.box(14,2.2,3.6,'#b8bcd4',0,5.6,0,f);K.box(10,1.6,3.0,'#e8e4ee',-1,7.5,0,f);for(i=0;i<9;i++)K.plane(.8,.6,new T.MeshStandardMaterial({color:'#ffe6cf',emissive:'#ffa070',emissiveIntensity:.8}),-5.4+i*1.2,5.6,1.82,f);
 K.box(1.8,2.6,1.8,__CK.a,4,9.2,0,f);K.box(1.9,.5,1.9,'#14141c',4,10.5,0,f);K.box(.05,1.2,.05,'#14141c',-5,9,0,f);
 K.neon('BALTIC STAR','#f4f1ff',5.0,.7,-3.2,3.7,2.6,f,{back:'#2a4a8a',font:'bold 110px',dir:'ltr',halo:.12});
 K.glow(0,5,3,'#ffb48a',22,10,.28,f);
 /* gangway */
 K.box(.9,.1,4.2,'#8a8a96',4.0,1.1,-3.7).rotation.x=.18;K.box(.05,1.0,4.2,__CK.a,3.6,1.7,-3.7).rotation.x=.18;K.box(.05,1.0,4.2,__CK.a,4.4,1.7,-3.7).rotation.x=.18;
 /* cranes on the right */
 [14.6,17.5].forEach(function(x,i){var cr=new T.Group();cr.position.set(x,0,-6);W.add(cr);[-1,1].forEach(function(s){K.box(.3,15,.3,'#1a1c2a',s*1.6,7.5,0,cr)});K.box(3.6,.3,.3,'#1a1c2a',0,15,0,cr);K.box(14,.5,.5,'#1a1c2a',-5,15.5,0,cr);K.box(.2,6,.2,'#1a1c2a',-10,12.5,0,cr);var bl=new T.Mesh(new T.SphereGeometry(.2,8,6),new T.MeshBasicMaterial({color:'#ff2a3a'}));bl.position.set(0,16,0);cr.add(bl);K.glow(0,16,0,'#ff2a3a',2.2,2.2,.8,cr);c.tick(function(t){bl.visible=Math.sin(t*3+i*2)>0})});
 /* customs shed on the left with signs (English) */
 K.box(5.0,3.4,3.2,'#4a5062',-.4,1.7,-.2,null,{map:c.brick(8,3,2)});K.box(5.2,.3,3.4,'#2a2e3a',-.4,3.5,-.2);
 K.plane(2.4,2.4,new T.MeshStandardMaterial({color:'#ffe6cf',emissive:'#ffb48a',emissiveIntensity:.9}),-.4,1.3,1.43);K.box(2.4,.1,.1,'#14141c',-.4,1.3,1.46);K.box(.1,2.4,.1,'#14141c',-.4,1.3,1.46);
 K.neon('PASSPORT CONTROL','#8ab0ff',4.4,.6,-.4,3.1,1.5,null,{back:'#0c1224',font:'bold 100px',dir:'ltr'});
 K.sign('FERRY TERMINAL','#14141c','#f4f1ff',2.6,.5,-2.8,2.6,1.45,null,{pw:512});
 /* welcome sign + taxi + bollards + lamps */
 K.sign('WELCOME','#14141c','#ff8a9a',1.8,.5,6.6,2.9,2.0,null,{pw:384});K.box(.08,3.0,.08,'#2a2e3a',6.6,1.5,2.0);K.sign('TAXI','#14141c','#ff6a5a',.9,.35,10.6,2.2,2.0,null,{pw:256});K.box(.08,2.2,.08,'#2a2e3a',10.6,1.1,2.0);
 for(i=0;i<6;i++){var bx=1.6+i*2.0;mesh(new T.CylinderGeometry(.14,.18,.5,10),std(i%2?__CK.a:'#2a2e3a'),bx,.28,-1.0,W)}
 K.rope(1.6,.6,11.6,.6,-1.0,.2,'#14141c',16);
 K.lamp(2.0,3.8,1,true);K.lamp(11.6,3.8,-1,false);
 var tx=K.car(11.2,3.9,Math.PI,'#2a2e3a',.7);K.box(.6,.25,.3,'#e8e4ee',11.2,1.2,3.9,null,{emissive:'#ff6a5a',emissiveIntensity:1});K.glow(11.2,1.3,3.9,'#ff6a5a',1.4,1.4,.6);
 K.puddle(4.6,3.4,2.2,.7);K.puddle(8.6,3.2,2,.6);K.streak(4,3,'#ffb48a',3,2,.28);
 /* suitcases + fan with backpack and scarf */
 [[4.2,2.7,'#2a4a8a'],[4.7,2.6,'#8a2a3a']].forEach(function(p){K.box(.4,.6,.22,p[2],p[0],.32,p[1]);K.box(.04,.3,.04,'#14141c',p[0],.75,p[1]-.05)});
 K.p(3.4,2.7,.2,'idle',{top:__CK.a,jacket:'#14141c',bot:'#2a2e3a',style:'buzz',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],pack:'#14141c',s:1.1,w:1.15,stubble:true,beanie:'#14141c'});
 K.p(6.0,2.8,-.4,'talk',{top:'#f4f1ff',jacket:'#2a3a6a',bot:'#14141c',style:'slick',skin:'#f1c7a5',s:1.1,w:1.1,look:.3});
 K.p(6.9,2.8,.5,'listen',{top:'#3a3e52',bot:'#14141c',style:'long',skin:'#c68863',s:1.0,w:.92,stubble:false,look:-.3,bag:__CK.a});
 K.p(.6,3.0,0,'walk',{top:'#14141c',jacket:'#3a3e52',bot:'#14141c',style:'curly',skin:'#6b4430',s:1.08,w:1.1,path:[[.3,3.1],[11.8,2.9]],spd:.7,pack:'#8a2a3a'});
 K.p(8.9,2.2,.1,'lean',{top:__CK.a,bot:'#2a2e3a',style:'spiky',skin:'#8d5a3e',s:1.08,w:1.1,stubble:true});
 K.cam(11.9,2.6,{y:3.2,ly:3.0,fov:44,fovP:64});
}});

/* ======================= PROMENADE (dusk) ======================= */
RM.def('promenade',{kind:'travel',build:function(c){var K=kit(c),W=c.world,std=c.std,mesh=c.mesh,rnd=c.rnd,rr=c.rr,tm=c.o.time||'dusk';
 K.env(tm==='night'?'night':'dusk',{ext:15,fn:26,ff:130,fog:'#5a3e60'});c.light('dir','#ff8a6a',1.1,2,4,-14);
 /* promenade deck, tile bands */
 K.pave(-6,20,-.2,4.8,.18,K.paver('#8e8896','#5e5868',4,3,8));K.flat(-6,20,-.2,-.05,.19,new T.MeshBasicMaterial({color:'#e8e4ee'}));
 /* beach slope + sea */
 K.box(60,.4,8,'#7a6a86',6,-.45,-4.5,null,{roughness:1});K.sea(-40,52,-110,-8.4,-.5,'#7a5a8a','#3a3a6e','#ff9a8a',.52);K.glow(8,.3,-40,'#ff8a7a',60,8,.7);
 /* far skyline of hotels on the left (silhouettes with lit windows) */
 for(var i=0;i<8;i++){var bh=7+rnd()*9,bw=2.2+rnd()*1.8,bx=-14+i*4.1;var tb=K.box(bw,bh,2.2,'#3a3256',bx,bh/2,-34,null,{roughness:1});for(var r=0;r<Math.floor(bh/1.1);r++)for(var k=0;k<3;k++)if(rnd()<.4)K.plane(.3,.4,new T.MeshBasicMaterial({color:pick(['#ffb48a','#ffe6cf','#ff9a74'],rnd())}),bx-bw/2+.45+k*bw/3.2,1+r*1.1,-32.85)}
 /* railing */
 K.box(26,.07,.1,'#e8e4ee',6,1.1,-.1,null,{metalness:.4});K.box(26,.04,.06,'#c8c4d0',6,.6,-.1,null,{metalness:.4});for(i=0;i<27;i++)K.box(.05,1.1,.05,'#e8e4ee',-6.8+i*1,.55,-.1,null,{metalness:.4});
 /* palms + lamps */
 [-.4,2.8,6.4,10.2,13.2].forEach(function(x,i){K.palm(x,.9,5.2+rnd()*1.4,(i%2?.06:-.05))});
 [[1.2,1],[5.0,-1],[8.6,1],[12.0,-1]].forEach(function(p,i){K.lamp(p[0],1.2,p[1],i===1)});
 for(i=0;i<3;i++)K.bench(2.6+i*3.8,.9,1.5,Math.PI,'#4a3a4a');
 bulbs(K,c,-.6,3.4,12.8,3.6,.5,.4,26,'#ff9a74');
 K.puddle(4,3.3,2,.6);K.puddle(9.4,3.6,2.4,.6);K.streak(2,2.8,'#ff9a74',3,2.4,.22);K.streak(9,2.8,'#ff9a74',3,2.4,.22);
 /* people */
 K.p(2.6,1.3,Math.PI,'sit',{top:__CK.a,jacket:'#14141c',bot:'#14141c',style:'buzz',skin:'#e0a982',scarf:[__CK.a,'#f4f1ff'],s:1.05,w:1.1,stubble:true});
 K.p(3.3,1.3,Math.PI,'sit',{top:'#e08a9a',bot:'#2a3a6a',style:'long',skin:'#c68863',s:.98,w:.92,stubble:false});
 K.p(6.4,.6,Math.PI,'lean',{top:'#f4f1ff',jacket:'#2a2e3a',bot:'#14141c',style:'slick',skin:'#f1c7a5',s:1.1,w:1.12});
 K.p(7.6,.7,Math.PI*.8,'lean',{top:'#14141c',bot:'#2a2e3a',style:'curly',skin:'#6b4430',s:1.08,w:1.1});
 K.p(.5,2.6,0,'walk',{top:'#3a4a6a',jacket:'#1c2030',bot:'#14141c',style:'short',skin:'#e0a982',s:1.05,w:1.0,path:[[.3,2.8],[11.8,2.6]],spd:.7});
 K.p(2.0,3.0,0,'walk',{top:__CK.a,bot:'#14141c',style:'spiky',skin:'#8d5a3e',s:1.05,w:.98,path:[[-3,3.1],[15,3.3]],spd:1.9,stubble:false});
 K.p(10.0,2.4,.4,'talk',{top:'#6a3a4a',bot:'#14141c',style:'bun',skin:'#f1c7a5',s:1.0,w:.95,stubble:false,look:.3});
 K.p(10.8,2.5,-.5,'listen',{top:'#2a3a6a',jacket:'#14141c',bot:'#14141c',style:'buzz',skin:'#c68863',s:1.1,w:1.1,look:-.3,stubble:true});
 var kd=K.p(5.0,3.1,.2,'idle',{top:__CK.a,bot:'#2a3a6a',style:'short',skin:'#6b4430',s:.72,w:.95,stubble:false});K.ball(5.4,3.2,.11);
 K.cam(11.9,2.8,{y:3.1,ly:3.4,fov:44,fovP:64});
}});
})();
