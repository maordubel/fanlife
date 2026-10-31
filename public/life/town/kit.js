(function(){
var T=THREE,Q=new URLSearchParams(location.search);
var R=T.MathUtils;var seed=11;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}function rr(a,b){return a+rnd()*(b-a)}
var PLAYMODE=false;var QL=Q.get('q')||(matchMedia('(pointer:coarse)').matches?'med':'high');if(QL!=='low'&&QL!=='med'&&QL!=='high')QL='high';
var ren=new T.WebGLRenderer({antialias:QL!=='low',alpha:false,preserveDrawingBuffer:Q.get('capture')==='1'||!Q.get('play')});ren.setPixelRatio(Math.min(devicePixelRatio,QL==='high'?2:QL==='med'?1.5:1));ren.shadowMap.enabled=QL!=='low';ren.shadowMap.type=T.PCFSoftShadowMap;/* 31.10.2026: inverse-square lamps. r128's default point light falls off linearly to `distance`, so five lamps lit a whole flat evenly; a real lamp lights the metre round it and lets the room go dark between pools. Authored intensities are rescaled once in sober() (LAMP_K). */ren.physicallyCorrectLights=true;ren.outputEncoding=T.sRGBEncoding;ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.0;
(document.getElementById('stage')||document.body).appendChild(ren.domElement);var sc=new T.Scene();
var cam=new T.PerspectiveCamera(36,1,.1,200);
/* ================= the club, as everything a room may print or paint ================= */
function shade(h,k){var c=new T.Color(h),o={};c.getHSL(o);c.setHSL(o.h,Math.min(1,o.s*(k<0?1:1-k*.25)),Math.max(0,Math.min(1,o.l*(1+k))));return'#'+c.getHexString()}
function title(s){return String(s||'').toLowerCase().replace(/(^|[\s\-.])(\S)/g,function(m,a,b){return a+b.toUpperCase()})}
function clubKit(sk){var S=(sk&&sk.club)||null,p=(sk&&sk.c1)||'#d8283e',short=S&&S.short?S.short:'FC',city=S&&S.city?S.city:'',ground=S&&S.stadium?S.stadium:'the Stadium';
 var kiosk=S&&S.cast&&S.cast.kiosk?S.cast.kiosk:null;
 function mute(h,g,k){return'#'+new T.Color(h).lerp(new T.Color(g),k).getHexString()}
 /* the pure colour is for what the club owns (flags, scarves, signs); furniture and cloth in a home take it muted, the way a real room does */
 return{a:p,a2:mute(shade(p,-.12),'#6e625a',.3),ad:mute(shade(p,-.26),'#4e4440',.32),add:mute(shade(p,-.42),'#3a3230',.3),add2:mute(shade(p,-.34),'#463c38',.3),am:mute(shade(p,-.14),'#8a7e74',.38),s:(sk&&sk.c2)||'#f4f1ff',t:(sk&&sk.c3)||'#14141c',
  SHORT:short.toUpperCase(),Short:title(short),Name:S&&S.name?S.name:title(short),CITY:city.toUpperCase(),City:city,GROUND:ground.toUpperCase(),Ground:ground,
  KIOSK:kiosk?(kiosk.toUpperCase()+(S&&S.lang&&S.lang!=='en'?'':'’S')):((S&&S.strings&&S.strings.kiosk)||'KIOSK'),
  /* every word a sign may carry, in the club street's own language; English only where nothing says otherwise */
  W:(function(w){w=(S&&S.strings)||{};function u(k,e){return w[k]||e}return{gate:u('gate','GATE'),ticket:u('ticket','TICKETS'),stand:u('stand','STAND'),cafe:u('cafe','CAFÉ'),snack:u('snack','SNACKS'),bus:u('bus','BUSES'),since:u('since','FOREVER'),ground:u('ground','STADIUM'),
   kiosk:u('kiosk','KIOSK'),news:u('news','NEWS'),club:u('club','CLUB'),school:u('school','SCHOOL'),away:u('away','AWAY'),shop:u('shop','GROCERY'),market:u('market','MARKET'),
   closed:u('closed','CLOSED'),pharmacy:u('pharmacy','PHARMACY'),fruit:u('fruit','FRUIT'),veg:u('veg','FRESH VEG'),spices:u('spices','SPICES'),nuts:u('nuts','NUTS'),salon:u('salon','BARBER'),swim:u('swim','SWIMWEAR'),sport:u('sport','SPORT'),scarves:u('scarves','SCARVES'),tonight:u('tonight','TONIGHT'),today:u('today','TODAY'),oos:u('oos','NOT IN SERVICE'),pitch:u('pitch','THE PITCH'),hood:u('hood','NEIGHBOURHOOD'),popcorn:u('popcorn','POPCORN'),win:u('win','WIN!'),till:u('till','TILL'),exit:u('exit','EXIT'),fire:u('fire','FIRE EXIT'),home:u('home','HOME'),homegame:u('homegame','HOME GAME'),season:u('season','SEASON TICKET'),guest:u('guest','GUEST'),beer:u('beer','BEER'),hotdog:u('hotdog','HOT DOG'),water:u('water','WATER'),drinks:u('drinks','DRINKS')}})(),
  /* a month on a calendar or a fixture card, in the street's own language */
  DAYS:(function(){try{var o=[];var st=(S&&S.lang)==='he'?0:1;/* an Israeli week starts on Sunday */for(var d=0;d<7;d++)o.push(new Date(2024,0,st+d).toLocaleString((S&&S.lang)||'en',{weekday:'narrow'}).toUpperCase());return o.join('  ')}catch(e){return 'M  T  W  T  F  S  S'}})(),
  RTL:(S&&S.lang)==='he',ABC:Array.from({he:'אבגדהוזחטיכלמנסעפצקרשת',el:'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ',hr:'ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ',sr:'ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ',de:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',it:'ABCDEFGHILMNOPQRSTUVZ',tr:'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'}[(S&&S.lang)||'']||'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  SAT:(function(){try{return new Date(2024,0,6).toLocaleString((S&&S.lang)||'en',{weekday:'short'})}catch(e){return 'Sat'}})(),
  MONTH:function(m){try{return new Date(2000,m,1).toLocaleString((S&&S.lang)||'en',{month:'long'}).toUpperCase()}catch(e){return ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'][m]}},
  /* the club's own founding year (sourced), and whether this street is Tel Aviv's — only then may a sign name Tel Aviv places */
  /* the keepsake box on the bedroom floor: Hapoel's is the Red Box (The Worker's name for it); every other club's box carries its own name */
  BOX:(sk&&sk.name)==='hapoel-tel-aviv'?'The Red Box':('The '+(S&&S.name?S.name:short)+' Box'),
  YEAR:S&&S.founded?String(S.founded):'',TOWN:(S&&S.town)||null,CITYL:(S&&S.cityLayer)||null,ID:(sk&&sk.name)||null,LANG:(S&&S.lang)||'en',TLV:/tel[\s-]?aviv/i.test(city),INIT:S&&S.initials?S.initials:short.slice(0,2),n1:S&&S.nums?S.nums[0]:4,n2:S&&S.nums?S.nums[1]:5,n3:S&&S.nums?S.nums[2]:6}}
window.__CK=clubKit(null);
/* a sign is lettered for whichever club stands under it: a longer name never runs off the board */
(function(){var P=CanvasRenderingContext2D.prototype,f=P.fillText,sF=P.strokeText;function fit(ctx,t,x,mw){if(mw!=null)return mw;var W=ctx.canvas.width,a=ctx.textAlign,av=a==='center'?2*Math.min(x,W-x):(a==='right'||a==='end')?x:W-x;av=Math.max(8,av*.96);return ctx.measureText(t).width>av?av:undefined}
 P.fillText=function(t,x,y,mw){var m=fit(this,String(t),x,mw);return m===undefined?f.call(this,t,x,y):f.call(this,t,x,y,m)};P.strokeText=function(t,x,y,mw){var m=fit(this,String(t),x,mw);return m===undefined?sF.call(this,t,x,y):sF.call(this,t,x,y,m)}})();
/* ---------- procedural painted textures ---------- */
/* ---------- weathering: what makes a surface look lived-in (fbm mottling, peeling paint, water stains, cracks, grime) ---------- */
function field(w,h,cell,oct){var out=new Float32Array(w*h),amp=1,tot=0;for(var o=0;o<(oct||4);o++){var gw=Math.ceil(w/cell)+2,gh=Math.ceil(h/cell)+2,G=new Float32Array(gw*gh);for(var i=0;i<G.length;i++)G[i]=rnd();
  for(var y=0;y<h;y++){var fy=y/cell,iy=Math.floor(fy),ty=fy-iy;ty=ty*ty*(3-2*ty);for(var x=0;x<w;x++){var fx=x/cell,ix=Math.floor(fx),tx=fx-ix;tx=tx*tx*(3-2*tx);var a=G[iy*gw+ix],b=G[iy*gw+ix+1],c2=G[(iy+1)*gw+ix],d=G[(iy+1)*gw+ix+1];out[y*w+x]+=amp*((a+(b-a)*tx)*(1-ty)+(c2+(d-c2)*tx)*ty)}}tot+=amp;amp*=.5;cell=Math.max(1,cell/2)}
 for(i=0;i<out.length;i++)out[i]/=tot;return out}
function weather(g,w,h,o){o=o||{};var d=g.getImageData(0,0,w,h),p=d.data,sc=o.scale||1;var F=field(w,h,Math.max(8,96*sc),5),P=o.peel?field(w,h,Math.max(6,60*sc),4):null,S=o.stain?field(w,h,Math.max(10,140*sc),3):null;
 var mo=o.mottle==null?.16:o.mottle,pe=o.peel||0,st=o.stain||0,gr=o.grime||0,pc=o.peelCol?new T.Color(o.peelCol):null;
 for(var y=0;y<h;y++){var vy=y/h;for(var x=0;x<w;x++){var i=y*w+x,k=i*4,f=F[i]-.5,m=1+f*mo*2;
   var r=p[k],gg=p[k+1],b=p[k+2];
   if(P){var q=P[i];var t=.68-pe*.12;if(q>t-.03){var e=q-t;var rim=Math.exp(-Math.pow(e/.008,2))*.035;var a=Math.max(0,Math.min(1,e/.04))*.55;if(pc){r=r*(1-a)+pc.r*255*a*1.04;gg=gg*(1-a)+pc.g*255*a*1.03;b=b*(1-a)+pc.b*255*a}else{r*=1+a*.12;gg*=1+a*.12;b*=1+a*.1}r*=1-rim;gg*=1-rim;b*=1-rim}}
   if(S){var sv=S[i]*(1-vy*.2)+(o.stainTop?(1-vy)*.25:vy*.35);if(sv>.62){var a=Math.min(1,(sv-.62)*3)*st;r=r*(1-a*.28)+90*a*.1;gg=gg*(1-a*.3)+70*a*.1;b=b*(1-a*.36)+50*a*.1}}
   if(gr){var gy=o.grimeTop?1-vy:vy;var a2=Math.pow(Math.max(0,(gy-.72)/.28),1.6)*gr;m*=1-a2*.35}
   p[k]=r*m;p[k+1]=gg*m;p[k+2]=b*m}}
 g.putImageData(d,0,0);
 if(o.cracks){g.save();g.strokeStyle='rgba(40,30,25,.32)';for(var c3=0;c3<o.cracks;c3++){var cx=rnd()*w,cy=rnd()*h,ang=rnd()*6.28;g.lineWidth=rr(.6,1.4);g.beginPath();g.moveTo(cx,cy);for(var s2=0;s2<rr(6,16);s2++){ang+=rr(-.7,.7);cx+=Math.cos(ang)*rr(4,12)*sc;cy+=Math.sin(ang)*rr(4,12)*sc;g.lineTo(cx,cy)}g.stroke()}g.restore()}
 if(o.specks){for(var s3=0;s3<o.specks;s3++){g.fillStyle='rgba('+(rnd()<.5?'30,24,20':'255,250,240')+','+rr(.05,.16)+')';g.fillRect(rnd()*w,rnd()*h,rr(1,2.4),rr(1,2.4))}}}
/* a height map for relief, from the colour itself */
function bumpOf(t){return t}

function cvs(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tex(c,rx,ry,srgb){var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.anisotropy=8;if(srgb!==false)t.encoding=T.sRGBEncoding;return t}
function paint(g,w,h,n,col,al){for(var i=0;i<n;i++){g.strokeStyle=col(i);g.globalAlpha=al;g.lineWidth=rr(2,9);g.lineCap='round';var x=rnd()*w,y=rnd()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rr(-30,30),y+rr(-30,30));g.stroke()}g.globalAlpha=1}
function wall(base,tone,rx,ry){var c=cvs(512,512),g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,512,512);paint(g,512,512,600,function(){return tone[Math.floor(rnd()*tone.length)]},.1);weather(g,512,512,{mottle:.22,peel:.5,stain:.6,cracks:5,specks:500,scale:.7});
 var d=g.getImageData(0,0,512,512),p=d.data;for(var i=0;i<p.length;i+=4){var n=(rnd()-.5)*10;p[i]+=n;p[i+1]+=n;p[i+2]+=n}g.putImageData(d,0,0);return tex(c,rx,ry)}
function brick(base,rx,ry){var c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#c9b9a6';g.fillRect(0,0,512,512);for(var r=0;r<16;r++)for(var k=-1;k<9;k++){var x=k*64+(r%2?32:0)+2,y=r*32+2;var l=.88+rnd()*.2;g.fillStyle='hsl('+(base+rr(-4,4))+',32%,'+(48*l)+'%)';rrect(g,x,y,60,28,5);g.fill()}weather(g,512,512,{mottle:.26,stain:.7,stainTop:true,scale:.8,specks:700});return tex(c,rx,ry)}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function cobble(){var c=cvs(1024,1024),g=c.getContext('2d');g.fillStyle='#8a7a78';g.fillRect(0,0,1024,1024);for(var r=0;r<32;r++)for(var k=-1;k<17;k++){var x=k*64+(r%2?32:0)+rr(-2,2),y=r*32;var h=rr(18,32),l=rr(.85,1.15);g.fillStyle='hsl('+rr(10,30)+','+rr(10,22)+'%,'+(60*l)+'%)';rrect(g,x+3,y+3,58,26,10);g.fill();g.fillStyle='rgba(255,255,255,.12)';rrect(g,x+6,y+5,40,8,4);g.fill()}return tex(c,10,10)}
function planks(a){var c=cvs(512,512),g=c.getContext('2d');for(var i=0;i<8;i++){g.fillStyle='hsl('+rr(22,32)+','+rr(30,45)+'%,'+rr(38,50)+'%)';g.fillRect(0,i*64,512,62);g.fillStyle='rgba(60,30,10,.25)';g.fillRect(0,i*64+62,512,2);paint(g,512,64,10,function(){return'rgba(70,40,20,.5)'},.2)}weather(g,512,512,{mottle:.2,scale:.5,specks:900});return tex(c,a||1,a||1)}
function stripes(a,b,n){var c=cvs(256,64),g=c.getContext('2d');for(var i=0;i<n;i++){g.fillStyle=i%2?b:a;g.fillRect(i*256/n,0,256/n+1,64)}return tex(c,1,1)}
function sign(txt,bg,fg,w,h,font){var c=cvs(w||512,h||200),g=c.getContext('2d');g.fillStyle=bg;rrect(g,4,4,c.width-8,c.height-8,26);g.fill();g.strokeStyle=fg;g.lineWidth=6;rrect(g,14,14,c.width-28,c.height-28,20);g.stroke();g.fillStyle=fg;g.font=(font||'bold 96px')+' Heebo, Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.direction='ltr';g.fillText(txt,c.width/2,c.height/2+6);return tex(c,1,1)}
function chalk(){var c=cvs(256,320),g=c.getContext('2d');g.fillStyle='#2e3a35';g.fillRect(0,0,256,320);g.strokeStyle='#e8ece6';g.lineWidth=3;g.font='bold 30px Heebo, Arial';g.fillStyle='#e8ece6';g.textAlign='center';g.direction='ltr';g.fillText('Today',128,44);['Chocolate  8','Coffee  6','Lemonade  7','Challah  12'].forEach(function(t,i){g.font='24px Heebo, Arial';g.fillText(t,128,100+i*38)});[['#ff8fa3',60],['#ffffff',128],['#b79cff',196]].forEach(function(f){g.fillStyle=f[0];for(var a=0;a<5;a++){g.beginPath();g.ellipse(f[1]+Math.cos(a*1.26)*10,270+Math.sin(a*1.26)*10,8,8,0,0,7);g.fill()}});return tex(c,1,1)}
/* ---------- geometry helpers ---------- */
function rbox(w,h,d,r,s){s=s||6;var g=new T.BoxGeometry(w,h,d,s,s,s),p=g.attributes.position,v=new T.Vector3(),c=new T.Vector3();var hw=w/2-r,hh=h/2-r,hd=d/2-r;for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(R.clamp(v.x,-hw,hw),R.clamp(v.y,-hh,hh),R.clamp(v.z,-hd,hd));v.sub(c);if(v.lengthSq()>1e-9)v.normalize().multiplyScalar(r);v.add(c);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g}
function capsule(r,len,seg){var pts=[],n=8;for(var i=0;i<=n;i++){var a=-Math.PI/2+i/n*Math.PI/2;pts.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r-len/2))}for(i=0;i<=n;i++){a=i/n*Math.PI/2;pts.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*r+len/2))}return new T.LatheGeometry(pts,seg||14)}
var MT={};function std(c,o){o=o||{};return new T.MeshStandardMaterial(Object.assign({color:c,roughness:.82,metalness:0},o))}
function mesh(g,m,x,y,z,par){var o=new T.Mesh(g,m);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;if(par)par.add(o);return o}
var world=new T.Group();sc.add(world);

/* ---------- GTA-ish night street: Tel Aviv south, matchday ---------- */
var anim={sway:[],glow:[],chars:[],flares:[],flags:[],cars:[],smoke:[],tick:[]};
var SK=['#f1c7a5','#e0a982','#c68863','#8d5a3e','#6b4430'];
function glowTex(){if(glowTex.t)return glowTex.t;var c=cvs(64,64),g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return glowTex.t=new T.CanvasTexture(c)}
function concrete(base,rx,ry){return wall(base,['#8a8a92','#6a6a74','#9a9aa4','#555560'],rx,ry)}
function asphalt(){var c=cvs(1024,1024),g=c.getContext('2d'),i;g.fillStyle='#34333a';g.fillRect(0,0,1024,1024);var d=g.getImageData(0,0,1024,1024),p=d.data;for(i=0;i<p.length;i+=4){var n=(rnd()-.5)*34+(rnd()<.04?28:0);p[i]+=n;p[i+1]+=n;p[i+2]+=n*1.05}g.putImageData(d,0,0);
/* every generated surface says what it is made of, so the light can treat it as that: a brick has relief, a
   painted wall has stains that are only colour, cloth is soft, metal shines where it is worn (owner's list, item 6) */
function tagged(f,kind){return function(){var t=f.apply(this,arguments);if(t&&t.userData)t.userData.mat=kind;return t}}
brick=tagged(brick,'stone');cobble=tagged(cobble,'stone');asphalt=tagged(asphalt,'stone');planks=tagged(planks,'wood');wall=tagged(wall,'plaster');concrete=tagged(concrete,'stone');
 /* worn asphalt: fine aggregate, darker tar patches where it was dug up, a tar-sealed crack or two, the odd oil stain */
 for(i=0;i<4;i++){g.fillStyle='rgba(18,18,22,'+rr(.1,.2)+')';var px=rnd()*900,py=rnd()*900;g.fillRect(px,py,rr(60,200),rr(40,140))}
 g.strokeStyle='rgba(12,12,14,.55)';for(i=0;i<9;i++){g.lineWidth=rr(1.5,3.5);g.beginPath();var cx=rnd()*1024,cy=rnd()*1024;g.moveTo(cx,cy);for(var k=0;k<8;k++){cx+=rr(-40,40);cy+=rr(-40,40);g.lineTo(cx,cy)}g.stroke()}
 for(i=0;i<14;i++){var gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,'rgba(8,8,10,.35)');gr.addColorStop(1,'rgba(8,8,10,0)');g.save();g.translate(rnd()*1024,rnd()*1024);g.scale(rr(15,45),rr(8,20));g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.restore()}
 weather(g,1024,1024,{mottle:.3,stain:.4,scale:.6});return tex(c,8,4)}
function rollerShutter(){var c=cvs(256,256),g=c.getContext('2d');for(var i=0;i<32;i++){g.fillStyle=i%2?'#6a6a74':'#7a7a86';g.fillRect(0,i*8,256,8);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,i*8+7,256,1)}g.strokeStyle=__CK.a;g.lineWidth=14;g.lineCap='round';g.beginPath();g.moveTo(30,200);g.bezierCurveTo(80,40,160,260,226,70);g.stroke();return tex(c,1,1)}
function win(g,x,y,lit,col){var w=mesh(rbox(1.0,1.5,.14,.04,3),std('#2a2a34'),x,y,2.55,g);var gl=mesh(new T.PlaneGeometry(.82,1.32),new T.MeshStandardMaterial({color:lit?col:'#1a2030',emissive:lit?col:'#0a0e18',emissiveIntensity:lit?1.1:.3,roughness:.2}),x,y,2.64,g);gl.castShadow=false;if(lit){var sp=new T.Sprite(new T.SpriteMaterial({color:col,map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.35,depthWrite:false}));sp.scale.set(2.6,2.6,1);sp.position.set(x,y,2.9);g.add(sp);anim.glow.push(sp)}mesh(rbox(1.3,.1,.4,.03,2),std('#5a5a64'),x,y-.82,2.7,g)}
function lamp(x,z){var g=new T.Group();g.position.set(x,0,z);world.add(g);mesh(new T.CylinderGeometry(.08,.12,6.2,10),std('#2a2e3a',{metalness:.6,roughness:.4}),0,3.1,0,g);var arm=mesh(rbox(1.5,.1,.1,.03,2),std('#2a2e3a',{metalness:.6}),.7,6.1,0,g);var hd=mesh(rbox(.8,.14,.3,.05,2),std('#2a2e3a'),1.4,6.0,0,g);var l=mesh(new T.PlaneGeometry(.7,.24),new T.MeshBasicMaterial({color:'#ffb890'}),1.4,5.92,0,g);l.rotation.x=Math.PI/2;var sp=new T.Sprite(new T.SpriteMaterial({color:'#ff9a64',map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.75,depthWrite:false}));sp.scale.setScalar(5);sp.position.set(1.4,5.85,0);g.add(sp);anim.glow.push(sp);var pl=new T.PointLight('#ff9a64',1.2,16,1.6);pl.position.set(1.4,5.6,0);g.add(pl);var cone=mesh(new T.CylinderGeometry(.2,2.8,5.6,18,1,true),new T.MeshBasicMaterial({color:'#ff9a64',transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),1.4,2.9,0,g);cone.castShadow=false}
function car(x,z,ry,col){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;world.add(g);
 /* an 80s saloon from its side profile: long bonnet, upright cabin, short boot — extruded and bevelled so the light rolls
    over it, then glass, chrome bumpers, rubber tyres with steel wheels, lamps and a number plate */
 var L=4.3,Wd=1.68;function prof(pts){var sh=new T.Shape();sh.moveTo(pts[0][0],pts[0][1]);for(var i=1;i<pts.length;i++)sh.lineTo(pts[i][0],pts[i][1]);sh.closePath();return sh}
 var body=prof([[-2.15,.32],[2.15,.32],[2.17,.62],[2.08,.86],[.92,.92],[-1.62,.92],[-2.12,.88],[-2.18,.6]]);
 var eo={depth:Wd-.12,bevelEnabled:true,bevelThickness:.06,bevelSize:.05,bevelSegments:3,curveSegments:4};
 var bg=new T.ExtrudeGeometry(body,eo);bg.translate(0,0,-(Wd-.12)/2);var paint=std(col,{roughness:.32,metalness:.35});var bm=new T.Mesh(bg,paint);bm.castShadow=true;bm.receiveShadow=true;g.add(bm);
 var cab=prof([[-1.5,.9],[.85,.9],[.48,1.36],[-1.12,1.38],[-1.48,.95]]),cg=new T.ExtrudeGeometry(cab,{depth:Wd-.3,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:2});cg.translate(0,0,-(Wd-.3)/2);var cm=new T.Mesh(cg,paint);cm.castShadow=true;g.add(cm);
 var glass=new T.MeshStandardMaterial({color:'#141a22',roughness:.08,metalness:.6});
 var gw=prof([[-1.42,.96],[.74,.96],[.42,1.31],[-1.08,1.33],[-1.4,1.0]]),gg=new T.ExtrudeGeometry(gw,{depth:Wd-.24,bevelEnabled:false});gg.translate(0,0,-(Wd-.24)/2);var gm=new T.Mesh(gg,glass);g.add(gm);
 [[-.3,.05]].forEach(function(){var pil=new T.Mesh(new T.BoxGeometry(.06,.42,Wd-.2),paint);pil.position.set(-.32,1.14,0);pil.rotation.z=.05;g.add(pil)});
 var chrome=std('#c8ccd2',{metalness:.85,roughness:.25});[-2.22,2.22].forEach(function(bx){var bp=new T.Mesh(rbox(.12,.16,Wd+.04,.05,3),chrome);bp.position.set(bx,.42,0);g.add(bp)});
 var trim=new T.Mesh(rbox(L-.2,.04,Wd+.02,.02,2),chrome);trim.position.set(0,.66,0);g.add(trim);
 [[-1.38,.82],[1.36,.82],[-1.38,-.82],[1.36,-.82]].forEach(function(p){var ty=mesh(new T.CylinderGeometry(.33,.33,.22,20),std('#141416',{roughness:.85}),p[0],.33,p[1],g);ty.rotation.x=Math.PI/2;var hb=mesh(new T.CylinderGeometry(.2,.2,.235,16),std('#9aa0a8',{metalness:.7,roughness:.35}),p[0],.33,p[1],g);hb.rotation.x=Math.PI/2;
  var arch=mesh(new T.CylinderGeometry(.4,.4,.06,16,1,true,0,Math.PI),std('#0c0c0e',{side:T.DoubleSide,roughness:.9}),p[0],.33,p[1]*1.02,g);arch.rotation.x=Math.PI/2;arch.rotation.y=Math.PI;arch.scale.set(1,1,1)});
 [-.55,.55].forEach(function(z2){var hl=mesh(rbox(.06,.16,.34,.03,2),new T.MeshStandardMaterial({color:'#e8e6dc',emissive:'#fff2dc',emissiveIntensity:.25,roughness:.2}),2.2,.72,z2,g);var tl=mesh(rbox(.06,.14,.3,.03,2),new T.MeshStandardMaterial({color:'#7a1a1a',emissive:'#a8202a',emissiveIntensity:.2,roughness:.3}),-2.2,.74,z2,g)});
 var pl=mesh(new T.PlaneGeometry(.52,.12),std('#e8e4d4',{roughness:.6}),-2.29,.48,0,g);pl.rotation.y=-Math.PI/2;var pf=mesh(new T.PlaneGeometry(.52,.12),std('#e8e4d4',{roughness:.6}),2.29,.48,0,g);pf.rotation.y=Math.PI/2;
 var under=mesh(new T.PlaneGeometry(L,Wd),new T.MeshBasicMaterial({color:'#000',transparent:true,opacity:.55,depthWrite:false}),0,.02,0,g);under.rotation.x=-Math.PI/2;under.userData.noBlock=1;
 return g}
function banner(x,z,w,h,txt,bg,fg){var g=new T.Group();g.position.set(x,0,z);world.add(g);mesh(new T.CylinderGeometry(.05,.05,4.6,8),std('#2a2e3a',{metalness:.5}),0,2.3,0,g);var c=cvs(256,160),k=c.getContext('2d');k.fillStyle=bg;k.fillRect(0,0,256,160);k.fillStyle=fg;k.fillRect(0,60,256,16);k.font='900 74px Heebo, Arial';k.textAlign='center';k.direction='ltr';k.fillText(txt,128,134);k.fillStyle='#fff';k.fillRect(0,0,256,10);var pl=mesh(new T.PlaneGeometry(w,h,8,1),new T.MeshStandardMaterial({map:tex(c,1,1),side:T.DoubleSide,roughness:.9}),w/2,4.1-h/2,0,g);pl.castShadow=true;anim.flags.push({o:pl,ph:x,g:pl.geometry});return g}
function dumpster(x,z,ry){var g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;world.add(g);mesh(rbox(1.8,1.2,1.0,.08,3),std('#2a5a3a',{roughness:.7}),0,.8,0,g);mesh(rbox(1.9,.1,1.1,.04,2),std('#1a3a26'),0,1.45,0,g);[-.8,.8].forEach(function(x2){mesh(new T.CylinderGeometry(.1,.1,.1,8),std('#111'),x2,.1,.4,g).rotation.z=Math.PI/2})}
function flare(x,y,z){var g=new T.Group();g.position.set(x,y,z);world.add(g);var pl=new T.PointLight('#ff2a3a',.2,3.5,2);g.add(pl);var sp=new T.Sprite(new T.SpriteMaterial({color:'#ff3a4a',map:glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:.95,depthWrite:false}));sp.scale.setScalar(1.3);g.add(sp);var core=mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:'#fff0f0'}),0,0,0,g);var smoke=[];for(var i=0;i<26;i++){var s=new T.Sprite(new T.SpriteMaterial({color:i%3?'#6a5a62':'#ff6a7a',map:glowTex(),transparent:true,opacity:.0,depthWrite:false,blending:i%3?T.NormalBlending:T.AdditiveBlending}));s.scale.setScalar(1.2);world.add(s);smoke.push({s:s,a:i/26*4,x:x,y:y,z:z})}anim.flares.push({g:g,pl:pl,sp:sp,smoke:smoke,x:x,y:y,z:z});return g}
function skinTex(){return null}
function tatTex(base){var c=cvs(64,128),g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,64,128);g.strokeStyle='rgba(30,40,70,.75)';g.lineWidth=3;for(var i=0;i<9;i++){g.beginPath();g.moveTo(rnd()*64,i*14);g.bezierCurveTo(rnd()*64,i*14+10,rnd()*64,i*14+4,rnd()*64,i*14+14);g.stroke()}g.fillStyle='rgba(180,40,50,.7)';g.fillRect(8,40,18,12);return tex(c,1,1)}
anim.flare=flare;
function loft(prof,seg,fn){var n=prof.length,pos=[],idx=[],i,j;seg=seg||28;
 for(i=0;i<n;i++)for(j=0;j<=seg;j++){var th=j/seg*Math.PI*2,y=prof[i][0],x=Math.cos(th)*prof[i][1],z=Math.sin(th)*(prof[i][2]||prof[i][1]);if(fn){var d=fn(x,y,z,th);x+=d[0];y+=d[1];z+=d[2]}pos.push(x,y,z)}
 for(i=0;i<n-1;i++)for(j=0;j<seg;j++){var a=i*(seg+1)+j,b=a+seg+1;idx.push(a,a+1,b,a+1,b+1,b)}
 var ends=[0,n-1];ends.forEach(function(e){var c=pos.length/3;pos.push(0,prof[e][0],0);for(j=0;j<seg;j++){var a=e*(seg+1)+j;if(e===0)idx.push(c,a+1,a);else idx.push(c,a,a+1)}});
 var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
function patternGeo(g,a,b,pat){var p=g.attributes.position,n=p.count,col=new Float32Array(n*3),A=new T.Color(a).convertSRGBToLinear(),B=new T.Color(b).convertSRGBToLinear();for(var i=0;i<n;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=0;if(pat==='hoops')k=Math.floor((y+.2)/.075)%2;else if(pat==='pinstripe')k=Math.floor((Math.atan2(x,z)+Math.PI)/(Math.PI*2)*30)%2;else if(pat==='sash')k=Math.abs(x+(y-.45)*.9)<.075?1:0;else if(pat==='diagonal')k=Math.floor((x+y*.8+1)/.09)%2;var c=k?B:A;col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}g.setAttribute('color',new T.BufferAttribute(col,3))}
function G_(v,s){return Math.exp(-v*v/(2*s*s))}
function SS_(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function torsoGeo(W,sc){sc=sc||1;var P=[[-.14,.138,.095],[-.05,.158,.1],[.06,.14,.092],[.18,.132,.088],[.32,.15,.1],[.44,.19,.115],[.53,.225,.115],[.6,.236,.1],[.65,.19,.09],[.69,.12,.078],[.74,.08,.068],[.79,.07,.064]].map(function(p){return[p[0],p[1]*W*sc,p[2]*sc*(1+(W-1)*.3)]});
 return loft(P,36,function(x,y,z){var dz=0,f=z>0?1:0;dz+=.022*f*G_(Math.abs(x)-.085*W,.055)*G_(y-.47,.06);dz+=-.006*f*G_(x,.012)*G_(y-.47,.1);if(z<0)dz-=.012*G_(Math.abs(x)-.09*W,.07)*G_(y-.42,.1);return[0,0,dz*sc]})}
function sculptHead(o){var g=new T.SphereGeometry(1,48,36),p=g.attributes.position,n=p.count,col=new Float32Array(n*3);
 var C=function(h){return new T.Color(h)},sk=C(o.skin),hair=C(o.hair),blush=sk.clone().lerp(C('#e0705c'),.45),lipC=sk.clone().lerp(C('#a8484a'),.5),beard=!!o.beard,stub=!!(o.stubble||o.beard),jaw=(o.jaw||1.1)-1;
 for(var i=0;i<n;i++){var ux=p.getX(i),uy=p.getY(i),uz=p.getZ(i),x=ux*.148,y=uy*.184,z=uz*.158;
  x*=1-.34*SS_(-.1,1,-uy)+jaw*.25*G_(uy+.5,.25);z*=1+.05*SS_(.2,1,uz)*G_(uy+.1,.5);p.setXYZ(i,x,y,z);
  var fr=SS_(.1,.6,uz),c=sk.clone();c.lerp(blush,.5*fr*G_(Math.abs(ux)-.55,.18)*G_(uy+.12,.2));c.lerp(lipC,fr*G_(ux,.18)*G_(uy+.5,.05)*.8);
  if(stub||beard){var bm=fr*SS_(-.2,-.5,uy)*SS_(.9,.5,Math.abs(ux));c.lerp(hair,bm*(beard?.9:.35))}
  c.convertSRGBToLinear();col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
 g.setAttribute('color',new T.BufferAttribute(col,3));g.computeVertexNormals();return g}
function makeChar(o){
 if(window.PEOPLE&&PEOPLE.ready&&!o.doll){var hg=PEOPLE.make(o,{own:function(m){conv.add(m);return m}});world.add(hg);anim.chars.push(hg);return hg}
 var g=new T.Group(),skin=std(o.skin,{roughness:.6,emissive:o.skin,emissiveIntensity:.1}),skinD=std(new T.Color(o.skin).multiplyScalar(.82).getStyle(),{roughness:.6});
 var hips=new T.Group();hips.position.y=.95;g.add(hips);
 var torso=new T.Group();torso.position.y=.02;hips.add(torso);
 var top=std(o.top,{roughness:.88}),bot=std(o.bot,{roughness:.9}),shoe=std(o.shoe||'#f4f1ff',{roughness:.5}),sole=std('#efe8de',{roughness:.7});
 var W_=o.w||1.0;var bgeo=torsoGeo(W_,1),topB=top;if(o.pat&&o.top2){patternGeo(bgeo,o.top,o.top2,o.pat);topB=std('#ffffff',{roughness:.88,vertexColors:true})}var body=mesh(bgeo,topB,0,0,0,torso);
 // clothing detail: hem band, chest seams
 var pel=mesh(loft([[-.13,.12*W_,.095],[-.06,.16*W_,.108],[.04,.162*W_,.108],[.12,.15*W_,.1]],30),bot,0,0,0,torso);
 if(o.jacket){var jk=mesh(torsoGeo(W_,1.07),std(o.jacket,{roughness:.85}),0,.0,0,torso);mesh(rbox(.012,.62,.01,.004,2),std(new T.Color(o.jacket).multiplyScalar(.5).getStyle()),0,.38,.134,torso);
  [-1,1].forEach(function(s){mesh(rbox(.04,.1,.02,.01,2),std(o.jacket),s*.07,.7,.14,torso).rotation.z=s*.4})}
 if(o.hoodie){var hd=mesh(new T.TorusGeometry(.14,.075,10,18),top,0,.68,-.045,torso);hd.rotation.x=Math.PI/2.5;hd.scale.set(1.15,1,1);[-1,1].forEach(function(s){mesh(new T.CylinderGeometry(.008,.008,.2,5),std('#f4f1ff'),s*.04,.5,.15,torso)})}
 if(o.collar){[-1,1].forEach(function(s){var cl=mesh(rbox(.08,.05,.02,.01,2),std(o.collar),s*.05,.7,.14,torso);cl.rotation.z=s*.7});mesh(new T.TorusGeometry(.1,.025,6,16),std(o.collar),0,.7,-.01,torso).rotation.x=Math.PI/2}
 if(o.scarf){var sc1=mesh(new T.TorusGeometry(.14,.06,10,20),std(o.scarf[0],{roughness:.95}),0,.72,0,torso);sc1.rotation.x=Math.PI/2;sc1.scale.set(1.15,1,1);var tl=mesh(rbox(.1,.42,.04,.02,2),std(o.scarf[0],{roughness:.95}),.1,.5,.14,torso);tl.rotation.z=.08;[.44,.5,.36].forEach(function(y,i){mesh(rbox(.102,.04,.044,.015,2),std(o.scarf[1],{roughness:.95}),.1,y,.14,torso).rotation.z=.08});for(var i=0;i<5;i++)mesh(new T.CylinderGeometry(.006,.006,.05,4),std(o.scarf[0]),.06+i*.02,.27,.145,torso)}
 if(o.apron){mesh(rbox(.36,.5,.04,.02,2),std(o.apron),0,.24,.14,torso);mesh(rbox(.14,.12,.03,.01,2),std(new T.Color(o.apron).multiplyScalar(.85).getStyle()),0,.18,.165,torso);[-1,1].forEach(function(s){mesh(new T.CylinderGeometry(.008,.008,.46,4),std(o.apron),s*.1,.5,.06,torso).rotation.z=s*-.3})}
 if(o.pack){mesh(rbox(.3,.38,.16,.06,3),std(o.pack),0,.35,-.2,torso)}
 if(o.bag){var bs=mesh(rbox(.2,.22,.08,.03,3),std(o.bag),-.2,.1,.1,torso);var st=mesh(new T.CylinderGeometry(.008,.008,.62,4),std(o.bag),-.06,.45,.1,torso);st.rotation.z=.6}
 if(o.necklace)mesh(new T.TorusGeometry(.085,.006,6,16),std('#d8c8a8',{metalness:.7,roughness:.3}),0,.66,.1,torso).rotation.x=Math.PI/2.4;
 // neck + head
 mesh(new T.CylinderGeometry(.074,.088,.14,14),skinD,0,.77,0,torso);
 var head=new T.Group();head.position.set(0,.79,0);head.scale.setScalar(.9);torso.add(head);
 var hs_=o.head||1;
 var sk=mesh(sculptHead(o),std('#ffffff',{vertexColors:true,roughness:.6}),0,.13,0,head);sk.receiveShadow=false;
 [-1,1].forEach(function(s){var ear=mesh(new T.SphereGeometry(.036,10,8),skin,s*.15,.12,-.01,head);ear.scale.set(.45,1,.9);mesh(new T.SphereGeometry(.02,8,6),skinD,s*.158,.12,0,head).scale.set(.3,.9,.7);if(o.earring)mesh(new T.SphereGeometry(.014,8,6),std('#d8c8a8',{metalness:.7,roughness:.2}),s*.155,.075,0,head)});
 // nose: bridge + tip + nostrils

 var eyes=[];mesh(new T.SphereGeometry(.026,12,10),skin,0,.095,.152,head).scale.set(1,.85,.8);
 [-1,1].forEach(function(s){var e=new T.Group();e.position.set(s*.06,.13,.14);head.add(e);
  var w=mesh(new T.SphereGeometry(.033,14,12),std('#f6f2ec',{roughness:.3}),0,0,0,e);w.scale.set(1,1.05,.55);
  var ir=mesh(new T.SphereGeometry(.023,14,12),std(o.eye||'#3a2a1c',{roughness:.25}),s*-.002,-.002,.012,e);ir.scale.set(1,1.05,.5);
  mesh(new T.SphereGeometry(.011,8,6),std('#0a0808'),s*-.002,-.002,.021,e).scale.z=.4;
  mesh(new T.SphereGeometry(.006,6,5),new T.MeshBasicMaterial({color:'#fff'}),.008,.01,.026,e);
  if(o.lash){var lh=mesh(rbox(.05,.006,.012,.003,2),std('#1a1210'),0,.034,.02,e);lh.rotation.z=-s*.2}
  var br=mesh(rbox(.07,.017,.022,.008,2),std(o.brow||o.hair,{roughness:.8}),s*.06,.195,.145,head);br.rotation.z=-s*(o.mood==='sad'?-.25:(o.mood==='soft'?.1:-.1));eyes.push({e:e})});
 var mouth=new T.Group();mouth.position.set(0,.0375,.142);head.add(mouth);
 var ml=mesh(new T.SphereGeometry(.024,12,8),new T.MeshBasicMaterial({color:'#2a0c10'}),0,0,0,mouth);ml.scale.set(1,.1,.28);ml.castShadow=false;var teeth=mesh(rbox(.04,.008,.01,.003,2),std('#fbfaf8'),0,-.002,-.002,mouth);
 // hair
 var hm=std(o.hair,{roughness:.5}),hr=new T.Group();hr.scale.set(1.06,1.1,1.06);hr.position.y=-.014;head.add(hr);
 function hs(r,x,y,z,sx,sy,sz){var m=mesh(new T.SphereGeometry(r,16,12),hm,x,y,z,hr);m.scale.set(sx||1,sy||1,sz||1);return m}
 function lock(x,y,z,len,rx,rz){var m=mesh(capsule(.03,len,6),hm,x,y,z,hr);m.rotation.set(rx||0,0,rz||0);return m}
 var st=o.style||'short';
 if(st==='short'){hs(.165,0,.185,-.02,1.01,.8,1.05);hs(.075,.07,.29,.1,1.4,.7,1);hs(.075,-.06,.28,.11,1.3,.7,1);hs(.065,0,.3,.04,1.4,.7,1);lock(.14,.1,.04,.05,0,0);lock(-.14,.1,.04,.05,0,0);hs(.05,.11,.22,.09,1,1.2,1);hs(.05,-.11,.22,.09,1,1.2,1)}
 else if(st==='spiky'){hs(.165,0,.17,-.02,1,.82,1.07);for(var i=0;i<9;i++){var sp=mesh(new T.ConeGeometry(.038,.13,7),hm,Math.cos(i*.7)*.09,.3,Math.sin(i*.7)*.075,hr);sp.rotation.set(Math.sin(i*.7)*.6,0,-Math.cos(i*.7)*.6)}hs(.05,.1,.2,.1,1,1.2,1);hs(.05,-.1,.2,.1,1,1.2,1)}
 else if(st==='bun'){hs(.165,0,.17,-.012,1,.88,1.07);hs(.065,0,.35,-.04,1,1,1);hs(.1,0,.34,-.07,1,1,1);var bn=mesh(new T.TorusGeometry(.08,.012,6,16),std(o.band||__CK.a),0,.33,-.07,hr);hs(.06,.07,.28,.1,1.4,.7,1);hs(.045,-.1,.2,.09,1,1.3,1);hs(.045,.1,.2,.09,1,1.3,1)}
 else if(st==='long'){hs(.168,0,.17,-.015,1,.9,1.1);var lg=mesh(capsule(.13,.4,14),hm,0,-.06,-.075,hr);lg.scale.set(1.2,1,.62);[-1,1].forEach(function(s){var sd=mesh(capsule(.04,.28,8),hm,s*.14,.04,.02,hr);sd.scale.set(1,1,1.3)});hs(.075,.07,.29,.1,1.4,.7,1);hs(.06,-.06,.28,.1,1.3,.7,1)}
 else if(st==='curly'){for(i=0;i<30;i++){var a=rnd()*6.28,bb=rnd()*1.35;hs(rr(.04,.065),Math.cos(a)*Math.sin(bb)*.15,.15+Math.cos(bb)*.16,Math.sin(a)*Math.sin(bb)*.15-.02,1,1,1)}}
 else if(st==='buzz'){hs(.157,0,.17,-.015,1.01,.82,1.05)}
 else if(st==='bald'){}
 else if(st==='slick'){hs(.166,0,.18,-.02,1.01,.84,1.08);hs(.07,0,.29,.02,1.5,.55,1.3);lock(0,.12,-.14,.1,.4,0)}
 else if(st==='pony'){hs(.165,0,.17,-.012,1,.88,1.07);var pn=mesh(capsule(.05,.26,10),hm,0,.12,-.2,hr);pn.rotation.x=-.55;hs(.065,.07,.29,.1,1.4,.7,1);mesh(new T.TorusGeometry(.05,.01,6,12),std(o.band||__CK.a),0,.2,-.16,hr).rotation.x=1}
 if(o.flower){var fl=new T.Group();fl.position.set(.1,.27,.06);hr.add(fl);for(i=0;i<5;i++)mesh(new T.SphereGeometry(.022,8,6),std('#ff9ec8'),Math.cos(i*1.26)*.028,Math.sin(i*1.26)*.028,0,fl);mesh(new T.SphereGeometry(.013,8,6),std('#f4f1ff'),0,0,.01,fl)}
 if(o.beanie){var bn=mesh(new T.SphereGeometry(.168,18,12,0,6.3,0,Math.PI/2),std(o.beanie,{roughness:.95}),0,.18,-.005,head);bn.scale.set(1,.95,1.07);var cf=mesh(new T.TorusGeometry(.155,.03,8,22),std(new T.Color(o.beanie).multiplyScalar(.85).getStyle(),{roughness:.95}),0,.2,0,head);cf.rotation.x=Math.PI/2;cf.scale.set(1.02,1.07,1)}
 if(o.cap){var cp=mesh(new T.SphereGeometry(.17,18,12,0,6.3,0,Math.PI/2),std(o.cap),0,.19,-.005,head);cp.scale.set(1,.9,1.07);var bi=mesh(rbox(.2,.02,.12,.012,2),std(o.cap),0,.2,.18,head);bi.rotation.x=.12;mesh(new T.SphereGeometry(.015,6,5),std('#f4f1ff'),0,.33,0,head)}
 if(o.glasses){[-1,1].forEach(function(s){mesh(new T.TorusGeometry(.049,.0045,6,20),std('#6a5a50',{metalness:.5}),s*.058,.14,.155,head)});mesh(rbox(.04,.006,.006,.002,2),std('#2a2a30'),0,.145,.155,head);[-1,1].forEach(function(s){mesh(new T.CylinderGeometry(.004,.004,.14,4),std('#2a2a30'),s*.105,.14,.085,head).rotation.x=Math.PI/2})}

 // arms: upper (sleeve) + forearm (skin or sleeve) + hand with thumb
 var arms=[-1,1].map(function(s){var sh=new T.Group();sh.position.set(s*.262*W_,.625,0);torso.add(sh);var UA=[[.05,.07],[.0,.078],[-.08,.074],[-.17,.064],[-.28,.052]];mesh(new T.SphereGeometry(.074,16,12),o.jacket?std(o.jacket,{roughness:.85}):top,0,-.005,0,sh);mesh(loft(UA,22),o.jacket?std(o.jacket,{roughness:.85}):top,0,0,0,sh);mesh(new T.SphereGeometry(.05,12,10),o.long||o.jacket?(o.jacket?std(o.jacket):top):skin,0,-.285,0,sh);var el=new T.Group();el.position.y=-.27;sh.add(el);var fa=mesh(loft([[.02,.044],[-.05,.054],[-.14,.047],[-.27,.034]],20),o.long?top:(o.tat?std(o.skin,{map:tatTex(o.skin),roughness:.55}):skin),0,0,0,el);
  var hand=new T.Group();hand.position.y=-.27;el.add(hand);var pm=mesh(rbox(.074,.082,.04,.02,3),skin,0,-.04,0,hand);var th=mesh(capsule(.014,.036,8),skin,s*-.04,-.03,.018,hand);th.rotation.z=s*.3;th.rotation.x=-.3;var fg=mesh(capsule(.0145,.06,8),skin,0,-.098,.012,hand);fg.scale.set(2.5,1,1.2);fg.rotation.x=-.2;
  if(o.watch&&s===1)mesh(new T.TorusGeometry(.046,.01,6,14),std('#3a3a44',{metalness:.5}),0,-.2,0,el).rotation.x=Math.PI/2;
  return{sh:sh,el:el,hand:hand}});
 // legs
 var legs=[-1,1].map(function(s){var h=new T.Group();h.position.set(s*.095,-.02,0);hips.add(h);mesh(loft([[.04,.11],[-.1,.1],[-.26,.085],[-.47,.066]],24),bot,0,0,0,h);var kn=new T.Group();kn.position.y=-.47;h.add(kn);mesh(new T.SphereGeometry(.068,12,10),bot,0,0,0,kn);mesh(loft([[.0,.067],[-.1,.07],[-.24,.055],[-.43,.042]],22),bot,0,0,0,kn);
  var ft=new T.Group();ft.position.set(0,-.43,.05);kn.add(ft);mesh(rbox(.125,.065,.27,.03,3),shoe,0,.03,0,ft);mesh(rbox(.13,.03,.285,.012,2),sole,0,-.012,0,ft);mesh(rbox(.06,.03,.07,.012,2),shoe,0,.08,-.03,ft);mesh(rbox(.05,.012,.09,.005,2),std('#f4f1ff'),0,.065,.05,ft);
  return{h:h,kn:kn}});
 if(o.skirt){var sk3=mesh(new T.CylinderGeometry(.17,.31,.36,22,1,true),std(o.skirt,{side:T.DoubleSide,roughness:.9}),0,-.06,0,hips);for(var q=0;q<10;q++){var a2=q/10*6.28;mesh(rbox(.012,.34,.01,.004,2),std(new T.Color(o.skirt).multiplyScalar(.8).getStyle()),Math.cos(a2)*.25,-.06,Math.sin(a2)*.25,hips).rotation.y=-a2}}
 if(o.stripe){legs.forEach(function(l){mesh(rbox(.012,.62,.02,.004,2),std('#f4f1ff'),.07*(l===legs[0]?-1:1)*(-1),-.28,.0,l.h).position.x=(l===legs[0]?-1:1)*.078})}
 if(o.sc2){var sb=mesh(rbox(.34,.14,.01,.004,2),std(o.sc2[0],{roughness:.95,side:T.DoubleSide}),0,.0,0,torso);sb.visible=false;g.userData.scarfBand=sb}
 // contact shadow
 var cs=new T.Mesh(new T.CircleGeometry(.4,20),new T.MeshBasicMaterial({color:'#2a1a2a',transparent:true,opacity:.28,depthWrite:false}));cs.rotation.x=-Math.PI/2;cs.position.y=.012;cs.renderOrder=1;g.add(cs);
 g.scale.setScalar((o.s||1));g.userData={hips:hips,torso:torso,head:head,arms:arms,legs:legs,eyes:eyes,mouth:mouth,o:o,ph:rnd()*6,blink:2+rnd()*3};
 g.position.set(o.x,0,o.z);g.rotation.y=o.ry||0;world.add(g);anim.chars.push(g);return g}
function animChar(g,t,dt){var u=g.userData;if(u.human){animDoll(g,t,dt);PEOPLE.sync(g,t,dt);return}animDoll(g,t,dt)}
/* a person standing is never a statue: the weight sits on one leg and moves to the other every few seconds, the hips
   drop on the free side, the elbows keep a little bend and the hands hang loose; the head looks about. A walk carries
   its arms bent, the shoulders turn against the hips and the head stays level. */
/* a heavier body holds its arms a little off its sides — pressed in, the sleeve and the shirt read as one block */
function armOut(u){var h=u.human,w=h&&h.ph?Math.max(0,h.ph.w||0):0;return .06+w*.1}
function humanStand(u,T_,o){var ar=u.arms,lg=u.legs,cyc=Math.sin(T_*.23+u.ph*3),side=cyc>0?1:-1,k=Math.min(1,Math.abs(cyc)*2.2);
 var fl=side>0?1:0,st=1-fl;lg[fl].kn.rotation.x=.16*k;lg[fl].h.rotation.x=-.06*k;lg[fl].h.rotation.z=(fl?-1:1)*.05*k;lg[st].h.rotation.z=(st?1:-1)*.02*k;
 u.hips.position.x=(u.hips.userData.x0==null?(u.hips.userData.x0=u.hips.position.x):u.hips.userData.x0)+side*.022*k;u.hips.position.y=.95-.012*k;u.hips.rotation.z=-side*.045*k;u.torso.rotation.z=side*.04*k;
 for(var i=0;i<2;i++){var a=ar[i],sg=i?-1:1;a.sh.rotation.z=sg*(armOut(u)+Math.sin(T_*.9+i)*.012);a.el.rotation.x=-.2-Math.sin(T_*.7+i*1.3)*.04;a.hand&&(a.hand.rotation.z=sg*.12)}
 var lk=Math.sin(T_*.31+u.ph)*.28+Math.sin(T_*.11)*.12;u.head.rotation.y=lk+(o.look||0);u.head.rotation.x=.04+Math.sin(T_*.27)*.03;u.head.rotation.z=-side*.03*k}
/* talking, standing: the hands talk at the waist, not at the face. One hand leads for a few seconds and then the
   other; each phrase is a beat — the forearm lifts, the hand opens and turns up, it holds while the words come and
   settles — and between phrases the hands rest. The upper arm hardly leaves the body (a shoulder that lifts a hand to
   chest height on every word is a puppet, not a person). The weight still shifts underneath (humanStand). */
function humanTalk(u,T_,o){humanStand(u,T_,o);var ar=u.arms,ph=u.ph||0,lead=Math.sin(T_*.19+ph*2)>0?1:0,phr=Math.max(0,Math.sin(T_*.83+ph))*.75+.25;
 for(var i=0;i<2;i++){var a=ar[i],sg=i?-1:1,act=i===lead?1:.22,beat=Math.pow(Math.max(0,Math.sin(T_*2.05+i*1.9+ph)),2.2),g=act*beat*phr;
  a.sh.rotation.x=-.1-g*.25;a.el.rotation.x=-.45-g*.65;a.sh.rotation.z=sg*(armOut(u)+.01+g*.04);if(a.hand){a.hand.rotation.z=sg*(.12+g*.3);a.hand.rotation.y=sg*g*.2}}
 u.grip=.04;u.torso.rotation.x=.025+Math.sin(T_*.5)*.01;u.head.rotation.x=.02+Math.pow(Math.max(0,Math.sin(T_*2.05+ph)),3)*.07;u.head.rotation.y=(o.look||0)+Math.sin(T_*.6)*.12}
/* a walk says who walks: a woman's steps fall on one line, her hips tilt and her arms swing close; a man's shoulders
   counter-swing wider; a child bounces and swings big; an old man shortens everything and leans into it */
/* real motion first (people.js P.gait, CMU motion capture); the drawn cycle below is the fallback */
function humanGait(u,w,sv){var PP=window.PEOPLE;if(PP&&PP.mocap&&PP.gait&&!Q.has('nomocap')){PP.gait(u,w,sv,armOut(u));return}
 var ar=u.arms,lg=u.legs,hp=(u.human&&u.human.ph)||{},fem=!!hp.fem,age=hp.age||35,kid=age<13,old=age>68;
 if(old)sv*=.72;var swE=fem?.42:kid?.3:.35,shZ=fem?.045:kid?.1:.085,legIn=fem?.035:0;
 for(var i=0;i<2;i++){var a=ar[i],sg=i?-1:1;a.el.rotation.x=-.32-(fem?.06:0)-Math.max(0,(i?1:-1)*Math.sin(w))*swE*sv;a.sh.rotation.z=sg*shZ;lg[i].h.rotation.z=-sg*legIn}
 u.hips.rotation.y=Math.sin(w)*(fem?.07:.1)*sv;u.torso.rotation.y=-Math.sin(w)*(fem?.09:kid?.12:.16)*sv;u.hips.rotation.z=Math.cos(w)*(fem?.065:.03)*sv;u.torso.rotation.z=-Math.cos(w)*(fem?.035:.02)*sv;u.head.rotation.y-=u.torso.rotation.y*.6;u.head.rotation.x=old?.12:.03;if(old)u.torso.rotation.x=.07;
 if(u.hips.userData.x0!=null)u.hips.position.x=u.hips.userData.x0}
function animDoll(g,t,dt){var u=g.userData,o=u.o,m=o.mode||'idle',ph=u.ph;var T_=t+ph;
 u.torso.scale.y=1+Math.sin(T_*1.7)*.012;
 /* every frame starts from a still head and an upright torso: the walk cycle and the expressions ADD to these (-=, +=), and a mode that does not set them (a walker, a sitter) used to carry last frame's turn into this one — the head kept turning until it spun */
 u.head.rotation.set(0,0,0);if(m!=='sit'&&m!=='sittalk')u.torso.rotation.set(0,0,0);
 var ar=u.arms,lg=u.legs;
 if(u.human){u.grip=null;ar.forEach(function(a){a.hand&&a.hand.rotation.set(0,0,0)})}if(u.human&&m!=='ctrl'){u.hips.rotation.z=0;u.torso.rotation.z=0;lg[0].h.rotation.z=lg[1].h.rotation.z=0;if(m!=='sit')u.torso.rotation.x=0}
 if(m==='walk'){var sp=o.spd||1.1;o._d=(o._d||0)+dt*sp;var w=T_*5.2*sp/1.1;lg[0].h.rotation.x=Math.sin(w)*.55;lg[1].h.rotation.x=-Math.sin(w)*.55;lg[0].kn.rotation.x=Math.max(0,-Math.sin(w+.6))*.9;lg[1].kn.rotation.x=Math.max(0,Math.sin(w+.6))*.9;ar[0].sh.rotation.x=-Math.sin(w)*.5;ar[1].sh.rotation.x=Math.sin(w)*.5;u.hips.position.y=.95+Math.abs(Math.sin(w))*.035;u.torso.rotation.y=Math.sin(w)*.08;
  var A=o.path,L=o._len||(o._len=Math.hypot(A[1][0]-A[0][0],A[1][1]-A[0][1])),k=(o._d%(L*2));var f=k<L?k/L:2-k/L;g.position.x=A[0][0]+(A[1][0]-A[0][0])*f;g.position.z=A[0][1]+(A[1][1]-A[0][1])*f;var dir=k<L?1:-1;g.rotation.y=Math.atan2((A[1][0]-A[0][0])*dir,(A[1][1]-A[0][1])*dir);if(u.human)humanGait(u,w,1)}
 else if(m==='ctrl'){var sv=o.sv||0,w2=o.sw||0;if(sv>.02){lg[0].h.rotation.x=Math.sin(w2)*.58*sv;lg[1].h.rotation.x=-Math.sin(w2)*.58*sv;lg[0].kn.rotation.x=Math.max(0,-Math.sin(w2+.6))*.9*sv;lg[1].kn.rotation.x=Math.max(0,Math.sin(w2+.6))*.9*sv;ar[0].sh.rotation.x=-Math.sin(w2)*.5*sv;ar[1].sh.rotation.x=Math.sin(w2)*.5*sv;u.hips.position.y=.95+Math.abs(Math.sin(w2))*.035*sv;u.torso.rotation.y=Math.sin(w2)*.08*sv;u.head.rotation.y=o.look||0;u.mouth.scale.y=1;if(u.human)humanGait(u,w2,sv)}else{lg[0].h.rotation.x=lg[1].h.rotation.x=lg[0].kn.rotation.x=lg[1].kn.rotation.x=0;u.hips.position.y=.95;u.torso.rotation.y=0;ar[0].sh.rotation.x=Math.sin(T_*1.2)*.04;ar[1].sh.rotation.x=-Math.sin(T_*1.2)*.04;u.head.rotation.y=Math.sin(T_*.4)*.2+(o.look||0);u.mouth.scale.y=1;if(u.human)humanStand(u,T_,o)}}
 else if(m==='talk'&&u.human){humanTalk(u,T_,o);u.mouth.scale.y=.5+Math.abs(Math.sin(T_*9))*1.3}
 else if(m==='talk'){ar[0].sh.rotation.x=-.2+Math.sin(T_*2.3)*.1;var gx=Math.max(0,Math.sin(T_*1.1));ar[1].sh.rotation.x=-.6-gx*.9;ar[1].el.rotation.x=-.8-gx*.5;ar[1].sh.rotation.z=-.15;u.head.rotation.x=Math.sin(T_*2.4)*.05;u.head.rotation.y=Math.sin(T_*.7)*.18+(o.look||0);u.mouth.scale.y=.5+Math.abs(Math.sin(T_*9))*1.3;u.torso.rotation.y=Math.sin(T_*.6)*.08}
 else if(m==='listen'){if(u.human)humanStand(u,T_,o);else{ar[0].sh.rotation.x=-.1;ar[1].sh.rotation.x=-.1}u.head.rotation.y=(o.look||0)+Math.sin(T_*.5)*.05;u.head.rotation.x=Math.max(0,Math.sin(T_*1.1))*.12;u.mouth.scale.y=1}
 else if(m==='cheer'){var c=Math.sin(T_*6),vz=u.human?-.38:.25;ar[0].sh.rotation.x=-2.6+c*.3;ar[1].sh.rotation.x=-2.6-c*.3;ar[0].sh.rotation.z=vz;ar[1].sh.rotation.z=-vz;u.hips.position.y=.95+Math.abs(c)*.07;u.mouth.scale.y=2.2;u.head.rotation.x=-.12}
 else if(m==='cross'){ar[0].sh.rotation.x=-.9;ar[1].sh.rotation.x=-.9;ar[0].el.rotation.x=-1.6;ar[1].el.rotation.x=-1.6;ar[0].sh.rotation.z=-.5;ar[1].sh.rotation.z=.5;u.head.rotation.y=(o.look||0)+Math.sin(T_*.35)*.15;u.head.rotation.x=-.05}
 else if(m==='flare'){var fz=Math.sin(T_*1.4)*.12;ar[1].sh.rotation.x=-2.7+fz;ar[1].sh.rotation.z=-.3;ar[0].sh.rotation.x=-.3;u.head.rotation.x=-.25;u.head.rotation.y=Math.sin(T_*.5)*.2;u.mouth.scale.y=2;u.hips.position.y=.95+Math.max(0,Math.sin(T_*3))*.02}
 else if(m==='sing'){var c2=Math.sin(T_*4);ar[0].sh.rotation.x=-2.5+c2*.15;ar[1].sh.rotation.x=-2.5-c2*.15;ar[0].sh.rotation.z=.35;ar[1].sh.rotation.z=-.35;u.torso.rotation.z=Math.sin(T_*2)*.06;u.head.rotation.x=-.3;u.mouth.scale.y=2.4;u.hips.position.y=.95+Math.abs(Math.sin(T_*2))*.03}
 else if(m==='lean'){u.torso.rotation.z=.08;ar[0].sh.rotation.x=-.2;ar[1].sh.rotation.x=-.5;ar[1].el.rotation.x=-1.4;u.head.rotation.y=(o.look||0);u.head.rotation.x=.05;lg[0].h.rotation.z=.15}
 else if(m==='sit'){lg[0].h.rotation.x=lg[1].h.rotation.x=-1.5;lg[0].kn.rotation.x=lg[1].kn.rotation.x=1.5;u.hips.position.y=.55;/* a child sits on the same bench as a grown-up: the seat keeps its height and his feet hang */if(u.o&&u.o.s&&u.o.s<.95)u.hips.position.y=.55/u.o.s;/* seated, the hands rest on the thighs (they used to hover in front of the chest, as if praying) *//* elbows by the body, forearms along the thighs, the hands resting where the thighs end — the way a person sits for an interview */ar[0].sh.rotation.x=ar[1].sh.rotation.x=-.3+Math.sin(T_*.4)*.015;ar[0].el.rotation.x=ar[1].el.rotation.x=-1.02;ar[0].sh.rotation.z=.05;ar[1].sh.rotation.z=-.05;u.head.rotation.x=.12+Math.sin(T_*.6)*.04;u.head.rotation.y=Math.sin(T_*.3)*.1;
  if(u.human){lg[0].h.rotation.z=.09;lg[1].h.rotation.z=-.09;lg[0].kn.rotation.x=1.42;lg[1].kn.rotation.x=1.58;u.torso.rotation.x=-.05;ar[0].sh.rotation.x=-.38;ar[1].sh.rotation.x=-.34;ar[0].el.rotation.x=-.55;ar[1].el.rotation.x=-.62;/* the thighs part a little, so the hands rest ON them, palms down — not hanging between the knees */ar[0].sh.rotation.z=.1;ar[1].sh.rotation.z=-.1;if(ar[0].hand){ar[0].hand.rotation.y=1.1;ar[1].hand.rotation.y=-1.1}u.grip=.35;u.head.rotation.x=.12+Math.sin(T_*.6)*.03;u.head.rotation.y=Math.sin(T_*.25+u.ph)*.25}}
 else if(m==='sittalk'){u.o.mode='sit';animDoll(g,t,0);u.o.mode='sittalk';/* seated, a talking hand lifts off the thigh and settles again — it never travels up to the face */var gx2=Math.max(0,Math.sin(T_*1.3));if(u.human){ar[1].sh.rotation.x=-.34-gx2*.1;ar[1].el.rotation.x=-.62-gx2*.4;if(ar[1].hand){ar[1].hand.rotation.y=-1.1+gx2*.9;ar[1].hand.rotation.z=-gx2*.3}}else{ar[1].sh.rotation.x=-.3-gx2*.08;ar[1].el.rotation.x=-1.02-gx2*.22;ar[1].sh.rotation.z=-.05}u.mouth.scale.y=.5+Math.abs(Math.sin(T_*9))*1.3;u.head.rotation.y=Math.sin(T_*.7)*.14}
 else if(m==='arrange'){var b=Math.sin(T_*1.4);ar[0].sh.rotation.x=-.9+b*.2;ar[1].sh.rotation.x=-1.1-b*.2;ar[0].el.rotation.x=-.6;ar[1].el.rotation.x=-.6;u.torso.rotation.x=.35;u.head.rotation.x=.2;u.head.rotation.y=Math.sin(T_*.7)*.3}
 else {ar[0].sh.rotation.z=.1;ar[1].sh.rotation.z=-.1;ar[0].el.rotation.x=ar[1].el.rotation.x=-.28;ar[0].sh.rotation.x=Math.sin(T_*1.2)*.04;ar[1].sh.rotation.x=-Math.sin(T_*1.2)*.04;u.head.rotation.y=Math.sin(T_*.4)*.25+(o.look||0);u.mouth.scale.y=1}
 u.blink-=dt;if(u.blink<0){u.blink=2+rnd()*4;u._bl=.12}if(u._bl>0){u._bl-=dt;u.eyes.forEach(function(e){e.e.scale.y=.1})}else u.eyes.forEach(function(e){e.e.scale.y=1})}



/* ================= room manager ================= */
var U=.27,extras=[],conv=new WeakSet(),TT=0,cur=null;
var RM={defs:{},def:function(id,o){RM.defs[id]=o},ids:function(){return Object.keys(RM.defs)}};
function L3(h){var c=new T.Color(h);c.convertSRGBToLinear();return c}
/* ---- the sun (31.10.2026, the GTA round): every room gets ONE real shadow-casting key light, fitted to the room ----
   Until now only the club rooms asked for shadows; a home, a street and a stand were lit without a single cast shadow,
   and that — more than any grade — is what made them read as a diorama. The strongest directional light in the room
   becomes the sun: its shadow camera is fitted to what the room actually built (never a guessed 8 m square), the map
   is sized by quality, and the bias is small because PCFSoft at this fit does not acne. */
function shadowsOn(l,ext,fit){l.castShadow=true;var big=fit&&fit.big;var ms=QL==='high'?2048:QL==='med'?(big?2048:1536):1024;l.shadow.mapSize.set(ms,ms);var s=l.shadow.camera;ext=ext||8;s.left=-ext;s.right=ext;s.top=ext;s.bottom=-ext;s.near=.5;s.far=fit&&fit.far||60;l.shadow.bias=-.00018;l.shadow.normalBias=ext>14?.07:.045;if(l.shadow.map){l.shadow.map.dispose();l.shadow.map=null}s.updateProjectionMatrix()}
function sunUp(S,inside,camK){if(QL==='low')return null;var dirs=[];S.traverse(function(o){if(o.isDirectionalLight&&o.userData.lc)dirs.push(o)});if(!dirs.length)return null;
 var lum=function(l){return l.intensity*(l.color.r*.3+l.color.g*.59+l.color.b*.11)};dirs.sort(function(a,b){return lum(b)-lum(a)});
 var sun=dirs.find(function(l){return l.castShadow})||dirs[0];
 var bb=new T.Box3();world.updateMatrixWorld(true);S.traverse(function(o){if(!o.isMesh||o.isSprite||!o.visible||o.isInstancedMesh&&o.count>40)return;var m=o.material;if(Array.isArray(m))m=m[0];if(!m||m.isShaderMaterial||m.transparent&&m.opacity<.5)return;var b=new T.Box3().setFromObject(o);var sz=new T.Vector3();b.getSize(sz);if(Math.max(sz.x,sz.y,sz.z)>120)return;bb.union(b)});
 if(bb.isEmpty())return null;var c=new T.Vector3(),sz=new T.Vector3();bb.getCenter(c);bb.getSize(sz);
 /* the frame is what he will look at: the camera's target, not the far end of a 60 m street */
 /* a room that fitted its own shadow keeps its fit; it only gets the better map and bias */
 if(sun.castShadow){var ms0=sun.shadow.mapSize.x;shadowsOn(sun,sun.shadow.camera.right,{big:!inside&&ms0>=1024,far:sun.shadow.camera.far});sun.userData.sun=1;return sun}
 var K=camK;if(K){c.x=K.l[0];c.z=K.l[2];sz.x=Math.min(sz.x,inside?16:38);sz.z=Math.min(sz.z,inside?12:30)}
 var ext=Math.max(5,Math.min(inside?10:22,Math.max(sz.x,sz.z)*.55));
 var d=sun.position.clone().sub(sun.target.position);if(d.lengthSq()<1e-4)d.set(-1,2,1);d.normalize();/* outdoors the sun rakes from the side rather than from over the lens: a shadow he can see is most of what makes a street a place */if(!inside&&d.z>0){d.z*=.35;if(Math.abs(d.x)<.3)d.x=d.x<0?-.5:.5;d.normalize()}var dist=Math.max(18,ext*2.2);
 sun.target.position.copy(c);if(!sun.target.parent)addX(sun.target);sun.position.copy(c).addScaledVector(d,dist);
 shadowsOn(sun,ext,{big:!inside,far:dist+ext*2.4});
 sun.userData.sun=1;return sun}
/* indoors the brightest lamp throws a shadow too (one cube map a room, high quality only: six passes of a room a frame
   is not a phone's budget) */
function lampShadow(S){if(QL!=='high')return;var best=null,bl=0;S.traverse(function(o){if(!o.isPointLight||!o.userData.lc||o.castShadow)return;var l=o.intensity*(o.color.r*.3+o.color.g*.59+o.color.b*.11);if(l>bl){bl=l;best=o}});if(!best)return;best.castShadow=true;best.shadow.mapSize.set(512,512);best.shadow.bias=-.002;best.shadow.normalBias=.04;best.shadow.camera.near=.15;best.shadow.camera.far=best.distance||12}
function addX(o,par){(par||sc).add(o);extras.push(o);return o}
function clearRoom(){window.__doors=[];window.__props=[];while(world.children.length){var o=world.children[0];world.remove(o)}extras.forEach(function(o){if(o.parent)o.parent.remove(o)});extras=[];anim.sway=[];anim.glow=[];anim.chars=[];anim.flares=[];anim.flags=[];anim.cars=[];anim.smoke=[];anim.tick=[];sc.fog=null;sc.background=new T.Color('#080c22').convertSRGBToLinear()}
function skyDome(kind){var P={night:['#050914','#141a3a','#3a2650'],dusk:['#0c1230','#3a2a5e','#c4603a'],day:['#4a8ad8','#8ec0ec','#f4e6d0'],indoor:['#0a0a10','#0a0a10','#0a0a10'],overcast:['#6a7080','#9aa0ac','#c8c8c8']}[kind||'night'];
 /* 31.10.2026: a sky has a sun in it (a warm disc and its haze, low and red at dusk), a horizon band of air, and at night
    a scatter of stars — the three things that make a gradient read as weather */
 var SUN={day:[-.35,.42,-.6,1.0,'#fff2dc'],dusk:[-.7,.08,-.5,1.4,'#ff9a5a'],night:[0,-1,0,0,'#000'],indoor:[0,-1,0,0,'#000'],overcast:[-.3,.5,-.6,.18,'#ffffff']}[kind||'night'];
 var d=new T.Mesh(new T.SphereGeometry(90,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:L3(P[0])},mid:{value:L3(P[1])},hor:{value:L3(P[2])},sd:{value:new T.Vector3(SUN[0],SUN[1],SUN[2]).normalize()},sk:{value:SUN[3]},scl:{value:L3(SUN[4])},st:{value:kind==='night'?1:0}},vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 top,mid,hor,sd,scl;uniform float sk,st;float h1(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}void main(){float y=clamp(p.y,0.,1.);vec3 c=mix(hor,mid,smoothstep(0.,.25,y));c=mix(c,top,smoothstep(.2,.8,y));float a=max(dot(normalize(p),sd),0.);c+=scl*(pow(a,900.)*2.2+pow(a,24.)*.5+pow(a,4.)*.16)*sk;c=mix(c,hor*1.06,smoothstep(.18,0.,y)*.55);if(st>0.){vec3 q=floor(normalize(p)*140.);float r=h1(q);float s=step(.995,r)*smoothstep(.02,.2,y)*(.5+.5*h1(q+1.));c+=vec3(s*.9);}gl_FragColor=vec4(c,1.);}'}));d.position.y=0;addX(d);return d}
function mkctx(def,geo,o){var g=new T.Group();g.scale.setScalar(U);world.add(g);
 var c={T:T,Q:Q,g:g,world:world,geo:geo,o:o||{},U:U,skin:(o&&o.skinSet)||{name:(o&&o.club)||'FC',c1:'#d8283e',c2:'#f4f1ff',c3:'#14141c'},
  std:std,mesh:mesh,rbox:rbox,capsule:capsule,loft:loft,cvs:cvs,tex:tex,paint:paint,wall:wall,brick:brick,planks:planks,cobble:cobble,stripes:stripes,sign:sign,chalk:chalk,rrect:rrect,rnd:rnd,rr:rr,glowTex:glowTex,weather:weather,
  concrete:concrete,asphalt:asphalt,rollerShutter:rollerShutter,lamp:lamp,car:car,banner:banner,dumpster:dumpster,flare:flare,SK:SK,anim:anim,
  m:function(v){return v*U},
  /** metre position of a room-unit point */
  P:function(x,z){return[x*U,z*U]},
  slot:function(n){return geo&&geo.slots&&geo.slots[n]},
  spot:function(n){return geo&&geo.spots&&geo.spots[n]},
  person:function(po,slot){var s=typeof slot==='string'?(geo.slots[slot]):slot;if(s){po.x=s.x*U;po.z=s.z*U;po.ry=po.ry!==undefined?po.ry:(s.yaw||0)}if(!po.skin)po.skin=SK[Math.floor(rnd()*5)];var ch=makeChar(po);ch.scale.multiplyScalar(1.0);if(cur&&cur.decor)cur.decor.push(ch);return ch},
  light:function(type,col,int,x,y,z,dist,decay){var l;if(type==='point'){l=new T.PointLight(col,int,dist||12,decay||1.8);l.position.set(x,y,z)}else if(type==='dir'){l=new T.DirectionalLight(col,int);l.position.set(x,y,z)}else if(type==='hemi'){l=new T.HemisphereLight(col,dist||'#202030',int)}else if(type==='spot'){l=new T.SpotLight(col,int,dist||14,.7,.5,1.6);l.position.set(x,y,z)}
   l.userData.lc=1;l.color.convertSRGBToLinear();if(l.groundColor)l.groundColor.convertSRGBToLinear();addX(l);return l},
  shadows:function(l,ext){shadowsOn(l,ext)},
  fog:function(h,n,f){sc.fog=new T.Fog(h,n,f);sc.fog.color.convertSRGBToLinear()},
  sky:skyDome,add:addX,
  tick:function(fn){anim.tick.push(fn)},
  cam:null,setCam:function(px,py,pz,lx,ly,lz,fov,fovP){c.cam={p:[px,py,pz],l:[lx,ly,lz],fov:fov||38,fovP:fovP||fov||52}},
  /** the standard indoor shell: floor, back wall, left wall, optional right wall; room units */
  shell:function(o){o=o||{};var W=24,D=14,H=o.h||(PLAYMODE?20:9),w0=geo&&geo.walk?geo.walk:[.5,1,23.5,12.5];
   var fl=mesh(new T.BoxGeometry(W+1,.6,D+11),std('#fff',{map:o.floorMap||planks(4),roughness:.7}),W/2,-.3,D/2+5,g);fl.castShadow=false;if(fl.material.map){fl.material.emissiveMap=fl.material.map;fl.material.emissive=new T.Color(.22,.2,.19)}
   var bw=mesh(new T.BoxGeometry(W+1,H,.6),std('#fff',{map:o.wallMap||wall(o.wall||'#e8dcc8',['#d8c8b0','#f0e6d4','#cdbba0'],3,1.5),roughness:.95}),W/2,H/2,-.3,g);
   var lw=mesh(new T.BoxGeometry(.6,H,D+.6),std('#fff',{map:o.wallMap||wall(o.wall2||o.wall||'#e8dcc8',['#d8c8b0','#f0e6d4','#cdbba0'],3,1.5),roughness:.95}),-.3,H/2,D/2,g);
   if(o.right){var rw=mesh(new T.BoxGeometry(.6,H,D+.6),std('#fff',{map:o.wallMap||wall(o.wall2||o.wall||'#e8dcc8',['#d8c8b0','#f0e6d4','#cdbba0'],3,1.5),roughness:.95}),W+.3,H/2,D/2,g)}
   var sk=mesh(rbox(W+1,.5,.4,.05,2),std(o.skirt||'#f4f1ff',{roughness:.7}),W/2,.25,.2,g);return{fl:fl,bw:bw,lw:lw}},
 };
 return c}
/* the documentary look: light comes from lamps and windows, not from the objects themselves. Printed signs are
   printed, a window is a window, a street lamp is a lamp — no halos, no additive cones, no neon. */
var SOBER=Q.get('look')!=='old';var LAMP_K={in:5.5,out:9};
/* 31.10.2026 — the GTA round: the documentary rule stands (light comes from lamps, windows and the sun; a sign is
   printed), but the frame now has a KEY and a FILL, not an even wash. The sun is pushed up, the sky fill down, a lamp
   keeps its own glow so the bloom pass can catch it, and a shaft of window light is allowed to be seen. Colours are no
   longer crushed towards grey: the grade below does the contrast; the materials keep their pigment. */
function sober(S,inside){var NW=new T.Color(1,.94,.86);S.traverse(function(o){if(o.isLight){if(o.color)o.color.lerp(NW,.3);if(o.groundColor)o.groundColor.lerp(new T.Color(.16,.15,.16),.4);if(o.isHemisphereLight)o.intensity*=inside?.42:.4;else if(o.isDirectionalLight)o.intensity*=inside?1.25:1.4;else if(o.isAmbientLight)o.intensity*=.45;else if(o.isPointLight||o.isSpotLight){/* three r128's point light is not inverse-square: at `distance` 12 a lamp of 2.5 still gives 1.7 three metres away, so five lamps were a flat white wash over a whole flat. A lamp is a POOL: a short reach, a steep fall, and the dark between the pools is what makes the lit part read as light. */o.intensity*=(inside?LAMP_K.in:LAMP_K.out)*(o.isSpotLight?1.6:1);if(o.distance&&o.distance>0){o.distance=Math.max(o.distance,inside?9:14)}o.decay=2}}
  if(o.isMesh&&o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(mm){if(!mm.isMeshStandardMaterial&&!mm.isMeshLambertMaterial&&!mm.isMeshPhongMaterial||mm.__al||mm.skinning||mm.blending===T.AdditiveBlending)return;mm.__al=1;var cc=mm.color,mx=Math.max(cc.r,cc.g,cc.b);if(mm.map)cc.multiplyScalar(inside?.82:.9);else if(mx>.66)cc.multiplyScalar(.66/mx);})});
 S.traverse(function(o){var ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(function(m){if(!m||m.__sb)return;m.__sb=1;
  if(o.isSprite&&m.map&&m.map===glowTex.t&&m.blending!==T.AdditiveBlending){m.opacity*=.45;return}if(m.blending===T.AdditiveBlending){m.opacity*=(o.isSprite?.34:.46);if(o.isSprite)o.scale.multiplyScalar(.8);return}
  if(m.emissive&&m.emissiveIntensity>0){var lum=m.emissive.r+m.emissive.g+m.emissive.b;if(m.emissiveMap&&m.emissiveMap===m.map){m.emissiveIntensity=Math.min(m.emissiveIntensity,inside?.16:.22)}else if(m.map&&lum>.05){m.emissiveIntensity=Math.min(m.emissiveIntensity*.45,.34)}else{m.emissiveIntensity=Math.min(m.emissiveIntensity*.85,1.1)}}
 })});if(inside)S.fog=null;else if(S.fog&&S.fog.isFog){var fc=S.fog.color,l=(fc.r+fc.g+fc.b)/3;fc.lerp(new T.Color(l,l,l),.35);S.fog.near*=1.2;S.fog.far*=1.3}}
RM.load=function(id,opts){opts=opts||{};PLAYMODE=!!opts.play&&({home:1,hall:1,school:1,work:1,'club-room':1})[(RM.defs[id]||{}).kind]===1;var def=RM.defs[id];if(!def)throw new Error('no room '+id);clearRoom();cur={id:id,def:def,decor:[]};
 var geo=(window.ROOMGEO&&window.ROOMGEO[def.geo||id])||null;var c=mkctx(def,geo,opts);
 sc.background=new T.Color('#080c22').convertSRGBToLinear();
 window.__CK=clubKit(c.skin);
 def.build(c);
 if(window.ARTEFACTS)window.ARTEFACTS.place(c,id,opts.made||[]);if(window.CULTURE)window.CULTURE.place(c,id);
 /* no flicker (owner, 23.10.2026: the living-room floor shimmered, the stand crawled with black squares): a thing that lies
    flat on a surface — a rug, a sun patch, chalk, a decal — casts no shadow onto what it lies on, and the crowd's thousand
    bobbing people cast none either: each was a texel-sized shadow that changed every frame */
 (function(){var bb=new T.Box3(),sz=new T.Vector3();sc.updateMatrixWorld(true);sc.traverse(function(o){if(!o.isMesh||!o.castShadow)return;if(o.isInstancedMesh&&o.count>40){o.castShadow=false;o.receiveShadow=false;return}if(o.isSkinnedMesh||!o.geometry)return;bb.setFromObject(o);bb.getSize(sz);if(sz.y<.08&&Math.max(sz.x,sz.z)>.3)o.castShadow=false;var m=o.material;if(m&&!Array.isArray(m)&&m.transparent&&m.opacity<.5)o.castShadow=false})})();
 sc.traverse(function(o){var ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(function(m){if(conv.has(m))return;conv.add(m);if(m.isShaderMaterial)return;if(m.color)m.color.convertSRGBToLinear();if(m.emissive)m.emissive.convertSRGBToLinear()})});
 var inside=({home:1,hall:1,school:1,work:1,'club-room':1})[def.kind]===1;sc.environment=QL==='low'?null:envFor(inside?'in':'out');/* 31.10.2026: the environment map is the one light that never dimmed — a photographed room at a third of its brightness lit every wall evenly, day and night, and that even wash is what blew the frame out. It now follows the hour and stays a fill, never the key. */var nightE=opts.time==='night',duskE=opts.mood==='dusk',rainE=opts.weather==='rain'||opts.mood==='rain';var EI=SOBER?(nightE?(inside?.05:.06):duskE?(inside?.12:.13):rainE?(inside?.14:.16):(inside?.16:.2)):(inside?.42:.32);sc.traverse(function(o){var ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(function(m){if(m.isMeshStandardMaterial&&m.envMapIntensity===1)m.envMapIntensity=EI;if(QL!=='low'&&!Q.get('nowx'))weatherMat(m,o,inside)})});window.__EI=EI;if(SOBER)sober(sc,inside);post.exposure(SOBER?(inside?.86:.86):(inside?.84:.92));if(inside&&QL!=='low')sc.traverse(function(o){if(o.isHemisphereLight)o.intensity*=.72});
 window.__sun=sunUp(sc,inside,c.cam||{p:[12*U,3.4,9.2],l:[12*U,1.2,1.2],fov:38,fovP:56});if(inside)lampShadow(sc);
 atmos(sc,inside,opts);
 cur.cam=c.cam||{p:[12*U,3.4,9.2],l:[12*U,1.2,1.2],fov:38,fovP:56};size();return c};
/* ---- the weather and the hour the scene contract asks for (owner's list, item 1) ----
   rain: a grey low sky, a wet street that takes the light, puddles that hold it, falling rain; dusk: a low warm sun;
   a room at night is lit by its own lamps and window, not by a sky it cannot see. Colours here are warm reds and
   blue-greys only — the post pass still removes any band the club may not wear. Its random stream is its own. */
function atmos(S,inside,o){o=o||{};var rain=o.weather==='rain'||o.mood==='rain'||Q.get('weather')==='rain',dusk=o.mood==='dusk'||Q.get('mood')==='dusk',night=o.time==='night';
 var seed=0;String(cur&&cur.id||'').split('').forEach(function(ch){seed=(seed*31+ch.charCodeAt(0))>>>0});var R=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 if(inside){if(night){S.traverse(function(l){if(!l.isLight)return;if(l.isHemisphereLight||l.isAmbientLight){l.intensity*=.26;l.color.lerp(new T.Color(.45,.5,.8),.5)}else if(l.isDirectionalLight){l.intensity*=.16;l.color.lerp(new T.Color(.5,.6,1),.6)}else if(l.isPointLight||l.isSpotLight)l.intensity*=1.35});/* a room at night is its lamps: the pools are warm, the corners are dark, the window is blue */post.exposure(.8)}
  if(rain)S.traverse(function(l){if(l.isDirectionalLight){l.intensity*=.7;l.color.lerp(new T.Color(.78,.84,.95),.4)}});return}
 /* aerial perspective (31.10.2026): a street has air in it — the far end of the road is paler and bluer than the kerb he
    stands on, by the hour. Rooms that set their own fog keep it. */
 if(!S.fog){var H=night?['#0b1020',12,78]:dusk?['#c08a7c',16,84]:['#c2d0dc',22,100];S.fog=new T.Fog(new T.Color(H[0]).convertSRGBToLinear(),H[1],H[2])}
 if(night&&!rain){S.traverse(function(l){if(l.isDirectionalLight){l.intensity*=.55;l.color.lerp(new T.Color(.6,.68,.95),.5)}else if(l.isHemisphereLight){l.intensity*=.8;l.color.lerp(new T.Color(.4,.46,.7),.5)}else if(l.isPointLight||l.isSpotLight)l.intensity*=1.4});post.exposure(.84)}
 else if(dusk&&!rain)post.exposure(.9);
 function sky(c0,c1){S.children.forEach(function(o){if(o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.radius===90&&o.material.isShaderMaterial)o.visible=false});var cv=cvs(4,256),g=cv.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(0,0,4,256);var tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;S.background=tx}
 if(rain)sky(night?'#151a24':'#5d6670',night?'#0b0e14':'#8b939c');else if(dusk&&!night)sky('#4a4a78','#c87a6e');
 if(dusk&&!rain&&!night)S.traverse(function(l){if(l.isDirectionalLight){l.intensity*=.72;l.color.lerp(new T.Color(1,.52,.42),.75)}else if(l.isHemisphereLight){l.intensity*=.8;l.color.lerp(new T.Color(.86,.6,.66),.45);if(l.groundColor)l.groundColor.lerp(new T.Color(.25,.18,.24),.4)}});
 if(!rain)return;
 S.traverse(function(l){if(l.isDirectionalLight){l.intensity*=.34;l.color.lerp(new T.Color(.8,.86,.95),.6)}else if(l.isHemisphereLight){l.intensity*=.7;l.color.lerp(new T.Color(.62,.68,.78),.6)}else if(l.isPointLight||l.isSpotLight)l.intensity*=1.25});
 if(S.fog&&S.fog.isFog){S.fog.color.lerp(new T.Color(.42,.46,.52),.7);S.fog.near*=.55;S.fog.far*=.6}
 /* the ground is wet: what lies flat and low darkens and takes the light */
 var box=new T.Box3(),sz=new T.Vector3(),gx0=1e9,gx1=-1e9,gz0=1e9,gz1=-1e9,done=new Set();
 world.updateMatrixWorld(true);
 S.traverse(function(o){if(!o.isMesh||!o.material||o.isSkinnedMesh)return;box.setFromObject(o);box.getSize(sz);if(sz.y>.12||box.max.y>.3||box.min.y<-.4||Math.max(sz.x,sz.z)<.8)return;
  gx0=Math.min(gx0,box.min.x);gx1=Math.max(gx1,box.max.x);gz0=Math.min(gz0,box.min.z);gz1=Math.max(gz1,box.max.z);
  (Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){if(!m.isMeshStandardMaterial||done.has(m))return;done.add(m);m.roughness=Math.max(.12,m.roughness*.4);m.color.multiplyScalar(.72);m.envMapIntensity=Math.max(m.envMapIntensity||0,.9);m.needsUpdate=true})});
 window.__atmos={rain:true,wet:done.size,ground:[gx0,gx1,gz0,gz1]};post.exposure((SOBER?.86:.92)*.86);
 if(gx1>gx0){var pm=new T.MeshStandardMaterial({color:new T.Color(.06,.07,.09),roughness:.04,metalness:.1,envMapIntensity:1.6,transparent:true,opacity:.82,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  /* the puddles lie where he will see them: in front of the camera, on whatever surface is really there */
  var CK=cur&&cur.cam,lx=CK?CK.l[0]:(gx0+gx1)/2,lz=CK?CK.l[2]:(gz0+gz1)/2,rc=new T.Raycaster(),dn=new T.Vector3(0,-1,0),solid=[];S.traverse(function(o){if(o.isMesh&&!o.isSkinnedMesh&&o.material&&!o.material.transparent)solid.push(o)});
  var n=9+Math.floor(R()*6),made=0;for(var i=0;i<n*3&&made<n;i++){var px=lx+(R()-.5)*8,pz=lz-.6+R()*3.6;rc.set(new T.Vector3(px,3,pz),dn);var hit=rc.intersectObjects(solid,false)[0];if(!hit||hit.point.y>.35||!hit.face||Math.abs(hit.face.normal.y)<.5)continue;
   var r=.1+R()*.3,pg=new T.CircleGeometry(1,22);pg.rotateX(-Math.PI/2);var pd=new T.Mesh(pg,pm);pd.scale.set(r*(1+R()),1,r);pd.rotation.y=R()*Math.PI;pd.position.set(px,hit.point.y+.004,pz);pd.renderOrder=2;world.add(pd);extras.push(pd);made++}
  window.__atmos.puddles=made}
 /* the rain itself: short streaks falling past the camera, wrapped in a box around what it looks at */
 if(QL!=='low'){var N=QL==='high'?1400:800,pos=new Float32Array(N*6),sp=new Float32Array(N),W=9,H=5,D=7;for(var k=0;k<N;k++){var x=(R()-.5)*W,y=R()*H,z=(R()-.5)*D,l=.16+R()*.12;pos.set([x,y,z,x+.02,y-l,z],k*6);sp[k]=7+R()*3}
  var rg=new T.BufferGeometry();rg.setAttribute('position',new T.BufferAttribute(pos,3));var rl=new T.LineSegments(rg,new T.LineBasicMaterial({color:new T.Color(.72,.78,.86),transparent:true,opacity:.42,depthWrite:false}));rl.frustumCulled=false;world.add(rl);extras.push(rl);
  anim.tick.push(function(t,dt){var K=cur&&cur.cam;if(K)rl.position.set(K.l[0]+(VW.fx||0),0,K.l[2]+1.5);var a=rg.attributes.position.array;for(var k=0;k<N;k++){var d=sp[k]*dt,o=k*6;a[o+1]-=d;a[o+4]-=d;if(a[o+4]<0){var l2=a[o+1]-a[o+4];a[o+1]=H;a[o+4]=H-l2}}rg.attributes.position.needsUpdate=true})}
}
var VW={top:.8,bottom:-.4,fx:0,zoom:1,fov:null,on:false},CC=null;
function applyCC(){var W=innerWidth,H=innerHeight;cam.aspect=W/H;cam.fov=CC.fov||32;cam.position.set(CC.p[0],CC.p[1],CC.p[2]);cam.lookAt(CC.l[0],CC.l[1],CC.l[2]);cam.clearViewOffset();cam.updateProjectionMatrix()}
function size(){var W=innerWidth,H=innerHeight;ren.setSize(W,H,false);if(CC){applyCC();return}var sx=VW.on?(VW.top-VW.bottom)/2:1,a=W/(H*sx);cam.aspect=a;var K=(cur&&cur.cam)||{p:[3,3.4,9],l:[3,1.2,1],fov:38,fovP:56};
 var fN=Q.get('face');if(fN!==null&&anim.chars[+fN]){var cc=anim.chars[+fN],h=new T.Vector3();cc.userData.head.getWorldPosition(h);var f=new T.Vector3(Math.sin(cc.rotation.y),0,Math.cos(cc.rotation.y));cam.fov=26;cam.position.set(h.x+f.x*2+.3,h.y+.05,h.z+f.z*2);cam.lookAt(h.x,h.y+.02,h.z);cam.updateProjectionMatrix();return}
 cam.fov=VW.fov||(a<.8?K.fovP:K.fov);var fx=VW.fx||0,zm=VW.zoom||1;var pdy=K.p[1]-K.l[1],pdz=K.p[2]-K.l[2];if(PLAYMODE&&a<.8){var pr_=Math.hypot(pdy,pdz),pa_=Math.min(1.1,Math.atan2(pdy,pdz)+.3);pdy=pr_*Math.sin(pa_);pdz=pr_*Math.cos(pa_)}cam.position.set(K.l[0]+fx+(K.p[0]-K.l[0])/zm,K.l[1]+pdy/zm,K.l[2]+pdz/zm);cam.lookAt(K.l[0]+fx,K.l[1],K.l[2]);
 if(VW.on){var c=(VW.top+VW.bottom)/2,fh=H*sx;cam.setViewOffset(W,fh,0,fh/2-H*(1-c)/2,W,H)}else cam.clearViewOffset();cam.updateProjectionMatrix()}
addEventListener('resize',size);
function step(dt){TT+=dt;var t=TT;anim.chars.forEach(function(c){animChar(c,t,dt)});anim.tick.forEach(function(f){f(t,dt)});
 anim.glow.forEach(function(s,i){s.material.opacity=(s.userData.b||(s.userData.b=s.material.opacity))*(1+Math.sin(t*3+i)*.06)});
 anim.flags.forEach(function(f){var p=f.g.attributes.position;if(!f.o0)f.o0=p.array.slice();for(var i=0;i<p.count;i++){var x=f.o0[i*3];p.array[i*3+2]=Math.sin(t*4+x*2.2+f.ph)*.2*(x/2+.4)}p.needsUpdate=true;f.g.computeVertexNormals()});
 anim.flares.forEach(function(F,i){F.pl.intensity=(1+Math.sin(t*24+i)*.3)*LAMP_K.out*.6;F.sp.material.opacity=(.8+Math.sin(t*17+i)*.15)*(SOBER?.35:1);F.smoke.forEach(function(s){s.a=(s.a+dt*.5)%4;var k=s.a/4;s.s.position.set(F.x+Math.sin(s.a*3+i)*.3*k,F.y+k*3.2,F.z);s.s.material.opacity=Math.sin(Math.min(1,k)*3.14)*(SOBER?(s.s.material.blending===T.AdditiveBlending?.05:.3):.25);s.s.scale.setScalar(.8+k*2.2)})})}
var post=(function(){var w=innerWidth,h=innerHeight,pr=ren.getPixelRatio();/* stencilBuffer:true is what buys a 24-bit depth buffer: three r128 gives a depth-only render target DEPTH_COMPONENT16, and at
    sixteen bits a floor one centimetre above its slab, a crowd on its step and a rug on its boards fight for every pixel on a
    phone's GPU — the shimmering floor and the black squares in the stand (owner, 23.10.2026) */
 var rt=new T.WebGLMultisampleRenderTarget(w*pr,h*pr,{format:T.RGBAFormat,type:T.HalfFloatType,stencilBuffer:true});rt.samples=QL==='high'?4:QL==='med'?2:0;var b1=new T.WebGLRenderTarget(w*pr/4|0,h*pr/4|0,{type:T.HalfFloatType}),b2=b1.clone();
 var qs=new T.Scene(),qc=new T.OrthographicCamera(-1,1,1,-1,0,1),vs='varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}';
 var mb=new T.ShaderMaterial({uniforms:{t:{value:null},d:{value:new T.Vector2()},th:{value:1}},vertexShader:vs,fragmentShader:'varying vec2 v;uniform sampler2D t;uniform vec2 d;uniform float th;void main(){vec3 c=vec3(0.);float w[5];w[0]=.227;w[1]=.19;w[2]=.12;w[3]=.06;w[4]=.02;c=texture2D(t,v).rgb*w[0];for(int i=1;i<5;i++){vec3 a=texture2D(t,v+d*float(i)*1.6).rgb,b=texture2D(t,v-d*float(i)*1.6).rgb;c+=(a+b)*w[i];}gl_FragColor=vec4(c,1.);}'});
 var mt=new T.ShaderMaterial({uniforms:{t:{value:null},th:{value:SOBER?1.15:.9}},vertexShader:vs,fragmentShader:'varying vec2 v;uniform sampler2D t;uniform float th;void main(){vec3 c=texture2D(t,v).rgb;if(!(dot(c,vec3(1.))>=0.))c=vec3(0.);c=min(c,vec3(16.));float l=dot(c,vec3(.3,.59,.11));gl_FragColor=vec4(c*smoothstep(th,th*2.2,l),1.);}'});
 /* ---- ambient occlusion: a depth pre-pass at half size, Alchemy-style obscurance, a depth-aware blur ---- */
 var AO=QL!=='low',aoOn=true;var dRT=null,aRT=null,aRT2=null,ma=null,mab=null,depthMat=null;
 var AOD=QL==='high'?2:3;if(AO){var hw=Math.max(2,w*pr/AOD|0),hh=Math.max(2,h*pr/AOD|0);dRT=new T.WebGLRenderTarget(hw,hh);dRT.depthTexture=new T.DepthTexture(hw,hh);dRT.depthTexture.type=ren.capabilities.isWebGL2?T.FloatType:T.UnsignedIntType;
  aRT=new T.WebGLRenderTarget(hw,hh);aRT2=aRT.clone();depthMat=new T.MeshBasicMaterial({colorWrite:false});depthMat.skinning=true;depthMat.morphTargets=false;
  ma=new T.ShaderMaterial({uniforms:{dp:{value:dRT.depthTexture},pi:{value:new T.Matrix4()},px:{value:new T.Vector2()},rad:{value:.46},sc:{value:1}},vertexShader:vs,
   fragmentShader:`varying vec2 v;uniform sampler2D dp;uniform mat4 pi;uniform vec2 px;uniform float rad,sc;
   vec3 P(vec2 u){float d=texture2D(dp,u).x;vec4 c=vec4(u*2.-1.,d*2.-1.,1.);vec4 q=pi*c;return q.xyz/q.w;}
   float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
   void main(){float d0=texture2D(dp,v).x;if(d0>=.99999){gl_FragColor=vec4(1.);return;}vec3 p=P(v);vec3 cr=cross(P(v+vec2(px.x,0.))-p,P(v+vec2(0.,px.y))-p);float cl=length(cr);if(!(cl>1e-9)){gl_FragColor=vec4(1.);return;}vec3 n=cr/cl;
    float r=rad*sc/max(.3,-p.z);float a=hash(v*1000.)*6.2831,s=0.;
    for(int i=0;i<12;i++){float f=(float(i)+.5)/12.;float ang=a+f*25.13;vec2 o=vec2(cos(ang),sin(ang))*r*sqrt(f);vec3 q=P(v+o)-p;float vv=dot(q,q);s+=max(0.,dot(q,n)-.012*(-p.z))/(vv+.003)*smoothstep(.55,.0,sqrt(vv));}
    float ao=clamp(1.-s*.27,0.,1.);if(!(ao>=0.&&ao<=1.))ao=1.;ao=ao*ao*(3.-2.*ao);gl_FragColor=vec4(vec3(ao),1.);}`});
  mab=new T.ShaderMaterial({uniforms:{t:{value:null},dp:{value:dRT.depthTexture},d:{value:new T.Vector2()}},vertexShader:vs,fragmentShader:'varying vec2 v;uniform sampler2D t,dp;uniform vec2 d;void main(){float z0=texture2D(dp,v).x,s=0.,w=0.;for(int i=-3;i<=3;i++){vec2 u=v+d*float(i)*1.1;float z=texture2D(dp,u).x,k=exp(-abs(z-z0)*4000.)*(1.-abs(float(i))/4.);s+=texture2D(t,u).r*k;w+=k;}gl_FragColor=vec4(vec3(s/max(w,1e-4)),1.);}'})}
 var mc=new T.ShaderMaterial({uniforms:{t:{value:null},b:{value:null},ao:{value:null},aoK:{value:AO?1:0},aoShow:{value:Q.get('ao')==='show'?1:0},sb:{value:SOBER?1:0},yg:{value:1},gb:{value:[new T.Vector3(34,74,-.3),new T.Vector3(),new T.Vector3(),new T.Vector3()]},ex:{value:.94},tm:{value:0},px:{value:new T.Vector2(1/w,1/h)}},vertexShader:vs,fragmentShader:`varying vec2 v;uniform sampler2D t,b,ao;uniform float aoK,tm;
 vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
 vec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);float e=1.e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
 vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.,2./3.,1./3.,3.);vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y);}
 uniform float aoShow,yg,ex,sb;uniform vec3 gb[4];void main(){vec3 c=texture2D(t,v).rgb;if(!(dot(c,vec3(1.))>=0.))c=vec3(0.);c=min(c,vec3(64.));float o=aoK>0.?texture2D(ao,v).r:1.;if(!(o>=0.&&o<=1.))o=1.;if(aoShow>0.){gl_FragColor=vec4(vec3(o),1.);return;}c*=mix(1.,o,.95*aoK);vec3 m;float l;if(sb>0.){/* the GTA round (31.10.2026): a lens, not a scan. Chromatic fringe at the frame edge, bloom only off real light, filmic contrast with teal in the shadows and warmth in the highlights, pigment kept. */vec2 rv=v-.5;float rd=dot(rv,rv);vec2 ca=rv*max(rd-.07,0.)*.0045;float cr=texture2D(t,v+ca).r,cb=texture2D(t,v-ca).b;if(cr>=0.&&cb>=0.)c=vec3(min(cr,64.),c.g,min(cb,64.));c+=texture2D(b,v).rgb*vec3(.26,.22,.17);m=aces(c*ex);l=dot(m,vec3(.2126,.7152,.0722));m=mix(vec3(l),m,1.18);float sh=1.-smoothstep(.0,.38,l),hi=smoothstep(.45,1.,l);m=mix(m,m*vec3(.85,.96,1.12),sh*.5);m=mix(m,m*vec3(1.04,.995,.92),hi*.42);m=pow(m,vec3(1./2.2));m=mix(m,m*m*(3.-2.*m),.5);m=(m-.5)*1.06+.5;m=clamp(m-.012,0.,1.);}else{c+=texture2D(b,v).rgb*.4;m=aces(c*ex);l=dot(m,vec3(.3,.59,.11));m=mix(vec3(l),m,1.02);m=max((m-.5)*1.08+.5,0.);m=mix(m,m*vec3(.95,.98,1.06),1.-smoothstep(.0,.42,l));m=mix(m,m*vec3(1.04,.985,.96),smoothstep(.45,.95,l));m=pow(m,vec3(1./2.2));}for(int i=0;i<4;i++){vec3 B=gb[i];if(B.z==0.)continue;bool rot=B.z<0.;float ms=abs(B.z);vec3 hv=rgb2hsv(m);float hd=hv.x*360.;float lo=B.x-2.5,hi=B.y+3.;float inb=lo<=hi?smoothstep(lo,B.x,hd)*(1.-smoothstep(B.y,hi,hd)):max(smoothstep(lo,B.x,hd),1.-smoothstep(B.y,hi,hd));inb*=smoothstep(ms*.7,ms*.85,hv.y);if(rot&&hd<(B.x+B.y)*.5&&hv.y>.55){float tgt=(B.x-8.)/360.;hv.x=mix(hv.x,min(hv.x,tgt),inb);hv.y=mix(hv.y,min(hv.y,.62),inb*.5);}else if(rot)hv.y=mix(hv.y,min(hv.y,ms*.8),inb);else hv.y=mix(hv.y,min(hv.y,ms*.78),inb);m=hsv2rgb(hv);}float vg=smoothstep(sb>0.?1.22:1.05,sb>0.?.34:.3,length((v-.5)*vec2(1.,.92)));m*=mix(sb>0.?.5:.7,1.,vg);float gn=fract(sin(dot(v*1400.+fract(tm*.37)*31.+ex*17.,vec2(12.9898,78.233)))*43758.5453)-.5;m+=gn*(sb>0.?.022*(1.-.7*dot(m,vec3(.33))):.01);gl_FragColor=vec4(m,1.);}`});
 var quad=new T.Mesh(new T.PlaneGeometry(2,2),mb);qs.add(quad);
 function pass(m,tgt){quad.material=m;ren.setRenderTarget(tgt);ren.render(qs,qc)}
 var hid=[];function depthPass(){hid.length=0;sc.traverseVisible(function(o){var m=o.material;if(o.isSprite||o.isPoints||o.isLine||(m&&(m.transparent||m.blending===T.AdditiveBlending||m.depthWrite===false))){if(o.visible){o.visible=false;hid.push(o)}}});
  var bg=sc.background,fog=sc.fog;sc.background=null;sc.overrideMaterial=depthMat;ren.setRenderTarget(dRT);ren.clear();ren.render(sc,cam);sc.overrideMaterial=null;sc.background=bg;hid.forEach(function(o){o.visible=true})}
 return{ao:function(on){aoOn=!!on},bands:function(list){var v=mc.uniforms.gb.value;for(var i=0;i<4;i++){var b=list[i];if(b)v[i].set(b[0],b[1],b[2]);else v[i].set(0,0,0)}},exposure:function(e){mc.uniforms.ex.value=e},render:function(){mc.uniforms.tm.value=TT;var pr2=ren.getPixelRatio(),W=ren.domElement.width,H=ren.domElement.height;if(rt.width!==W||rt.height!==H){rt.setSize(W,H);b1.setSize(W/4|0,H/4|0);b2.setSize(W/4|0,H/4|0);mc.uniforms.px.value.set(1/W,1/H);if(AO){dRT.setSize(W/AOD|0,H/AOD|0);aRT.setSize(W/AOD|0,H/AOD|0);aRT2.setSize(W/AOD|0,H/AOD|0)}}
  ren.toneMapping=T.NoToneMapping;ren.outputEncoding=T.LinearEncoding;
  /* (the interview studio turns it off: its depth pre-pass misplaces a seated skinned body, and the obscurance printed a ghost of the sitter on the wall and smears across the face) */if(AO&&aoOn&&cur&&!window.__noAO){depthPass();ma.uniforms.pi.value.copy(cam.projectionMatrixInverse);ma.uniforms.px.value.set(1/dRT.width,1/dRT.height);ma.uniforms.sc.value=cam.projectionMatrix.elements[5]*.5;pass(ma,aRT);
   mab.uniforms.t.value=aRT.texture;mab.uniforms.d.value.set(1/aRT.width,0);pass(mab,aRT2);mab.uniforms.t.value=aRT2.texture;mab.uniforms.d.value.set(0,1/aRT.height);pass(mab,aRT);mc.uniforms.ao.value=aRT.texture;mc.uniforms.aoK.value=1}else mc.uniforms.aoK.value=0;
  ren.setRenderTarget(rt);ren.render(sc,cam);
  mt.uniforms.t.value=rt.texture;pass(mt,b1);mb.uniforms.t.value=b1.texture;mb.uniforms.d.value.set(1.6/b1.width,0);pass(mb,b2);mb.uniforms.t.value=b2.texture;mb.uniforms.d.value.set(0,1/b1.height);pass(mb,b1);
  mc.uniforms.t.value=rt.texture;mc.uniforms.b.value=b1.texture;pass(mc,null)}}})();

/* every surface in a room gets the same slow, world-anchored variation a real place has: no two metres of wall the same tone,
   darker where hands and floors and years have been. Relief comes from the surface's own painted texture. */
var WX_GLSL='float wxh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float wxn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(wxh(i),wxh(i+vec3(1,0,0)),f.x),mix(wxh(i+vec3(0,1,0)),wxh(i+vec3(1,1,0)),f.x),f.y),mix(mix(wxh(i+vec3(0,0,1)),wxh(i+vec3(1,0,1)),f.x),mix(wxh(i+vec3(0,1,1)),wxh(i+vec3(1,1,1)),f.x),f.y),f.z);}float wxf(vec3 p){return wxn(p)*.5+wxn(p*2.13)*.28+wxn(p*4.37)*.14+wxn(p*9.1)*.08;}';
/* what a surface is made of: a texture's own tag first (stone, wood, plaster, cloth, paper), then the material's
   physics (metal); everything else is painted. Relief only where the thing has relief: a paint stain is not a bump. */
function matKind(m){var t=m.map&&m.map.userData&&m.map.userData.mat;if(t)return t;if(m.metalness>=.3)return'metal';if(!m.map&&m.roughness>=.88)return'cloth';return'paint'}
var WXK={stone:[1,.5,1,.006],wood:[.8,.45,.95,.004],plaster:[1,.55,1,0],paint:[.6,.5,1,0],cloth:[.45,.86,1,0],paper:[.18,.7,.95,0],metal:[.5,.22,.82,0]};
function weatherMat(m,o,inside){if(!m||!m.isMeshStandardMaterial||m.skinning||m.onBeforeCompile!==T.Material.prototype.onBeforeCompile&&m.onBeforeCompile||m.userData.wx||m.transparent||m.blending===T.AdditiveBlending)return;m.userData.wx=1;
 var kind=matKind(m),P=WXK[kind]||WXK.paint;m.userData.kind=kind;
 var K={value:P[0]*(m.map?1:.6)},IN={value:inside?1:0},R0={value:P[1]},R1={value:P[2]},SH={value:kind==='cloth'?1:0},MT={value:kind==='metal'?1:0};
 if(P[3]&&m.map&&!m.bumpMap&&m.map.image&&m.map.image.width>=128){m.bumpMap=m.map;m.bumpScale=P[3]}
 m.onBeforeCompile=function(sh){sh.uniforms.wxK=K;sh.uniforms.wxIn=IN;sh.uniforms.wxR0=R0;sh.uniforms.wxR1=R1;sh.uniforms.wxSh=SH;sh.uniforms.wxMt=MT;
  sh.vertexShader='varying vec3 vWx;varying vec3 vWn;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWx=(modelMatrix*vec4(transformed,1.)).xyz;vWn=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader='varying vec3 vWx;varying vec3 vWn;uniform float wxK,wxIn,wxR0,wxR1,wxSh,wxMt;\n'+WX_GLSL+'\n'+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n{float n=wxf(vWx*1.6)-.5,n2=wxf(vWx*7.)-.5;float vert=1.-abs(vWn.y);float g=vert*(1.-smoothstep(.0,.55,vWx.y))*(wxIn>0.?.26:.14);float top=wxIn*vert*smoothstep(1.6,3.,vWx.y)*.06;float wear=wxMt*smoothstep(.15,.45,wxf(vWx*2.3+3.))*.18;diffuseColor.rgb*=(1.+n*.2*wxK+n2*.07*wxK)*(1.-g-top-wear);}')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*(1.+(wxf(vWx*3.1+7.)-.5)*.34*wxK+(wxf(vWx*15.+2.)-.5)*.16)+wxMt*(wxf(vWx*2.3+3.)-.45)*.6-(1.-wxSh)*(1.-wxMt)*smoothstep(.62,.9,wxf(vWx*5.3+11.))*.1,wxR0,wxR1);')
   .replace('#include <dithering_fragment>','#include <dithering_fragment>\nif(wxSh>0.){vec3 vv=normalize(vViewPosition);float fr=pow(1.-clamp(abs(dot(normal,vv)),0.,1.),3.);gl_FragColor.rgb+=gl_FragColor.rgb*fr*.35;}')};
 m.customProgramCacheKey=function(){return'wx-'+kind}; m.needsUpdate=true}
/* ---- image-based light: a soft room (or sky) probe every PBR surface reflects ---- */
var pmrem=new T.PMREMGenerator(ren),ENV={};
function envFor(kind){if(ENV[kind])return ENV[kind];var es=new T.Scene(),box=new T.BoxGeometry(1,1,1);
 function panel(col,int,x,y,z,sx,sy,sz){var m=new T.Mesh(box,new T.MeshBasicMaterial({color:new T.Color(col).multiplyScalar(int)}));m.position.set(x,y,z);m.scale.set(sx,sy,sz);es.add(m)}
 var room=new T.Mesh(new T.BoxGeometry(12,6,12),new T.MeshBasicMaterial({side:T.BackSide,color:kind==='in'?new T.Color('#5a4a40'):new T.Color('#7e95b4')}));room.position.y=2;es.add(room);
 var fl=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshBasicMaterial({color:kind==='in'?'#6a5444':'#6c6660'}));fl.rotation.x=-Math.PI/2;fl.position.y=-.9;es.add(fl);
 if(kind==='in'){panel('#fff1dc',5,-5.9,2.4,0,.1,2.4,3.4);panel('#ffe2c0',2.2,0,4.9,0,4,.1,4);panel('#fff6ea',1.6,5.9,1.8,-2,.1,1.6,2)}
 else{panel('#ffffff',3,0,4.9,0,12,.1,12);panel('#fff0d8',9,-4,4.5,-3,1.6,.1,1.6)}
 ENV[kind]=pmrem.fromScene(es,.04).texture;hdrEnv(kind);return ENV[kind]}
/* a photographed environment (R7 of the realism pack: Poly Haven, CC0), downsampled to 512×256 and stored as an RGBM
   PNG (sqrt-encoded, range 16) so it ships at ~170 KB: when it arrives it replaces the drawn box room above, and the
   scene that was lit by the drawn one is lit by the photograph instead. */
var HDR_OF={in:'room',out:'day'},HDR_K=1.15,hdrAsk={};
function hdrEnv(kind){var name=HDR_OF[kind];if(!name||hdrAsk[kind])return;hdrAsk[kind]=1;var im=new Image();im.onload=function(){try{
  var c=document.createElement('canvas');c.width=im.width;c.height=im.height;var g=c.getContext('2d');g.drawImage(im,0,0);var px=g.getImageData(0,0,c.width,c.height).data,n=c.width*c.height,half=!!(T.DataUtils&&T.DataUtils.toHalfFloat),f=half?new Uint16Array(n*4):new Float32Array(n*4),hf=half?T.DataUtils.toHalfFloat:function(v){return v};
  var W=c.width,H=c.height;for(var i=0;i<n;i++){var y=(i/W)|0,o=((H-1-y)*W+(i-y*W))*4,m=px[i*4+3]/255;for(var k=0;k<3;k++){var x=px[i*4+k]/255*m;f[o+k]=hf(x*x*16*HDR_K)}f[o+3]=hf(1)}/* (rows flipped here: a data texture's first row is its bottom) */
  /* half floats: filterable everywhere a phone runs WebGL2 */var t=new T.DataTexture(f,c.width,c.height,T.RGBAFormat,half?T.HalfFloatType:T.FloatType);t.minFilter=t.magFilter=T.LinearFilter;t.generateMipmaps=false;t.mapping=T.EquirectangularReflectionMapping;t.needsUpdate=true;
  var old=ENV[kind],env=pmrem.fromEquirectangular(t).texture;t.dispose();ENV[kind]=env;if(sc.environment===old)sc.environment=env}catch(er){/* the drawn room stays */}};im.src='/life/town/env/'+name+'.png'}
window.__sc=sc;window.RM=RM;var hooks=[];window.__town={step:step,render:function(){post.render()},ready:false,T:T,world:world,cam:cam,ren:ren,quality:QL,hooks:hooks,
 makeChar:makeChar,dropChar:function(g){if(g.parent)g.parent.remove(g);var i=anim.chars.indexOf(g);if(i>=0)anim.chars.splice(i,1)},
 cur:function(){return cur},U:U,
 view:function(top,bottom,fov){VW.top=top;VW.bottom=bottom;VW.fov=fov||null;VW.on=true;size()},
 bg:function(c0,c1){var c=cvs(4,256),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,c0);gr.addColorStop(1,c1);g.fillStyle=gr;g.fillRect(0,0,4,256);var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;sc.background=t},
 follow:function(fx,zm){zm=zm||1;if(Math.abs(fx-VW.fx)>1e-4||zm!==VW.zoom){VW.fx=fx;VW.zoom=zm;size()}},
 cineCam:function(c){CC=c||null;if(CC)applyCC();else size()},
 camInfo:function(){var K=cur&&cur.cam;return K?{p:K.p,l:K.l,fov:cam.fov,aspect:cam.aspect}:null},
 screen:function(x,y,z){var v=new T.Vector3(x,y,z).project(cam),r=ren.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}},
 time:function(){return TT},
 /* bands the grade may not paint: the club's own legacy rules (wider than the scanner's, rule 44) and its rivals' colour families */
 colourGuard:function(S){var L=[];if(!S){L.push([37,72,-.3])}else{(S.policy||[]).forEach(function(r){L.push([Math.max(0,r.hue[0]-1),Math.min(360,r.hue[1]+2),-Math.max(.2,r.minSaturation-.05)])});
  var F={red:[342,18,.45],green:[88,172,.38],blue:[188,262,.4]};(S.rivals||[]).forEach(function(n){if(F[n])L.push(F[n])})}post.bands(L.slice(0,4))}};
/* adaptive quality (owner's list, item 8): the frame time is measured, and when it stays slow the costly things
   step down one at a time — finer pixels first, then ambient occlusion, then the full pixel ratio — and come back when
   there is room again. Never below one pixel per pixel, so faces, signs and the action stay sharp. A browser under
   automation (QA screenshots) and ?aq=off keep the quality fixed. */
var AQ={lvl:0,ema:16,acc:0,cool:0,pr0:ren.getPixelRatio()},AQON=Q.get('aq')!=='off'&&!navigator.webdriver;
function aqApply(){var pr=AQ.lvl>=3?Math.min(1,AQ.pr0):AQ.lvl>=1?Math.max(1,AQ.pr0*.8):AQ.pr0;if(Math.abs(ren.getPixelRatio()-pr)>.01){ren.setPixelRatio(pr);size()}post.ao(AQ.lvl<2);window.__town.aq=AQ.lvl}
function adapt(ms){if(!AQON||ms>250)return;AQ.ema=AQ.ema*.94+ms*.06;AQ.acc+=ms;if(AQ.acc<1500)return;AQ.acc=0;if(AQ.cool>0){AQ.cool--;return}
 if(AQ.ema>30&&AQ.lvl<3){AQ.lvl++;aqApply();AQ.cool=2}else if(AQ.ema<14&&AQ.lvl>0){AQ.lvl--;aqApply();AQ.cool=5}}
var last=performance.now();function loop(n){var dt=Math.min(.05,(n-last)/1000);adapt(n-last);last=n;if(!window.__manual)step(dt);for(var i=0;i<hooks.length;i++)hooks[i](TT,dt);post.render();requestAnimationFrame(loop)}
window.__start=function(){if(window.PEOPLE&&!PEOPLE.ready&&!PEOPLE.failed){Promise.all([PEOPLE.load(),QL!=='low'&&PEOPLE.loadCrowd?PEOPLE.loadCrowd():0]).then(window.__start);return}var id=Q.get('room')||RM.ids()[0];if(!Q.get('play'))RM.load(id,{club:Q.get('club'),time:Q.get('time'),skinSet:window.__skinFor?window.__skinFor(Q.get('club')):null});window.__town.ready=true;requestAnimationFrame(loop)};
})();
