// Temporary probe (removed before merge)
const UA={'user-agent':'FanLife-archive/1.0 (+https://github.com/maordubel/fanlife)'}
const r=await fetch('https://www.fitbastats.com/celtic/team_results_season.php',{headers:UA});const t=await r.text()
const forms=t.match(/<form[\s\S]*?<\/form>/g)||[];for(const f of forms)console.log('FORM',f.replace(/<option[^>]*>[^<]*<\/option>/g,m=>m.length>60?'':m).replace(/\s+/g,' ').slice(0,900))
const sel=t.match(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)||[];for(const s of sel)console.log('SELECT',s.slice(0,300).replace(/\s+/g,' '),'… options',(s.match(/<option/g)||[]).length,s.slice(-200).replace(/\s+/g,' '))
const g=await (await fetch('https://www.fitbastats.com/celtic/game.php?gameid=77093',{headers:UA})).text();const i=g.indexOf('<table');console.log('GAME',g.slice(i,i+3000).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '))
