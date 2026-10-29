// LIFE — the arcade stickers for keepsakes that have no painted prop, drawn with pxl (skill: pxl-pixel-art).
// Keys are the LIFE tokens, not colours: c = club colour, k = ink, w = paper, s = ground tone, n = deep,
// m = mark. The hexes below only stand in for the preview; PixelSprite paints the tokens, so a club's
// colour is one value and a rival-locked page can never receive a banned colour.
//
// Build:  node ~/.cache/claude-tools/pxl/bin/pxl.js build scripts/life/sprites/keeps.px.js --out <dir>
// Export: node scripts/life/sprites/export-keeps.mjs <dir>   → components/clubs/life/pixelKeeps.ts

pal({ c: "#c8102e", k: "#1b1b1f", w: "#f2efe6", s: "#c9b79c", n: "#2a3048", m: "#8a8f99" })

// the first shirt: body and sleeves in the club colour, a paper collar and cuffs
sprite("shirt", { outline: "k" }, `
  ...ccccwwwcccc...
  .ccccccwwwcccccc.
  ccccccccwcccccccc
  ccccccccccccccccc
  wwcccccccccccccww
  .wwcccccccccccww.
  ...ccccccccccc...
  ...ccccccccccc...
  ...ccccccccccc...
  ...ccccccccccc...
  ...ccccccccccc...
  ...wwwwwwwwwww...`)

// a torn ticket: a stub, the perforation, the club stripe and the seat in ink
sprite("ticket", { outline: "k" }, `
  wwwwwwwwwwwwwwww
  wcccccccccc.wwww
  wcccccccccc.wkkw
  wwwwwwwwwww.wwww
  wkkkwkkwkww.wkkw
  wwwwwwwwwww.wwww
  wkkwkkkkwkw.wkkw
  wwwwwwwwwww.wwww`)

// a folded page: lines of writing, the fold, a corner turned
sprite("note", { outline: "k" }, `
  wwwwwwwwwww.
  wkkkkwkkkwwm
  wwwwwwwwwwmm
  wkkwkkkkwkkw
  wwwwwwwwwwww
  mmmmmmmmmmmm
  wkkkkkwkkkww
  wwwwwwwwwwww
  wkkwkkkwwwww
  wwwwwwwwwwww`)

// a pin: a round badge in the club colour with a paper ring, and a ribbon under it
sprite("pin", { outline: "k" }, `
  ...wwwww...
  ..wcccccw..
  .wccwwwccw.
  .wcwcccwcw.
  .wccwwwccw.
  ..wcccccw..
  ...wwwww...
  ...cc.cc...
  ..cc...cc..
  ..c.....c..`)

// a key: a ring, a shaft, two teeth
sprite("key", { outline: "k" }, `
  .mmm..........
  m...m.........
  m...mmmmmmmmmm
  m...m......m.m
  .mmm.......m.m`)

// the album: a bound book in the club colour with a paper square on its cover
sprite("album", { outline: "k" }, `
  nccccccccccc
  nccccccccccc
  nccwwwwwwccc
  nccwkkkkwccc
  nccwkwwkwccc
  nccwkkkkwccc
  nccwwwwwwccc
  nccccccccccc
  nccccccccccc
  nwwwwwwwwwww`)

// coins: two discs, one on its edge
sprite("coins", { outline: "k" }, `
  ..mmmm......
  .mwwwwm.....
  mwwmmwwm....
  mwmwwmwm.mm.
  mwwmmwwmmwwm
  .mwwwwm.mwwm
  ..mmmm..mwwm
  ........mwwm
  .........mm.`)

sheet("keeps", ["shirt", "ticket", "note", "pin", "key", "album", "coins"], { pad: 2 })
