/* LIFE voxel rooms — stadiums, halls, away ends. */
(function(){
var V=window.__vx,L=window.__vxLib,box=V.box,wallZ=V.wallZ,decal=V.decal,decalY=V.decalY,rnd=V.rnd,pick=V.pick,cube=V.cube,pm=V.pm,face=V.face;
var SK=V.SKIN,HR=V.HAIR,PN=V.PANTS,PI=Math.PI,CARS0='#8fa3b8';

function flags(S,x0,n,gap,y,z,h){for(var i=0;i<n;i++)L.flag(x0+i*gap,y,z,h||6)}
function gateNum(S,i){return String(S.nums[i==null?1:i])}
function roof(x,y,z,w,d,c){box('flat',x,y,z,w,.5,d,{c:c||'#3a4048',jit:.03});for(var i=0;i<Math.round(w/6);i++)box('flat',x+i*6,y-1.4,z,.5,1.4,d,{c:'#2a2e34',jit:0})}

/* ---------------- BLOOMFIELD ---------------- */
L.reg('bloomfield-tunnel','Stadium','Tunnel to the terrace',function(S,night){
 var W=22,H=12,D=26;
 box('concrete',0,-1,0,W,1.5,D,{cell:2.4,c:'#8f8b83'});
 box('concrete',0,.5,0,3.4,H,D,{cell:2.4,c:'#a9a59d'});box('concrete',W-3.4,.5,0,3.4,H,D,{cell:2.4,c:'#a39f97'});
 box('concrete',0,H-3,0,W,3,14,{cell:2.4,c:'#8b8780'});
 // bright end of the tunnel: terrace glimpse
 box('glow',3.4,.5,.2,W-6.8,H-3.5,.1,{c:night?'#2a3a6a':'#e8f0f8'});
 box('flat',3.4,.5,.3,W-6.8,1.0,.1,{c:'#6a8a5a',jit:.05});
 for(var s=0;s<5;s++)box('concrete',3.4,.5+s*.45,1+s*.9,W-6.8,.45,.9,{cell:2.4,c:'#9a968f'});
 for(var i=0;i<3;i++){box('flat',3.4,H-3.2,3+i*4.5,W-6.8,.25,.5,{c:'#2a2e34',jit:0});box('glow',W/2-1.2,H-3.4,3+i*4.5,2.4,.2,1.2,{c:night?'#ff9a50':'#f4efe6'})}
 box('flat',3.4,6,.4,.5,4,.05,{c:'#2c3036',jit:0});
 L.sign(8,6.4,10.0,6,1.2,S.stadium.toUpperCase(),S.t,S.s,.5);
 for(var k=0;k<8;k++)L.pplF(S,{x:5+rnd()*12,z:3+k*2.6,y:.5,h:6.0+rnd()*.8,yaw:PI*(k%3===0?0:1),scarf:k%2?[S.p,S.s]:null,path:k%2?[[4+rnd()*3,3+k*2.6],[17-rnd()*3,3+k*2.6]]:null,spd:1.1});
 L.warm(night,11,8,8,0xff9a50,.8,26);L.warm(true,11,8,3,0xfff0d0,.6,18);
 return{W:W,H:H,D:D,fx:[2,20]};
},'bloomOldTunnel');

L.reg('bloomfield-inside','Stadium','Terrace inside',function(S,night){
 var W=52,H=22,D=30;
 L.pitch(2,17,48,13,0,{});
 box('concrete',0,-1,0,W,1.5,17,{cell:3,c:'#8f8b83'});
 L.terrace(S,2,0,1,22,10,{seats:true,fill:.82});L.terrace(S,26,0,1,24,10,{seats:true,fill:.82});
 box('flat',24.3,0,1,1.6,12,23,{c:'#6f6a66',jit:.03});
 L.banner(4,3.4,13.2,10,3.2,'banner');L.banner(30,3.4,13.2,10,3.2,'banner');
 for(var b=0;b<9;b++)L.flag(2.5+b*5.4,0,14.4+(b%2)*.4,7);
 L.cage(2,0,15.4,48,3);
 roof(0,17,0,W,6,'#3a4048');
 L.floodlight(1,0,2,20,night);L.floodlight(50,0,2,20,night);
 L.goal(2,0,22.6,5.4,5);
 for(var p=0;p<10;p++)L.pplF(S,{x:8+p*4.2,z:14.4,y:0,h:6.2,yaw:0,anim:'cheer'});
 L.pplL({cast:1,x:25,z:25,y:0,h:6.2,yaw:PI*.5,shirt:'#1d2b4f'});
 L.warm(night,26,18,14,0xfff4d8,1.4,60);
 return{W:W,H:H,D:D,fx:[4,40]};
},'bloomOldTerrace');

L.reg('gate5','Stadium','Gate 5',function(S,night){
 var W=44,H=22,D=24;
 box('gatePave',0,-1,0,W,1.5,D,{cell:3});
 box('concrete',0,.5,2,W,15,3,{cell:3,c:'#b3aea3'});
 for(var i=0;i<6;i++)box('flat',2+i*7,.5,5,4.4,8.4,.5,{c:'#d8d2c4',jit:.03});
 box('flat',16,.5,4.9,12,9,.8,{c:S.t,jit:.03});
 L.sign(17,7.2,5.8,10,2.4,gateNum(S,1),S.t,S.s,.8);
 L.sign(13,9.8,5.8,18,1.6,L.str(S,'gate')+' · '+S.stadium.toUpperCase(),S.p,S.s,.45);
 L.crestPlate(S,20,3.2,5.8,3.4);
 for(var t=0;t<4;t++){box('flat',10+t*6,.5,8,.3,3,2.8,{c:'#6a6e75',jit:0});box('flat',10+t*6,3.3,8,.3,.3,2.8,{c:'#6a6e75',jit:0});box('flat',9.7+t*6,.5,8,.15,3,.2,{c:'#9aa0a8',jit:0})}
 box('flat',2,.5,8,5,3.6,3.2,{c:'#d8d2c4',jit:.03});box('flat',1.8,4.1,7.8,5.4,.5,3.6,{c:S.p,jit:.03});box('glass',2.4,1.8,11.1,4,1.6,.08,{c:L.glass(night),s:'nz,px,nx,py'});
 L.bunting(S,0,12.4,12,44,12,24);
 for(var f=0;f<7;f++)L.flag(1.5+f*6.3,.5,13.4,7);
 for(var q=0;q<12;q++)L.pplF(S,{x:8+(q%6)*2.2+rnd(),z:12+Math.floor(q/6)*2.6+rnd(),y:.5,h:6+rnd()*.8,yaw:PI*.05,scarf:q%2?[S.p,S.s]:null,anim:q%5===0?'cheer':'idle'});
 L.floodlight(40,.5,3,22,night);L.lampPost(30,.5,16,night);
 L.light(night,22,12,14,0xfff0d0,1.1,50);
 return{W:W,H:H,D:D,fx:[4,38]};
},'gate5');

L.reg('gate5-stand','Stadium','Gate 5 curva',function(S,night){
 var W=48,H=24,D=26;
 box('concrete',0,-1,0,W,1.5,D,{cell:3,c:'#8f8b83'});
 L.terrace(S,1,0,2,24,12,{seats:false,fill:.95,home:1,sw:1.9});
 box('concrete',0,0,15,W,2.4,.6,{c:'#a9a59d'});
 L.cage(1,0,23.4,46,3.4);
 L.banner(4,5,16.6,18,4.4,'banner');
 for(var b=0;b<10;b++)L.flag(2+b*4.4,0,16.4,8+(b%3));
 // capo on the fence, drum
 box('flat',22,2.4,22.2,2.4,3,2.4,{c:S.p,jit:.04});L.pplF(S,{x:23.2,z:22.9,y:5.4,h:6.8,yaw:PI,anim:'cheer'});
 for(var r=0;r<3;r++)for(var k=0;k<9;k++)L.pplF(S,{x:3+k*4.9+(r%2)*1.2,z:18.2+r*1.7,y:0,h:6.2,yaw:0,anim:(k+r)%3?'cheer':'idle',scarf:[S.p,S.s]});
 box('glow',2,14,1.4,.9,.9,.9,{c:night?'#ff9a50':'#f0dcb8'});
 roof(0,19,0,W,5,'#33383f');
 L.floodlight(1,0,2,22,night);L.floodlight(46,0,2,22,night);
 L.warm(night,24,12,14,0xff9a50,1.1,50);L.light(true,24,14,18,0xfff0d0,.5,50);
 return{W:W,H:H,D:D,fx:[4,40]};
},'gate5Stand');

L.reg('undercroft','Stadium','Under the stand',function(S,night){
 var W=40,H=14,D=22;
 box('concrete',0,-1,0,W,1.5,D,{cell:2.4,c:'#8b877f'});
 box('concrete',0,0,0,W,H,1.4,{cell:2.4,c:'#a39f97'});box('concrete',0,H-2.5,0,W,2.5,16,{cell:2.4,c:'#85817a'});
 box('concrete',-1.4,0,0,1.4,H,D,{cell:2.4,c:'#a39f97',s:'px'});
 for(var p=0;p<6;p++)L.pillar(4+p*7,0,6+(p%2)*5.4,2.2,H-2.5,2.2,'#a9a59d');
 for(var i=0;i<6;i++){box('flat',2+i*7,H-2.9,3,.35,.35,12,{c:'#6a6e75',jit:0});box('glow',3+i*7,H-3.0,8,1.8,.2,.5,{c:night?'#ff9a50':'#f4efe6'})}
 for(var q=0;q<3;q++)box('flat',1,H-4.2-q*.7,1.5,38,.25,.25,{c:q?'#c9602a':'#6a6e75',jit:0});
 decal('graffiti',6,1.4,1.45,9,4.5);L.sign(26,5.6,1.46,6,1.4,L.str(S,'stand')+' '+gateNum(S,1),S.t,S.s,.55);
 box('doorWood',33,0,1.4,3.4,7,.3,{c:'#6b5848'});
 for(var s=0;s<4;s++)box('concrete',17+s*.9,s*.5,7,.9,.5,6,{cell:2.4,c:'#9a968f'});
 box('flat',2,0,2.4,3,2,2,{c:'#a58a62',jit:.05});L.crate(5.4,0,2.6,2.4,2.4,2.4,'#957a56');
 for(var f=0;f<5;f++)box('flat',12+f*.5,0,3,.3,8,.3,{c:'#cfd3d8',jit:0});for(var k=0;k<5;k++)box('flat',12.2+k*.5,6,3.1,.8,1.6,.05,{c:k%2?S.p:S.s,jit:.04});
 for(var m=0;m<7;m++)L.pplF(S,{x:4+rnd()*30,z:10+rnd()*8,y:0,h:6.2,yaw:rnd()*6,scarf:m%2?[S.p,S.s]:null,path:m%3===0?[[4+rnd()*8,12+m],[30+rnd()*6,12+m]]:null,spd:1.4});
 L.warm(night,20,8,10,0xff9a50,.9,40);L.warm(true,20,8,10,0xffb870,.5,36);
 return{W:W,H:H,D:D,fx:[2,34]};
},'bloomOldTunnel');

L.reg('ramat-gan','Stadium','Ramat Gan',function(S,night){
 var W=56,H=26,D=26;
 box('gatePave',0,-1,0,W,1.5,D,{cell:3,c:'#aaa69c'});
 box('concrete',0,.5,0,W,18,3.4,{cell:3,c:'#b9b4aa'});
 for(var i=0;i<9;i++){box('concrete',2+i*6,.5,3.4,2.4,15,1.6,{cell:2.4,c:'#c4bfb5'});L.arch(4.2+i*6-.2,.5,3.5,3.8,10.6,'concrete')}
 box('flat',0,17.6,2,W,1.2,3,{c:S.t,jit:.03});L.sign(14,14,5.2,28,2.6,'RAMAT GAN STADIUM',S.p,S.s,.52);
 box('concrete',-3,.5,2,3,26,5,{cell:2.4});box('concrete',W,.5,2,3,26,5,{cell:2.4});
 for(var s=0;s<7;s++)box('concrete',8,.5+s*.4,12+(6-s)*1.1,40,.4,1.1,{cell:2.4,c:'#9a968f'});
 for(var f=0;f<11;f++)L.flag(2+f*5.2,.5,16,8);
 L.bunting(S,0,12.6,14,56,14,34);
 for(var q=0;q<30;q++)L.pplF(S,{x:4+rnd()*48,z:16+rnd()*7,y:.5,h:6+rnd()*.8,yaw:PI*.05+rnd(),scarf:q%2?[S.p,S.s]:null,anim:q%7===0?'cheer':'idle',path:q%4===0?[[4+rnd()*10,16+rnd()*7],[40+rnd()*10,16+rnd()*7]]:null,spd:1});
 L.floodlight(1,.5,10,25,night);L.floodlight(54,.5,10,25,night);
 L.bus(30,.5,21,'#2f6f8f',16);
 L.light(night,28,14,14,0xfff0d0,1.2,70);
 return{W:W,H:H,D:D,fx:[6,44]};
},'ground');

L.reg('teddy','Stadium','Teddy',function(S,night){
 var W=56,H=24,D=30;
 L.pitch(8,18,40,11,0,{});
 box('concrete',0,-1,0,W,1.5,18,{cell:3,c:'#8f8b83'});
 L.terrace(S,2,0,1,26,10,{seats:true,fill:.55,home:.2,mono:'#b8b4ac'});
 // away pocket (S fans) behind a fence at the right
 L.terrace(S,30,0,1,10,10,{seats:true,fill:.95,home:1,mono:S.p});L.cage(30,0,23.4,0,0);
 box('concrete',29.4,0,1,.6,12,23,{c:'#6f6a66'});
 L.banner(33,3.4,13.4,8,3,'banner');
 L.cage(2,0,15.4,28,3);L.cage(31,0,15.4,20,3);
 L.sign(12,9.6,1.2,14,1.8,'TEDDY',S.t,S.s,.6);
 roof(0,17,0,W,6,'#3a4048');L.floodlight(1,0,2,20,night);L.floodlight(54,0,2,20,night);
 for(var i=0;i<9;i++)L.flag(31.4+i*2,0,14.4,6);
 L.goal(8,0,22.6,5.4,5);
 L.warm(night,28,18,14,0xfff4d8,1.4,60);
 return{W:W,H:H,D:D,fx:[4,44]};
},'ground');

function awayEnd(id,label,ref,city,localCol,localCol2,banner,cityLine){
 L.reg(id,'Away','Away end · '+label,function(S,night){
  var W=52,H=24,D=28,loc={p:localCol,s:localCol2};
  L.pitch(2,18,48,10,0,{});box('concrete',0,-1,0,W,1.5,18,{cell:3,c:'#8f8b83'});
  L.terrace(loc,2,0,1,18,10,{seats:true,fill:.8,home:.9});
  L.terrace(S,34,0,1,15,10,{seats:true,fill:.97,home:1,mono:S.p});
  box('concrete',33.4,0,1,.6,12,23,{c:'#6f6a66'});
 L.cage(34,0,15.6,30,3.4);
  L.banner(36,3,13.6,12,3.4,'banner');if(banner)L.sign(2,9.4,1.2,18,1.8,banner,localCol,localCol2,.5);else L.sign(35,9.6,1.2,13,1.8,L.str(S,'away'),S.t,S.s,.5);
  if(cityLine)L.sign(8,19.4,1.2,36,2.2,cityLine,localCol,localCol2,.6);
  for(var i=0;i<12;i++)L.flag(34.4+i*2.4,0,14.8+(i%2)*.5,7);
  for(var p=0;p<8;p++)L.pplF(S,{x:35+p*3.4,z:14.4,y:0,h:6.2,yaw:0,anim:'cheer',scarf:[S.p,S.s]});
  for(var q=0;q<5;q++)L.pplL({x:5+q*5,z:14.4,y:0,h:6.2,yaw:0,shirt:localCol,anim:'cheer'});
  roof(0,17,0,W,6,'#363b42');L.floodlight(1,0,2,20,night);L.floodlight(50,0,2,20,night);
  L.goal(4,0,22.6,5.4,5);
  L.warm(night,26,18,14,0xfff4d8,1.4,60);
  return{W:W,H:H,D:D,fx:[4,46]};
 },ref);
}
awayEnd('away-salzburg','Salzburg','','Salzburg','#efe9de','#d3202f','RED BULL ARENA','SALZBURG');
awayEnd('away-lisbon','Lisbon','benfica2010','Lisbon','#c3182f','#efe9de','ESTÁDIO DA LUZ','LISBOA');
awayEnd('away-lyon','Lyon','lyon2010','Lyon','#1f3e8c','#c3182f','GROUPAMA STADIUM','LYON');
/* any ground, anywhere: the home end is nobody's colours, and nothing on the wall names a place */
awayEnd('away-end','any ground','','','#6b7686','#d9d6cf','','');

/* ---------------- HALLS & ARENAS ---------------- */
function arenaOut(S,night,o){
 var W=52,H=24,D=26;
 box('gatePave',0,-1,0,W,1.5,D,{cell:3,c:'#a9a59d'});
 box('concrete',2,.5,2,48,16,10,{cell:3,c:o.c1});
 box('concrete',0,.5,0,52,20,3,{cell:3,c:o.c2});
 box('glass',8,1.4,12.1,36,6.4,.15,{c:L.glass(night),s:'nz,px,nx,py'});
 if(night)box('glow',8.4,1.8,12.15,35.2,5.6,.05,{c:'#ffb870',s:'nz,px,nx,py'});
 for(var i=0;i<10;i++)box('flat',8+i*4,1.4,12.2,.3,6.4,.3,{c:'#2a2e34',jit:0});
 box('flat',8,7.8,12.1,36,.7,.7,{c:'#2a2e34',jit:0});
 L.sign(10,12.6,12.2,32,3,o.name,o.sbg,o.sfg,.55);
 L.crestPlate(S,3,12.4,12.2,4.2);
 for(var s=0;s<6;s++)box('concrete',8,.5+s*.4,12.4+(5-s)*1.0,36,.4,1,{cell:2.4,c:'#9a968f'});
 for(var f=0;f<8;f++)L.flag(6+f*5.6,.5,19,7);
 L.bunting(S,2,13.6,18.6,50,18.6,26);
 for(var q=0;q<22;q++)L.pplF(S,{x:8+rnd()*38,z:18.2+rnd()*5,y:.5,h:6+rnd()*.8,yaw:PI*.05+rnd()*.6,scarf:q%2?[S.p,S.s]:null,anim:q%6===0?'cheer':'idle',path:q%5===0?[[6+rnd()*10,19+rnd()*5],[36+rnd()*10,19+rnd()*5]]:null,spd:1});
 L.lampPost(46,.5,22,night);L.lampPost(6,.5,22,night);
 L.light(night,26,12,16,0xfff0d0,1.1,60);
 return{W:W,H:H,D:D,fx:[6,44]};
}
L.reg('arena-out','Arena','Arena outside',function(S,night){return arenaOut(S,night,{c1:'#8a929c',c2:'#a2aab4',name:'EURO ARENA',sbg:'#16213a',sfg:'#efe9de'})},'arenaEuroOut');
L.reg('menora','Arena','Menora arena',function(S,night){return arenaOut(S,night,{c1:'#b9b4aa',c2:'#c8c3b8',name:'MENORA ARENA',sbg:S.t,sfg:S.s})},'menoraSeats');

L.reg('arena-seats','Arena','Arena seats',function(S,night){
 var W=52,H=24,D=28;
 L.court(8,15,36,12);box('concrete',0,-1,0,W,1.5,15,{cell:3,c:'#8b877f'});
 L.terrace(S,2,0,1,24,11,{seats:true,fill:.8});L.terrace(S,27,0,1,23,11,{seats:true,fill:.8});box('flat',26.2,0,1,.8,13,24,{c:'#6f6a66'});
 L.hoop(9.4,0,16);L.hoop(40.6,0,16);
 box('flat',20,14,10,12,2.6,6,{c:'#2a2c32',jit:.03});box('glow',20.4,14.4,15.9,11.2,1.8,.1,{c:'#e8d9a0'});
 L.banner(4,14.4,1.2,10,3.2,'banner');L.banner(38,14.4,1.2,10,3.2,'banner');
 for(var i=0;i<8;i++)L.flag(4+i*6,0,14.2,6);
 for(var p=0;p<8;p++)L.pplF(S,{x:14+p*3.4,z:14.4,y:0,h:6.2,yaw:0,anim:'cheer'});
 for(var q=0;q<10;q++)L.pplL({x:10+q*3.2,z:19+(q%3)*2.4,y:0,h:6.4,yaw:q%2?PI*.5:-PI*.5,shirt:q%2?S.p:'#2f6f8f',path:q<4?[[10+q*3,19+(q%3)*2.4],[34-q,19+(q%3)*2.4]]:null,spd:2.2});
 roof(0,18,0,W,6,'#363b42');
 L.warm(night,26,17,14,0xfff4d8,1.4,60);
 return{W:W,H:H,D:D,fx:[4,46]};
},'arenaEuroSeats');

L.reg('ussishkin-outside','Ussishkin','Ussishkin outside',function(S,night){
 var W=44,H=19,D=22;
 box('sidewalk',0,-1,0,W,1.5,12,{cell:2.4,kp:{pz:'concrete'}});box('asphalt',0,-1,12,W,1,10,{cell:3.5,kp:{pz:'concrete'}});
 box('concrete',4,.5,2,34,12,6,{cell:3,c:'#a9a59d'});
 box('concrete',2,12.3,1.6,38,1.2,6.8,{cell:3,c:'#8f8b83'});
 for(var i=0;i<7;i++){box('flat',6+i*4.4,7.6,8.1,2.2,2.6,.12,{c:'#2a2c32',jit:0});box('glass',6.1+i*4.4,7.7,8.14,2,2.4,.1,{c:L.glass(night),s:'nz,px,nx,py'})}
 box('doorWood',16,.5,8.1,6,6.4,.4,{c:'#6b5848'});box('doorWood',16.4,.5,8.4,2.6,6,.2,{c:'#e6d8c4'});box('doorWood',19.0,.5,8.4,2.6,6,.2,{c:'#e6d8c4'});
 for(var s=0;s<3;s++)box('concrete',14.6,.5+s*.3,8.4+(2-s)*.8,8.8,.3,.8,{cell:2.4});
 L.sign(12,8.8,8.2,14,1.8,'אוסישקין','#1d2b4f','#efe9de',.62);
 decal('graffiti',26,.8,8.14,9,4.5);
 L.bunting(S,4,13.2,9,40,9,22);
 for(var b=0;b<4;b++)L.bike(5+b*1.2,.5,12.2+b*.4,pick(['#2f6f8f',S.p,'#5a8a3c']));
 for(var q=0;q<12;q++)L.pplF(S,{x:6+rnd()*32,z:11.2+rnd()*3,y:.5,h:5.6+rnd()*1.2,yaw:PI*.05+rnd()*.7,scarf:q%2?[S.p,S.s]:null,anim:q%6===0?'cheer':'idle'});
 L.lampPost(2,.5,12.4,night);L.lampPost(42,.5,12.4,night);L.tree(36,.5,11,1.1);
 L.car(34,0,17.6,CARS0,10.5);
 L.light(night,22,12,12,0xffd29a,1.1,50);
 return{W:W,H:H,D:D,fx:[2,34]};
},'gate7Old');

function ussHall(S,night,o){
 var W=o.W||34,H=18,D=24;
 L.court(5,8,W-10,12);box('concrete',0,-1,0,W,1.5,8,{cell:3,c:'#8b877f'});
 L.hoop(6.4,0,9);L.hoop(W-9.4,0,9);
 // old wooden bleachers both sides
 for(var r=0;r<7;r++){box('woodPanel',0,0,1+r*1.1,W,.9+r*.85,1.1,{cell:2.4,c:'#8a6a4a',jit:.06});}
 for(var q=0;q<7;q++)for(var c=0;c<Math.floor(W/1.9);c++)if(rnd()<.84)L.mini(S,1+c*1.9,.9+q*.85,1.6+q*1.1,{home:.75});
 L.banner(4,8.6,.04,8,3,'banner');L.banner(W-12,8.6,.04,8,3,'banner');L.sign(W/2-6,11.4,.06,12,1.6,'אוסישקין','#1d2b4f','#efe9de',.6);
 for(var i=0;i<6;i++)box('flat',2+i*(W-4)/6,13.4,1,2.2,.5,3,{c:'#3a3f48',jit:0});
 for(var f=0;f<8;f++)L.flag(2+f*(W-4)/8,0,7,6);
 for(var p=0;p<7;p++)L.pplF(S,{x:8+p*3.2,z:7.2,y:0,h:6.2,yaw:0,anim:'cheer',scarf:[S.p,S.s]});
 for(var k=0;k<6;k++)L.pplL({x:9+k*2.9,z:13+(k%3)*1.8,y:0,h:6.4,yaw:k%2?PI*.5:-PI*.5,shirt:k%2?S.p:'#e9e5de',path:k<3?[[9+k*2.5,13+(k%3)*1.8],[W-12-k,13+(k%3)*1.8]]:null,spd:2});
 L.warm(night,W/2,13,10,0xfff0c0,1.3,50);
 return{W:W,H:H,D:D,fx:[2,W-2]};
}
L.reg('ussishkin-hall','Ussishkin','Ussishkin hall',function(S,night){return ussHall(S,night,{W:36})},'panoUssHall');
L.reg('ussishkin-end','Ussishkin','Ussishkin end line',function(S,night){
 var W=30,H=18,D=22;
 L.court(2,10,26,10);box('concrete',0,-1,0,W,1.5,10,{cell:3,c:'#8b877f'});
 L.hoop(13.4,0,11);
 for(var r=0;r<5;r++)box('woodPanel',0,0,1+r*1.4,W,1.2+r*1.0,1.4,{cell:2.4,c:'#8a6a4a',jit:.06});
 for(var q=0;q<5;q++)for(var c=0;c<Math.floor(W/1.5);c++)if(rnd()<.92)L.mini(S,.8+c*1.5,1.2+q*1.0,1.8+q*1.4,{home:.9});
 L.banner(3,9,.04,9,3.4,'banner');L.banner(18,9,.04,9,3.4,'banner');
 for(var b=0;b<8;b++)L.flag(1.6+b*3.7,0,8.6,7);
 for(var p=0;p<8;p++)L.pplF(S,{x:3+p*3.2,z:8.6,y:0,h:6.4,yaw:0,anim:'cheer',scarf:[S.p,S.s]});
 box('doorWood',24,0,.0,3.6,7.4,.3,{c:'#6b5848'});
 L.warm(night,15,13,9,0xfff0c0,1.3,40);
 return{W:W,H:H,D:D,fx:[1,29]};
},'panoUssDerby');
})();
