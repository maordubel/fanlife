(async()=>{process.env.FANLIFE_PRECOMPILED='off'
const {loadClub}=await import('@/lib/clubs/resolver')
const d=(await loadClub('olympiacos'))!.data
const ps=d.players||[]
const k=Object.keys
console.log(JSON.stringify(ps.find(p=>p.value.name==='Kostas Fortounis'),null,0).slice(0,600))
const c:Record<string,number>={};for(const p of ps)for(const x of k(p.value))c[x]=(c[x]||0)+1;console.log(c)
const s:Record<string,number>={};for(const p of ps){const t=(p as any).status;s[t]=(s[t]||0)+1};console.log(s)
})()
