/* LIFE · TOWN — the matchday as the city lives it.
   The skin carries the club's `culture` (`lib/life/universal/ritual.ts` → `townCulture`): where the crew meets, what goes
   round, how they get to the ground, the neighbourhood he grows up in — names, kinds, signs and eras, every one of them
   sourced upstream (a world.json line or the owner's own words). This file letters them into the rooms that belong to
   them: the meet-up's board on the walk to the ground, the stop or the promenade sign, scooters parked at the kerb in
   Athens, the food boards on the home street, the neighbourhood's plate. It decides nothing: a club with no culture,
   an element its year does not hold (a meet-up that closed, a line not yet open), or a room it does not
   belong to, draws nothing. Colours are the club's own (`__CK`); kit.js's post pass still removes any band this club
   may not wear. Called once per room by RM.load, after artefacts. */
(function(){
function holds(x,year){if(year==null)return x.fromYear==null&&x.untilYear==null;return(x.fromYear==null||year>=x.fromYear)&&(x.untilYear==null||year<x.untilYear)}
function tag(o,what){o.name='culture:'+what;o.userData.culture=what;return o}
/* a lettered board on a facade: a dark backing box and the face, clear of it so it never z-fights */
function board(c,txt,x,y,z,w,h,bg,fg,what){var T=c.T,g=tag(new T.Group(),what);g.position.set(x,y,z);c.world.add(g);
 var pw=512,ph=Math.max(96,Math.round(pw*h/w)),fp=Math.min(96,Math.round(ph*.5)),k=document.createElement('canvas').getContext('2d');
 while(fp>18){k.font='bold '+fp+'px Heebo, Arial';if(k.measureText(txt).width<pw*.78)break;fp-=4}
 c.mesh(new T.BoxGeometry(w+.08,h+.08,.08),c.std('#1a1a22',{roughness:.9}),0,0,-.05,g);
 var face=c.mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:c.sign(txt,bg,fg,pw,ph,'bold '+fp+'px'),roughness:.9,envMapIntensity:.15,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),0,0,.02,g);face.castShadow=false;face.receiveShadow=false;
 return g}
/* a stop totem at the kerb: a pole, a disc in the line's colour, the stop's name */
function totem(c,txt,x,z,disc,what){var T=c.T,g=tag(new T.Group(),what);g.position.set(x,0,z);c.world.add(g);
 c.mesh(new T.CylinderGeometry(.05,.06,2.9,8),c.std('#3a3e48',{metalness:.4,roughness:.5}),0,1.45,0,g);
 var d=c.mesh(new T.CylinderGeometry(.32,.32,.05,24),c.std(disc,{roughness:.6}),0,2.95,0,g);d.rotation.x=Math.PI/2;
 var b=board(c,txt,0,2.4,.04,1.3,.34,'#14141c','#f4f1ff',what+':name');g.add(b);b.position.set(0,2.4,.04);return g}
/* a sandwich board on the pavement, the way a stall or a bakery puts its word out: two leaning boards, lettered both sides */
function aframe(c,txt,x,z,bg,fg,what){var T=c.T,g=tag(new T.Group(),what);g.position.set(x,0,z);c.world.add(g);
 [-1,1].forEach(function(s){var b=board(c,txt,0,.55,0,.62,.9,bg,fg,what+':face');g.add(b);b.position.set(0,.55,s*.16);b.rotation.order='YXZ';b.rotation.set(-.18,s>0?0:Math.PI,0)});
 return g}
/* a scooter parked at the kerb: two wheels, a deck, a column, bars — simple shapes, the club's colour on the body */
function scooter(c,x,z,ry,col){var T=c.T,g=tag(new T.Group(),'scooter');g.position.set(x,0,z);g.rotation.y=ry;c.world.add(g);
 var tyre=c.std('#16161a',{roughness:.9}),metal=c.std('#8a8e98',{metalness:.6,roughness:.35}),body=c.std(col,{roughness:.45,metalness:.2});
 [-.55,.55].forEach(function(dx){var w=c.mesh(new T.CylinderGeometry(.24,.24,.1,16),tyre,dx,.24,0,g);w.rotation.x=Math.PI/2});
 c.mesh(new T.BoxGeometry(.9,.12,.32),body,0,.34,0,g);c.mesh(new T.BoxGeometry(.5,.36,.34),body,-.32,.56,0,g);
 c.mesh(new T.BoxGeometry(.42,.1,.3),c.std('#1e1e24',{roughness:.8}),-.32,.79,0,g);
 var col_=c.mesh(new T.CylinderGeometry(.03,.03,.78,8),metal,.5,.66,0,g);col_.rotation.z=.25;
 c.mesh(new T.BoxGeometry(.06,.05,.62),metal,.42,1.04,0,g);
 c.mesh(new T.BoxGeometry(.08,.55,.4),body,.38,.62,0,g);g.scale.setScalar(1.3);return g}

var ROUTE={route:1},STREET={street:1};
window.CULTURE={place:function(c,id,culture){
 culture=culture||(c&&c.skin&&c.skin.club&&c.skin.club.culture)||null;
 if(!culture||!c||!c.T||(!ROUTE[id]&&!STREET[id]))return 0;
 var K=window.__CK||{a:'#8a2a2a'},year=c.o&&c.o.year!=null?c.o.year:null,n=0;
 var ok=function(xs){return(xs||[]).filter(function(x){return holds(x,year)})};
 try{
 if(ROUTE[id]){
  var FZ=.85,meets=ok(culture.meet),slots=[[12.95,1.5],[4.55,1.0]];
  /* where the crew meets this year: its own board over the pavement, on the facades between the shops */
  meets.slice(0,2).forEach(function(m,i){var s=slots[i];board(c,m.sign,s[0],2.95,FZ,s[1],.46,i?'#14141c':K.a,'#f4f1ff','meet:'+m.sign);n++});
  /* the way to the ground: the stop or the promenade sign at the kerb, scooters parked where the city parks them */
  ok(culture.route).forEach(function(r){
   if(r.sign&&(r.mode==='rail'||r.mode==='metro'||r.mode==='train')){totem(c,r.sign,.9,3.15,r.mode==='rail'?K.a:'#2a4a8a','route:'+r.mode);n++}
   else if(r.sign&&r.mode==='walk'){totem(c,r.sign,.9,3.15,'#2a6a8a','route:walk');n++}
   if(r.mode==='scooter'){[[1.6,4.35,.35],[2.7,4.3,.15],[3.9,4.4,.5]].forEach(function(p,i){scooter(c,p[0],p[1],p[2],i%2?'#2a2e3a':K.a);n++})}
  })}
 if(STREET[id]){
  var food=ok(culture.food).concat(ok(culture.drink)).filter(function(f){return f.sign}),fx=[5.0,7.4,9.7];
  /* what goes round before the match: its word on a board out on the pavement, between the kerb and the people */
  food.slice(0,3).forEach(function(f,i){aframe(c,f.sign,fx[i],3.72,i%2?'#3a2a1e':'#14141c','#f2e6d0','food:'+f.sign);n++});
  /* the neighbourhood he grows up in: its own plate beside the street's */
  if(culture.home&&culture.home.local){board(c,culture.home.local,3.72,2.8,1.06,1.15,.3,'#1d4f9c','#f4f1ff','home');n++}
 }
 }catch(e){/* a thing that cannot be drawn here is not drawn; the room never fails for it */}
 window.__culture={room:id,drawn:n};return n}};
})();
