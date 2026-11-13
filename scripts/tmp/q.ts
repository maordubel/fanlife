(async()=>{
process.env.FANLIFE_PRECOMPILED="off"
const {loadClub}=await import('@/lib/clubs/resolver')
const d=(await loadClub('olympiacos'))!.data
const ps=d.players||[]
console.log('players',ps.length,'matches',(d.matches||[]).length)
for(const n of ['Fortounis','Masouras','Siokos','Giutsos','Youtsos','Mavrogenidis','Anatolakis','Delasal','Rivaldo','Djordjevic','Galatsopoulos'])console.log(n,ps.filter(p=>JSON.stringify(p.value).toLowerCase().includes(n.toLowerCase())).map(p=>p.value.name+'|'+(p.value.career?'c':'')).join(';'))
})()
