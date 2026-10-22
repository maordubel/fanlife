/* LIFE · TOWN — chapter shots: the reel that opens a chapter is shot in the world itself.
   ?shot=<name> stages one still moment in an existing room with a fixed camera and the club's own colours:
   a scarf left on the chair, a hand holding the ticket, the walk into the tunnel, a look up at the stand.
   `scripts/life/capture-shots.mjs` photographs each one per club into /life/town/shots/<club>/<shot>.webp,
   which the chapter reel shows (components/clubs/life/Reel.tsx). Nothing here runs without ?shot=; the capture
   script opens each shot with the room it names (SHOTS[name].room). */
(function(){
 var Q=new URLSearchParams(location.search),NAME=Q.get('shot');if(!NAME)return;
 /* room units are the lab rooms' (≈6.5 wide); camera = [position, look-at, fov] */
 var SHOTS={
  scarf:{room:'bedroom',cam:[[3.78,1.18,2.9],[4.5,0.62,1.5],30],stage:scarf},
  ticket:{room:'ticket-office',cam:[[2.96,1.3,3.95],[3.02,1.2,2.6],28],stage:ticket},
  tunnel:{room:'tunnel',cam:[[3.0,0.95,6.6],[3.0,1.45,2.6],46],stage:null},
  stand:{room:'curva',cam:[[4.0,0.45,12.6],[4.0,4.9,4.2],52],stage:null}
 };
 var S=SHOTS[NAME];if(!S)return;
 window.__SHOT={name:NAME,room:S.room,staged:false};
 function wait(){var t=window.__town;if(!t||!t.ready||!t.world||t.world.children.length<3)return setTimeout(wait,120);setTimeout(go,900)}
 function go(){var t=window.__town,T=t.T,K=window.__CK||{a:'#888888',s:'#f4f1ff',t:'#14141c',SHORT:'FC',W:{gate:'GATE'}};
  if(S.stage)S.stage(t,T,K);
  var p=new T.Vector3().fromArray(S.cam[0]),l=new T.Vector3().fromArray(S.cam[1]);
  t.hooks.push(function(){t.cam.position.copy(p);t.cam.fov=S.cam[2];t.cam.updateProjectionMatrix();t.cam.lookAt(l)});
  var ld=document.getElementById('loader');if(ld)ld.style.display='none';
  window.__SHOT.staged=true}
 function cvs(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
 function tex(T,c){var x=new T.CanvasTexture(c);x.encoding=T.sRGBEncoding;x.anisotropy=8;return x}
 function std(T,o){return new T.MeshStandardMaterial(o)}
 /* a club scarf: two colours in bars, the short name knitted in, fringes at the ends */
 function scarfTex(T,K){var c=cvs(512,64),g=c.getContext('2d');g.fillStyle=K.a;g.fillRect(0,0,512,64);g.fillStyle=K.s;for(var i=0;i<512;i+=64){g.fillRect(i,0,22,64)}
  g.fillStyle=K.s;g.fillRect(150,8,212,48);g.fillStyle=K.a;g.font='900 34px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(String(K.SHORT||'').slice(0,10),256,34);
  for(var y=0;y<64;y+=2){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,y,512,1)}return tex(T,c)}
 /* a ribbon of cloth along a path: one bent strip reads as a scarf laid over something; u runs the length */
 function ribbon(T,pts,width){var path=new T.CatmullRomCurve3(pts.map(function(a){return new T.Vector3(a[0],a[1],a[2])})),n=48,pos=[],uv=[],idx=[],side=new T.Vector3(),up=new T.Vector3(0,1,0),i;
  for(i=0;i<=n;i++){var u=i/n,pt=path.getPointAt(u),tg=path.getTangentAt(u);side.crossVectors(tg,up);if(side.lengthSq()<1e-6)side.set(1,0,0);side.normalize().multiplyScalar(width/2);
   pos.push(pt.x-side.x,pt.y-side.y,pt.z-side.z,pt.x+side.x,pt.y+side.y,pt.z+side.z);uv.push(u,0,u,1);if(i<n){var k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}
  var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
 function scarf(t,T,K){var map=scarfTex(T,K);map.wrapS=T.RepeatWrapping;map.repeat.set(2,1);
  /* across the seat, over its front edge, the end loose on the floor */
  var r=new T.Mesh(ribbon(T,[[4.24,.665,1.24],[4.46,.668,1.42],[4.58,.645,1.56],[4.61,.42,1.62],[4.64,.14,1.66],[4.72,.025,1.82],[4.88,.022,1.95]],.15),std(T,{map:map,roughness:.95,side:T.DoubleSide}));
  r.castShadow=true;r.receiveShadow=true;t.world.add(r);
  /* nobody in the room: the scarf was left there */
  hidePeople(t)}
 function hidePeople(t){t.world.traverse(function(o){if(o.isSkinnedMesh){var g=o;while(g.parent&&g.parent!==t.world)g=g.parent;g.visible=false}})}
 /* a match ticket: the club's name, the gate in the club's own word, a torn edge */
 function ticketTex(T,K){var c=cvs(512,256),g=c.getContext('2d');g.fillStyle='#f3efe4';g.fillRect(0,0,512,256);g.fillStyle=K.a;g.fillRect(0,0,512,62);g.fillRect(372,62,6,194);
  g.fillStyle=K.s;g.font='900 40px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText(String(K.SHORT||''),24,32);
  g.fillStyle=K.t||'#14141c';g.font='800 30px Arial';g.fillText(((K.W&&K.W.gate)||'GATE')+(K.n2!=null?' '+K.n2:''),24,104)/* the club's own gate: the number its curva wears (lib/clubs/life/skins.ts) */;g.font='700 22px Arial';g.fillText('ADMIT ONE',24,150);
  g.font='700 18px Courier New';g.fillText('Nº 0417',24,214);g.save();g.translate(445,160);g.rotate(-Math.PI/2);g.textAlign='center';g.fillText('STUB',0,0);g.restore();
  for(var x=0;x<512;x+=3){g.fillStyle='rgba(0,0,0,'+((x*7919%97)/97*.05)+')';g.fillRect(x,62,3,194)}return tex(T,c)}
 function ticket(t,T,K){var w=t.world,G=new T.Group();G.position.set(3.0,1.235,3.35);G.rotation.set(-.35,.08,.06);w.add(G);
  var tk=new T.Mesh(new T.PlaneGeometry(.26,.13),std(T,{map:ticketTex(T,K),roughness:.8,side:T.DoubleSide}));G.add(tk);
  var skin=std(T,{color:'#b97f5c',roughness:.65});
  /* the hand that holds it, by the bottom-left corner: the palm and fingers behind the ticket, only the thumb
     in front, the wrist leaving the frame — the ticket is what the shot is about */
  var palm=new T.Mesh(new T.SphereGeometry(.05,16,12),skin);palm.scale.set(1,.85,.45);palm.position.set(-.125,-.075,-.028);G.add(palm);
  for(var i=0;i<3;i++){var f=new T.Mesh(new T.CylinderGeometry(.0105,.0095,.06,10),skin);f.position.set(-.09+i*.022,-.072,-.02);f.rotation.x=.25;G.add(f);
   var tip=new T.Mesh(new T.SphereGeometry(.0105,10,8),skin);tip.position.set(-.09+i*.022,-.043,-.013);G.add(tip)}
  var th=new T.Mesh(new T.CylinderGeometry(.012,.011,.055,10),skin);th.position.set(-.108,-.045,.011);th.rotation.z=-.75;G.add(th);
  var tt=new T.Mesh(new T.SphereGeometry(.012,10,8),skin);tt.position.set(-.088,-.026,.012);G.add(tt);
  var wr=new T.Mesh(new T.CylinderGeometry(.034,.036,.16,12),std(T,{color:K.ad||K.t||'#222222',roughness:.9}));wr.position.set(-.2,-.14,-.03);wr.rotation.z=.9;G.add(wr);
  G.traverse(function(o){if(o.isMesh)o.castShadow=true})}
 wait();
})();
