/* rooms_club — club rooms, halls and arenas */
(function(){var RM=window.RM,T=THREE;
/* ---------- shared prop toolkit ---------- */
function H(c,grp){var g=grp||c.g,o={},C1=c.skin.c1,C2=c.skin.c2,C3=c.skin.c3;o.C1=C1;o.C2=C2;o.C3=C3;
 function rr_(r,w,h,d){return Math.max(.005,Math.min(r,w/2-.002,h/2-.002,d/2-.002))}
 /* box: centre x,z; y = bottom */
 o.B=function(w,h,d,x,y,z,col,op,r,par){var m=c.mesh(c.rbox(w,h,d,rr_(r===undefined?.06:r,w,h,d),2),c.std(col,op||{}),x,y+h/2,z,par||g);return m};
 o.C=function(rt,rb,h,x,y,z,col,op,seg,par){return c.mesh(new T.CylinderGeometry(rt,rb,h,seg||16),c.std(col,op||{}),x,y+h/2,z,par||g)};
 o.S=function(r,x,y,z,col,op,sx,sy,sz,par){var m=c.mesh(new T.SphereGeometry(r,16,12),c.std(col,op||{}),x,y,z,par||g);m.scale.set(sx||1,sy||1,sz||1);return m};
 o.P=function(w,h,x,y,z,mat,ry,rx,par){var m=new T.Mesh(new T.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);m.receiveShadow=true;(par||g).add(m);return m};
 o.bas=function(col,op){return new T.MeshBasicMaterial(Object.assign({color:col},op||{}))};
 o.G=function(x,y,z,col,size,op,par){var s=new T.Sprite(new T.SpriteMaterial({color:col,map:c.glowTex(),blending:T.AdditiveBlending,transparent:true,opacity:op===undefined?.6:op,depthWrite:false}));s.scale.set(size,size,1);s.position.set(x,y,z);(par||g).add(s);return s};
 /* text plane (canvas); opt: fs, weight, basic, rr, stroke, lines */
 o.T=function(txt,w,h,x,y,z,bg,fg,ry,opt){opt=opt||{};var pw=Math.round(Math.max(64,Math.min(1024,w*64))),ph=Math.max(32,Math.round(pw*h/w));var cv=c.cvs(pw,ph),k=cv.getContext('2d');
  if(bg){k.fillStyle=bg;if(opt.rr){c.rrect(k,0,0,pw,ph,opt.rr);k.fill()}else k.fillRect(0,0,pw,ph)}
  if(opt.border){k.strokeStyle=opt.border;k.lineWidth=Math.max(3,ph*.05);k.strokeRect(k.lineWidth,k.lineWidth,pw-2*k.lineWidth,ph-2*k.lineWidth)}
  var ls=String(txt).split('\n'),fs=Math.round(ph*(opt.fs||.5)/ls.length*(ls.length>1?1.25:1));k.fillStyle=fg;k.textAlign='center';k.textBaseline='middle';k.direction='ltr';
  for(var tries=0;tries<12;tries++){k.font=(opt.weight||'900')+' '+fs+'px Heebo, Arial, sans-serif';var mx=0;ls.forEach(function(l){mx=Math.max(mx,k.measureText(l).width)});if(mx<pw*.9)break;fs*=.88}
  if(opt.stroke){k.lineJoin='round';k.lineWidth=fs*.14;k.strokeStyle=opt.stroke}
  ls.forEach(function(l,i){var yy=ph/2+(i-(ls.length-1)/2)*fs*1.15+fs*.04;if(opt.stroke)k.strokeText(l,pw/2,yy);k.fillText(l,pw/2,yy)});
  var tx=c.tex(cv,1,1);var mat=opt.basic?new T.MeshBasicMaterial({map:tx,transparent:!bg}):new T.MeshStandardMaterial({map:tx,roughness:.85,transparent:!bg});if(opt.emit){mat=new T.MeshStandardMaterial({map:tx,emissiveMap:tx,emissive:'#ffffff',emissiveIntensity:opt.emit,roughness:.6,transparent:!bg})}
  var m=o.P(w,h,x,y,z,mat,ry||0,0,opt.par);m.castShadow=false;return m};
 /* waving cloth */
 o.cloth=function(w,h,x,y,z,tx,ry,amp,ph){var geo=new T.PlaneGeometry(w,h,14,6);var m=new T.Mesh(geo,new T.MeshStandardMaterial({map:tx,side:T.DoubleSide,roughness:.9}));m.position.set(x,y,z);m.rotation.y=ry||0;m.castShadow=true;g.add(m);var p=geo.attributes.position,o0=p.array.slice(),n=p.count,ph0=ph===undefined?c.rnd()*6:ph;
  c.tick(function(t){for(var i=0;i<n;i++){var k=(h/2-o0[i*3+1])/h;p.array[i*3+2]=Math.sin(t*1.5+o0[i*3]*.5+ph0)*(amp||.25)*k}p.needsUpdate=true;geo.computeVertexNormals()});return m};
 o.fabric=function(a,b,n,rot){var t=c.stripes(a,b,n);if(rot){t.center.set(.5,.5);t.rotation=Math.PI/2}return t};
 o.pendant=function(x,z,y,col,w){var gp=new T.Group();gp.position.set(x,y,z);g.add(gp);o.C(.04,.04,14,0,0,0,'#2a2a30',{},6,gp);
  var sh=c.mesh(new T.CylinderGeometry(w*.35,w,w*.7,18,1,true),c.std(col||'#2a2f3a',{side:T.DoubleSide,roughness:.5,metalness:.3}),0,-.4,0,gp);
  c.mesh(new T.SphereGeometry(w*.3,12,8),new T.MeshBasicMaterial({color:'#fff0e2'}),0,-.55,0,gp).castShadow=false;
  var gl=o.G(0,-.8,0,'#ffc7a0',w*5,.55,gp);var ph=c.rnd()*6;c.tick(function(t){gp.rotation.z=Math.sin(t*.8+ph)*.012;gl.material.opacity=.55+Math.sin(t*2+ph)*.03});return gp};
 o.chair=function(x,z,ry,col,seat){var gp=new T.Group();gp.position.set(x,0,z);gp.rotation.y=ry||0;g.add(gp);col=col||'#4a3a34';seat=seat||1.75;
  o.B(1.7,.2,1.7,0,seat-.2,0,col,{},.07,gp);o.B(1.7,1.9,.2,0,seat,-.8,col,{},.07,gp);[[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]].forEach(function(p){o.C(.08,.08,seat-.2,p[0],0,p[1],'#2a2a30',{metalness:.5,roughness:.4},6,gp)});return gp};
 o.mug=function(x,y,z,col){o.C(.28,.24,.5,x,y,z,col||'#f4f1ff',{roughness:.4},14);var h=c.mesh(new T.TorusGeometry(.14,.04,6,10,Math.PI),c.std(col||'#f4f1ff'),x+.3,y+.26,z,g);h.rotation.z=-Math.PI/2};
 o.cup=function(x,y,z,s,col){s=s||1;col=col||'#c4ccd6';var m={metalness:.85,roughness:.28};o.C(.55*s,.4*s,.15*s,x,y,z,col,m,14);o.C(.14*s,.14*s,.65*s,x,y+.15*s,z,col,m,10);o.C(.5*s,.17*s,.8*s,x,y+.8*s,z,col,m,16);[-1,1].forEach(function(sg){var h=c.mesh(new T.TorusGeometry(.27*s,.05*s,6,12,Math.PI),c.std(col,m),x+sg*.5*s,y+1.2*s,z,g);h.rotation.z=sg>0?-Math.PI/2:Math.PI/2})};
 o.drum=function(x,z,r,hgt,ry,body,rim,skinT){var gp=new T.Group();gp.position.set(x,0,z);gp.rotation.y=ry||0;g.add(gp);var sk=skinT||'#f0e8dc';
  o.C(r,r,hgt,0,0,0,body||C1,{roughness:.35,metalness:.1},28,gp);[0,hgt-.06].forEach(function(yy){o.C(r*1.04,r*1.04,.16,0,yy,0,rim||'#aeb4bf',{metalness:.85,roughness:.3},28,gp)});
  var hd=c.mesh(new T.CylinderGeometry(r*.97,r*.97,.05,28),c.std(sk,{roughness:.5}),0,hgt+.04,0,gp);o.C(r*.55,r*.55,.02,0,hgt+.07,0,'#e8dcd0',{roughness:.7},20,gp);
  for(var i=0;i<8;i++){var a=i/8*6.28;o.C(.05,.05,hgt*.9,Math.cos(a)*r*1.05,hgt*.05,Math.sin(a)*r*1.05,'#aeb4bf',{metalness:.85,roughness:.3},5,gp)}return gp};
 o.bottle=function(x,y,z,col,h){h=h||1.1;o.C(.2,.22,h*.65,x,y,z,col,{roughness:.1,transparent:true,opacity:.85},10);o.C(.07,.1,h*.35,x,y+h*.65,z,col,{roughness:.1,transparent:true,opacity:.85},8)};
 o.box=function(w,h,d,x,y,z,ry,lbl){var gp=new T.Group();gp.position.set(x,y,z);gp.rotation.y=ry||0;g.add(gp);o.B(w,h,d,0,0,0,'#c9a58a',{roughness:.95},.05,gp);o.B(w*1.01,.1,d*1.01,0,h*.5,0,'#a98068',{roughness:.95},.02,gp);if(lbl)o.T(lbl,w*.55,h*.3,0,h*.55,d*.505,'#f6f2ea','#2a2a34',0,{fs:.6,par:gp});return gp};
 o.shell=function(opt){return c.shell(opt)};
 /* instanced crowd: spots [{x,y,z,s}] y = seat top; palette arrays */
 o.crowd=function(spots,opt){opt=opt||{};var n=spots.length,sk=c.SK,cols=opt.cols||[C1,C1,C1,C2,C3,'#6a7fb0','#d8c8c0'],ry=opt.ry||0;
  var tg=new T.BoxGeometry(1.5,2.1,.9),hg=new T.SphereGeometry(.6,10,8),sg=new T.BoxGeometry(1.6,.34,1.0),arm=new T.BoxGeometry(.4,1.9,.5);
  var mt=new T.InstancedMesh(tg,new T.MeshStandardMaterial({color:'#fff',roughness:.9}),n),mh=new T.InstancedMesh(hg,new T.MeshStandardMaterial({color:'#fff',roughness:.6}),n),ms=new T.InstancedMesh(sg,new T.MeshStandardMaterial({color:'#fff',roughness:.95}),n);
  var ma=new T.InstancedMesh(arm,new T.MeshStandardMaterial({color:'#fff',roughness:.9}),n*2);
  var d=new T.Object3D(),col=new T.Color(),ph=[],up=[];
  function L(h){return col.set(h).convertSRGBToLinear()}
  for(var i=0;i<n;i++){var s=spots[i];ph.push(c.rnd()*6.28);up.push(c.rnd()<(opt.cheer===undefined?.35:opt.cheer));mt.setColorAt(i,L(cols[Math.floor(c.rnd()*cols.length)]));mh.setColorAt(i,L(sk[Math.floor(c.rnd()*5)]));ms.setColorAt(i,L(c.rnd()<.6?C1:C2));ma.setColorAt(i*2,L('#fff'));ma.setColorAt(i*2+1,L('#fff'))}
  mt.instanceColor.needsUpdate=mh.instanceColor.needsUpdate=ms.instanceColor.needsUpdate=true;
  function upd(t){for(var i=0;i<n;i++){var s=spots[i],sc=s.s||1,b=up[i]?Math.max(0,Math.sin(t*6+ph[i]))*.5:Math.sin(t*1.2+ph[i])*.04;d.rotation.set(0,ry,0);d.scale.set(sc,sc,sc);d.position.set(s.x,s.y+1.05*sc+b,s.z);d.updateMatrix();mt.setMatrixAt(i,d.matrix);
    d.position.set(s.x,s.y+2.7*sc+b,s.z);d.updateMatrix();mh.setMatrixAt(i,d.matrix);
    d.position.set(s.x,s.y+2.0*sc+b,s.z+.25*sc);d.updateMatrix();ms.setMatrixAt(i,d.matrix);
    for(var k=0;k<2;k++){var ar=up[i];d.position.set(s.x+(k?.95:-.95)*sc,s.y+(ar?3.3:1.3)*sc+b,s.z);d.rotation.set(0,ry,ar?(k?-.3:.3)+Math.sin(t*6+ph[i])*.3:0);d.updateMatrix();ma.setMatrixAt(i*2+k,d.matrix)}}
   [mt,mh,ms,ma].forEach(function(m){m.instanceMatrix.needsUpdate=true})}
  upd(0);[mt,mh,ms,ma].forEach(function(m){m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;g.add(m)});
  /* arms use torso colour: paint after */
  for(i=0;i<n;i++){var tc=new T.Color();mt.getColorAt(i,tc);ma.setColorAt(i*2,tc);ma.setColorAt(i*2+1,tc)}ma.instanceColor.needsUpdate=true;
  var fr=0;c.tick(function(t){if((fr++)%3===0)upd(t)});return mt};
 return o}
function SKI(c,i){return c.SK[i%5]}
window.__H=H;
/* ================= community-room ================= */
RM.def('community-room',{kind:'club-room',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 c.shell({wall:'#e2c4ae',wall2:'#d9b9a4',floorMap:c.planks(3),skirt:'#f0e6dc'});
 c.light('hemi','#ffe6cf',.5,0,0,0,'#46343a');var s=c.light('dir','#ffd2b0',.95,-9,13,12);c.shadows(s,9);
 c.light('point','#ffb48a',1.1,3.2,2.3,2.4,9);c.light('point','#ffe6cf',.9,5.8,2.1,2.6,9);
 /* rug */
 var rg=c.cvs(256,160),k=rg.getContext('2d');k.fillStyle='#7c2536';k.fillRect(0,0,256,160);k.strokeStyle='#e8d8cc';k.lineWidth=6;k.strokeRect(10,10,236,140);k.strokeStyle=__CK.a;k.lineWidth=14;k.strokeRect(26,26,204,108);for(var i=0;i<14;i++){k.fillStyle=i%2?'#e8d8cc':__CK.a;k.fillRect(38+i*14,66,8,28)}
 h.P(15,9,14.5,.03,8.3,c.std('#fff',{map:c.tex(rg,1,1),roughness:1}),0,-Math.PI/2);
 /* window with dusk */
 var wc=c.cvs(64,128),wk=wc.getContext('2d'),gr=wk.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#3a4a8a');gr.addColorStop(.6,'#c07a9a');gr.addColorStop(1,'#ff9a78');wk.fillStyle=gr;wk.fillRect(0,0,64,128);
 h.P(4.6,4.2,4.6,5.5,.2,h.bas('#fff',{map:c.tex(wc,1,1)}),0);h.B(.25,4.6,.35,2.15,3.2,.25,'#f4f1ff',{});h.B(.25,4.6,.35,7.05,3.2,.25,'#f4f1ff',{});h.B(5.1,.25,.35,4.6,3.2,.25,'#f4f1ff');h.B(5.1,.25,.35,4.6,7.55,.25,'#f4f1ff');h.B(.15,4.2,.3,4.6,3.4,.25,'#f4f1ff');h.B(5.2,.12,.3,4.6,5.5,.25,'#f4f1ff');
 h.cloth(1.5,4.8,1.9,5.7,.5,h.fabric(C1,'#a81e32',6,false),0,.12);h.cloth(1.5,4.8,7.3,5.7,.5,h.fabric(C1,'#a81e32',6,false),0,.12);h.C(.07,.07,6.2,0,7.8,.5,'#2a2a30',{metalness:.5},6).rotation.z=Math.PI/2;g.children[g.children.length-1].position.set(4.6,8.0,.5);
 h.G(4.6,5.5,.9,'#ff9a78',9,.28);
 /* counter + urn */
 h.B(8.4,3.4,2.2,4.6,0,1.5,'#6e4a3c',{roughness:.7});h.B(8.8,.22,2.5,4.6,3.4,1.5,'#d8dce2',{roughness:.25,metalness:.2});
 var urn=h.C(.9,.9,2.5,2.2,3.6,1.5,'#c9ced6',{metalness:.9,roughness:.25},22);h.C(1,1,.18,2.2,6.0,1.5,'#9aa0aa',{metalness:.9,roughness:.3},22);h.C(.3,.3,.3,2.2,6.2,1.5,'#9aa0aa',{metalness:.8},10);
 h.C(.1,.1,.5,2.2,4.3,2.45,'#2a2a30',{metalness:.6},6);h.B(.25,.25,.5,2.2,3.95,2.55,__CK.a);h.T('Coffee',1.1,.5,2.2,5.1,2.42,'#2a2a34','#f4f1ff',0,{fs:.6});
 h.C(.75,.75,.14,2.2,3.62,3.2,'#f4f1ff',{},16);
 for(i=0;i<5;i++)h.mug(4.3+i*.8,3.62,2,i%2?C1:C2);h.B(1.6,.5,1.2,8.3,3.62,1.8,'#f6f2ea',{roughness:.7});h.T('Cake',1,.34,8.3,3.9,2.42,__CK.a,'#fff',0,{fs:.55});
 /* steam */
 var st=[0,1,2].map(function(i){return h.G(2.2,6.4,1.5,'#ffe6dc',1.7,.0)});c.tick(function(t){st.forEach(function(s,i){var a=((t*.25+i/3)%1);s.position.set(2.2+Math.sin(a*6+i)*.25,6.5+a*2.6,1.5);s.material.opacity=Math.sin(a*3.14)*.25;s.scale.setScalar(1+a*1.6)})});
 /* notice board */
 h.B(7.0,4.4,.3,12.8,3.2,.2,'#6e4a3c',{});h.P(6.5,3.9,12.8,5.4,.38,c.std('#b98a6a',{map:(function(){var cv=c.cvs(256,160),k=cv.getContext('2d');k.fillStyle='#b78662';k.fillRect(0,0,256,160);for(var i=0;i<900;i++){k.fillStyle='rgba('+(80+c.rnd()*70|0)+',50,30,.25)';k.fillRect(c.rnd()*256,c.rnd()*160,2,2)}return c.tex(cv,1,1)})(),roughness:1}),0);
 h.T('Notice Board',3.3,.9,12.8,8.3,.4,'#2a2a34','#f4f1ff',0,{fs:.55,rr:14});
 [[10.4,6.6,1.6,1.9,'#f4f1ff','MEETING\nTUESDAY'],[12.3,6.8,1.5,1.4,'#ffb4b4','Trip to\nthe Match'],[14.1,6.3,1.5,2,'#cfe2ff','Season Ticket\nSign-up'],[11.1,4.5,1.5,1.4,'#f4f1ff','Results'],[13.2,4.7,1.8,1.6,'#e6d2ff','Drum\nCrew'],[15.2,4.5,1.2,1.4,'#f4f1ff','NEW!']].forEach(function(p,i){var m=h.T(p[5],p[2],p[3],p[0],p[1],.5,p[4],'#2a2a34',(i-2.5)*.03,{fs:.3,weight:'700'});h.S(.14,p[0],p[1]+p[3]*.4,.6,i%2?C1:'#3a64d8')});
 /* trophy shelves */
 h.B(.3,.3,1.6,20,4.1,.9,'#6e4a3c');h.B(7,.25,1.5,20,3.9,.9,'#6e4a3c');h.B(7,.25,1.5,20,6.0,.9,'#6e4a3c');h.B(7.2,.35,.5,20,8.4,.35,'#4a3a34');
 h.cup(17.7,4.15,.9,1.2);h.cup(19.4,4.15,.9,1.5);h.cup(21.4,4.15,.9,1);h.cup(22.7,4.15,.9,.8);h.cup(18.4,6.25,.9,1.1);h.cup(20.2,6.25,.9,.8);
 h.B(1.3,1.7,.2,22,6.25,.9,'#2a2a34',{});h.T('★\n2019',1.0,1.4,22,7.1,1.02,'#f4f1ff',__CK.a,0,{fs:.4});
 h.B(1.9,1.4,.25,20.1,6.4,1.0,'#2a2a34');h.T('All the Way',1.6,.9,20.1,7.1,1.14,C1,'#fff',0,{fs:.45});
 h.cloth(2.5,.9,20,8.0,.55,h.fabric(C1,C2,8),0,.05);
 /* long table */
 var tb=h.B(13,.28,3.3,15,2.7,8.2,'#c79c7e',{roughness:.6});h.B(13.2,.06,1.1,15,2.98,8.2,C1,{roughness:.9},.01);
 [[-5.8,-1.2],[5.8,-1.2],[-5.8,1.2],[5.8,1.2]].forEach(function(p){h.B(.4,2.7,.4,15+p[0],0,8.2+p[1],'#4a3a34')});h.B(11,.2,.2,15,.8,8.2,'#4a3a34');
 [[10.6,'#f4f1ff'],[12.6,C1],[14.8,'#f4f1ff'],[17,C2],[19,C1]].forEach(function(p,i){h.mug(p[0],2.98,8.5+(i%2?.3:-.3),p[1])});
 h.B(1.8,.34,1.3,13.7,2.98,7.6,'#f6f2ea',{},.04);h.B(1.8,.34,1.3,16.2,2.98,8.8,'#f6f2ea',{},.04);h.C(.5,.5,1.2,17.6,2.98,7.4,'#a8aeb8',{metalness:.8,roughness:.3},12);h.C(.55,.55,.14,17.6,4.1,7.4,C1,{},12);
 h.B(2.2,.08,1.5,11.5,2.98,7.6,'#ffffff',{roughness:.5},.01);h.T('Agenda',2,1.3,11.5,3.03,7.6,'#f4f1ff','#2a2a34',0,{fs:.28}).rotation.x=-Math.PI/2;g.children[g.children.length-1].position.y=3.04;
 [10.9,13.6,17.2].forEach(function(x){h.chair(x,4.9,0,'#4a3a34')});
 h.chair(22.2,8.2,-Math.PI/2,'#4a3a34');h.chair(8.4,11.6,Math.PI*.9,'#5a4238');h.chair(10.2,11.2,Math.PI*1.1,'#4a3a34');
 /* sofa */
 h.B(3.4,1.6,6.4,2.1,.0,9.1,'#8a2a3a',{roughness:.95},.25);h.B(1.0,3.6,6.4,.9,0,9.1,'#7a2434',{roughness:.95},.3);h.B(3.0,.55,6.0,2.3,1.6,9.1,'#9a3244',{roughness:.95},.2);
 [[7.3,C2],[9.2,'#d8c8bc'],[10.8,C2]].forEach(function(p,i){h.B(.8,1.4,1.4,1.5,2.0,p[0]+.3,p[1],{roughness:1},.3)});
 h.B(2.6,.28,2.4,6.4,1.9,8.0,'#6e4a3c',{roughness:.6});[-1,1].forEach(function(a){[-1,1].forEach(function(b){h.B(.25,1.9,.25,6.4+a*1.0,0,8.0+b*.9,'#4a3a34')})});h.mug(6.2,2.18,7.8,C1);h.B(1.6,.12,1.2,6.7,2.18,8.3,'#f4f1ff');
 /* left wall: scarf rail + posters */
 h.C(.07,.07,11,.35,6.4,6.5,'#2a2a30',{metalness:.5},6).rotation.x=Math.PI/2;g.children[g.children.length-1].position.set(.4,6.8,8.5);
 [3.4,5.0,6.7,8.4,10.0,11.7].forEach(function(z,i){var sc=h.cloth(1.0,4.2,.5,4.6,z,h.fabric(i%2?C1:C2,i%2?C2:C3,10,true),Math.PI/2,.12);});
 h.T('Together\nAlways',3.2,4.2,.18,6,3.2,C3,'#fff',Math.PI/2,{fs:.28,rr:12});g.children[g.children.length-1].position.set(.2,6.0,3.4);
 h.B(.2,3.2,2.6,.26,3.5,12.5,'#4a3a34');h.T('The Team\nPhoto',2.4,3,.4,5.1,12.5,'#d8c8b8','#2a2a34',Math.PI/2,{fs:.3});
 /* pendants */
 [6,15,23].forEach(function(x){h.pendant(x,5.5,8.6,'#e8dcd0',.9)});
 /* people */
 c.person({skin:c.SK[1],top:C1,bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.12,mode:'sit',s:1.08,scarf:[C1,C2]},{x:13.6,z:5.8,yaw:0});
 c.person({skin:c.SK[3],top:'#2a2f4a',bot:'#2a2a30',hair:'#14100e',style:'curly',beard:true,w:1.2,mode:'sit',s:1.1},{x:10.9,z:5.8,yaw:.12}).position.y=0;
 var p3=c.person({skin:c.SK[0],top:'#e8e0d8',bot:'#3a3a48',hair:'#6a3a22',style:'pony',w:.95,mode:'sit',s:1.04},{x:17.2,z:5.8,yaw:-.1});
 var p4=c.person({skin:c.SK[2],top:C2,bot:'#202432',hair:'#2a1c14',style:'bun',w:.95,mode:'arrange',s:1.0,apron:__CK.a},{x:4.9,z:4.4,yaw:.55});
 var p5=c.person({skin:c.SK[4],top:'#6a7fb0',bot:'#1c2030',hair:'#0a0808',style:'buzz',w:1.1,mode:'sit',s:1.1,beanie:C1},{x:2.7,z:8.3,yaw:Math.PI/2});p5.position.y=1.9*c.U-.5;
 c.person({skin:c.SK[1],top:'#3a3a48',bot:'#1c2030',hair:'#c8c0b8',style:'short',glasses:true,w:1.2,mode:'listen',s:1.05,look:.5,jacket:'#4a4a5a'},{x:19.6,z:3.6,yaw:-.25});
 c.person({skin:c.SK[2],top:C1,bot:'#1c2030',hair:'#1a1210',style:'slick',w:1.05,mode:'sit',s:1.08,collar:C2},{x:22.1,z:8.2,yaw:-Math.PI/2}).position.y=0;
 c.light('point','#ffd2c0',.8,5.6,2.0,2.8,8);
 c.setCam(3.3,3.9,8.7,3.3,1.1,1.2,38,62)}});
/* ================= storeroom ================= */
function shirtOn(h,c,x,y,z,col,ry,col2){var gp=new T.Group();gp.position.set(x,y,z);gp.rotation.y=ry||0;c.g.add(gp);h.C(.04,.04,.5,0,.1,0,'#c9ced6',{metalness:.8},5,gp);var hg=c.mesh(new T.TorusGeometry(.3,.03,5,12,Math.PI),c.std('#c9ced6',{metalness:.8}),0,.15,0,gp);
 h.B(2.1,2.8,.3,0,-2.7,0,col,{roughness:.9},.12,gp);[-1,1].forEach(function(s){var sl=h.B(1.0,1.0,.3,s*1.35,-.2-1.1,0,col,{roughness:.9},.1,gp);sl.rotation.z=s*.5;sl.position.y=-1.5});h.B(.7,.18,.34,0,-.3,0,col2||'#f4f1ff',{},.05,gp);h.B(1.6,.18,.34,0,-2.6+.1,0,col2||'#f4f1ff',{},.05,gp);return gp}
RM.def('storeroom',{kind:'club-room',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 c.shell({h:9.5,wall:'#b4bcc8',wall2:'#aab3c0',floorMap:c.concrete('#a0a6b0',5,3),skirt:'#58606c'});
 c.light('hemi','#e6ecff',.5,0,0,0,'#40343a');var s=c.light('dir','#ffd8c0',.85,-8,13,12);c.shadows(s,9);
 c.light('point','#ffb48a',1.5,3.3,2.2,1.9,9);c.light('point','#cfdcff',.7,5.2,1.8,3.0,8);
 /* back-wall steel shelving, three bays */
 var cols=['#c9a58a','#c4a090','#b8957c'];var bi=0;
 for(var bay=0;bay<3;bay++){var x0=1+bay*7.4;
  [0,7.1].forEach(function(dx){h.B(.35,8.6,1.7,x0+dx,0,1.2,'#2f6aa8',{metalness:.3,roughness:.5},.04)});
  [1.2,3.7,6.2,8.6].forEach(function(y,yi){h.B(7.4,.22,1.7,x0+3.55,y,1.2,'#7d8fa6',{metalness:.5,roughness:.45},.03);
   if(yi<3){var x=x0+.9;while(x<x0+6.6){var w=.9+c.rnd()*1.3,hh=.9+c.rnd()*1.1;var kind=c.rnd();
     if(kind<.58){var b=h.box(w,hh,1.1,x+w/2,y+.2,1.3,0,c.rnd()<.7?String(100+(bi++*7)%90):null)}
     else if(kind<.78){h.B(w,.55,1.0,x+w/2,y+.2,1.3,c.rnd()<.5?C1:C2,{roughness:.9},.1);h.B(w*.95,.55,1.0,x+w/2,y+.75,1.3,c.rnd()<.5?C2:C3,{roughness:.9},.1);}
     else if(kind<.9){h.S(.55,x+.55,y+.8,1.3,'#e8e0d4',{roughness:.5});h.S(.5,x+1.6,y+.75,1.3,'#d8d0c4',{roughness:.6})}
     else{h.B(w,.7,1.0,x+w/2,y+.2,1.3,'#2a2a34',{roughness:.7},.1)}
     x+=w+.25}}});}
 h.T('Storeroom',3.2,.9,12,9.6,.3,'#2a2a34','#f4f1ff',0,{fs:.55,rr:12});
 /* ladder leaning on the shelves at right */
 var lad=new T.Group();lad.position.set(22.3,0,3.6);lad.rotation.x=.16;g.add(lad);[-.7,.7].forEach(function(dx){h.B(.2,8.4,.2,dx,0,0,'#bcc4d0',{metalness:.7,roughness:.35},.04,lad)});for(var i=0;i<9;i++)h.B(1.6,.12,.14,0,.7+i*.9,0,'#aab3c0',{metalness:.7},.03,lad);
 /* hanging jerseys on a rail (left wall) */
 var rail=h.C(.07,.07,11,0,6.0,0,'#2a2a30',{metalness:.6},6);rail.rotation.x=Math.PI/2;rail.position.set(.5,7.2,8.5);
 [4,5.6,7.2,8.8,10.4,12].forEach(function(z,i){shirtOn(h,c,.9,7.2,z,i%3?C1:(i%2?C2:C3),Math.PI/2,i%3?C2:C1)});
 /* drums + sticks + rolled flags */
 h.drum(4.1,7.1,1.7,2.6,0,C1,'#c6ccd6');h.drum(7.1,9.2,1.4,2.2,.3,C2,'#c6ccd6');h.drum(2.7,11.3,1.2,1.8,0,C3,'#c6ccd6');

 h.C(1.0,1.0,1.7,19,0,9.5,'#5a626e',{roughness:.6,metalness:.4},18);
 [[18.4,C1],[19.0,C2],[19.6,C3],[18.7,C1],[19.3,C2]].forEach(function(p,i){var r=h.C(.22,.22,7.2+i*.4,p[0],1.0,9.5+(i%2?.35:-.3),p[1],{roughness:.9},10);r.rotation.z=(i-2)*.05;h.C(.07,.07,8+i*.4,p[0],.8,9.5+(i%2?.35:-.3),'#cdb7a0',{},5)});
 /* tifo roll on the floor + pallet of boxes */
 h.C(.9,.9,9,15.5,0,12.2,'#e8e0d6',{roughness:.95},16).rotation.z=Math.PI/2;g.children[g.children.length-1].position.set(14,.9,12.3);
 var sp=c.mesh(new T.CylinderGeometry(.9,.9,.2,16),c.std(C1),9.6,.9,12.3,g);sp.rotation.z=Math.PI/2;
 h.B(5.5,.4,4.6,12.6,0,6.4,'#8a6a52',{roughness:.95},.04);for(i=0;i<3;i++)for(var j=0;j<2;j++){h.box(2.6,1.9,2.0,11.2+i*1.7+j*.2,.4,5.6+j*2.0,j*.15,i===1&&j===0?'Sizes':null);if(i<2)h.box(2.4,1.7,1.9,11.4+i*2.0,2.3,5.7+j*2.0,.1,null)}
 /* hand truck */
 h.B(.2,5,.2,16.2,0,5.4,C1,{metalness:.3});h.B(.2,5,.2,17.2,0,5.4,C1,{metalness:.3});h.B(1.2,.15,1.4,16.7,.0,6.0,'#7d8fa6',{metalness:.5});[-1,1].forEach(function(a){var w=c.mesh(new T.CylinderGeometry(.55,.55,.25,14),c.std('#14141a'),16.7+a*.9,.55,5.4,g);w.rotation.z=Math.PI/2});
 /* folding chairs stacked */
 for(i=0;i<5;i++)h.B(1.6,.12,1.5,21.4,.35+i*.22,10.4,'#3a3a44',{},.04);h.B(1.6,2,.12,21.4,.4,9.75,'#3a3a44');
 /* bare bulb + dust motes */
 var bg=new T.Group();bg.position.set(12,9,5.5);g.add(bg);h.C(.03,.03,4,0,0,0,'#2a2a30',{},4,bg);var bb=c.mesh(new T.SphereGeometry(.3,12,8),new T.MeshBasicMaterial({color:'#fff0e4'}),0,-.1,0,bg);bb.castShadow=false;var gl=h.G(0,-.1,0,'#ffbe96',4.5,.5,bg);
 var cone=c.mesh(new T.CylinderGeometry(.3,5,9,18,1,true),new T.MeshBasicMaterial({color:'#ffc4a0',transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),12,4.6,5.5,g);cone.castShadow=false;
 c.tick(function(t){bg.rotation.z=Math.sin(t*.9)*.03;gl.material.opacity=.62+Math.sin(t*3)*.04});
 var dm=[];for(i=0;i<26;i++){var d=h.G(12+(c.rnd()-.5)*8,1+c.rnd()*7,5.5+(c.rnd()-.5)*5,'#fff0e4',.35,.5);dm.push({s:d,a:c.rnd()*6,b:c.rnd()*6,x:d.position.x,y:d.position.y,z:d.position.z})}
 c.tick(function(t){dm.forEach(function(m){m.s.position.set(m.x+Math.sin(t*.3+m.a)*.6,m.y+Math.sin(t*.2+m.b)*.5,m.z+Math.cos(t*.25+m.a)*.4)})});
 /* people */
 c.person({skin:c.SK[2],top:'#6a7fb0',bot:'#2a2a30',hair:'#c8c0b8',style:'short',stubble:true,w:1.25,mode:'talk',s:1.06,apron:'#5a626e',glasses:true},{x:10.4,z:9.0,yaw:.35});
 c.person({skin:c.SK[0],top:C1,bot:'#1c2030',hair:'#4a2a1a',style:'pony',w:.95,mode:'arrange',s:1.0,scarf:[C1,C2]},{x:6.0,z:4.0,yaw:-.7});
 var kid=c.person({skin:c.SK[3],top:C2,bot:'#2a3a6a',hair:'#14100e',style:'curly',w:.85,mode:'sit',s:.8,cap:C1},{x:14.6,z:9.7,yaw:-.3});h.box(2.4,1.9,2.0,14.6,0,9.7,.1,null);kid.position.y=1.9*c.U-.42*.8;
 c.person({skin:c.SK[1],top:'#3a3a48',bot:'#1c2030',hair:'#1a1210',style:'bald',beard:true,w:1.25,mode:'lean',s:1.1,jacket:C3,look:-.5},{x:19.6,z:6.2,yaw:-.5});
 c.setCam(3.3,3.9,8.7,3.3,1.15,1.3,38,62)}});
/* ================= workshop ================= */
RM.def('workshop',{kind:'club-room',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 var W=26,D=15,HH=9.5;
 var fl=c.mesh(new T.BoxGeometry(W+1,.6,D+1),c.std('#fff',{map:c.concrete('#a39fa0',6,3),roughness:.85}),W/2,-.3,D/2,g);fl.castShadow=false;
 var bw=c.mesh(new T.BoxGeometry(W+1,HH,.6),c.std('#fff',{map:c.brick(14,5,2),roughness:.95}),W/2,HH/2,-.3,g);
 var lw=c.mesh(new T.BoxGeometry(.6,HH,D+.6),c.std('#fff',{map:c.wall('#d8d0c4',['#c8c0b4','#e6dfd4','#bdb3a6'],3,1.5),roughness:.95}),-.3,HH/2,D/2,g);
 h.B(W+1,.4,.4,W/2,0,.2,'#4a4a54');
 c.light('hemi','#ffe6cf',.5,0,0,0,'#46343a');var s=c.light('dir','#ffd2b0',.95,-9,13,12);c.shadows(s,9);
 c.light('point','#ffb48a',1.1,3.0,2.3,2.2,9);c.light('point','#ffe6cf',1.0,5.4,2.2,2.6,9);c.light('point','#ffd2c0',.9,6.0,2.2,2.8,8);
 /* door (back wall) */
 h.B(2.6,.3,.5,2.4,6.9,.3,'#4a3a34');h.B(.3,6.9,.5,1.1,0,.3,'#4a3a34');h.B(.3,6.9,.5,3.7,0,.3,'#4a3a34');h.B(2.2,6.9,.3,2.4,0,.15,'#6e4a3c',{roughness:.7});h.S(.13,3.1,3.5,.35,'#c4ccd6',{metalness:.8,roughness:.3});h.T('Workshop',1.7,.7,2.4,8.4,.4,'#2a2a34','#f4f1ff',0,{fs:.55,rr:10});
 /* sewing table + machine */
 h.B(6.4,.25,3.0,8.6,3.3,3.4,'#8a6a52',{roughness:.7});[[5.7,2.2],[11.5,2.2],[5.7,4.6],[11.5,4.6]].forEach(function(p){h.B(.35,3.3,.35,p[0],0,p[1]+.1,'#3a3a44')});
 h.B(2.1,1.0,1.2,7.6,3.55,3.3,'#e8e4de',{roughness:.4});h.B(.9,1.3,.7,8.4,3.55,3.0,'#e8e4de',{roughness:.4});h.B(1.2,.3,.6,7.4,4.9,3.0,'#e8e4de',{roughness:.4});h.C(.12,.12,.8,7.0,3.55,3.3,'#c4ccd6',{metalness:.8},6);h.S(.5,6.8,4.7,3.0,'#e8e4de',{},1,1,1);h.G(7.0,4.3,3.0,'#ffe6cf',3,.4);
 h.C(.55,.55,3.0,10.2,3.55,3.0,C1,{roughness:.95},16).rotation.z=Math.PI/2;g.children[g.children.length-1].position.set(10.1,4.15,3.1);var rl2=c.mesh(new T.CylinderGeometry(.5,.5,2.6,16),c.std(C2,{roughness:.95}),9.8,3.9,4.1,g);rl2.rotation.z=Math.PI/2;
 for(var i=0;i<8;i++)h.C(.12,.12,.35,5.5+i*.55,5.3,0.5,[__CK.a,'#f4f1ff','#2a2a34','#4a6aff'][i%4],{},8);h.B(5,.15,.8,8.3,5.1,.55,'#6e4a3c');
 h.chair(8,5.4,3.3,'#5a4238',2.0);
 /* pegboard */
 var pc=c.cvs(512,256),k=pc.getContext('2d');k.fillStyle='#7d8fa6';k.fillRect(0,0,512,256);k.fillStyle='rgba(30,40,60,.35)';for(var x=10;x<512;x+=22)for(var y=10;y<256;y+=22){k.beginPath();k.arc(x,y,2.5,0,7);k.fill()}
 k.strokeStyle='rgba(20,30,50,.35)';k.lineWidth=10;[[40,40,40,200],[120,30,130,220],[240,40,260,140],[330,30,320,210],[430,40,410,150]].forEach(function(l){k.beginPath();k.moveTo(l[0],l[1]);k.lineTo(l[2],l[3]);k.stroke()});
 k.fillStyle=__CK.a;k.fillRect(28,160,28,58);k.fillStyle='#e8e4de';k.fillRect(110,24,40,10);k.fillStyle='#c4ccd6';k.beginPath();k.moveTo(225,60);k.lineTo(265,60);k.lineTo(280,150);k.lineTo(225,150);k.fill();k.fillStyle='#2a2a34';k.fillRect(312,150,22,70);k.fillStyle=__CK.a;k.beginPath();k.arc(430,190,22,0,7);k.fill();
 h.P(8,4,16,6.6,.05,c.std('#fff',{map:c.tex(pc,1,1),roughness:.8}),0);h.B(8.4,.3,.3,16,8.6,.15,'#4a3a34');h.B(8.4,.3,.3,16,4.4,.15,'#4a3a34');
 /* bench + radio + thermos */
 h.B(9.4,.3,3.2,17.4,3.5,2.9,'#6e4a3c',{roughness:.6});[[13,1.5],[21.8,1.5],[13,4.2],[21.8,4.2]].forEach(function(p){h.B(.4,3.5,.4,p[0],0,p[1]+.1,'#3a3a44')});h.B(8.8,.2,1.5,17.4,1.6,2.9,'#4a3a34');
 h.B(2.1,1.3,.9,16.9,3.8,2.5,'#2a2a34',{roughness:.4});h.S(.4,16.3,4.45,3.0,'#5a626e',{metalness:.5},1,1,.2);h.S(.4,17.5,4.45,3.0,'#5a626e',{metalness:.5},1,1,.2);h.B(.7,.12,.06,16.9,4.55,3.0,'#ff7a6a',{});h.C(.05,.05,2.2,17.6,5.1,2.2,'#c4ccd6',{metalness:.8},5).rotation.z=-.4;
 h.C(.3,.3,.9,14.6,3.8,2.9,C1,{metalness:.5},12);h.C(.2,.2,.8,19.9,3.8,3.1,'#d8dce2',{metalness:.8},12);h.B(1.2,.5,1.0,13.4,3.8,3.3,'#e8dcd0');h.C(.4,.4,.4,19.0,3.8,3.2,'#e8e4de',{},14);
 /* ladder */
 var lad=new T.Group();lad.position.set(23.4,0,2.6);lad.rotation.x=.14;g.add(lad);[-.8,.8].forEach(function(dx){h.B(.22,8.2,.22,dx,0,0,'#e8a49a',{metalness:.4,roughness:.5},.04,lad)});for(i=0;i<9;i++)h.B(1.8,.12,.16,0,.6+i*.88,0,'#d8dce2',{metalness:.7},.03,lad);h.B(.5,.7,.5,23.0,5.1,3.1,__CK.a,{roughness:.5});
 /* big canvas on the floor (painted) */
 var cv=c.cvs(1024,512),kk=cv.getContext('2d');kk.fillStyle='#efe8de';kk.fillRect(0,0,1024,512);kk.strokeStyle='rgba(120,110,100,.5)';kk.lineWidth=3;for(i=0;i<8;i++){kk.beginPath();kk.moveTo(0,i*64);kk.lineTo(1024,i*64);kk.stroke()}
 kk.direction='ltr';kk.textAlign='center';kk.font='900 270px Heebo, Arial';kk.lineJoin='round';kk.lineWidth=16;kk.strokeStyle=C3;kk.strokeText('All the Way',500,260);kk.fillStyle=C1;kk.save();kk.beginPath();kk.rect(0,0,640,512);kk.clip();kk.fillText('All the Way',500,260);kk.restore();
 kk.fillStyle='rgba(20,20,40,.18)';for(i=0;i<20;i++){kk.beginPath();kk.arc(c.rnd()*1024,c.rnd()*512,c.rnd()*10+2,0,7);kk.fill()}kk.fillStyle=C1;for(i=0;i<14;i++){kk.beginPath();kk.arc(c.rnd()*1024,c.rnd()*512,c.rnd()*6+2,0,7);kk.fill()}
 kk.strokeStyle='#d8dce2';kk.lineWidth=14;kk.strokeRect(10,10,1004,492);kk.fillStyle='#f4a8a0';kk.fillRect(640,40,20,430);
 h.P(13.4,6.7,8.6,.06,10.8,c.std('#fff',{map:c.tex(cv,1,1),roughness:.9}),0,-Math.PI/2);
 /* paint cans, brushes, roller tray */
 [[19.2,8.6,C1],[20.4,9.4,C3],[21.6,8.7,C2],[20.8,10.4,'#4a6aff'],[22.2,10.0,C1]].forEach(function(p,i){h.C(.62,.62,.9,p[0],0,p[1],'#b4bcc8',{metalness:.8,roughness:.35},16);h.C(.5,.5,.06,p[0],.9,p[1],p[2],{roughness:.35},16);h.C(.66,.66,.1,p[0],.1,p[1],'#9aa2ae',{metalness:.8},16);var dr=h.B(.12,.55,.05,p[0]+.55,.2,p[1]+.1,p[2],{roughness:.4});dr.rotation.z=.1});
 h.C(.4,.4,1.1,18.6,0,10.6,'#d8dce2',{metalness:.7},12);for(i=0;i<5;i++)h.C(.05,.07,2.1,18.6+(i-2)*.12,1.1,10.6,i%2?C1:'#6e4a3c',{},5).rotation.z=(i-2)*.14;h.B(1.8,.14,1.1,17.6,.0,9.2,'#c4ccd6',{metalness:.6});h.C(.28,.28,1.3,17.6,.14,9.2,C1,{},12).rotation.z=Math.PI/2;
 h.cloth(6.2,3.6,.5,6.0,9.0,h.fabric(C1,C2,9,true),Math.PI/2,.2);h.C(.06,.06,6.6,.4,7.9,9.0,'#2a2a30',{},5).rotation.x=Math.PI/2;g.children[g.children.length-1].position.set(.4,7.9,9.0);
 /* fluorescent tubes */
 [[8,5.5],[18,5.5]].forEach(function(p){var tg=new T.Group();tg.position.set(p[0],8.7,p[1]);g.add(tg);h.C(.02,.02,2,-1.8,0,0,'#2a2a30',{},4,tg);h.C(.02,.02,2,1.8,0,0,'#2a2a30',{},4,tg);h.B(4.6,.18,.5,0,-.2,0,'#fff2e8',{},.05,tg).material=new T.MeshBasicMaterial({color:'#fff2e8'});h.G(0,-.4,0,'#ffd6c0',7,.4,tg)});
 /* people */
 c.person({skin:c.SK[2],top:'#e8e0d8',bot:'#3a3a48',hair:'#14100e',style:'short',beard:true,w:1.2,mode:'talk',s:1.1,cap:C3,apron:'#8a6a52',look:-.5},{x:17.6,z:7.0,yaw:-.45});
 c.person({skin:c.SK[0],top:C1,bot:'#1c2030',hair:'#3a2418',style:'long',w:.95,mode:'arrange',s:1.0,scarf:[C1,C2]},{x:10.0,z:8.6,yaw:.5});
 c.person({skin:c.SK[3],top:C2,bot:'#202432',hair:'#0a0808',style:'curly',w:1.05,mode:'arrange',s:1.05,glasses:true},{x:5.9,z:5.6,yaw:2.7}).position.y=0;
 c.person({skin:c.SK[1],top:'#2a2f4a',bot:'#2a2a30',hair:'#c8c0b8',style:'slick',w:1.15,mode:'lean',s:1.08,look:.5,jacket:'#4a4a5a'},{x:21.4,z:5.6,yaw:2.9});
 c.setCam(4.1,4.1,9.0,3.9,1.05,1.7,40,64)}});
/* ================= rehearsal ================= */
function foamTex(c,base,hi){var cv=c.cvs(256,256),k=cv.getContext('2d');k.fillStyle=base;k.fillRect(0,0,256,256);for(var i=0;i<8;i++)for(var j=0;j<8;j++){var x=i*32+16,y=j*32+16,gr=k.createRadialGradient(x-5,y-6,2,x,y,17);gr.addColorStop(0,hi);gr.addColorStop(.55,base);gr.addColorStop(1,'#0e0c12');k.fillStyle=gr;k.beginPath();k.arc(x,y,16,0,7);k.fill()}return c.tex(cv,4,2)}
function speaker(h,c,x,z,w,hh,col){var gp=new T.Group();gp.position.set(x,0,z);c.g.add(gp);h.B(w,hh,2.4,0,0,0,'#34343e',{roughness:.6},.12,gp);var cv=c.cvs(256,256),k=cv.getContext('2d');k.fillStyle='#22222a';k.fillRect(0,0,256,256);[[128,76,54],[128,190,66]].forEach(function(p){var gr=k.createRadialGradient(p[0],p[1],4,p[0],p[1],p[2]);gr.addColorStop(0,'#9a9aa8');gr.addColorStop(.5,'#4a4a56');gr.addColorStop(1,'#0a0a10');k.fillStyle=gr;k.beginPath();k.arc(p[0],p[1],p[2],0,7);k.fill()});k.fillStyle=col;k.fillRect(100,246,56,6);
 var m=h.P(w*.92,hh*.92,0,hh/2,1.22,c.std('#fff',{map:c.tex(cv,1,1),roughness:.6}),0,0,gp);return gp}
RM.def('rehearsal',{kind:'club-room',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 c.shell({h:9.5,wallMap:foamTex(c,'#3c3846','#9a94a8'),floorMap:c.wall('#403a4c',['#4a4458','#322e3c','#544c62'],6,3),skirt:'#14121a'});
 c.light('hemi','#ffd8d0',.62,0,0,0,'#3a2a3a');var s=c.light('dir','#ffd2c0',.7,-8,13,12);c.shadows(s,9);
 c.light('point','#ff5a6a',1.3,3.0,2.1,2.0,8);c.light('point','#ffc7a0',1.4,5.8,2.3,2.6,9);c.light('point','#9aa8ff',1.0,5.6,1.9,2.2,7);
 /* red rug */
 var rc=c.cvs(256,128),rk=rc.getContext('2d');rk.fillStyle='#4a1a28';rk.fillRect(0,0,256,128);rk.strokeStyle=__CK.a;rk.lineWidth=8;rk.strokeRect(8,8,240,112);rk.strokeStyle='#e8d8cc';rk.lineWidth=3;rk.strokeRect(20,20,216,88);
 h.P(14,7,9.5,.03,8.2,c.std('#fff',{map:c.tex(rc,1,1),roughness:1}),0,-Math.PI/2);
 /* neon sign */
 h.G(12,7.1,.7,'#ff4a5a',11,.38);h.T('Rehearsals',6.4,2.2,12,7.1,.4,null,'#ff9aa4',0,{basic:true,stroke:'#ff2a42',fs:.7});
 var led=h.B(23,.14,.14,12,8.7,.4,'#fff',{});led.material=new T.MeshBasicMaterial({color:C1});var cA=new T.Color(C1).convertSRGBToLinear(),cB=new T.Color('#6a7cff').convertSRGBToLinear();c.tick(function(t){led.material.color.copy(cA).lerp(cB,.5+.5*Math.sin(t*.7))});
 var lg2=h.G(12,8.7,.9,C1,22,.15);
 /* whiteboard */
 h.B(7.4,4.6,.3,18.4,3.2,.25,'#c4ccd6',{metalness:.5,roughness:.4});h.T('Opening song\n1 – 2 – 3 – 4\nFour beats\nBridge: all together!',6.8,4.0,18.4,5.5,.42,'#f4f1ff','#2a2a34',0,{fs:.36,weight:'700'});h.B(.9,.18,.3,16.6,3.35,.55,'#e0e4ea');[C1,C3].forEach(function(cl,i){h.C(.09,.09,.7,16.9+i*.4,3.4,.65,cl,{},6).rotation.z=Math.PI/2});
 h.T('Terrace Songs Night',2.2,3,5.8,5.8,.34,C3,'#f4f1ff',0,{fs:.28,border:__CK.a});
 /* tambourines on left wall */
 [[4.2,4.4],[7.4,5.8],[10.0,4.6]].forEach(function(p,i){var t=c.mesh(new T.TorusGeometry(1.0,.2,8,22),c.std('#8a6a52',{roughness:.7}),.35,p[0]+1,p[1]*0+p[0]*0+0,g);t.rotation.y=Math.PI/2;t.position.set(.45,4.4+i*.4,p[0]+1);c.mesh(new T.CylinderGeometry(.9,.9,.05,18),c.std('#efe6da'),.45,4.4+i*.4,p[0]+1,g).rotation.z=Math.PI/2});
 /* speakers */
 speaker(h,c,2.4,2.4,3.2,6.2,C1);speaker(h,c,22.2,2.4,3.2,6.2,C1);speaker(h,c,19.6,3.2,1.7,3.8,C2);
 /* amp + cables */
 h.B(2.3,1.5,1.5,13.6,0,2.4,'#1a1a20',{},.1);h.B(2.0,.12,.1,13.6,.9,3.2,'#d8dce2');[0,1,2,3].forEach(function(i){h.S(.1,12.7+i*.5,1.05,3.2,'#ff8a8a',{emissive:'#ff4a4a',emissiveIntensity:.6})});
 [[[13.6,.1,3.5],[10,.0,6],[6,.0,6.4],[2.4,.1,3.7]],[[13.6,.1,3.5],[17,.0,5],[21,.0,4.3],[22.2,.1,3.5]]].forEach(function(pts){var cu=new T.CatmullRomCurve3(pts.map(function(p){return new T.Vector3(p[0],p[1]+.08,p[2])}));c.mesh(new T.TubeGeometry(cu,24,.07,6),c.std('#0a0a0e',{roughness:.6}),0,0,0,g)});
 /* drums + drummers */
 var d1=h.drum(7.4,7.8,1.45,3.4,0,C1,'#c6ccd6'),d2=h.drum(12.0,8.5,1.35,3.2,.2,C3,'#c6ccd6');
 h.C(.5,.5,.2,7.4,3.55,7.8,'#e8d8cc',{},16);
 var dr1=c.person({skin:c.SK[1],top:C1,bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.15,mode:'idle',s:1.08,scarf:[C1,C2]},{x:7.4,z:6.2,yaw:.1});
 var dr2=c.person({skin:c.SK[3],top:'#e8e0d8',bot:'#1c2030',hair:'#0a0808',style:'curly',beard:true,w:1.2,mode:'idle',s:1.1},{x:12.0,z:6.9,yaw:-.15});
 function stick(p){var u=p.userData,st=[];u.arms.forEach(function(a,i){var s2=c.mesh(new T.CylinderGeometry(.012,.018,.4,6),c.std('#e8dcc8'),0,-.3,.0,a.hand);s2.rotation.x=1.3;st.push(s2)})}stick(dr1);stick(dr2);
 c.tick(function(t){[[dr1,0],[dr2,1.1]].forEach(function(e){var u=e[0].userData,tt=t*7+e[1];u.arms[0].sh.rotation.x=-.95+Math.sin(tt)*.45;u.arms[1].sh.rotation.x=-.95+Math.sin(tt+3.1)*.45;u.arms[0].el.rotation.x=-.9;u.arms[1].el.rotation.x=-.9;u.head.rotation.x=.18+Math.sin(tt*.5)*.08;u.hips.position.y=.95+Math.abs(Math.sin(tt))*.015});
  d1.scale.y=1;});
 /* singer + mic stand */
 var sg=c.person({skin:c.SK[0],top:'#f4f1ff',bot:'#1c2030',hair:'#6a3a22',style:'long',w:.95,mode:'sing',s:1.04,scarf:[C1,C2]},{x:16.6,z:6.0,yaw:-.1});
 h.C(.4,.5,.2,16.6,0,7.5,'#2a2a30',{metalness:.5},12);h.C(.05,.05,5.2,16.6,.2,7.5,'#9aa2ae',{metalness:.8},6);var bm=h.C(.04,.04,1.6,16.6,5.4,7.5,'#9aa2ae',{metalness:.8},6);bm.rotation.x=1.2;bm.position.set(16.6,5.7,7.0);h.S(.24,16.6,5.3,6.55,'#2a2a30',{metalness:.5});
 /* listeners on cases */
 h.B(2.6,1.8,1.7,20.4,0,8.6,'#2a2a34',{metalness:.4,roughness:.5},.1);h.B(2.4,1.8,1.6,22.0,0,10.5,'#2a2a34',{metalness:.4,roughness:.5},.1);
 c.person({skin:c.SK[2],top:C2,bot:'#202432',hair:'#2a1c14',style:'buzz',w:1.1,mode:'sit',s:1.05,beanie:C1},{x:20.6,z:8.6,yaw:-.5}).position.y=1.8*c.U-.5;
 c.person({skin:c.SK[4],top:'#2a2f4a',bot:'#1c2030',hair:'#0a0808',style:'bun',w:.95,mode:'sit',s:1.0},{x:22.2,z:10.5,yaw:-.8}).position.y=1.8*c.U-.5;
 var tw=c.person({skin:c.SK[1],top:'#6a7fb0',bot:'#2a2a30',hair:'#c8c0b8',style:'short',glasses:true,w:1.15,mode:'talk',s:1.08,jacket:'#4a4a5a'},{x:3.9,z:7.6,yaw:.7});
 /* guitar on stand */
 h.C(.5,.5,.9,3.0,0,10.5,'#7a2a2a',{},14).scale.set(1,1,.3);h.B(.2,3.0,.15,3.0,.8,10.5,'#3a2a24');
 /* par-can floor glows */
 [[1.5,12.5,C1],[22.5,12.8,'#6a7cff']].forEach(function(p){h.G(p[0],.6,p[1],p[2],5,.5)});
 c.tick(function(t){lg2.material.opacity=.14+Math.sin(t*3.4)*.03});
 c.setCam(3.3,3.8,8.5,3.3,1.15,1.2,38,62)}});
/* ================= hall-new ================= */
RM.def('hall-new',{kind:'hall',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 var fc=c.cvs(512,512),k=fc.getContext('2d');for(var i=0;i<16;i++){k.fillStyle='hsl('+(26+(i%3))+','+(36+i%3*3)+'%,'+(62+(i%2)*3)+'%)';k.fillRect(0,i*32,512,30);k.fillStyle='rgba(90,60,40,.22)';k.fillRect(0,i*32+30,512,2);for(var j=0;j<3;j++)k.fillRect((i*131+j*177)%512,i*32,2,30)}
 k.strokeStyle='rgba(255,255,255,.9)';k.lineWidth=10;k.beginPath();k.arc(256,256,150,0,7);k.stroke();k.fillStyle='rgba(216,40,62,.28)';k.fillRect(150,0,212,200);k.strokeRect(150,0,212,200);
 var ftx=c.tex(fc,1,1);
 c.shell({h:11,wall:'#efe4da',wall2:'#e6d9ce',floorMap:ftx,skirt:'#2a2a34'});

 c.light('hemi','#fff0e6',.5,0,0,0,'#46343a');var s=c.light('dir','#ffd8c0',.9,-9,14,12);c.shadows(s,9);
 c.light('point','#ffb48a',1.1,2.8,2.2,2.0,9);c.light('point','#ffe6cf',1.0,5.6,2.4,2.8,10);
 /* bar */
 h.B(11.4,3.8,2.2,6.8,0,3.8,'#7a2434',{roughness:.5});h.B(12,.25,2.7,6.8,3.8,3.8,'#e8dcd0',{roughness:.3});h.T('Bar',.1,.1,0,0,0,null,'#fff',0);g.children.pop();h.T('The Stand Bar',6.2,1.5,6.8,2.1,4.95,'#14141c','#f4f1ff',0,{fs:.5,rr:10});
 h.B(11.6,.45,.5,6.8,.0,5.05,'#2a2a34');
 h.P(11.6,4.2,6.8,6.6,.25,h.bas('#ff9a7a',{transparent:true,opacity:.5}),0);h.G(6.8,6.6,.6,'#ffb89a',16,.45);
 [4.8,7.2].forEach(function(y,yi){h.B(11.6,.2,1.2,6.8,y,.9,'#4a3a34');var cols=['#5a1a24','#1e3f5a','#2f6a5a','#cfd8e2','#4a2a20','#6a2a4a','#c8d4e0'];for(var i=0;i<14;i++)h.bottle(1.6+i*.78,y+.2,.9,cols[(i+yi*3)%cols.length],1.1+((i*7)%5)*.08)});
 [[3.5,C1],[5.5,C2],[7.5,C3]].forEach(function(p,i){h.C(.1,.1,1.5,p[0],4.05,3.2,'#c4ccd6',{metalness:.9,roughness:.2},8);h.B(.35,.55,.35,p[0],5.4,3.2,p[1],{roughness:.4},.08);h.B(1.0,.12,.12,p[0],5.2,3.4,'#c4ccd6',{metalness:.9})});
 [9.6,10.6].forEach(function(x,i){h.C(.28,.24,.5,x,4.05,3.8,'#e8e4de',{transparent:true,opacity:.85,roughness:.1},12)});
 [2.2,5.0,7.8,10.6].forEach(function(x){h.C(.9,.9,.3,x,2.55,6.0,C1,{roughness:.5},16);h.C(.12,.12,2.55,x,0,6.0,'#9aa2ae',{metalness:.8},8);h.C(.7,.9,.15,x,0,6.0,'#2a2a34',{metalness:.5},16)});
 /* TV */
 var tc=c.cvs(256,144),tk=tc.getContext('2d');tk.fillStyle='#2f7a4a';tk.fillRect(0,0,256,144);for(i=0;i<8;i++){tk.fillStyle=i%2?'#2a6e42':'#348050';tk.fillRect(i*32,0,32,144)}tk.strokeStyle='#e8f4ec';tk.lineWidth=3;tk.strokeRect(14,12,228,120);tk.beginPath();tk.moveTo(128,12);tk.lineTo(128,132);tk.stroke();tk.beginPath();tk.arc(128,72,20,0,7);tk.stroke();tk.fillStyle='#14141c';tk.fillRect(0,0,256,20);tk.fillStyle='#fff';tk.font='bold 15px Arial';tk.fillText('LIVE  02:1',90,15);tk.fillStyle=C1;tk.fillRect(20,70,8,8);tk.fillStyle='#fff';tk.fillRect(60,86,8,8);tk.fillRect(150,55,8,8);
 h.B(6.6,3.9,.4,16.4,5.0,.35,'#14141a',{},.08);var tv=h.P(6.0,3.35,16.4,6.95,.6,h.bas('#fff',{map:c.tex(tc,1,1)}),0);c.tick(function(t){tv.material.color.setScalar(.92+Math.sin(t*5)*.05)});h.G(16.4,6.9,1.2,'#cfe6ff',12,.14);
 /* banners */
 h.cloth(3,6.4,20.4,8.4,.7,(function(){var cv=c.cvs(128,256),kk=cv.getContext('2d');kk.fillStyle=C1;kk.fillRect(0,0,128,256);kk.fillStyle=C2;kk.fillRect(0,92,128,34);kk.fillStyle=C3;kk.font='900 56px Heebo, Arial';kk.textAlign='center';kk.direction='ltr';kk.fillText('Home',64,70);kk.fillStyle='#fff';kk.fillText('New',64,200);return c.tex(cv,1,1)})(),0,.2);
 h.cloth(3,6.4,23.0,8.4,.7,h.fabric(C3,C1,6,true),0,.2);
 h.B(11,.2,.3,21.7,11.7,.5,'#2a2a30');
 var pn=[];for(i=0;i<24;i++){var t0=i/23,x=.8+t0*22.4,yy=9.7-Math.sin(t0*Math.PI)*.0-(1-Math.pow(2*t0-1,2))*0-.9*Math.sin(t0*Math.PI)*1;var tg=c.mesh(new T.ConeGeometry(.45,.95,3),c.std([C1,C2,C3][i%3],{side:T.DoubleSide,roughness:.9}),x,yy-.55,5.4,g);tg.rotation.x=Math.PI;tg.rotation.y=Math.PI/2;tg.scale.set(1,1,.15);pn.push(tg)}
 [3.2].forEach(function(z,zi){h.B(23.4,.3,.5,12,10.4,z,'#2a2a34',{metalness:.5});for(var q=0;q<5;q++){var px=2.5+q*4.7+zi*1.5;h.C(.35,.5,.8,px,9.5,z,'#1a1a20',{metalness:.5},10);h.G(px,9.4,z+.2,'#ffe6cf',3,.4)}});
 c.tick(function(t){pn.forEach(function(m,i){m.rotation.z=Math.sin(t*1.4+i*.5)*.1})});
 /* left wall mural + window strip */
 h.T('The New\nHome',7,5.4,.15,6.0,8.0,C3,'#f4f1ff',Math.PI/2,{fs:.34,rr:20,border:C1});g.children[g.children.length-1].position.set(.16,6.2,9.5);
 var wc=c.cvs(64,64),wk=wc.getContext('2d'),gr=wk.createLinearGradient(0,0,0,64);gr.addColorStop(0,'#3a4a8a');gr.addColorStop(1,'#d8789a');wk.fillStyle=gr;wk.fillRect(0,0,64,64);h.P(6,2.2,.16,9.3,3.0,h.bas('#fff',{map:c.tex(wc,1,1)}),Math.PI/2);
 /* high tables */
 [[16.0,8.0],[20.6,6.4]].forEach(function(p){h.C(1.3,1.3,.2,p[0],3.7,p[1],'#e8dcd0',{roughness:.4},20);h.C(.18,.18,3.7,p[0],0,p[1],'#2a2a34',{metalness:.6},8);h.C(.8,.9,.2,p[0],0,p[1],'#2a2a34',{},16);h.mug(p[0]-.5,3.9,p[1]+.2,C1);h.mug(p[0]+.5,3.9,p[1]-.2,'#f4f1ff');h.C(.22,.18,.42,p[0],3.9,p[1]+.4,'#e8e4de',{transparent:true,opacity:.7},10)});
 /* ball */
 var bl=h.S(.7,13,1.2,10.4,'#f4f1ff',{roughness:.45});bl.material.map=null;h.S(.71,13,1.2,10.4,C1,{roughness:.45,transparent:true,opacity:.0});
 c.tick(function(t){bl.position.y=.7+Math.abs(Math.sin(t*4.2))*2.6;bl.rotation.x=t*2});
 h.C(.7,.7,.04,13,.01,10.4,'#2a1c1a',{transparent:true,opacity:.2},14);
 /* people */
 var bt=c.person({skin:c.SK[2],top:'#14141c',bot:'#14141c',hair:'#2a1c14',style:'slick',beard:true,w:1.2,mode:'arrange',s:1.1,apron:__CK.a},{x:6.2,z:1.9,yaw:.15});
 c.person({skin:c.SK[0],top:C1,bot:'#1c2030',hair:'#6a3a22',style:'pony',w:.95,mode:'lean',s:1.04,scarf:[C1,C2],look:.4},{x:3.4,z:6.4,yaw:.3});
 c.person({skin:c.SK[3],top:C2,bot:'#2a3a6a',hair:'#0a0808',style:'curly',stubble:true,w:1.2,mode:'cheer',s:1.1,beanie:C1},{x:8.8,z:6.6,yaw:-.2});
 c.person({skin:c.SK[1],top:'#3a3a48',bot:'#1c2030',hair:'#c8c0b8',style:'short',glasses:true,w:1.2,mode:'talk',s:1.08,jacket:C3,look:.4},{x:14.6,z:8.6,yaw:.9});
 c.person({skin:c.SK[4],top:C1,bot:'#1c2030',hair:'#0a0808',style:'bun',w:.95,mode:'listen',s:1.0,scarf:[C1,C2],look:-.4},{x:17.4,z:8.0,yaw:-.9});
 c.person({skin:c.SK[2],top:'#6a7fb0',bot:'#1c2030',hair:'#14100e',style:'buzz',w:.85,mode:'idle',s:.78,cap:C1},{x:11.4,z:10.2,yaw:.3});
 c.person({skin:c.SK[1],top:'#e8e0d8',bot:'#2a2a30',hair:'#4a2a1a',style:'short',w:1.1,mode:'listen',s:1.08,jacket:C1,look:.3},{x:21.2,z:8.0,yaw:-.6});
 c.setCam(3.3,3.9,8.9,3.3,1.3,1.2,40,63)}});
/* ================= arena-out ================= */
function postLamp(h,c,x,z,hgt,col){h.C(.12,.2,hgt,x,0,z,'#2a2e3a',{metalness:.6,roughness:.4},8);h.B(1.4,.18,.5,x,hgt,z,'#2a2e3a');h.B(1.1,.08,.4,x,hgt-.1,z,'#fff',{}).material=new T.MeshBasicMaterial({color:col||'#ffd6bc'});h.G(x,hgt-.4,z,col||'#ff9a70',7,.55);
 var cone=c.mesh(new T.CylinderGeometry(.3,3.2,hgt,16,1,true),new T.MeshBasicMaterial({color:col||'#ff9a70',transparent:true,opacity:.022,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}),x,hgt/2,z,c.g);cone.castShadow=false}
function bannerTex(c,bg,fg,top,txt,txt2){var cv=c.cvs(128,320),k=cv.getContext('2d');k.fillStyle=bg;k.fillRect(0,0,128,320);k.fillStyle=top;k.fillRect(0,0,128,26);k.fillRect(0,294,128,26);k.fillStyle=fg;k.font='900 54px Heebo, Arial';k.textAlign='center';k.direction='ltr';k.fillText(txt,64,130);if(txt2){k.font='900 40px Heebo, Arial';k.fillText(txt2,64,200)}k.fillStyle=top;k.beginPath();k.arc(64,248,22,0,7);k.fill();return c.tex(cv,1,1)}
RM.def('arena-out',{kind:'hall',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('night');c.fog('#1a1c3e',20,70);
 var gnd=c.mesh(new T.BoxGeometry(110,.6,70),c.std('#fff',{map:c.concrete('#555a66',16,10),roughness:.45}),12,-.3,22,g);gnd.castShadow=false;
 c.light('hemi','#7a88c8',.55,0,0,0,'#2a2438');var s=c.light('dir','#a8b4ff',.5,-8,14,10);c.shadows(s,12);
 c.light('point','#ffb48a',2.0,3.3,2.8,2.4,11);c.light('point','#ff8a9a',1.3,0.6,2.0,1.8,6);c.light('point','#ffd6c0',1.4,6.2,2.4,3.2,8);
 /* upper volume */
 var upC=c.cvs(512,256),k=upC.getContext('2d');k.fillStyle='#8a909c';k.fillRect(0,0,512,256);for(var i=0;i<16;i++){k.fillStyle=i%2?'#868c98':'#9096a2';k.fillRect(i*32,0,31,256)}k.fillStyle='rgba(0,0,0,.18)';for(i=0;i<8;i++)k.fillRect(0,i*32,512,2);
 var up=c.mesh(new T.BoxGeometry(40,13,6),c.std('#fff',{map:c.tex(upC,2,1),roughness:.8}),12,21,-3,g);
 /* base + glass wall interior */
 c.mesh(new T.BoxGeometry(40,3,3),c.std('#6a707c',{roughness:.7}),12,1.5,-1.5,g);
 var ic=c.cvs(512,256),ik=ic.getContext('2d'),gr=ik.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#ffe9dc');gr.addColorStop(1,'#ffbda0');ik.fillStyle=gr;ik.fillRect(0,0,512,256);ik.fillStyle='rgba(120,60,70,.35)';for(i=0;i<34;i++){var px=20+c.rnd()*470,py=150+c.rnd()*70;ik.beginPath();ik.ellipse(px,py+34,10,34,0,0,7);ik.fill();ik.beginPath();ik.arc(px,py-6,9,0,7);ik.fill()}
 ik.strokeStyle='rgba(150,80,90,.45)';ik.lineWidth=6;for(i=0;i<8;i++){ik.beginPath();ik.moveTo(i*70,0);ik.lineTo(i*70+20,256);ik.stroke()}ik.fillStyle=C1;ik.fillRect(200,30,110,24);
 h.P(26,11.4,12,8.6,-.2,h.bas('#fff',{map:c.tex(ic,1,1)}),0);
 for(i=0;i<=8;i++)h.B(.28,11.8,.4,-1+i*3.25,3,.3,'#2a2e3a',{metalness:.6,roughness:.4},.04);[3,5.8,8.6,11.4,14].forEach(function(y){h.B(26.4,.2,.4,12,y,.3,'#2a2e3a',{metalness:.6},.03)});
 h.G(12,8.5,1.6,'#ffd2b8',34,.25);
 /* canopy over entrance */
 h.B(18,.7,7,12,14.3,3.3,'#3a3e4a',{roughness:.5,metalness:.3},.1);h.B(18.2,.25,.3,12,14.0,6.9,C1,{});for(i=0;i<7;i++)h.G(4+i*2.6,13.9,3.5,'#fff0e4',3.2,.6);
 [3.2,20.8].forEach(function(x){h.B(.5,14.3,.5,x,0,6.2,'#4a4e5a',{metalness:.5},.08)});
 /* entrance doors + light spill */
 [-1,0,1].forEach(function(d){h.B(2.4,7,.18,12+d*2.8,0,.55,'#cfe0f4',{transparent:true,opacity:.35,roughness:.1,metalness:.3},.05)});
 var sp=h.P(12,9,12,.04,5.5,h.bas('#ffc8a8',{transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}),0,-Math.PI/2);
 /* LED band */
 var lc=c.cvs(512,64),lk=lc.getContext('2d');lk.fillStyle='#14141c';lk.fillRect(0,0,512,64);lk.fillStyle='#ff6a7a';lk.font='900 48px Heebo, Arial';lk.textAlign='center';lk.fillText('A R E N A',256,50);lk.fillStyle='#fff';for(i=0;i<512;i+=16)lk.fillRect(i,2,8,3);
 var ledP=h.P(26,3.2,12,17.4,.02,h.bas('#fff',{map:c.tex(lc,1,1)}),0);h.G(12,17.4,1,'#ff5a6a',34,.2);
 c.tick(function(t){ledP.material.color.setScalar(.88+Math.sin(t*3)*.08)});
 /* banners on upper face */
 [[3.5,bannerTex(c,C1,'#fff',C3,'Together','Always')],[8.8,bannerTex(c,C3,'#fff',C1,'The Home','Ours')],[15.2,bannerTex(c,C2,C3,C1,'All','The Way')],[20.5,bannerTex(c,C1,'#fff',C2,'More','Victory')]].forEach(function(b,i){h.cloth(3.6,9,b[0]+(i>1?2.8:0),22.6,.4,b[1],0,.28)});
 /* ticket booth (left) + queue along z */
 h.B(4.2,5.4,3.0,-2,0,6.0,'#4a4e5a',{roughness:.6},.1);h.B(4.6,.4,3.4,-2,5.4,6.0,'#2a2e3a');h.P(3,1.8,-2,3.6,7.55,h.bas('#ffe6d4'),0);h.T('Tickets',3.6,1.0,-2,5.9,7.6,C1,'#fff',0,{fs:.6,basic:true,emit:0});h.G(-2,3.6,8.2,'#ffcab0',9,.4);
 h.B(3.4,1.0,.5,-2,1.2,7.6,'#2a2e3a');
 [0,1,2,3,4,5,6].forEach(function(i){var x=2.4+i*3.0;h.C(.12,.12,2.2,x,0,7.5,'#9aa2ae',{metalness:.8,roughness:.3},8);h.C(.2,.2,.1,x,2.2,7.5,'#c4ccd6',{metalness:.8},8);if(i<6){var rp=h.B(2.8,.18,.12,x+1.5,1.6,7.5,C1,{roughness:.8},.05)}});
 /* queue */
 var q=[[2.4,'#3a3a48',C1,'short',1,'cheer'],[5.0,C1,'#1c2030','curly',3,'talk'],[7.4,C2,'#2a3a6a','bun',0,'idle'],[9.8,'#2a2f4a','#1c2030','buzz',2,'listen'],[12.2,C1,'#1c2030','pony',4,'talk'],[14.6,'#e8e0d8','#1c2030','short',1,'idle'],[17.0,C3,'#2a2a30','slick',3,'idle']];
 q.forEach(function(e,i){var p=c.person({skin:c.SK[e[4]],top:e[1],bot:e[2],hair:['#1a1210','#0a0808','#6a3a22','#2a1c14','#c8c0b8'][i%5],style:e[3],w:i%2?1.1:.95,mode:e[5]==='cheer'?'cheer':e[5],s:1.0+(i%3)*.05,scarf:i%2?[C1,C2]:null,beanie:i===3?C1:null,jacket:i===5?'#3a3a48':null,look:.3},{x:e[0]+.5,z:9.4+(i%2)*.3,yaw:-1.35+((i*37)%10)*.025});});
 var kid=c.person({skin:c.SK[2],top:C1,bot:'#2a3a6a',hair:'#14100e',style:'short',w:.85,mode:'cheer',s:.7,scarf:[C1,C2]},{x:6.0,z:11.4,yaw:-.3});
 /* scarf seller cart */
 h.B(4.4,2.2,2.2,26.5,.8,10.5,'#7a2434',{roughness:.6},.1);[[-2.0,-1],[2.0,-1],[-2.0,1],[2.0,1]].forEach(function(p){h.C(.1,.1,6.2,26.5+p[0],0,10.5+p[1],'#c4ccd6',{metalness:.8},6)});h.B(5,.2,3,26.5,6.2,10.5,C1,{});for(i=0;i<8;i++)h.B(.5,.55,3.02,24.3+i*.62,6.35+((i%2)*.0),10.5,i%2?C2:C1,{},.04);
 for(i=0;i<5;i++)h.cloth(.8,3.0,24.8+i*.9,4.6,11.4,h.fabric(i%2?C1:C3,C2,7,true),0,.1);h.G(26.5,3.8,11.6,'#ffd0b0',9,.4);
 c.person({skin:c.SK[3],top:'#d8c8bc',bot:'#2a2f4a',hair:'#14100e',style:'curly',beard:true,w:1.2,mode:'talk',s:1.08,cap:C3},{x:23.6,z:11.8,yaw:.7});
 c.person({skin:c.SK[0],top:C1,bot:'#1c2030',hair:'#6a3a22',style:'long',w:.95,mode:'cheer',s:1.0,scarf:[C1,C2]},{x:20.0,z:13.0,yaw:-.4});
 c.person({skin:c.SK[1],top:C2,bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.15,mode:'cheer',s:1.08,scarf:[C1,C2]},{x:17.2,z:14.6,yaw:.2});
 /* lamp posts */
 postLamp(h,c,-7,13,18,'#ffd6bc');postLamp(h,c,32,15,18,'#ffd6bc');

 /* distant towers */
 [[-44,11],[58,13],[-62,18]].forEach(function(t,i){var tc=c.cvs(128,256),tk=tc.getContext('2d');tk.fillStyle='#161a30';tk.fillRect(0,0,128,256);for(var yy=8;yy<250;yy+=16)for(var xx=8;xx<120;xx+=16){tk.fillStyle=c.rnd()<.35?'#ffc4a8':'#262c4a';tk.fillRect(xx,yy,8,9)}c.mesh(new T.BoxGeometry(t[1],t[1]*3,t[1]),new T.MeshBasicMaterial({map:c.tex(tc,2,3),color:'#6a6a88'}),t[0],t[1]*1.5,-26-i*6,g)});
 c.setCam(3.2,2.5,11.8,3.4,3.3,1.0,48,70)}});
/* ================= shared arena bowl ================= */
function courtTex(c,C1){var cv=c.cvs(1024,720),k=cv.getContext('2d');for(var i=0;i<36;i++){k.fillStyle='hsl('+(25+(i%3))+','+(34+(i%2)*4)+'%,'+(60+(i%4)*2)+'%)';k.fillRect(0,i*20,1024,19);k.fillStyle='rgba(80,50,30,.2)';k.fillRect(0,i*20+19,1024,1)}
 k.fillStyle='rgba(216,40,62,.92)';k.fillRect(352,0,320,300);k.strokeStyle='#fff';k.lineWidth=8;k.strokeRect(352,4,320,296);k.beginPath();k.arc(512,300,110,0,Math.PI);k.stroke();k.setLineDash([22,18]);k.beginPath();k.arc(512,300,110,Math.PI,2*Math.PI);k.stroke();k.setLineDash([]);
 k.beginPath();k.arc(512,52,420,.18*Math.PI,.82*Math.PI);k.stroke();k.beginPath();k.moveTo(106,4);k.lineTo(106,160);k.moveTo(918,4);k.lineTo(918,160);k.stroke();k.beginPath();k.moveTo(0,716);k.lineTo(1024,716);k.stroke();k.beginPath();k.arc(512,716,120,Math.PI,2*Math.PI);k.stroke();k.fillStyle='#f4f1ff';k.beginPath();k.arc(512,52,8,0,7);k.fill();
 k.strokeRect(4,4,1016,712);return c.tex(cv,1,1)}
function bowl(c,grp,o){var h=H(c,grp),g=grp,C1=h.C1,C2=h.C2,C3=h.C3;o=o||{};var z0=0;
 /* surround floor + court */
 var sf=h.P(120,90,12,-.02,-30,c.std('#1c2236',{roughness:.6}),0,-Math.PI/2);
 var ct=h.P(48,34,12,.03,-20,c.std('#fff',{map:courtTex(c,C1),roughness:.35,metalness:.05}),0,-Math.PI/2);ct.receiveShadow=true;
 /* hoop */
 h.B(.5,15,.5,12,0,-39.4,'#2a2e3a',{metalness:.5,roughness:.4},.1);h.B(.3,.5,5,12,13.2,-37,'#2a2e3a',{metalness:.5});h.B(1.2,8.6,1.2,12,0,-38.2,__CK.a,{roughness:.7},.2).scale.set(1,.5,1);
 h.B(6.4,3.8,.26,12,10.0,-34.8,'#e8f0f8',{transparent:true,opacity:.6,roughness:.1,metalness:.2},.05);h.B(6.7,.18,.3,12,13.7,-34.8,C1);h.B(6.7,.18,.3,12,9.9,-34.8,C1);h.B(.18,3.8,.3,8.7,10.0,-34.8,C1);h.B(.18,3.8,.3,15.3,10.0,-34.8,C1);h.B(2.4,1.9,.3,12,10.1,-34.5,'#fff',{transparent:true,opacity:.4});
 var rim=c.mesh(new T.TorusGeometry(.85,.07,8,24),c.std(C1,{roughness:.4}),12,10.2,-33.6,g);rim.rotation.x=Math.PI/2;var net=c.mesh(new T.CylinderGeometry(.85,.45,1.4,16,1,true),new T.MeshBasicMaterial({color:'#ffffff',wireframe:true,transparent:true,opacity:.7}),12,9.5,-33.6,g);net.castShadow=false;
 /* LED ad ribbon */
 var ac=c.cvs(1024,64),k=ac.getContext('2d');k.fillStyle='#14141c';k.fillRect(0,0,1024,64);var words=['Together','All the Way','Our Home','FORWARD','Energy','City','Stand','Loyalty'];k.direction='ltr';k.textAlign='center';words.forEach(function(w,i){k.fillStyle=[C1,'#f4f1ff','#8aa8ff'][i%3];k.font='900 40px Heebo, Arial';k.fillText(w,64+i*128,46)});
 var aw=o.noSide?16:60;var at=c.tex(ac,aw/20,1);var ad=h.P(aw,1.6,12,.9,-2.6,h.bas('#fff',{map:at}),0);c.tick(function(t){at.offset.x=(t*.03)%1});h.B(aw,.3,.5,12,1.65,-2.7,'#2a2e3a',{},.05);
 if(!o.noSide)[[-18,-4],[42,-4]].forEach(function(p){h.P(60,1.6,p[0]+(p[0]<0?-12:12),.9,-20,h.bas('#fff',{map:at}),p[0]<0?Math.PI/2:-Math.PI/2)});
 /* far stand tiers + crowd */
 var spots=[],rows=o.rows||9;for(var r=0;r<rows;r++){var z=-44-r*2.1,y=1.2+r*1.15;h.B(70,y,2.1,12,0,z,r%2?'#2c3248':'#323a54',{roughness:.8},.03);for(var x=-14;x<=38;x+=2.0)if(c.rnd()<(o.fill||.88)){spots.push({x:x+c.rnd()*.5,y:y,z:z+.1,s:.95+c.rnd()*.12})}}
 for(r=0;r<(o.noSide?0:5);r++){var xs=-16-r*2.1,y2=1.2+r*1.15;h.B(2.1,y2,50,xs,0,-22,r%2?'#2c3248':'#323a54',{},.03);for(var zz=-4;zz>-40;zz-=2.2)if(c.rnd()<.8)spots.push({x:xs+.1,y:y2,z:zz+c.rnd()*.4,s:1});var xe=40+r*2.1;h.B(2.1,y2,50,xe,0,-22,r%2?'#2c3248':'#323a54',{},.03);for(zz=-4;zz>-40;zz-=2.2)if(c.rnd()<.8)spots.push({x:xe-.1,y:y2,z:zz+c.rnd()*.4,s:1})}
 h.crowd(spots,{cols:[C1,C1,C1,C1,C2,C2,C3,'#6a7fb0','#d8c8c0','#2a2f4a'],cheer:.3});
 /* back wall + roof rig */
 h.B(80,40,1,12,0,-66,'#14182a',{roughness:.9});h.B(70,.8,.8,12,29,-30,'#2a2e3a',{metalness:.4});
 for(i=0;i<9;i++){var lx=-14+i*6.6;h.B(2.4,.35,2.4,lx,28.6,-30,'#fff',{}).material=new T.MeshBasicMaterial({color:'#fff4ea'});h.G(lx,28.4,-30,'#ffe6d4',12,.5);h.G(lx,14,-30,'#ffe6d4',16,.12)}
 var sb=h.B(7,3.4,7,12,16.5,-24,'#14141c',{metalness:.3,roughness:.5});var sc=c.cvs(256,128),sk=sc.getContext('2d');sk.fillStyle='#14141c';sk.fillRect(0,0,256,128);sk.fillStyle='#ff5a6a';sk.font='900 62px Arial';sk.textAlign='center';sk.fillText('78 : 74',128,70);sk.fillStyle='#f4f1ff';sk.font='bold 26px Arial';sk.fillText('Q4   02:17',128,112);[0,1,2,3].forEach(function(i){var a=i*Math.PI/2;var pl=h.P(6.6,3.2,12+Math.sin(a)*3.55,18.2,-24+Math.cos(a)*3.55,h.bas('#fff',{map:c.tex(sc,1,1)}),a);});
 return h}
/* ================= arena-seats ================= */
RM.def('arena-seats',{kind:'hall',build:function(c){var g=c.g;c.sky('indoor');c.fog('#12162a',60,130);
 c.light('hemi','#d8e0ff',.85,0,0,0,'#3a3040');var s=c.light('dir','#fff2ea',1.1,-5,18,6);c.shadows(s,9);c.light('point','#ffb48a',1.2,3.2,2.0,3.0,8);c.light('point','#ffd6c0',1.2,6.0,2.4,3.4,9);
 var h=bowl(c,g,{}),C1=h.C1,C2=h.C2,C3=h.C3;
 /* viewer's tiers */
 var rowsY=[1.6,2.7,3.8,4.9];[0,1,2,3].forEach(function(r){var z=7.2-r*-2.0+0;});
 var rz=[3.2,5.4,7.6,9.8,12.0],ry=[1.0,1.9,2.8,3.7,4.6];
 rz.forEach(function(z,r){h.B(70,ry[r],2.2,12,0,z,r%2?'#2c3248':'#323a54',{roughness:.8},.03);
  for(var x=-8;x<=34;x+=2.1)h.B(1.5,.3,1.6,x,ry[r]+.05,z+.2,r%2?C1:C3,{roughness:.8},.1);for(x=-8;x<=34;x+=2.1)h.B(1.5,1.3,.3,x,ry[r]+.35,z+.95,r%2?C1:C3,{roughness:.8},.1)});
 h.B(70,1.0,.25,12,ry[0]+1.0,1.9,'#2a2e3a',{metalness:.5},.03);
 /* foreground fans */
 var y0=ry[1]+.0,y1=ry[0]+.0;
 var pA=c.person({skin:c.SK[1],top:C1,bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.15,mode:'cheer',s:1.08,scarf:[C1,C2]},{x:6.6,z:5.4,yaw:Math.PI+.55});pA.position.y=ry[1]*c.U;
 var pB=c.person({skin:c.SK[3],top:'#e8e0d8',bot:'#1c2030',hair:'#0a0808',style:'curly',w:1.2,mode:'sit',s:1.1,beard:true,jacket:C3},{x:11.0,z:5.8,yaw:.75});pB.position.y=(ry[1]+.35)*c.U-.5+.15;
 var pC=c.person({skin:c.SK[0],top:C2,bot:'#2a3a6a',hair:'#6a3a22',style:'pony',w:.95,mode:'sing',s:1.04,scarf:[C1,C2]},{x:15.4,z:3.3,yaw:Math.PI+.2});pC.position.y=ry[0]*c.U;
 var pD=c.person({skin:c.SK[2],top:C1,bot:'#202432',hair:'#14100e',style:'bun',w:.95,mode:'talk',s:1.0,look:.4},{x:20.4,z:7.7,yaw:.6});pD.position.y=ry[2]*c.U;
 var pE=c.person({skin:c.SK[4],top:'#2a2f4a',bot:'#1c2030',hair:'#0a0808',style:'buzz',w:1.1,mode:'sit',s:1.08,beanie:C1},{x:2.6,z:7.8,yaw:Math.PI-.9});pE.position.y=(ry[2]+.35)*c.U-.5+.15;
 var pF=c.person({skin:c.SK[1],top:'#6a7fb0',bot:'#1c2030',hair:'#c8c0b8',style:'slick',w:1.15,mode:'listen',s:1.06,glasses:true,jacket:'#3a3a48',look:.5},{x:24.6,z:5.2,yaw:Math.PI+1.0});pF.position.y=ry[1]*c.U;
 c.setCam(3.3,3.1,6.2,3.5,1.5,-5.0,52,72)}});
/* ================= menora ================= */
RM.def('menora',{kind:'hall',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 var HH=11;
 var fl=c.mesh(new T.BoxGeometry(34,.6,20),c.std('#fff',{map:c.concrete('#9aa0aa',8,5),roughness:.22,metalness:.1}),12,-.3,8,g);fl.castShadow=false;
 var wm=c.concrete('#aab0ba',5,2.5);
 c.mesh(new T.BoxGeometry(.6,HH,20),c.std('#fff',{map:wm,roughness:.9}),-.3,HH/2,8,g);c.mesh(new T.BoxGeometry(.6,HH,20),c.std('#fff',{map:wm,roughness:.9}),24.3,HH/2,8,g);
 c.mesh(new T.BoxGeometry(6.4,HH,.6),c.std('#fff',{map:wm,roughness:.9}),3.0,HH/2,-.3,g);c.mesh(new T.BoxGeometry(6.4,HH,.6),c.std('#fff',{map:wm,roughness:.9}),21.0,HH/2,-.3,g);c.mesh(new T.BoxGeometry(11.6,HH-8,.6),c.std('#fff',{map:wm,roughness:.9}),12,8+(HH-8)/2,-.3,g);
 h.B(34,.5,.5,12,0,.35,'#3a3e4a');
 c.light('hemi','#e6ecff',.62,0,0,0,'#40343a');var s=c.light('dir','#ffe6dc',.8,-8,14,12);c.shadows(s,9);c.light('point','#ffb48a',1.0,3.0,2.3,2.6,9);c.light('point','#ffd6c0',1.0,5.8,2.4,2.8,9);c.light('point','#bcd0ff',1.4,3.3,2.0,-.8,8);
 var g2=new T.Group();g2.position.set(0,0,-.3);g.add(g2);bowl(c,g2,{rows:6,fill:.9,noSide:true});
 h.B(11.8,.7,.8,12,7.6,.1,C1,{roughness:.5});h.B(.7,7.6,.8,6.2,0,.1,'#4a4e5a');h.B(.7,7.6,.8,17.8,0,.1,'#4a4e5a');
 h.T('Gate 12  ←  Seats',6.6,1.2,12,9.3,.1,'#14141c','#f4f1ff',0,{fs:.52,rr:12,border:C1});
 /* scanners */
 [8.8,12,15.2].forEach(function(x,i){h.B(1.1,3.3,1.1,x,0,2.4,'#2a2e3a',{metalness:.4,roughness:.5},.1);var tp=h.B(.9,.5,.9,x,3.3,2.4,i===1?C1:'#3a3e4a',{},.1);tp.material.emissive=new T.Color(i===1?'#ff6a7a':'#6a7a8a').convertSRGBToLinear();tp.material.emissiveIntensity=.8;h.G(x,3.9,2.7,i===1?'#ff8a96':'#9ab0ff',2.2,.45)});
 /* concession counter against the back wall (left) */
 h.B(5.6,3.6,2.2,3.0,0,2.4,'#2a2e3a',{roughness:.5},.1);h.B(6.0,.22,2.6,3.0,3.6,2.4,'#d8dce2',{metalness:.3,roughness:.25});h.B(5.2,.5,.3,3.0,.5,3.55,C1,{});
 var mc=c.cvs(512,256),mk=mc.getContext('2d');mk.fillStyle='#14141c';mk.fillRect(0,0,512,256);mk.direction='ltr';mk.textAlign='right';mk.fillStyle='#f4f1ff';mk.font='900 44px Heebo, Arial';mk.fillText('Menu',490,52);mk.font='700 34px Heebo, Arial';[['Beer  22','#ff8a96'],['Hot Dog  18','#f4f1ff'],['Popcorn  14','#f4f1ff'],['Drinks  10','#8ab0ff']].forEach(function(r,i){mk.fillStyle=r[1];mk.fillText(r[0],490,104+i*40)});
 h.P(5.2,2.6,3.0,6.4,.05,h.bas('#fff',{map:c.tex(mc,1,1)}),0);h.B(5.6,3.0,.15,3.0,5.1,.0,'#1a1a20',{},.05);h.G(3.0,6.4,.5,'#cfd8ff',9,.16);
 h.B(1.0,1.6,1.0,1.4,3.8,2.4,'#e8e4de',{metalness:.4});for(var i=0;i<3;i++)h.C(.3,.25,.6,3.6+i*.9,3.82,2.5,'#e8e4de',{},12);h.B(1.2,.9,.9,5.2,3.82,2.3,'#cfd8e2',{metalness:.5});
 /* merch stall (right, against the wall) */
 h.B(.35,6.4,.35,18.6,0,3.8,'#2a2e3a');h.B(.35,6.4,.35,23.4,0,3.8,'#2a2e3a');h.B(5.4,.5,3.2,21,6.2,2.4,C1,{});h.B(5.0,3.2,.3,21,2.2,.9,'#2a2e3a',{},.05);
 for(i=0;i<5;i++)shirtOn(h,c,19.3+i*.95,5.8,1.3,[C1,C2,C3,C1,C2][i],0,[C2,C1,C1,C3,C3][i]);for(i=0;i<5;i++)h.cloth(.7,2.6,19.2+i*.95,3.4,2.3,h.fabric(i%2?C1:C3,C2,7,true),0,.08);
 h.B(5.0,.3,1.6,21,2.6,3.4,'#e8dcd0',{roughness:.5});h.T('Merchandise',3.4,.9,21,6.8,4.0,C3,'#f4f1ff',0,{fs:.55,rr:10});
 /* banners + hanging signs */
 h.cloth(2.6,6.2,3.0,5.8,.1,bannerTex(c,C1,'#fff',C3,'Home','Ours'),0,.1);h.cloth(2.6,6.2,21,6.0,.1,bannerTex(c,C3,'#fff',C1,'Together','Always'),0,.1);
 [[2.6,'←  Seats'],[19.2,'Toilets  →']].forEach(function(p,i){h.B(.1,3,.1,p[0]+.3,9.4,6.5,'#2a2a30');h.B(.1,3,.1,p[0]+2.9,9.4,6.5,'#2a2a30');h.T(p[1],3.2,1.0,p[0]+1.6,9.0,6.5,'#14141c','#f4f1ff',0,{fs:.55,rr:8,border:C2})});
 for(i=0;i<8;i++){h.B(2,.14,.9,2+i*2.9,10.4,5.4,'#fff',{}).material=new T.MeshBasicMaterial({color:'#fff4ea'});h.G(2+i*2.9,10.2,5.4,'#ffe6d4',4,.4)}
 /* people */
 c.person({skin:c.SK[2],top:C3,bot:'#2a2a30',hair:'#c8c0b8',style:'slick',w:1.2,mode:'talk',s:1.08,apron:__CK.a,look:-.3},{x:3.2,z:.95,yaw:0});
 c.person({skin:c.SK[0],top:C2,bot:'#2a3a6a',hair:'#6a3a22',style:'pony',w:.95,mode:'cheer',s:1.02,scarf:[C1,C2]},{x:5.6,z:6.2,yaw:.2});
 c.person({skin:c.SK[3],top:'#14141c',bot:'#14141c',hair:'#0a0808',style:'curly',beard:true,w:1.2,mode:'listen',s:1.1,collar:'#e84a5a',look:-.4},{x:8.6,z:4.6,yaw:.2});
 c.person({skin:c.SK[1],top:C1,bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.15,mode:'talk',s:1.08,scarf:[C1,C2],look:.4},{x:12.8,z:5.8,yaw:.35});
 c.person({skin:c.SK[2],top:'#6a7fb0',bot:'#1c2030',hair:'#2a1c14',style:'bun',w:.95,mode:'listen',s:1.0,beanie:C3,look:-.5},{x:15.0,z:7.4,yaw:-.45});
 c.person({skin:c.SK[4],top:C2,bot:'#202432',hair:'#0a0808',style:'buzz',w:.85,mode:'cheer',s:.8,scarf:[C1,C2]},{x:10.8,z:8.8,yaw:0});
 c.person({skin:c.SK[1],top:'#e8e0d8',bot:'#2a2f4a',hair:'#4a2a1a',style:'long',w:.95,mode:'listen',s:1.0,look:-.5},{x:20.8,z:6.2,yaw:-.2});
 c.person({skin:c.SK[3],top:C1,bot:'#1c2030',hair:'#14100e',style:'short',w:1.2,mode:'idle',s:1.1,jacket:C3,glasses:true},{x:12,z:3.5,yaw:0});
 c.setCam(3.3,3.8,9.2,3.4,2.0,-.3,40,64)}});
/* ================= ussishkin family ================= */
function rod(h,c,x1,y1,x2,y2,r,col,gp,z){var L=Math.hypot(x2-x1,y2-y1),m=c.mesh(new T.CylinderGeometry(r,r,L,6),c.std(col,{metalness:.5,roughness:.4}),(x1+x2)/2,(y1+y2)/2,z||0,gp);m.rotation.z=Math.atan2(x2-x1,-(y2-y1))+Math.PI;m.rotation.z=-Math.atan2(x2-x1,y2-y1);return m}
function bike(h,c,x,z,ry,col){var gp=new T.Group();gp.position.set(x,0,z);gp.rotation.y=ry;c.g.add(gp);[-1.5,1.5].forEach(function(dx){c.mesh(new T.TorusGeometry(.85,.07,6,22),c.std('#1a1a20',{roughness:.6}),dx,.92,0,gp);c.mesh(new T.TorusGeometry(.8,.015,4,22),c.std('#aab2bc',{metalness:.8}),dx,.92,0,gp)});
 rod(h,c,-1.5,.92,-.4,.92,.05,col,gp);rod(h,c,-.4,.92,-.2,2.1,.05,col,gp);rod(h,c,-.2,2.1,1.2,2.1,.05,col,gp);rod(h,c,1.2,2.1,1.5,.92,.05,col,gp);rod(h,c,-.4,.92,1.2,2.1,.05,col,gp);rod(h,c,-.2,2.1,-.3,2.5,.04,'#2a2a30',gp);h.B(.8,.14,.3,-.35,2.5,0,'#2a2a30',{},.05,gp);rod(h,c,1.2,2.1,1.1,2.6,.04,'#2a2a30',gp);h.B(.12,.12,1.2,1.1,2.6,0,'#2a2a30',{},.05,gp);return gp}
function facadeTex(c,base,C1){var cv=c.cvs(512,256),k=cv.getContext('2d');k.fillStyle=base;k.fillRect(0,0,512,256);for(var i=0;i<60;i++){k.fillStyle='rgba(60,50,45,'+(.04+c.rnd()*.08)+')';k.fillRect(c.rnd()*512,0,2+c.rnd()*8,60+c.rnd()*196)}
 for(i=0;i<900;i++){k.fillStyle='rgba('+(c.rnd()<.5?'255,255,255':'60,50,45')+','+(c.rnd()*.07)+')';k.fillRect(c.rnd()*512,c.rnd()*256,3,3)}
 for(var r=0;r<4;r++)for(var q=-1;q<12;q++){var x=q*46+(r%2?23:0),y=256-(r+1)*30;k.fillStyle='hsl(24,8%,'+(52+c.rnd()*12)+'%)';k.fillRect(x+2,y+2,42,26);}
 return c.tex(cv,1,1)}
RM.def('ussishkin-outside',{kind:'hall',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('dusk');c.fog('#4a3a58',24,80);
 c.mesh(new T.BoxGeometry(100,.6,60),c.std('#fff',{map:c.cobble(),roughness:.85}),12,-.3,22,g).castShadow=false;
 h.B(60,.4,3.4,12,0,2.2,'#8a8680',{roughness:.9},.03);
 c.light('hemi','#9aa8e0',.55,0,0,0,'#40343a');var s=c.light('dir','#ffa88a',.8,-10,9,10);c.shadows(s,10);c.light('point','#ffb48a',1.7,3.3,2.5,1.6,9);c.light('point','#ffc4a8',.9,6.4,2.0,3.6,8);
 /* building */
 var W=34,HH=17;c.mesh(new T.BoxGeometry(W,HH,8),c.std('#fff',{map:facadeTex(c,'#c6b8a6',C1),roughness:.95}),12,HH/2,-4,g);
 h.B(W+.6,.9,8.6,12,HH,-4,'#6a645e',{roughness:.9},.05);h.B(W+.6,.5,.7,12,HH+.9,0,'#8a847c',{},.03);
 /* door */
 h.B(6.8,.6,1.2,12,8.0,.6,'#8a847c');h.B(.7,8.0,1.0,8.8,0,.5,'#8a847c');h.B(.7,8.0,1.0,15.2,0,.5,'#8a847c');h.B(5.5,7.4,.5,12,0,.3,'#14182a',{});
 h.P(1.9,6.8,12.8,3.5,.6,h.bas('#ffc4a8'),0);h.G(12.8,3.5,1.4,'#ffb48a',9,.55);[[10.55,2.6],[14.4,1.2]].forEach(function(sg){h.B(sg[1],7.1,.28,sg[0],0,.55,'#2a3f5a',{roughness:.5,metalness:.3},.04);h.B(sg[1]-.6,3.0,.1,sg[0],3.2,.72,'#35506e',{roughness:.5},.02);h.B(sg[1]-.6,1.6,.1,sg[0],.8,.72,'#35506e',{roughness:.5},.02)});h.C(.07,.07,1.4,12.0,3.2,.85,'#c4ccd6',{metalness:.9},6);
 [0,1,2].forEach(function(i){h.B(8+i*.9,.35,1.2+(2-i)*.0+ (2-i)*.7,12,i*.35,1.2+(2-i)*.0+i*0+ (2-i)*.0,'#9a948c',{roughness:.9},.03)});
 /* cage lamp over door + glow */
 [8.0,16.0].forEach(function(lx){h.B(.7,.5,.6,lx,6.6,.9,'#2a2a30');h.S(.3,lx,6.5,1.2,'#fff0e2',{emissive:'#fff0e2',emissiveIntensity:1.4});h.G(lx,6.5,1.5,'#ffb48a',8,.7)});
 /* hand-painted sign */
 var sc=c.cvs(1024,300),k=sc.getContext('2d');k.fillStyle='#e8dcc8';k.fillRect(0,0,1024,300);for(var i=0;i<400;i++){k.fillStyle='rgba(120,100,80,.06)';k.fillRect(c.rnd()*1024,c.rnd()*300,40,2)}k.strokeStyle=C1;k.lineWidth=14;k.strokeRect(14,14,996,272);k.direction='ltr';k.textAlign='center';k.font='900 128px Heebo, Arial';k.fillStyle=C3;k.fillText('Ussishkin Hall',518,200);k.fillStyle=C1;k.fillText('Ussishkin Hall',510,194);
 k.fillStyle=C1;[300,420,680].forEach(function(x){k.fillRect(x,230,5,50+c.rnd()*20)});
 var sg2=h.P(10,2.9,12,10.4,.15,c.std('#fff',{map:c.tex(sc,1,1),roughness:.8}),0);sg2.rotation.z=-.02;h.B(10.4,.2,.3,12,11.9,.1,'#4a3a34');h.B(.15,1.4,.3,7.3,10.9,.1,'#4a3a34');h.B(.15,1.4,.3,16.7,10.9,.1,'#4a3a34');
 /* windows */
 [3.6,20.4,26.5,-1.6].forEach(function(x,i){h.B(2.8,2.3,.4,x,6.8,.2,'#4a4a52');var gl=h.P(2.3,1.8,x,7.95,.42,h.bas(i===1?'#6a6a86':'#ffcbb0'),0);for(var b=0;b<4;b++)h.B(.08,1.9,.1,x-.9+b*.6,7.0,.5,'#2a2a30');h.G(x,7.9,.8,i===1?'#8a8ac0':'#ffb48a',i===1?3:6,.5)});
 /* poster, graffiti */
 h.T('TONIGHT  20:00\nHome Game',3.0,3.8,5.6,5.6,.08,'#f4f1ff','#2a2a34',0,{fs:.3,border:C1});h.T('All the Way',2.0,.7,3.2,4.3,.05,null,C1,.02,{fs:.8,stroke:'#f4f1ff'});
 h.T('Together',4,1.6,22.5,2.8,.1,null,C1,-.06,{fs:.9,stroke:C3});h.C(.22,.22,12,25.8,0,.5,'#7a7a82',{metalness:.5},8);h.B(.9,1.2,.5,27.8,4.0,.2,'#4a4e56');h.C(.1,.1,9,30.2,HH+.8,-2,'#2a2e3a',{metalness:.6},6);h.cloth(4.2,2.6,32.4,HH+7.4,-2,h.fabric(C1,C2,6,false),0,.5);h.B(4,.8,2,6,HH+.8,-2,'#5a544e');h.B(2,1.6,2,22,HH+.8,-2,'#5a544e');
 /* banners on the parapet */
 [[2.4,C1,C2],[5.0,C3,C1],[19.4,C2,C1],[22.0,C1,C3],[24.6,C3,C2]].forEach(function(b,i){h.cloth(2.0,3.8,b[0],11.4+1.5,.9,h.fabric(b[1],b[2],6,true),0,.2)});
 /* bikes + bin */
 bike(h,c,4.5,1.7,Math.PI/2+.1,'#3a64d8');bike(h,c,7.4,1.5,Math.PI/2-.1,C1);bike(h,c,22.0,1.7,Math.PI/2,'#aab2bc');h.C(.7,.6,2.0,26.5,0,3.6,'#3a3e46',{roughness:.6},12);
 /* old street lamp */
 h.C(.12,.2,13,-6,0,6.5,'#2a2e3a',{metalness:.6},8);h.B(1.4,.18,.5,-5.3,13,6.5,'#2a2e3a');h.G(-5.0,12.6,6.5,'#ffb48a',8,.6);
 /* people */
 c.person({skin:c.SK[1],top:'#6a6a7a',bot:'#2a2f4a',hair:'#c8c0b8',style:'short',stubble:true,w:1.2,mode:'lean',s:1.05,cap:C3,scarf:[C1,C2],look:.6,jacket:'#4a4a52'},{x:16.6,z:4.6,yaw:-.45});
 c.person({skin:c.SK[3],top:C1,bot:'#202432',hair:'#0a0808',style:'buzz',w:.85,mode:'cheer',s:.76,scarf:[C1,C2]},{x:7.2,z:5.0,yaw:.25});
 c.person({skin:c.SK[0],top:C2,bot:'#2a3a6a',hair:'#6a3a22',style:'pony',w:.82,mode:'talk',s:.78,look:.5},{x:8.6,z:6.0,yaw:.55});
 c.person({skin:c.SK[2],top:'#e8e0d8',bot:'#1c2030',hair:'#2a1c14',style:'bun',w:.95,mode:'listen',s:1.0,jacket:C1,look:-.5},{x:18.2,z:5.6,yaw:-.5});
 c.person({skin:c.SK[4],top:'#6a7a9a',bot:'#2a2f4a',hair:'#0a0808',style:'curly',beard:true,w:1.2,mode:'idle',s:1.1,collar:C1,glasses:true},{x:14.6,z:7.4,yaw:-.1});
 c.person({skin:c.SK[1],top:'#4a5a7a',bot:'#2a2a30',hair:'#1a1210',style:'slick',w:1.1,mode:'talk',s:1.08,look:.3,scarf:[C1,C2]},{x:5.6,z:4.0,yaw:.65});
 c.setCam(3.6,2.1,9.6,3.6,3.2,.5,48,68)}});
/* ================= ussishkin-hall ================= */
RM.def('ussishkin-hall',{kind:'hall',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 var HH=18;
 var pc=c.cvs(512,512),k=pc.getContext('2d');for(var i=0;i<20;i++){k.fillStyle='hsl('+(24+(i%3)*2)+','+(30+(i%2)*5)+'%,'+(56+(i%4)*2)+'%)';k.fillRect(0,i*25.6,512,24);k.fillStyle='rgba(70,45,25,.25)';k.fillRect(0,i*25.6+24,512,2);for(var j=0;j<3;j++)k.fillRect((i*97+j*211)%512,i*25.6,2,24)}
 k.strokeStyle='rgba(255,255,255,.88)';k.lineWidth=9;k.strokeRect(0,0,512,512);var ftex=c.tex(pc,1,1);
 var fl=c.mesh(new T.BoxGeometry(26,.6,18),c.std('#fff',{map:ftex,roughness:.4}),12,-.3,5,g);fl.castShadow=false;
 /* worn centre mark */
 var cc=c.cvs(512,256),ck=cc.getContext('2d');ck.strokeStyle='rgba(255,255,255,.9)';ck.lineWidth=9;ck.beginPath();ck.arc(256,128,100,Math.PI,2*Math.PI);ck.stroke();ck.fillStyle='rgba(216,40,62,.55)';ck.fillRect(300,0,150,100);ck.strokeRect(300,4,150,96);ck.fillStyle='rgba(216,40,62,.9)';
 var wm=c.wall('#e0d4c0',['#d4c8b4','#eadfcc','#c8bca8'],4,1.5);
 c.mesh(new T.BoxGeometry(27,HH,.6),c.std('#fff',{map:wm,roughness:.95}),12,HH/2,-.3,g);c.mesh(new T.BoxGeometry(.6,HH,20),c.std('#fff',{map:wm,roughness:.95}),-.3,HH/2,9,g);c.mesh(new T.BoxGeometry(.6,HH,20),c.std('#fff',{map:wm,roughness:.95}),24.3,HH/2,9,g);
 h.B(.4,5.5,18,.2,0,9,'#2f5a56',{roughness:.7},.02);h.B(.4,5.5,18,24.1,0,9,'#2f5a56',{roughness:.7},.02);[4,8,12,16].forEach(function(z){var wg=h.P(2.4,3,24.0,9,z,h.bas('#ffcbb0',{transparent:true,opacity:.9}),-Math.PI/2);h.G(23.4,9,z,'#ffb48a',5,.35)});h.B(27,.2,.3,12,5.6,.15,'#4a3a34');
 c.light('hemi','#ffe6d4',.55,0,0,0,'#46343a');var s=c.light('dir','#ffd6b8',.9,-8,14,12);c.shadows(s,10);c.light('point','#ffb48a',1.4,3.4,2.6,2.4,10);c.light('point','#ffd6c0',1.2,6.2,2.6,3.0,10);
 /* bleachers: 6 rows */
 var rows=6,spots=[];for(var r=0;r<rows;r++){var z=7.0-r*1.22,y=1.1+r*1.0;h.B(25,y,1.25,12,0,z,'#8a6a52',{roughness:.85},.02);h.B(25,.18,1.2,12,y,z+.05,'#c4a484',{roughness:.7},.02);h.B(25,.12,.2,12,y+.18,z-.55,'#4a3a34');
  for(var x=1.6;x<23.4;x+=1.08){if(spots.length<120)spots.push({x:x+(c.rnd()-.5)*.1,y:y+.15,z:z-.05+c.rnd()*.1,s:.78})}}
 h.crowd(spots,{cols:[C1,C1,C1,C2,C2,C3,'#6a7fb0','#d8c8c0','#2a2f4a'],cheer:.38});
 h.B(25,.16,.2,12,rows+.2,.12,'#2a2a30');
 /* rail at the bottom of the bleachers + scarves */
 h.B(25,.2,.2,12,2.6,7.8,'#c4ccd6',{metalness:.8,roughness:.3});[1,6,11,16,21].forEach(function(x){h.B(.2,2.6,.2,x,0,7.8,'#c4ccd6',{metalness:.8})});for(i=0;i<6;i++)h.cloth(.9,2.2,2.5+i*3.6,1.5,7.9,h.fabric(i%2?C1:C2,i%2?C2:C3,9,true),0,.1);
 /* hand-painted banners high on the back wall */
 h.cloth(6,2.6,5,11.2,.3,(function(){var cv=c.cvs(256,128),kk=cv.getContext('2d');kk.fillStyle=C1;kk.fillRect(0,0,256,128);kk.fillStyle='#f4f1ff';kk.font='900 74px Heebo, Arial';kk.textAlign='center';kk.direction='ltr';kk.fillText('All the Way',128,88);return c.tex(cv,1,1)})(),0,.12);
 h.cloth(5,2.4,19.5,11.2,.3,(function(){var cv=c.cvs(256,128),kk=cv.getContext('2d');kk.fillStyle=C3;kk.fillRect(0,0,256,128);kk.fillStyle='#f4f1ff';kk.font='900 74px Heebo, Arial';kk.textAlign='center';kk.direction='ltr';kk.fillText('Together',128,88);return c.tex(cv,1,1)})(),0,.12);
 /* scoreboard */
 h.B(7.2,3.2,1.0,12,10.8,.6,'#1a1a20',{roughness:.5},.1);var sc=c.cvs(256,112),sk=sc.getContext('2d');sk.fillStyle='#14141c';sk.fillRect(0,0,256,112);sk.fillStyle='#ff5a6a';sk.font='900 70px Arial';sk.textAlign='center';sk.fillText('61 : 58',128,68);sk.fillStyle='#cfd8ff';sk.font='bold 22px Heebo, Arial';sk.direction='ltr';sk.fillText('HOME     AWAY',128,100);
 h.P(6.6,2.7,12,10.8,1.12,h.bas('#fff',{map:c.tex(sc,1,1)}),0);[-3,3].forEach(function(dx){h.B(.1,3.0,.1,12+dx,12.4,.6,'#2a2a30')});h.G(12,10.8,1.5,'#ff5a6a',10,.18);
 /* hoop on left wall */
 h.B(.3,3.8,5.4,.4,9.4,10.6,'#e8f0f8',{transparent:true,opacity:.7,roughness:.1},.04);h.B(.34,.18,5.5,.4,13.2,10.6,C1);h.B(.34,.18,5.5,.4,9.4,10.6,C1);h.B(.34,.9,2.2,.4,10.0,10.6,'#fff',{transparent:true,opacity:.4});
 var rim=c.mesh(new T.TorusGeometry(.85,.07,8,22),c.std(C1,{roughness:.4}),1.4,11.3,10.6,g);rim.rotation.x=Math.PI/2;var net=c.mesh(new T.CylinderGeometry(.85,.45,1.4,16,1,true),new T.MeshBasicMaterial({color:'#fff',wireframe:true,transparent:true,opacity:.7}),1.4,10.5,10.6,g);net.castShadow=false;h.B(.6,.5,.3,.6,11.0,10.6,'#2a2a30');
 /* hanging lamps + trusses */
 h.B(26,.5,.5,12,17.2,3.6,'#4a3a34');h.B(26,.5,.5,12,17.2,10.4,'#4a3a34');[4,12,20].forEach(function(x){h.pendant(x,3.6,17.2,'#3a4a48',1.5);h.pendant(x,10.4,17.2,'#3a4a48',1.5)});
 /* team bench + players + coach */
 h.B(10,.3,1.5,6.2,1.6,9.6,'#7a5a42',{roughness:.7});h.B(10,.2,.2,6.2,1.9,10.3,'#7a5a42');[1.8,10.6].forEach(function(x){h.B(.25,1.6,1.2,x,0,9.6,'#4a3a34')});
 [[3.4,1,C1,'#2a3a6a'],[5.7,3,C2,C1],[8.0,0,C1,'#2a3a6a'],[10.2,2,C3,C1]].forEach(function(e,i){c.person({skin:c.SK[e[1]],top:e[2],bot:i%2?'#2a2a34':'#14182a',hair:['#1a1210','#0a0808','#6a3a22','#14100e'][i],style:['short','buzz','curly','short'][i],w:1.05,mode:'sit',s:1.08,stubble:i%2===0,beanie:i===3?C3:null,scarf:i===1?[C1,C2]:null},{x:e[0],z:9.4,yaw:(i-1.5)*-.12})});
 c.person({skin:c.SK[2],top:'#3a3a48',bot:'#1c2030',hair:'#c8c0b8',style:'short',beard:true,w:1.25,mode:'talk',s:1.1,jacket:C3,look:-.5},{x:13.5,z:10.2,yaw:-.7});
 /* drum + drummer */
 var dm=h.drum(17,8.7,1.5,3.0,0,C1,'#c6ccd6');h.C(.5,.5,.2,17,3.15,8.7,'#e8d8cc',{},16);
 var dr=c.person({skin:c.SK[3],top:C2,bot:'#1c2030',hair:'#0a0808',style:'curly',beard:true,w:1.15,mode:'idle',s:1.1,scarf:[C1,C2]},{x:17,z:7.4,yaw:.05});
 dr.userData.arms.forEach(function(a){var st=c.mesh(new T.CylinderGeometry(.012,.018,.4,6),c.std('#e8dcc8'),0,-.3,0,a.hand);st.rotation.x=1.3});
 c.tick(function(t){var u=dr.userData,tt=t*7.5;u.arms[0].sh.rotation.x=-.9+Math.sin(tt)*.45;u.arms[1].sh.rotation.x=-.9+Math.sin(tt+3.14)*.45;u.arms[0].el.rotation.x=-.9;u.arms[1].el.rotation.x=-.9;u.head.rotation.x=.12+Math.sin(tt*.5)*.08;dm.scale.set(1+Math.max(0,Math.sin(tt))*.004,1,1)});
 c.person({skin:c.SK[0],top:C1,bot:'#202432',hair:'#6a3a22',style:'long',w:.95,mode:'sing',s:1.0,scarf:[C1,C2]},{x:20.4,z:8.9,yaw:-.15});
 c.person({skin:c.SK[4],top:C2,bot:'#2a3a6a',hair:'#0a0808',style:'buzz',w:.85,mode:'cheer',s:.76,scarf:[C1,C2]},{x:22.6,z:9.6,yaw:-.3});
 c.setCam(4.0,3.3,9.8,3.7,2.6,2.2,46,66)}});
/* ================= ussishkin-end ================= */
RM.def('ussishkin-end',{kind:'hall',build:function(c){var h=H(c),g=c.g,C1=h.C1,C2=h.C2,C3=h.C3;c.sky('indoor');
 var HH=14;
 c.shell({h:HH,wallMap:c.wall('#d8ccb8',['#cabea8','#e4d8c4','#bcb09a'],4,2),floorMap:c.planks(5),skirt:'#2a2a34'});
 c.light('hemi','#ffe6d4',.5,0,0,0,'#46343a');var s=c.light('dir','#ffd6b8',.85,-8,14,12);c.shadows(s,10);c.light('point','#ffb48a',1.4,3.4,2.4,2.0,10);c.light('point','#ff8a9a',1.0,6.0,2.6,2.6,9);
 /* mural on back wall */
 h.T('WE ARE HERE',16,4.6,12,9.6,.06,null,C1,0,{fs:.62,stroke:C3,weight:'900'});h.B(24.4,.3,.1,12,6.0,.05,C1);
 /* terrace steps */
 var steps=[[0,5.6,4.4],[1.2,3.6,2.2],[2.4,1.8,.5]];steps.forEach(function(st,i){h.B(24,st[0]+.2,st[1]===5.6?2.2:2.4,12,0,st[1]-0.0,i?'#8a8a94':'#9a9aa6',{roughness:.9},.02)});
 h.B(24,1.4,2.2,12,0,4.4,'#8a8a94',{roughness:.9},.02);h.B(24,2.6,2.2,12,0,2.2,'#7a7a86',{roughness:.9},.02);h.B(24,3.8,1.8,12,0,.7,'#6a6a76',{roughness:.9},.02);
 /* rail with banners */
 var rl=h.B(24,.2,.2,12,3.7,6.3,'#c4ccd6',{metalness:.8,roughness:.3});h.B(24,.14,.14,12,2.4,6.3,'#c4ccd6',{metalness:.8});[.5,5,9.5,14,18.5,23].forEach(function(x){h.B(.22,3.8,.22,x,0,6.3,'#c4ccd6',{metalness:.8})});
 function btex(bg,fg,txt,w,hh){var cv=c.cvs(w,hh),kk=cv.getContext('2d');kk.fillStyle=bg;kk.fillRect(0,0,w,hh);kk.fillStyle=fg;kk.fillRect(0,0,w,hh*.12);kk.fillRect(0,hh*.88,w,hh*.12);kk.font='900 '+Math.round(hh*.5)+'px Heebo, Arial';kk.textAlign='center';kk.direction='ltr';kk.fillText(txt,w/2,hh*.68);return c.tex(cv,1,1)}
 h.cloth(6.0,2.4,3.2,2.55,6.55,btex(C1,'#f4f1ff','ULTRAS',384,150),0,.18);h.cloth(5.0,2.4,9.4,2.55,6.55,btex(C3,'#f4f1ff','Together',320,150),0,.18);h.cloth(4.6,2.4,20.6,2.55,6.55,btex('#f4f1ff',C1,'All the Way',300,150),0,.18);
 /* drums + flares crate */
 var d1=h.drum(8.2,5.0,1.5,3.1,0,C1,'#c6ccd6');h.C(.5,.5,.2,8.2,3.25,5.0,'#e8d8cc',{},16);var d2=h.drum(14.6,5.0,1.3,2.8,.2,C3,'#c6ccd6');h.C(.45,.45,.2,14.6,2.95,5.0,'#e8d8cc',{},16);
 h.B(2.6,1.6,1.8,22.2,0,8.4,'#6e4a3c',{roughness:.9},.05);for(var i=0;i<7;i++){var fx=21.2+i*.35;h.C(.16,.16,2.6,fx,1.5,8.4,C1,{roughness:.6},10);h.C(.17,.17,.3,fx,4.0,8.4,'#14141a',{},10)}
 for(i=0;i<5;i++){h.C(.14,.14,2.2,1.4+i*.42,3.8,6.3,i%2?C1:'#f4f1ff',{roughness:.6},10).rotation.z=Math.PI/2;g.children[g.children.length-1].position.set(1.4+i*.4,4.0,6.3)}
 /* confetti */
 var cf=[];for(i=0;i<46;i++){var m=c.mesh(new T.PlaneGeometry(.28,.18),new T.MeshBasicMaterial({color:[C1,C2,C3,'#8aa8ff'][i%4],side:T.DoubleSide}),0,0,0,g);m.castShadow=false;cf.push({m:m,x:2+c.rnd()*20,z:3+c.rnd()*6,y:c.rnd()*12,v:.8+c.rnd()*1.2,a:c.rnd()*6})}
 c.tick(function(t,dt){cf.forEach(function(p){p.y-=p.v*(dt||.016)*2;if(p.y<0)p.y=12;p.m.position.set(p.x+Math.sin(t*1.5+p.a)*.6,p.y,p.z);p.m.rotation.set(t*2+p.a,t*3,p.a)})});
 /* people */
 var drA=c.person({skin:c.SK[1],top:C1,bot:'#1c2030',hair:'#1a1210',style:'short',stubble:true,w:1.15,mode:'idle',s:1.1,scarf:[C1,C2]},{x:8.2,z:3.7,yaw:0});
 var drB=c.person({skin:c.SK[3],top:'#14141c',bot:'#1c2030',hair:'#0a0808',style:'curly',beard:true,w:1.2,mode:'idle',s:1.1},{x:14.6,z:3.7,yaw:0});
 [drA,drB].forEach(function(p){p.position.y=0;p.userData.arms.forEach(function(a){var st=c.mesh(new T.CylinderGeometry(.012,.018,.4,6),c.std('#e8dcc8'),0,-.3,0,a.hand);st.rotation.x=1.3})});
 c.tick(function(t){[[drA,0],[drB,1.3]].forEach(function(e){var u=e[0].userData,tt=t*7+e[1];u.arms[0].sh.rotation.x=-.85+Math.sin(tt)*.45;u.arms[1].sh.rotation.x=-.85+Math.sin(tt+3.14)*.45;u.arms[0].el.rotation.x=-.9;u.arms[1].el.rotation.x=-.9;u.head.rotation.x=.12+Math.sin(tt*.5)*.08})});
 var cap=c.person({skin:c.SK[2],top:'#e8e0d8',bot:'#2a2a34',hair:'#14100e',style:'slick',w:1.15,mode:'sing',s:1.12,scarf:[C1,C2]},{x:11.4,z:2.8,yaw:0});cap.position.y=1.2*c.U;
 h.B(2.4,1.2,2.0,11.4,0,2.8,'#4a3a34');
 c.person({skin:c.SK[0],top:C1,bot:'#2a3a6a',hair:'#6a3a22',style:'pony',w:.95,mode:'cheer',s:1.0,scarf:[C1,C2]},{x:4.8,z:3.0,yaw:.1}).position.y=1.2*c.U;
 c.person({skin:c.SK[4],top:C2,bot:'#202432',hair:'#0a0808',style:'bun',w:.95,mode:'cheer',s:1.0},{x:17.6,z:3.2,yaw:-.1}).position.y=1.2*c.U;
 c.person({skin:c.SK[2],top:C3,bot:'#202432',hair:'#2a1c14',style:'buzz',w:1.1,mode:'lean',s:1.08,beanie:C1,look:.2},{x:19.8,z:5.6,yaw:.2});
 c.person({skin:c.SK[3],top:C1,bot:'#1c2030',hair:'#14100e',style:'short',w:1.2,mode:'sing',s:1.1,scarf:[C1,C2]},{x:2.4,z:5.4,yaw:.25});
 c.person({skin:c.SK[1],top:C2,bot:'#2a3a6a',hair:'#c8c0b8',style:'short',w:1.15,mode:'lean',s:1.08,glasses:true,look:-.3,jacket:C1},{x:20.6,z:8.4,yaw:-.2});
 var sp=[];for(var q=0;q<3;q++)for(var u=0;u<10;u++){var yy=[1.2,2.4,0][q]-.6;if(q===2)continue;sp.push({x:1+u*2.3+c.rnd()*.4+(q?1.1:0),y:yy,z:[1.6,.4][q]+(q?0:.0),s:.95})}
 h.crowd(sp,{cols:[C1,C1,C2,C3,'#6a7fb0','#2a2f4a'],cheer:.55});
 c.setCam(3.4,3.0,8.4,3.4,2.4,1.6,44,66)}});

})();
