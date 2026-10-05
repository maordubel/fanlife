/* LIFE voxel rooms — the three rooms of the approved Voxel Realism Lab (1.10.2026): the family living room,
 * the street with its kiosk, and the gates of the ground. Kept line for line; only their stand-ins are tagged
 * `cast`, so the game can put the real family where the lab stood three strangers. */
(function(){
var V=window.__vx,L=window.__vxLib,THREE=V.THREE,box=V.box,face=V.face,wallZ=V.wallZ,decal=V.decal,decalY=V.decalY,addPerson=V.addPerson,cube=V.cube,pm=V.pm,pt=V.pt,rnd=V.rnd,pick=V.pick;
var SKIN=V.SKIN,HAIR=V.HAIR,PANTS=V.PANTS;
function sceneRoom(S,night){
 var cur=V.cur();var W=24,D=13,H=9.6,G=cur.G,gc=night?'#2a3a66':'#a8c8e8';
 box('terrazzo',0,-1,0,W,1,D,{cell:2,kp:{pz:'concrete',nz:'concrete',px:'concrete',nx:'concrete'}});
 wallZ('plaster',0,W,0,H,-.8,.8,[[7,12.6,4.2,8.4],[17.6,20.8,0,7.2]],{kp:{py:'concrete',px:'concrete'}});
 box('plaster',-.8,0,-.8,.8,H,D+.8,{kp:{pz:'concrete',py:'concrete'},s:'nx'});
 for(var i=0;i<3;i++)decal('ochre',1+i*5.2+rnd()*1.5,1.2+rnd()*2.4,.02,1.6+rnd()*1.6,1.4+rnd()*2.4);
 box('doorWood',0,0,0,17.6,.7,.25,{c:'#8f877a',cell:3});box('doorWood',20.8,0,0,3.2,.7,.25,{c:'#8f877a',cell:3});box('doorWood',0,0,0,.25,.7,D,{c:'#8f877a',cell:3});
 // window
 var fr='#d6cfc2';
 box('doorWood',6.65,4.05,-.35,.4,4.5,.55,{c:fr});box('doorWood',12.55,4.05,-.35,.4,4.5,.55,{c:fr});box('doorWood',6.65,8.4,-.35,6.3,.4,.55,{c:fr});box('doorWood',6.4,3.8,-.35,6.8,.4,.85,{c:fr});
 box('glass',7,4.2,-.5,5.6,4.2,.08,{c:gc,s:'nz,px,nx,py'});box('doorWood',9.7,4.2,-.45,.25,4.2,.2,{c:fr});box('doorWood',7,6.2,-.45,5.6,.2,.2,{c:fr});
 for(var b=0;b<5;b++)box('flat',7,7.15+b*.25,-.3,5.6,.17,.25,{c:'#d6cdbc',jit:.03});
 decal('lace',7.1,4.2,.4,1.9,4.5);decal('lace',10.6,4.2,.4,1.9,4.5);
 // door
 var dc='#6b5848';
 box('doorWood',17.2,0,-.45,.4,7.6,.6,{c:dc});box('doorWood',20.8,0,-.45,.4,7.6,.6,{c:dc});box('doorWood',17.2,7.2,-.45,4,.4,.6,{c:dc});
 box('doorWood',17.6,0,-.5,3.2,7.2,.3,{c:'#e6d8c4'});box('flat',18.05,3.4,-.2,.25,.25,.5,{c:'#9aa0a8'});
 // sofa
 box('sofaFab',6,.25,.6,7.8,3.5,1.1,{c:'#e9e1d6'});box('sofaFab',6,.25,1.7,7.8,1.15,3.2);
 box('sofaFab',6,.25,1.7,.9,2.6,3.2);box('sofaFab',12.9,.25,1.7,.9,2.6,3.2);
 for(var c=0;c<3;c++)box('sofaFab',6.9+c*2.0,1.4,1.8,1.95,.6,3.0,{c:'#f2ece2'});
 box('flat',6.1,2.85,2.2,.7,.05,1.2,{c:'#efe9de'});box('flat',13.0,2.85,2.2,.7,.05,1.2,{c:'#efe9de'});
 // dresser + tv
 box('doorWood',0,0,4.0,2.6,2.9,5.2,{c:'#d3c2aa'});box('flat',.3,2.9,4.5,2.1,2.4,4.2,{c:'#2a2c32'});
 face('tv',[2.42,3.2,8.4],[0,0,-1],[0,1,0],[1,0,0],3.4,1.8,{full:1});
 box('flat',.9,5.3,5.8,.12,1.4,.12,{c:'#8a8f98'});box('flat',.9,5.3,7.6,.12,1.4,.12,{c:'#8a8f98'});
 // side table + lamp
 box('woodPanel',4.2,0,.8,1.6,2.2,1.6,{c:'#cdbca4'});box('flat',4.85,2.2,1.45,.3,1.4,.3,{c:'#8a8f98'});
 box('glow',4.3,3.6,.9,1.4,1.1,1.4,{c:night?'#ff9450':'#f2e6d6',s:'ny'});
 // rug
 decalY('rug',5.2,5.4,.03,8,6);
 // pennant
 box('doorWood',2.2,9.0,.02,3.6,.2,.15,{c:'#8a7a68'});
 for(var r=0;r<8;r++){var w=3.2-r*.4;box('flat',4-w/2,8.5-r*.5,.02,w,.5,.12,{c:(r===2||r===5)?S.s:S.p,jit:.05})}
 // frames
 box('doorWood',13.3,3.3,.0,3.4,4.4,.15,{c:'#6a5848'});decal('shirtF',13.4,3.4,.16,3.2,4.2);
 box('doorWood',21.3,4.1,.0,1.8,2.3,.08,{c:'#6a5848'});decal('photo',21.4,4.2,.1,1.6,2.1);
 box('doorWood',22.1,7.0,.0,1.2,1.5,.08,{c:'#6a5848'});decal('photo',22.2,7.1,.1,1.0,1.3);
 // table + chairs
 box('woodPanel',14.8,2.7,6.2,3.8,.4,2.8,{c:'#d9c9b0'});[[14.9,6.3],[18.2,6.3],[14.9,8.7],[18.2,8.7]].forEach(function(p){box('woodPanel',p[0],0,p[1],.4,2.7,.4,{c:'#bfa98c'})});
 box('flat',16.2,3.1,7.2,1.1,.3,1.1,{c:'#efe9de'});box('flat',16.5,3.4,7.5,.5,.5,.5,{c:S.p});
 [[15.4,9.3],[17.6,9.3]].forEach(function(p){box('woodPanel',p[0],0,p[1],1.5,1.7,1.5,{c:'#c7b296'});box('woodPanel',p[0],1.7,p[1]+1.2,1.5,2.2,.3,{c:'#c7b296'})});
 // fan
 var fan=new THREE.Group();fan.position.set(21.8,0,9.8);cube(fan,1.6,.3,1.6,pm('#5a5f68'),0,.15,0);cube(fan,.3,2.9,.3,pm('#7a8088'),0,1.6,0);cube(fan,1.9,1.9,.5,pm('#4a4f58'),0,3.5,0);
 var bl=new THREE.Group();bl.position.set(0,3.5,.35);cube(bl,1.7,.45,.06,pm('#cfd3d8'),0,0,0);cube(bl,.45,1.7,.06,pm('#cfd3d8'),0,0,0);fan.add(bl);G.add(fan);cur.anims.push(function(t,dt){bl.rotation.z+=dt*9});
 // actors
 box('woodPanel',4.9,0,6.7,1.2,1.15,1.2,{c:'#cdbca4'});
 addPerson({cast:1,x:5.5,z:7.3,y:0,seat:1.15,sit:true,h:4.6,yaw:-Math.PI/2,shirt:S.p,pat:L.pat(S),shirt2:S.s,pants:'#3a4560',skin:SKIN[3],hair:HAIR[1]});
 addPerson({cast:1,x:9.9,z:3.4,y:0,seat:2.0,sit:true,h:6.6,yaw:0,look:-1.1,shirt:'#e4dccd',pants:'#4a4f5c',skin:SKIN[0],hair:HAIR[3]});
 addPerson({cast:1,x:20.4,z:5.0,y:0,h:6.2,yaw:-1.2,shirt:'#7a5a6a',pants:'#3a3f48',skin:SKIN[1],hair:HAIR[0]});
 if(night){cur.L.push(pt(0xff9450,1.1,24,4.9,3.9,1.6));cur.L.push(pt(0x9bb8ff,.9,18,3.4,4.2,6.7))}
 return{W:W,H:H,D:D,fx:[2,22]};
}
function sceneStreet(S,night){
 var cur=V.cur();var W=44,H=21,D=22,G=cur.G,gc=night?'#26335a':'#9fbad6';
 box('concrete',0,-1,0,W,1.5,8,{cell:3});
 box('sidewalk',0,-1,8,W,1.5,5,{cell:2.5,kp:{pz:'concrete'}});
 box('asphalt',0,-1,13,W,1,9,{cell:3.5,kp:{pz:'concrete'}});
 for(var i=0;i<7;i++)box('flat',1.5+i*6.4,0,17.4,3.2,.03,.5,{c:'#d9d6cf',jit:0});
 // pink building
 box('flat',0,.5,3,16,20,.5,{c:'#3a3633'});
 wallZ('pink',0,16,.5,20.5,7.2,.8,[[1.8,4.8,7,11],[11.2,14.2,7,11],[1.8,4.8,13,17],[6.2,9.2,13,17],[11.2,14.2,13,17],[6.2,10.2,.5,6.2]],{cell:2.5,kp:{py:'concrete'}});
 var wins=[[1.8,4.8,7,11],[11.2,14.2,7,11],[1.8,4.8,13,17],[6.2,9.2,13,17],[11.2,14.2,13,17]];
 wins.forEach(function(w){var x=w[0],y=w[2],ww=w[1]-w[0],hh=w[3]-w[2];
  box('glass',x,y,7.5,ww,hh,.08,{c:gc,s:'nz,px,nx,py'});
  box('doorWood',x-.25,y-.3,7.9,ww+.5,.3,.45,{c:'#cfc7b9'});box('doorWood',x-.25,y+hh,7.9,ww+.5,.25,.35,{c:'#cfc7b9'});
  box('doorWood',x+ww/2-.12,y,7.7,.24,hh,.2,{c:'#cfc7b9'});
  if(night&&rnd()<.6)box('glow',x+.1,y+.1,7.55,ww-.2,hh-.2,.05,{c:'#ff9450',s:'nz,px,nx,py'});
 });
 box('blueWall',.65,7,8.0,1,4,.18,{c:'#a9bdd4'});box('blueWall',14.35,7,8.0,1,4,.18,{c:'#a9bdd4'});
 box('concrete',5.8,12.3,8.0,3.6,.4,2.0);face('fence',[5.8,12.7,10.0],[1,0,0],[0,1,0],[0,0,1],3.6,1.8,{cell:1.8,jit:0,ao:0});
 box('glass',6.4,.5,7.5,3.6,5.5,.08,{c:gc,s:'nz,px,nx,py'});box('doorWood',6.0,.5,7.9,.4,6.0,.4,{c:'#cfc7b9'});box('doorWood',10.0,.5,7.9,.4,6.0,.4,{c:'#cfc7b9'});box('doorWood',6.0,6.2,7.9,4.4,.4,.4,{c:'#cfc7b9'});
 box('doorWood',-.2,20.5,7.0,16.6,.6,1.4,{c:'#cfc7b9'});
 // ---- kiosk (x17..26)
 box('concrete',16,.5,3,1,9,5.6,{c:'#b9b4aa'});box('concrete',26,.5,3,1,9,5.6,{c:'#b9b4aa'});
 wallZ('kioskTile',17,26,.5,3,8,.6);
 wallZ('blueWall',17,26,3,7.4,8,.6,[[19.5,24,3.2,6.6]],{c:'#c4d0e0'});
 box('blueWall',17,.5,3,9,9,.5);
 box('woodPanel',17,.5,6.6,9,2.9,1.4);
 var GOODS=['#c9d4e6','#b02d10','#2f6f8f','#e9e5de','#5a8a5a','#d98ab0','#1d2b4f'];
 for(var g=0;g<7;g++)box('flat',17.8+g*1.2,3.4,6.9+rnd()*.4,.8,.5+rnd()*.5,.6,{c:pick(GOODS)});
 for(var r=0;r<2;r++){box('woodPanel',17.6,3.6+r*1.5,3.5,7.8,.2,1.0,{c:'#cdbca4'});for(var g2=0;g2<9;g2++)box('flat',17.8+g2*.85,3.8+r*1.5,3.7,.6,.7+rnd()*.5,.6,{c:pick(GOODS)})}
 box('glow',18.2,5.5,3.55,2.2,.7,.05,{c:night?'#ff9450':'#f2e6d6'});
 box('flat',15.8,9.4,2.8,11.4,.5,6.2,{c:'#6f6a66'});
 box('flat',17,7.4,8.0,9,1.8,.7,{c:S.t});decal('kioskSign',17.2,7.5,8.72,8.6,1.6);
 for(var i=0;i<5;i++)for(var k=0;k<8;k++)box('flat',17+k*1.125,7.2-i*.12,8.8+i*.5,1.125,.12,.5,{c:k%2?S.s:S.p,jit:.04});
 addPerson({cast:1,x:21.5,z:6.0,y:.5,h:5.8,yaw:0,shirt:'#7a8aa8',pants:'#3a3f48',skin:SKIN[1],hair:HAIR[0],cap:'#1d2b4f'});
 addPerson({cast:1,x:21.5,z:10.0,y:.5,h:6.0,yaw:Math.PI,shirt:S.p,pat:L.pat(S),shirt2:S.s,pants:PANTS[2],skin:SKIN[0],hair:HAIR[1],scarf:[S.p,S.s]});
 // ---- ochre building
 box('flat',27,.5,3,17,15.5,.5,{c:'#3a3633'});
 var OH=[[29,32,6,10],[35,38,6,10],[40.5,43.2,6,10],[29,32,11.5,15],[35,38,11.5,15],[40.5,43.2,11.5,15]];
 wallZ('ochre',27,44,.5,16,7.2,.8,OH,{cell:2.5,kp:{py:'concrete'}});
 OH.forEach(function(w){var x=w[0],y=w[2],ww=w[1]-w[0],hh=w[3]-w[2];
  box('glass',x,y,7.5,ww,hh,.08,{c:gc,s:'nz,px,nx,py'});
  box('doorWood',x-.25,y-.3,7.9,ww+.5,.3,.45,{c:'#cfc7b9'});box('doorWood',x-.25,y+hh,7.9,ww+.5,.25,.35,{c:'#cfc7b9'});
  box('doorWood',x+ww/2-.12,y,7.7,.24,hh,.2,{c:'#cfc7b9'});
  if(night&&rnd()<.5)box('glow',x+.1,y+.1,7.55,ww-.2,hh-.2,.05,{c:'#ff9450',s:'nz,px,nx,py'});
 });
 decal('graffiti',28.2,1.4,8.03,8,4);
 box('flat',37.5,.5,8.0,5,5.5,.25,{c:'#7c8087'});
 for(var s=0;s<10;s++)box('flat',37.5,.5+s*.55,8.25,5,.1,.06,{c:'#5d6168',jit:0});
 // ---- power poles + wires
 [6,38].forEach(function(px){
  box('woodPanel',px-.2,.5,11.5,.8,16.6,.8,{c:'#6a5a48',cell:3});
  box('woodPanel',px-.1,15.2,9.2,.6,.5,5.4,{c:'#6a5a48',cell:3});
  [9.6,11.9,14.2].forEach(function(z){box('flat',px-.05,15.7,z-.15,.3,.5,.3,{c:'#8b9096',jit:0})});
 });
 [9.75,12.05,14.35].forEach(function(z){
  var pts=[];for(var q=0;q<=24;q++){var t=q/24;pts.push(new THREE.Vector3(6.1+t*32,16.1-1.5*4*t*(1-t),z))}
  var ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x20222a}));G.add(ln);cur.mats.push(ln.material);
 });
 // ---- street lamp
 box('flat',27.2,.5,12.0,.35,9.5,.35,{c:'#2c3036'});box('flat',25.8,9.7,12.0,1.7,.3,.3,{c:'#2c3036'});
 box('glow',25.6,9.35,11.95,1.2,.35,.45,{c:night?'#ff9450':'#d8d4ca'});
 // ---- bunting
 var bp=[];for(var q2=0;q2<=24;q2++){var t2=q2/24;bp.push(new THREE.Vector3(27.3+(16.5-27.3)*t2,9.6-.8*4*t2*(1-t2),12.2+(9.0-12.2)*t2))}
 var bl=new THREE.Line(new THREE.BufferGeometry().setFromPoints(bp),new THREE.LineBasicMaterial({color:0x2a2c32}));G.add(bl);cur.mats.push(bl.material);
 for(var f=0;f<12;f++){var tf=(f+.5)/12;box('flat',27.3+(16.5-27.3)*tf-.35,9.6-.8*4*tf*(1-tf)-.95,12.2+(9.0-12.2)*tf,.7,.9,.08,{c:f%2?S.s:S.p,jit:.05})}
 // ---- plane tree
 box('woodPanel',11.55,.5,11.15,1.3,10.5,1.3,{c:'#7a6a58',cell:3});
 box('woodPanel',12.2,8.8,11.5,3.2,.6,.6,{c:'#7a6a58'});box('woodPanel',9.4,9.6,11.5,3,.6,.6,{c:'#7a6a58'});box('woodPanel',12.2,10.2,12.4,.6,.6,3,{c:'#7a6a58'});
 var GR=['#3f6a3b','#4d7a43','#5b8a4c','#6a9455','#47703f'],cn=0,tr=0;
 while(cn<70&&tr<900){tr++;var cx=(rnd()*2-1),cy=(rnd()*2-1),cz=(rnd()*2-1);if(cx*cx+cy*cy+cz*cz>1)continue;cn++;var sz=1.3+rnd()*1.1;
  box('flat',13+cx*4.6-sz/2,13.5+cy*3.6-sz/2,12.4+cz*3.4-sz/2,sz,sz,sz,{c:pick(GR),jit:.12,cell:1.3})}
 // ---- old car
 box('flat',26,.9,15.2,11,2.2,5,{c:'#8fa3b8'});box('flat',29,3.1,15.5,5.4,1.9,4.4,{c:'#8fa3b8'});
 [29.3,31.4,33.0].forEach(function(x){box('flat',x,3.35,19.92,1.5,1.4,.05,{c:'#1f2a3a',jit:0});box('flat',x,3.35,15.43,1.5,1.4,.05,{c:'#1f2a3a',jit:0})});
 box('flat',28.95,3.35,15.9,.06,1.4,3.6,{c:'#1f2a3a',jit:0});box('flat',34.39,3.35,15.9,.06,1.4,3.6,{c:'#1f2a3a',jit:0});
 [[27.2,15.0],[27.2,19.6],[33.4,15.0],[33.4,19.6]].forEach(function(p){box('flat',p[0],0,p[1],2,2,.8,{c:'#1a1a1e',jit:.02})});
 box('flat',25.7,.9,15.4,.4,.8,4.6,{c:'#cfd3d8'});box('flat',36.9,.9,15.4,.4,.8,4.6,{c:'#cfd3d8'});
 box('glow',25.85,1.9,15.5,.15,.6,.8,{c:'#f4efe6'});box('glow',25.85,1.9,18.9,.15,.6,.8,{c:'#f4efe6'});
 box('glow',36.95,1.9,15.5,.15,.6,.8,{c:'#d8412e'});box('glow',36.95,1.9,18.9,.15,.6,.8,{c:'#d8412e'});
 // ---- bin
 box('flat',28.4,.5,8.3,1.2,2.0,1.1,{c:'#2f4a3a'});box('flat',28.3,2.5,8.2,1.4,.25,1.3,{c:'#243a2d'});
 // ---- people on the pavement
 addPerson({x:1.5,z:10.5,y:.5,h:6.4,path:[[1.5,10.5],[11,10.5]],spd:1.8,shirt:S.p,pat:L.pat(S),shirt2:S.s,pants:PANTS[1],skin:SKIN[2],hair:HAIR[2],scarf:[S.p,S.s]});
 addPerson({x:28,z:10.6,y:.5,h:4.6,path:[[28,10.6],[41,10.6]],spd:2.4,shirt:'#5a7a9a',pants:PANTS[0],skin:SKIN[3],hair:HAIR[1]});
 addPerson({x:18,z:12.2,y:.5,h:6.1,path:[[18,12.2],[25,12.2]],spd:1.0,shirt:'#7a6a5a',pants:PANTS[3],skin:SKIN[0],hair:HAIR[3],cane:true});
 if(night){cur.L.push(pt(0xff9450,1.2,20,21.5,5.2,6.2));cur.L.push(pt(0xff9450,1.1,26,29,9.5,12.6))}
 return{W:44,H:21,D:22,fx:[8,34]};
}
function sceneGate(S,night){
 var cur=V.cur();var W=40,H=22,D=20,G=cur.G,gs=[7,20,33];
 box('gatePave',0,-1,0,W,1,D,{cell:2.5,kp:{pz:'concrete'}});
 box('flat',0,0,1,40,9,3,{c:'#14161c'});
 wallZ('concrete',0,40,0,9,4,1.2,[[4,10,0,6.8],[17,23,0,6.8],[30,36,0,6.8]],{cell:2.5,kp:{py:'concrete'}});
 box('facade',0,9,3.6,40,5,1.6,{cell:2.5,kp:{py:'concrete'}});
 [3.2,10,16.2,23,29.2,36].forEach(function(x){box('concrete',x-.5,0,5.2,1,9,.8,{c:'#bdb7ad'})});
 [0,1,2].forEach(function(i){decal('gn'+i,gs[i]-1.2,7.0,5.22,2.4,1.8)});
 decal('banner',14,9.3,5.22,12,4.2);
 [[0,3],[11,16],[24,29],[37,40]].forEach(function(r){face('fence',[r[0],0,7.0],[1,0,0],[0,1,0],[0,0,1],r[1]-r[0],3.4,{cell:1.8,jit:0,ao:0})});
 // turnstiles
 gs.forEach(function(cx){[-1.6,1.6].forEach(function(dx){
  var x=cx+dx;box('flat',x-.35,0,6.0,.7,3.2,1.2,{c:'#3b4048'});
  var rot=new THREE.Group();rot.position.set(x,2.7,6.6);
  for(var a=0;a<3;a++){var arm=new THREE.Group();arm.rotation.y=a*Math.PI*2/3;cube(arm,1.5,.14,.14,pm('#9aa0a8'),.75,0,0);rot.add(arm)}
  G.add(rot);var ph=rnd()*6;cur.anims.push(function(t,dt){if(Math.sin(t*.45+ph)>.55)rot.rotation.y+=dt*3.2});
 })});
 for(var x=0;x<W;x+=2)box('flat',x,0,12.5,2,.4,.6,{c:(x/2)%2?S.s:S.p,jit:.03});
 [2,38].forEach(function(px,i){box('flat',px,0,8.4,.25,13,.25,{c:'#2c3036'});decal('flag',i?px-4.15:px+.25,10.4,8.55,3.9,2.6)});
 [6,34].forEach(function(px){box('flat',px-.2,9,2,.4,12,.4,{c:'#2b2f36'});box('glow',px-1.4,20.2,1.9,2.8,1.2,.5,{c:night?'#e6f0ff':'#d9dde2'})});
 // queues
 gs.forEach(function(cx){for(var q=0;q<4;q++){
  var ch=rnd()<.25;
  addPerson({x:cx+(q%2?1.1:-1.1)+rnd()*.5-.25,z:7.8+q*1.7,y:0,h:6.2+rnd()*.9,yaw:Math.PI+rnd()*.3-.15,anim:ch?'cheer':'idle',shirt:rnd()<.7?S.p:'#5a6a8a',pat:(rnd()<.7&&L.pat(S))?L.pat(S):null,shirt2:S.s,pants:pick(PANTS),skin:pick(SKIN),hair:pick(HAIR),scarf:rnd()<.6?[S.p,S.s]:null});
 }});
 // dad + kid on shoulders
 addPerson({cast:1,x:14.5,z:10.2,y:0,h:6.6,yaw:Math.PI,shirt:S.p,pants:PANTS[0],skin:SKIN[1],hair:HAIR[2],scarf:[S.p,S.s]});
 addPerson({cast:1,x:14.5,z:11.1,y:4.8,seat:5.6,sit:true,h:3.4,yaw:Math.PI,anim:'cheer',shirt:S.p,pat:L.pat(S),shirt2:S.s,pants:'#3a4560',skin:SKIN[3],hair:HAIR[1]});
 // steward
 addPerson({cast:1,x:23.4,z:8.6,y:0,h:6.6,yaw:0,shirt:'#e9e5de',vest:'#1d2b4f',cap:'#1d2b4f',pants:'#1e2a44',skin:SKIN[0],hair:HAIR[0]});
 // arrivals
 [[14.2,2.0],[15.6,1.5],[16.8,2.2],[13.6,1.7]].forEach(function(p,i){
  addPerson({x:2,z:p[0],y:0,h:6+rnd()*.8,path:[[2+i*3,p[0]],[38-i*2,p[0]]],spd:p[1],shirt:rnd()<.6?S.p:'#6a7a8a',pants:pick(PANTS),skin:pick(SKIN),hair:pick(HAIR),scarf:rnd()<.5?[S.p,S.s]:null});
 });
 if(night){cur.L.push(pt(0xcfe0ff,1.1,44,6,18,8));cur.L.push(pt(0xcfe0ff,1.1,44,34,18,8));cur.L.push(pt(0xff9450,.8,24,20,6,8))}
 return{W:W,H:H,D:D,fx:[8,32]};
}
L.reg('room','Home','Living room (home)',sceneRoom,'living');
L.reg('street','Street','Street + kiosk',sceneStreet,'street');
L.reg('gate','Stadium','Ground outside (gates)',sceneGate,'gate5');
})();
