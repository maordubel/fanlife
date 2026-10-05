/* LIFE voxel rooms — core: shells and prefabs, all data-driven by the club's ClubSkin (S). */
(function(){
var V=window.__vx;
var box=V.box,wallZ=V.wallZ,decal=V.decal,decalY=V.decalY,addPerson=V.addPerson,rnd=V.rnd,pick=V.pick,cube=V.cube,pm=V.pm;
var SKIN=V.SKIN,HAIR=V.HAIR,PANTS=V.PANTS,THREE=V.THREE,FF=V.FF;
var L=window.__vxLib={};
var SHIRTS=['#7a8aa8','#8a7a6a','#5a7a9a','#9a8a7a','#6a8a6a','#a07a7a','#7a6a8a','#5d6a7d'];
L.SHIRTS=SHIRTS;
L.glass=function(night){return night?'#2a3a66':'#a8c8e8'};
L.pat=function(S){return S.pattern&&S.pattern!=='solid'?S.pattern:null};
L.fan=function(S,o){o=o||{};var r=Math.floor(rnd()*SKIN.length);var base={y:o.y||0,h:o.h||6.2,shirt:S.p,pat:L.pat(S),shirt2:S.s,pants:PANTS[Math.floor(rnd()*PANTS.length)],skin:SKIN[r],hair:HAIR[Math.floor(rnd()*HAIR.length)],scarf:[S.p,S.s]};for(var k in o)base[k]=o[k];return base};
L.local=function(o){var base={y:0,h:6.2,shirt:pick(SHIRTS),pants:pick(PANTS),skin:pick(SKIN),hair:pick(HAIR)};for(var k in o)base[k]=o[k];return base};
/* ---- text decals (signs), cached per rebuild ---- */
var tcount=0;
L.text=function(txt,w,h,bg,fg,size){
 var D=V.DEC(),key='tx'+(tcount++)+'_'+txt.length;
 D[key]={t:V.ctex(V.cv(Math.round(w*20),Math.round(h*20),function(g,W,H){g.fillStyle=bg;g.fillRect(0,0,W,H);g.strokeStyle=fg;g.lineWidth=Math.max(3,H*.05);g.strokeRect(H*.06,H*.06,W-H*.12,H-H*.12);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font='700 '+Math.round(H*(size||.5))+'px '+FF;g.fillText(txt,W/2,H/2+H*.04,W*.9)})),mode:'opaque',dbl:false};
 return key;
};
L.sign=function(x,y,z,w,h,txt,bg,fg,size){decal(L.text(txt,w,h,bg,fg,size),x,y,z,w,h)};
/* ---- interior shell ---- */
L.shell=function(o){
 var W=o.W||24,D=o.D||13,H=o.H||9.6,night=!!o.night,gc=L.glass(night);
 var wk=o.wall||'plaster',wc=o.wallC;
 var holes=[];(o.windows||[]).forEach(function(w){holes.push([w[0],w[1],w[2],w[3]])});(o.doors||[]).forEach(function(d){holes.push([d[0],d[1],0,d[2]||7.2])});
 box(o.floor||'terrazzo',0,-1,0,W,1,D,{c:o.floorC,cell:2,kp:{pz:'concrete',nz:'concrete',px:'concrete',nx:'concrete'}});
 wallZ(wk,0,W,0,H,-.8,.8,holes,{c:wc,kp:{py:'concrete',px:'concrete'}});
 box(wk,-.8,0,-.8,.8,H,D+.8,{c:wc,kp:{pz:'concrete',py:'concrete'},s:'nx'});
 var tr=o.trim||'#8f877a';
 box('doorWood',0,0,0,W,.7,.25,{c:tr,cell:3});box('doorWood',0,0,0,.25,.7,D,{c:tr,cell:3});
 var fr=o.frame||'#d6cfc2';
 (o.windows||[]).forEach(function(w){var x=w[0],y=w[2],ww=w[1]-w[0],hh=w[3]-w[2];
  box('doorWood',x-.35,y-.25,-.35,.4,hh+.5,.55,{c:fr});box('doorWood',x+ww-.05,y-.25,-.35,.4,hh+.5,.55,{c:fr});box('doorWood',x-.35,y+hh-.05,-.35,ww+.7,.4,.55,{c:fr});box('doorWood',x-.35,y-.3,-.35,ww+.7,.4,.85,{c:fr});
  box('glass',x,y,-.5,ww,hh,.08,{c:gc,s:'nz,px,nx,py'});box('doorWood',x+ww/2-.12,y,-.45,.25,hh,.2,{c:fr});
  if(night)box('glow',x+.05,y+.05,-.52,ww-.1,hh-.1,.03,{c:'#1d2a55',s:'nz,px,nx,py'});});
 (o.doors||[]).forEach(function(d){var x=d[0],ww=d[1]-d[0],hh=d[2]||7.2,dc=o.doorC||'#6b5848';
  box('doorWood',x-.4,0,-.45,.4,hh+.4,.6,{c:dc});box('doorWood',x+ww,0,-.45,.4,hh+.4,.6,{c:dc});box('doorWood',x-.4,hh,-.45,ww+.8,.4,.6,{c:dc});
  box('doorWood',x,0,-.5,ww,hh,.3,{c:o.leafC||'#e6d8c4'});box('flat',x+ww-.9,hh*.47,-.2,.25,.25,.5,{c:'#9aa0a8'});});
 return{W:W,H:H,D:D,fx:o.fx||[Math.max(0,W*.08),Math.min(W,W*.78)]};
};
/* ---- outdoor ground ---- */
L.ground=function(W,D,surface,c,sw){
 box(surface||'asphalt',0,-1,0,W,1.5,D,{c:c,cell:2.4});
 if(sw)box('sidewalk',0,.5,sw[0],W,.5,sw[1],{cell:2.2});
};
L.sky=function(night){/* sky is the page gradient */};
/* ---- prefabs (all face +z; y is the floor they stand on) ---- */
L.sofa=function(x,y,z,w,c){c=c||'#e9e1d6';box('sofaFab',x,y+.25,z,w,3.5,1.1,{c:c});box('sofaFab',x,y+.25,z+1.1,w,1.15,3.2,{c:c});box('sofaFab',x,y+.25,z+1.1,.9,2.6,3.2,{c:c});box('sofaFab',x+w-.9,y+.25,z+1.1,.9,2.6,3.2,{c:c});
 var n=Math.max(2,Math.round((w-1.8)/2));for(var i=0;i<n;i++)box('sofaFab',x+.9+i*(w-1.8)/n,y+1.4,z+1.2,(w-1.8)/n-.05,.6,3.0,{c:'#f2ece2'})};
L.table=function(x,y,z,w,d,h,top,leg){h=h||2.6;top=top||'woodPanel';box(top,x,y+h-.4,z,w,.4,d,{c:'#b89a78'});[[0,0],[w-.45,0],[0,d-.45],[w-.45,d-.45]].forEach(function(p){box('woodPanel',x+p[0],y,z+p[1],.45,h-.4,.45,{c:leg||'#7a5a3e'})})};
L.chair=function(x,y,z,f,c){c=c||'#8a5a3a';box('woodPanel',x,y+1.4,z,1.7,.3,1.7,{c:c});[[0,0],[1.35,0],[0,1.35],[1.35,1.35]].forEach(function(p){box('woodPanel',x+p[0],y,z+p[1],.35,1.4,.35,{c:c})});box('woodPanel',x,y+1.7,f>0?z:z+1.4,1.7,2.0,.3,{c:c})};
L.bed=function(x,y,z,w,d,col){w=w||8;d=d||4;col=col||'#6a7a9a';box('woodPanel',x,y,z,w,1.2,d,{c:'#7a5a3e'});box('flat',x+.2,y+1.2,z+.2,w-.4,.8,d-.4,{c:'#efe9de',jit:.03});box('flat',x+w*.32,y+1.25,z+.1,w*.68-.1,.95,d-.2,{c:col,jit:.04});box('flat',x+.4,y+2.0,z+.5,1.8,.5,d-1,{c:'#fffaf0',jit:.02});box('woodPanel',x-.2,y,z,.4,3.2,d,{c:'#6a4a30'})};
L.wardrobe=function(x,y,z,w,h,d){w=w||4.2;h=h||8;d=d||2;box('woodPanel',x,y,z,w,h,d,{c:'#8a6a4a'});box('woodPanel',x+w/2-.08,y+.3,z+d,.16,h-.6,.1,{c:'#5a3e2a'});box('flat',x+w/2-.6,y+h/2,z+d,.3,.3,.15,{c:'#cfc7b9'});box('flat',x+w/2+.3,y+h/2,z+d,.3,.3,.15,{c:'#cfc7b9'})};
L.desk=function(x,y,z,w,d){w=w||6;d=d||2.6;L.table(x,y,z,w,d,3.0,'woodPanel','#5a4a3a');box('woodPanel',x+.3,y+.5,z+.3,1.8,2,d-.6,{c:'#8a6a4a'})};
L.shelf=function(x,y,z,w,h,rows,d){d=d||1.4;box('woodPanel',x,y,z,w,h,d,{c:'#7a5a3e',s:'pz'});var G=['#c9d4e6','#b02d10','#2f6f8f','#e9e5de','#5a8a5a','#d98ab0','#1d2b4f','#8a6a4a'];
 for(var r=0;r<rows;r++){box('woodPanel',x,y+(r+1)*h/(rows+1),z+.1,w,.2,d,{c:'#9a7a58'});for(var i=0;i<w/.9;i++){var hh=.9+rnd()*.7;box('flat',x+.2+i*.8,y+(r+1)*h/(rows+1)+.2,z+.3,.6,Math.min(hh,h/(rows+1)-.4),d-.5,{c:pick(G)})}}};
L.lamp=function(x,y,z,c){box('flat',x,y,z,.9,.3,.9,{c:'#444'});box('flat',x+.35,y+.3,z+.35,.2,2.6,.2,{c:'#444'});box('glow',x-.1,y+2.9,z-.1,1.1,.9,1.1,{c:c||'#f2e6d6'})};
L.tvset=function(x,y,z){box('woodPanel',x,y,z,5.2,3,3.4,{c:'#4a3226'});box('flat',x+.4,y+3,z+.4,4.4,3.6,2.8,{c:'#16181d'});box('tv',x+.7,y+3.4,z+.38,3.8,2.7,.05,{full:1});box('flat',x+1.6,y+6.6,z+1.2,.1,1.4,.1,{c:'#222'});box('flat',x+3.4,y+6.6,z+1.2,.1,1.4,.1,{c:'#222'})};
L.bin=function(x,y,z,c){box('flat',x,y,z,1.2,2.0,1.1,{c:c||'#2f4a3a'});box('flat',x-.1,y+2,z-.1,1.4,.25,1.3,{c:'#243a2d'})};
L.bench=function(x,y,z,w,c){c=c||'#8a6a4a';box('woodPanel',x,y+1.4,z,w,.35,1.6,{c:c});box('woodPanel',x,y+2.3,z+1.35,w,1.5,.3,{c:c});box('flat',x+.3,y,z+.2,.4,1.4,1.2,{c:'#444'});box('flat',x+w-.7,y,z+.2,.4,1.4,1.2,{c:'#444'})};
L.crate=function(x,y,z,w,h,d,c){box('woodPanel',x,y,z,w,h,d,{c:c||'#a58a62'});box('flat',x+.15,y+h*.45,z+d,w-.3,.2,.06,{c:'#6a5a42',jit:0})};
L.tree=function(x,y,z,s){s=s||1;box('woodPanel',x,y,z,1.2*s,8*s,1.2*s,{c:'#7a6a58',cell:3});var GR=['#3f6a3b','#4d7a43','#5b8a4c','#6a9455','#47703f'],n=0,t=0;
 while(n<46&&t<600){t++;var cx=rnd()*2-1,cy=rnd()*2-1,cz=rnd()*2-1;if(cx*cx+cy*cy+cz*cz>1)continue;n++;var sz=(1.2+rnd()*1)*s;box('flat',x+.6*s+cx*3.8*s-sz/2,y+9*s+cy*2.8*s-sz/2,z+.6*s+cz*3*s-sz/2,sz,sz,sz,{c:pick(GR),jit:.12,cell:1.3})}};
L.palm=function(x,y,z,s){s=s||1;for(var i=0;i<9;i++)box('woodPanel',x+.1*i%.4,y+i*1.2*s,z,.9*s,1.2*s,.9*s,{c:'#8a7a5e',cell:3});for(var k=0;k<6;k++){var a=k/6*Math.PI*2;box('flat',x+.45*s+Math.cos(a)*1.9*s-1,y+10.2*s-Math.abs(Math.sin(a))*.4,z+.45*s+Math.sin(a)*1.9*s-1,2,.35,2,{c:k%2?'#4d7a43':'#5b8a4c',jit:.1})}};
L.car=function(x,y,z,c,w){c=c||'#8fa3b8';w=w||11;box('flat',x,y+.9,z,w,2.2,5,{c:c});box('flat',x+w*.27,y+3.1,z+.3,w*.5,1.9,4.4,{c:c});box('glass',x+w*.3,y+3.3,z+.2,w*.44,1.5,4.6,{c:'#1f2a3a',s:'py'});[[x+1.2,z-.3],[x+1.2,z+4.5],[x+w-2.6,z-.3],[x+w-2.6,z+4.5]].forEach(function(p){box('flat',p[0],y,p[1],2,2,.8,{c:'#1a1a1e',jit:.02})});box('glow',x-.1,y+1.9,z+.5,.15,.6,.8,{c:'#f4efe6'});box('glow',x-.1,y+1.9,z+3.9,.15,.6,.8,{c:'#f4efe6'})};
L.post=function(x,y,z,h){h=h||9.5;box('flat',x,y,z,.35,h,.35,{c:'#2c3036'})};
L.lampPost=function(x,y,z,night){L.post(x,y,z,9.5);box('flat',x-1.4,y+9.7,z,1.7,.3,.3,{c:'#2c3036'});box('glow',x-1.6,y+9.35,z-.05,1.2,.35,.45,{c:night?'#ff9450':'#d8d4ca'});};
L.flag=function(x,y,z,h){h=h||7;box('flat',x,y,z,.25,h,.25,{c:'#cfd3d8',jit:0});decal('flag',x+.25,y+h-2.4,z+.1,3.4,2.2)};
L.bunting=function(S,x0,y,z0,x1,z1,n){n=n||10;var pts=[];for(var q=0;q<=20;q++){var t=q/20;pts.push(new THREE.Vector3(x0+(x1-x0)*t,y-.8*4*t*(1-t),z0+(z1-z0)*t))}
 var ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x2a2c32}));V.cur().G.add(ln);V.cur().mats.push(ln.material);
 for(var f=0;f<n;f++){var tf=(f+.5)/n;box('flat',x0+(x1-x0)*tf-.35,y-.8*4*tf*(1-tf)-.95,z0+(z1-z0)*tf,.7,.9,.08,{c:f%2?S.s:S.p,jit:.05})}};
L.goal=function(x,y,z,w,h){h=h||5;box('flat',x,y,z,.3,h,.3,{c:'#e9e5de',jit:0});box('flat',x+w,y,z,.3,h,.3,{c:'#e9e5de',jit:0});box('flat',x,y+h,z,w+.3,.3,.3,{c:'#e9e5de',jit:0});box('fence',x,y,z+.05,w,h,.05,{full:1,s:'nz'})};
L.ball=function(x,y,z){box('flat',x,y,z,.9,.9,.9,{c:'#efefef',jit:.03})};
L.hoop=function(x,y,z,face){box('flat',x+.8,y,z,.3,9,.3,{c:'#6a6e75',jit:0});box('flat',x,y+9,z-.2,2.6,.3,.3,{c:'#6a6e75',jit:0});box('flat',x-.5,y+9.2,z-.2,3.6,2.4,.2,{c:'#e9e5de',jit:0});box('flat',x+.2,y+8.7,z,1.8,.2,1.4,{c:'#d8412e',jit:0})};
L.steps=function(k,x,y,z,w,n,rise,run){for(var i=0;i<n;i++)box(k,x,y+i*rise,z+(n-i-1)*run,w,rise,run,{cell:2})};
L.stairs=L.steps;
L.seats=function(S,x,y,z,cols,rows,o){o=o||{};var sw=o.sw||1.9,rise=o.rise||1.1,run=o.run||2.2;
 for(var r=0;r<rows;r++){box('concrete',x,y+r*rise,z+r*run,cols*sw,rise,run,{cell:2,jit:.05});
  for(var c=0;c<cols;c++){var col=o.mono?(o.mono):((c+r*3)%7===0?S.s:S.p);box('flat',x+c*sw+.2,y+r*rise+rise,z+r*run+.3,sw-.4,.3,run-.5,{c:col,jit:.06});
   if(o.fill&&rnd()<o.fill){L.mini(S,x+c*sw+sw/2,y+r*rise+rise+.3,z+r*run+run*.5,o)}}}};
L.mini=function(S,x,y,z,o){var sh=rnd()<(o&&o.home!=null?o.home:.7)?S.p:pick(SHIRTS);box('flat',x-.5,y,z-.35,1,1.15,.7,{c:sh,jit:.05});box('flat',x-.4,y+1.15,z-.3,.8,.8,.6,{c:pick(SKIN),jit:.03});box('flat',x-.42,y+1.75,z-.32,.84,.3,.64,{c:pick(HAIR),jit:.03})};
L.floodlight=function(x,y,z,h,night){L.post(x,y,z,h);box('flat',x-1.4,y+h,z-.2,3.2,1.6,.5,{c:'#3a3e44'});box('glow',x-1.3,y+h+.1,z+.3,3,1.4,.1,{c:night?'#fff4d8':'#cfd3d8'})};
L.crowd=function(S,x,y,z,cols,rows,gap){gap=gap||1.4;for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){if(rnd()<.12)continue;L.mini(S,x+c*gap+(rnd()-.5)*.3,y,z+r*gap,{home:.8})}};
L.bus=function(x,y,z,c,w){c=c||'#2f6f8f';w=w||18;box('flat',x,y+1.2,z,w,6.2,5.4,{c:c});box('flat',x,y+1.2,z,w,1.2,5.4,{c:'#e9e5de',jit:.02});for(var i=0;i<5;i++)box('glass',x+1+i*3.3,y+4,z+5.38,2.6,2.2,.05,{c:'#9bb5d0',s:'nz,px,nx,py'});box('glass',x+w-.05,y+3,z+.5,.05,3.2,4,{c:'#9bb5d0'});[[2.4],[w-4.4]].forEach(function(p){box('flat',x+p[0],y,z-.2,2.4,2.4,.9,{c:'#1a1a1e',jit:.02});box('flat',x+p[0],y,z+4.7,2.4,2.4,.9,{c:'#1a1a1e',jit:.02})});box('glow',x+.1,y+1.9,z+5.3,.8,.5,.15,{c:'#f4efe6'})};
L.pillar=function(x,y,z,w,h,d,c){box('concrete',x,y,z,w,h,d,{c:c||'#a9a59d',cell:2.4})};
L.awning=function(S,x,y,z,w,d){d=d||3;for(var i=0;i<4;i++)for(var k=0;k<Math.round(w/1.1);k++)box('flat',x+k*1.1,y-i*.12,z+i*(d/4),1.1,.12,d/4,{c:k%2?S.s:S.p,jit:.04})};
L.counter=function(x,y,z,w,d,h,top,body){h=h||3;box('woodPanel',x,y,z,w,h,d,{c:body||'#8a6a4a'});box('woodPanel',x-.2,y+h,z-.2,w+.4,.35,d+.4,{c:top||'#cdbca4'})};
L.fridge=function(x,y,z){box('flat',x,y,z,3,8,2.6,{c:'#e6ebf0'});box('flat',x+2.6,y+2,z+2.6,.2,3,.1,{c:'#9aa0a8',jit:0});box('flat',x+.1,y+5.2,z+2.6,2.8,.1,.05,{c:'#9aa0a8',jit:0})};
L.stove=function(x,y,z,w){w=w||4;box('flat',x,y,z,w,3.2,2.6,{c:'#d8dde2'});box('flat',x+.3,y+3.2,z+.3,w-.6,.15,2,{c:'#2a2c32'});[0,1].forEach(function(i){box('flat',x+.6+i*1.5,y+3.35,z+.7,1,.1,1,{c:'#c7ccd2',jit:0})})};
L.window=function(x,y,w,h,night){var gc=L.glass(night),fr='#d6cfc2';box('doorWood',x-.35,y-.25,-.35,.4,h+.5,.55,{c:fr});box('doorWood',x+w-.05,y-.25,-.35,.4,h+.5,.55,{c:fr});box('glass',x,y,-.5,w,h,.08,{c:gc,s:'nz,px,nx,py'})};
L.poster=function(x,y,z,w,h,S,kind){decal(kind||'photo',x,y,z,w,h)};
L.crestDec=function(){var D=V.DEC();if(!D.crestP){var S=V.cur().S;D.crestP={t:V.ctex(V.cv(220,240,function(g){V.drawCrest(g,10,10,220,S)})),mode:'test',dbl:false}}return 'crestP'};
L.crestPlate=function(S,x,y,z,w){decal(L.crestDec(),x,y,z,w,w*240/220)};
L.str=function(S,k){return (S.strings&&S.strings[k])||S[k]||k};
L.blackboard=function(x,y,z,w,h){box('doorWood',x-.3,y-.3,z,w+.6,h+.6,.3,{c:'#7a5a3e'});box('flat',x,y,z+.3,w,h,.1,{c:'#2c4a3a',jit:.03});box('flat',x+.5,y+.4,z+.4,w*.4,.12,.05,{c:'#d9d6cc',jit:0});box('flat',x+.5,y+1.4,z+.4,w*.3,.12,.05,{c:'#d9d6cc',jit:0})};
L.schoolDesk=function(x,y,z){box('woodPanel',x,y+2.2,z,3,.3,1.8,{c:'#b89a78'});box('flat',x+.2,y,z+.2,.3,2.2,.3,{c:'#444'});box('flat',x+2.5,y,z+.2,.3,2.2,.3,{c:'#444'});box('woodPanel',x+.3,y+1.2,z+2.2,1.6,.3,1.5,{c:'#8a6a4a'});box('flat',x+.5,y,z+2.4,.25,1.2,.25,{c:'#444'})};
L.rug=function(x,z,w,d){decalY('rug',x,z,.04,w,d)};
L.boxes=function(x,y,z,nx,ny,nz,c){for(var a=0;a<nx;a++)for(var b=0;b<ny;b++)for(var d=0;d<nz;d++)if(rnd()<.85)box('woodPanel',x+a*2.1,y+b*1.6,z+d*2.1,2,1.5,2,{c:c||pick(['#a58a62','#b49a72','#957a56']),jit:.06})};
L.neon=function(x,y,z,w,h,c){box('glow',x,y,z,w,h,.1,{c:c})};
L.piers=function(x,y,z,n,gap,h){for(var i=0;i<n;i++)box('concrete',x+i*gap,y,z,1.6,h,1.6,{c:'#a9a59d'})};
L.person=function(o){addPerson(o)};
/* ---- room registry ---- */
window.__vxScenes=window.__vxScenes||{};window.__vxMeta=window.__vxMeta||[];
L.reg=function(id,group,label,fn,ref,o){o=o||{};window.__vxScenes[id]=function(S,night){tcount=0;var m=fn(S,night);if(o.viewH&&!m.viewH)m.viewH=o.viewH;return m};window.__vxMeta.push({id:id,group:group,label:label,ref:ref||null,time:o.time||'day'})};
L.alias=function(id,of,group,label){window.__vxScenes[id]=window.__vxScenes[of];window.__vxMeta.push({id:id,group:group,label:label,ref:null,alias:of,time:'day'})};
window.__vxLabel=function(id){for(var i=0;i<window.__vxMeta.length;i++)if(window.__vxMeta[i].id===id)return window.__vxMeta[i].label;return null};
window.__vxRef=function(id){for(var i=0;i<window.__vxMeta.length;i++)if(window.__vxMeta[i].id===id&&window.__vxMeta[i].ref)return '/life/art/'+window.__vxMeta[i].ref+'.webp';return null};
})();
