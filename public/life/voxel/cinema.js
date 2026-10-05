/* LIFE — the cinema demo. Same rooms, same people, same engine; what is new is the LENS and the GLUE:
 *  · lens  — the scene is drawn to a float target, then bloomed, graded, softened top and bottom
 *            (tilt-shift), given a little fringe, vignette and grain, and only then put on the glass;
 *  · air   — exponential fog tinted by the hour, and dust drifting through the room;
 *  · eyes  — the exposure lags behind the room you walked into, so a tunnel mouth really is bright;
 *  · glue  — a door is a match-cut: the room you leave keeps filling the glass from the door itself,
 *            and dissolves while the next room's camera settles and he walks the first steps in.
 * Nothing here knows a story. It only reads the room list (cinema-rooms.json) and drives __vxPlay. */
(function(){
'use strict';
var V=window.__vx,P=window.__vxPlay,T=window.THREE;
var stage=document.getElementById('stage'),canvas=document.getElementById('gl'),sky=stage.querySelector('.sky');
var ghost=document.getElementById('ghost'),ghostc=document.getElementById('ghostc'),gctx=ghostc.getContext('2d');
var placeEl=document.getElementById('place'),hintEl=document.getElementById('hint'),endEl=document.getElementById('end');
var btnTour=document.getElementById('tour'),btnCmp=document.getElementById('cmp'),btnAgain=document.getElementById('again');
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var CLUB=new URLSearchParams(location.search).get('club')||undefined,armed=false,wasMoving=false,DATA=null,BY={},cinema=true,tour=false,tourT=0,expo=1,expoTarget=1,cfgNow=null,busy=false,snap=null,prevRoom=null;
var BRIGHT={room:1,street:1.1,route:1.1,gate:1,tunnel:.55,terrace:.5};
/* the tour's way forward, door by door */
var FORWARD={room:'room:front',street:'street:east',route:'route:east',gate:'gate:turnstile',tunnel:'tunnel:light'};

/* ---------- the lens ---------- */
var ren=null,orig=null,rtScene=null,rtH=null,rtQ=null,rtQ2=null,quad=null,ortho=null,mats={},W=0,H=0,t0=performance.now();
var VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
var FS_COPY='uniform sampler2D t;varying vec2 vUv;void main(){gl_FragColor=texture2D(t,vUv);}';
var FS_BLUR='uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec4 s=texture2D(t,vUv)*.2270270;s+=texture2D(t,vUv+d*1.3846154)*.3162162;s+=texture2D(t,vUv-d*1.3846154)*.3162162;s+=texture2D(t,vUv+d*3.2307692)*.0702703;s+=texture2D(t,vUv-d*3.2307692)*.0702703;gl_FragColor=s;}';
var FS_COMP=[
'uniform sampler2D tS;uniform sampler2D tB;uniform vec2 px;uniform float time,expo,night;varying vec2 vUv;',
'vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}',
'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
'void main(){',
' vec2 c=vUv-.5;float r2=dot(c,c);',
' vec2 off=c*r2*.012;',
' vec4 s=texture2D(tS,vUv);',
' vec4 b=texture2D(tB,vUv);',
' float tilt=smoothstep(.27,.5,abs(vUv.y-.5))*.65;',
' vec3 col=mix(s.rgb,b.rgb,tilt);float a=mix(s.a,b.a,tilt);',
' vec3 glow=max(b.rgb-vec3(.62),0.)*(night>.5?1.5:.9);',
' col+=glow;a=clamp(a+max(glow.r,max(glow.g,glow.b)),0.,1.);',
' col*=expo;col=mix(vec3(dot(col,vec3(.299,.587,.114))),col,1.12);',
' col=aces(col*.82);',
' float l=dot(col,vec3(.299,.587,.114));',
' col*=mix(vec3(.93,.98,1.06),vec3(1.04,.99,.95),smoothstep(.15,.8,l));',
' col=mix(vec3(l),col,1.08);',
' col=col*col*(3.-2.*col)*.35+col*.65;',
' col*=1.-smoothstep(.2,.78,r2*2.1)*.5;',
' col=pow(col,vec3(1./2.2));',
' col+=(hash(vUv/px*.37+time)-.5)*.035;',
' gl_FragColor=vec4(col*a,a);',
'}'].join('\n');

function mk(fs,u){return new T.ShaderMaterial({vertexShader:VS,fragmentShader:fs,uniforms:u,depthTest:false,depthWrite:false})}
function hasFloat(gl){return !!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float'))}
function target(w,h,msaa,float,depth){
 var o={minFilter:T.LinearFilter,magFilter:T.LinearFilter,format:T.RGBAFormat,type:float?T.HalfFloatType:T.UnsignedByteType,depthBuffer:!!depth,stencilBuffer:false};
 if(msaa){var m=new T.WebGLMultisampleRenderTarget(w,h,o);m.samples=4;return m}
 return new T.WebGLRenderTarget(w,h,o);
}
function setup(){
 ren=V.renderer();orig=ren.render.bind(ren);
 var gl=ren.getContext(),gl2=!!ren.capabilities.isWebGL2,fl=hasFloat(gl);
 ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
 quad=new T.Mesh(new T.PlaneGeometry(2,2),null);quad.frustumCulled=false;
 var sc=new T.Scene();sc.add(quad);mats.scene=sc;
 mats.copy=mk(FS_COPY,{t:{value:null}});
 mats.blur=mk(FS_BLUR,{t:{value:null},d:{value:new T.Vector2()}});
 mats.comp=mk(FS_COMP,{tS:{value:null},tB:{value:null},px:{value:new T.Vector2(1,1)},time:{value:0},expo:{value:1},night:{value:0}});
 mats.gl2=gl2;mats.fl=fl;
 ren.render=function(s,c){
  if(!cinema){return orig(s,c)}
  draw(s,c);
  if(snap){var cb=snap;snap=null;cb()}
 };
}
function sizeTargets(){
 var v=new T.Vector2();ren.getDrawingBufferSize(v);var w=Math.max(2,v.x|0),h=Math.max(2,v.y|0);
 if(w===W&&h===H&&rtScene)return;
 W=w;H=h;
 [rtScene,rtH,rtQ,rtQ2].forEach(function(r){r&&r.dispose()});
 rtScene=target(W,H,mats.gl2,mats.fl,true);
 rtH=target(W>>1,H>>1,0,mats.fl);rtQ=target(W>>2,H>>2,0,mats.fl);rtQ2=target(W>>2,H>>2,0,mats.fl);
 ghostc.width=W;ghostc.height=H;
}
function pass(m,rt){quad.material=m;ren.setRenderTarget(rt);orig(mats.scene,ortho)}
function draw(s,c){
 sizeTargets();
 var tm=ren.toneMapping,enc=ren.outputEncoding,au=ren.autoClear;
 ren.toneMapping=T.NoToneMapping;
 ren.setRenderTarget(rtScene);ren.setClearColor(0x000000,0);ren.clear(true,true,true);orig(s,c);
 ren.toneMapping=tm;
 /* the soft chain: half, quarter, then two blurs each way */
 mats.copy.uniforms.t.value=rtScene.texture;pass(mats.copy,rtH);
 mats.copy.uniforms.t.value=rtH.texture;pass(mats.copy,rtQ);
 var qx=1/(W>>2),qy=1/(H>>2),k;
 for(k=1;k<=2;k++){
  mats.blur.uniforms.t.value=rtQ.texture;mats.blur.uniforms.d.value.set(qx*k,0);pass(mats.blur,rtQ2);
  mats.blur.uniforms.t.value=rtQ2.texture;mats.blur.uniforms.d.value.set(0,qy*k);pass(mats.blur,rtQ);
 }
 var u=mats.comp.uniforms;u.tS.value=rtScene.texture;u.tB.value=rtQ.texture;u.px.value.set(1/W,1/H);
 u.time.value=((performance.now()-t0)/1000)%97;u.expo.value=expo;u.night.value=V.st.time==='night'?1:0;
 ren.setRenderTarget(null);ren.setClearColor(0x000000,0);ren.autoClear=true;
 quad.material=mats.comp;orig(mats.scene,ortho);
 ren.outputEncoding=enc;ren.autoClear=au;
}

/* ---------- the air: fog + dust, rebuilt with every room ---------- */
var dust=null,dustBase=null,dustPos=null;
function air(cur){
 var night=cur.night;
 if(cinema){var col=night?0x141c34:0xcddbe6;cur.root.parent.fog=new T.FogExp2(col,night?.0075:.0042)}
 else cur.root.parent.fog=null;
 var w=cfgNow?cfgNow.walk:[0,0,40,20],n=reduce?90:240,pos=new Float32Array(n*3),i;
 dustBase=new Float32Array(n*3);
 for(i=0;i<n;i++){dustBase[i*3]=w[0]+Math.random()*(w[2]-w[0]);dustBase[i*3+1]=.8+Math.random()*10;dustBase[i*3+2]=w[1]-2+Math.random()*(w[3]-w[1]+4)}
 dustPos=pos;pos.set(dustBase);
 var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
 var m=new T.PointsMaterial({color:night?0x9db0e0:0xffffff,size:.16,transparent:true,opacity:night?.32:.4,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true,fog:false});
 dust=new T.Points(g,m);dust.frustumCulled=false;dust.visible=cinema;cur.root.add(dust);
}
V.onBuild(air);
V.onFrame(function(t,dt){
 if(dust&&cinema&&!reduce){var a=dust.geometry.attributes.position,p=a.array,n=p.length/3;
  for(var i=0;i<n;i++){var j=i*3,ph=i*.73;p[j]=dustBase[j]+Math.sin(t*.13+ph)*1.4;p[j+1]=dustBase[j+1]+Math.sin(t*.21+ph*1.7)*.8-((t*.12+i*.01)%1)*.6;p[j+2]=dustBase[j+2]+Math.cos(t*.11+ph)*1.2}
  a.needsUpdate=true}
 expo+=(expoTarget-expo)*Math.min(1,dt*(reduce?9:1.1));
 /* a walk that ends on a door opens it — the glass is the controller */
 if(armed&&!busy){var w=P.where();if(w){if(w.moving)wasMoving=true;else if(wasMoving&&w.target&&w.target.kind==='exit'&&!w.frozen){armed=false;wasMoving=false;P.act()}else if(wasMoving&&!w.target){armed=false;wasMoving=false}}}
 if(tour&&!busy&&cfgNow){tourT+=dt;if(tourT>1.4){tourT=0;var id=FORWARD[cfgNow.room];if(id){armed=true;wasMoving=false;P.goTo('exit',id)}else if(cfgNow.room==='terrace'){tour=false;btnTour.classList.remove('live');endEl.hidden=false}}}
});

/* ---------- rooms and the glue ---------- */
function config(room,spawn){
 var r=BY[room],sp=r.spawns[spawn]||r.spawns[r.defaultSpawn];
 return {room:room,club:CLUB,time:r.time,floorY:r.floorY,walk:r.walk,viewH:r.viewH,surface:r.surface,blocks:r.blocks,clear:r.clear,
  spawn:sp,frame:{top:.86,bottom:-.8},actors:r.actors,spots:r.spots,exits:r.exits,player:DATA.hero,frozen:false};
}
function label(room){placeEl.textContent=BY[room].label;placeEl.classList.add('on')}
function inward(){
 if(!cfgNow||!cfgNow.spawn)return;var sp=cfgNow.spawn,y=sp.yaw||0;
 P.walkTo(sp.x+Math.sin(y)*2.6,sp.z+Math.cos(y)*2.6);
}
function enterRoom(room,spawn,from,origin){
 armed=false;wasMoving=false;var first=!cfgNow;cfgNow=config(room,spawn);
 var st=V.st;stage.className='stage '+(cfgNow.time==='night'?'night':'day')+(cinema?' cine':'');
 P.enter(cfgNow);label(room);
 /* the eyes: they are still adjusted to the room he came from */
 if(from){var r=Math.pow(BRIGHT[room]/BRIGHT[from],.5);expo=Math.max(.6,Math.min(1.55,r))}
 expoTarget=1;
 if(!first&&!reduce){V.view.zoom=1.22;setTimeout(function(){V.view.zoom=1},60)}
 if(origin){setTimeout(inward,reduce?0:380)}
}
function transition(exitId){
 var room=exitId.split(':')[0],r=BY[room],x=null,i;
 for(i=0;i<r.exits.length;i++)if(r.exits[i].id===exitId)x=r.exits[i];
 if(!x||busy)return;busy=true;endEl.hidden=true;
 var from=room,to=x.to,sp=x.spawn;
 if(!cinema||reduce){enterRoom(to,sp,from,true);busy=false;return}
 /* where the door is on the glass: the old room grows out of that point */
 var cam=V.camera(),v=new T.Vector3(x.x+x.w/2,(r.floorY||0)+3,x.z+x.d/2).project(cam),
  px=(v.x+1)/2*100,py=(1-v.y)/2*100;
 snap=function(){
  gctx.clearRect(0,0,W,H);gctx.drawImage(canvas,0,0,W,H);
  ghost.style.background=getComputedStyle(sky).backgroundImage;
  ghost.style.transformOrigin=px+'% '+py+'%';ghost.style.opacity='1';ghost.style.transform='scale(1)';
  requestAnimationFrame(function(){
   enterRoom(to,sp,from,true);
   var an=ghost.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.35)'}],{duration:760,easing:'cubic-bezier(.3,.1,.2,1)',fill:'forwards'});
   an.onfinish=function(){ghost.style.opacity='0';an.cancel();busy=false};
  });
 };
}
P.on(function(e){
 if(e.type==='exit')transition(e.id);
 if(e.type==='error')console.error('[cinema]',e.message);
});

/* ---------- input ---------- */
var keys={};
function axis(){var x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);P.axis(x,y)}
function stopTour(){if(tour){tour=false;btnTour.classList.remove('live')}}
window.addEventListener('keydown',function(e){var k=e.key.toLowerCase();
 if(k==='c'){toggle();return}
 if('wasd'.indexOf(k)>=0&&k.length===1||k.indexOf('arrow')===0){keys[k]=1;armed=false;stopTour();axis();hintEl.classList.add('off');e.preventDefault()}});
window.addEventListener('keyup',function(e){delete keys[e.key.toLowerCase()];axis()});
window.addEventListener('blur',function(){keys={};axis()});
canvas.addEventListener('pointerdown',function(){armed=true;wasMoving=false;stopTour();hintEl.classList.add('off')});
function toggle(){
 cinema=!cinema;btnCmp.setAttribute('aria-pressed',String(cinema));btnCmp.textContent='Cinema: '+(cinema?'on':'off');
 stage.classList.toggle('cine',cinema);
 var cur=V.cur();if(cur){cur.root.parent.fog=cinema?new T.FogExp2(cur.night?0x141c34:0xcddbe6,cur.night?.0075:.0042):null;if(dust)dust.visible=cinema;
  cur.root.traverse(function(o){if(o.material){[].concat(o.material).forEach(function(m){m.needsUpdate=true})}})}
 if(!cinema){ren.setRenderTarget(null)}
}
btnCmp.addEventListener('click',toggle);
btnTour.addEventListener('click',function(){tour=!tour;tourT=0;btnTour.classList.toggle('live',tour);hintEl.classList.add('off');endEl.hidden=true});
btnAgain.addEventListener('click',function(){endEl.hidden=true;enterRoom('room','start',null,false);tour=true;tourT=-1;btnTour.classList.add('live')});

/* ---------- go ---------- */
function start(){
 fetch('/life/voxel/cinema-rooms.json').then(function(r){return r.json()}).then(function(d){
  DATA=d;d.rooms.forEach(function(r){BY[r.room]=r});
  setup();
  var q=new URLSearchParams(location.search);
  if(q.get('cinema')==='0'){cinema=false;btnCmp.setAttribute('aria-pressed','false');btnCmp.textContent='Cinema: off'}
  stage.classList.toggle('cine',cinema);
  enterRoom(q.get('room')&&BY[q.get('room')]?q.get('room'):'room','start',null,false);
  window.__cinema={enter:enterRoom,toggle:toggle,go:function(id){armed=true;wasMoving=false;P.goTo('exit',id)},state:function(){return{room:cfgNow&&cfgNow.room,busy:busy,cinema:cinema,expo:expo}},tour:function(b){tour=b!==false;tourT=0;btnTour.classList.toggle('live',tour)}};
  window.__cinemaReady=true;
  if(q.get('tour')==='1'){tour=true;btnTour.classList.add('live')}
 }).catch(function(er){console.error('[cinema]',er)});
}
if(window.__ready)start();else{var iv=setInterval(function(){if(window.__ready){clearInterval(iv);start()}},60)}
})();
