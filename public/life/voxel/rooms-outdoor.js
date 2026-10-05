/* LIFE voxel rooms — outdoors: streets, pitch, yards, stations, harbour, Jaffa. */
(function(){
var V=window.__vx,L=window.__vxLib,box=V.box,wallZ=V.wallZ,decal=V.decal,decalY=V.decalY,rnd=V.rnd,pick=V.pick,cube=V.cube,pm=V.pm,face=V.face;
var SK=V.SKIN,HR=V.HAIR,PN=V.PANTS,PI=Math.PI;
var CARS=['#8fa3b8','#b56a52','#c9c4b8','#5a7a6a','#7a7f87'];
L.cars=cars;function cars(n,x0,x1,z,y){for(var i=0;i<n;i++)L.car(x0+(x1-x0)*i/Math.max(1,n-1),y==null?0:y,z,CARS[i%CARS.length],10.5+(i%2))}
function lamps(night,x0,x1,n,z,y){for(var i=0;i<n;i++)L.lampPost(x0+(x1-x0)*i/Math.max(1,n-1),y==null?.5:y,z,night)}
function nightLights(night,W,H){if(night){L.light(night,W*.2,H*.8,9,0xcfe0ff,1.1,W);L.light(night,W*.75,H*.8,9,0xcfe0ff,1.1,W);L.light(night,W*.5,4,14,0xff9450,.8,W*.5)}}
L.screenDec=function(S){var D=V.DEC();if(!D.screen){D.screen={t:V.ctex(V.cv(256,144,function(g,w,h){g.fillStyle='#2d6a3c';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.13)';for(var i=0;i<w;i+=32)g.fillRect(i,0,16,h);g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.strokeRect(12,12,w-24,h-24);g.beginPath();g.moveTo(w/2,12);g.lineTo(w/2,h-12);g.stroke();g.beginPath();g.arc(w/2,h/2,22,0,7);g.stroke();
 for(var k=0;k<6;k++){g.fillStyle=k<3?S.p:S.s;g.fillRect(50+k*28,34+(k%3)*30,7,7)}g.fillStyle='#fff';g.fillRect(w/2-3,h/2-3,6,6)})),mode:'opaque',dbl:false}}return 'screen'};

/* ---------------- STREETS ---------------- */
L.reg('pitch','Street','Stone pitch',function(S,night){
 var W=42,H=19,D=22;
 box('plaza',0,-1,0,W,1.5,D,{cell:3,c:'#a99b86',kp:{pz:'concrete'}});
 wallZ('ochre',0,16,.5,15,6,.8,[[2,5,6,9.4],[7,10,6,9.4],[11,14,6,9.4]],{cell:2.5,kp:{py:'concrete'}});
 box('flat',0,.5,5.4,16,15,.6,{c:'#3a3633'});
 [[2,5,6,9.4],[7,10,6,9.4],[11,14,6,9.4]].forEach(function(w){box('glass',w[0],w[2]+.5,6.3,w[1]-w[0],w[3]-w[2]-.5,.08,{c:L.glass(night),s:'nz,px,nx,py'});box('doorWood',w[0]-.2,w[2]+.3,6.7,w[1]-w[0]+.4,.3,.4,{c:'#cfc7b9'})});
 wallZ('pink',22,42,.5,12,6,.8,[[25,28,5,8.6],[31,34,5,8.6],[36,39,5,8.6]],{cell:2.5,kp:{py:'concrete'}});
 box('flat',22,.5,5.4,20,12,.6,{c:'#3a3633'});
 decal('graffiti',5,1.4,6.83,9,4.5);
 box('concrete',16,.5,5,6,6.4,1.6,{c:'#8f8b83',cell:2.4});
 L.jacketGoal(8,.5,15.8,6);L.jacketGoal(8,.5,10.4,6);
 for(var i=0;i<5;i++)L.pplF(S,{x:10+i*2.6,z:12+(i%3)*1.6,y:.5,h:4.6+rnd()*.6,yaw:i%2?PI*.3:-PI*.3,anim:i===1?'cheer':'idle',scarf:null});
 L.pplL({cast:1,x:25,z:9.4,y:.5,h:4.6,yaw:-PI*.4});L.ball(15,.5,13.4);
 L.tree(32,.5,10,1.15);L.bin(21,.5,8);
 L.pplL({x:35,z:13,y:.5,h:6.6,yaw:-PI*.6,hair:HR[3]});
 L.bunting(S,2,14.4,5.6,20,5.6,8);
 L.light(night,10,10,12,0xfff0d0,1,40);
 return{W:W,H:H,D:D,fx:[2,32]};
},'ground');

L.reg('route','Street','Road to the ground',function(S,night){
 var W=48,H=24,D=22;
 box('concrete',0,-1,0,W,1.5,6,{cell:3});box('sidewalk',0,-1,6,W,1.5,4,{cell:2.5,kp:{pz:'concrete'}});box('asphalt',0,-1,10,W,1,12,{cell:3.5,kp:{pz:'concrete'}});
 for(var i=0;i<7;i++)box('flat',1+i*7,0,16.4,3.6,.03,.5,{c:'#d9d6cf',jit:0});
 L.facade(0,12,{h:12,k:'ochre',night:night,floors:3,z:5.4});L.facade(34,48,{h:10,k:'pink',night:night,floors:3,z:5.4});
 // floodlight towers + stand far behind
 L.floodlight(18,.5,3,22,night);L.floodlight(30,.5,3,22,night);
 box('concrete',13,.5,1,22,9,3,{cell:3,c:'#b9b4aa'});for(var k=0;k<9;k++)box('flat',14+k*2.3,6.2,3.6,1.6,1.4,.1,{c:k%2?S.p:S.s,jit:.04});
 L.sign(18,10.8,3.7,12,1.4,S.stadium.toUpperCase(),S.t,S.s,.55);
 lamps(night,4,44,6,7.4);
 for(var f=0;f<9;f++)L.flag(1+f*5.4,.5,11.5,6.4);
 L.bunting(S,1,10.4,10.2,46,10.2,22);
 L.strollers(S,9,7.4,9.4,2,44,{fan:.8,y:.5});
 L.bus(32,0,15,'#2f6f8f',16);L.car(1,0,16.8,CARS[0],10.5);
 nightLights(night,W,H);
 return{W:W,H:H,D:D,fx:[10,36]};
},'approach');

L.reg('allenby','Street','Allenby',function(S,night){
 var W=48,H=21,D=22;L.street(W,{D:D});
 L.facade(0,16,{h:18,k:'pink',night:night,floors:4,shop:true,sign:'AL-LEN-BY',signBg:'#1d2b4f',awn:S,balc:true});
 L.facade(16,32,{h:17,k:'facade',night:night,floors:4,shop:true,sign:S.kiosk,signBg:S.t,signFg:S.s,awn:S,shutters:'#6b7a8a'});
 L.facade(32,48,{h:18,k:'ochre',night:night,floors:4,shop:true,sign:'CAFE',signBg:'#2f4a3a',awn:{p:'#2f6f8f',s:'#efe9de'},balc:true});
 lamps(night,3,45,5,12.6);
 L.car(0,0,17.8,CARS[0],10.5);L.car(37,0,17.8,CARS[1],10.5);
 L.palm(22,.5,10,1);L.palm(46,.5,9.6,.9);
 L.strollers(S,8,9,12.6,2,46,{fan:.3,y:.5});
 L.stall(S,26,.5,9.6,5,S.p);
 L.bin(14.4,.5,9.4);L.bench(7,.5,9,4.6);
 nightLights(night,W,H);
 return{W:W,H:H,D:D,fx:[6,34]};
},'allenby');

L.reg('hatikva','Street','Hatikva market',function(S,night){
 var W=44,H=20,D=22;L.street(W,{D:D});
 L.facade(0,15,{h:16,k:'ochre',night:night,floors:3,shop:true,sign:'מכולת',signBg:'#4a3a2e',awn:{p:'#b56a52',s:'#efe9de'},balc:true});
 L.facade(15,30,{h:15,k:'pink',night:night,floors:3,shop:true,sign:'פירות וירקות',signBg:'#2f4a3a',awn:{p:'#5a8a3c',s:'#efe9de'},balc:true});
 L.facade(30,44,{h:16,k:'facade',night:night,floors:3,shop:true,sign:S.kiosk,signBg:S.t,signFg:S.s,awn:S,balc:true});
 for(var i=0;i<5;i++)L.stall(S,2+i*8.6,.5,9.3,5.6,pick(['#b56a52','#5a8a3c','#2f6f8f',S.p]));
 L.crate(1,.5,12,2,1.4,2,'#a58a62');L.crate(34,.5,12.2,2.4,1.6,2,'#957a56');
 for(var l=0;l<3;l++)box('flat',6+l*12,12.6,7.2,.1,.1,.1,{c:'#000'});
 for(var c=0;c<4;c++)L.bunting(S,2+c*10,12.8,8.3,10+c*10,8.3,8);
 L.strollers(S,9,10.4,13,2,42,{fan:.4,y:.5});L.bike(20,.5,12.4,S.p);
 nightLights(night,W,H);
 return{W:W,H:H,D:D,fx:[4,34]};
},'hatikva');

L.reg('bus-stop','Street','Bus stop',function(S,night){
 var W=36,H=17,D=22;L.street(W,{D:D});
 L.facade(0,36,{h:11,k:'facade',night:night,floors:3,z:7.2,cols:6,shop:false});
 // shelter
 L.post(12,.5,9.2,8);L.post(21,.5,9.2,8);box('flat',11.6,8.5,8.4,10,.4,3.8,{c:'#3a4a5c',jit:.03});
 box('glass',12,1.5,9.2,9,7,.08,{c:L.glass(night),s:'nz,px,nx,py'});
 L.bench(13,.5,10.2,6);
 box('flat',3,.5,11.2,.3,10,.3,{c:'#2c3036'});box('flat',2.2,9.8,11.2,1.8,1.5,.2,{c:'#c3182f',jit:0});L.sign(2.2,10.2,11.45,1.8,.8,'18','#c3182f','#efe9de',.6);
 L.pplF(S,{cast:1,x:15,z:10.8,y:.5,h:6.2,yaw:PI});L.pplL({cast:1,x:17,z:10.6,y:.5,h:6.0,yaw:PI*.8,skin:SK[2]});
 L.bus(21,0,15,'#c3482f',15);L.car(0,0,17,CARS[0],10.5);
 L.tree(31,.5,9.4,1);lamps(night,6,32,3,12.6);
 nightLights(night,W,H);
 return{W:W,H:H,D:D,fx:[4,32]};
},'busStopDan');

L.reg('bus-station','Street','Bus station',function(S,night){
 var W=44,H=19,D=24;
 box('concrete',0,-1,0,W,1.5,D,{cell:3,c:'#9a968f'});box('asphalt',0,-.9,12,W,1,12,{cell:3.5,kp:{pz:'concrete'}});
 for(var i=0;i<5;i++)box('flat',2+i*8.6,.1,13.6,.3,.03,9,{c:'#d9d6cf',jit:0});
 L.facade(0,44,{h:12,k:'facade',night:night,floors:3,cols:8,z:3.4,y0:.5});
 for(var p=0;p<5;p++)box('flat',4+p*9,.5,9,.8,8.4,.8,{c:'#5d6168',jit:.03});
 box('flat',2,8.9,7.8,40,.5,5.6,{c:'#5f7a8f',jit:.04});
 L.sign(14,9.7,7.8,16,1.8,L.str(S,'bus'),'#1d2b4f','#efe9de',.5);
 L.bus(5,.5,13,'#2f6f8f',16);L.bus(25,.5,17.6,'#c3482f',16);
 L.bench(12,.5,9.4,6);L.bench(30,.5,9.4,6);
 L.strollers(S,6,9.4,11.4,3,42,{fan:.4,y:.5});
 for(var j=0;j<4;j++){L.pplL({x:8+j*2,z:11,y:.5,h:6,yaw:PI*.9});box('flat',8+j*2+.8,.5,11.2,.9,.8,.5,{c:pick(['#6a4a3e','#3a4a6e','#5a3a3a']),jit:.05})}
 nightLights(night,W,H);
 return{W:W,H:H,D:D,fx:[2,34]};
},'busStation');

L.reg('schoolyard','School','Schoolyard',function(S,night){
 var W=44,H=19,D=22;
 box('concrete',0,-1,0,W,1.5,D,{cell:3,c:'#aaa69c'});
 for(var s=0;s<8;s++)box('flat',2+s*4.2,.5,14,3.4,.03,.3,{c:'#efe9de',jit:0});box('flat',2,.5,14,.3,.03,7.5,{c:'#efe9de',jit:0});
 // school building
 box('flat',0,.5,3,26,16,.6,{c:'#3a3633'});
 wallZ('facade',0,26,.5,15,6.6,.8,[[2,6,6,10.4],[8.4,12.4,6,10.4],[14.8,18.8,6,10.4],[21,25,6,10.4],[2,6,.5,6]],{cell:2.5,kp:{py:'concrete'}});
 [[2,6,6,10.4],[8.4,12.4,6,10.4],[14.8,18.8,6,10.4],[21,25,6,10.4]].forEach(function(w){box('glass',w[0],w[2],6.9,w[1]-w[0],w[3]-w[2],.08,{c:L.glass(night),s:'nz,px,nx,py'});box('doorWood',w[0]-.25,w[2]-.25,7.3,w[1]-w[0]+.5,.3,.45,{c:'#cfc7b9'})});
 box('doorWood',2,.5,6.8,4,5.4,.3,{c:'#e6d8c4'});
 L.sign(6,12.6,7.45,11,1.8,L.str(S,'school'),S.t,S.s,.6);
 box('flat',11,15,6.8,2.2,2.2,.3,{c:'#efe9de',jit:0});box('flat',11.95,16,7.08,.14,.8,.05,{c:'#222',jit:0});box('flat',11.95,16,7.08,.7,.14,.05,{c:'#222',jit:0});
 L.cage(0,.5,21.6,44,3.4);
 L.hoop(34,.5,7.4);L.hoop(40,.5,7.4);box('flat',33,.51,7,10,.03,.2,{c:'#efe9de',jit:0});
 L.tree(28,.5,9.6,1.2);L.tree(2,.5,17,1);L.bench(12,.5,17,6);
 for(var i=0;i<9;i++)L.pplL({x:13+i*3,z:9+(i%4)*2.6,y:.5,h:4.4+rnd()*.5,yaw:rnd()*6,shirt:rnd()<.4?S.p:pick(L.SHIRTS),path:i%3===0?[[10+i,10+(i%4)*2.5],[34+i*.5,10+(i%4)*2.5]]:null,spd:1.4});
 L.ball(36,.5,11);
 L.light(night,22,10,14,0xfff0d0,1,50);
 return{W:W,H:H,D:D,fx:[2,34]};
},'ground');

L.reg('drive-in','Street','Drive-in',function(S,night){
 var W=48,H=22,D=26;
 box('asphalt',0,-1,0,W,1.5,D,{cell:3.5,c:'#4a4d52'});
 for(var r=0;r<3;r++)box('concrete',2,.5+r*.4,8+r*5,44,.4,2.6,{c:'#6a6d72',cell:3});
 box('flat',9,.5,0.6,.8,16,.8,{c:'#3a3f48'});box('flat',37,.5,0.6,.8,16,.8,{c:'#3a3f48'});
 box('flat',8,4,1.2,32,13,.8,{c:'#d8d6cf',jit:.02});decal(L.screenDec(S),9,4.6,2.04,30,11.8);
 box('flat',8,16.6,1.2,32,.8,1.2,{c:'#2a2c32'});
 for(var c=0;c<8;c++){var rr=c%3;L.car(3+c*5.2,.5+rr*.4,8.3+rr*5,CARS[c%CARS.length],9.6)}
 box('flat',21,.5,19,7,4,5,{c:'#d8d2c4',jit:.04});box('flat',21,4.5,18.6,7,.5,5.8,{c:S.p,jit:.03});L.sign(21.4,1.5,24.04,6.2,1.1,L.str(S,'snack'),S.t,S.s,.5);
 L.pplF(S,{x:23,z:25.2,y:.5,h:6.2,yaw:PI});L.pplL({x:25.6,z:25.6,y:.5,h:6.2,yaw:PI*.8});
 for(var k=0;k<5;k++)L.pplL({x:40+k*.9,z:20+(k%2),y:.5,h:5.4,yaw:PI*.9});
 box('glow',6,.5,23,.6,.15,.6,{c:'#ff9450'});
 L.light(true,24,8,9,0xcfe0ff,.8,34);L.light(true,24,8,16,0xffa060,.5,26);
 return{W:W,H:H,D:D,fx:[8,40]};
},'driveIn',{time:'night'});

L.reg('port-europe','Travel','Port',function(S,night){
 var W=48,H=24,D=26;
 L.sea(0,10,W,16);box('concrete',0,-1,0,W,1.5,10,{cell:3,c:'#9a968f'});box('plaza',0,-1,10,W,1.5,1.4,{cell:2.4});
 for(var b=0;b<7;b++)box('flat',2+b*7,.5,10.2,.7,.6,.7,{c:'#2c3036',jit:.03});
 L.ship(16,-.4,15,28,S.p);
 L.container(2,.5,2,'#4a6a8a');L.container(2,3.3,2,'#b56a52');L.container(9.4,.5,2,'#5a7a5a');L.container(24,.5,2.6,'#c9c4b8');L.container(31.4,.5,2.6,'#4a6a8a');L.container(31.4,3.3,2.6,'#8a4a3a');
 L.crane(40,.5,5,16,9);
 L.bus(4,.5,6.4,'#2f6f8f',15);
 for(var i=0;i<6;i++)L.pplF(S,{x:22+i*2,z:7.2+(i%3)*.9,y:.5,h:6.2,yaw:PI*.6,scarf:i%2?[S.p,S.s]:null});
 for(var k=0;k<4;k++)box('flat',22+k*3,.5,8.6,1.4,1.2,.8,{c:pick(['#3a4a6e','#6a4a3e',S.p]),jit:.05});
 L.flag(34,.5,8,6);
 L.light(night,24,14,8,0xcfe0ff,1,50);
 return{W:W,H:H,D:D,fx:[0,34]};
},'ground');

L.reg('promenade','Travel','Promenade',function(S,night){
 var W=48,H=20,D=24;
 L.sea(0,12,W,12,-1.6);box('sidewalk',0,-1,0,W,1.5,8,{cell:2.4,kp:{pz:'concrete'}});box('plaza',0,-1,8,W,1.5,4,{cell:2.2,kp:{pz:'concrete'}});
 L.facade(0,48,{h:16,k:'facade',night:night,floors:4,cols:9,z:2,balc:true,shutters:'#8a9aa8'});
 for(var r=0;r<24;r++){box('flat',1+r*1.9,.5+0,11.6,.15,2.2,.15,{c:'#cfd3d8',jit:0})}box('flat',1,2.7,11.6,46,.15,.15,{c:'#cfd3d8',jit:0});
 for(var p=0;p<5;p++)L.palm(4+p*9.6,.5,9.4,1+(p%2)*.15);
 for(var b=0;b<4;b++)L.bench(8+b*10,.5,8.2,4.6);
 L.strollers(S,9,9,11,1,46,{fan:.35,y:.5});
 L.stall(S,26,.5,6.6,4.6,'#2f6f8f');
 for(var k=0;k<5;k++)L.bunting(S,2+k*9,12.6,6,10+k*9,6,6);
 L.sitL(14,9.6,1.7,PI,{y:.5,h:5.4});
 L.light(night,24,12,10,0xffd29a,1,46);
 return{W:W,H:H,D:D,fx:[4,36]};
},'panoPromenade');

/* ---------------- JAFFA ---------------- */
L.reg('jaffa','Jaffa','Jaffa square',function(S,night){
 var W=44,H=26,D=24;
 L.sea(0,14,W,10,-1.6);box('plaza',0,-1,0,W,1.5,14,{cell:2.4,kp:{pz:'concrete'}});box('concrete',0,-1,14,W,1,.8,{cell:2.4});
 L.facade(0,14,{h:14,k:'plaza',night:night,floors:3,z:4.4,cols:3,shop:true,sign:'KAFE',signBg:'#2f4a3a',awn:{p:'#8a4a3a',s:'#efe9de'}});
 L.facade(30,44,{h:13,k:'plaza',night:night,floors:3,z:4.4,cols:3});
 L.towerClock(18,.5,5,12);
 L.arch(25,.5,6.4,5,6,'plaza');
 L.palm(6,.5,10,1.15);L.palm(40,.5,10.4,1.1);L.palm(33,.5,9,.95);
 L.bench(10,.5,10.4,5);L.bench(24,.5,12.2,5);
 for(var i=0;i<3;i++)L.stall(S,14+i*8,.5,11.6,4.2,pick(['#b56a52','#2f6f8f']));
 L.strollers(S,8,10,13,2,42,{fan:.3,y:.5});
 L.potted(22,.5,9.4,1.2);
 L.light(night,22,14,12,0xffd29a,1.1,50);
 return{W:W,H:H,D:D,fx:[4,36]};
},'jaffa00');

L.reg('jaffa-alley','Jaffa','Jaffa alley',function(S,night){
 var W=36,H=22,D=22;
 box('plaza',0,-1,0,W,1.5,D,{cell:2.2,c:'#b9a88c',kp:{pz:'concrete'}});
 // left & right stone walls
 box('plaza',0,-1,0,5.5,24,D,{cell:2.4,c:'#c4b093',kp:{px:'plaza'}});
 box('plaza',W-5.5,-1,0,5.5,24,D,{cell:2.4,c:'#b8a285'});
 box('plaza',0,-1,0,W,24,2.4,{cell:2.4,c:'#cdb99a'});
 L.arch(5.5,.5,3.2,12,7.4,'plaza');L.arch(18,.5,3.2,12,7.4,'plaza');
 box('flat',9,.5,2.4,4,6,.2,{c:'#2a2c32'});box('flat',22,.5,2.4,4,6,.2,{c:'#7a5a3e'});box('doorWood',9.4,.5,2.62,3.2,5.4,.2,{c:'#3a6a8a'});
 for(var l=0;l<4;l++)box('flat',7+l*6,9.2+(l%2),3,.15,2.2,.15,{c:'#444'});
 box('glow',6.2,8.2,6,1.0,1.6,1.0,{c:night?'#ff9450':'#f0dcb8'});
 box('flat',9.6,8.2,5.8,1.0,1.6,1.0,{c:night?'#ff9450':'#f0dcb8'});
 L.potted(7,.5,6,1.4);L.potted(27,.5,4,1.2);L.potted(12,.5,12,1);
 [[8,13],[14,13],[20,13],[26,13],[11,17.4],[22,17.4]].forEach(function(w){box('flat',w[0],w[1],2.45,2.4,3.2,.08,{c:night?'#e6a860':'#6f93b4',jit:.04});box('doorWood',w[0]-.3,w[1]-.3,2.5,3,.35,.4,{c:'#d6cfc2'});box('doorWood',w[0]-.3,w[1]+3.2,2.5,3,.3,.4,{c:'#d6cfc2'});box('doorWood',w[0]-1.1,w[1],2.5,.9,3.2,.3,{c:'#3a6a8a'});box('doorWood',w[0]+2.6,w[1],2.5,.9,3.2,.3,{c:'#3a6a8a'})});
 L.table(14,.5,8.4,2.4,2.4,2.4,'woodPanel','#3a3f48');L.chair(13.4,.5,10.9,-1,'#8a5a3a');L.chair(16.4,.5,10.9,-1,'#8a5a3a');L.sitL(14.2,11,1.7+.5,PI,{y:.5,h:5.4});
 L.sign(19,8,3.1,5,1.1,'CAFÉ','#4a3a2e','#efe9de',.5);
 L.pplF(S,{x:24,z:11,y:.5,h:6.4,yaw:-PI*.5});L.strollers(S,2,13,14,8,30,{y:.5});
 L.bunting(S,6,12.4,6,30,6,14);
 L.light(night,18,10,10,0xffc98a,1.2,36);
 return{W:W,H:H,D:D,fx:[4,32]};
},'jaffaAlleyCafe');

L.reg('jaffa-boulevard','Jaffa','Jaffa boulevard',function(S,night){
 var W=48,H=22,D=24;
 box('sidewalk',0,-1,0,W,1.5,10,{cell:2.4,kp:{pz:'concrete'}});box('asphalt',0,-1,10,W,1,14,{cell:3.5,kp:{pz:'concrete'}});box('plaza',0,-1,10,W,1.5,3.4,{cell:2.4,c:'#cdb99a'});
 L.facade(0,22,{h:15,k:'plaza',night:night,floors:3,z:4,cols:4,shop:true,sign:'JAFFA',signBg:'#8a4a3a',awn:{p:'#2f6f8f',s:'#efe9de'},balc:true});
 L.facade(22,48,{h:14,k:'ochre',night:night,floors:3,z:4,cols:5,balc:true});
 for(var t=0;t<5;t++)L.tree(3+t*10,.5,11.6,1.2);
 for(var b=0;b<4;b++)L.bench(8+b*11,.5,9.4,4.8);
 lamps(night,4,46,5,13,.5);
 L.car(0,0,18,CARS[0],10.5);L.car(37,0,18,CARS[1],10.5);
 L.strollers(S,8,10,13,1,46,{fan:.3,y:.5});
 L.stall(S,32,.5,7.6,4.6,'#b56a52');
 L.light(night,24,14,10,0xffd29a,1,50);
 return{W:W,H:H,D:D,fx:[4,36]};
},'jaffaBoulevard');
})();
