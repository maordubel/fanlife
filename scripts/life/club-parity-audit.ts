/**
 * LIFE — club parity audit. `npm run life:parity`
 *
 * Every core club must be handed the SAME newest LIFE: the same episodes in the same order, the same shared chapters, the same
 * mission calls, and the newest club-side data (skin, cast, nights, missions). What may differ is only what a club's own archive
 * decides (the nights an episode stands on). This script composes every core club's life and prints, per club, what it has and
 * what it is missing against the union of what the others have. Exit code 1 on any gap that is not an archive decision.
 */
process.env.FANLIFE_PRECOMPILED = 'off'

type Row = {id: string; ok: boolean; notes: string[]}

async function main() {
  const {CORE_CLUB_IDS, loadClub} = await import('@/lib/clubs/resolver')
  const {clubLife} = await import('@/lib/clubs/life/pack')
  const {clubMissions} = await import('@/lib/clubs/life/rush')
  const {MISSION_TEMPLATES} = await import('@/lib/life/rush/templates')
  const {LIFE_CAST, LIFE_SKINS, LIFE_TIMELINE, LIFE_ANCHORS} = await import('@/lib/clubs/life/packs')
  const {validatePack} = await import('@/lib/life/universal/validate')
  const {simulate} = await import('@/lib/life/universal/sim')

  const only = process.argv.slice(2).filter(a => !a.startsWith('-'))
  const ids = only.length ? only : [...CORE_CLUB_IDS]
  const packs = new Map<string, any>(), fits = new Map<string, any[]>()
  for (const id of ids) {
    const club = await loadClub(id)
    if (!club) { console.log(`!! ${id}: not loadable`); continue }
    const t = Date.now()
    packs.set(id, clubLife(club.data))
    fits.set(id, clubMissions(club.data))
    console.log(`composed ${id} in ${Date.now() - t} ms`)
  }

  const missionsOf = (c: any) => [...new Set([...JSON.stringify(c).matchAll(/"template":"([a-z0-9-]+)"/g)].map(m => m[1]!))].sort()
  const shared = (p: any) => p.chapters.filter((c: any) => !c.id.startsWith('night-')).map((c: any) => c.id)
  const union = new Set<string>(); for (const p of packs.values()) for (const id of shared(p)) union.add(id)
  const unionMissions = new Map<string, Set<string>>() // chapter id -> every mission template any club calls in it
  for (const p of packs.values()) for (const c of p.chapters) { const s = unionMissions.get(c.id) ?? new Set<string>(); missionsOf(c).forEach(m => s.add(m)); unionMissions.set(c.id, s) }

  const rows: Row[] = []
  for (const [id, p] of packs) {
    const notes: string[] = []
    const fault = (s: string) => notes.push(`FAULT  ${s}`)
    const info = (s: string) => notes.push(`info   ${s}`)

    // 1 · the script: every shared chapter, in the same order
    const mine = new Set<string>(shared(p))
    const lacking = [...union].filter(x => !mine.has(x))
    if (lacking.length) fault(`script lacks chapters other clubs have: ${lacking.join(', ')}`)
    const eps = p.chapters.filter((c: any) => c.episode)
    if (eps.map((c: any) => c.episode.no).join() !== '1,2,3,4,5,6') fault(`season episodes are ${eps.map((c: any) => c.episode.no).join()} not 1..6`)

    // 2 · the missions each chapter calls
    for (const c of p.chapters) {
      const want = unionMissions.get(c.id); if (!want) continue
      const have = new Set(missionsOf(c))
      const gone = [...want].filter(m => !have.has(m))
      if (gone.length) fault(`${c.id} does not call mission(s) ${gone.join(', ')} that other clubs call`)
    }
    // the night an episode stands on is the archive's decision: report, do not fault
    for (const c of eps) info(`${c.id} ${c.anchor ? `night ${c.anchor.on} ${c.anchor.match?.us ?? '?'}` : c.paper ? `paper ${c.paper.on}` : 'no night, no paper'}`)

    // 3 · the mission templates this club can play at all
    const f = fits.get(id)!
    const states: Record<string, number> = {}; f.forEach((x: any) => { states[x.state] = (states[x.state] ?? 0) + 1 })
    info(`rush fits: ${Object.entries(states).map(([k, v]) => `${k} ${v}`).join(' · ')} (of ${MISSION_TEMPLATES.length})`)
    const held = f.filter((x: any) => x.state === 'HELD' || x.state === 'IRRELEVANT').map((x: any) => `${x.template}:${x.state}`)
    const home = MISSION_TEMPLATES.filter((t: any) => ['flat-run', 'tin-hunt', 'ticket-hunt', 'night-window', 'pack-bag', 'clipping-hunt', 'first-step', 'lost-scarf', 'away-pen'].includes(t.id)).map((t: any) => t.id)
    for (const t of home) { const x = f.find((y: any) => y.template === t); if (!x) fault(`no fit row for ${t}`); else if (x.state === 'IRRELEVANT') fault(`${t} is IRRELEVANT for this club`) }
    if (held.length) info(`held / irrelevant: ${held.join(', ')}`)

    // 4 · the club-side data: skin, cast, timeline, nights
    const skin = p.skin
    if (!Object.hasOwn(LIFE_SKINS, id)) info('no LIFE skin file (skin is built from registry + theme)')
    if (!Object.hasOwn(LIFE_CAST, id)) fault('no cast.json: the family and the street have no names')
    else if ((LIFE_CAST as any)[id].status !== 'approved') info(`cast status ${(LIFE_CAST as any)[id].status}`)
    if (!Object.hasOwn(LIFE_TIMELINE, id)) info('no timeline.json (birth year is the composer default)')
    if (!Object.hasOwn(LIFE_ANCHORS, id)) info('no anchors.json (nights are an even spread)')
    if (skin.crest !== 'real') info(`crest is ${skin.crest}`)
    if (!skin.stadium) info('HELD (research): no sourced ground name for this club — signs say "the ground" until a two-publisher world.json lands (rule 100)')
    info(`readiness ${p.readiness.state} playable=${p.readiness.playable} anchors ${p.readiness.anchors}/${p.readiness.target}`)
    if (!p.readiness.playable) fault(`not playable: ${p.readiness.reasons[0]}`)
    const issues = validatePack(p); if (issues.length) fault(`validatePack: ${issues[0]} (+${issues.length - 1})`)
    // every chapter, not only the episodes: no stuck state, at least one ending
    for (const c of p.chapters) { const r = simulate(p, c); if (r.stuck.length) fault(`${c.id} can get stuck (${r.stuck.length})`); if (!r.endings.length) fault(`${c.id} has no ending`) }
    // the life agrees with the archive it stands on
    const by = p.hero.birthYear
    if (by === null) info('no birth year: the life has no nights from history')
    else {
      info(`born ${by} (${2026 - by} in 2026) · ${Object.hasOwn(LIFE_TIMELINE, id) ? 'pack-set' : 'composer default'}`)
      if (2026 - by < 18) fault(`hero would be ${2026 - by} in 2026`)
      for (const c of p.chapters) if (c.anchor) {
        const age = c.anchor.year - by
        if (age < 5) fault(`${c.id} stands on ${c.anchor.on} when he is ${age}`)
        if (c.anchor.year > 2026) fault(`${c.id} stands on a night in the future`)
        if (c.anchor.match && !c.anchor.match.us) fault(`${c.id} night has no side`)
      }
      const eps2 = p.chapters.filter((c: any) => c.episode)
      const nights = eps2.filter((c: any) => c.anchor).length, papers = eps2.filter((c: any) => c.paper).length
      if (p.readiness.anchors >= 100 && nights < 3) fault(`the archive holds ${p.readiness.anchors} rows but only ${nights} episode(s) stand on a night`)
      else if (nights < 3) info(`HELD (research): only ${nights} of 4 night episodes and ${papers} paper(s) stand on the archive (${p.readiness.anchors} rows) — older history is needed`)
    }
    rows.push({id, ok: !notes.some(n => n.startsWith('FAULT')), notes})
  }

  for (const r of rows) { console.log(`\n=== ${r.id} ${r.ok ? 'OK' : 'GAPS'}`); r.notes.forEach(n => console.log('  ' + n)) }
  console.log(`\n${rows.filter(r => r.ok).length}/${rows.length} clubs without a fault`)
  process.exit(rows.every(r => r.ok) ? 0 : 1)
}
main().catch(e => { console.error(e); process.exit(2) })
