/* LIFE · TOWN — what he made stays in the world.
   The shell hands every room the artefact records (`lib/life/universal/artefacts.ts`): {id, kind, variant, zonesDone,
   marks:[{type, at}], madeIn}. This file draws them where they belong — the car he washed at the kerb, the scarf with
   its patch on the bedroom hook, the poster folded into the box with its crease, the crew's banner on the terrace with
   the same crooked stroke. It decides nothing: the record says what, the room's own spots say where, and a room with no
   spot for a thing simply does not show it.
   Colours are the club's own (`__CK`, already muted for a home) — the post pass in kit.js still removes any band this
   club may not wear, so a rival's colour and Hapoel's yellow never reach the screen. Called once per room by RM.load,
   after the room is built and before its colours are converted. */
(function(){
var HOMES={bedroom:1},STREETS={street:1},STANDS={terrace:1,'bloomfield-inside':1,'gate5-stand':1,curva:1,'away-end':1};
function has(a,type){return(a.marks||[]).some(function(m){return m.type===type})}
function canvas(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function cloth(c,cv){var T=c.T,t=new T.CanvasTexture(cv);t.encoding=T.sRGBEncoding;t.anisotropy=8;return new T.MeshStandardMaterial({map:t,side:T.DoubleSide,roughness:.92})}
function tag(o,a){o.userData.artefact=a.id;o.name='artefact:'+a.id;return o}

/* the car he washed: the same saloon the street parks, at the kerb by the spot he washed it at, paint that takes the
   light; a hurried wash keeps a dull streak along the door */
function car(c,a,K){var s=c.spot('car');if(!s||!c.car)return false;var x=s.x*c.U,z=s.z*c.U+1.6;
 var g=tag(c.car(x,z,0,K.ad),a);g.scale.setScalar(.9);
 g.traverse(function(o){if(!o.isMesh||!o.material||o.material.transparent)return;var m=o.material;if(m.metalness>.25&&m.roughness>.15){m.roughness=.14;m.metalness=Math.max(m.metalness,.55);m.envMapIntensity=1.4}});
 if(has(a,'streak')){var st=c.mesh(new c.T.PlaneGeometry(1.5,.16),c.std('#8a847c',{roughness:1,transparent:true,opacity:.55}),0,.78,.86,g);st.rotation.z=-.06;st.castShadow=false}}

/* the scarf: club stripes, a fringe, and the patch he stitched — darker cloth, his stitches in the light colour */
function scarf(c,a,K){var s=c.spot('desk')||c.spot('wardrobe');if(!s)return false;var T=c.T,cv=canvas(64,512),k=cv.getContext('2d');
 for(var i=0;i<8;i++){k.fillStyle=i%2?K.s:K.a;k.fillRect(0,i*64,64,64)}
 k.fillStyle=K.a;for(i=0;i<8;i++)k.fillRect(i*8+1,500,4,12);
 if(has(a,'patch')){k.fillStyle=K.add;k.fillRect(10,200,44,58);k.strokeStyle=K.s;k.lineWidth=2;k.setLineDash([4,4]);k.strokeRect(10,200,44,58);k.setLineDash([]);
  for(i=0;i<6;i++){k.beginPath();k.moveTo(12+i*7,262);k.lineTo(16+i*7,252);k.stroke()}}
 /* over the back of the desk chair, the way a scarf is left in a boy's room: one end down the front, the patch facing out */
 var g=tag(new T.Group(),a);g.position.set(s.x+1.6,0,s.z+.38);g.rotation.y=.15;c.g.add(g);var m=cloth(c,cv);
 var top=c.mesh(new T.BoxGeometry(.8,.06,.34),c.std(K.a,{roughness:.95}),0,4.3,0,g);top.castShadow=false;
 var fr=c.mesh(new T.PlaneGeometry(.78,2.9,1,8),m,.05,2.86,.19,g);fr.rotation.x=-.05;fr.castShadow=false;
 var bk=c.mesh(new T.PlaneGeometry(.78,2.1,1,6),m,-.06,3.25,-.19,g);bk.rotation.x=.08;bk.castShadow=false}

/* the poster: folded into the box it keeps its crease — two halves at an angle with a line where the paper gave; on the
   wall it hangs flat */
function poster(c,a,K){var T=c.T,cv=canvas(256,360),k=cv.getContext('2d');k.fillStyle=K.s;k.fillRect(0,0,256,360);k.fillStyle=K.a;k.fillRect(14,14,228,240);
 k.fillStyle=K.s;k.font='900 64px Arial';k.textAlign='center';k.fillText(K.SHORT,128,160);k.fillStyle=K.t;k.font='700 26px Arial';k.fillText(K.Name.toUpperCase().slice(0,16),128,300);
 if(has(a,'crease')){k.strokeStyle='rgba(0,0,0,.28)';k.lineWidth=3;k.beginPath();k.moveTo(0,180);k.lineTo(256,182);k.stroke()}
 var m=cloth(c,cv);
 if(a.variant==='box'){var s=c.spot('box');if(!s)return false;var g=tag(new T.Group(),a);g.position.set(s.x,s.y+.25,s.z);c.g.add(g);
  /* paper folded once: the top half lifts on the crease line */
  var lo=new T.PlaneGeometry(2.4,1.7);lo.translate(0,-.85,0);var hi=new T.PlaneGeometry(2.4,1.7);hi.translate(0,.85,0);
  var uvL=lo.attributes.uv,uvH=hi.attributes.uv;for(var i=0;i<uvL.count;i++){uvL.setY(i,uvL.getY(i)*.5);uvH.setY(i,.5+uvH.getY(i)*.5)}
  var a1=c.mesh(lo,m,0,0,0,g);a1.rotation.x=-Math.PI/2;var a2=c.mesh(hi,m,0,0,0,g);a2.rotation.x=-Math.PI/2+.32;g.rotation.y=.2}
 else{var w=c.spot('flag');if(!w)return false;var p=tag(c.mesh(new T.PlaneGeometry(2.4,3.4),m,w.x+3.2,w.y+.4,.32,c.g),a);p.castShadow=false}}

/* the crew's banner: the club's colour, its short name, and the second letter painted through a stencil that slipped —
   kept crooked, painted over straight, or with the mate's star beside it, as the crew decided */
function banner(c,a,K){var s=c.spot('rail')||c.spot('banner');if(!s)return false;var T=c.T,cv=canvas(512,160),k=cv.getContext('2d');k.fillStyle=K.a;k.fillRect(0,0,512,160);
 var word=(K.SHORT||'FC').slice(0,6),n=word.length,step=440/Math.max(n,1);k.fillStyle=K.s;k.font='900 104px Arial';k.textAlign='center';k.textBaseline='middle';
 var crooked=has(a,'crooked-stroke'),over=has(a,'painted-over'),bad=Math.min(1,n-1);
 for(var i=0;i<n;i++){var x=36+step*(i+.5);k.save();k.translate(x,82);
  if(i===bad&&crooked&&!over){k.rotate(-.24);k.translate(10,-8)}
  /* kit.js fits text to the canvas from x; a letter drawn at a translated origin says its own width */
  k.fillText(word[i],0,0,step);k.restore()}
 if(over){k.fillStyle=K.am;k.globalAlpha=.55;k.fillRect(36+step*bad,18,step,128);k.globalAlpha=1;k.fillStyle=K.s;k.fillText(word[bad],36+step*(bad+.5),82,step)}
 if(has(a,'own-star')){var sx=36+step*(bad+1)-8,sy=34;k.fillStyle=K.s;k.beginPath();for(i=0;i<10;i++){var r=i%2?7:16,an=-Math.PI/2+i*Math.PI/5;k.lineTo(sx+r*Math.cos(an),sy+r*Math.sin(an))}k.closePath();k.fill()}
 /* hung from the stand's front rail (`rail` spot = the rail top), in front of the first rows and above the walkway's
    heads, facing the pitch where the default camera stands: a bar, two ties, the cloth sagging a little */
 var W=16.4,Hh=5.2,g=tag(new T.Group(),a);g.position.set(s.x,s.y,s.z);c.g.add(g);
 var cl=c.mesh(new T.PlaneGeometry(W,Hh,10,2),cloth(c,cv),0,-Hh/2-.15,0,g);cl.castShadow=false;
 var ps=cl.geometry.attributes.position;for(var j=0;j<ps.count;j++){var u=ps.getX(j)/(W/2);ps.setZ(j,.18*(1-u*u)*(.5-ps.getY(j)/Hh))}ps.needsUpdate=true;cl.geometry.computeVertexNormals();
 c.mesh(new T.CylinderGeometry(.09,.09,W+.8,8),c.std('#2a2e3a',{metalness:.5,roughness:.5}),0,0,-.05,g).rotation.z=Math.PI/2;
 [-W/2+.5,W/2-.5].forEach(function(x){c.mesh(new T.BoxGeometry(.22,.5,.12),c.std(K.t,{roughness:.9}),x,-.2,.04,g)})}

/* on match day the scarf goes with him: tied to the same rail, hanging straight, the patch out */
function railScarf(c,a,K){var s=c.spot('scarf');if(!s)return false;var T=c.T,cv=canvas(64,512),k=cv.getContext('2d');
 for(var i=0;i<8;i++){k.fillStyle=i%2?K.s:K.a;k.fillRect(0,i*64,64,64)}
 if(has(a,'patch')){k.fillStyle=K.add;k.fillRect(10,200,44,58);k.strokeStyle=K.s;k.lineWidth=2;k.setLineDash([4,4]);k.strokeRect(10,200,44,58)}
 var g=tag(new T.Group(),a);g.position.set(s.x,s.y,s.z);c.g.add(g);
 c.mesh(new T.BoxGeometry(1.3,.32,.3),c.std(K.a,{roughness:.95}),0,-.1,.05,g);
 var pl=c.mesh(new T.PlaneGeometry(1.1,5.6,1,6),cloth(c,cv),0,-2.95,.12,g);pl.rotation.z=.04;pl.castShadow=false}

window.ARTEFACTS={place:function(c,id,made){if(!made||!made.length||!c||!c.T)return 0;var K=window.__CK||{a:'#8a2a2a',s:'#f4f1ff',t:'#14141c',ad:'#4e4440',add:'#3a3230',am:'#8a7e74',SHORT:'FC',Name:'FC'},n=0;
 made.forEach(function(a){try{
  var f=a.kind==='car'&&STREETS[id]?car:a.kind==='scarf'&&HOMES[id]?scarf:a.kind==='scarf'&&STANDS[id]?railScarf:a.kind==='poster'&&HOMES[id]?poster:a.kind==='banner'&&STANDS[id]?banner:null;
  if(f&&f(c,a,K)!==false)n++
 }catch(e){/* a thing that cannot be drawn here is not drawn; the room itself never fails for it */}});
 window.__artefacts={room:id,drawn:n};return n}};
})();
