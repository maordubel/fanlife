/* LIFE voxel rooms — kit: composite builders shared by many rooms (facades, courts, terraces, pitches, interiors). */
(function(){
var V=window.__vx,L=window.__vxLib,box=V.box,wallZ=V.wallZ,decal=V.decal,decalY=V.decalY,rnd=V.rnd,pick=V.pick,cube=V.cube,pm=V.pm,THREE=V.THREE,face=V.face;
var SKIN=V.SKIN,HAIR=V.HAIR,PANTS=V.PANTS;

L.warm=function(night,x,y,z,col,i,d){if(night)V.cur().L.push(V.pt(col||0xffc88a,i||.9,d||26,x,y,z))};
L.pplF=function(S,o){return L.person(L.fan(S,o))};
L.pplL=function(o){return L.person(L.local(o))};
L.sitAt=function(S,x,z,seat,yaw,o){o=o||{};var b=L.fan(S,{x:x,z:z,y:o.y||0,seat:seat,sit:true,h:o.h||6.0,yaw:yaw||0});for(var k in o)b[k]=o[k];L.person(b)};
L.sitL=function(x,z,seat,yaw,o){o=o||{};var b=L.local({x:x,z:z,y:o.y||0,seat:seat,sit:true,h:o.h||6.0,yaw:yaw||0});for(var k in o)b[k]=o[k];L.person(b)};

/* ---- interiors ---- */
L.interior=function(S,night,o){
 var m=L.shell(o);
 if(night)L.warm(night,m.W*.5,m.H-1.4,m.D*.5,0xffc98a,1.0,m.W*1.4);
 return m;
};
/* ---- facade: a building front on the ground, windows by grid, optional shop front ---- */
L.facade=function(x0,x1,o){
 o=o||{};var y0=o.y0==null?.5:o.y0,h=o.h||16,zf=o.z==null?7.2:o.z,k=o.k||'ochre',night=o.night,gc=L.glass(night),fl=o.floors||3;
 var n=o.cols||Math.max(2,Math.round((x1-x0)/5.2)),cw=(x1-x0)/n,fh=(h-(o.shop?6.2:0))/(o.shop?fl-1:fl),holes=[],wins=[];
 var base=o.shop?6.2:0;
 for(var f=0;f<(o.shop?fl-1:fl);f++)for(var i=0;i<n;i++){var wx=x0+i*cw+cw/2-1.4,wy=y0+base+f*fh+fh*.28;if(o.skip&&o.skip(f,i))continue;var hh=Math.min(3.6,fh*.5);var w=[wx,wx+2.8,wy,wy+hh];holes.push(w);wins.push(w)}
 var shop=null;if(o.shop){shop=[x0+1.2,x1-1.2,y0,y0+5.4];holes.push(shop)}
 box('flat',x0,y0,zf-.6,x1-x0,h,.6,{c:'#3a3633'});
 wallZ(k,x0,x1,y0,y0+h,zf,.8,holes,{cell:2.5,c:o.c,kp:{py:'concrete'}});
 wins.forEach(function(w){var x=w[0],y=w[2],ww=w[1]-w[0],hh=w[3]-w[2];
  box('glass',x,y,zf+.3,ww,hh,.08,{c:gc,s:'nz,px,nx,py'});
  box('doorWood',x-.25,y-.3,zf+.7,ww+.5,.3,.45,{c:'#cfc7b9'});box('doorWood',x-.25,y+hh,zf+.7,ww+.5,.25,.35,{c:'#cfc7b9'});box('doorWood',x+ww/2-.12,y,zf+.5,.24,hh,.2,{c:'#cfc7b9'});
  if(o.shutters){box('doorWood',x-1.1,y,zf+.75,1,hh,.2,{c:o.shutters});box('doorWood',x+ww+.1,y,zf+.75,1,hh,.2,{c:o.shutters})}
  if(o.balc&&rnd()<.6)box('concrete',x-.5,y-.4,zf+.8,ww+1,.4,1.4,{c:'#bdb8ae'});
  if(night&&rnd()<.55)box('glow',x+.1,y+.1,zf+.35,ww-.2,hh-.2,.05,{c:'#ff9450',s:'nz,px,nx,py'});});
 if(shop){box('glass',shop[0],shop[2]+.4,zf+.3,shop[1]-shop[0],4.4,.08,{c:gc,s:'nz,px,nx,py'});
  box('doorWood',shop[0]-.3,shop[2],zf+.55,.4,5.8,.4,{c:'#cfc7b9'});box('doorWood',shop[1]-.1,shop[2],zf+.55,.4,5.8,.4,{c:'#cfc7b9'});box('doorWood',shop[0]-.3,shop[2]+5.4,zf+.55,shop[1]-shop[0]+.7,.5,.4,{c:'#cfc7b9'});
  if(night)box('glow',shop[0]+.2,shop[2]+.6,zf+.35,shop[1]-shop[0]-.4,3.9,.05,{c:'#ffb870',s:'nz,px,nx,py'});
  if(o.sign)L.sign(shop[0],y0+5.9,zf+.85,Math.min(shop[1]-shop[0],8),1.5,o.sign,o.signBg||'#1d2b4f',o.signFg||'#efe9de');
  if(o.awn)L.awning(o.awn,shop[0],y0+5.8,zf+.8,shop[1]-shop[0],3)}
 box('concrete',x0-.1,y0+h,zf-.6,x1-x0+.2,.5,1.9,{c:'#8f8b83'});
 return {wins:wins,shop:shop};
};
/* ---- paved street strip, building row base ---- */
L.street=function(W,o){o=o||{};var D=o.D||22;
 box('concrete',0,-1,0,W,1.5,8,{cell:3});
 box('sidewalk',0,-1,8,W,1.5,5,{cell:2.5,kp:{pz:'concrete'}});
 box('asphalt',0,-1,13,W,1,D-13,{cell:3.5,kp:{pz:'concrete'}});
 for(var i=0;i<Math.floor(W/6.4);i++)box('flat',1.5+i*6.4,0,17.4,3.2,.03,.5,{c:'#d9d6cf',jit:0});
};
/* ---- court: wooden hall floor ---- */
L.court=function(x,z,w,d,y){y=y||0;
 box('woodPanel',x,y-1,z,w,1,d,{c:'#c9a272',cell:2.2,kp:{pz:'concrete',nx:'concrete',px:'concrete',nz:'concrete'}});
 var ln=function(a,b,c,dd,ee){box('flat',a,y+.02,b,c,.03,dd,{c:'#efe9de',jit:0})};
 ln(x+.4,z+.4,w-.8,.25);ln(x+.4,z+d-.65,w-.8,.25);ln(x+.4,z+.4,.25,d-.8);ln(x+w-.65,z+.4,.25,d-.8);ln(x+w/2-.12,z+.4,.25,d-.8);
 ln(x+.4,z+d/2-2.6,4.2,.2);ln(x+.4,z+d/2+2.4,4.2,.2);ln(x+4.4,z+d/2-2.6,.2,5.2);
 ln(x+w-4.6,z+d/2-2.6,4.2,.2);ln(x+w-4.6,z+d/2+2.4,4.2,.2);ln(x+w-4.6,z+d/2-2.6,.2,5.2);
};
/* ---- football pitch (mown stripes, lines) ---- */
L.pitch=function(x,z,w,d,y,o){o=o||{};y=y||0;var n=Math.round(w/4.4),sw=w/n;
 box('concrete',x-.6,y-1.5,z-.6,w+1.2,1.4,d+1.2,{cell:3});
 for(var i=0;i<n;i++)box('flat',x+i*sw,y-.2,z,sw,.25,d,{c:i%2?'#3f7f3d':'#4a8c46',jit:.025});
 var ln=function(a,b,c,dd){box('flat',a,y+.06,b,c,.04,dd,{c:'#eef0ea',jit:0})};
 ln(x+.3,z+.3,w-.6,.2);ln(x+.3,z+d-.5,w-.6,.2);ln(x+.3,z+.3,.2,d-.6);ln(x+w-.5,z+.3,.2,d-.6);ln(x+w/2-.1,z+.3,.2,d-.6);
 ln(x+.3,z+d/2-3.4,3.6,.2);ln(x+.3,z+d/2+3.2,3.6,.2);ln(x+3.7,z+d/2-3.4,.2,6.8);
 ln(x+w-3.9,z+d/2-3.4,3.6,.2);ln(x+w-3.9,z+d/2+3.2,3.6,.2);ln(x+w-3.9,z+d/2-3.4,.2,6.8);
};
/* ---- terrace: rows rising AWAY from the camera (toward -z), fans face +z ---- */
L.terrace=function(S,x,y,z0,cols,rows,o){o=o||{};var sw=o.sw||1.9,rise=o.rise||1.1,run=o.run||2.2;
 for(var r=0;r<rows;r++){var zr=z0+(rows-1-r)*run;
  box('concrete',x,y,zr,cols*sw,(r+1)*rise,run,{cell:2,jit:.05,s:o.s});
  if(o.seats)for(var c=0;c<cols;c++){var col=(c+r*3)%9===0?S.s:S.p;box('flat',x+c*sw+.25,y+(r+1)*rise,zr+.3,sw-.5,.35,run-.7,{c:o.mono||col,jit:.06})}
  if(o.fill)for(c=0;c<cols;c++)if(rnd()<o.fill)L.mini(S,x+c*sw+sw/2,y+(r+1)*rise+(o.seats?.35:0),zr+run*.55,{home:o.home==null?.8:o.home});
 }
};
/* ---- tall wall with railing / cage fence ---- */
L.cage=function(x,y,z,w,h){box('concrete',x,y,z,w,1.2,.5,{c:'#a9a59d'});box('fence',x,y+1.2,z,w,h,.05,{full:1,s:'nz'});V.face('fence',[x,y+1.2,z+.3],[1,0,0],[0,1,0],[0,0,1],w,h,{cell:1.8,jit:0,ao:0})};
/* ---- banner (club) on wall/stand ---- */
L.banner=function(x,y,z,w,h,key){key=key||'banner';box('doorWood',x-.2,y-.2,z,w+.4,h+.4,.12,{c:'#2a2c32'});decal(key,x,y,z+.14,w,h)};
L.clubSign=function(S,x,y,z,w,h,txt,alt){L.sign(x,y,z,w,h,txt||S.short,alt?S.t:S.p,S.s)};
/* ---- cheering crowd of real voxel people (few, in front) ---- */
L.fansRow=function(S,x,z,n,gap,o){o=o||{};for(var i=0;i<n;i++){var b=L.fan(S,{x:x+i*gap,z:z+rnd()*.5,y:o.y||0,h:o.h||6.2,yaw:o.yaw==null?0:o.yaw,anim:o.anim||'idle'});if(o.look!=null)b.look=o.look;L.person(b)}};
L.strollers=function(S,n,z0,z1,x0,x1,o){o=o||{};for(var i=0;i<n;i++){var z=z0+(z1-z0)*(i/(Math.max(1,n-1)))+rnd()*.4;var xa=x0+rnd()*(x1-x0)*.3,xb=x1-rnd()*(x1-x0)*.3;
  var b=o.fan&&rnd()<o.fan?L.fan(S,{x:xa,z:z,y:o.y||0,h:5.8+rnd()*1.2}):L.local({x:xa,z:z,y:o.y||0,h:5.8+rnd()*1.2});b.path=[[xa,z],[xb,z]];b.spd=1.2+rnd()*1.2;if(o.fan&&b.scarf==null&&rnd()<.5)b.scarf=[S.p,S.s];L.person(b)}};
/* ---- crates on the ground, kid's goal from jackets, etc ---- */
L.jacketGoal=function(x,y,z,w){box('flat',x,y,z,.8,.5,.8,{c:'#6a4a3e',jit:.05});box('flat',x+w,y,z,.8,.6,.8,{c:'#3a4a6e',jit:.05})};
L.crane=function(x,y,z,h,len){box('flat',x,y,z,1.2,h,1.2,{c:'#c9602a',jit:.04});box('flat',x-2,y+h,z-.4,len,.9,1.6,{c:'#c9602a',jit:.04});box('flat',x+len-2.4,y+h-3,z+.2,.15,3,.15,{c:'#2c3036',jit:0})};
L.container=function(x,y,z,c){box('flat',x,y,z,7,2.8,2.8,{c:c||'#4a6a8a',jit:.05});for(var i=0;i<7;i++)box('flat',x+.4+i*.95,y+.1,z+2.8,.12,2.6,.05,{c:'#00000022'.slice(0,7),jit:0})};
L.sea=function(x,z,w,d,y){box('flat',x,y==null?-1.2:y,z,w,1.2,d,{c:'#3a6f96',jit:.035,cell:1.6});};
L.ship=function(x,y,z,w,c){box('flat',x,y,z,w,2.6,5,{c:'#2a3040',jit:.03});box('flat',x+w*.55,y+2.6,z+.6,w*.3,4.5,3.8,{c:'#e9e5de',jit:.03});box('flat',x+w*.62,y+7.1,z+1.2,w*.12,1.6,2.6,{c:c||'#c3182f',jit:.03});for(var i=0;i<6;i++)box('flat',x+w*.57+i*(w*.045),y+4.2,z+4.4,w*.025,.7,.05,{c:'#f4efe6',jit:0})};
L.stall=function(S,x,y,z,w,c1){box('woodPanel',x,y,z,w,2.8,1.8,{c:'#9a7a54'});for(var i=0;i<Math.round(w/1.1);i++)box('flat',x+i*1.1,y+6.4,z-.2,1.1,.14,2.4,{c:i%2?'#efe9de':(c1||S.p),jit:.04});box('flat',x+.1,y+2.8,z+.2,.2,3.6,.2,{c:'#6a5a48',jit:0});box('flat',x+w-.3,y+2.8,z+.2,.2,3.6,.2,{c:'#6a5a48',jit:0});
 for(var k=0;k<Math.round(w/1.0);k++)box('flat',x+.25+k*1.0,y+2.8,z+.4,.7,.55+rnd()*.5,.8,{c:pick(['#c9602a','#5a8a3c','#b02d10','#d98ab0','#e9e5de']),jit:.08})};
L.towerClock=function(x,y,z,h){box('plaza',x,y,z,3.4,h,3.4,{cell:2.2});box('plaza',x-.4,y+h,z-.4,4.2,.6,4.2,{cell:2});box('plaza',x+.4,y+h+.6,z+.4,2.6,2.4,2.6,{cell:2});box('flat',x+1.3,y+h+3,z+1.3,.8,1.2,.8,{c:'#6a8a74'});
 box('flat',x+.9,y+h+1.0,z+3.05,1.6,1.6,.1,{c:'#efe9de',jit:0});box('flat',x+1.6,y+h+1.8,z+3.15,.14,.8,.05,{c:'#222',jit:0});box('flat',x+1.6,y+h+1.7,z+3.15,.6,.14,.05,{c:'#222',jit:0})};
L.arch=function(x,y,z,w,h,k){k=k||'plaza';box(k,x,y,z,1.4,h,1.8,{cell:2});box(k,x+w-1.4,y,z,1.4,h,1.8,{cell:2});box(k,x,y+h,z,w,1.4,1.8,{cell:2});for(var i=1;i<4;i++){var q=1.4*i/4;box(k,x+q*.9,y+h-q*.9,z,w-q*1.8,.4,1.8,{cell:2})}};
L.potted=function(x,y,z,s){s=s||1;box('flat',x,y,z,1.3*s,1.0*s,1.3*s,{c:'#a5603f',jit:.05});for(var i=0;i<7;i++)box('flat',x+(rnd()*.9)*s,y+1.0*s+rnd()*1.1*s,z+(rnd()*.9)*s,.6*s,.6*s,.6*s,{c:pick(['#3f6a3b','#4d7a43','#5b8a4c']),jit:.1})};
L.bike=function(x,y,z,c){box('flat',x,y+.1,z,.15,1.4,.15,{c:'#222',jit:0});box('flat',x+2,y+.1,z,.15,1.4,.15,{c:'#222',jit:0});box('flat',x,y+1.4,z,2.2,.15,.15,{c:c||'#b02d10',jit:0});box('flat',x+.9,y+.8,z,.15,.8,.15,{c:c||'#b02d10',jit:0});box('flat',x+.6,y+.1,z-.1,.15,.15,.4,{c:'#222',jit:0})};
L.pennantLine=function(S,x0,x1,y,z,n){L.bunting(S,x0,y,z,x1,z,n)};
L.light=function(night,x,y,z,col,i,d){if(night)V.cur().L.push(V.pt(col||0xcfe0ff,i||1,d||40,x,y,z))};
})();
