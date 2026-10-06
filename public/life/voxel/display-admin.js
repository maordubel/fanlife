/* LIFE display control — drives the engine's display settings live. Same engine, same rooms; nothing here is a copy. */
(function(){
"use strict";
var V=window.__vx,$=function(s){return document.querySelector(s)},D=V.display,st=V.st,q=new URLSearchParams(location.search);
var DEF={figure:'human',mirror:false,charScale:1,zoom:1,fov:20,azimuth:.22,elevation:.24,blob:true,blobOpacity:.3,faces:true,idle:true,vignette:1,grain:1,exposure:1,warmth:0,quality:'auto'};
var SL={
 view:[['zoom','Zoom',.6,1.8,.01,'×'],['fov','Lens (field of view)',10,45,1,'°'],['azimuth','Camera angle (left–right)',-.6,.6,.01,''],['elevation','Camera height (tilt)',.05,.6,.01,'']],
 char:[['charScale','Character size',.7,1.5,.01,'×'],['blobOpacity','Contact shadow',0,.7,.01,'']],
 look:[['exposure','Exposure',.6,1.5,.01,''],['warmth','Colour temperature (cool ↔ warm)',-1,1,.01,''],['vignette','Vignette',0,1.4,.01,''],['grain','Film grain',0,3,.05,'']]
};
var TOG=[['faces','Faces & blinking'],['idle','Idle life (breathing, sway)'],['blob','Contact shadows']];
var DEV=[['Phone S',320,568],['Phone',390,844],['Tablet',768,1024],['Laptop',1280,720],['Full HD',1920,1080],['Fit',0,0]];
var MOODS=[['normal','Normal'],['match','Match night'],['grief','Grief'],['dusk','Dusk'],['memory','Memory']];
var dev=DEV[1];

function slider(sel,def){
 var el=$(sel);def.forEach(function(d){var k=d[0],w=document.createElement('div');w.className='sl';
  w.innerHTML='<div class="top"><span>'+d[1]+'</span><b id="v-'+k+'"></b></div><input type="range" id="r-'+k+'" min="'+d[2]+'" max="'+d[3]+'" step="'+d[4]+'" aria-label="'+d[1]+'">';el.appendChild(w);
  var r=w.querySelector('input');r.addEventListener('input',function(){var p={};p[k]=parseFloat(r.value);V.setDisplay(p);sync()})})}
function seg(sel,items,get,set,pairs){
 var el=$(sel);el.innerHTML='';items.forEach(function(it){var b=document.createElement('button');b.type='button';b.textContent=it[1];b.dataset.v=it[0];b.addEventListener('click',function(){set(it[0]);sync()});el.appendChild(b)})}
function tog(){
 var el=$('#toggles');TOG.forEach(function(t){var l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.id='t-'+t[0];l.appendChild(i);l.appendChild(document.createTextNode(t[1]));el.appendChild(l);
  i.addEventListener('change',function(){var p={};p[t[0]]=i.checked;V.setDisplay(p);sync()})})}
function fitDevice(){
 var well=$('#well'),dv=$('#device'),r=well.getBoundingClientRect(),aw=r.width-32,ah=r.height-30,w,h;
 if(!dev[1]){w=aw;h=ah}else{var sc=Math.min(1,aw/dev[1],ah/dev[2]);w=Math.round(dev[1]*sc);h=Math.round(dev[2]*sc)}
 w=Math.round(w);h=Math.round(h);V.view.mode=(w/h<.9)?'follow':'fit';V.view.top=.86;V.view.bottom=-.8;dv.style.width=w+'px';dv.style.height=h+'px';
 $('#bar-size').textContent=(dev[1]?dev[0]+' · '+dev[1]+'×'+dev[2]:'Fit')+'  ·  shown '+w+'×'+h;
 V.fit();
}
function sync(){
 Object.keys(SL).forEach(function(g){SL[g].forEach(function(d){var k=d[0];$('#r-'+k).value=D[k];$('#v-'+k).textContent=(+D[k]).toFixed(d[4]<.1?2:1).replace(/\.00$/,'')+d[5]})});
 TOG.forEach(function(t){$('#t-'+t[0]).checked=!!D[t[0]]});
 [['#mirror',D.mirror?'1':'0'],['#quality',D.quality],['#figure',D.figure],['#time',st.time],['#club',st.club],['#mood',window.__mood||'normal'],['#dev',dev[0]]].forEach(function(p){var bs=document.querySelectorAll(p[0]+' button');for(var i=0;i<bs.length;i++)bs[i].setAttribute('aria-pressed',bs[i].dataset.v===String(p[1])?'true':'false')});
 var o={};Object.keys(DEF).forEach(function(k){o[k]=typeof DEF[k]==='number'?Math.round(D[k]*100)/100:D[k]});
 $('#json').textContent=JSON.stringify(o,null,1);
 $('#stage').className='stage '+st.time;
}
function go(id){st.scene=id;try{V.rebuild()}catch(e){window.__err.push(String(e&&e.stack||e))}$('#room').value=id}
function rooms(){
 var sel=$('#room'),g=null,og=null,order=['Universal','Home','School','Street','Work','Club','Stadium','Away','Arena','Ussishkin','Jaffa','Travel'];
 window.__vxMeta.slice().sort(function(a,b){return order.indexOf(a.group)-order.indexOf(b.group)}).forEach(function(m){if(m.group!==g){g=m.group;og=document.createElement('optgroup');og.label=g;sel.appendChild(og)}var o=document.createElement('option');o.value=m.id;o.textContent=m.label;og.appendChild(o)});
 sel.addEventListener('change',function(){go(sel.value);sync()});
}
function dl(name,text,type){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}

fetch('/life/voxel/skins').then(function(r){return r.ok?r.json():{skins:{}}}).catch(function(){return{skins:{}}}).then(function(d){
 V.setSkins(d.skins||{});
 return V.boot({canvas:$('#gl'),stage:$('#stage'),pointer:false,quality:q.get('q')||undefined,capture:true});
}).then(function(){
 slider('#sliders-view',SL.view);slider('#sliders-char',SL.char);slider('#sliders-look',SL.look);tog();rooms();
 var ids=Object.keys(V.SK).filter(function(i){return i!=='club'});
 seg('#club',ids.map(function(i){return[i,V.SK[i].short]}),null,function(v){st.club=v;V.rebuild()});
 seg('#time',[['day','Day'],['night','Match night']],null,function(v){st.time=v;V.rebuild()});
 seg('#mirror',[['0','Normal'],['1','Mirrored']],null,function(v){V.setDisplay({mirror:v==='1'})});
 seg('#figure',[['human','Human'],['chibi','Chibi']],null,function(v){V.setDisplay({figure:v});V.rebuild()});
 seg('#quality',[['auto','Auto'],['low','Low'],['medium','Medium'],['high','High']],null,function(v){V.setDisplay({quality:v})});
 seg('#mood',MOODS,null,function(v){window.__mood=v;V.setMood(v)});
 seg('#dev',DEV.map(function(d){return[d[0],d[0]]}),null,function(v){dev=DEV.filter(function(d){return d[0]===v})[0];fitDevice()});
 /* the mirror/quality buttons are rebuilt by seg(); the first seg() call above already placed them */
 st.club=(q.get('club')&&V.SK[q.get('club')])?q.get('club'):(ids[0]||'club');
 if(q.get('time')==='night')st.time='night';
 var r=q.get('room')||'lineup';st.scene=window.__vxScenes[r]?r:'room';
 var dn=q.get('dev');if(dn)dev=DEV.filter(function(d){return d[0]===dn})[0]||dev;
 try{V.rebuild()}catch(e){window.__err.push(String(e&&e.stack||e))}
 $('#room').value=st.scene;
 $('#reset').addEventListener('click',function(){V.setDisplay(DEF);sync()});
 $('#copy').addEventListener('click',function(){var t=$('#json').textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){}).then(function(){$('#copy').textContent='Copied';setTimeout(function(){$('#copy').textContent='Copy JSON'},1200)})});
 $('#dl').addEventListener('click',function(){dl('display.json',$('#json').textContent+'\n')});
 $('#shot').addEventListener('click',function(){V.renderer().render(V.cur().root.parent,V.camera());$('#gl').toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='life-preview.png';document.body.appendChild(a);a.click();a.remove()})});
 window.addEventListener('resize',fitDevice);
 V.setDisplay({},false);fitDevice();sync();window.__sync=sync;
 $('#loader').classList.add('off');window.__ready=true;
});
})();
