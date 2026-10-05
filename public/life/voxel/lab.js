/* LIFE voxel lab — the gallery: every room, every club skin, day and night. A viewing tool; the game is play.js. */
(function(){
"use strict";
var V=window.__vx,st=V.st,$=function(s){return document.querySelector(s)};
var frame=$('#frame'),q=new URLSearchParams(location.search);
var ORDER=['Home','School','Street','Work','Club','Stadium','Away','Arena','Ussishkin','Jaffa','Travel','Universal'];
var M=window.__vxMeta.slice().sort(function(a,b){return ORDER.indexOf(a.group)-ORDER.indexOf(b.group)});
window.__vxOrder=M.map(function(m){return m.id});
function metaOf(id){for(var i=0;i<M.length;i++)if(M[i].id===id)return M[i];return null}

function sync(){
 var bs=document.querySelectorAll('[data-k]');
 for(var i=0;i<bs.length;i++)bs[i].setAttribute('aria-pressed',st[bs[i].dataset.k]===bs[i].dataset.v?'true':'false');
 frame.className='frame '+st.time+' look-'+st.look;
 var rf=window.__vxRef(st.scene);$('#over').style.backgroundImage=rf?'url("'+rf+'")':'none';
 $('#cut').hidden=st.look!=='split';
 var S=V.skin(st.club);
 $('#sw').innerHTML=[S.p,S.s,S.t].map(function(c){return '<i style="background:'+c+'" title="'+c+'"></i>'}).join('')+'<span style="color:var(--mute);font-size:12px;margin-inline-start:6px">'+S.p+' · '+S.s+' · '+S.t+'</span>';
 $('#skin').textContent=JSON.stringify({club:S.name,primary:S.p,secondary:S.s,trim:S.t,pattern:S.pattern,crest:S.crest==='real'?'printed artwork':'monogram — until a licensed crest arrives',ground:S.stadiumKnown?S.stadium:'(not sourced yet)',kiosk:S.kiosk},null,1);
 $('#cap').innerHTML='<b>'+(window.__vxLabel(st.scene)||st.scene)+'</b> <span>· '+S.name+' · '+(st.time==='night'?'match night':'day')+'</span>';
 $('#tag').textContent=st.look==='voxel'?'Voxel · 1 unit ≈ 27 cm':st.look==='painting'?'Painted original':'Voxel | Painted';
 var sel=$('#room');if(sel)sel.value=st.scene;
}
function go(id){st.scene=id;try{V.rebuild();sync()}catch(e){window.__err.push(String(e&&e.stack||e))}}
window.__vxGo=go;

function clubs(){
 var box=$('#s-club'),ids=Object.keys(V.SK).filter(function(id){return id!=='club'});if(!ids.length)ids=['club'];
 box.innerHTML=ids.map(function(id){return '<button data-k="club" data-v="'+id+'">'+V.SK[id].name+'</button>'}).join('');
 if(!V.SK[st.club]||st.club==='club')st.club=ids[0];
}
function rooms(){
 var sel=$('#room'),g=null,og=null;
 M.forEach(function(m){if(m.group!==g){g=m.group;og=document.createElement('optgroup');og.label=g;sel.appendChild(og)}var o=document.createElement('option');o.value=m.id;o.textContent=m.label;og.appendChild(o)});
 $('#rn').textContent=M.length;
 sel.addEventListener('change',function(){go(sel.value)});
 function step(d){var i=window.__vxOrder.indexOf(st.scene);go(window.__vxOrder[(i+d+M.length)%M.length])}
 $('#prev').addEventListener('click',function(){step(-1)});$('#next').addEventListener('click',function(){step(1)});
}
document.addEventListener('click',function(e){
 var b=e.target.closest&&e.target.closest('[data-k]');if(!b)return;
 st[b.dataset.k]=b.dataset.v;
 try{if(b.dataset.k!=='look')V.rebuild();sync()}catch(er){window.__err.push(String(er&&er.stack||er))}
});
$('#cut').addEventListener('input',function(e){frame.style.setProperty('--cut',e.target.value+'%')});

fetch('/life/voxel/skins').then(function(r){return r.ok?r.json():{skins:{}}}).catch(function(){return{skins:{}}}).then(function(d){
 V.setSkins(d.skins||{});
 return V.boot({canvas:$('#gl'),stage:$('#stage'),pointerTarget:frame,quality:q.get('q')||'high',capture:true});
}).then(function(){
 clubs();rooms();
 if(q.get('club')&&V.SK[q.get('club')])st.club=q.get('club');
 if(q.get('time')==='night')st.time='night';
 var r=q.get('room');st.scene=(r&&window.__vxOrder.indexOf(r)>=0)?r:'room';
 var m=metaOf(st.scene);if(!q.get('time')&&m&&m.time==='night')st.time='night';
 try{V.rebuild();sync()}catch(er){window.__err.push(String(er&&er.stack||er))}
 $('#loader').classList.add('off');window.__ready=true;
});
window.__lab={st:st,rebuild:V.rebuild,sync:sync,cur:V.cur};
})();
