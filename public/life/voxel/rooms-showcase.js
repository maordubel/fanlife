/* LIFE voxel — cast lineup: every age, hair style, mood and kit in one row. A character review room (and the admin preview stage). */
(function(){
var V=window.__vx,L=window.__vxLib,box=V.box,addPerson=V.addPerson,SKIN=V.SKIN;
function lineup(S,night){
 var W=40,D=10,H=10;
 box('terrazzo',0,-1,0,W,1,D,{cell:2,kp:{pz:'concrete',nz:'concrete',px:'concrete',nx:'concrete'}});
 box('plaster',0,0,-.8,W,H,.8,{c:night?'#3a3f66':'#d9cdb8'});
 var people=[
  {h:4.4,mood:'happy',style:4,shirt:S.p,pat:L.pat(S),shirt2:S.s,skin:SKIN[1],hair:V.HAIR[1],scarf:[S.p,S.s]},/* child */
  {h:5.6,mood:'open',anim:'cheer',style:1,shirt:S.p,pat:L.pat(S),shirt2:S.s,skin:SKIN[2],hair:V.HAIR[0],scarf:[S.p,S.s]},/* teen cheering */
  {h:6.6,mood:'neutral',style:0,shirt:'#7a8aa8',pants:'#2c3345',skin:SKIN[0],hair:V.HAIR[4]},
  {h:6.6,mood:'tense',style:3,long:false,shirt:S.p,pat:L.pat(S),shirt2:S.s,skin:SKIN[3],hair:V.HAIR[2],scarf:[S.p,S.s]},
  {h:6.4,mood:'happy',long:true,shirt:'#a07a7a',pants:'#3a3f48',skin:SKIN[4],hair:V.HAIR[0]},
  {h:6.6,mood:'angry',style:2,shirt:'#4a5a7a',skin:SKIN[2],hair:V.HAIR[2],cap:S.t},
  {h:6.2,mood:'sad',anim:'sad',style:0,shirt:'#7a6a8a',skin:SKIN[1],hair:V.HAIR[3]},
  {h:6.0,mood:'neutral',style:0,shirt:'#e4dccd',pants:'#4a4f5c',skin:SKIN[0],hair:'#8a8a90',cane:true}/* elder */
 ];
 people.forEach(function(p,i){p.x=3.2+i*4.8;p.z=5;p.y=0;p.yaw=(i%2?-.18:.18)+(location.search.indexOf('back=1')>=0?Math.PI:0);p.cast=0;addPerson(p)});
 return{W:W,H:H,D:D,fx:[0,W]};
}
window.__vxScenes.lineup=function(S,night){return lineup(S,night)};
window.__vxMeta.push({id:'lineup',group:'Universal',label:'Cast lineup',ref:null,time:'day'});
})();
