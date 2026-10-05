/* LIFE voxel rooms — interiors: homes, school, work, club rooms. */
(function(){
var V=window.__vx,L=window.__vxLib,box=V.box,wallZ=V.wallZ,decal=V.decal,decalY=V.decalY,rnd=V.rnd,pick=V.pick,cube=V.cube,pm=V.pm;
var SK=V.SKIN,HR=V.HAIR,PN=V.PANTS;
var PI=Math.PI;
function ptn(S){return L.pat(S)}

/* ---------------- HOME ---------------- */
L.reg('bedroom','Home','Bedroom',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'woodPanel',floorC:'#cdb896',wallC:'#efebe4',windows:[[14.2,19.4,3.8,8.2]],doors:[[20.6,23.4,7.2]],fx:[1,23]});
 L.bed(1,0,.6,8.4,4.2,S.p);
 box('flat',1.4,2.05,.9,2.6,.9,3.6,{c:S.s,jit:.03});
 L.banner(1.6,5.0,.04,3.6,2.6,'flag');L.crestPlate(S,6.0,5.0,.05,2.4);
 box('doorWood',9.8,4.2,.0,3.2,4.4,.15,{c:'#6a5848'});decal('shirtF',9.9,4.3,.16,3.0,4.2);
 L.wardrobe(9.8,0,.1,4.0,8,2);
 L.desk(14.6,0,.3,5.4,2.6);L.lamp(15.1,3.0,.7,night?'#ff9450':'#f2e6d6');
 box('flat',17.6,3.0,.6,1.8,.12,1.4,{c:'#efe9de',jit:0});box('flat',17.9,3.12,.9,.6,.4,.5,{c:S.p,jit:.03});
 L.chair(16.4,0,3.4,-1,'#8a5a3a');
 L.rug(7.2,5.2,7.2,5.0);L.ball(11.4,0,6.8);
 L.shelf(0.2,3.4,9.6,1.4,.3,0);
 L.sitAt(S,5.6,3.2,2.0,PI/2,{h:4.8,y:0,cast:1});
 L.pplL({cast:1,x:19.4,z:6.2,h:6.4,yaw:PI});
 L.warm(night,5,6,4,0xffb870,.9,16);
 return m;
},'bedroom');

L.reg('kitchen','Home','Kitchen',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'terrazzo',wallC:'#ebe7de',windows:[[8.4,13.4,4.6,8.6]],doors:[[20.4,23.2,7.2]],fx:[1,23]});
 L.counter(.2,0,.3,7.4,2.6,3.2,'#d9d3c6','#b9a890');L.stove(.8,3.2,.5,4);L.fridge(7.8,0,.4);
 L.counter(14.2,0,.3,6.2,2.6,3.2,'#d9d3c6','#b9a890');
 box('flat',16,3.4,.7,1.6,1.2,1.0,{c:'#cfd3d8'});box('flat',18.2,3.4,.7,1.0,.7,.8,{c:S.p,jit:.03});
 for(var i=0;i<4;i++)box('flat',1+i*1.5,6.8,.15,.5,1.9+i*.2,.4,{c:'#9aa0a8',jit:0});
 L.shelf(14.4,6.2,5.6,3,1,.7);
 box('flat',.5,7.2,.15,.9,1.0,.5,{c:'#444'});
 L.table(8.6,0,5.4,6.2,3.4,2.8);for(var q=0;q<4;q++)L.chair(8.2+q*1.8,0,q<2?4.0:8.9,q<2?1:-1,'#9a6a46');
 box('flat',10.8,2.8,6.6,1.1,.3,1.1,{c:'#efe9de'});box('flat',12.2,2.8,6.6,1.4,.9,1.0,{c:'#2f6f8f',jit:.04});
 L.sitAt(S,10.6,8.6,1.7,PI,{h:5.2,y:0,cast:1});L.pplL({cast:1,x:5.2,z:4.4,h:6.4,yaw:PI*.9,shirt:'#d98ab0'});
 L.rug(1.5,5.5,4.8,4.4);L.warm(night,12,8,5,0xffd29a,.9,22);
 return m;
},'kitchen');

L.reg('flat-abroad','Home','Flat abroad',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'woodPanel',floorC:'#b49a76',wallC:'#ebeceb',windows:[[12.6,19.2,3.6,8.6]],doors:[[2.2,5.0,7.2]],fx:[1,23]});
 L.bed(14.4,0,6.8,8.2,4.4,S.p);
 L.desk(5.2,0,.3,6.2,2.6);box('flat',6.6,3.0,.8,2.6,.14,1.6,{c:'#3a3f48'});box('flat',6.8,3.14,1.9,2.2,1.8,.14,{c:'#16181d'});box('tv',6.95,3.4,2.05,1.9,1.3,.04,{full:1});
 L.chair(7.4,0,3.4,-1,'#4a5a7a');L.lamp(11.4,3.0,.7,night?'#ff9450':'#f2e6d6');
 L.counter(19.6,0,.3,4.2,2.4,3.0,'#d6d0c6','#b9a890');L.stove(19.8,3.0,.5,3);
 L.banner(.8,3.6,.04,4.6,3.2,'banner');box('flat',.6,1.0,.2,3.8,.3,.2,{c:'#6a5848'});
 L.sign(15.3,6.2,.06,5.2,1.1,'12:50 · '+S.city.toUpperCase(),'#16213a','#efe9de',.45);
 L.boxes(.4,0,8.4,3,2,2,'#a58a62');
 L.rug(5.4,6.4,7.4,4.4);
 L.sitL(21,9,1.7,PI,{h:5.2,cast:1});L.pplF(S,{cast:1,x:9.4,z:8,yaw:PI*.8,h:6.4});
 L.warm(night,10,6,5,0xffd29a,.7,20);
 return m;
},'flatAway');

/* ---------------- SCHOOL ---------------- */
L.reg('classroom','School','Classroom',function(S,night){
 var m=L.interior(S,night,{W:26,D:15,H:10,floor:'terrazzo',wallC:'#ebede7',windows:[[17,23.8,3.2,8.4]],doors:[[1.6,4.4,7.2]],fx:[1,25]});
 L.blackboard(6,3.4,.05,9.4,4.2);L.sign(5.6,8.2,.06,4.4,1.0,L.str(S,'school'),S.t,S.s);
 L.pplL({cast:1,x:5.4,z:3.2,h:7.2,yaw:PI,shirt:'#6a7a9a'});
 L.table(15,0,3.2,4.6,2.0,3.0,'woodPanel','#5a4a3a');
 L.shelf(23.4,0,.3,2,6,2);
 box('flat',.2,3.8,3.0,.1,3.4,4.2,{c:'#cdbf9c',jit:.05});
 for(var r=0;r<3;r++)for(var c=0;c<4;c++){var x=3+c*5.2,z=6.2+r*3.2;L.schoolDesk(x,0,z);
  if((r+c)%3!==2)L.sitL(x+1.6,z+2.8,1.5,PI,{h:4.4+rnd()*.5,shirt:rnd()<.5?S.p:null});}
 L.banner(14,6.4,.04,3.8,2.7,'banner');
 for(var i=0;i<4;i++)box('flat',10+i*1.5,5.2,.1,1.0,1.3,.05,{c:pick(['#d98ab0','#5a8aa0','#e9e5de','#8aa05a']),jit:.04});
 L.warm(night,13,9,6,0xffe6b4,.9,26);
 return m;
},'classroom');

/* ---------------- WORK ---------------- */
L.reg('newsroom','Work','Newsroom',function(S,night){
 var m=L.interior(S,night,{W:28,D:15,H:10,floor:'terrazzo',floorC:'#9a948b',wallC:'#ebeceb',windows:[[4,10,3.6,8.4],[16,22,3.6,8.4]],doors:[[24,26.8,7.2]],fx:[1,27]});
 for(var r=0;r<2;r++)for(var c=0;c<3;c++){var x=2.4+c*8.2,z=3.6+r*5.4;
  L.table(x,0,z,5.6,2.6,3.0,'woodPanel','#4a3a2e');box('flat',x+.8,3.0,z+.5,2.2,1.9,.14,{c:'#16181d'});box('tv',x+.9,3.2,z+.64,2.0,1.5,.04,{full:1});
  box('flat',x+3.2,3.0,z+.7,1.2,.1,1.0,{c:'#e9e5de',jit:0});box('flat',x+4.4,3.0,z+1.5,.7,.9,.7,{c:'#6a4a3e'});
  L.chair(x+1.6,0,z+3.0,-1,'#4a5a7a');
  if((r+c)%2===0)L.sitL(x+1.9,z+3.4,1.7,PI,{h:5.4});}
 box('woodPanel',1.2,3.8,.0,8.6,4.6,.2,{c:'#a58a62',jit:.05});
 for(var i=0;i<14;i++)box('flat',1.6+(i%7)*1.15,4.2+Math.floor(i/7)*2.0,.25,.9,1.3,.05,{c:pick(['#efe9de','#d7d3c8','#e8dcc0']),jit:.03});
 L.sign(12.4,7.4,.05,5.4,1.2,L.str(S,'news'),S.t,S.s);L.crestPlate(S,20.6,5.2,.05,2.0);
 box('flat',22.4,0,.4,2.4,3.4,2.2,{c:'#d8dde2'});box('flat',22.8,3.4,.8,1.2,1.2,1.2,{c:'#3a3f48'});
 L.pplL({cast:1,x:23.4,z:5.2,h:6.4,yaw:PI*.8,shirt:S.p});
 L.warm(night,14,9,6,0xffe6b4,.9,30);
 return m;
},'deskNewsroom');

L.reg('office','Work','Office',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'woodPanel',floorC:'#8a6a4a',wallC:'#ebe5da',windows:[[3.2,8.8,3.6,8.2]],doors:[[19.6,22.4,7.2]],fx:[1,23]});
 L.table(8.8,0,2.8,8.6,3.6,3.2,'woodPanel','#3e2e22');box('flat',11,3.2,3.4,2.6,.14,1.8,{c:'#efe9de',jit:0});box('flat',11.4,3.3,3.8,1.4,.5,1.0,{c:'#3a3f48'});
 box('flat',14.4,3.2,3.7,1.0,1.9,.14,{c:'#16181d'});box('tv',14.5,3.4,3.84,.8,1.5,.04,{full:1});
 L.chair(11.6,0,7.2,-1,'#2a2c32');box('woodPanel',11,.0,.0,3.4,5.2,.3,{c:'#7a5a3e',s:'nz'});
 L.shelf(15,0,.2,4.8,8.2,3,1.4);
 L.crestPlate(S,12.0,5.2,.05,2.6);L.banner(.6,4.4,.04,3.4,2.4,'banner');
 L.chair(10,0,.3,1,'#6a4a3a');L.chair(13.6,0,.3,1,'#6a4a3a');
 L.sitL(11.9,8.2,1.7,PI,{h:6.0,shirt:'#2a2c32',cast:1});
 L.rug(7.4,5.2,9,5);L.potted(1.4,0,8.4,1.1);L.potted(21.2,0,8.4,1.1);
 L.warm(night,10,7,6,0xffd29a,.8,22);
 return m;
},'officeOwner');

L.reg('community-room','Club','Community room',function(S,night){
 var m=L.interior(S,night,{W:28,D:15,H:10,floor:'terrazzo',floorC:'#a9a198',wallC:'#ebece9',windows:[[3,8.4,3.6,8.4],[20,25.4,3.6,8.4]],doors:[[12.4,15.4,7.2]],fx:[1,27]});
 L.banner(16,5.0,.04,5.2,3.2,'banner');
 L.table(3.2,0,5.2,7.6,2.8,2.8,'woodPanel','#6a5a48');L.table(13,0,7.2,7.6,2.8,2.8,'woodPanel','#6a5a48');L.table(19.4,0,3.8,6.0,2.6,2.8,'woodPanel','#6a5a48');
 for(var i=0;i<5;i++){L.chair(3.6+i*1.6,0,8.4,-1,'#7a8aa8');if(i<3)L.sitAt(S,4.4+i*1.6,9.2,1.7,PI,{h:5.4+rnd()*.6})}
 for(var j=0;j<4;j++){L.chair(13.4+j*1.8,0,10.4,-1,'#8a7a68');L.chair(13.4+j*1.8,0,5.2,1,'#8a7a68');if(j%2===0)L.sitL(14.2+j*1.8,11.2,1.7,PI,{h:5.8})}
 for(var k=0;k<5;k++)box('flat',20+k*1.1,5.6,4.6,.8,.8,.8,{c:pick(['#e9e5de',S.p,'#2f6f8f']),jit:.05});
 for(var d=0;d<6;d++)box('flat',2+d*1.7,5.6+(d%2)*1.1,.1,1.3,1.5,.05,{c:pick(['#d98ab0','#5a8aa0','#e9e5de','#8aa05a','#cfa05a']),jit:.05});
 L.crate(.6,0,11.4,2,2,2,'#a58a62');L.crate(.6,2,11.4,2,1.6,2,'#957a56');
 L.pplL({cast:1,x:22.4,z:9.4,h:6.2,yaw:PI*.9,shirt:S.p});L.pplL({cast:1,x:25,z:7.4,h:6.4,yaw:-PI*.8});
 L.warm(night,14,9,7,0xffe6b4,.9,30);
 return m;
},'communityRoom');

L.reg('storeroom','Club','Storeroom',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'concrete',wallC:'#e2e0da',windows:[[18.4,22.6,5.2,8.2]],doors:[[1.6,4.4,7.2]],fx:[1,23]});
 for(var r=0;r<3;r++)L.shelf(5+r*6.2,0,.2,5.6,8,3,1.6);
 L.boxes(5.2,0,4.4,5,2,2);L.crate(12,0,4.8,3,2.4,3,'#a58a62');L.crate(12.2,2.4,5,2.6,1.8,2.6,'#957a56');
 box('flat',19,0,5,.25,8,.25,{c:'#9aa0a8'});box('flat',22.6,0,5,.25,8,.25,{c:'#9aa0a8'});box('flat',19,8,5,3.85,.25,.25,{c:'#9aa0a8'});
 for(var i=0;i<7;i++){var c=i%2?S.p:S.s;box('flat',19.3+i*.55,3.4,5,.5,4.6,.3,{c:c,jit:.05})}
 box('woodPanel',14,0,8.6,4,.6,3,{c:'#8a6a4a'});box('woodPanel',14,.6,8.6,4,.6,3,{c:'#8a6a4a'});
 L.pplL({cast:1,x:9.4,z:9,h:6.2,yaw:PI,shirt:S.p});L.pplL({cast:1,x:16.4,z:6.6,h:6.0,yaw:-PI*.7});
 L.warm(night,12,8,5,0xfff0c0,.9,22);
 return m;
},'communityRoom');

L.reg('workshop','Club','Workshop',function(S,night){
 var m=L.interior(S,night,{W:26,D:15,H:10,floor:'concrete',floorC:'#a9a59d',wallC:'#e7e4df',windows:[[17,23,4.4,8.6]],doors:[[2,5,7.4]],fx:[1,25]});
 L.table(8,0,.4,10,3,3.2,'woodPanel','#6a5a48');
 box('woodPanel',8.4,3.2,.0,9.2,5.0,.2,{c:'#b49a72'});
 for(var i=0;i<9;i++){box('flat',9+i*1.0,4.6+(i%3)*1.3,.25,.25,1.2,.12,{c:'#6a6e75',jit:0});box('flat',8.9+i*1.0,6.6,.25,.5,.3,.1,{c:pick(['#b02d10','#2f6f8f','#6a6e75']),jit:0})}
 box('flat',3,0,6,14,.3,7,{c:S.p,jit:.03});
 for(var k=0;k<5;k++)box('flat',3,.3,6+k*1.4,14,.2,.7,{c:S.s,jit:.03});
 for(var c=0;c<4;c++)box('flat',19+c*1.2,0,10+(c%2)*1.4,1,1.4,1,{c:pick([S.p,'#e9e5de','#2f6f8f']),jit:.05});
 box('flat',22,0,2.2,.25,9,.25,{c:'#9aa0a8'});box('flat',22.6,0,2.2,.25,9,.25,{c:'#9aa0a8'});for(var s=0;s<8;s++)box('flat',22,s*1.1,2.2,.85,.2,.25,{c:'#9aa0a8',jit:0});
 L.pplL({cast:1,x:12,z:9.4,h:6.2,yaw:PI,shirt:S.p,anim:'idle'});L.pplL({cast:1,x:17.2,z:8.6,h:6.4,yaw:PI*1.2,skin:SK[1]});
 L.warm(night,13,9,6,0xfff0c0,.9,28);
 return m;
},'communityRoom');

L.reg('rehearsal','Club','Rehearsal room',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'woodPanel',floorC:'#7a6048',wallC:'#b6b3b1',windows:[],doors:[[19.6,22.4,7.2]],fx:[1,23]});
 for(var i=0;i<12;i++)for(var j=0;j<5;j++)box('flat',.6+i*1.9,1.2+j*1.6,.02,1.7,1.4,.35,{c:(i+j)%2?'#2c2a29':'#38342f',jit:.06});
 L.banner(8,4,.4,5.2,3.2,'banner');
 // drum kit
 box('flat',3,0,3.4,3.4,.4,3.4,{c:'#3a3030',jit:.03});
 [[3.4,.4,5.8],[4.4,.4,6.4],[5.4,.4,5.8]].forEach(function(p){box('flat',p[0],p[1],p[2],1.1,1.0,1.1,{c:S.p,jit:.04})});box('flat',3.7,.4,4,1.6,1.6,1.6,{c:S.p,jit:.04});
 box('flat',6.1,3.4,3.8,1.7,.12,1.7,{c:'#b8a468',jit:0});box('flat',6.9,.4,4.6,.12,3,.12,{c:'#6a6e75',jit:0});
 box('flat',3.2,.4,2.6,.1,2.6,.1,{c:'#6a6e75',jit:0});
 // amps + speakers
 box('flat',9.4,0,2.4,3.0,3.8,2.2,{c:'#2a2c32',jit:.03});box('flat',9.6,2.0,4.6,2.6,1.4,.06,{c:'#16181d',jit:0});box('glow',9.6,2.3,4.64,.3,.3,.04,{c:'#ff4030'});
 box('flat',20.2,0,3.0,2.8,4.4,2.2,{c:'#2a2c32',jit:.03});
 // mic + singers
 box('flat',14.4,0,6.4,.14,5.4,.14,{c:'#6a6e75',jit:0});box('flat',14.1,5.3,6.4,.9,.14,.14,{c:'#6a6e75',jit:0});
 L.pplF(S,{x:14,z:7.6,yaw:PI,h:6.4,anim:'cheer'});L.pplF(S,{x:12.2,z:8.8,yaw:PI*.9,h:6.2,anim:'cheer'});L.pplF(S,{x:16.4,z:8.4,yaw:PI*1.1,h:6.4,anim:'cheer'});
 L.sitAt(S,7.6,5.6,1.7,PI*.5,{h:5.6});
 L.bunting(S,.4,7.8,1.4,23,1.4,16);
 L.warm(night,12,8,6,0xff9a60,.9,26);L.warm(true,12,8,6,0xff9a60,.5,24);
 return m;
},'communityRoom');

L.reg('hall-new','Club','New hall',function(S,night){
 var m=L.interior(S,night,{W:30,D:17,H:12,floor:'woodPanel',floorC:'#c9a272',wallC:'#efede9',windows:[[3,9,5,10],[21,27,5,10]],doors:[[12.8,16.4,8]],fx:[1,29]});
 L.court(1,3.6,28,12.6);
 L.hoop(2.4,0,5.2);L.hoop(26.6,0,5.2);
 L.banner(10.4,8.2,.04,9.2,3.2,'banner');
 for(var i=0;i<10;i++)box('flat',1+i*2.9,8.8,.1,2.6,.9,.1,{c:i%2?S.p:S.s,jit:.04});
 L.bench(4,0,.5,6,'#9a7a54');L.bench(20,0,.5,6,'#9a7a54');
 for(var p=0;p<4;p++)L.fansRow(S,10+p*2.4,8.5+p*1.2,1,1,{anim:p%2?'cheer':'idle'});
 L.pplL({x:6,z:11,h:6.4,yaw:PI*.4,shirt:'#2f6f8f'});L.pplL({x:22,z:10,h:6.4,yaw:-PI*.4,shirt:'#2f6f8f'});
 L.sitAt(S,6.4,1.7,2.0,PI,{h:5.4});L.sitAt(S,8.4,1.7,2.0,PI,{h:5.4});
 L.warm(night,15,10,8,0xfff0c0,1,40);
 return m;
},'hallNew');

L.reg('ticket-office','Stadium','Ticket office',function(S,night){
 var m=L.interior(S,night,{W:24,D:13,H:9.6,floor:'terrazzo',floorC:'#9a9288',wallC:'#b6bec9',windows:[],doors:[[1.4,4.2,7.2]],fx:[1,23]});
 L.sign(8,7.2,.06,8,1.5,L.str(S,'ticket'),S.t,S.s);
 box('woodPanel',7,0,.6,10,3.4,3,{c:'#7a5a3e'});box('woodPanel',6.8,3.4,.4,10.4,.4,3.4,{c:'#cdbca4'});
 box('glass',7,3.8,1.9,10,4,.1,{c:'#a8c8e8',s:'nz,px,nx,py'});
 for(var i=0;i<3;i++){box('flat',7+i*3.4,3.8,1.9,.22,4,.3,{c:'#7a7f87',jit:0});}
 for(var k=0;k<6;k++)box('flat',8+k*1.4,3.9,2.6,1.1,.08,.8,{c:pick([S.p,S.s,'#efe9de']),jit:.04});
 L.pplL({cast:1,x:11,z:1.2,h:6.4,yaw:PI,shirt:S.p,hair:HR[3]});
 L.crestPlate(S,19.6,4.4,.05,2.8);L.poster(1.4,3.8,.05,3.2,4.2,S,'shirtF');
 box('flat',2.6,0,10,.12,2.8,.12,{c:'#9aa0a8'});box('flat',12.2,0,10,.12,2.8,.12,{c:'#9aa0a8'});box('flat',2.6,2.8,10,9.6,.1,.1,{c:'#9aa0a8'});
 for(var q=0;q<5;q++)L.pplF(S,{x:3.4+q*1.8,z:9.2+(q%2)*.8,yaw:PI*1.0+(q%3-1)*.15,h:6.0+rnd()*.7,scarf:null});
 L.warm(night,12,8,6,0xffe6b4,.9,26);
 return m;
},'gate5');
})();
