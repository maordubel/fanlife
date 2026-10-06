/* LIFE display preview — the real engine and rooms in a frame the control room drives with postMessage.
   Same origin only. Never persists: the admin's own browser must not start overriding the published settings. */
(function(){
"use strict";
var V=window.__vx,st=V.st,$=function(s){return document.querySelector(s)},ready=false;
function post(type,extra){var m={type:type,display:Object.assign({},V.display),room:st.scene,club:st.club,time:st.time,mood:window.__mood||'normal'};for(var k in extra)m[k]=extra[k];try{parent.postMessage(m,location.origin)}catch(e){}}
function rebuild(){try{V.rebuild()}catch(e){post('life-display-error',{error:String(e&&e.message||e)})}$('#stage').className='stage '+st.time}
window.addEventListener('message',function(e){
 if(e.origin!==location.origin||!e.data||e.data.type!=='life-display'||!ready)return;
 var d=e.data,needs=false;
 if(d.patch&&typeof d.patch==='object'){if('figure' in d.patch&&d.patch.figure!==V.display.figure)needs=true;V.setDisplay(d.patch,false)}
 if(d.club&&V.SK[d.club]&&d.club!==st.club){st.club=d.club;needs=true}
 if((d.time==='day'||d.time==='night')&&d.time!==st.time){st.time=d.time;needs=true}
 if(d.room&&window.__vxScenes[d.room]&&d.room!==st.scene){st.scene=d.room;needs=true}
 if(d.mood&&V.MOODS[d.mood]){window.__mood=d.mood;V.setMood(d.mood)}
 if(needs)rebuild();V.fit();post('life-display-state');
});
window.addEventListener('resize',function(){if(ready){V.view.mode=(innerWidth/innerHeight<.9)?'follow':'fit';V.fit()}});
fetch('/life/voxel/skins').then(function(r){return r.ok?r.json():{skins:{}}}).catch(function(){return{skins:{}}}).then(function(d){
 V.setSkins(d.skins||{});return V.boot({canvas:$('#gl'),stage:$('#stage'),pointer:false,capture:true});
}).then(function(){
 var ids=Object.keys(V.SK).filter(function(i){return i!=='club'});
 st.club=ids[0]||'club';st.scene=window.__vxScenes.lineup?'lineup':'room';
 V.view.mode=(innerWidth/innerHeight<.9)?'follow':'fit';V.view.top=.86;V.view.bottom=-.8;
 rebuild();V.fit();ready=true;$('#loader').classList.add('off');
 var rooms=(window.__vxMeta||[]).map(function(m){return{id:m.id,label:m.label,group:m.group}});
 post('life-display-ready',{rooms:rooms,clubs:ids.map(function(i){return{id:i,label:V.SK[i].short||i}}),moods:Object.keys(V.MOODS)});
});
})();
