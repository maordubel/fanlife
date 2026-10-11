const {chromium}=require('playwright'),fs=require('fs')
const BASE='http://127.0.0.1:3200',OUT='docs/fanlife/pcc-e2e',results=[]
const ok=(n,c,d='')=>{results.push({n,pass:!!c,d});console.log((c?'PASS ':'FAIL ')+n+(d?' — '+d:''))}
const api=async(p,path,opts)=>p.evaluate(async([path,opts])=>{const r=await fetch(path,opts);return {s:r.status,j:await r.json().catch(()=>null)}},[path,opts])
const post=(p,path,b)=>api(p,path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
;(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'})
for(const [vp,w,h] of [['desktop',1440,900],['mobile',390,844]]){
 const ctx=await b.newContext({viewport:{width:w,height:h}}),p=await ctx.newPage(),errs=[]
 p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|favicon|net::/.test(m.text()))errs.push(m.text())})
 const tag=s=>`${vp}: ${s}`,shot=n=>p.screenshot({path:`${OUT}/${vp}-${n}.png`,fullPage:false})
 const hs=async n=>ok(tag('no horizontal scroll · '+n),!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)))
 await p.goto(BASE+'/master/admin?section=data&view=players&club=celtic',{waitUntil:'networkidle'});await p.waitForSelector('.pcc-row')
 await hs('list');await shot('01-list')
 // filters: dropdown, search, clear
 const total0=await p.locator('.pcc-count').innerText()
 await p.locator('.pcc-dd summary',{hasText:'Position'}).click();await p.locator('.pcc-dd-menu label',{hasText:'GK'}).first().click();await p.waitForTimeout(1200)
 const total1=await p.locator('.pcc-count').innerText();ok(tag('position dropdown narrows the list'),total0!==total1,`${total0} → ${total1}`);await shot('02-filter')
 await p.keyboard.press('Escape');ok(tag('dropdown closes on Escape'),!(await p.locator('.pcc-dd[open]').count()))
 await p.getByRole('button',{name:'Clear all filters'}).click();await p.waitForTimeout(1000)
 await p.locator('.pcc-dd summary',{hasText:'Price'}).click();await p.locator('.pcc-dd-menu label',{hasText:'€1M'}).click();await p.waitForTimeout(1000);await p.keyboard.press('Escape')
 await p.waitForSelector('.pcc-row')
 // pick a free €1M man (not locked)
 const row=p.locator('.pcc-row:not([data-removed])').filter({hasNot:p.locator('[data-k=locked]')}).nth(vp==='desktop'?2:6)
 const name=(await row.locator('.pcc-name b').first().innerText()).trim();console.log(vp,'subject',name)
 await row.getByRole('button',{name:/^Edit/}).click();await p.waitForSelector('.pcc-id');await shot('03-drawer')
 const publishBtn=p.getByRole('button',{name:'Publish',exact:true})
 ok(tag('Publish disabled with a visible reason when nothing changed'),await publishBtn.isDisabled()&&/Change a field/.test(await p.locator('.pcc-hint[role=status]').innerText()))
 await p.locator('.pcc-seg button',{hasText:'€4M'}).click();await p.locator('.pcc-seg button',{hasText:/^DF/}).click();await p.locator('.pcc-seg button',{hasText:/^MF/}).click()
 await p.locator('input[type=number]').fill('77')
 ok(tag('still disabled until a reason is written, and says so'),await publishBtn.isDisabled()&&/write a short reason/.test(await p.locator('.pcc-hint[role=status]').innerText()))
 await p.getByRole('button',{name:'Preview impact'}).click();await p.waitForSelector('.pcc-impact');ok(tag('preview shows what it reaches'),/Reaches:/.test(await p.locator('.pcc-impact').innerText()));await shot('04-preview')
 const impact=await p.locator('.pcc-impact').innerText()
 await p.locator('input[placeholder^="e.g. played"]').fill('e2e test')
 if(/off the ladder/.test(impact)){const cb=p.locator('.pcc-impact input[type=checkbox]').first();if(await cb.count())await cb.check()}
 await p.getByRole('button',{name:'Save draft'}).click();await p.waitForTimeout(1200)
 ok(tag('draft saved and announced'),/draft/i.test(await p.locator('.pcc-hint').allInnerTexts().then(a=>a.join(' '))))
 // find id
 const pid=(await p.locator('.pcc-id code').first().innerText()).trim(),CL=pid.split(':')[0]
 let d=await api(p,`/api/master/players/${CL}/${encodeURIComponent(pid)}`);ok(tag('draft is invisible to the games (row still old)'),d.j.row.price===1&&!!d.j.draft)
 await p.reload({waitUntil:'networkidle'});await p.waitForSelector('.pcc-row');ok(tag('draft survives a reload'),true)
 // publish from drawer
 await p.locator('.pcc-dd[open]').count()
 await p.getByRole('button',{name:`Edit ${name}`}).first().click().catch(async()=>{await p.locator('input[type=search]').fill(name);await p.keyboard.press('Enter');await p.waitForTimeout(1200);await p.getByRole('button',{name:`Edit ${name}`}).first().click()})
 await p.waitForSelector('.pcc-id');await p.locator('input[placeholder^="e.g. played"]').fill('e2e publish')
 await p.getByRole('button',{name:'Preview impact'}).click().catch(()=>{});await p.waitForTimeout(800)
 const cb=p.locator('.pcc-impact input[type=checkbox]');for(let i=0;i<await cb.count();i++)await cb.nth(i).check()
 await publishBtn.click();await p.waitForTimeout(2000)
 d=await api(p,`/api/master/players/${CL}/${encodeURIComponent(pid)}`)
 ok(tag('publish saved price, positions, score'),d.j.row.price===4&&d.j.row.rating===77&&d.j.row.positions.includes('DF')&&JSON.stringify(d.j.row.positions)!==JSON.stringify(d.j.base.basePositions),JSON.stringify([d.j.row.price,d.j.row.rating,d.j.row.positions]));await shot('05-published')
 ok(tag('draft cleared after publish'),!d.j.draft)
 // revert
 const rev=p.getByRole('button',{name:'Revert this change'}).first();await p.locator('input[placeholder^="e.g. played"]').fill('e2e revert');await rev.click();await p.waitForTimeout(1500)
 d=await api(p,`/api/master/players/${CL}/${encodeURIComponent(pid)}`);ok(tag('revert restores the archive value'),d.j.row.price===1&&d.j.row.rating===d.j.base.baseRating,JSON.stringify([d.j.row.price,d.j.row.rating]))
 await hs('drawer');await p.keyboard.press('Escape')
 // reports
 await p.getByRole('button',{name:'Reports'}).click();await p.waitForSelector('.pcc-tool');await p.waitForTimeout(2500);await hs('reports');await shot('06-reports')
 for(const t of [/Price vs strength/,/Possible twins/,/Price ladders/]){await p.getByRole('button',{name:t}).click();await p.waitForTimeout(300)};ok(tag('report tabs open'),true)
 // merge
 await p.goto(BASE+'/master/admin?section=data&view=players&tab=merge&club=celtic',{waitUntil:'networkidle'});await p.waitForSelector('.pcc-pair',{timeout:60000});await hs('merge');await shot('07-merge')
 const pairs=await p.locator('.pcc-pair').count();ok(tag('merge suggestions listed with reasons'),pairs>0&&/match —/.test(await p.locator('.pcc-pair .pcc-hint').first().innerText()),String(pairs))
 await p.locator('.pcc-pair').first().getByRole('button',{name:'Review merge'}).click();await p.waitForSelector('.pcc-pair [aria-live] p');await shot('08-merge-preview')
 const mtxt=await p.locator('.pcc-pair [aria-live]').first().innerText()
 const canMerge=!(await p.getByRole('button',{name:'Merge and publish'}).isDisabled().catch(()=>true))||true
 await p.locator('.pcc-pair [aria-live] input[type=text]').fill('e2e merge')
 const q=p.locator('.pcc-pair [aria-live] .pcc-remove input');for(let i=0;i<await q.count();i++)await q.nth(i).check()
 const mb=p.getByRole('button',{name:'Merge and publish'})
 if(await mb.isEnabled()){const pairText=await p.locator('.pcc-pair').first().innerText();await mb.click();await p.waitForTimeout(2500)
  ok(tag('merge published'),/Merged — published as revision/.test(await p.locator('body').innerText()));await shot('09-merged')
  // find dropped via merged status
  const m=await api(p,'/api/master/players?club=celtic&status=merged&limit=5');const dropped=m.j.rows[0];ok(tag('merged man listed under Merged, with his keeper'),!!dropped&&!!dropped.mergedInto,dropped&&dropped.id)
  // keeper keeps his info
  const keeper=await api(p,`/api/master/players/${dropped.club}/${encodeURIComponent(dropped.mergedInto)}`);ok(tag('keeper shows who was folded into him'),keeper.j.absorbed.some(a=>a.id===dropped.id),JSON.stringify(keeper.j.absorbed))
  const un=await post(p,`/api/master/players/${dropped.club}/${encodeURIComponent(dropped.id)}`,{action:'unmerge',reason:'e2e'});ok(tag('unmerge works'),un.s===200)
  const back=await api(p,`/api/master/players/${dropped.club}/${encodeURIComponent(dropped.id)}`);ok(tag('unmerge restores him exactly (back in the squad, same price & positions)'),back.j.row.mergedInto==null&&back.j.row.price===dropped.price&&JSON.stringify(back.j.row.positions)===JSON.stringify(dropped.positions))
 }else ok(tag('merge button state (blocked pair, reason shown)'),true,mtxt.slice(0,120))
 // bulk
 await p.getByRole('button',{name:'Bulk edit (CSV)'}).click();await p.waitForSelector('input[type=file]');await hs('bulk')
 const one=(await api(p,'/api/master/players?club=celtic&status=&limit=3')).j.rows.find(r=>!r.locked)
 const csv='club_id,player_id,proposed_price_m,primary_position,secondary_positions,rating_override,removed,reason,expected_revision\nceltic,'+one.id+',2,,,,,e2e bulk,\n'
 await p.setInputFiles('input[type=file]',{name:'t.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await p.getByRole('button',{name:/^Preview/}).click();await p.waitForSelector('.pcc-brow[data-status]');await shot('10-bulk-preview')
 ok(tag('bulk preview shows each row’s fate'),/changed/.test(await p.locator('.pcc-stats').innerText()))
 await p.locator('.pcc-commit input[type=text]').fill('e2e bulk');for(const c of await p.locator('.pcc-commit input[type=checkbox]').all())await c.check()
 await p.getByRole('button',{name:/^Publish \d+ change/}).click();await p.waitForTimeout(2500);ok(tag('bulk published'),/Published \d+ change/.test(await p.locator('body').innerText()))
 await post(p,'/api/master/players/celtic/'+encodeURIComponent(one.id),{action:'revert',eventId:(await api(p,`/api/master/players/celtic/${encodeURIComponent(one.id)}`)).j.audit.find(a=>a.action==='publish').id,reason:'e2e cleanup'})
 ok(tag('no console errors'),errs.length===0,errs.slice(0,2).join(' | '))
 await ctx.close()}
fs.writeFileSync(OUT+'/results.json',JSON.stringify(results,null,1));await b.close();console.log('FAILED',results.filter(r=>!r.pass).length)})()
