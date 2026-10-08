(function(){var RM=window.RM,T=THREE;
/* ===== shared helpers for the stadium rooms ===== */
function H(c){
 var w=c.world,std=c.std,rbox=c.rbox,rnd=c.rnd,rr=c.rr,S=c.skin,SK=c.SK;
 var h={c:c,night:c.o.time!=='day',c1:S.c1,c2:S.c2,c3:S.c3,w:w};
 var mc={};
 h.M=function(col,o){var k=col+(o?JSON.stringify(o):'');return mc[k]||(mc[k]=std(col,o))};
 h.BM=function(col,k,o){return new T.MeshBasicMaterial(Object.assign({color:new T.Color(col).multiplyScalar(k||1)},o||{}))};
 h.pick=function(a){return a[Math.floor(rnd()*a.length)]};
 h.bx=function(W,Hh,D,x,y,z,mat,par){var m=new T.Mesh(new T.BoxGeometry(W,Hh,D),mat);m.position.set(x,y,z);m.receiveShadow=true;(par||w).add(m);return m};
 h.rb=function(W,Hh,D,r,x,y,z,mat,par){var m=new T.Mesh(rbox(W,Hh,D,r,3),mat);m.position.set(x,y,z);(par||w).add(m);return m};
 h.cyl=function(r1,r2,L,x,y,z,mat,par,seg){var m=new T.Mesh(new T.CylinderGeometry(r1,r2,L,seg||10),mat);m.position.set(x,y,z);(par||w).add(m);return m};
 h.plane=function(W,Hh,x,y,z,mat,ry,rx,par){var m=new T.Mesh(new T.PlaneGeometry(W,Hh),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);(par||w).add(m);return m};
 h.bar=function(x1,y1,z1,x2,y2,z2,r,mat,par){var dx=x2-x1,dy=y2-y1,dz=z2-z1,L=Math.hypot(dx,dy,dz);var m=new T.Mesh(new T.CylinderGeometry(r,r,L,6),mat);m.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx,dy,dz).normalize());(par||w).add(m);return m};
 h.tx=function(W,Hh,fn,rx,ry){var cv=c.cvs(W,Hh),g=cv.getContext('2d');fn(g,W,Hh);return c.tex(cv,rx,ry)};
 h.text=function(g,t,x,y,size,col,wt,maxW){g.font=(wt||'bold')+' '+size+'px Heebo, Arial, sans-serif';if(maxW){var m=g.measureText(t).width;if(m>maxW){size=size*maxW/m;g.font=(wt||'bold')+' '+size+'px Heebo, Arial, sans-serif'}}g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';g.direction='ltr';g.fillText(t,x,y)};
 h.glow=function(col,x,y,z,sx,sy,op,par){var sp=new T.Sprite(new T.SpriteMaterial({color:col,map:c.glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:(op==null?.7:op)*(h.night?1:.25),depthWrite:false}));sp.scale.set(sx,sy==null?sx:sy,1);sp.position.set(x,y,z);(par||w).add(sp);c.anim.glow.push(sp);return sp};
 h.haze=function(col,x,y,z,sx,sy,op){var sp=new T.Sprite(new T.SpriteMaterial({color:col,map:c.glowTex(),transparent:true,opacity:op==null?.12:op,depthWrite:false}));sp.scale.set(sx,sy==null?sx:sy,1);sp.position.set(x,y,z);w.add(sp);return sp};
 h.signBoard=function(txt,bg,fg,W,Hh,x,y,z,ry,o){o=o||{};var cw=512,ch=Math.max(64,Math.round(cw*Hh/W));
  var t=h.tx(cw,ch,function(g){g.fillStyle=bg;g.fillRect(0,0,cw,ch);if(o.border){g.strokeStyle=fg;g.lineWidth=ch*.05;g.strokeRect(ch*.07,ch*.07,cw-ch*.14,ch-ch*.14)}h.text(g,txt,cw/2,ch/2+ch*.04,ch*(o.k||.6),fg,'900',cw*.88)});
  var m=new T.MeshStandardMaterial({map:t,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:o.emi==null?.55:o.emi,roughness:.6});
  var mm=h.plane(W,Hh,x,y,z,m,ry||0,0,o.par);if(o.glow)h.glow(o.glow,x,y,z+.25,W*1.5,Hh*2.6,.5);return mm};
 /* lighting */
 h.env=function(kind){var K={night:{sky:'night',hemi:['#8a96c8',.8,'#2a2434'],dir:['#a4b4e8',.6],fog:['#0e1432',24,80]},
   dusk:{sky:'dusk',hemi:['#b898b8',.9,'#3a2a3c'],dir:['#ffa890',.8],fog:['#3a2a4e',26,90]},
   cold:{sky:'night',hemi:['#9ab4e8',.9,'#2a3040'],dir:['#b8c8ff',.7],fog:['#121c3c',22,70]},
   day:{sky:'day',hemi:['#d8e4ff',1.0,'#6a6a70'],dir:['#fff0e4',1.1],fog:['#a8bcd8',30,110]}};
  var k=K[h.night?kind:'day'];c.sky(k.sky);c.fog(k.fog[0],k.fog[1],k.fog[2]);
  var hm=c.light('hemi',k.hemi[0],k.hemi[1],0,0,0,k.hemi[2]);var d=c.light('dir',k.dir[0],k.dir[1],-8,18,14);return{hemi:hm,dir:d}};
 /* textures */
 h.pitchTex=function(rx,ry){return h.tx(1024,1024,function(g,W,Hh){for(var i=0;i<16;i++){g.fillStyle=i%2?'#2f8040':'#27703a';g.fillRect(0,i*64,W,64)}
   for(i=0;i<5000;i++){g.fillStyle=rnd()>.5?'rgba(255,255,255,.04)':'rgba(0,20,0,.06)';g.fillRect(rnd()*W,rnd()*Hh,2,5)}},rx,ry)};
 h.cageTex=function(){return h.tx(64,64,function(g){g.clearRect(0,0,64,64);g.strokeStyle='rgba(190,200,220,.95)';g.lineWidth=3;g.beginPath();for(var i=-64;i<128;i+=16){g.moveTo(i,0);g.lineTo(i+64,64);g.moveTo(i+64,0);g.lineTo(i,64)}g.stroke()},1,1)};
 /* fences */
 h.rail=function(x1,z1,x2,z2,y,Ht,o){o=o||{};var L=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.round(L/(o.sp||1.4))),m=h.M(o.col||'#3a4050',{metalness:.7,roughness:.4});
  for(var i=0;i<=n;i++){var x=x1+(x2-x1)*i/n,z=z1+(z2-z1)*i/n;h.cyl(.04,.04,Ht,x,y+Ht/2,z,m,null,6)}
  [.96,.55,.18].forEach(function(f){h.bar(x1,y+Ht*f,z1,x2,y+Ht*f,z2,.03,m)});};
 h.cage=function(x1,z1,x2,z2,y,Ht,o){o=o||{};var L=Math.hypot(x2-x1,z2-z1);var t=h.cageTex();t.repeat.set(L/.6,Ht/.6);var m=new T.MeshBasicMaterial({map:t,transparent:true,side:T.DoubleSide,depthWrite:false,opacity:.75});
  var p=new T.Mesh(new T.PlaneGeometry(L,Ht),m);p.position.set((x1+x2)/2,y+Ht/2,(z1+z2)/2);p.rotation.y=-Math.atan2(z2-z1,x2-x1);w.add(p);
  var pm=h.M('#2a2e3a',{metalness:.6,roughness:.4});var n=Math.max(1,Math.round(L/2.2));for(var i=0;i<=n;i++)h.cyl(.05,.05,Ht+.3,x1+(x2-x1)*i/n,y+Ht/2,z1+(z2-z1)*i/n,pm,null,6);
  h.bar(x1,y+Ht,z1,x2,y+Ht,z2,.05,pm);if(o.spikes)for(i=0;i<=n*2;i++){var q=h.cyl(0,.05,.2,x1+(x2-x1)*i/(n*2),y+Ht+.22,z1+(z2-z1)*i/(n*2),pm,null,4)}};
 /* instanced crowd of cheap figures */
 h.crowd=function(spots,o){o=o||{};spots=spots.map(function(s){return Array.isArray(s)?{x:s[0],y:s[1],z:s[2]}:s});var n=spots.length;if(!n)return;if(window.PEOPLE&&PEOPLE.crowd&&!o.cheap)return h.crowdPeople(spots,o);
  var pal=o.pal||[h.c1,h.c1,h.c1,h.c2,h.c2,h.c3,h.c3,'#2a3a6a','#4a4a56'];
  var bg=new T.LatheGeometry([[0,0],[.1,0],[.13,.05],[.14,.5],[.16,.85],[.19,.95],[.17,1.08],[.22,1.2],[.25,1.3],[.2,1.38],[.07,1.42],[0,1.43]].map(function(p){return new T.Vector2(p[0],p[1])}),12),hg=new T.SphereGeometry(.12,10,8),ag=new T.CylinderGeometry(.048,.04,.62,6);ag.translate(0,.31,0);
  var bm=new T.InstancedMesh(bg,new T.MeshStandardMaterial({color:'#ffffff',roughness:.92}),n),hm=new T.InstancedMesh(hg,new T.MeshStandardMaterial({color:'#ffffff',roughness:.7}),n),am=new T.InstancedMesh(ag,new T.MeshStandardMaterial({color:'#ffffff',roughness:.9}),n*2);
  var d=new T.Object3D(),col=new T.Color(),zero=new T.Matrix4().makeScale(0,0,0);
  spots.forEach(function(s,i){var sc=(s.s||1)*(.92+rnd()*.16),ry=(s.ry||0)+(rnd()-.5)*.5;
   d.position.set(s.x,s.y,s.z);d.rotation.set(0,ry,0);d.scale.set(1.15*sc,sc,.78*sc);d.updateMatrix();bm.setMatrixAt(i,d.matrix);
   var bc=s.col||h.pick(pal);col.set(bc);if(o.dim)col.multiplyScalar(o.dim);col.convertSRGBToLinear();bm.setColorAt(i,col);
   d.position.set(s.x,s.y+1.5*sc,s.z);d.scale.setScalar(sc);d.updateMatrix();hm.setMatrixAt(i,d.matrix);
   col.set(h.pick(SK));if(o.dim)col.multiplyScalar(o.dim*1.1);col.convertSRGBToLinear();hm.setColorAt(i,col);
   for(var k=0;k<2;k++){var sd=k?1:-1,up=rnd()<(s.up==null?(o.up==null?.25:o.up):s.up);
    if(up){d.position.set(s.x+Math.cos(ry)*sd*.25*sc,s.y+1.12*sc,s.z-Math.sin(ry)*sd*.25*sc);d.rotation.set(-.15+rnd()*.3,ry,-sd*(.22+rnd()*.3));d.scale.setScalar(sc);d.updateMatrix();am.setMatrixAt(i*2+k,d.matrix)}else am.setMatrixAt(i*2+k,zero);
    col.set(bc);if(o.dim)col.multiplyScalar(o.dim);col.convertSRGBToLinear();am.setColorAt(i*2+k,col)}});
  [bm,hm,am].forEach(function(m){m.frustumCulled=false;w.add(m)});return bm};
 /* real bodies on the terrace: three poses, per-person shirt/trousers/skin/hair. The palette is the club's; jackets and
    plain dark clothes keep a stand from reading as a kit advert. */
 h.crowdPeople=function(spots,o){var pal=o.pal||[h.c1,h.c1,h.c1,h.c2,h.c2,h.c3,'#1c1e26','#2a2e3a','#3a3a44','#24304a'];
  var HAIR=['#120d0a','#1c1410','#2a1d16','#3a2a1e','#5a4634','#6a6a70','#1a1a1c'],PANTS=['#14151c','#1c2030','#232633','#2a3450','#30302e','#1a1a1a'],SHOE=['#121214','#1c1c20','#d8d6d0','#2a2420'];
  var groups={down:[],one:[],both:[]};spots.forEach(function(s){var u=s.up==null?(o.up==null?.25:o.up):s.up,a=rnd()<u,b=rnd()<u;(a&&b?groups.both:a||b?groups.one:groups.down).push(s)});
  var d=new T.Object3D(),col=new T.Color(),first=null,dim=o.dim||1;
  function setc(att,i,hex,k){col.set(hex);col.multiplyScalar(k);col.convertSRGBToLinear();att.setXYZ(i,col.r,col.g,col.b)}
  Object.keys(groups).forEach(function(k){var L=groups[k];if(!L.length)return;var im=PEOPLE.crowdMesh(k,L.length);if(!im)return;var A=im.userData.att;
   L.forEach(function(s,i){var sc=(s.s||1)*(.88+rnd()*.14)*.93,ry=(s.ry||0)+(rnd()-.5)*.5,sw=rnd()<.28?1.1+rnd()*.14:1+(rnd()-.5)*.14;d.position.set(s.x,s.y,s.z);d.rotation.set(0,ry,0);d.scale.set(sc*sw,sc,sc*(1+(sw-1)*.6));d.updateMatrix();im.setMatrixAt(i,d.matrix);
    var sk=h.pick(SK),hr=rnd()<.12?sk:h.pick(HAIR),sh=s.col||h.pick(pal),k2=dim*(.85+rnd()*.2);
    setc(A.cSkin,i,sk,Math.min(1,dim*1.1));setc(A.cShirt,i,sh,k2);setc(A.cPants,i,h.pick(PANTS),dim);setc(A.cShoe,i,h.pick(SHOE),dim);setc(A.cHair,i,hr,dim)});
   ['cSkin','cShirt','cPants','cShoe','cHair'].forEach(function(n){A[n].needsUpdate=true});w.add(im);if(!first)first=im;
   /* both arms up: most of them hold a scarf stretched between the hands; one arm up: some carry a small flag */
   if(k!=='down'&&!o.noProps){var hp=handsOf(k),props=[];L.forEach(function(s,i){if(rnd()<(k==='both'?.62:.22))props.push(i)});if(!props.length)return;
    var geo=k==='both'?new T.BoxGeometry(1,.085,.012):new T.PlaneGeometry(.34,.22),mat=new T.MeshStandardMaterial({map:scarfTex(),roughness:.9,side:T.DoubleSide});mat.__al=1;
    var pm=new T.InstancedMesh(geo,mat,props.length),pole=k==='one'?new T.InstancedMesh(new T.CylinderGeometry(.008,.008,.62,5),new T.MeshStandardMaterial({color:'#2a2622',roughness:.8}),props.length):null,M4=new T.Matrix4(),P4=new T.Matrix4(),q=new T.Object3D();
    props.forEach(function(i,n){im.getMatrixAt(i,P4);if(k==='both'){var L0=hp.l,R0=hp.r,mid=L0.clone().add(R0).multiplyScalar(.5);q.position.copy(mid);q.position.y-=.03;q.rotation.set(rr(-.15,.15),0,rr(-.06,.06));q.scale.set(L0.distanceTo(R0)+.08,1,1)}
     else{var hh=hp.r.y>hp.l.y?hp.r:hp.l;q.position.set(hh.x,hh.y+.24,hh.z);q.rotation.set(0,rr(-.4,.4),rr(-.12,.12));q.scale.set(1,1,1);if(pole){var qp=new T.Object3D();qp.position.set(hh.x,hh.y+.2,hh.z);qp.updateMatrix();M4.multiplyMatrices(P4,qp.matrix);pole.setMatrixAt(n,M4)}q.position.x+=(hh.x>0?.17:-.17)}
     q.updateMatrix();M4.multiplyMatrices(P4,q.matrix);pm.setMatrixAt(n,M4)});
    [pm,pole].forEach(function(m){if(!m)return;m.frustumCulled=false;m.castShadow=false;w.add(m)})}});return first};
 var HANDS={};function handsOf(k){if(HANDS[k])return HANDS[k];var g=PEOPLE.crowd[k],p=g.attributes.position,my=-1e9,i;for(i=0;i<p.count;i++)my=Math.max(my,p.getY(i));
  var l=new T.Vector3(),r=new T.Vector3(),nl=0,nr=0;for(i=0;i<p.count;i++){var y=p.getY(i);if(y<my-.16)continue;if(p.getX(i)>0){l.x+=p.getX(i);l.y+=y;l.z+=p.getZ(i);nl++}else{r.x+=p.getX(i);r.y+=y;r.z+=p.getZ(i);nr++}}
  if(nl)l.divideScalar(nl);if(nr)r.divideScalar(nr);if(!nl)l.copy(r);if(!nr)r.copy(l);return HANDS[k]={l:l,r:r}}
 var SCT=null;function scarfTex(){if(SCT)return SCT;var cv=c.cvs(256,32),g2=cv.getContext('2d'),a=h.c1,b=h.c2||'#f2ede4';for(var x=0;x<8;x++){g2.fillStyle=x%2?b:a;g2.fillRect(x*32,0,32,32)}g2.fillStyle=a;g2.fillRect(0,0,256,4);g2.fillRect(0,28,256,4);return SCT=c.tex(cv,1,1)}
 /* tiered stand. o:{x0,x1,z0,rows,rise,run,y0,cut:{xa,xb,from},mat} rows climb toward -z */
 h.stand=function(o){var rows=o.rows,rise=o.rise||.42,run=o.run||.85,y0=o.y0||0,mat=o.mat||h.M('#ffffff',{map:c.concrete('#8c909c',(o.x1-o.x0)/3,1),roughness:.85});
  var info=[];for(var r=0;r<rows;r++){var Ht=y0+rise*(r+1),zc=o.z0-r*run-run/2;info.push({y:Ht,z:zc});
   var segs=o.cut?[[o.x0,o.cut.xa,0],[o.cut.xa,o.cut.xb,o.cut.from],[o.cut.xb,o.x1,0]]:[[o.x0,o.x1,0]];
   segs.forEach(function(sg){if(r<sg[2]||sg[1]-sg[0]<=.01)return;h.bx(sg[1]-sg[0],Ht,run,(sg[0]+sg[1])/2,Ht/2,zc,mat)})}
  o._info=info;o._rise=rise;o._run=run;return info};
 h.fill=function(o,opt){opt=opt||{};var out=[],dx=opt.dx||.52;o._info.forEach(function(row,r){if(opt.maxRow!=null&&r>=opt.maxRow)return;
   for(var x=o.x0+.3;x<o.x1-.2;x+=dx){if(o.cut&&x>o.cut.xa&&x<o.cut.xb&&r<o.cut.from)continue;if(opt.skip&&opt.skip(x,r))continue;if(rnd()>(opt.p==null?.9:opt.p))continue;
    out.push({x:x+(rnd()-.5)*.14,y:row.y,z:row.z+(rnd()-.5)*.14,ry:(opt.ry||0),s:opt.s,up:opt.up})}});return out};
 /* floodlight tower */
 h.tower=function(x,z,Ht,o){o=o||{};var g=new T.Group();g.position.set(x,0,z);g.rotation.y=o.ry||0;w.add(g);var m=h.M('#2a2e3a',{metalness:.6,roughness:.45});
  h.cyl(.22,.4,Ht,0,Ht/2,0,m,g,8);var pw=o.pw||5.4,ph=o.ph||3.2;h.bx(pw,ph,.4,0,Ht+ph/2-.2,0,h.M('#1a1e28'),g);
  var lm=h.BM('#e8f0ff',o.k||1.7),lg=new T.CircleGeometry(.27,10);for(var r=0;r<4;r++)for(var k=0;k<7;k++){var l=new T.Mesh(lg,lm);l.position.set(-pw/2+.4+k*(pw-.8)/6,Ht+ph-.5-r*.7,.22);g.add(l)}
  h.glow('#bcd4ff',x+Math.sin(o.ry||0)*.6,Ht+ph/2,z+Math.cos(o.ry||0)*.8,o.gs||pw*4,(o.gs||pw*4)*.62,o.gop||.85);return g};
 /* persons */
 h.P=function(o,x,z,ry){o=o||{};if(o.s==null)o.s=.92;o.ry=ry||0;return c.person(o,{x:x/c.U,z:z/c.U,yaw:ry||0})};
 h.fan=function(x,z,ry,mode,o){var HAIR=['#1a1210','#2a1d16','#14100e','#4a3020','#8a8a90'],STY=['buzz','short','bald','spiky','slick','curly'];var i=Math.floor(rnd()*1000);
  var P={skin:SK[i%5],top:h.pick([h.c1,h.c1,h.c2,h.c3,'#2a3a6a','#4a4a56']),bot:h.pick(['#14141c','#1c2030','#2a2e3a','#2a3450']),hair:h.pick(HAIR),style:h.pick(STY),stubble:i%2===0,w:1+rnd()*.2,mode:mode||'idle',s:.88+rnd()*.08,eye:h.pick(['#3a2a1c','#2a1a10','#3a4a6a'])};
  if(rnd()<.55)P.scarf=rnd()<.5?[h.c1,h.c2]:[h.c2,h.c1];if(rnd()<.4)P.jacket=h.pick(['#14141c','#2a2e3a',h.c3,'#243a6a']);if(rnd()<.2)P.beanie=h.pick([h.c1,'#14141c']);else if(rnd()<.12)P.cap='#14141c';if(rnd()<.15)P.tat=true;
  return h.P(Object.assign(P,o||{}),x,z,ry)};
 h.cop=function(x,z,ry,mode,o){return h.P(Object.assign({skin:h.pick(SK),top:'#16203a',jacket:'#1c2a4c',bot:'#10162a',hair:'#1a1210',style:'short',cap:'#16203a',w:1.12,mode:mode||'idle',collar:"#e8eaf6",s:.92,belt:'#8a8a96'},o||{}),x,z,ry)};
 /* flags & banners */
 h.flagMat=function(a,b,txt,k){var t=h.tx(256,160,function(g,W,Hh){g.fillStyle=a;g.fillRect(0,0,W,Hh);g.fillStyle=b;if(k==='band'){g.fillRect(0,Hh*.38,W,Hh*.24)}else if(k==='stripes'){for(var i=0;i<5;i++)if(i%2)g.fillRect(0,i*Hh/5,W,Hh/5)}else if(k==='cross'){g.fillRect(W*.4,0,W*.16,Hh);g.fillRect(0,Hh*.42,W,Hh*.16)}
   if(txt)h.text(g,txt,W/2,Hh/2+4,txt.length>5?46:70,k==='band'?a:b,'900',W*.9)});return new T.MeshStandardMaterial({map:t,side:T.DoubleSide,roughness:.9})};
 h.flag=function(x,y,z,Wd,Hh,mat,poleH){var g=new T.Group();g.position.set(x,y,z);w.add(g);h.cyl(.035,.035,poleH||3.2,0,(poleH||3.2)/2,0,h.M('#2a2e3a',{metalness:.5}),g,5);
  var geo=new T.PlaneGeometry(Wd,Hh,8,1);geo.translate(Wd/2,0,0);var p=new T.Mesh(geo,mat);p.position.set(.02,(poleH||3.2)-Hh/2-.05,0);g.add(p);c.anim.flags.push({o:p,ph:x*1.3+z,g:geo});return g};
 h.banner=function(txt,bg,fg,W,Hh,x,y,z,ry,o){return h.signBoard(txt,bg,fg,W,Hh,x,y,z,ry,Object.assign({emi:.18,border:true},o||{}))};
 h.strip=function(x,y,z,L,Wd,col,k,ry){var m=h.plane(L,Wd,x,y,z,h.BM(col||'#e8f0ff',k||1.7),ry||0,-Math.PI/2);return m};
 h.flare=function(x,y,z,light){var g=c.flare(x,y,z);g.children.forEach(function(o){if(o.isPointLight&&!light)o.visible=false});return g};
 h.lamp=function(x,z,Ht,o){o=o||{};Ht=Ht||6.2;var g=new T.Group();g.position.set(x,0,z);w.add(g);var m=h.M('#2a2e3a',{metalness:.6,roughness:.4});
  h.cyl(.08,.12,Ht,0,Ht/2,0,m,g,8);h.bar(0,Ht-.1,0,1.3,Ht,0,.05,m,g);h.bx(.8,.12,.3,1.4,Ht-.05,0,m,g);h.plane(.7,.24,1.4,Ht-.12,0,h.BM('#ffb890',1.6),0,Math.PI/2,g);
  h.glow('#ff9a64',x+1.4,Ht-.3,z,o.gs||5,o.gs||5,.75);var cone=new T.Mesh(new T.CylinderGeometry(.2,2.4,Ht-.6,16,1,true),new T.MeshBasicMaterial({color:'#ff9a64',transparent:true,opacity:.06,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));cone.position.set(x+1.4,(Ht-.6)/2,z);w.add(cone);
  if(o.light){var l=c.light('point','#ff9a64',1.1,x+1.4,Ht-.6,z,14)}return g};
 return h}
/* ===================== ticket-office ===================== */
var SKN=['#f1c7a5','#e0a982','#c68863','#8d5a3e','#6b4430'];function SK(i){return SKN[i]}
RM.def('ticket-office',{kind:'stadium',build:function(c){var h=H(c),w=c.world,g=c.g,S=c.skin;
 c.sky('indoor');
 c.shell({right:true,h:9,wallMap:c.wall('#34406a',['#323c60','#1e2640','#3a4670'],3,1.5),floorMap:c.concrete('#70728a',3,2),skirt:'#14141c'});
 c.light('hemi','#aab8e8',.95,0,0,0,'#2a2a34');
 c.light('point','#dfe8ff',1.25,3.2,2.35,2.4,9);
 c.light('point','#ffb48a',1.0,3.2,1.8,.55,6);
 c.light('point','#ff4a5a',.5,.4,1.8,2.8,4);
 var wl=h.M('#ffffff',{map:c.wall('#34406a',['#323c60','#1e2640','#3a4670'],4,1.5),roughness:.9});
 var dado=h.M('#ffffff',{map:h.tx(256,256,function(g){g.fillStyle='#a8b0c8';g.fillRect(0,0,256,256);g.strokeStyle='#59627f';g.lineWidth=3;for(var i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke()}},6,1),roughness:.4});
 /* partition wall with three windows */
 var zp=1.1,tz=.3,W=6.48;
 h.bx(W,1.0,tz,W/2,.5,zp,dado);h.bx(W,.48,tz,W/2,2.19,zp,wl);
 [[0,.7],[1.8,2.69],[3.79,4.65],[5.75,6.48]].forEach(function(p){h.bx(p[1]-p[0],.95,tz,(p[0]+p[1])/2,1.475,zp,wl)});
 var steel=h.M('#8e96aa',{metalness:.7,roughness:.35}),dk=h.M('#14141c',{roughness:.7});
 [1.25,3.24,5.2].forEach(function(x,i){
  h.bx(1.3,.07,.55,x,1.01,1.45,steel);h.bx(1.34,.08,.06,x,1.97,1.27,dk);h.bx(.05,.95,.06,x-.57,1.48,1.27,dk);h.bx(.05,.95,.06,x+.57,1.48,1.27,dk);
  if(i<2){h.plane(1.1,.95,x,1.48,1.22,new T.MeshStandardMaterial({color:'#bcd0ff',transparent:true,opacity:.1,roughness:.1,depthWrite:false}),0);
   h.bx(.34,.2,.03,x,1.18,1.26,dk);for(var k=0;k<5;k++)h.bx(.28,.012,.03,x,1.12+k*.035,1.285,h.M('#59627f'));
   h.bx(1.5,.8,.5,x,.4,.7,h.M('#3a3e50',{roughness:.6}));h.bx(1.5,.05,.5,x,.82,.7,h.M('#6a7088'));
   h.plane(.42,.26,x+.45,1.0,.62,new T.MeshStandardMaterial({color:'#12182e',emissive:'#4a7aff',emissiveIntensity:.7}),0,-.35)}
  else{h.plane(1.12,.97,x,1.48,1.24,new T.MeshStandardMaterial({map:c.rollerShutter(),roughness:.6}),0)}
  h.signBoard(i<2?'Tills '+(i+1):'Closed','#10101a',i<2?'#ff4a5a':'#9aa4c0',1.1,.3,x,2.19,1.275,0,{emi:.7,glow:i<2?'#ff2a4a':null,border:true})});
 h.glow('#ffb48a',3.24,1.7,.6,5.4,2.2,.4);
 /* clerks */
 h.P({skin:SK(1),top:S.c1,jacket:'#1c2030',bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.12,mode:'talk',collar:'#e8eaf6',s:.92},1.25,.36,0);
 h.P({skin:SK(3),top:'#e8eaf6',jacket:'#243a6a',bot:'#1c2030',hair:'#14100e',style:'curly',w:1.05,mode:'idle',glasses:true,s:.9},3.24,.38,0);
 /* shelves + ticket stock behind */
 for(var s=0;s<3;s++){h.bx(2.2,.04,.3,5.0,1.0+s*.5,.22,steel);for(var b=0;b<7;b++)h.bx(.22,.3,.2,4.1+b*.28,1.17+s*.5,.22,h.M(b%2?S.c1:'#e8eaf6'))}
 /* left wall: ticket rack, posters, calendar */
 var rack=h.tx(512,384,function(g,W,Hh){g.fillStyle='#10131f';g.fillRect(0,0,W,Hh);for(var r=0;r<4;r++)for(var k=0;k<6;k++){var x=14+k*82,y=14+r*92;g.fillStyle='#262c44';g.fillRect(x,y,74,84);var n=2+Math.floor(c.rnd()*4);for(var t=0;t<n;t++){g.fillStyle=t%2?'#e8eaf6':S.c1;g.fillRect(x+6+t*3,y+8+t*5,60-t*3,56-t*3);}g.fillStyle='#10131f';g.fillRect(x+10,y+22,50,3);}},1,1);
 h.bx(.1,1.2,1.62,.05,1.45,2.55,dk);h.plane(1.5,1.12,.11,1.45,2.55,new T.MeshStandardMaterial({map:rack,emissive:'#fff',emissiveMap:rack,emissiveIntensity:.3}),Math.PI/2);
 var poster=function(z,y,lines,bg,fg,ac,Wd,Hd){var t=h.tx(320,Math.round(320*Hd/Wd),function(g,W,Hh){g.fillStyle=bg;g.fillRect(0,0,W,Hh);g.fillStyle=ac;g.fillRect(0,Hh*.62,W,Hh*.08);g.fillRect(0,0,W,Hh*.04);
   h.text(g,lines[0],W/2,Hh*.3,Hh*.2,fg,'900',W*.86);h.text(g,lines[1],W/2,Hh*.5,Hh*.1,fg,'bold',W*.8);h.text(g,lines[2],W/2,Hh*.84,Hh*.12,fg,'900',W*.8)},1,1);
  return h.plane(Wd,Hd,.07,y,z,new T.MeshStandardMaterial({map:t,emissive:'#fff',emissiveMap:t,emissiveIntensity:.3,roughness:.8}),Math.PI/2)};
 poster(1.65,1.55,['Tonight','Home Game','20:30'],'#10131f','#f4f1ff',S.c1,.8,1.1);
 poster(3.35,1.5,['Tickets','Season Tickets & Stand','Open'],S.c1,'#f4f1ff','#10131f',.7,1.0);
 var cal=h.tx(256,300,function(g,W,Hh){g.fillStyle='#e8eaf6';g.fillRect(0,0,W,Hh);g.fillStyle=S.c1;g.fillRect(0,0,W,58);h.text(g,'October',W/2,30,36,'#fff','900');g.fillStyle='#34406a';for(var r=0;r<5;r++)for(var k=0;k<7;k++){var n=r*7+k+1;g.font='bold 22px Arial';g.textAlign='center';g.fillText(n<=31?String(n):'',18+k*36,86+r*42);if(n===14){g.strokeStyle=S.c1;g.lineWidth=5;g.beginPath();g.arc(18+k*36,80+r*42,17,0,7);g.stroke()}}},1,1);
 h.plane(.48,.56,.07,1.5,2.5,new T.MeshStandardMaterial({map:cal,roughness:.8}),Math.PI/2);
 /* queue lane: posts + tape */
 var chrome=h.M('#c8cede',{metalness:.9,roughness:.2}),tape=h.M(S.c1,{roughness:.6});
 for(var q=0;q<7;q++){var px=.9+q*.88;h.cyl(.16,.2,.04,px,.02,2.62,dk,null,14);h.cyl(.025,.025,.95,px,.5,2.62,chrome,null,8);var bl=new T.Mesh(new T.SphereGeometry(.05,10,8),chrome);bl.position.set(px,1.0,2.62);w.add(bl);if(q<6)h.bar(px,.88,2.62,px+.88,.88,2.62,.014,tape)}
 h.plane(5.8,.06,3.7,.012,1.95,h.BM(S.c1,1),0,-Math.PI/2);
 h.fan(1.25,1.78,Math.PI,'talk',{top:'#14141c',jacket:S.c1,scarf:[S.c1,S.c2],bag:'#2a2e3a'});
 [[2.2,'#e8eaf6'],[3.0,S.c1],[3.85,'#14141c'],[4.7,'#2a3a6a']].forEach(function(p,i){h.fan(p[0],1.95+(i%2)*.05,-Math.PI/2+(i-1.5)*.08,i%2?'idle':'listen',{top:p[1],scarf:[S.c1,S.c2],look:.4})});
 h.fan(3.24,1.8,Math.PI,'idle',{top:S.c2,jacket:'#243a6a',cap:'#14141c'});
 /* self-service kiosk */
 h.bx(.7,1.7,.5,5.75,.85,2.9,h.M('#1c2440',{roughness:.5,metalness:.3}));
 var scr=h.tx(256,300,function(g,W,Hh){g.fillStyle='#0a1030';g.fillRect(0,0,W,Hh);g.fillStyle=S.c1;g.fillRect(0,0,W,50);h.text(g,'Ticket Printing',W/2,26,30,'#fff','900',W*.9);g.fillStyle='#e8eaf6';for(var i=0;i<4;i++){g.fillRect(24,76+i*50,W-48,34)}h.text(g,'Stand',W/2,94,24,'#10131f','900');h.text(g,'Season Ticket',W/2,144,24,'#10131f','900');h.text(g,'Guest',W/2,194,24,'#10131f','900')},1,1);
 h.plane(.5,.58,5.75,1.35,3.17,new T.MeshStandardMaterial({map:scr,emissive:'#fff',emissiveMap:scr,emissiveIntensity:.8}),0);h.glow('#6a8aff',5.75,1.35,3.4,1.6,1.6,.4);
 /* street door on the right wall */
 h.bx(.12,2.05,1.1,6.46,1.02,2.4,dk);h.plane(.96,1.9,6.39,1.02,2.4,new T.MeshStandardMaterial({color:'#0e1a3a',emissive:'#3a5aaa',emissiveIntensity:.8,roughness:.2}),-Math.PI/2);
 h.glow('#ffb48a',6.2,1.6,2.4,1.8,2.6,.5);h.signBoard('Exit','#10101a','#ff4a5a',.8,.2,6.38,2.25,2.4,-Math.PI/2,{emi:.8});
 /* pendant lamps */
 [2.0,4.6].forEach(function(px){h.cyl(.01,.01,.25,px,2.3,1.6,dk,null,4);h.cyl(.16,.26,.12,px,2.14,1.6,h.M('#2a2e3a'),null,12);h.plane(.4,.4,px,2.07,1.6,h.BM('#e8f0ff',1.8),0,Math.PI/2);h.glow('#dfe8ff',px,2.0,1.6,2.2,1.4,.3)});
 c.setCam(3.24,3.05,8.8,3.24,1.15,1.5,38,56)}});
/* ---- shared exterior pieces ---- */
function facade(h,Wd,Hd,x,y,z,o){o=o||{};var tw=1024,th=Math.round(1024*Hd/Wd);
 var t=h.tx(tw,th,function(g,W,Hh){g.fillStyle=o.base||'#1a1e2e';g.fillRect(0,0,W,Hh);
  for(var i=0;i<W;i+=48){g.fillStyle='rgba(255,255,255,.04)';g.fillRect(i,0,3,Hh)}
  var rows=o.rows||5;for(var r=0;r<rows;r++){var yy=Hh*.12+r*(Hh*.8/rows);g.fillStyle='#10131f';g.fillRect(0,yy,W,Hh*.06);
   for(var k=0;k<W/48;k++){var lit=h.c.rnd()<(o.lit==null?.55:o.lit);g.fillStyle=lit?(h.c.rnd()<.5?'#ffc8a8':'#bcd4ff'):'#222638';g.fillRect(k*48+8,yy+3,32,Hh*.06-6)}}
  g.fillStyle='#2a2f44';g.fillRect(0,0,W,Hh*.05);g.fillStyle=o.stripe||__CK.a;g.fillRect(0,Hh*.05,W,Hh*.018)},1,1);
 var m=new T.MeshStandardMaterial({map:t,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:.6,roughness:.8});
 return h.plane(Wd,Hd,x,y,z,m,0)}
function turnstile(h,x,z,ry){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry||0;h.w.add(g);var m=h.M('#9aa2b6',{metalness:.8,roughness:.3}),d=h.M('#20242f',{metalness:.5,roughness:.5});
 h.bx(.34,1.0,.9,0,.5,0,d,g);h.cyl(.07,.07,.2,0,1.08,0,m,g,10);for(var i=0;i<3;i++){var a=i*Math.PI*2/3+.5;h.bar(0,1.12,0,Math.cos(a)*.62,.82,Math.sin(a)*.62,.028,m,g)}
 h.bx(.36,.1,.4,0,1.08,.36,h.BM('#3cff8a',1.3),g);h.bx(.2,.1,.3,0,1.04,-.36,h.BM('#ff3a4a',1.3),g);
 [.55,-.55].forEach(function(s){h.bar(0,0.95,s*.47,0,0.95,s*.47,.02,m,g)});return g}
function wetDisc(h,x,z,col,sx,sz,op){var s=new T.Mesh(new T.PlaneGeometry(sx,sz),new T.MeshBasicMaterial({color:col,map:h.c.glowTex(),transparent:true,opacity:op==null?.3:op,blending:T.AdditiveBlending,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(x,.025,z);h.w.add(s);return s}

/* ===================== gate ===================== */
RM.def('gate',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('night');c.world.userData.x=1;
 /* ground */
 var asph=c.asphalt();asph.repeat.set(16,8);var gr=h.plane(60,34,5,0,5,new T.MeshStandardMaterial({map:asph,roughness:.34,metalness:.12}),0,-Math.PI/2);
 var tiles=h.tx(256,256,function(g){g.fillStyle='#5a5e6e';g.fillRect(0,0,256,256);g.strokeStyle='#3a3e4e';g.lineWidth=4;for(var i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke()}for(i=0;i<500;i++){g.fillStyle='rgba(255,255,255,.03)';g.fillRect(rnd()*256,rnd()*256,6,3)}},9,3);
 var fc=h.plane(28,6.2,5.5,.015,3.3,new T.MeshStandardMaterial({map:tiles,roughness:.4,metalness:.1}),0,-Math.PI/2);
 /* stadium behind: facade, towers, haze */
 facade(h,44,11,6,5.5,-7,{rows:4,stripe:S.c1});
 h.bx(44,.6,3,6,11.3,-8.5,h.M('#10131f'));
 for(var i=0;i<14;i++){var lx=-12+i*3.2;h.plane(.5,.3,lx,11.4,-6.9,h.BM('#e8f0ff',1.5),0);}
 h.glow('#bcd4ff',6,11.8,-6,32,6,.55);
 [-6.5,6.9,19.5].forEach(function(x,i){h.tower(x,-5.2,i==1?10.5:9,{pw:i==1?6.4:5,ph:3.4,gs:i==1?16:12,gop:.6})});
 h.banner('All Together',S.c1,'#f4f1ff',9,2.8,14.5,6.6,-6.9,0,{k:.5});
 /* front wall with gate opening */
 var brk=c.brick(10,6,2),cc=h.M('#ffffff',{map:c.concrete('#7a7e8c',6,1),roughness:.85});
 var bm=h.M('#ffffff',{map:brk,roughness:.9});
 [[-10,5.3],[8.5,22]].forEach(function(p){var Lw=p[1]-p[0];h.bx(Lw,2.5,.5,(p[0]+p[1])/2,1.25,.75,bm);h.bx(Lw,1.9,.5,(p[0]+p[1])/2,3.45,.75,cc)});
 h.bx(3.2,1.2,.5,6.9,4.4,.75,cc);h.bx(.3,3.4,.55,5.15,1.7,.75,h.M('#14161e'));h.bx(.3,3.4,.55,8.65,1.7,.75,h.M('#14161e'));
 h.bx(22.5,.2,.7,5.5,4.55+.1,.78,h.M('#10131f'));
 h.signBoard('Entrance','#0e1220','#f4f1ff',2.6,.7,6.9,4.0,1.06,0,{emi:.9,glow:'#ff3a4a',border:true});
 h.bx(3.6,.14,3.2,6.9,3.25,.1,h.M('#2a2e3a',{metalness:.5}));[5.2,8.6].forEach(function(x){h.cyl(.06,.06,3.25,x,1.6,1.7,h.M('#2a2e3a',{metalness:.5}),null,6)});
 h.strip(6.9,3.16,.6,3.0,.16,'#e8f0ff',1.8);h.strip(6.9,3.16,1.6,3.0,.16,'#e8f0ff',1.8);
 h.plane(3.1,3.3,6.9,1.65,-1.5,new T.MeshBasicMaterial({map:h.tx(64,256,function(g){var gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#cfe0ff');gr.addColorStop(.6,'#7a8ec8');gr.addColorStop(1,'#242a46');g.fillStyle=gr;g.fillRect(0,0,64,256)},1,1)}),0);
 h.glow('#bcd4ff',6.9,1.9,-.2,5.5,5,.5);
 [5.9,6.9,7.9].forEach(function(x){turnstile(h,x,1.1,0)});
 /* hoardings on the wall */
 [['Coffee','#0e1220','#f4f1ff',.2],['Drinks','#d8e0f8','#14141c',2.8],['Transport','#0e1220',S.c1,11.2],['Insurance',S.c1,'#f4f1ff',14.2],['Tickets','#0e1220','#f4f1ff',17.2]].forEach(function(b){h.signBoard(b[0],b[1],b[2],2.2,.9,b[3]+1,1.55,1.015,0,{emi:.45})});
 /* barriers channelling the queue */
 h.rail(5.15,2.2,4.6,8.5,0,1.1);h.rail(8.65,2.2,9.2,8.5,0,1.1);h.rail(-1,2.6,3.4,2.6,0,1.1);h.rail(10.6,2.6,16,2.6,0,1.1);
 /* scarf stall (left) */
 var st=new T.Group();st.position.set(1.3,0,4.2);w.add(st);
 h.bx(2.6,.9,.9,0,.45,0,h.M('#20242f'),st);h.bx(2.7,.08,1.0,0,.92,0,h.M('#5a5e70'),st);
 [-1.2,1.2].forEach(function(x){h.cyl(.04,.04,2.6,x,1.3,-.4,h.M('#2a2e3a',{metalness:.6}),st,6);h.cyl(.04,.04,2.6,x,1.3,.4,h.M('#2a2e3a',{metalness:.6}),st,6)});
 var aw=h.tx(256,64,function(g){for(var i=0;i<8;i++){g.fillStyle=i%2?S.c2:S.c1;g.fillRect(i*32,0,32,64)}},1,1);var awn=new T.Mesh(new T.PlaneGeometry(2.9,1.3),new T.MeshStandardMaterial({map:aw,side:T.DoubleSide,roughness:.9}));awn.position.set(0,2.6,0);awn.rotation.x=-Math.PI/2+.3;st.add(awn);
 for(i=0;i<7;i++){var sm=h.flagMat(i%2?S.c1:S.c2,i%2?S.c2:S.c1,'','stripes');var sc=new T.Mesh(new T.PlaneGeometry(.22,.95),sm);sc.position.set(-1.05+i*.35,1.95,.1);st.add(sc)}
 for(i=0;i<9;i++)h.glow('#ffe6cf',-1.2+i*.3,2.45-Math.abs(i-4)*.04,.5,.5,.5,.8,st);
 h.fan(1.3,4.75,Math.PI-.15,'talk',{top:'#2a3a6a',jacket:'#14141c',beanie:S.c1,scarf:[S.c1,S.c2]});
 h.P({skin:SK(2),top:'#14141c',apron:'#2a2e3a',bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.1,mode:'talk'},1.3,3.55,0);
 c.light('point','#ffb48a',1.1,1.3,3.1,5.0,9);
 /* police van + officers (right) */
 var van=c.car(12.0,3.5,Math.PI/2+.05,'#dfe4f4');van.scale.set(1.25,1.25,1.25);
 var strp=new T.Mesh(new T.BoxGeometry(4.3,.22,1.86),new T.MeshStandardMaterial({color:'#243a8a',roughness:.5}));strp.position.set(0,.85,0);van.add(strp);
 h.bx(.7,.14,1.2,-.1,2.3,0,h.BM('#3a7aff',1.6),van);h.glow('#3a7aff',12.0,2.85,3.5,5,3.2,.7);h.glow('#ff2a3a',12.0,2.85,3.5,3,2,.4);
 h.cop(9.9,3.3,-.4,'idle');h.cop(9.3,3.9,.2,'talk',{style:'buzz'});
 /* lamps, banners, flags */
 h.lamp(-2.0,6.4,6.2,{light:true});h.lamp(12.2,6.8,6.2);
 c.banner(2.2,2.7,2.0,1.3,'Together',S.c1,'#f4f1ff');c.banner(11.2,2.7,2.0,1.3,'Stand','#14141c',S.c1);
 /* queue + crowd */
 var qs=[[5.9,2.9,'idle'],[7.0,3.0,'talk'],[7.9,3.1,'idle'],[6.3,4.0,'idle'],[7.5,4.1,'listen'],[6.0,5.2,'talk'],[6.9,5.0,'idle'],[8.0,5.2,'idle'],[5.6,6.3,'idle'],[7.2,6.2,'listen']];
 qs.forEach(function(q,i){h.fan(q[0]+rr(-.1,.1),q[1],Math.PI+(rnd()-.5)*.5-(q[2]=='talk'?.7:0),q[2])});
 h.steward=h.P({skin:SK(1),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'short',w:1.1,mode:'idle',cap:'#14141c'},5.95,1.2,.1);
 h.P({skin:SK(3),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'buzz',w:1.15,mode:'talk'},7.85,1.15,-.2);
 [[3.0,5.4,.3,'talk'],[3.9,5.6,-.5,'talk'],[10.4,6.3,-.4,'sing'],[11.5,5.7,.2,'cheer'],[12.4,6.4,-.1,'sing'],[0.0,6.4,.5,'idle']].forEach(function(p){h.fan(p[0],p[1],p[2],p[3],p[3]=='sing'||p[3]=='cheer'?{scarf:[S.c1,S.c2],top:S.c1}:null)});
 var spots=[];for(i=0;i<60;i++){var px=rr(-6,18),pz=rr(7.8,10.6);spots.push({x:px,y:0,z:pz,ry:Math.PI+rr(-.6,.6),up:.2})}
 for(i=0;i<22;i++)spots.push({x:rr(4.6,9.2),y:0,z:rr(7.4,9.6),ry:Math.PI+rr(-.3,.3),up:.1});
 for(i=0;i<24;i++)spots.push({x:rr(-6,-1),y:0,z:rr(2.6,7),ry:rr(-3,3),up:.2});
 h.crowd(spots,{dim:.42});
 h.flag(10.2,0,5.8,1.7,1.1,h.flagMat(S.c1,S.c2,'','band'),3.6);h.flag(12.6,0,8.4,1.6,1.0,h.flagMat('#14141c',S.c1,'All of Us','band'),3.3);h.flag(-1.6,0,9.0,1.8,1.1,h.flagMat(S.c2,S.c1,'','stripes'),3.4);
 h.flare(11.8,1.9,6.0,true);h.flare(2.2,1.7,6.2);h.flare(-1.8,2.0,7.8);
 /* reflections on wet ground */
 wetDisc(h,6.9,4.5,'#bcd4ff',4,6,.25);wetDisc(h,-2,6.4,'#ff9a64',2.6,4.6,.35);wetDisc(h,12.2,6.8,'#ff9a64',2.6,4.6,.3);wetDisc(h,13.4,5.8,'#3a7aff',4,3,.28);wetDisc(h,11.8,6.4,'#ff2a3a',2,2,.3);
 h.haze('#8a96c8',6,3,0,16,6,.06);
 c.light('point','#dfe8ff',1.3,6.9,4.2,6,15);c.setCam(6.0,3.6,15.5,6.2,4.6,0,48,66)}});
/* ===================== bloomfield-tunnel ===================== */
RM.def('bloomfield-tunnel',{kind:'stadium',geo:'tunnel',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('night');c.fog('#0a0e22',9,40);
 var X0=.2,X1=5.8,CX=3,HT=3.2,Z0=.3,Z1=10;
 /* floor */
 var ft=c.concrete('#6a6e7c',3,4);var fl=h.plane(X1-X0,Z1-Z0,CX,0,(Z0+Z1)/2,new T.MeshStandardMaterial({map:ft,roughness:.28,metalness:.15}),0,-Math.PI/2);
 /* walls: tile dado + painted band */
 var L=Z1-Z0;
 var wt=h.tx(512,656,function(g,W,Hh){g.fillStyle='#363e5c';g.fillRect(0,0,W,Hh);for(var i=0;i<1600;i++){g.fillStyle=rnd()>.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.05)';g.fillRect(rnd()*W,rnd()*Hh*.6,rnd()*30+4,3)}
   g.fillStyle=S.c1;g.fillRect(0,Hh*.40,W,Hh*.05);g.fillStyle='#f4f1ff';g.fillRect(0,Hh*.45,W,Hh*.012);
   var ty=Hh*.47;for(var yy=ty;yy<Hh;yy+=41){for(var xx=0;xx<W;xx+=64){g.fillStyle=((xx/64+yy/41)%7<1)?'#aab4d2':'#cfd6ea';g.fillRect(xx+2,yy+2,60,37)}}
   for(i=0;i<20;i++){g.fillStyle='rgba(20,24,40,.25)';g.fillRect(rnd()*W,Hh*.55+rnd()*Hh*.4,3,rnd()*60)}},L/2.4,1);
 var wm=new T.MeshStandardMaterial({map:wt,roughness:.35,metalness:.05});
 var lw=h.plane(L,HT,X0,HT/2,(Z0+Z1)/2,wm,Math.PI/2);lw.geometry.dispose();lw.geometry=new T.PlaneGeometry(L,HT);lw.rotation.y=Math.PI/2;
 var rw=h.plane(L,HT,X1,HT/2,(Z0+Z1)/2,wm,-Math.PI/2);
 /* wall plane faces are rotated about Y: length axis maps to z */
 /* ceiling + cable trays + pipes */
 var ct=c.concrete('#4a4e5c',3,3);h.plane(X1-X0,L,CX,HT,(Z0+Z1)/2,new T.MeshStandardMaterial({map:ct,roughness:.9}),0,Math.PI/2);
 var pm=h.M('#8a92a6',{metalness:.7,roughness:.35}),pr=h.M(S.c1,{roughness:.5,metalness:.3});
 h.bar(1.1,HT-.25,Z0,1.1,HT-.25,Z1,.1,pm);h.bar(1.45,HT-.2,Z0,1.45,HT-.2,Z1,.06,pr);h.bar(4.9,HT-.25,Z0,4.9,HT-.25,Z1,.09,pm);
 h.bx(.5,.07,L,CX,HT-.12,(Z0+Z1)/2,h.M('#20242f',{metalness:.5}));
 for(var i=0;i<10;i++)h.bx(.5,.1,.04,CX,HT-.12,Z0+.5+i*1.0,h.M('#14161e'));
 /* strip lights */
 for(i=0;i<7;i++){var z=1.0+i*1.25;h.bx(1.9,.06,.22,CX,HT-.2,z,h.BM('#e8f0ff',1.9));h.glow('#cfe0ff',CX,HT-.35,z,3.6,1.6,.45);
  var pool=new T.Mesh(new T.PlaneGeometry(4.6,1.6),new T.MeshBasicMaterial({color:'#9ab4ff',map:c.glowTex(),transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(CX,.02,z);w.add(pool)}
 c.light('point','#dfe8ff',1.3,CX,2.6,7.0,9);c.light('point','#dfe8ff',1.2,CX,2.6,4.0,9);
 var gl=c.light('point','#8affb8',1.6,CX,1.5,-.4,10);
 /* end opening: concrete frame + glowing pitch beyond */
 var cm=h.M('#ffffff',{map:c.concrete('#5a5e6c',2,1),roughness:.85});
 h.bx(1.0,HT,.7,.7,HT/2,Z0-.3,cm);h.bx(1.0,HT,.7,5.3,HT/2,Z0-.3,cm);h.bx(3.8,.6,.7,CX,HT-.3,Z0-.3,cm);
 var far=h.tx(512,320,function(g,W,Hh){var gr=g.createLinearGradient(0,0,0,Hh);gr.addColorStop(0,'#0a1030');gr.addColorStop(.35,'#1a2a58');gr.addColorStop(.62,'#6a86c8');gr.addColorStop(.7,'#d8f4e0');gr.addColorStop(.74,'#3cb868');gr.addColorStop(1,'#1a6a3a');g.fillStyle=gr;g.fillRect(0,0,W,Hh);
   for(var i=0;i<260;i++){var cx=rnd()*W,cy=Hh*(.18+rnd()*.38);g.fillStyle=[__CK.a,'#f4f1ff','#8aa8ff','#ff9a64'][i%4];g.globalAlpha=.4+rnd()*.5;g.fillRect(cx,cy,3,4)}g.globalAlpha=1;
   for(i=0;i<5;i++){g.fillStyle='rgba(230,245,255,.9)';g.beginPath();g.arc(60+i*100+rnd()*30,40,12,0,7);g.fill()}},1,1);
 h.plane(5.6,3.2,CX,1.45,-2.2,new T.MeshBasicMaterial({map:far,fog:false}),0);
 var gt=h.tx(256,256,function(g,W,Hh){for(var i=0;i<8;i++){g.fillStyle=i%2?'#3fbf6c':'#2f9a56';g.fillRect(0,i*32,W,32)}},1,1);
 h.plane(3.8,3,CX,0,-1.0,new T.MeshBasicMaterial({map:gt,color:new T.Color(1.2,1.2,1.2)}),0,-Math.PI/2);
 h.glow('#bfffd8',CX,1.3,-.2,6.5,4.2,.75);h.glow('#ffffff',CX,1.6,.1,3,3,.5);
 /* sign + fixtures */
 h.signBoard('To the Pitch ←','#0b1a14','#7dffb0',2.2,.6,CX,2.55,Z0+4.2,0,{emi:.9,glow:'#4aff8a',border:true,k:.5});
 h.cyl(.012,.012,.6,CX-.9,2.9,Z0+4.2,pm,null,4);h.cyl(.012,.012,.6,CX+.9,2.9,Z0+4.2,pm,null,4);
 /* hose cabinet + extinguishers */
 h.bx(.22,.9,.7,X0+.12,1.4,2.2,h.M('#c4283a',{roughness:.4}));h.signBoard('Fire Exit','#f4f1ff','#c4283a',.5,.16,X0+.25,1.95,2.2,Math.PI/2,{emi:.4,k:.6});
 h.cyl(.07,.07,.5,X0+.14,.5,3.1,h.M('#c4283a',{roughness:.4}),null,10);h.cyl(.07,.07,.5,X0+.14,.5,3.3,h.M('#c4283a',{roughness:.4}),null,10);
 /* mural/stripe + crest-less lettering on the right wall */
 h.signBoard('Home','#10131f',S.c1,1.5,.45,X1-.02,2.2,4.2,-Math.PI/2,{emi:.5,border:true});
 h.signBoard('Together','#f4f1ff',S.c1,1.1,.4,X1-.02,2.2,7.5,-Math.PI/2,{emi:.5});
 /* benches + kit bags + cones */
 h.bx(.5,.07,2.0,X1-.4,.45,2.7,h.M('#3a3e50',{roughness:.6}));[1.9,3.5].forEach(function(z){h.bx(.08,.45,.4,X1-.4,.22,z,h.M('#20242f'))});
 [[X1-.45,2.3,'#1c2030'],[X1-.45,3.0,S.c1]].forEach(function(b){h.rb(.5,.3,.3,.06,b[0],.65,b[1],h.M(b[2],{roughness:.7}))});
 [[1.4,4.8],[4.6,6.4],[1.2,8.4]].forEach(function(p){var cone=h.cyl(.03,.17,.45,p[0],.22,p[1],h.M('#e8503a',{roughness:.5}),null,10);h.cyl(.1,.12,.1,p[0],.28,p[1],h.M('#f4f1ff'),null,10)});
 /* floor lines + cables */
 h.plane(.14,L,CX-1.55,.012,(Z0+Z1)/2,h.BM('#f4f1ff',.9),0,-Math.PI/2);h.plane(.14,L,CX+1.55,.012,(Z0+Z1)/2,h.BM(S.c1,1),0,-Math.PI/2);
 /* people */
 h.P({skin:SK(2),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'buzz',w:1.12,mode:'lean',cap:'#14141c',s:.86},1.0,4.6,.8);
 h.P({skin:SK(0),top:S.c1,jacket:'#1c2030',bot:'#1c2030',hair:'#2a1d16',style:'short',w:1.0,mode:'talk',collar:S.c2,s:.86},4.7,5.2,-.9);
 h.P({skin:SK(3),top:'#e8eaf6',jacket:S.c1,bot:'#1c2030',hair:'#14100e',style:'curly',w:1.05,mode:'listen',s:.86},4.2,5.0,.6);
 h.fan(3.45,3.2,Math.PI,'idle',{top:S.c1,jacket:'#14141c',scarf:[S.c1,S.c2]});
 h.fan(2.5,2.4,Math.PI,'sing',{scarf:[S.c2,S.c1]});
 h.fan(3.9,1.8,Math.PI,'cheer');
 h.haze('#8aa0d8',CX,1.6,3,5.5,3.2,.05);h.haze('#bfffd8',CX,1.4,.8,5,3,.07);
 c.setCam(CX,1.8,8.9,CX,1.5,0,50,64)}});
RM.def('tunnel',RM.defs['bloomfield-tunnel']);
/* ---- generic pitch-side stand scene (terrace / curva / away / salzburg) ---- */
function standRoom(c,cfg){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 var env=h.env(cfg.env||'night');if(cfg.fog)c.fog(cfg.fog[0],cfg.fog[1],cfg.fog[2]);
 var x0=cfg.x0,x1=cfg.x1,cx=(x0+x1)/2,z0=cfg.z0,rows=cfg.rows,rise=cfg.rise||.42,run=cfg.run||.85;
 /* pitch */
 var pt=h.pitchTex(10,10);var pz=cfg.pitchZ||7.7;
 var pitch=h.plane(120,60,cx,-.02,pz+30,new T.MeshStandardMaterial({map:pt,emissive:'#ffffff',emissiveMap:pt,emissiveIntensity:cfg.pitchGlow||.32,roughness:.95}),0,-Math.PI/2);
 h.plane(120,.2,cx,.0,pz+2.2,h.BM('#e8f0ff',.9),0,-Math.PI/2);
 var walk=h.plane(x1-x0+30,pz-z0+.5,cx,.0,(pz+z0)/2-.25,new T.MeshStandardMaterial({map:c.concrete(cfg.walk||'#5c6070',10,1),roughness:.5}),0,-Math.PI/2);walk.position.y=.04;
 /* stand */
 var so={x0:x0,x1:x1,z0:z0,rows:rows,rise:rise,run:run,y0:0,cut:cfg.cut};h.stand(so);
 var spots=h.fill(so,{dx:cfg.dx||.5,p:cfg.p==null?.92:cfg.p,up:cfg.up==null?.28:cfg.up,skip:cfg.skip});
 h.crowd(spots,{pal:cfg.pal,up:cfg.up,dim:cfg.dim||.82});
 var topY=rise*rows,backZ=z0-rows*run;
 h.bx(x1-x0,topY+2.5,.5,cx,(topY+2.5)/2,backZ-.2,h.M('#ffffff',{map:c.concrete('#4a4e5c',6,1),roughness:.9}));
 /* roof canopy */
 if(cfg.roof!==false){var ry=cfg.roofY||8.2,rz1=cfg.roofFront||3.0;h.bx(x1-x0+2,.35,rz1-backZ+1,cx,ry,(rz1+backZ)/2,h.M('#1a1e2a',{metalness:.4,roughness:.6}));
  for(var i=0;i<=8;i++){var tx=x0+(x1-x0)*i/8;h.bar(tx,ry-.2,rz1,tx,ry-2.6,rz1-.3,.07,h.M('#2a2e3a',{metalness:.6}));h.bar(tx,ry-.2,rz1,tx,ry-.2,backZ,.05,h.M('#2a2e3a',{metalness:.6}))}
  var nl=Math.max(4,Math.round((x1-x0)/4.2));for(i=0;i<nl;i++){var lx=x0+(x1-x0)*(i+.5)/nl;h.bx(1.9,.7,.2,lx,ry-.45,rz1+.15,h.M('#1a1e28'));for(var k=0;k<4;k++)h.plane(.34,.34,lx-.7+k*.47,ry-.45,rz1+.26,h.BM('#e8f0ff',1.8),0);h.glow('#cfe0ff',lx,ry-.5,rz1+.6,5.2,3.2,.75);
   var pool=new T.Mesh(new T.PlaneGeometry(6,4),new T.MeshBasicMaterial({color:'#9ab4ff',map:c.glowTex(),transparent:true,opacity:.16,blending:T.AdditiveBlending,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(lx,.05,pz-1);w.add(pool)}}
 /* fence + hoardings */
 var fz=pz-.1;
 if(cfg.fence==='cage'){h.cage(x0-1,fz,x1+1,fz,0,2.6,{spikes:true})}else{h.rail(x0-1,fz,x1+1,fz,0,1.1,{col:'#4a5064'})}
 var bt=cfg.boards||['Coffee','Drinks','Insurance','Transport','Tickets','Stand'];var bw=3.4,nb=Math.floor((x1-x0+2)/bw);
 for(i=0;i<nb;i++){var b=bt[i%bt.length];var bc=i%3==0?[S.c1,'#f4f1ff']:(i%3==1?['#0e1220','#e8f0ff']:['#e8f0ff','#14161e']);h.signBoard(b,bc[0],bc[1],bw-.12,.9,x0-1+bw*(i+.5),.5,fz+.22,0,{emi:.7,k:.62})}
 /* pitch markings, ball, stewards facing the stand */
 h.plane(120,.14,cx,.0,pz+5.5,h.BM('#e8f0ff',.8),0,-Math.PI/2);
 var ball=new T.Mesh(new T.SphereGeometry(.11,12,10),new T.MeshStandardMaterial({color:'#f4f1ff',roughness:.5}));ball.position.set(cx+3,.1,pz+4.2);w.add(ball);
 for(i=0;i<(cfg.stewards==null?5:cfg.stewards);i++){var sx=x0+2+i*((x1-x0-4)/Math.max(1,(cfg.stewards||5)-1));h.P({skin:SK(i%5),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:i%2?'buzz':'short',w:1.1,mode:'idle',cap:i%2?'#14141c':null,s:.92},sx+rr(-.6,.6),pz+.8,Math.PI+rr(-.3,.3))}
 /* floodlight towers at the sides */
 (cfg.towers||[[x0-5,z0-2,11],[x1+5,z0-2,11]]).forEach(function(t){h.tower(t[0],t[1],t[2],{pw:5,ph:3,gs:14,gop:.55,ry:t[3]||0})});
 h.glow('#8aa0d8',cx,rise*rows*.6,backZ+2,(x1-x0)*1.3,10,.14);
 /* lights on the crowd */
 c.light('dir','#dbe6ff',cfg.dir||.5,cx-4,16,26);
 c.light('point','#ffb48a',.8,cx,3.5,3,16);
 return{h:h,c:c,so:so,topY:topY,backZ:backZ,fz:fz,pz:pz,S:S,cx:cx,rnd:rnd,rr:rr}}
/* standard sculpted front-row fans along the walkway/first rows */
function frontFans(R,list){var h=R.h,S=R.S;list.forEach(function(p){var mode=p[3]||'idle';var o={};if(mode==='sing'||mode==='cheer'||mode==='flare'){o.scarf=[S.c1,S.c2];}if(p[4])Object.assign(o,p[4]);h.fan(p[0],p[1],p[2]||0,mode,o)})}

/* ===================== bloomfield-inside (terrace) ===================== */
RM.def('bloomfield-inside',{kind:'stadium',geo:'terrace',build:function(c){
 var R=standRoom(c,{env:'night',x0:-5,x1:21,z0:6.1,rows:15,cut:{xa:6.2,xb:9.2,from:5},roofY:8.4,towers:[[-8,2,11],[24,2,11],[7.7,-9,12.5]],pal:null,fog:['#080c1e',20,62]});
 var h=R.h,S=R.S,w=c.world,rr=R.rr,rnd=R.rnd;
 /* tunnel mouth in the front retaining wall */
 var cm=h.M('#ffffff',{map:c.concrete('#5a5e6c',3,1),roughness:.85});
 h.bx(3.0,2.5,5.4,7.7,1.25,3.5,cm);h.bx(3.4,.4,.7,7.7,2.7,5.95,h.M('#20242f'));
 var arch=h.tx(128,256,function(g){var gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#05060c');gr.addColorStop(.7,'#20284a');gr.addColorStop(1,'#6a86c8');g.fillStyle=gr;g.fillRect(0,0,128,256)},1,1);
 h.plane(2.4,2.2,7.7,1.15,6.22,new T.MeshBasicMaterial({map:arch}),0);h.glow('#bcd4ff',7.7,.8,6.4,4,3,.4);
 h.signBoard('To the Pitch','#0b1a14','#7dffb0',2.0,.4,7.7,2.88,6.27,0,{emi:.9,glow:'#4aff8a'});
 /* banners hung on the retaining wall + on the rail */
 h.banner('Together',S.c1,'#f4f1ff',3.2,1.0,12.3,1.2,6.35,0,{k:.6});h.banner('Stand','#10131f',S.c1,2.6,.9,3.6,1.2,6.35,0,{k:.6});
 /* walkway people */
 var F=[[2.6,6.9,.3,'sing'],[3.5,6.8,-.2,'cheer'],[4.4,7.0,.4,'sing'],[5.2,6.7,-.3,'flare'],[10.2,6.85,-.1,'cheer'],[11.2,6.8,.3,'sing'],[12.1,6.95,.1,'idle'],[13.0,6.7,-.3,'talk'],[0.6,6.9,.5,'talk'],[1.4,6.7,-.5,'listen']];
 F.forEach(function(p,i){h.fan(p[0],p[1],p[2],p[3],{top:i%3==0?'#14141c':null||S.c1,scarf:[S.c1,S.c2]})});
 h.P({skin:SK(2),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'buzz',w:1.15,mode:'idle',cap:'#14141c',s:.94},14.4,6.9,-1.1);
 h.P({skin:SK(0),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#2a1d16',style:'short',w:1.0,mode:'listen',s:.92},9.8,6.7,.9);
 /* flags + flares in the crowd */
 [[1.0,1.0,2.4],[4.8,1.7,2.0],[10.8,1.7,2.2],[14.8,1.7,2.0],[18,2.1,2.4]].forEach(function(f,i){h.flag(f[0],f[1]+.6,5.2-f[1]*.6,1.9,1.2,h.flagMat(i%2?S.c2:S.c1,i%2?S.c1:S.c2,i==2?'Together':'',i%2?'band':'stripes'),3.4)});
 h.flare(3.9,3.0,3.2);h.flare(11.5,3.4,2.2,true);h.flare(17.6,3.9,0.2);
 h.haze('#ff4a5a',4,4,3,7,5,.12);h.haze('#ff4a5a',11.5,4.6,2,8,5,.12);h.haze('#8a96c8',9,3,4,26,8,.06);
 c.setCam(7.8,3.6,23,7.8,3.2,2.0,47,66)}});
RM.def('terrace',RM.defs['bloomfield-inside']);
/* ===================== gate5 (the curva entrance) ===================== */
RM.def('gate5',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('night');
 var asph=c.asphalt();asph.repeat.set(16,8);h.plane(70,40,4,0,6,new T.MeshStandardMaterial({map:asph,roughness:.34,metalness:.12}),0,-Math.PI/2);
 var tiles=h.tx(256,256,function(g){g.fillStyle='#565a6a';g.fillRect(0,0,256,256);g.strokeStyle='#363a4a';g.lineWidth=4;for(var i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke()}},9,3);
 h.plane(32,7,4,.015,3.5,new T.MeshStandardMaterial({map:tiles,roughness:.4,metalness:.1}),0,-Math.PI/2);
 /* the wall of the end stand */
 var cc=h.M('#ffffff',{map:c.concrete('#6a6e7c',8,2),roughness:.85});
 h.bx(34,9,1.2,4,4.5,-.4,cc);
 facade(h,34,3,4,8.6,.22,{rows:2,lit:.5,stripe:S.c1,base:'#232838'});
 /* gate frame */
 var dk=h.M('#14161e',{metalness:.5,roughness:.5}),stl=h.M('#3a4050',{metalness:.7,roughness:.35});
 h.bx(.6,5.2,1.0,.9,2.6,.3,dk);h.bx(.6,5.2,1.0,7.1,2.6,.3,dk);h.bx(6.8,.9,1.0,4,5.65,.3,dk);
 h.plane(5.4,4.8,4,2.4,-.3,new T.MeshBasicMaterial({map:h.tx(64,256,function(g){var gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#2a0a12');gr.addColorStop(.7,'#8a2438');gr.addColorStop(1,'#ffb4a0');g.fillStyle=gr;g.fillRect(0,0,64,256)},1,1)}),0);
 h.glow('#ff6a7a',4,1.8,.9,8,5,.28);h.glow('#ffd0c0',4,1.0,1.4,4,2.4,.3);
 /* open steel gate leaves */
 var barsT=h.tx(128,256,function(g){g.clearRect(0,0,128,256);g.fillStyle='#9aa2b6';for(var i=6;i<128;i+=16)g.fillRect(i,0,6,256);g.fillRect(0,6,128,8);g.fillRect(0,120,128,8);g.fillRect(0,240,128,8)},1,1);
 [-1,1].forEach(function(s){var gm=new T.Mesh(new T.PlaneGeometry(2.7,4.5),new T.MeshStandardMaterial({map:barsT,transparent:true,alphaTest:.3,side:T.DoubleSide,metalness:.6,roughness:.4}));gm.position.set(4+s*3.9,2.35,1.4+.2);gm.rotation.y=s*1.15;w.add(gm);h.bar(4+s*2.9,.05,.55,4+s*2.9,4.6,.55,.07,stl)});
 [3.0,4.0,5.0].forEach(function(x){turnstile(h,x,.9,0)});
 /* the giant 5 */
 var five=h.tx(512,512,function(g,W,Hh){g.fillStyle='#10121c';g.fillRect(0,0,W,Hh);g.strokeStyle=S.c1;g.lineWidth=26;g.strokeRect(24,24,W-48,Hh-48);g.font='900 430px Arial Black, Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=40;g.strokeStyle=S.c1;g.strokeText('5',W/2,Hh/2+20);g.fillStyle='#f4f1ff';g.fillText('5',W/2,Hh/2+20)},1,1);
 var fm=new T.MeshStandardMaterial({map:five,emissive:'#ffffff',emissiveMap:five,emissiveIntensity:.85,roughness:.5});
 h.bx(5.6,5.6,.3,4,8.55,.2,h.M('#14161e'));h.plane(5.2,5.2,4,8.55,.38,fm,0);h.glow('#ff2a4a',4,8.55,.9,10,8,.35);h.glow('#ffffff',4,8.55,.9,5,5,.2);
 h.signBoard('GATE','#10121c','#f4f1ff',2.2,.6,4,5.7,.88,0,{emi:.9,border:true,glow:'#ff3a4a'});
 /* graffiti wall to the left */
 var gt=h.tx(1024,512,function(g,W,Hh){g.fillStyle='#5a5e6c';g.fillRect(0,0,W,Hh);for(var i=0;i<1400;i++){g.fillStyle=rnd()>.5?'rgba(255,255,255,.04)':'rgba(0,0,0,.07)';g.fillRect(rnd()*W,rnd()*Hh,rnd()*40,4)}
  g.lineJoin='round';g.textAlign='center';g.textBaseline='middle';g.font='900 190px Arial Black, Arial';g.lineWidth=26;g.strokeStyle='#10121c';g.strokeText('ULTRAS',360,210);g.fillStyle=S.c1;g.fillText('ULTRAS',360,210);g.lineWidth=6;g.strokeStyle='#f4f1ff';g.strokeText('ULTRAS',354,204);
  g.font='900 110px Arial Black, Arial';g.lineWidth=18;g.strokeStyle='#10121c';g.strokeText('SEZIONE',740,400);g.fillStyle='#f4f1ff';g.fillText('SEZIONE',740,400);
  g.fillStyle=S.c1;for(i=0;i<5;i++){g.beginPath();var x=100+i*46;g.moveTo(x,60);g.lineTo(x+14,100);g.lineTo(x-14,100);g.fill()}
  g.strokeStyle='#4a6aff';g.lineWidth=9;g.beginPath();g.moveTo(640,70);g.bezierCurveTo(700,10,800,130,900,50);g.stroke();
  g.fillStyle='rgba(216,40,62,.8)';for(i=0;i<22;i++)g.fillRect(180+rnd()*360,230,3,rr(20,90));h.text(g,'All Together',300,330,56,'#f4f1ff','bold')},1,1);
 h.plane(9,4.5,-6,2.25,.35,new T.MeshStandardMaterial({map:gt,roughness:.8}),0);
 /* barriers + lamps + banners + flags */
 h.rail(.6,1.8,.6,8.5,0,1.1);h.rail(7.4,1.8,7.4,8.5,0,1.1);h.rail(-2,3.5,.2,3.5,0,1.1);h.rail(7.8,3.5,13,3.5,0,1.1);
 h.lamp(-3.5,6.2,6.2,{light:true});h.lamp(13.5,6.8,6.2);
 c.banner(-.8,2.6,2.0,1.3,('GATE '+__CK.n2),S.c1,'#f4f1ff');c.banner(8.8,2.6,2.0,1.3,'Together','#14141c',S.c1);
 [[10.2,5.4],[11.6,7.2],[-1.8,7.4]].forEach(function(f,i){h.flag(f[0],0,f[1],1.8,1.1,h.flagMat(i%2?S.c2:S.c1,i%2?S.c1:S.c2,'',i%2?'band':'stripes'),3.7)});
 /* towers behind */
 [-7,15].forEach(function(x){h.tower(x,-3,12,{pw:5,ph:3.2,gs:16,gop:.6})});
 c.light('point','#ff3a5a',.6,4,3.2,3.2,9);c.light('point','#dfe8ff',1.0,4,5,9,16);
 /* fans streaming in: walkers + queue + crowd */
 var W=[[[-5,3.4],[11,3.6],1.5],[[12,4.4],[-3,4.6],1.2],[[-4,5.6],[10,5.4],1.7]];
 W.forEach(function(p,i){h.fan(p[0][0],p[0][1],0,'walk',{path:p[1]?[p[0],p[1]]:[p[0],p[0]],spd:p[2],scarf:[S.c1,S.c2],top:i%2?S.c1:'#14141c'})});
 [[3.0,3.6,'idle'],[4.1,3.8,'talk'],[5.0,3.5,'idle'],[3.5,4.9,'listen'],[4.6,5.0,'idle'],[3.1,6.1,'idle'],[5.1,6.0,'talk'],[4.0,7.0,'idle']].forEach(function(q){h.fan(q[0],q[1],Math.PI+(rnd()-.5)*.4,q[2],{scarf:[S.c1,S.c2]})});
 [[9.0,6.0,-.5,'sing'],[10.1,5.2,-.2,'cheer'],[8.6,7.0,.3,'sing'],[11.4,6.2,-.6,'flare'],[-1.6,5.8,.5,'sing'],[-2.6,6.8,.2,'cheer']].forEach(function(p){h.fan(p[0],p[1],p[2],p[3],{scarf:[S.c1,S.c2],top:S.c1})});
 h.cop(7.9,4.6,-.9,'idle');h.cop(.3,5.2,.9,'talk',{style:'buzz'});
 var spots=[];for(var i=0;i<60;i++)spots.push({x:rr(-7,14),y:0,z:rr(8,11.4),ry:Math.PI+rr(-.6,.6),up:.35});for(i=0;i<20;i++)spots.push({x:rr(2.4,5.6),y:0,z:rr(7.6,9.4),ry:Math.PI+rr(-.3,.3),up:.15});
 h.crowd(spots,{dim:.42});
 h.flare(9.6,2.0,5.9,true);h.flare(11.8,2.1,6.6);h.flare(-2.4,2.0,6.4);h.flare(8.4,1.9,7.6);
 h.haze('#ff3a5a',10,3,5.5,6,5,.1);h.haze('#ff3a5a',-2.2,3,6,5,5,.08);h.haze('#8a96c8',4,4,4,18,7,.05);
 [[4,4.5,'#ff9aa8',5,7,.18]].forEach(function(p){var s=new T.Mesh(new T.PlaneGeometry(6,7),new T.MeshBasicMaterial({color:'#ff5a6a',map:c.glowTex(),transparent:true,opacity:.16,blending:T.AdditiveBlending,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(4,.025,3.2);w.add(s)});
 wetDisc(h,10,6,'#ff2a3a',4,3,.3);wetDisc(h,-3.6,6.8,'#ff9a64',2.6,4.6,.3);
 c.setCam(4.2,2.8,15.4,4.2,3.6,0,50,68)}});

/* ===================== gate5-stand (the curva) ===================== */
RM.def('gate5-stand',{kind:'stadium',build:function(c){
 var R=standRoom(c,{env:'night',x0:-6,x1:14,z0:6.1,rows:13,roofY:10.4,roofFront:3.4,up:.5,p:.96,dx:.46,dim:.9,fence:'rail',stewards:0,boards:['Together','ULTRAS','CURVA'],towers:[[-9,1,11],[17,1,11]],pitchGlow:.28,fog:['#080c1e',20,62]});
 var h=R.h,S=R.S,w=c.world,rr=R.rr,rnd=R.rnd,cx=R.cx;
 /* back-wall banner + tifo */
 h.bx(20,3.2,.3,cx,7.3,R.backZ-.1,h.M('#ffffff',{map:c.concrete('#4a4e5c',6,1),roughness:.9}));
 h.signBoard('Together to the End',S.c1,'#f4f1ff',11,2.0,cx,8.1,R.backZ+.12,0,{emi:.45,border:true,k:.62,glow:'#ff2a4a'});
 h.plane(2.6,2.6,cx-8.4,8.1,R.backZ+.12,new T.MeshBasicMaterial({color:'#10121c'}),0);h.signBoard('5','#10121c','#f4f1ff',2.4,2.4,cx-8.4,8.1,R.backZ+.15,0,{emi:.8,border:true,k:.9});
 h.signBoard('5','#10121c','#f4f1ff',2.4,2.4,cx+8.4,8.1,R.backZ+.15,0,{emi:.8,border:true,k:.9});
 /* fence banners */
 h.banner('CURVA 5',S.c1,'#f4f1ff',3.4,.95,1.0,1.2,R.fz-.05,0,{k:.6});h.banner('ULTRAS','#10131f',S.c1,3.4,.95,7.0,1.2,R.fz-.05,0,{k:.5});
 /* capo platform + drums */
 h.bx(1.4,1.25,1.0,4.0,.62,6.9,h.M('#2a2e3a',{metalness:.5}));
 var capo=h.P({skin:SK(2),top:S.c1,jacket:'#14141c',bot:'#14141c',hair:'#14100e',style:'buzz',stubble:true,w:1.2,mode:'cheer',scarf:[S.c1,S.c2],tat:true,s:.96},4.0,6.9,Math.PI*.95);capo.position.y=1.25;
 [-3.2,11.2].forEach(function(sx){h.P({skin:SK(1),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'short',w:1.1,mode:'idle',s:.92},sx,8.5,Math.PI)});
 var dm=h.M('#20242f',{roughness:.5,metalness:.4});
 [[7.4,6.9,.2],[8.5,6.8,-.1],[9.6,6.9,.3]].forEach(function(d,i){h.bx(1.6,.6,1.2,d[0],.3,d[1],h.M('#2a2e3a',{metalness:.5}));h.cyl(.4,.4,.7,d[0],1.0,d[1],h.M(i==1?S.c1:'#20242f',{roughness:.5,metalness:.3}),null,18);h.cyl(.4,.4,.04,d[0],1.37,d[1],h.M('#e8eaf6',{roughness:.6}),null,18);
  var dr=h.P({skin:SK((i*2+1)%5),top:i==1?S.c1:'#14141c',bot:'#14141c',hair:'#14100e',style:i%2?'short':'buzz',w:1.15,mode:'cheer',s:.92,scarf:[S.c1,S.c2]},d[0]+.7,d[1]-.1,-Math.PI/2);dr.position.y=.6});
 var F=[[0.6,6.9,.2,'sing'],[1.7,6.7,-.3,'cheer'],[2.6,7.0,.4,'flare'],[5.6,6.8,-.2,'sing'],[6.4,7.0,.3,'cheer'],[11.2,6.8,-.3,'sing'],[12.2,6.9,.2,'cheer'],[13.0,6.7,-.4,'talk'],[-.6,6.8,.3,'sing'],[-1.8,6.9,-.1,'cheer']];
 F.forEach(function(p,i){h.fan(p[0],p[1],p[2],p[3],{scarf:[S.c1,S.c2],top:i%2?S.c1:'#14141c'})});
 /* flags & flares & smoke */
 for(var i=0;i<12;i++){var fx=-4.5+i*1.7,row=Math.floor(rr(1,8));h.flag(fx,row*.42+.4,5.2-row*.85,1.8+rr(0,.8),1.15,h.flagMat(i%3?S.c1:S.c2,i%3?S.c2:S.c1,i==4?'5':'',i%2?'band':'stripes'),3.6+rr(0,1))}
 [[0.5,3.2,1.8],[3.0,3.6,.8],[6.0,2.4,3.4],[8.4,3.8,.4],[11.0,3.0,2.2],[13.0,3.4,3.6],[-2,2.4,3.6]].forEach(function(f,k){h.flare(f[0],f[1],f[2],k==1||k==4)});
 h.haze('#ff3a5a',3,4,3.5,8,7,.22);h.haze('#ff3a5a',10,4.4,2,9,7,.22);h.haze('#ff6a7a',6.5,5,0,12,8,.16);h.haze('#8a96c8',cx,3,4,26,8,.08);
 c.setCam(cx,3.0,18.2,cx,3.5,2.0,45,66)}});
RM.def('curva',RM.defs['gate5-stand']);
/* ===================== undercroft (concourse) ===================== */
RM.def('undercroft',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 c.sky('indoor');c.fog('#0a0c1c',14,46);
 c.light('hemi','#8a96c8',.75,0,0,0,'#2a2434');
 var X0=-2,X1=14,ZB=-1.5,ZF=13,HT=4.0,CX=6;
 /* floor, ceiling, back wall */
 var ft=c.concrete('#585c6c',6,5);h.plane(X1-X0,ZF-ZB,CX,0,(ZF+ZB)/2,new T.MeshStandardMaterial({map:ft,roughness:.3,metalness:.12}),0,-Math.PI/2);
 var ct=c.concrete('#3a3e4c',6,3);h.plane(X1-X0,ZF-ZB,CX,HT,(ZF+ZB)/2,new T.MeshStandardMaterial({map:ct,roughness:.9}),0,Math.PI/2);
 for(var i=0;i<6;i++)h.bx(X1-X0,.5,.5,CX,HT-.25,ZB+1+i*2.5,h.M('#262a38',{roughness:.9}));
 var mural=h.tx(1024,384,function(g,W,Hh){g.fillStyle='#2a3048';g.fillRect(0,0,W,Hh);for(var i=0;i<1200;i++){g.fillStyle=rnd()>.5?'rgba(255,255,255,.04)':'rgba(0,0,0,.08)';g.fillRect(rnd()*W,rnd()*Hh,rnd()*40,3)}
  g.fillStyle=S.c1;g.beginPath();g.moveTo(0,Hh);g.lineTo(0,Hh*.5);g.bezierCurveTo(W*.25,Hh*.2,W*.35,Hh*.7,W*.55,Hh*.4);g.bezierCurveTo(W*.75,Hh*.1,W*.85,Hh*.5,W,Hh*.3);g.lineTo(W,Hh);g.fill();
  g.fillStyle='#f4f1ff';g.beginPath();g.moveTo(0,Hh);g.lineTo(0,Hh*.78);g.bezierCurveTo(W*.3,Hh*.5,W*.5,Hh*.95,W*.7,Hh*.7);g.bezierCurveTo(W*.85,Hh*.55,W*.9,Hh*.75,W,Hh*.62);g.lineTo(W,Hh);g.fill();
  for(i=0;i<16;i++){var px=60+i*60+rr(-10,10),pyy=Hh*.62+rr(-10,10);g.fillStyle='#10121c';g.beginPath();g.arc(px,pyy,15,0,7);g.fill();g.fillRect(px-17,pyy+12,34,70);g.fillRect(px+14,pyy-60,7,70)}
  g.lineJoin='round';g.font='900 150px Arial Black, Arial';g.textAlign='center';g.textBaseline='middle';g.lineWidth=24;g.strokeStyle='#10121c';g.strokeText('ULTRAS',W*.5,Hh*.2);g.fillStyle='#f4f1ff';g.fillText('ULTRAS',W*.5,Hh*.2);
  h.text(g,'To the End',W*.84,Hh*.88,64,'#10121c','900')},1,1);
 h.plane(X1-X0,HT,CX,HT/2,ZB,new T.MeshStandardMaterial({map:c.concrete('#40445a',6,1),roughness:.9}),0);
 h.plane(11,3.4,5.5,1.7,ZB+.02,new T.MeshStandardMaterial({map:mural,emissive:'#fff',emissiveMap:mural,emissiveIntensity:.35,roughness:.8}),0);
 /* side opening to the stairs (cool light) */
 h.bx(.5,HT,3.4,X1+.1,HT/2,3,h.M('#232838'));
 h.plane(2.6,3.4,X1-.2,1.7,3,new T.MeshBasicMaterial({map:h.tx(64,256,function(g){var gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#2a3a7a');gr.addColorStop(.5,'#9ab4ff');gr.addColorStop(1,'#e8f0ff');g.fillStyle=gr;g.fillRect(0,0,64,256)},1,1)}),-Math.PI/2);
 h.glow('#bcd4ff',X1-.6,1.8,3,5,5,.55);
 h.signBoard('To Stand 5 ←','#0e1220','#f4f1ff',2.6,.7,12.2,3.1,6.1,0,{emi:.8,glow:'#ff3a4a',border:true,k:.52});
 /* pillars */
 var pil=function(x,z,band){var pm=h.M('#ffffff',{map:c.concrete('#6a6e7e',1,2),roughness:.85});h.bx(.8,HT,.8,x,HT/2,z,pm);h.bx(.84,.5,.84,x,1.0,z,h.M(band));h.bx(.84,.12,.84,x,1.32,z,h.M('#f4f1ff'));h.bx(.84,.06,.84,x,.03,z,h.M('#14161e'))};
 [[-0.5,3.2],[3.2,3.2],[6.9,3.2],[10.6,3.2],[1.2,8.4],[9.6,8.4]].forEach(function(p,i){pil(p[0],p[1],i%2?S.c1:'#14141c')});
 /* strip lights */
 [[1,1.5],[5,1.5],[9,1.5],[1,5.5],[5,5.5],[9,5.5],[1,9.5],[5,9.5],[9,9.5]].forEach(function(p,i){h.bx(2.2,.07,.24,p[0]+1,HT-.52,p[1],h.BM(i%4==3?'#ffd8c0':'#e8f0ff',1.8));h.glow(i%4==3?'#ffb48a':'#cfe0ff',p[0]+1,HT-.7,p[1],4,1.6,.4)});
 c.light('point','#dfe8ff',1.1,3,3.2,4,12);c.light('point','#dfe8ff',1.0,10,3.2,6,12);
 /* kiosks */
 var kiosk=function(x,z,label,col){var K=new T.Group();K.position.set(x,0,z);w.add(K);h.bx(3.4,1.05,1.1,0,.52,0,h.M('#262a3a',{roughness:.5,metalness:.3}),K);h.bx(3.5,.08,1.2,0,1.08,0,h.M('#8a92a6',{metalness:.7,roughness:.3}),K);
  h.bx(3.4,.9,.5,0,2.1,-.55,h.M('#14161e'),K);h.bx(3.6,.18,1.4,0,3.0,.15,h.M(col),K);
  var menu=h.tx(512,160,function(g,W,Hh){g.fillStyle='#0a0d18';g.fillRect(0,0,W,Hh);g.fillStyle=col;g.fillRect(0,0,W,38);h.text(g,label,W/2,20,30,'#fff','900',W*.8);var it=[['Beer','18'],['Hot Dog','15'],['Coffee','8'],['Water','6']];it.forEach(function(r,k){h.text(g,r[0]+'   '+r[1],W/2,70+k*28,22,'#e8eaf6','bold',W*.8)})},1,1);
  var mm=new T.Mesh(new T.PlaneGeometry(3.2,1.0),new T.MeshStandardMaterial({map:menu,emissive:'#fff',emissiveMap:menu,emissiveIntensity:.9}));mm.position.set(0,2.15,-.28);K.add(mm);
  for(var i=0;i<8;i++){var cup=h.cyl(.07,.05,.14,-1.4+i*.4,1.19,.15,h.M(i%2?'#f4f1ff':col),K,8)}
  h.glow(col,x,2.4,z+.3,5,3,.45);return K};
 kiosk(3.0,.3,'Drinks',S.c1);kiosk(9.4,.3,'Snack Bar','#2a5ac8');
 c.light('point','#ffb48a',1.0,3.0,2.9,2.2,7);c.light('point','#8aa8ff',.8,9.4,2.9,2.2,7);
 h.P({skin:SK(1),top:'#e8eaf6',apron:'#14161e',bot:'#14141c',hair:'#14100e',style:'short',w:1.05,mode:'arrange',cap:S.c1,s:.9},2.4,-.5,0);
 h.P({skin:SK(3),top:'#14141c',apron:S.c1,bot:'#14141c',hair:'#14100e',style:'curly',w:1.05,mode:'talk',s:.9},3.7,-.5,0);
 h.P({skin:SK(0),top:'#e8eaf6',apron:'#2a5ac8',bot:'#14141c',hair:'#4a3020',style:'pony',w:.95,mode:'idle',s:.86},9.2,-.5,0);
 /* queue + groups */
 [[2.6,2.2],[2.9,3.1],[2.4,4.0],[3.2,5.0],[2.6,5.9]].forEach(function(p,i){h.fan(p[0]+(i%2)*.2,p[1],Math.PI+(rnd()-.5)*.4,i==2?'talk':'idle',{scarf:[S.c1,S.c2]})});
 [[9.0,2.4],[9.7,3.3]].forEach(function(p){h.fan(p[0],p[1],Math.PI,'idle',{top:'#2a3a6a'})});
 [[5.0,6.2,.6,'sing'],[6.0,6.6,-.5,'sing'],[5.5,5.2,.2,'cheer'],[7.6,9.6,.5,'talk'],[8.6,9.2,-.6,'listen'],[11.0,7.4,-.3,'talk'],[0.4,7.4,.3,'lean'],[12.2,10.5,-.5,'idle']].forEach(function(p){h.fan(p[0],p[1],p[2],p[3],{scarf:[S.c1,S.c2]})});
 h.P({skin:SK(2),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'buzz',w:1.15,mode:'idle',cap:'#14141c',s:.94},11.4,5.0,-1.2);
 var spots=[];for(i=0;i<45;i++)spots.push({x:rr(-1.5,13.5),y:0,z:rr(10.8,12.6),ry:Math.PI+rr(-.6,.6),up:.25});h.crowd(spots,{dim:.38});
 /* props: bins, bench, cups, puddles */
 [[-1.4,1.6],[13.2,9.4],[7.9,.1]].forEach(function(p){h.cyl(.32,.28,.9,p[0],.45,p[1],h.M('#2a5a3a',{roughness:.6}),null,12)});
 h.bx(2.2,.1,.5,6.2,.5,9.9,h.M('#3a3e50'));[5.4,7.0].forEach(function(x){h.bx(.1,.5,.4,x,.25,9.9,h.M('#20242f'))});
 for(i=0;i<26;i++)h.cyl(.06,.045,.13,rr(0,12.5),.065,rr(1,11),h.M(rnd()>.5?'#f4f1ff':S.c1),null,8).rotation.z=rr(-1.2,1.2);
 [[3,3.8,'#ffb48a',4.5,5.5],[9.4,3.2,'#8aa8ff',4,4],[12.7,3,'#bcd4ff',2.4,4]].forEach(function(p){wetDisc(h,p[0],p[1],p[2],p[3],p[4],.3)});
 h.flag(-1.0,0,5.6,1.7,1.1,h.flagMat(S.c1,S.c2,'','band'),3.3);
 h.haze('#8a96c8',6,2.2,5,16,4,.05);
 c.setCam(5.4,2.3,12.6,6.0,1.5,-.4,52,70)}});
RM.def('concourse',RM.defs['undercroft']);

/* ===================== away-end ===================== */
RM.def('away-end',{kind:'stadium',build:function(c){
 var R=standRoom(c,{env:'night',x0:6,x1:20,z0:6.1,rows:11,roofY:7.2,roofFront:3.0,fence:'cage',p:.0,stewards:0,boards:['Insurance','Drinks','Transport','Coffee'],towers:[[3,1,11],[23,1,11]],pitchGlow:.3,fog:['#080c1e',20,62]});
 var h=R.h,S=R.S,w=c.world,rr=R.rr,rnd=R.rnd;var AW=['#3a8ae0','#f4f1ff','#1a3a7a','#2a9a5a','#4a4a56'];
 /* the visitors: a small packed cluster in the middle, empty seats around */
 var so=R.so,spots=[];so._info.forEach(function(row,r){for(var x=so.x0+.3;x<so.x1-.2;x+=.5){var near=(x>10.2&&x<15.6&&r<9);if(!near&&rnd()>.04)continue;if(near&&rnd()>.9)continue;spots.push({x:x+(rnd()-.5)*.14,y:row.y,z:row.z+(rnd()-.5)*.14,up:.35})}});
 h.crowd(spots,{pal:AW,dim:.9,up:.35});
 /* seats on every row */
 var seat=h.tx(128,64,function(g){g.fillStyle='#1c2a5a';g.fillRect(0,0,128,64);g.fillStyle='#2c3e86';for(var i=0;i<8;i++)g.fillRect(i*16+2,8,12,48)},so.x1-so.x0,1);
 so._info.forEach(function(row){h.plane(so.x1-so.x0,.4,(so.x0+so.x1)/2,row.y+.015,row.z-.2,new T.MeshStandardMaterial({map:seat,roughness:.7}),0,-Math.PI/2)});
 /* away flags + banner in their colours */
 [[10.4,5],[12.2,6],[14.2,5.2],[15.2,6.2]].forEach(function(f,i){h.flag(f[0],f[1]*.42+.2,5.4-f[1]*.85,1.7,1.1,h.flagMat(i%2?'#3a8ae0':'#f4f1ff',i%2?'#f4f1ff':'#3a8ae0','',i%2?'band':'stripes'),3.5)});
 h.banner('Visitors','#1a3a7a','#f4f1ff',4.2,1.1,12.6,1.5,6.4,0,{k:.58});
 h.flare(11.2,3.4,3.0,true);h.flare(14.8,3.6,2.4);
 h.haze('#4a86e8',12.6,4,3,8,6,.14);h.haze('#8a96c8',13,3,4,24,8,.06);
 /* police line between cage and visitors + cop van */
 [8.4,9.8,11.2,12.6,14.0,15.4,16.8].forEach(function(x,i){h.cop(x,6.75,Math.PI+(i%2?.08:-.06),'idle',i%3==0?{style:'buzz'}:null)});
 h.cop(18.6,7.2,-.9,'talk');h.cop(7.4,7.1,.9,'idle');
 var van=c.car(19.2,10.4,Math.PI/2,'#dfe4f4');van.scale.set(1.25,1.25,1.25);h.bx(.7,.14,1.2,-.1,2.3,0,h.BM('#3a7aff',1.6),van);h.glow('#3a7aff',19.2,2.9,10.4,5,3.2,.7);
 /* a few home stewards at the gate end */
 h.P({skin:SK(2),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#14100e',style:'buzz',w:1.1,mode:'idle',cap:'#14141c',s:.92},6.6,8.6,Math.PI);
 h.P({skin:SK(0),top:'#e8503a',jacket:'#e8503a',bot:'#14141c',hair:'#2a1d16',style:'short',w:1.1,mode:'idle',s:.92},19.8,8.4,Math.PI);
 /* the exit door at the right of the walkway */
 h.bx(2.6,2.6,.4,17.6,1.3,5.7,h.M('#ffffff',{map:c.concrete('#5a5e6c',2,1)}));h.plane(2.0,2.2,17.6,1.1,5.93,new T.MeshBasicMaterial({color:'#05060c'}),0);
 h.signBoard('Exit','#0b1a14','#7dffb0',1.6,.4,17.6,2.9,5.95,0,{emi:.9,glow:'#4aff8a'});
 c.setCam(12.8,3.2,20.4,12.8,3.1,2.0,46,66)}});
/* ===================== ramat-gan ===================== */
RM.def('ramat-gan',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('night');c.fog('#0a0e24',26,95);
 var asph=c.asphalt();asph.repeat.set(16,10);h.plane(120,70,6,0,-10,new T.MeshStandardMaterial({map:asph,roughness:.32,metalness:.14}),0,-Math.PI/2);
 var tiles=h.tx(256,256,function(g){g.fillStyle='#5a5e6e';g.fillRect(0,0,256,256);g.strokeStyle='#3a3e4e';g.lineWidth=4;for(var i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(256,i);g.stroke()}},18,6);
 h.plane(70,16,6,.015,-12,new T.MeshStandardMaterial({map:tiles,roughness:.38,metalness:.1}),0,-Math.PI/2);
 /* curved bowl: ribs on an arc */
 var cx=6,cz=-44,R=34,N=44,a0=-1.0,a1=1.0;
 var ribM=h.M('#ffffff',{map:c.concrete('#4a4e5e',1,3),roughness:.8});
 var bandMat=h.BM('#cfe0ff',1.2),bandRed=h.BM(S.c1,1.1);
 for(var i=0;i<N;i++){var a=a0+(a1-a0)*i/(N-1),x=cx+Math.sin(a)*R,z=cz+Math.cos(a)*R;
  var g=new T.Group();g.position.set(x,0,z);g.rotation.y=a;w.add(g);
  h.bx(1.9,15,1.2,0,7.5,0,ribM,g);
  h.bx(1.5,.5,.1,0,3.2,.66,i%2?bandMat:bandRed,g);h.bx(1.5,.16,.1,0,9.5,.66,bandMat,g);
  for(var r=0;r<3;r++)if(rnd()<.8)h.bx(1.1,.7,.08,0,5+r*1.4,.62,h.BM(rnd()<.5?'#ffb48a':'#bcd4ff',.9),g)}
 /* ring roof */
 for(i=0;i<N;i++){var a=a0+(a1-a0)*i/(N-1),x=cx+Math.sin(a)*(R-1),z=cz+Math.cos(a)*(R-1);
  var g=new T.Group();g.position.set(x,15.4,z);g.rotation.y=a;w.add(g);
  h.bx(1.95,.5,5,0,0,-1.2,h.M('#1a1e2a',{metalness:.5,roughness:.5}),g);h.bx(1.8,.1,.5,0,-.3,1.2,h.BM('#e8f0ff',1.8),g)}
 h.glow('#bcd4ff',cx,15,cz+R-1,70,6,.5);h.glow('#8aa0d8',cx,8,cz+R,70,16,.2);
 /* main entrance gap lit */
 h.plane(7,9,cx,4.5,cz+R-.4,new T.MeshBasicMaterial({map:h.tx(64,256,function(g){var gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#3a4a8a');gr.addColorStop(1,'#e8f0ff');g.fillStyle=gr;g.fillRect(0,0,64,256)},1,1)}),0);
 h.glow('#cfe0ff',cx,4,cz+R+1,12,10,.6);
 h.signBoard('NATIONAL STADIUM','#0e1220','#f4f1ff',10,1.5,cx,11.4,cz+R+.4,0,{emi:.9,glow:'#ff3a4a',border:true,k:.5});
 /* towers around */
 [[-26,-14,17],[38,-14,17],[-10,-9,16],[22,-9,16]].forEach(function(t){h.tower(t[0],t[1],t[2],{pw:7,ph:4,gs:18,gop:.6})});
 /* pedestrian bridge walkway in front */
 var by=4.4,bz=-1;var deck=h.M('#ffffff',{map:c.concrete('#6a6e7c',8,1),roughness:.6});
 h.bx(46,.45,4.4,6,by,bz,deck);
 h.bx(46,.12,.14,6,by+1.1,bz-2.15,h.BM('#e8f0ff',1.6));h.bx(46,.12,.14,6,by+1.1,bz+2.15,h.BM('#e8f0ff',1.6));
 for(i=0;i<24;i++){var x=-16+i*2;h.bar(x,by+.2,bz-2.15,x,by+1.15,bz-2.15,.04,h.M('#8a92a6',{metalness:.7}));h.bar(x,by+.2,bz+2.15,x,by+1.15,bz+2.15,.04,h.M('#8a92a6',{metalness:.7}))}
 [-8,6,20].forEach(function(x){h.bx(1.4,by,1.4,x,by/2,bz,h.M('#ffffff',{map:c.concrete('#5a5e6c',1,2)}));h.bx(2.2,.5,2.2,x,.25,bz,h.M('#2a2e3a'))});
 for(i=0;i<8;i++){h.bx(.9,.05,.4,-14+i*5.8,by-.5,bz,h.BM('#e8f0ff',1.8));h.glow('#cfe0ff',-14+i*5.8,by-.7,bz,3.5,1.6,.5)}
 h.banner('National',S.c1,'#f4f1ff',6,1.3,3,by+.9,bz+2.2,0,{k:.5});h.banner('Together','#10131f',S.c1,5,1.1,14,by+.9,bz+2.2,0,{k:.5});
 /* fans on bridge */
 for(i=0;i<16;i++){var m=['sing','cheer','idle','flare','talk'][i%5];var f=h.fan(-12+i*2.3+rr(-.4,.4),bz+rr(-1,1)+0,(rnd()<.5?1:-1)*(Math.PI/2)+rr(-.3,.3),m,{scarf:[S.c1,S.c2]});if(f)f.position.y=by+.22}
 /* ground fans, flags, flares */
 for(i=0;i<14;i++){h.fan(rr(-6,18),rr(5,12),rr(-.5,.5)+Math.PI,['talk','talk','sing','idle'][i%4],{scarf:[S.c1,S.c2]})}
 var spots=[];for(i=0;i<70;i++)spots.push([rr(-10,22),0,rr(10,16)]);try{h.crowd(spots,{dim:.38})}catch(e){}
 [[-3,4],[9,5],[15,3]].forEach(function(f,i){h.flag(f[0],f[1]+2,6.5,1.9,1.2,h.flagMat(i%2?S.c2:S.c1,i%2?S.c1:S.c2,'',i%2?'band':'stripes'),3.4)});
 h.flare(2,1.3,6.5);h.flare(10,1.4,8);h.flare(17,4.9,-1,true);
 h.haze('#ff4a5a',3,3,6,8,5,.07);h.haze('#8a96c8',6,6,-6,60,12,.09);
 for(i=0;i<5;i++){h.lamp(-8+i*8,10,5,{light:false});}
 c.light('dir','#dbe6ff',.5,6,18,20);
 c.setCam(6,3.0,18,6.5,5.2,-8,56,70)}});

/* ===================== teddy (open stadium, from a stand) ===================== */
RM.def('teddy',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('dusk');c.fog('#2a2850',30,120);
 var pt=h.pitchTex(10,10);
 h.plane(110,70,6,-.02,-30,new T.MeshStandardMaterial({map:pt,emissive:'#ffffff',emissiveMap:pt,emissiveIntensity:.28,roughness:.95}),0,-Math.PI/2);
 /* near stand we sit in: plastic seat rows climbing toward +z (behind camera) -> we draw seat backs and heads */
 var seatM=h.M(S.c1,{roughness:.6}),seatB=h.M('#e8eaf6',{roughness:.6});
 for(var r=0;r<3;r++){var y=1.0+r*.5,z=7.5+r*1.0;h.bx(40,.5,.9,6,y-.3,z,h.M('#ffffff',{map:c.concrete('#5a5e6c',8,1)}));
  for(var i=0;i<14;i++){var sx=-8+i*2.1;h.bx(.5,.55,.12,sx,y+.3,z+.3,i%5==2?seatB:seatM)}}
 /* far stand */
 var fz=-48;var far=h.tx(1024,256,function(g,W,Hh){g.fillStyle='#1a1e30';g.fillRect(0,0,W,Hh);for(var r=0;r<9;r++){g.fillStyle=r%2?'#262a40':'#20243a';g.fillRect(0,20+r*24,W,22)}
  for(var i=0;i<2600;i++){g.fillStyle=[__CK.a,'#f4f1ff','#8aa8ff','#e8503a','#3a4a7a'][i%5];g.globalAlpha=.35+rnd()*.5;g.fillRect(rnd()*W,24+rnd()*200,4,5)}g.globalAlpha=1;
  g.fillStyle=S.c1;g.fillRect(0,230,W,12);g.fillStyle='#f4f1ff';g.fillRect(0,242,W,3)},1,1);
 h.plane(90,16,6,8,fz,new T.MeshStandardMaterial({map:far,emissive:'#ffffff',emissiveMap:far,emissiveIntensity:.5}),0);
 h.bx(94,1,6,6,16.6,fz+.5,h.M('#14182a'));for(var i=0;i<12;i++){h.bx(2,.4,.2,-28+i*7.4,16,fz+3.6,h.BM('#e8f0ff',1.8));h.glow('#cfe0ff',-28+i*7.4,16,fz+4,6,3,.55)}
 /* side stand left/right (angled) */
 [-1,1].forEach(function(s){var g=new T.Group();g.position.set(6+s*38,0,-24);g.rotation.y=-s*1.0;w.add(g);h.plane(60,14,0,7,0,new T.MeshStandardMaterial({map:far,emissive:'#ffffff',emissiveMap:far,emissiveIntensity:.4}),0,0,g)});
 /* skyline silhouette + open end */
 var sk=h.tx(1024,128,function(g,W,Hh){g.clearRect(0,0,W,Hh);g.fillStyle='#14182c';for(var i=0;i<60;i++){var bw=14+rnd()*30,bh=20+rnd()*90;g.fillRect(i*17,Hh-bh,bw,bh)}
  for(i=0;i<260;i++){g.fillStyle=rnd()<.5?'#ffb48a':'#bcd4ff';g.fillRect(rnd()*W,30+rnd()*95,2,3)}},1,1);
 var skm=new T.MeshBasicMaterial({map:sk,transparent:true,fog:false});h.plane(120,15,6,12,-90,skm,0);
 [[-34,-46,20],[46,-46,20],[-30,-4,18],[44,-4,18]].forEach(function(t){h.tower(t[0],t[1],t[2],{pw:7,ph:4,gs:20,gop:.55})});
 /* flags/banners along the near hoarding */
 for(i=0;i<8;i++)h.signBoard(['Coffee','Tickets','Insurance','Drinks'][i%4],i%2?S.c1:'#0e1220','#f4f1ff',4,1,-6+i*4.6,.7,2.5,0,{emi:.5,k:.55});
 /* our fans: rows of heads/arms on the foreground steps */
 var sp=[];for(var r=0;r<3;r++)for(i=0;i<22;i++)sp.push([-8+i*1.1+rr(-.2,.2),1.0+r*.5-.1,8.4+r*1.0]);
 try{h.crowd(sp,{up:.6,dim:.5})}catch(e){}
 for(i=0;i<7;i++){h.fan(-3+i*3,5.5+rr(-.3,.3),rr(-.3,.3)+Math.PI,['sing','cheer','flare'][i%3],{scarf:[S.c1,S.c2]})}
 [[0,2.4],[8,2.8],[13,2.2]].forEach(function(f,i){h.flag(f[0],f[1]+1.5,5.2,2.2,1.4,h.flagMat(i%2?S.c2:S.c1,i%2?S.c1:S.c2,i==1?'Together':'',i%2?'band':'stripes'),3.6)});
 h.flare(4,2.5,5);h.flare(11,2.8,5,true);h.haze('#ff4a5a',4,3,5,9,5,.12);h.haze('#8a96c8',6,6,-20,90,14,.08);
 c.light('dir','#c8d2f8',.55,6,20,12);c.light('point','#ffb48a',.7,6,3,6,14);
 c.setCam(6,2.6,9.8,6,2.0,-20,60,76)}});

/* ===================== away-salzburg ===================== */
RM.def('away-salzburg',{kind:'stadium',build:function(c){var R=standRoom(c,{env:'night',x0:2,x1:16,z0:6.3,rows:8,rise:.45,run:.9,roofY:6.4,roofFront:2.6,fence:'cage',p:.75,dim:.75,stewards:0,fog:['#10182c',16,60],pal:null,
   towers:[[-3,0,12],[21,0,12]],boards:['Coffee','City','Bank','Thousands']});
 var h=R.h,c2=R.c,w=c.world,S=R.S,rr=R.rr,rnd=R.rnd;
 /* snow on roof + ground patches */
 h.bx(16.6,.18,(2.6-R.backZ)+1,9,6.62,(2.6+R.backZ)/2,h.M('#e8f0ff',{roughness:.95}));
 [[-3,9],[21,9]].forEach(function(p){h.bx(8,.12,6,p[0]+ (p[0]<0?-2:2),.08,p[1],h.M('#d8e4f8',{roughness:.95}))});
 /* mountain silhouette */
 var mt=h.tx(1024,200,function(g,W,Hh){g.clearRect(0,0,W,Hh);g.fillStyle='#1c2850';g.beginPath();g.moveTo(0,Hh);var x=0;while(x<W){g.lineTo(x,Hh-30-rnd()*130);x+=40+rnd()*60}g.lineTo(W,Hh);g.fill();
   g.fillStyle='#d8e4f8';for(var i=0;i<40;i++){g.globalAlpha=.5;g.fillRect(rnd()*W,Hh-150+rnd()*60,10,3)}g.globalAlpha=1},1,1);
 h.plane(120,12,9,10.5,R.backZ-8,new T.MeshBasicMaterial({map:mt,transparent:true,alphaTest:.3,fog:false}),0);
 /* our fans: dense block, caged, banner */
  h.banner('Visitors',S.c1,'#f4f1ff',5,1.1,9,1.5,5.7,0,{k:.6});
 for(i=0;i<5;i++)h.flag(3.5+i*2.6,2.8+(i%2)*.4,4.0-i*.1,1.6,1.1,h.flagMat(i%2?S.c2:S.c1,i%2?S.c1:S.c2,'',i%2?'band':'stripes'),3);
 h.flare(7,3.4,3.0);h.flare(12.5,3.0,2.6,true);h.haze('#ff4a5a',8,3.8,3,9,5,.12);h.haze('#c8d8ff',9,4,6,26,8,.08);
 for(i=0;i<6;i++)h.cop(3+i*2.4,7.4,Math.PI+rr(-.2,.2),'idle');
 /* snow particles as sprites */
 for(i=0;i<70;i++)h.glow('#ffffff',rr(-2,20),rr(.5,8),rr(1,13),.07,.07,.8);
 c.setCam(9,3.3,16.2,9,3.9,2.0,50,68)}});

/* ===================== away-lisbon ===================== */
RM.def('away-lisbon',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('night');c.fog('#1a1226',14,60);
 /* terracotta stepped street climbing toward -z */
 var tile=h.tx(256,256,function(g){g.fillStyle='#8a3a2c';g.fillRect(0,0,256,256);for(var y=0;y<8;y++)for(var x=0;x<8;x++){g.fillStyle=['#9a4432','#7e3326','#a24c38'][(x*3+y*5)%3];g.fillRect(x*32+1,y*32+1,30,30)}for(var i=0;i<400;i++){g.fillStyle='rgba(0,0,0,.12)';g.fillRect(rnd()*256,rnd()*256,4,2)}},3,1);
 var tm=new T.MeshStandardMaterial({map:tile,roughness:.45,metalness:.1});
 for(var i=0;i<14;i++){var y=i*.3,z=8-i*1.0;h.bx(14,.3,1.0,6,y+.15,z,tm)}
 h.plane(14,10,6,0,12,tm,0,-Math.PI/2);
 /* stone walls both sides with arches */
 var stone=h.tx(512,512,function(g,W,Hh){g.fillStyle='#b0a496';g.fillRect(0,0,W,Hh);for(var y=0;y<16;y++){for(var x=0;x<8;x++){g.fillStyle=['#a49888','#bcb0a0','#9a8e80'][(x+y*3)%3];g.fillRect(x*64+((y%2)*32)%64+1,y*32+1,62,30)}}},3,3);
 var sm=new T.MeshStandardMaterial({map:stone,roughness:.85});
 h.bx(.6,10,26,-1,5,-4,sm);h.bx(.6,10,26,13,5,-4,sm);
 /* blue/white azulejo panel on right wall */
 var az=h.tx(512,256,function(g,W,Hh){g.fillStyle='#f0f2f8';g.fillRect(0,0,W,Hh);for(var y=0;y<8;y++)for(var x=0;x<16;x++){g.fillStyle=(x+y)%2?'#2a4a9a':'#6a86c8';g.beginPath();g.arc(x*32+16,y*32+16,10,0,7);g.fill();g.strokeStyle='#2a4a9a';g.strokeRect(x*32+1,y*32+1,30,30)}},1,1);
 h.plane(8,3.2,12.65,2.4,-1,new T.MeshStandardMaterial({map:az,emissive:'#ffffff',emissiveMap:az,emissiveIntensity:.35,roughness:.4}),-Math.PI/2);
 /* arches on left wall */
 for(i=0;i<3;i++){var z=-8+i*5;h.bx(.2,3.6,2.4,-.6,1.8,z,h.M('#1a1426'));h.bx(.1,.5,2.4,-.6,3.8,z,h.M('#cfc4b4'));h.glow('#ffb48a',-.2,2,z,3,3,.4)}
 /* upper houses background */
 var hs=h.tx(1024,256,function(g,W,Hh){g.fillStyle='#14102a';g.fillRect(0,0,W,Hh);for(var i=0;i<14;i++){g.fillStyle=['#cfb8a0','#b87a68','#a8b4cc','#d4c4b0'][i%4];g.fillRect(i*74,60+rnd()*40,70,200);for(var k=0;k<8;k++){g.fillStyle=rnd()<.6?'#ffb48a':'#2a2236';g.fillRect(i*74+8+(k%3)*22,80+Math.floor(k/3)*52,14,26)}g.fillStyle='#8a3a2c';g.fillRect(i*74-2,52+rnd()*8,76,10)}},1,1);
 h.plane(30,9,6,10,-17,new T.MeshStandardMaterial({map:hs,emissive:'#ffffff',emissiveMap:hs,emissiveIntensity:.5}),0);
 h.bx(30,.1,.1,6,14,-17,h.M('#14102a'));
 /* stadium glow up the hill */
 h.glow('#cfe0ff',6,12,-18,22,10,.65);h.tower(0,-18,15,{pw:5,ph:3,gs:14,gop:.5});h.tower(12,-18,15,{pw:5,ph:3,gs:14,gop:.5});
 h.signBoard('ESTÁDIO →','#0e1220','#f4f1ff',3.4,.8,6,5.4,-9.5,0,{emi:.9,glow:'#ff3a4a',border:true,k:.5});
 /* string lights + lamps */
 for(i=0;i<16;i++){var x=-.6+i*.9,y=5.2-Math.sin(i/15*Math.PI)*.9;h.glow('#ffd2b4',x+.3,y,2+(i%2)*.1,.5,.5,.8);}
 h.bar(-.6,5.2,2,13,5.2,2,.01,h.M('#2a2236'));
 [[0.4,6],[12.4,0],[0.4,-6]].forEach(function(p){h.lamp(p[0],p[1],3.6,{light:p[1]==6})});
 /* our fans on the steps */
 for(i=0;i<16;i++){var f=h.fan(rr(1.5,11),rr(-5,6),Math.PI+rr(-.4,.4),['sing','cheer','talk','flare','talk'][i%5],{scarf:[S.c1,S.c2]});if(f)f.position.y=Math.max(0,(8-f.position.z)*.3)}
 [[3,-3.5],[9,-1.8]].forEach(function(f,i){h.flag(f[0],f[1]*-.3+3.3,f[1],1.9,1.2,h.flagMat(i?S.c2:S.c1,i?S.c1:S.c2,'',i?'band':'stripes'),3.3)});
 h.flare(5,2.2,0);h.flare(8.4,1.2,3,true);h.haze('#ff4a5a',6,2.5,1,8,5,.1);h.haze('#b49ac8',6,4,-6,18,8,.09);
 c.light('dir','#c8c8f0',.45,6,16,12);c.light('point','#ffb48a',.9,6,3.5,3,14);
 for(i=0;i<3;i++){var cz=rr(5,7),cp=h.cop(rr(2,10),cz,Math.PI+rr(-.3,.3),'idle');if(cp)cp.position.y=Math.max(0,(8-cz)*.3+.15)}
 c.setCam(6,2.6,12.5,6,2.8,-2,50,70)}});

/* ===================== away-lyon ===================== */
RM.def('away-lyon',{kind:'stadium',build:function(c){var h=H(c),w=c.world,S=c.skin,rnd=c.rnd,rr=c.rr;
 h.env('night');c.fog('#0a1226',22,80);
 var asph=c.asphalt();asph.repeat.set(14,8);h.plane(100,50,6,0,-8,new T.MeshStandardMaterial({map:asph,roughness:.28,metalness:.18}),0,-Math.PI/2);
 /* modern glass & steel stadium facade */
 var gl=h.tx(1024,320,function(g,W,Hh){var gr=g.createLinearGradient(0,0,0,Hh);gr.addColorStop(0,'#1a2a5a');gr.addColorStop(1,'#3a5a9a');g.fillStyle=gr;g.fillRect(0,0,W,Hh);
  for(var i=0;i<W;i+=64){g.fillStyle='#0c1228';g.fillRect(i,0,5,Hh)}for(var j=0;j<Hh;j+=64){g.fillStyle='#0c1228';g.fillRect(0,j,W,5)}
  for(i=0;i<W;i+=64)for(j=0;j<Hh;j+=64)if(rnd()<.5){g.fillStyle=rnd()<.5?'rgba(255,200,170,.55)':'rgba(200,225,255,.6)';g.fillRect(i+6,j+6,56,56)}},1,1);
 h.plane(60,15,6,7.5,-14,new T.MeshStandardMaterial({map:gl,emissive:'#ffffff',emissiveMap:gl,emissiveIntensity:.5,roughness:.2,metalness:.5}),0);
 /* curved roof ribbon + steel struts */
 h.bx(66,1.2,7,6,15.6,-12.5,h.M('#1a1e2e',{metalness:.7,roughness:.35}));h.bx(66,.1,.4,6,14.9,-9.2,h.BM('#e8f0ff',1.8));h.glow('#cfe0ff',6,14.8,-9,66,4,.6);
 for(var i=0;i<12;i++){var x=-22+i*5.5;h.bar(x,0,-9,x+1.5,15,-13,.18,h.M('#8a92a6',{metalness:.8,roughness:.3}))}
 h.signBoard('STADE','#0e1220','#f4f1ff',8,1.5,6,11.6,-13.6,0,{emi:.9,glow:'#ff3a4a',border:true,k:.5});
 h.glow('#bcd4ff',6,6,-13,60,16,.35);
 [[-22,-8,16],[34,-8,16]].forEach(function(t){h.tower(t[0],t[1],t[2],{pw:6,ph:4,gs:18,gop:.55})});
 /* tram stop with canopy + tram */
 h.bx(.3,.15,.3,0,0,0,h.M('#14161e'));
 var stop=new T.Group();stop.position.set(3,0,6);w.add(stop);
 h.bx(7,.22,2.4,0,3.2,0,h.M('#8a92a6',{metalness:.6,roughness:.4}),stop);[-3.2,3.2].forEach(function(x){h.bx(.14,3.2,.14,x,1.6,-1,h.M('#2a2e3a',{metalness:.6}),stop)});
 h.bx(6.6,.06,.4,0,3.02,.4,h.BM('#e8f0ff',1.8),stop);h.glow('#cfe0ff',3,2.8,6.4,8,3,.5);
 h.bx(5,.1,1.0,0,.55,-.8,h.M('#3a3e50'),stop);h.signBoard('T1  STADE','#0e1220','#f4f1ff',1.8,.5,0,2.7,-1.2,0,{emi:.9,border:true,k:.55},stop);
 var tr=new T.Group();tr.position.set(12,0,3);w.add(tr);
 h.bx(14,3.2,2.4,0,2.0,0,h.M('#d8dcee',{metalness:.5,roughness:.3}),tr);h.bx(14.02,.5,2.42,0,1.0,0,h.M(S.c1),tr);h.bx(13,.9,.05,0,2.5,1.22,h.BM('#bcd4ff',1.2),tr);h.bx(13,.9,.05,0,2.5,-1.22,h.BM('#bcd4ff',1.2),tr);
 h.glow('#cfe0ff',12,2.5,4.6,14,3,.5);
 h.bar(-4,0,1.6,26,0,1.6,.02,h.M('#4a4e5e'));h.bar(-4,5.6,1.6,26,5.6,1.6,.015,h.M('#2a2e3a'));
 /* wet plaza lamps + fans */
 [[-6,4],[18,6],[24,2]].forEach(function(p){h.lamp(p[0],p[1],5.5,{light:false})});
 [-6,18,24].forEach(function(x){wetDisc(h,x,5,'#ffb48a',7,7,.28)});
 for(i=0;i<18;i++){h.fan(rr(-5,20),rr(7,14),Math.PI+rr(-.5,.5),['talk','sing','cheer','talk','idle','flare'][i%6],{scarf:[S.c1,S.c2]})}
 var spots=[];for(i=0;i<60;i++)spots.push([rr(-8,22),0,rr(13,17)]);try{h.crowd(spots,{dim:.38})}catch(e){}
 [[2,5.5],[10,6],[17,5]].forEach(function(f,i){h.flag(f[0],f[1]-2,8,1.9,1.2,h.flagMat(i%2?S.c2:S.c1,i%2?S.c1:S.c2,'',i%2?'band':'stripes'),3.4)});
 h.flare(6,1.3,9);h.flare(15,1.4,10,true);h.haze('#ff4a5a',7,3,9,10,6,.1);h.haze('#8a96c8',6,5,-6,60,12,.08);
 for(i=0;i<3;i++)h.cop(rr(0,18),rr(9,11),Math.PI+rr(-.3,.3),'idle');
 c.light('dir','#dbe6ff',.5,6,18,20);c.light('point','#ffb48a',.8,10,3.5,9,14);
 c.setCam(8,3.0,19,8,5.4,-6,58,72)}});
})();
