/* LIFE town — people.
 * Every person in the 3D town is one skinned human (MakeHuman base mesh, CC0 — see scripts/life/build-people.py),
 * shaped per character from a morph basis (sex, age, build, ancestry, height), dressed in garments that are grown
 * from the body itself (so cloth never pokes through skin), with hair, eyes and a tintable skin.
 * It answers the same contract the old procedural doll did: K.makeChar(o) returns a Group whose userData carries
 * hips/torso/head/arms/legs/eyes/mouth; rooms and play.js keep animating those, and sync() pours them into the bones.
 */
(function(){
var T=THREE,PI=Math.PI,P={ready:false,failed:false,q:[]};
window.PEOPLE=P;
var D=null,H=null,BONE={},NB=0;
function sec(name){var s=H.sections[name];if(!s)return null;var C={f4:Float32Array,u2:Uint16Array,u1:Uint8Array,i2:Int16Array}[s.t];return new C(D,s.o,s.n)}
P.load=function(base){base=base||'/life/town/people/';
 return Promise.all([fetch(base+'body.json').then(function(r){if(!r.ok)throw new Error('body.json '+r.status);return r.json()}),fetch(base+'body.bin').then(function(r){if(!r.ok)throw new Error('body.bin '+r.status);return r.arrayBuffer()}),new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=rej;im.src=base+'skin.png'})])
 .then(function(a){H=a[0];D=a[1];NB=H.nb;H.bones.forEach(function(b,i){BONE[b]=i});
  P.pos=sec('pos');P.uv=sec('uv');P.split=sec('split');P.tri=sec('tri');P.otri=sec('otri');P.ski=sec('ski');P.skw=sec('skw');P.hair=sec('hair');P.cav=sec('cav');P.limb=sec('limb')||new Uint8Array(NB);P.stache=sec('stache')||new Uint8Array(NB);P.joints=sec('joints');P.extra=sec('extra');
  P.morph={};H.morphs.forEach(function(m){P.morph[m.name]={d:sec('m_'+m.name),i:m.sparse?sec('m_'+m.name+'_i'):null,s:m.scale,j:sec('j_'+m.name),x:sec('x_'+m.name)}});
  P.tmpl={};H.templates.forEach(function(k){P.tmpl[k]=sec('t_'+k)});
  var tx=new T.Texture(a[2]);tx.flipY=false;tx.needsUpdate=true;tx.anisotropy=4;P.skinTex=tx;
  var mn=1e9;for(var i=1;i<NB*3;i+=3)if(P.pos[i]<mn)mn=P.pos[i];P.y0=mn;P.hc=new T.Vector3(P.joints[BONE.head*3],P.joints[BONE.head*3+1]-mn,P.joints[BONE.head*3+2]);P.adj=adjacency();P.ready=true;P.q.forEach(function(f){f()});P.q=[]})
 .catch(function(e){P.failed=true;console.warn('[people] falling back to the procedural figures:',e)})};
P.whenReady=function(f){if(P.ready)f();else P.q.push(f)};

/* ---------- topology, once ---------- */
function adjacency(){var n=NB,deg=new Uint16Array(n),t=P.otri,i;for(i=0;i<t.length;i+=3){deg[t[i]]+=2;deg[t[i+1]]+=2;deg[t[i+2]]+=2}
 var off=new Uint32Array(n+1);for(i=0;i<n;i++)off[i+1]=off[i]+deg[i];var nb=new Uint32Array(off[n]),fill=new Uint32Array(n);
 function add(a,b){nb[off[a]+fill[a]++]=b}for(i=0;i<t.length;i+=3){var a=t[i],b=t[i+1],c=t[i+2];add(a,b);add(a,c);add(b,a);add(b,c);add(c,a);add(c,b)}
 return{off:off,nb:nb}}
function hashf(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967295}
function lin(c){return new T.Color(c).convertSRGBToLinear()}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function sstep(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}

/* ---------- who is this person ---------- */
function L2(c){var C=new T.Color(c);return .2126*C.r+.7152*C.g+.0722*C.b}
function physique(o){
 var id=o._id||o.name||JSON.stringify([o.skin,o.hair,o.top,o.bot,o.style]),r=function(k){return hashf(id+k)};
 var fem=o.sex?(o.sex==='f'||o.sex==='female'):!!(o.lash||o.long||o.skirt||o.necklace||o.flower||o.earring||o.style==='bun'||o.style==='long'||o.style==='pony');
 var g=fem?.04+r('g')*.12:.86+r('g')*.14;
 var age=o.age!=null?o.age:null;
 if(age==null){var hl=L2(o.hair||'#2a1a14'),grey=new T.Color(o.hair||'#2a1a14');var sat=Math.max(grey.r,grey.g,grey.b)-Math.min(grey.r,grey.g,grey.b);
  if((o.s||1)<.86)age=8+r('a')*5;else if(hl>.32&&sat<.08)age=58+r('a')*16;else if(o.beard&&hl>.18)age=45+r('a')*15;else age=24+r('a')*20}
 var w=o.build!=null?o.build:(o.w&&o.w>1.04?.55+(o.w-1)*3:o.w&&o.w<.95?-.4:(r('w')-.45)*.7);
 var tone=L2(o.skin||'#d8a882');
 var afr=clamp((.42-tone)/.22,0,1),cau=clamp((tone-.3)/.25,0,1),asi=(1-afr)*r('r')*.35;var sum=afr+cau+asi+1e-6;
 return{g:g,age:age,w:clamp(w,-1,1),mus:fem?.45:.5+r('m')*.25,race:[afr/sum,asi/sum,cau/sum],h:(r('h')-.5)*.3,cup:fem?.45+r('c')*.4:0,fem:fem}}
function weights(ph){var W={},g=ph.g,f=1-g;
 W.fem=f;W.mal=g;
 var a=ph.age;
 if(a>=25){var o=clamp((a-25)/60,0,1.05);W.oldF=f*o;W.oldM=g*o}
 else{var k=clamp((25-a)/14,0,1.15);W.kidF=f*k;W.kidM=g*k}
 var w=ph.w;if(w>0){W.heavyF=f*w;W.heavyM=g*w}else{W.thinF=-f*w;W.thinM=-g*w}
 var m=ph.mus-.5;if(m>0){W.musF=f*m*2;W.musM=g*m*2}
 ['afr','asi','cau'].forEach(function(n,i){var rw=ph.race[i]-1/3;W[n+'F']=f*rw;W[n+'M']=g*rw});
 if(ph.h>0)W.tall=ph.h;else W.short=-ph.h;
 if(ph.cup)W.cup=f*(ph.cup-.5)*2;
 return W}

/* ---------- body positions + joints for a physique ---------- */
function shape(W){var n=NB,pos=new Float32Array(P.pos),J=new Float32Array(P.joints),X=new Float32Array(P.extra);
 for(var k in W){var w=W[k];if(!w)continue;var m=P.morph[k];if(!m)continue;var s=m.s*w,d=m.d,i,j;
  if(m.i){for(j=0;j<m.i.length;j++){i=m.i[j]*3;pos[i]+=d[j*3]*s;pos[i+1]+=d[j*3+1]*s;pos[i+2]+=d[j*3+2]*s}}
  else for(i=0;i<n*3;i++)pos[i]+=d[i]*s;
  for(i=0;i<J.length;i++)J[i]+=m.j[i]*w;for(i=0;i<X.length;i++)X[i]+=m.x[i]*w}
 var miny=1e9;for(i=1;i<n*3;i+=3)if(pos[i]<miny)miny=pos[i];
 for(i=1;i<n*3;i+=3)pos[i]-=miny;for(i=1;i<J.length;i+=3)J[i]-=miny;for(i=1;i<X.length;i+=3)X[i]-=miny;
 return{pos:pos,J:J,X:X}}
function normals(pos,tri,count){var n=new Float32Array(count*3);for(var i=0;i<tri.length;i+=3){var a=tri[i]*3,b=tri[i+1]*3,c=tri[i+2]*3;
  var ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2],vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
  var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;n[a]+=nx;n[a+1]+=ny;n[a+2]+=nz;n[b]+=nx;n[b+1]+=ny;n[b+2]+=nz;n[c]+=nx;n[c+1]+=ny;n[c+2]+=nz}
 for(i=0;i<count;i++){var l=Math.hypot(n[i*3],n[i*3+1],n[i*3+2])||1;n[i*3]/=l;n[i*3+1]/=l;n[i*3+2]/=l}return n}

/* ---------- skeleton ---------- */
function skeleton(J){var bones=[],inv=[];H.bones.forEach(function(name,i){var b=new T.Bone();b.name=name;var p=H.parents[i];
  if(p<0)b.position.set(J[i*3],J[i*3+1],J[i*3+2]);else{b.position.set(J[i*3]-J[p*3],J[i*3+1]-J[p*3+1],J[i*3+2]-J[p*3+2]);bones[p].add(b)}
  bones.push(b);inv.push(new T.Matrix4().makeTranslation(-J[i*3],-J[i*3+1],-J[i*3+2]))});
 return{bones:bones,sk:new T.Skeleton(bones,inv)}}
function jv(J,name){var i=BONE[name]*3;return new T.Vector3(J[i],J[i+1],J[i+2])}

/* ---------- materials ---------- */
var SKIN_VS_HEAD='attribute float hf;attribute float stc;varying float vHf;varying float vStc;\n',SKIN_FS_HEAD='uniform vec3 uSkin,uLip,uBrow,uBeard;uniform float uBeardAmt,uBrowAmt,uBuzz,uBlush,uMake,uStache;varying float vHf;varying float vStc;\n';
function skinMat(look,ctx){var m=new T.MeshStandardMaterial({color:0xffffff,roughness:.56,metalness:0,map:P.skinTex,envMapIntensity:window.__EI||.4});m.map.encoding=T.LinearEncoding;
 var U={uSkin:{value:lin(look.skin)},uLip:{value:lin(look.lip)},uBrow:{value:lin(look.brow)},uBeard:{value:lin(look.beardCol)},uBeardAmt:{value:look.beardAmt},uBrowAmt:{value:look.browAmt},uBuzz:{value:look.buzz},uBlush:{value:look.blush},uMake:{value:look.make},uStache:{value:look.stache||0}};
 m.onBeforeCompile=function(s){Object.assign(s.uniforms,U);
  s.vertexShader=SKIN_VS_HEAD+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHf=hf;vStc=stc;');
  s.fragmentShader=SKIN_FS_HEAD+s.fragmentShader.replace('#include <map_fragment>',[
   'vec4 sk=texture2D(map,vUv);',
   'vec3 c=uSkin*mix(.66,1.06,sk.r);',
   'float red=smoothstep(.05,.5,sk.g);c=mix(c,c*vec3(1.1,.84,.82),red*(.45+uBlush));',
   'float lip=smoothstep(.55,.95,sk.g);c=mix(c,mix(c*vec3(.86,.6,.6),uLip,uMake),lip*.85);',
   'c=mix(c,uBeard,sk.a*uBeardAmt);c=mix(c,uBrow*.75,smoothstep(.12,.55,vStc)*uStache*(.75+.25*sk.a));',
   'float hz=smoothstep(.42,.62,vHf);c=mix(c,uBrow*.85,hz*uBuzz);',
   'c=mix(c,uBrow*.7,sk.b*uBrowAmt);',
   'diffuseColor.rgb*=c;'].join('\n'))
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(.09,.035,.02);')};
 m.skinning=true;ctx.own(m);return m}
var CLOTH_HEAD='uniform vec3 uA,uB,uC;uniform float uPat,uWeave,uSheen;varying vec3 vBind;varying float vEdge;varying float vAo;varying vec3 vLimb;\n';
/* pat: 0 plain · 1 stripes · 2 hoops · 3 halves · 4 sash · 5 pinstripe · 6 sole band (shoes) · 7 side stripe (trousers) */
function clothMat(o,ctx){var m=new T.MeshStandardMaterial({color:0xffffff,roughness:o.rough==null?.86:o.rough,metalness:0,side:T.DoubleSide,envMapIntensity:window.__EI||.4});
 var U={uA:{value:lin(o.a)},uB:{value:lin(o.b||o.a)},uC:{value:lin(o.c||'#f2ede4')},uPat:{value:o.pat||0},uWeave:{value:o.weave==null?1:o.weave},uSheen:{value:o.sheen||0}};
 m.onBeforeCompile=function(s){Object.assign(s.uniforms,U);
  s.vertexShader='attribute vec3 bind;attribute float edge;attribute float ao;attribute vec3 limb;'+CLOTH_HEAD+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBind=bind;vEdge=edge;vAo=ao;vLimb=limb;');
  s.fragmentShader=CLOTH_HEAD+s.fragmentShader.replace('#include <map_fragment>',[
   'float k=0.;vec3 b=vBind;',
   'if(uPat>.5&&uPat<1.5)k=step(.5,fract(b.x*9.5+.25));',
   'else if(uPat<2.5&&uPat>1.5)k=step(.5,fract(b.y*7.5));',
   'else if(uPat<3.5&&uPat>2.5)k=step(0.,b.x);',
   'else if(uPat<4.5&&uPat>3.5)k=step(abs(b.x+(b.y-1.25)*.9),.075);',
   'else if(uPat<5.5&&uPat>4.5)k=step(.86,fract(b.x*26.));',
   'else if(uPat<6.5&&uPat>5.5)k=step(b.y,.028);',
   'float la=degrees(atan(vLimb.y,vLimb.x+1e-5)),lk=step(.5,vLimb.z)*step(.7,length(vLimb.xy));',
   'if(uPat<7.5&&uPat>6.5)k=step(1.5,vLimb.z)*lk*(step(abs(la-9.),5.)+step(abs(la+9.),5.));',
   'else if(uPat>8.5&&uPat<9.5)k=lk*(step(abs(la-10.),5.5)+step(abs(la+10.),5.5));',
   'vec3 c=mix(uA,uB,k);',
   'if(uPat>8.5&&uPat<9.5&&b.z>.04&&abs(b.x)<.0045&&vLimb.z<.5)c=uA*.35;',
   'if(uPat>7.5&&uPat<8.5){float tw=sin((b.x*1.+b.y*1.7+b.z)*720.)*.5+.5;float fade=smoothstep(.35,.9,sin(b.y*6.)*.5+.5)*.12;c*=.92+tw*.1;c=mix(c,c*1.35+vec3(.02,.03,.05),fade);}',
   'if(uPat>9.5){float rib=sin(b.x*520.)*.5+.5;c*=.9+rib*.14;}',
   'if(uPat>5.5&&uPat<6.5)c=mix(c,uC,step(b.y,.009));',
   'float w=(sin(b.x*900.)*sin(b.y*900.)+sin((b.x+b.z)*620.))*.5;c*=1.+w*.035*uWeave;',
   'c*=mix(.55,1.,vAo);c*=mix(.86,1.,smoothstep(0.,.014,vEdge));',
   'diffuseColor.rgb*=c;'].join('\n'))
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat fr=pow(1.-clamp(dot(normalize(vNormal),normalize(vViewPosition)),0.,1.),3.);totalEmissiveRadiance+=diffuseColor.rgb*fr*uSheen;')};
 m.skinning=true;ctx.own(m);return m}
function hairMat(col,gloss,ctx,curl){var m=new T.MeshStandardMaterial({color:0xffffff,roughness:gloss?.4:.66,metalness:0,envMapIntensity:(window.__EI||.4)*.7,side:T.DoubleSide,alphaTest:.02,transparent:false});m.alphaToCoverage=true;var U={uCurl:{value:curl||0},uA:{value:lin(col)},uCen:{value:P.hc.clone().add(new T.Vector3(0,.05,0))}};
 m.onBeforeCompile=function(s){Object.assign(s.uniforms,U);
  s.vertexShader='attribute vec3 bind;attribute float edge;varying vec3 vBind;varying float vEdge;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBind=bind;vEdge=edge;');
  s.fragmentShader='uniform vec3 uA,uCen;uniform float uCurl;varying vec3 vBind;varying float vEdge;\nfloat hh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float hn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z);}\nfloat curlN(vec3 p){return hn(p*140.)*.6+hn(p*290.)*.4;}\n'+s.fragmentShader.replace('#include <map_fragment>',[
   'diffuseColor.a=smoothstep(.0,.022,vEdge);',
   'vec3 d=normalize(vBind-uCen);float st=sin(atan(d.x,d.z)*150.+d.y*30.)*.5+.5;float st2=sin(atan(d.x,d.z)*411.+d.y*70.)*.5+.5;',
   'vec3 c=uA*(.72+.2*st+.12*st2);if(uCurl>0.){float cn=curlN(vBind);c=uA*(.45+.75*cn);}diffuseColor.rgb*=c;'].join('\n'))
   .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(uCurl>0.){float e=.0025;vec3 g=vec3(curlN(vBind+vec3(e,0,0))-curlN(vBind-vec3(e,0,0)),curlN(vBind+vec3(0,e,0))-curlN(vBind-vec3(0,e,0)),curlN(vBind+vec3(0,0,e))-curlN(vBind-vec3(0,0,e)));normal=normalize(normal-mat3(viewMatrix)*g*uCurl*2.2);}')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat fr=pow(1.-clamp(dot(normalize(vNormal),normalize(vViewPosition)),0.,1.),2.);totalEmissiveRadiance+=uA*fr*.12;')};
 m.skinning=true;ctx.own(m);return m}
var EYE_TEX={};function eyeTex(col){if(EYE_TEX[col])return EYE_TEX[col];var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d');
 g.fillStyle='#ece6e0';g.fillRect(0,0,128,128);var cx=64,cy=64;var gr=g.createRadialGradient(cx,cy,4,cx,cy,30);var C=new T.Color(col);
 gr.addColorStop(0,'#0a0807');gr.addColorStop(.28,'#0a0807');gr.addColorStop(.32,C.clone().multiplyScalar(.7).getStyle());gr.addColorStop(.75,C.getStyle());gr.addColorStop(.92,C.clone().multiplyScalar(.45).getStyle());gr.addColorStop(1,'rgba(40,30,30,.0)');
 g.fillStyle=gr;g.beginPath();g.arc(cx,cy,30,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.12)';for(var i=0;i<60;i++){var a=i/60*6.283;g.beginPath();g.moveTo(cx+Math.cos(a)*10,cy+Math.sin(a)*10);g.lineTo(cx+Math.cos(a)*27,cy+Math.sin(a)*27);g.stroke()}
 var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;EYE_TEX[col]=t;return t}

/* ---------- a mesh grown from body triangles ---------- */
function regionVerts(tris){var used=new Map(),list=[];for(var i=0;i<tris.length;i++){var v=tris[i];if(!used.has(v)){used.set(v,list.length);list.push(v)}}return{map:used,list:list}}
function trisOf(tmplIdx){var out=new Uint32Array(tmplIdx.length*3),t=P.otri;for(var i=0;i<tmplIdx.length;i++){var k=tmplIdx[i]*3;out[i*3]=t[k];out[i*3+1]=t[k+1];out[i*3+2]=t[k+2]}return out}
/* offset the region along the body normals by thick(v) and relax it, so the cloth hangs over the anatomy rather than hugging it */
function grow(B,otris,opt){var R=regionVerts(otris),n=R.list.length,p=new Float32Array(n*3),base=new Float32Array(n*3),bn=new Float32Array(n*3);
 var i,j,v;for(i=0;i<n;i++){v=R.list[i];var t=opt.thick(v,B.pos[v*3],B.pos[v*3+1],B.pos[v*3+2]);for(j=0;j<3;j++){base[i*3+j]=B.pos[v*3+j];bn[i*3+j]=B.nrm[v*3+j];p[i*3+j]=B.pos[v*3+j]+B.nrm[v*3+j]*t}}
 // edges: boundary distance
 var edgeCount=new Map();for(i=0;i<otris.length;i+=3){for(j=0;j<3;j++){var a=otris[i+j],b=otris[i+(j+1)%3],key=a<b?a*65536+b:b*65536+a;edgeCount.set(key,(edgeCount.get(key)||0)+1)}}
 var bnd=new Uint8Array(n);edgeCount.forEach(function(c,key){if(c===1){bnd[R.map.get(Math.floor(key/65536))]=1;bnd[R.map.get(key%65536)]=1}});
 // local neighbours
 var ln=[];for(i=0;i<n;i++)ln.push([]);var seen=new Set();for(i=0;i<otris.length;i+=3){for(j=0;j<3;j++){var a2=R.map.get(otris[i+j]),b2=R.map.get(otris[i+(j+1)%3]),k2=a2<b2?a2*131072+b2:b2*131072+a2;if(!seen.has(k2)){seen.add(k2);ln[a2].push(b2);ln[b2].push(a2)}}}
 var it=opt.relax||0,tmp=new Float32Array(n*3);
 for(var r=0;r<it;r++){for(i=0;i<n;i++){var L=ln[i];if(!L.length||(bnd[i]&&!opt.relaxEdge)){tmp[i*3]=p[i*3];tmp[i*3+1]=p[i*3+1];tmp[i*3+2]=p[i*3+2];continue}var sx=0,sy=0,sz=0;for(j=0;j<L.length;j++){sx+=p[L[j]*3];sy+=p[L[j]*3+1];sz+=p[L[j]*3+2]}
   var lam=r%2?-.53:.5;tmp[i*3]=p[i*3]+lam*(sx/L.length-p[i*3]);tmp[i*3+1]=p[i*3+1]+lam*(sy/L.length-p[i*3+1]);tmp[i*3+2]=p[i*3+2]+lam*(sz/L.length-p[i*3+2])}
  var s=p;p=tmp;tmp=s;
  // never sink into the body
  for(i=0;i<n;i++){if(opt.loose&&!bnd[i])continue;var dx=p[i*3]-base[i*3],dy=p[i*3+1]-base[i*3+1],dz=p[i*3+2]-base[i*3+2],d=dx*bn[i*3]+dy*bn[i*3+1]+dz*bn[i*3+2],mn=opt.min||.004;if(d<mn){var f=mn-d;p[i*3]+=bn[i*3]*f;p[i*3+1]+=bn[i*3+1]*f;p[i*3+2]+=bn[i*3+2]*f}}}
 // hems: smooth each boundary loop along itself, so a neckline is a curve and not a staircase
 var bl=[];for(i=0;i<n;i++)bl.push([]);edgeCount.forEach(function(c,key){if(c===1){var a3=R.map.get(Math.floor(key/65536)),b3=R.map.get(key%65536);bl[a3].push(b3);bl[b3].push(a3)}});
 for(r=0;r<(opt.hemSmooth==null?8:opt.hemSmooth);r++){var tp=p.slice();for(i=0;i<n;i++){if(bl[i].length!==2)continue;var A2=bl[i][0],B2=bl[i][1];for(j=0;j<3;j++)tp[i*3+j]=p[i*3+j]*.4+(p[A2*3+j]+p[B2*3+j])*.3}p=tp}
 if(opt.shape)opt.shape(p,n,R,ln,bnd);
 if(opt.drape)opt.drape(p,n,R,bn,base);
 // never sink into the body (again, after the hems moved)
 var near=new Uint8Array(n);for(i=0;i<n;i++)if(bnd[i]){near[i]=2;for(j=0;j<ln[i].length;j++){var q1=ln[i][j];near[q1]=Math.max(near[q1],1);for(var j2=0;j2<ln[q1].length;j2++)if(!near[ln[q1][j2]])near[ln[q1][j2]]=1}}
 for(i=0;i<n;i++){if(!near[i]&&!opt.clearAll)continue;var ex=p[i*3]-base[i*3],ey=p[i*3+1]-base[i*3+1],ez=p[i*3+2]-base[i*3+2],ed=ex*bn[i*3]+ey*bn[i*3+1]+ez*bn[i*3+2],emn=(opt.min||.004)*.7;if(ed<emn){var ef=emn-ed;p[i*3]+=bn[i*3]*ef;p[i*3+1]+=bn[i*3+1]*ef;p[i*3+2]+=bn[i*3+2]*ef}}
 if(opt.after)for(i=0;i<n;i++)opt.after(i,R.list[i],p,base,bn,bnd);
 // boundary distance (BFS in edges) for hem shading
 var dist=new Float32Array(n).fill(1e9),q=[];for(i=0;i<n;i++)if(bnd[i]){dist[i]=0;q.push(i)}
 for(var h=0;h<q.length;h++){var u=q[h];for(j=0;j<ln[u].length;j++){var w2=ln[u][j],dd=dist[u]+Math.hypot(p[u*3]-p[w2*3],p[u*3+1]-p[w2*3+1],p[u*3+2]-p[w2*3+2]);if(dd<dist[w2]-1e-6&&dd<.06){dist[w2]=dd;q.push(w2)}}}
 for(i=0;i<n;i++)if(dist[i]>1)dist[i]=.06;
 var idx=new Uint32Array(otris.length);for(i=0;i<otris.length;i++)idx[i]=R.map.get(otris[i]);
 var bind=new Float32Array(n*3),ao=new Float32Array(n),si=new Uint16Array(n*4),sw=new Float32Array(n*4);
 for(i=0;i<n;i++){v=R.list[i];bind[i*3]=P.pos[v*3];bind[i*3+1]=P.pos[v*3+1]-P.y0;bind[i*3+2]=P.pos[v*3+2];for(j=0;j<4;j++){si[i*4+j]=P.ski[v*4+j];sw[i*4+j]=P.skw[v*4+j]/255}}
 var nn=normals(p,idx,n);
 // soft folds: cloth is never a perfect offset of the body
 if(opt.folds){var fa=opt.folds;for(i=0;i<n;i++){var bx=bind[i*3],by=bind[i*3+1],bz=bind[i*3+2];var f=Math.sin(by*46+Math.sin(bx*17+bz*9)*2.2)*.6+Math.sin(bx*21-by*13+bz*15)*.4;f*=fa*clamp(dist[i]/.03,0,1);p[i*3]+=nn[i*3]*f;p[i*3+1]+=nn[i*3+1]*f;p[i*3+2]+=nn[i*3+2]*f}nn=normals(p,idx,n)}
 // occlusion from the cloth's own creases (armpit, crotch, elbow), relaxed so it reads as shade, not as anatomy
 for(i=0;i<n;i++){var L2_=ln[i];if(!L2_.length){ao[i]=1;continue}var mx=0,my=0,mz=0;for(j=0;j<L2_.length;j++){mx+=p[L2_[j]*3];my+=p[L2_[j]*3+1];mz+=p[L2_[j]*3+2]}mx=mx/L2_.length-p[i*3];my=my/L2_.length-p[i*3+1];mz=mz/L2_.length-p[i*3+2];ao[i]=mx*nn[i*3]+my*nn[i*3+1]+mz*nn[i*3+2]}
 for(r=0;r<4;r++){var ta=ao.slice();for(i=0;i<n;i++){var L3=ln[i],sa=ta[i];for(j=0;j<L3.length;j++)sa+=ta[L3[j]];ao[i]=sa/(L3.length+1)}}
 for(i=0;i<n;i++)ao[i]=clamp(1-ao[i]*(opt.aoK==null?90:opt.aoK),.35,1);
 var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setIndex(new T.BufferAttribute(idx,1));
 g.setAttribute('normal',new T.BufferAttribute(nn,3));
 // bind attribute is the shared rest shape (pattern space), measured from the androgynous base so stripes sit the same on everyone
 g.setAttribute('bind',new T.BufferAttribute(bind,3));g.setAttribute('edge',new T.BufferAttribute(dist,1));g.setAttribute('ao',new T.BufferAttribute(ao,1));
 var lb=new Float32Array(n*3);for(i=0;i<n;i++){var lv=P.limb[R.list[i]];if(!lv)continue;var leg=lv>128,an=((leg?lv-129:lv-1)/126-.5)*2*PI;lb[i*3]=Math.cos(an);lb[i*3+1]=Math.sin(an);lb[i*3+2]=leg?2:1}g.setAttribute('limb',new T.BufferAttribute(lb,3));
 g.setAttribute('skinIndex',new T.BufferAttribute(si,4));g.setAttribute('skinWeight',new T.BufferAttribute(sw,4));
 return{geo:g,R:R,bnd:bnd,bl:bl,pos:p,ln:ln}}


/* ---------- cloth spans hollows: per horizontal slice, push every point out to the slice's convex hull ---------- */
function hull2(pts){pts.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]});function cr(o,a,b){return(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])}
 var lo=[],up=[],i;for(i=0;i<pts.length;i++){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],pts[i])<=0)lo.pop();lo.push(pts[i])}
 for(i=pts.length-1;i>=0;i--){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],pts[i])<=0)up.pop();up.push(pts[i])}up.pop();lo.pop();return lo.concat(up)}
function rayHull(H,cx,cz,dx,dz){var best=0;for(var i=0;i<H.length;i++){var a=H[i],b=H[(i+1)%H.length];var ex=b[0]-a[0],ez=b[1]-a[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;var t=((a[0]-cx)*ez-(a[1]-cz)*ex)/den,u=((a[0]-cx)*dz-(a[1]-cz)*dx)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6&&t>best)best=t}return best}
function sliceHull(p,list,group,step,pad){var by={};list.forEach(function(i){var k=Math.round(p[i*3+1]/step)+':'+group(i);(by[k]||(by[k]=[])).push(i)});
 Object.keys(by).forEach(function(k){var ids=by[k];if(ids.length<4)return;var cx=0,cz=0;ids.forEach(function(i){cx+=p[i*3];cz+=p[i*3+2]});cx/=ids.length;cz/=ids.length;
  var H=hull2(ids.map(function(i){return[p[i*3],p[i*3+2]]}));if(H.length<3)return;
  ids.forEach(function(i){var dx=p[i*3]-cx,dz=p[i*3+2]-cz,d=Math.hypot(dx,dz);if(d<1e-6)return;var hd=rayHull(H,cx,cz,dx/d,dz/d);if(hd>d){var f=(hd+pad)/d;p[i*3]=cx+dx*f;p[i*3+2]=cz+dz*f}})})}

/* a low-pass on the cloth's radius around the body axis: the fabric spans a chest, it does not trace it */
function radialBlur(p,list,step,sT,sY){var sl={},meta=[];list.forEach(function(i){var k=Math.round(p[i*3+1]/step);(sl[k]||(sl[k]=[])).push(i)});
 var cen={};Object.keys(sl).forEach(function(k){var a=sl[k],cx=0,cz=0;a.forEach(function(i){cx+=p[i*3];cz+=p[i*3+2]});cen[k]=[cx/a.length,cz/a.length]});
 var info={};list.forEach(function(i){var k=Math.round(p[i*3+1]/step),c=cen[k],dx=p[i*3]-c[0],dz=p[i*3+2]-c[1];info[i]={k:k,t:Math.atan2(dx,dz),r:Math.hypot(dx,dz),y:p[i*3+1]}});
 var out={};list.forEach(function(i){var I=info[i],sw=0,sr=0;for(var d=-3;d<=3;d++){var a=sl[I.k+d];if(!a)continue;for(var j=0;j<a.length;j++){var J=info[a[j]],dt=Math.abs(J.t-I.t);if(dt>PI)dt=2*PI-dt;if(dt>sT*2.5)continue;var dy=J.y-I.y,w=Math.exp(-(dt*dt)/(sT*sT)-(dy*dy)/(sY*sY));sw+=w;sr+=w*J.r}}out[i]=sw?sr/sw:I.r});
 list.forEach(function(i){var I=info[i],c=cen[I.k],r=out[i];p[i*3]=c[0]+Math.sin(I.t)*r;p[i*3+2]=c[1]+Math.cos(I.t)*r})}

/* cloth falls: on a grid over the front (and the back), every point is lifted to an envelope that
   spreads each peak sideways like a tent and lets the fabric fall almost straight down from it */
function clothEnvelope(p,list,zc,kh,kv){var C=.01;[1,-1].forEach(function(sd){var G={},minI=1e9,maxI=-1e9,minJ=1e9,maxJ=-1e9;
  list.forEach(function(i){var z=(p[i*3+2]-zc(p[i*3+1]))*sd;if(z<0)return;var ix=Math.round(p[i*3]/C),iy=Math.round(p[i*3+1]/C),k=ix+','+iy;if(G[k]==null||z>G[k])G[k]=z;if(ix<minI)minI=ix;if(ix>maxI)maxI=ix;if(iy<minJ)minJ=iy;if(iy>maxJ)maxJ=iy});
  var E={};for(var iy=maxJ;iy>=minJ;iy--)for(var ix=minI;ix<=maxI;ix++){var best=-1;for(var d=-7;d<=7;d++){var v=G[(ix+d)+','+iy];if(v!=null){var t=v-kh*Math.abs(d)*C;if(t>best)best=t}}
    var up=E[ix+','+(iy+1)];if(up!=null&&up-kv*C>best)best=up-kv*C;if(best>=0&&G[ix+','+iy]!=null||best>=0&&up!=null)E[ix+','+iy]=best}
  list.forEach(function(i){var zz=p[i*3+2],z0=zc(p[i*3+1]),z=(zz-z0)*sd;if(z<0)return;var e=E[Math.round(p[i*3]/C)+','+Math.round(p[i*3+1]/C)];if(e!=null&&e>z)p[i*3+2]=z0+e*sd})})}
function smoothSet(p,list,ln,inSet,it,plain){for(var r=0;r<it;r++){var tp=p.slice(),lam=plain?.6:(r%2?-.53:.5);list.forEach(function(i){var L=ln[i],sx=0,sy=0,sz=0,c=0;for(var j=0;j<L.length;j++){if(!inSet[L[j]])continue;sx+=p[L[j]*3];sy+=p[L[j]*3+1];sz+=p[L[j]*3+2];c++}if(!c)return;var wq=1;tp[i*3]=p[i*3]+lam*(sx/c-p[i*3]);tp[i*3+1]=p[i*3+1]+lam*(sy/c-p[i*3+1]);tp[i*3+2]=p[i*3+2]+lam*(sz/c-p[i*3+2])});for(var q=0;q<p.length;q++)p[q]=tp[q]}}

/* ---------- the look a room asked for, made concrete ---------- */
var STYLE_OF={short:'short',spiky:'spiky',bun:'bun',long:'long',curly:'curly',curlyLong:'curlyLong',buzz:'buzz',bald:'bald',slick:'slick',pony:'pony'};
function dress(o,ph){var id=o._id||'',r=function(k){return hashf(id+JSON.stringify(o.top)+k)};
 var top=o.top||'#8a8a92',bot=o.bot||'#2a3040';
 var L={skin:o.skin||'#d8a882',hair:o.hair||'#2a1a14',eye:o.eye||'#3a2a1c'};
 var sk=new T.Color(L.skin);L.lip='#'+sk.clone().lerp(new T.Color('#a84a4a'),.45).getHexString();
 L.brow=L.hair;L.browAmt=ph.age<10?.55:ph.fem?.8:.95;L.beardCol=new T.Color(L.hair).lerp(sk,.35).getStyle();
 L.beardAmt=o.beard?.92:o.stubble?.5:(!ph.fem&&ph.age>17?.22:0);L.blush=ph.fem?.25:.05;L.make=ph.fem&&ph.age>15?.55:.15;
 var st=STYLE_OF[o.style]||(ph.fem?(o.long?'long':'bun'):'short');L.style=st;L.buzz=st==='buzz'?.85:st==='bald'?0:st==='curly'?.4:.6;
 L.top=top;L.bot=bot;L.sleeve=(o.sleeves==='long'||o.jacket||o.cardigan||o.track)?'long':o.sleeves==='short'?'tee':(ph.age>55?'long':'tee');
 L.outer=o.track?'track':o.cardigan?'cardigan':o.jacket?'jacket':null;L.outerCol=o.track?(o.trackCol||o.top):o.cardigan||o.jacket||null;
 L.stache=o.mustache?.95:0;if(o.mustache&&!o.beard)L.beardAmt=Math.min(L.beardAmt,.18);
 L.legs=o.skirt?'skirt':(ph.age<12&&r('sh')<.5)?'shorts':'pants';
 return L}

/* ---------- build ---------- */
var CACHE={},CACHE_N=0;
function shared(){if(P.sh)return P.sh;var ns=H.ns,sp=P.split,uv=new Float32Array(ns*2),si=new Uint16Array(ns*4),sw=new Float32Array(ns*4),hf=new Float32Array(ns);
 for(var i=0;i<ns;i++){var v=sp[i];uv[i*2]=P.uv[i*2]/65535;uv[i*2+1]=1-P.uv[i*2+1]/65535;for(var j=0;j<4;j++){si[i*4+j]=P.ski[v*4+j];sw[i*4+j]=P.skw[v*4+j]/255}hf[i]=P.hair[v]/255}
 var stc=new Float32Array(ns);for(i=0;i<ns;i++)stc[i]=P.stache[sp[i]]/255;
 var mt=[];['blink','jaw'].forEach(function(k){var m=P.morph[k],d=new Float32Array(ns*3),tmp=new Float32Array(NB*3);if(m.i){for(var q=0;q<m.i.length;q++){tmp[m.i[q]*3]=m.d[q*3]*m.s;tmp[m.i[q]*3+1]=m.d[q*3+1]*m.s;tmp[m.i[q]*3+2]=m.d[q*3+2]*m.s}}else for(q=0;q<NB*3;q++)tmp[q]=m.d[q]*m.s;for(i=0;i<ns;i++){d[i*3]=tmp[sp[i]*3];d[i*3+1]=tmp[sp[i]*3+1];d[i*3+2]=tmp[sp[i]*3+2]}mt.push(new T.BufferAttribute(d,3))});
 P.sh={stache:new T.BufferAttribute(stc,1),uv:new T.BufferAttribute(uv,2),si:new T.BufferAttribute(si,4),sw:new T.BufferAttribute(sw,4),hf:new T.BufferAttribute(hf,1),morph:mt};return P.sh}
function r2(v){return Math.round(v*50)/50}
P.make=function(o,ctx){var ph=physique(o),W=weights(ph);var look=dress(o,ph);
 var topT=look.sleeve==='long'?'long':look.sleeve==='jacket'?'jacket':'tee';
 var botT=look.legs==='shorts'?'shorts':look.legs==='skirt'?null:'pants';
 var key=JSON.stringify([r2(ph.g),Math.round(ph.age),r2(ph.w),r2(ph.mus),ph.race.map(r2),r2(ph.h),r2(ph.cup),topT,botT,look.legs,look.style,look.outer]);
 var C=CACHE[key];if(!C){if(CACHE_N>48){CACHE={};CACHE_N=0}C=CACHE[key]={};CACHE_N++}
 var B=C.B||(C.B=(function(){var B=shape(W);B.nrm=normals(B.pos,P.otri,NB);return B})());
 var g=new T.Group(),S=skeleton(B.J),root=S.bones[0];g.add(root);
 // which body triangles hide under clothes
 var garments=[];
 var bg=C.body||(C.body=(function(){var hide=new Uint8Array(P.otri.length/3);
 function cover(name){var t=P.tmpl[name];for(var i=0;i<t.length;i++)hide[t[i]]=1}
 // keep a ring of skin under every hem so a gap can never show
 [topT,botT,'shoes'].forEach(function(n){if(n)cover(n)});
 var keep=new Uint8Array(NB);[topT,botT,'shoes'].forEach(function(n){if(!n)return;var t=trisOf(P.tmpl[n]);var R=regionVerts(t);var ec=new Map();for(var i=0;i<t.length;i+=3)for(var j=0;j<3;j++){var a=t[i+j],b=t[i+(j+1)%3],k=a<b?a*65536+b:b*65536+a;ec.set(k,(ec.get(k)||0)+1)}ec.forEach(function(c,k){if(c===1){keep[Math.floor(k/65536)]=1;keep[k%65536]=1}})});
 for(var ti=0;ti<hide.length;ti++)if(hide[ti]){var a=P.otri[ti*3],b=P.otri[ti*3+1],c=P.otri[ti*3+2];if(keep[a]||keep[b]||keep[c])hide[ti]=0}
 // body geometry (UV-split): only positions, normals and the visible triangles are this person's
 var ns=H.ns,sp=P.split,pos=new Float32Array(ns*3),nrm=new Float32Array(ns*3),SH=shared();
 for(var i=0;i<ns;i++){var v=sp[i];for(var j=0;j<3;j++){pos[i*3+j]=B.pos[v*3+j];nrm[i*3+j]=B.nrm[v*3+j]}}
 var idx=[];for(i=0;i<hide.length;i++)if(!hide[i])idx.push(P.tri[i*3],P.tri[i*3+1],P.tri[i*3+2]);
 var bg=new T.BufferGeometry();bg.setAttribute('position',new T.BufferAttribute(pos,3));bg.setAttribute('normal',new T.BufferAttribute(nrm,3));bg.setAttribute('uv',SH.uv);
 bg.setAttribute('skinIndex',SH.si);bg.setAttribute('skinWeight',SH.sw);bg.setAttribute('hf',SH.hf);bg.setAttribute('stc',SH.stache);bg.setIndex(new T.BufferAttribute(new Uint16Array(idx),1));
 bg.morphAttributes.position=SH.morph;bg.morphTargetsRelative=true;bg.computeBoundingSphere();return bg})());
 var smat=skinMat(look,ctx);smat.morphTargets=true;
 var body=new T.SkinnedMesh(bg,smat);body.morphTargetInfluences=[0,0];body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;g.add(body);body.bind(S.sk,new T.Matrix4());
 function addGarment(geo,mat){var m=new T.SkinnedMesh(geo,mat);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;g.add(m);m.bind(S.sk,new T.Matrix4());garments.push(m);return m}
 // ----- top
 var J=B.J,pelv=jv(J,'pelvis'),neck=jv(J,'neck_01'),sp3=jv(J,'spine_03'),hipY=jv(J,'thigh_l').y;
 var pat={stripes:1,hoops:2,halves:3,sash:4,pinstripe:5,diagonal:4}[o.pat]||0;
 var jacket=false,topCol=look.top;
 var thickTop=jacket?.024:.011;
 var drapeTop=function(p,n,R){var bust=sp3.y+(neck.y-sp3.y)*.42,blade=sp3.y+(neck.y-sp3.y)*.5,bins={},bb={},TB={};[BONE.pelvis,BONE.spine_01,BONE.spine_02,BONE.spine_03].forEach(function(x){TB[x]=1});
  function key(x){return Math.round(x/.025)}
  for(var i=0;i<n;i++){var v=R.list[i];if(!TB[P.ski[v*4]])continue;var x=p[i*3],y=p[i*3+1],z=p[i*3+2],k=key(x);if(Math.abs(y-bust)<.05&&z>sp3.z){if(bins[k]==null||z>bins[k])bins[k]=z}if(Math.abs(y-blade)<.06&&z<sp3.z){if(bb[k]==null||z<bb[k])bb[k]=z}}
  function soft(o){var r={};Object.keys(o).forEach(function(k){k=+k;var s=0,c=0;for(var d=-3;d<=3;d++)if(o[k+d]!=null){s+=o[k+d];c++}r[k]=s/c});return r}bins=soft(bins);bb=soft(bb);
  for(i=0;i<n;i++){v=R.list[i];if(!TB[P.ski[v*4]])continue;x=p[i*3];y=p[i*3+1];z=p[i*3+2];k=key(x);
   if(y<bust&&z>sp3.z&&bins[k]!=null){var tz=bins[k]-(bust-y)*.18;if(tz>z)p[i*3+2]=z+(tz-z)*.85}
   if(y<blade&&z<sp3.z&&bb[k]!=null){var tb=bb[k]+(blade-y)*.1;if(tb<z)p[i*3+2]=z+(tb-z)*.7}}};
 var TORSOB={};[BONE.pelvis,BONE.spine_01,BONE.spine_02,BONE.spine_03,BONE.clavicle_l,BONE.clavicle_r,BONE.neck_01].forEach(function(x){TORSOB[x]=1});
 var shapeTop=function(p,n,R,ln,bnd){var list=[],all=[],inSet=new Uint8Array(n);for(var i=0;i<n;i++){var v=R.list[i];if(!TORSOB[P.ski[v*4]])continue;all.push(i);if(!bnd[i]||p[i*3+1]<sp3.y-.1){list.push(i);inSet[i]=1}}
  var spz=function(y){return sp3.z};smoothSet(p,list,ln,inSet,6);clothEnvelope(p,list,spz,.32,.06);smoothSet(p,list,ln,inSet,10);sliceHull(p,list,function(){return 0},.014,.0);smoothSet(p,list,ln,inSet,4)};
 function centroid(ti){var k=ti*3,a=P.otri[k],b=P.otri[k+1],c=P.otri[k+2];return[(B.pos[a*3]+B.pos[b*3]+B.pos[c*3])/3,(B.pos[a*3+1]+B.pos[b*3+1]+B.pos[c*3+1])/3,(B.pos[a*3+2]+B.pos[b*3+2]+B.pos[c*3+2])/3]}
 function innerTris(){var t=P.tmpl[topT];if(!look.outer)return t;var keep=[],open=look.outer!=='track';for(var i=0;i<t.length;i++){var q=centroid(t[i]),k3=P.otri[t[i]*3];if(!TORSOB[P.ski[k3*4]])continue;if(q[2]<sp3.z-.01&&q[1]<neck.y-.03)continue;
   if(open){var gp=.05+.035*sstep(sp3.y-.05,neck.y,q[1])+.03;if((q[2]>sp3.z-.01&&(Math.abs(q[0]-pelv.x)<gp||(look.outer!=='cardigan'&&q[1]<hipY+.04)))||q[1]>neck.y-.05)keep.push(t[i])}
   else if(q[1]>neck.y-.05)keep.push(t[i])}return new Uint16Array(keep)}
 var gT=C.top||(C.top=grow(B,trisOf(innerTris()),{aoK:P.dbg==='noao'?0:45,loose:true,shape:shapeTop,thick:function(v,x,y,z){var t=TORSOB[P.ski[v*4]]?thickTop:thickTop*.6;
   // a shirt stands off the chest and hangs straight from it; tighter at the shoulders
   if(y<sp3.y&&y>hipY-.05)t+=.008*(1-sstep(sp3.y-.05,sp3.y+.05,y));if(z<0)t+=.002;return t},relax:jacket?14:10,min:jacket?.012:.005,folds:jacket?.0035:.0026}));
 addGarment(gT.geo,clothMat({a:topCol,b:o.top2||topCol,pat:jacket?0:pat,rough:jacket?.72:.88,sheen:jacket?.08:.12},ctx));
 // ----- an outer layer: a jacket or a cardigan hangs open over the shirt; a track top is zipped
 if(look.outer){var open=look.outer!=='track',gO=C.outer||(C.outer=(function(){var t=look.outer==='track'?P.tmpl.long:P.tmpl.jacket,keep=[],bp=P.pos,y0=P.y0;
   var nY=neck.y,s3=sp3.y;for(var i=0;i<t.length;i++){var k=t[i]*3,a=P.otri[k],b=P.otri[k+1],c=P.otri[k+2];
    var cx=(B.pos[a*3]+B.pos[b*3]+B.pos[c*3])/3,cy=(B.pos[a*3+1]+B.pos[b*3+1]+B.pos[c*3+1])/3,cz=(B.pos[a*3+2]+B.pos[b*3+2]+B.pos[c*3+2])/3;
    if(look.outer!=='cardigan'&&cy<hipY+.02)continue;
    if(open&&cz>sp3.z&&cy<nY-.02){var gap=.05+.035*sstep(s3-.05,nY,cy);if(Math.abs(cx-pelv.x)<gap)continue}
    keep.push(t[i])}
   return grow(B,trisOf(keep),{aoK:40,loose:true,shape:shapeTop,thick:function(v,x,y,z){var t2=TORSOB[P.ski[v*4]]?thickTop+.009:.007;if(TORSOB[P.ski[v*4]]&&y<sp3.y&&y>hipY-.05)t2+=.008*(1-sstep(sp3.y-.05,sp3.y+.05,y));if(z<0)t2+=.004;return t2},relax:14,min:.014,folds:.004,hemSmooth:10})})());
  var oc=look.outerCol||'#3a4a6a',den=!!o.denimJacket;
  addGarment(gO.geo,clothMat({a:oc,b:'#f2ede4',pat:look.outer==='track'?9:look.outer==='cardigan'?10:den?8:0,rough:look.outer==='track'?.55:look.outer==='cardigan'?.95:.8,sheen:look.outer==='track'?.18:.06,weave:den?1.4:1},ctx))}
 // ----- legs
 if(botT){var crotchY=pelv.y-.09,knL=jv(J,'calf_l'),anL=jv(J,'foot_l');
  var shapeBot=function(p,n,R,ln,bnd){var list=[],all=[],inSet=new Uint8Array(n);for(var i=0;i<n;i++){if(!bnd[i]||p[i*3+1]<pelv.y-.25)all.push(i);if(!bnd[i]){list.push(i);inSet[i]=1}}
   smoothSet(p,list,ln,inSet,10);
   sliceHull(p,list.filter(function(i){return p[i*3+1]>=crotchY}),function(){return 0},.016,.003);
   // straight leg: below the knee the trouser keeps the knee's width
   var kr={};list.forEach(function(i){var y=p[i*3+1];if(y>crotchY)return;var sd=p[i*3]>pelv.x?1:2,ax=sd===1?jv(J,'calf_l'):jv(J,'calf_r');if(Math.abs(y-ax.y)<.03){var r=Math.hypot(p[i*3]-ax.x,p[i*3+2]-ax.z);kr[sd]=Math.max(kr[sd]||0,r)}});
   all.forEach(function(i){var y=p[i*3+1],sd=p[i*3]>pelv.x?1:2,kn=sd===1?jv(J,'calf_l'):jv(J,'calf_r'),an=sd===1?jv(J,'foot_l'):jv(J,'foot_r');if(y>kn.y||!kr[sd])return;var t=(kn.y-y)/(kn.y-an.y),ax=kn.x+(an.x-kn.x)*t,az=kn.z+(an.z-kn.z)*t+.012*t,dx=p[i*3]-ax,dz=p[i*3+2]-az,d=Math.hypot(dx,dz)||1,want=kr[sd]*(1-.12*t);if(want>d){p[i*3]=ax+dx/d*want;p[i*3+2]=az+dz/d*want}});
   smoothSet(p,list,ln,inSet,8)};
  var gB=C.bot||(C.bot=grow(B,trisOf(P.tmpl[botT]),{loose:true,shape:shapeBot,thick:function(v,x,y,z){return .008},relax:8,min:.005,folds:.0032}));
  addGarment(gB.geo,clothMat({a:look.bot,pat:o.denim?8:(o.stripe||o.trackPants)?7:0,b:'#f2ede4',rough:o.trackPants?.55:.9,sheen:o.trackPants?.15:.06,weave:o.denim?1.4:1},ctx))}
 else if(look.legs==='skirt'){var sk=C.skirt||(C.skirt=skirtGeo(B,o));addGarment(sk,clothMat({a:o.skirt,rough:.9,sheen:.1},ctx))}
 // ----- shoes
 var shoeCol=o.shoe||(ph.age<30&&hashf(o._id+'sh')<.6?'#f2ede4':'#2a2220');
 ['l','r'].forEach(function(side){addGarment(C['shoe'+side]||(C['shoe'+side]=shoeGeo(B,side,o)),clothMat({a:shoeCol,pat:6,b:shoeCol,c:'#ece6dc',rough:.5,weave:.15,sheen:.05},ctx))});
 // ----- hair
 if(C.hair===undefined)C.hair=hairGeo(B,look,o,ph)||null;var hairMesh=C.hair?new T.SkinnedMesh(C.hair,hairMat(look.hair,look.style==='slick',ctx,(look.style==='curly'||look.style==='curlyLong')?1:0)):null;if(hairMesh){hairMesh.castShadow=true;hairMesh.frustumCulled=false}if(hairMesh){g.add(hairMesh);hairMesh.bind(S.sk,new T.Matrix4());garments.push(hairMesh)}
 // ----- eyes
 var headB=S.bones[BONE.head],headJ=jv(J,'head'),eyes=[];
 [0,1].forEach(function(s){var e=new T.Vector3(B.X[s*3],B.X[s*3+1],B.X[s*3+2]);var r=H.eyeRadius*.88;
  var em=new T.Mesh(new T.SphereGeometry(r,20,14),new T.MeshStandardMaterial({map:eyeTex(look.eye),roughness:.12,metalness:0}));ctx.own(em.material);
  em.material.emissive=new T.Color(.05,.045,.04);
  // UV sphere: put the iris at +z
  var gu=em.geometry.attributes.uv,gp=em.geometry.attributes.position;for(var q=0;q<gp.count;q++){var x=gp.getX(q)/r,y=gp.getY(q)/r,zz=gp.getZ(q)/r;var ang=Math.acos(clamp(zz,-1,1));var k=ang/PI;var phi=Math.atan2(y,x);gu.setXY(q,.5+Math.cos(phi)*k*.55*2,.5+Math.sin(phi)*k*.55*2)}gu.needsUpdate=true;
  var pivot=new T.Group();pivot.position.copy(e).sub(headJ);pivot.position.z-=r*.18;headB.add(pivot);pivot.add(em);eyes.push(pivot)});
 // ----- accessories (bind-space, on bones)
 accessories(o,look,B,S,ctx,ph);
 // contact shadow
 var cs=new T.Mesh(new T.CircleGeometry(.36,24),new T.MeshBasicMaterial({color:'#1a1016',transparent:true,opacity:.34,depthWrite:false}));cs.rotation.x=-PI/2;cs.position.y=.01;cs.renderOrder=1;ctx.own(cs.material);cs.material.color.convertSRGBToLinear();g.add(cs);
 // ----- the facade the old animation code drives
 var F=facade(g,B,S);F.u.o=o;F.u.ph=hashf(o._id+'ph')*6;F.u.blink=2+hashf(o._id+'b')*3;F.u.human={body:body,bones:S.bones,eyes:eyes,rest:F.rest,ph:ph,saccade:0,look:new T.Vector2()};
 g.userData=F.u;
 var sc=(o.s||1)/1.07*1.03;g.scale.setScalar(sc);
 g.position.set(o.x||0,0,o.z||0);g.rotation.y=o.ry||0;
 return g};

function skirtGeo(B,o){var J=B.J,pel=jv(J,'pelvis'),hip=jv(J,'thigh_l'),kn=jv(J,'calf_l');var top=pel.y+.04,bot=kn.y-.02,seg=36,rows=10;
 var hw=Math.abs(hip.x)+.11;var pos=[],idx=[],bind=[],si=[],sw=[],edge=[],ao=[];
 for(var r=0;r<=rows;r++){var t=r/rows,y=top+(bot-top)*t,rad=hw*(1+t*.55);for(var s=0;s<=seg;s++){var a=s/seg*PI*2;pos.push(Math.sin(a)*rad,y,pel.z+Math.cos(a)*rad*.8);bind.push(Math.sin(a)*rad,y+0,Math.cos(a)*rad);var side=Math.sin(a)>0?'thigh_l':'thigh_r';var wb=1-t*.7;si.push(BONE.pelvis,BONE[side],0,0);sw.push(wb,1-wb,0,0);edge.push(r===rows?0:.06);ao.push(r===0?.7:1)}}
 for(r=0;r<rows;r++)for(s=0;s<seg;s++){var a0=r*(seg+1)+s,b0=a0+1,c0=a0+seg+1,d0=c0+1;idx.push(a0,c0,b0,b0,c0,d0)}
 var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('bind',new T.Float32BufferAttribute(bind,3));g.setAttribute('edge',new T.Float32BufferAttribute(edge,1));g.setAttribute('ao',new T.Float32BufferAttribute(ao,1));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(idx);g.computeVertexNormals();return g}


/* ---------- shoes: a last shaped from the foot ---------- */
function shoeGeo(B,side,o){var J=B.J,fj=jv(J,'foot_'+side),bj=jv(J,'ball_'+side),FB=BONE['foot_'+side],BB=BONE['ball_'+side];
 var d=new T.Vector3(bj.x-fj.x,0,bj.z-fj.z).normalize(),l=new T.Vector3(d.z,0,-d.x),mn=1e9,mx=-1e9,lmn=1e9,lmx=-1e9;
 for(var i=0;i<NB;i++){var b0=P.ski[i*4];if(b0!==FB&&b0!==BB)continue;var x=B.pos[i*3]-fj.x,z=B.pos[i*3+2]-fj.z,a=x*d.x+z*d.z,c=x*l.x+z*l.z;if(a<mn)mn=a;if(a>mx)mx=a;if(c<lmn)lmn=c;if(c>lmx)lmx=c}
 var L=mx-mn+.028,s0=mn-.014,Wd=(lmx-lmn)+.022,lc=(lmx+lmn)/2,US=26,VS=18,pos=[],bind=[],si=[],sw=[],edge=[],ao=[],idx=[];
 for(var u=0;u<=US;u++){var t=u/US,end=Math.pow(Math.sin(Math.min(1,t*1.15+.0)*PI*.5),.35)*Math.pow(Math.sin(Math.min(1,(1-t)*3.2)*PI*.5),.5);
  var w=Wd*(.8+.25*Math.sin(t*PI*.9))*(.55+.45*end)*.5,h=(.095-.05*t+.012*Math.sin(t*PI))*(t>.82?(.4+.6*(1-t)/.18):1);
  var ax=fj.x+d.x*(s0+L*t)+l.x*lc,az=fj.z+d.z*(s0+L*t)+l.z*lc;var wt=sstep(.58,.78,t);
  for(var v=0;v<=VS;v++){var a2=v/VS*PI*2,ca=Math.cos(a2),sa=Math.sin(a2);var lx=Math.sign(ca)*Math.pow(Math.abs(ca),.55)*w*end,ly=sa>0?Math.pow(sa,.7)*h*end:Math.pow(-sa,3)*-.004;
   var y=Math.max(0,.012+ly);var X=ax+l.x*lx,Z=az+l.z*lx;pos.push(X,y,Z);bind.push(X,y,Z);si.push(FB,BB,0,0);sw.push(1-wt,wt,0,0);edge.push(.06);ao.push(1)}}
 for(u=0;u<US;u++)for(v=0;v<VS;v++){var A=u*(VS+1)+v,Bq=A+1,C=A+VS+1,Dq=C+1;idx.push(A,Bq,C,Bq,Dq,C)}
 var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('bind',new T.Float32BufferAttribute(bind,3));g.setAttribute('edge',new T.Float32BufferAttribute(edge,1));g.setAttribute('ao',new T.Float32BufferAttribute(ao,1));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(idx);g.computeVertexNormals();return g}

/* ---------- hair ---------- */
function hairGeo(B,look,o,ph){var st0=look.style,st=st0==='curlyLong'?'curly':st0;if(st==='buzz')return null;
 var head=jv(B.J,'head'),eyeY=(B.X[1]+B.X[4])/2,top=0,i;for(i=0;i<NB;i++)if(P.hair[i]>0&&B.pos[i*3+1]>top)top=B.pos[i*3+1];
 var lo={short:96,spiky:96,slick:100,curly:84,long:90,bun:94,pony:94,bald:150}[st]||96;
 if(ph.age>52&&!ph.fem&&st!=='bald')lo+=18;
 var tris=[],t=P.otri;
 for(i=0;i<t.length;i+=3){var a=t[i],b=t[i+1],c=t[i+2];if(Math.min(P.hair[a],P.hair[b],P.hair[c])<lo)continue;
  if(st==='bald'){var yy=(B.pos[a*3+1]+B.pos[b*3+1]+B.pos[c*3+1])/3;if(yy>top-.065)continue}tris.push(a,b,c)}
 if(!tris.length)return null;
 var vol={short:.014,spiky:.018,slick:.008,curly:.028,long:.02,bun:.015,pony:.014,bald:.008}[st]||.016;
 if(ph.fem&&st==='short')vol=.026;
 var gr=grow(B,new Uint32Array(tris),{clearAll:true,thick:function(v,x,y,z){var k=sstep(lo,lo+120,P.hair[v]),up=sstep(eyeY+.02,top,y),tt=vol*(.06+.94*k)*(st==='curly'?(.7+.35*up):(.38+.8*up));
   if(st==='curly')tt+=k*(.008*(Math.sin(x*260+Math.sin(z*90)*2)*Math.sin(y*240)*Math.sin(z*250+x*40)+.7)+.005*Math.sin(x*520)*Math.sin(y*480+z*300));
   if(st==='spiky'&&up>.5)tt+=.022*Math.max(0,Math.sin(x*90+z*60)*Math.sin(z*80))*k;
   return tt},relax:st==='curly'?3:7,relaxEdge:false,min:.0025,hemSmooth:10});
 var geo=gr.geo;
 if(st0==='long'||st0==='curlyLong')geo=curtain(gr,B,head,eyeY,ph,st0==='curlyLong'?{len:ph.age<14?.12:.17,curl:1}:null);
 if(st==='pony'||st==='bun')geo=knot(geo,B,st,head,top,eyeY);
 return geo}
function geoFrom(o){var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(o.pos,3));g.setAttribute('bind',new T.Float32BufferAttribute(o.bind,3));g.setAttribute('edge',new T.Float32BufferAttribute(o.edge,1));g.setAttribute('ao',new T.Float32BufferAttribute(o.ao,1));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(o.si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(o.sw,4));g.setIndex(o.idx);g.computeVertexNormals();return g}
function unpack(geo){var A=geo.attributes;return{pos:Array.from(A.position.array),bind:Array.from(A.bind.array),edge:Array.from(A.edge.array),ao:Array.from(A.ao.array),si:Array.from(A.skinIndex.array),sw:Array.from(A.skinWeight.array),idx:Array.from(geo.index.array)}}
/* long hair: the scalp's own back and side edge, carried down past the jaw to the shoulders */
function curtain(gr,B,head,eyeY,ph,opt){opt=opt||{};var o=unpack(gr.geo),n=o.pos.length/3,bl=gr.bl,i,HB=BONE.head,NBn=BONE.neck_01,SB=BONE.spine_03;
 // walk the longest boundary loop
 var seen=new Uint8Array(n),best=[];for(i=0;i<n;i++){if(seen[i]||bl[i].length!==2)continue;var loop=[i],prev=-1,cur=i;seen[i]=1;while(true){var nx=bl[cur][0]===prev?bl[cur][1]:bl[cur][0];if(nx==null||nx===i||seen[nx]||bl[nx].length!==2)break;seen[nx]=1;loop.push(nx);prev=cur;cur=nx}if(loop.length>best.length)best=loop}
 var ang=function(k){return Math.atan2(o.pos[k*3]-head.x,o.pos[k*3+2]-head.z)};
 var sel=best.map(function(k){return Math.abs(ang(k))>1.05});
 // start the run at a non-selected vertex so runs don't wrap
 var st0=sel.indexOf(false);if(st0<0)st0=0;var order=best.slice(st0).concat(best.slice(0,st0)),sl=sel.slice(st0).concat(sel.slice(0,st0));
 var rows=9,len=opt.len||(ph.age<14?.15:.25),neckY=jv(B.J,'neck_01').y;
 function col(k){var x=o.pos[k*3],y=o.pos[k*3+1],z=o.pos[k*3+2],dx=x-head.x,dz=z-head.z,r0=Math.hypot(dx,dz)||1,ux=dx/r0,uz=dz/r0,th=Math.abs(Math.atan2(dx,dz)),ids=[];
  o.edge[k]=.06;
  for(var r=1;r<=rows;r++){var t=r/rows,yy=y-len*t,rr=r0+.006+.018*t+(yy<neckY+.02?.03*(neckY+.02-yy)/.1:0),back=th<2.3?.07*t*t:0;
   if(opt.curl){rr+=.022*t+.012*Math.sin(th*14+r*1.9)*Math.sin(r*2.3+th*5)}var X=head.x+ux*rr,Z=head.z+uz*rr-back,w=clamp(1-t*1.2,0,1);o.pos.push(X,yy,Z);o.bind.push(X,yy,Z);o.si.push(HB,t<.5?NBn:SB,0,0);o.sw.push(w,1-w,0,0);o.edge.push(r===rows?0:.06);o.ao.push(1);ids.push(o.pos.length/3-1)}
  return ids}
 var prevCol=null,prevK=-1;for(i=0;i<order.length;i++){if(!sl[i]){prevCol=null;continue}var k=order[i],c=col(k);
  if(prevCol){var a0=[prevK].concat(prevCol),b0=[k].concat(c);for(var r=0;r<rows;r++){o.idx.push(a0[r],b0[r],a0[r+1],b0[r],b0[r+1],a0[r+1])}}
  prevCol=c;prevK=k}
 return geoFrom(o)}
function knot(geo,B,st,head,top,eyeY){var o=unpack(geo),HB=BONE.head,NBn=BONE.neck_01;var back=1e9;for(var i=0;i<NB;i++)if(P.hair[i]>90&&B.pos[i*3+2]<back)back=B.pos[i*3+2];
 var c=st==='bun'?new T.Vector3(head.x,top-.02,back+.035):new T.Vector3(head.x,eyeY+.045,back-.012);var R=st==='bun'?.045:.034,Lg=st==='bun'?0:.19,segs=16,rings=st==='bun'?10:14,base=o.pos.length/3;
 for(i=0;i<=rings;i++){var v=i/rings;for(var j=0;j<=segs;j++){var u=j/segs*PI*2,x,y,z,w;
   if(st==='bun'){var th=v*PI;x=c.x+Math.sin(th)*Math.cos(u)*R;y=c.y+Math.cos(th)*R*.8;z=c.z-.01+Math.sin(th)*Math.sin(u)*R;w=1}
   else{var rr=R*(1-v*.7)*(v<.12?.55+v/.12*.45:1);var cx=c.x,cy=c.y-v*Lg,cz=c.z-.03*v-.03*v*v;x=cx+Math.cos(u)*rr;y=cy;z=cz+Math.sin(u)*rr;w=clamp(1-v*.9,0,1)}
   o.pos.push(x,y,z);o.bind.push(x,y,z);o.si.push(HB,NBn,0,0);o.sw.push(w,1-w,0,0);o.edge.push(st==='pony'&&i===rings?0:.06);o.ao.push(1)}}
 for(i=0;i<rings;i++)for(j=0;j<segs;j++){var a0=base+i*(segs+1)+j,b0=a0+1,c0=a0+segs+1,d0=c0+1;o.idx.push(a0,c0,b0,b0,c0,d0)}
 return geoFrom(o)}

/* ---------- accessories ---------- */
function attach(S,bone,obj,J,at){var b=S.bones[BONE[bone]],j=jv(J,bone);obj.position.copy(at).sub(j);b.add(obj);return obj}
function accessories(o,look,B,S,ctx,ph){var J=B.J,head=jv(J,'head'),top=0;for(var i=0;i<NB;i++)if(P.hair[i]>0&&B.pos[i*3+1]>top)top=B.pos[i*3+1];
 function std(c,x){var m=new T.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.8,metalness:0},x||{}));ctx.own(m);return m}
 var eL=new T.Vector3(B.X[0],B.X[1],B.X[2]),eR=new T.Vector3(B.X[3],B.X[4],B.X[5]),eC=eL.clone().add(eR).multiplyScalar(.5);
 var hr=Math.abs(eL.x-eR.x)*1.55;// head half-width-ish
 if(look.outer==='track'){var nk0=jv(J,'neck_01');var col=new T.Mesh(new T.TorusGeometry(1,.32,10,32),std(look.outerCol||'#b02d10',{roughness:.55}));col.rotation.x=PI/2.15;col.scale.set(.068,.062,.052);attach(S,'neck_01',col,J,nk0.clone().add(new T.Vector3(0,-.005,.008)))}
 if(o.glasses){var gg=new T.Group();[eL,eR].forEach(function(e){var rim=new T.Mesh(new T.TorusGeometry(.021,.0022,6,24),std('#3a3030',{metalness:.4,roughness:.4}));rim.position.set(e.x-eC.x,0,0);rim.scale.y=.8;gg.add(rim)});
  var br=new T.Mesh(new T.CylinderGeometry(.0018,.0018,Math.abs(eL.x-eR.x)-.042,5),std('#3a3030'));br.rotation.z=PI/2;br.position.y=.004;gg.add(br);
  [1,-1].forEach(function(s){var arm=new T.Mesh(new T.CylinderGeometry(.0016,.0016,.09,4),std('#3a3030'));arm.rotation.x=PI/2;arm.position.set(s*(Math.abs(eL.x-eR.x)/2+.02),.004,-.045);gg.add(arm)});
  attach(S,'head',gg,J,eC.clone().add(new T.Vector3(0,0,H.eyeRadius*.95+.006)))}
 if(o.beanie||o.cap){var col=o.beanie||o.cap,cap=new T.Mesh(new T.SphereGeometry(1,24,14,0,PI*2,0,PI*.52),std(col,{roughness:o.beanie?.95:.7}));
  var c=new T.Vector3(head.x,top-.075,head.z-.012);cap.scale.set(hr*.94,.105,hr*1.08);attach(S,'head',cap,J,c);
  var cuff=new T.Mesh(new T.TorusGeometry(1,.16,8,28),std(col,{roughness:.95}));cuff.rotation.x=PI/2;cuff.scale.set(hr*.95,hr*1.08,.11);attach(S,'head',cuff,J,c.clone().add(new T.Vector3(0,.008,0)));
  if(o.cap){var bill=new T.Mesh(new T.CylinderGeometry(.075,.075,.008,20,1,false,-PI/2,PI),std(col));bill.scale.set(1.05,1,1.1);attach(S,'head',bill,J,c.clone().add(new T.Vector3(0,.012,hr*1.05)))}}
 if(o.scarf){var sc=o.scarf,n=jv(J,'neck_01'),s3=jv(J,'spine_03'),pl=jv(J,'pelvis');var sg=new T.Group();
  var nz=n.z,R0=.066,chestZ=-1;for(var qq=0;qq<NB;qq++){var yy=B.pos[qq*3+1];if(Math.abs(yy-(n.y-.16))<.03&&Math.abs(B.pos[qq*3])<.08&&B.pos[qq*3+2]>chestZ)chestZ=B.pos[qq*3+2]}var fz=chestZ+(look.outer?.045:.025);var pts=[];for(var q=0;q<=20;q++){var an=-PI*.15+q/20*PI*2.3;pts.push(new T.Vector3(Math.sin(an)*R0*1.12,n.y-.035+Math.cos(an)*.006,nz+Math.cos(an)*R0*.95))}
  var ring=new T.CatmullRomCurve3(pts,false);var tg=new T.TubeGeometry(ring,48,.021,8,false);tg.scale(1,1,1);
  function blocks(g,len){var p2=g.attributes.position,cl=new Float32Array(p2.count*3),A=lin(sc[0]),B2=lin(sc[1]||'#efe9de'),uv=g.attributes.uv;for(var i2=0;i2<p2.count;i2++){var u=uv.getX(i2)*len,cc=Math.floor(u/.06)%2?B2:A;cl[i2*3]=cc.r;cl[i2*3+1]=cc.g;cl[i2*3+2]=cc.b}g.setAttribute('color',new T.BufferAttribute(cl,3))}
  blocks(tg,.9);var km=new T.MeshStandardMaterial({vertexColors:true,roughness:.97});ctx.own(km);sg.add(new T.Mesh(tg,km));
  [[.045,1],[-.035,.86]].forEach(function(t,ix){var x0=t[0],L0=.34*t[1];var tp=[new T.Vector3(x0,n.y-.05,nz+R0*.9),new T.Vector3(x0*1.1,n.y-.13,fz+(ix?0:.008)),new T.Vector3(x0*1.15,n.y-.05-L0,fz-.01)];var cv=new T.CatmullRomCurve3(tp);var g2=new T.TubeGeometry(cv,24,.02,8,false);g2.scale(1,1,1);
   var pp=g2.attributes.position;for(var i3=0;i3<pp.count;i3++){var dx=pp.getX(i3)-x0*1.1;pp.setX(i3,x0*1.1+dx*1.9);var dz=pp.getZ(i3)-fz;pp.setZ(i3,fz+dz*.45)}g2.computeVertexNormals();blocks(g2,L0);var tm=new T.Mesh(g2,km);tm.castShadow=true;sg.add(tm)});
  sg.children.forEach(function(m2){m2.castShadow=true});attach(S,'spine_03',sg,J,new T.Vector3(0,0,0))}
 if(o.apron){var pla=jv(J,'pelvis'),hw=0;for(var qa=0;qa<NB;qa++){if(Math.abs(B.pos[qa*3+1]-pla.y)<.02)hw=Math.max(hw,Math.abs(B.pos[qa*3]-pla.x),Math.abs(B.pos[qa*3+2]-pla.z)*1.3)}var apg=new T.CylinderGeometry(hw*1.0,hw*1.18,.5,18,4,true,-1.05,2.1);apg.scale(1,1,.78);var ap=new T.Mesh(apg,std(o.apron,{side:T.DoubleSide,roughness:.92}));ap.castShadow=true;attach(S,'pelvis',ap,J,new T.Vector3(pla.x,pla.y-.17,pla.z+.012));var tie=new T.Mesh(new T.TorusGeometry(1,.012,4,40),std(o.apron));tie.rotation.x=PI/2;tie.scale.set(hw*1.03,hw*.82,1);attach(S,'pelvis',tie,J,new T.Vector3(pla.x,pla.y+.075,pla.z))}
 if(o.pack){var pk=new T.Mesh(new T.BoxGeometry(.28,.36,.13),std(o.pack));var s3b=jv(J,'spine_02');attach(S,'spine_02',pk,J,new T.Vector3(0,s3b.y+.06,s3b.z-.17))}
 if(o.bag){var bgm=new T.Mesh(new T.BoxGeometry(.2,.22,.07),std(o.bag));var pl2=jv(J,'pelvis');attach(S,'pelvis',bgm,J,new T.Vector3(-.2,pl2.y-.02,pl2.z+.04))}
 if(o.necklace){var nk=new T.Mesh(new T.TorusGeometry(1,.06,6,24),std('#d8c8a8',{metalness:.7,roughness:.3}));nk.rotation.x=PI/2.3;nk.scale.set(.07,.07,.07);var nn=jv(J,'neck_01');attach(S,'neck_01',nk,J,nn.clone().add(new T.Vector3(0,-.035,.025)))}
 if(o.watch){var hl=jv(J,'hand_l');var wt=new T.Mesh(new T.TorusGeometry(.03,.007,6,14),std('#3a3a44',{metalness:.5}));attach(S,'lowerarm_l',wt,J,hl.clone().lerp(jv(J,'lowerarm_l'),.08))}}

/* ---------- the facade: same names, same rotation conventions as the procedural doll ---------- */
function facade(g,B,S){var J=B.J;var fx=new T.Group();fx.visible=true;g.add(fx);
 var pel=jv(J,'pelvis');fx.position.y=pel.y-.95;
 var hips=new T.Group();hips.position.set(pel.x,.95,pel.z);hips.userData.p0=hips.position.clone();fx.add(hips);
 var torso=new T.Group();var s1=jv(J,'spine_01');torso.position.set(0,.02,0);hips.add(torso);
 var head=new T.Group();var hj=jv(J,'head');head.position.copy(hj).sub(pel).sub(torso.position);torso.add(head);
 function chainArm(side){var sh=new T.Group(),el=new T.Group(),hd=new T.Group(),ua=jv(J,'upperarm_'+side),la=jv(J,'lowerarm_'+side),ha=jv(J,'hand_'+side);
  sh.position.copy(ua).sub(pel).sub(torso.position);torso.add(sh);var l1=ua.distanceTo(la),l2=la.distanceTo(ha);el.position.set(0,-l1,0);sh.add(el);hd.position.set(0,-l2,0);el.add(hd);return{sh:sh,el:el,hand:hd}}
 function chainLeg(side){var h=new T.Group(),kn=new T.Group(),th=jv(J,'thigh_'+side),ca=jv(J,'calf_'+side);h.position.copy(th).sub(pel);hips.add(h);kn.position.set(0,-th.distanceTo(ca),0);h.add(kn);return{h:h,kn:kn}}
 var arms=[chainArm('r'),chainArm('l')],legs=[chainLeg('r'),chainLeg('l')];
 var eyes=[{e:new T.Object3D()},{e:new T.Object3D()}],mouth=new T.Object3D();
 // the rest pose: arms come down from MakeHuman's A-pose to hanging, slightly away from the thighs
 var rest={};
 function frame(d,n){var x=d.clone().normalize(),z=n.clone().sub(x.clone().multiplyScalar(n.dot(x))).normalize(),y=z.clone().cross(x);return new T.Matrix4().makeBasis(x,y,z)}
 function align(d0,n0,d1,n1){var A=frame(d0,n0),B=frame(d1,n1);return new T.Quaternion().setFromRotationMatrix(B.multiply(A.transpose()))}
 ['l','r'].forEach(function(side){var s=side==='l'?1:-1,ua=jv(J,'upperarm_'+side),la=jv(J,'lowerarm_'+side),ha=jv(J,'hand_'+side),mi=jv(J,'middle_01_'+side),ix=jv(J,'index_01_'+side),pk=jv(J,'pinky_01_'+side);
  var palm=ix.clone().sub(ha).cross(pk.clone().sub(ha)).normalize().multiplyScalar(s);
  var down=new T.Vector3(s*.1,-1,.04).normalize(),downF=new T.Vector3(s*.06,-1,.1).normalize(),inward=new T.Vector3(-s,0,.12).normalize();
  rest['ua_'+side]=new T.Quaternion().setFromUnitVectors(la.clone().sub(ua).normalize(),down);
  var qh=align(mi.clone().sub(ha),palm,downF,inward);rest['hd_'+side]=qh;
  // the forearm carries half of the hand's turn
  var ql=new T.Quaternion().setFromUnitVectors(ha.clone().sub(la).normalize(),downF);rest['la_'+side]=ql.clone().slerp(qh,.5)});
 // relaxed fingers: curl about the axis across the palm
 rest.curl={};['l','r'].forEach(function(s){var hd=jv(J,'hand_'+s),ix=jv(J,'index_01_'+s),pk=jv(J,'pinky_01_'+s);var across=ix.clone().sub(pk).normalize();
  ['index','middle','ring','pinky','thumb'].forEach(function(f){[1,2,3].forEach(function(k){var nm=f+'_0'+k+'_'+s,a=jv(J,nm),b=k<3?jv(J,f+'_0'+(k+1)+'_'+s):a.clone().add(a.clone().sub(jv(J,f+'_0'+(k-1)+'_'+s)));var dir=b.clone().sub(a).normalize();
   var ax=f==='thumb'?dir.clone().cross(across).normalize():across.clone().sub(dir.clone().multiplyScalar(across.dot(dir))).normalize();var ang=f==='thumb'?.2:(k===1?.18:k===2?.5:.32)*(f==='pinky'?1.35:f==='ring'?1.2:f==='index'?.8:1);
   rest.curl[nm]=new T.Quaternion().setFromAxisAngle(ax,(P.curlSign||1)*(s==='l'?1:-1)*ang)})})});
 return{u:{hips:hips,torso:torso,head:head,arms:arms,legs:legs,eyes:eyes,mouth:mouth},rest:rest}}

var _q=new T.Quaternion(),_q2=new T.Quaternion(),_qi=new T.Quaternion(),_e=new T.Euler(),ID=new T.Quaternion();
function qOf(o,out){return out.setFromEuler(o.rotation)}
/* pour the facade into the bones */
P.sync=function(g,t,dt){var u=g.userData,h=u.human;if(!h)return;var b=h.bones,R=h.rest;
 var pel=b[BONE.pelvis],base=pel.userData.p0||(pel.userData.p0=pel.position.clone()),h0=u.hips.userData.p0||(u.hips.userData.p0=u.hips.position.clone());
 pel.position.set(base.x+u.hips.position.x-h0.x,base.y+u.hips.position.y-h0.y,base.z+u.hips.position.z-h0.z);
 qOf(u.hips,pel.quaternion);
 // torso split across three spine bones (and a breath)
 qOf(u.torso,_q);var br=(u.torso.scale.y-1)*2.2;
 ['spine_01','spine_02','spine_03'].forEach(function(n,i){var q=b[BONE[n]].quaternion;q.copy(ID).slerp(_q,1/3);if(i===2)q.multiply(_q2.setFromAxisAngle(new T.Vector3(1,0,0),-br))});
 qOf(u.head,_q);b[BONE.neck_01].quaternion.copy(ID).slerp(_q,.38);b[BONE.head].quaternion.copy(ID).slerp(_q,.62);
 // arms
 [['r',0],['l',1]].forEach(function(e){var s=e[0],a=u.arms[e[1]],Wu=R['ua_'+s],Wl=R['la_'+s],Wh=R['hd_'+s];
  b[BONE['upperarm_'+s]].quaternion.copy(qOf(a.sh,_q)).multiply(Wu);
  b[BONE['lowerarm_'+s]].quaternion.copy(_qi.copy(Wu).invert()).multiply(qOf(a.el,_q)).multiply(Wl);
  b[BONE['hand_'+s]].quaternion.copy(_qi.copy(Wl).invert()).multiply(qOf(a.hand,_q)).multiply(Wh);
  // shoulders lift a little when the arm goes up
  var lift=clamp(-a.sh.rotation.x-1.2,0,1.6)*.22;b[BONE['clavicle_'+s]].quaternion.setFromAxisAngle(new T.Vector3(0,0,1),(s==='l'?1:-1)*lift);
  for(var k in R.curl)if(k.slice(-1)===s)b[BONE[k]].quaternion.copy(R.curl[k])});
 // legs, with an ankle that keeps the sole near the floor
 [['r',0],['l',1]].forEach(function(e){var s=e[0],l=u.legs[e[1]];b[BONE['thigh_'+s]].quaternion.copy(qOf(l.h,_q));b[BONE['calf_'+s]].quaternion.copy(qOf(l.kn,_q));
  var sum=l.h.rotation.x+l.kn.rotation.x;b[BONE['foot_'+s]].quaternion.setFromAxisAngle(new T.Vector3(1,0,0),-sum*.75)});
 // face: blink + jaw
 var bl=u.eyes[0].e.scale.y<.5?1:0,inf=h.body.morphTargetInfluences;inf[0]+=(bl-inf[0])*Math.min(1,(dt||.03)*30);
 var jo=clamp((u.mouth.scale.y-1)*.28,0,.55);inf[1]+=(jo-inf[1])*Math.min(1,(dt||.03)*18);
 // eyes: small saccades
 h.saccade-=dt||.03;if(h.saccade<0){h.saccade=.6+Math.random()*2.2;h.look.set((Math.random()-.5)*.25,(Math.random()-.5)*.12)}
 h.eyes.forEach(function(p){p.rotation.y+=(h.look.x-p.rotation.y)*.35;p.rotation.x+=(-h.look.y-p.rotation.x)*.35})};
})();
