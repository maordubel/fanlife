// LIFE · RUSH — the family flat, made with kiln (skill: kiln-3d-assets). The furniture a six-year-old runs round on
// the afternoon of a match: the sofa Dad sits on, the radio, his bed and the wardrobe with the box on top, the kitchen.
// Read from above (the doll's-house camera, rule 130), so the tops and the silhouettes carry it: cushions, arms,
// handles, a blanket folded back. `clubP` / `clubS` are repainted with the club's own colours at run time (his
// blanket, the cushion, the scarf on the hook) — no file carries a club, so none can carry a rival.
//
// Build:  node ~/.cache/claude-tools/kiln/bin/kiln.js build scripts/life/rush/home.kx.js --out <dir>
// Ship:   cp <dir>/home.glb public/life/rush/models/home.glb
// Every model faces +z and stands on y = 0; the stage stretches each to its block's footprint (lib/life/rush-render/flat.ts).

pal({
  clubP: "#c8102e", clubS: "#f2efe6",
  fabric: { color: "#6f5c4e", rough: 0.95 }, fabricL: { color: "#86705f", rough: 0.95 }, fabricD: { color: "#58483d", rough: 0.95 },
  oak: { color: "#9a6a44", rough: 0.6 }, oakL: { color: "#b07c52", rough: 0.55 }, oakD: { color: "#6b452c", rough: 0.6 },
  walnut: { color: "#5a3a26", rough: 0.5 },
  cream: { color: "#efe8da", rough: 0.55 }, white: { color: "#f4f2ec", rough: 0.35 }, sheet: { color: "#f1eee6", rough: 0.9 },
  steel: { color: "#a7abb2", metal: 0.7, rough: 0.3 }, chrome: { color: "#d9dce2", metal: 0.9, rough: 0.15 },
  formica: { color: "#d6cfbf", rough: 0.4 }, top: { color: "#77746e", rough: 0.35 },
  bakelite: { color: "#4a2f22", rough: 0.35 }, grille: { color: "#c9b48e", rough: 0.9 }, dial: { color: "#f0d9b0", emit: "#ff9a50", glow: 1.2 },
  card: { color: "#b38b5c", rough: 0.9 }, cardD: { color: "#93704a", rough: 0.9 }, tape: { color: "#cfc4a8", rough: 0.6 },
  shade: { color: "#efe2c8", emit: "#ffcf96", glow: 0.6 }, black: { color: "#26272b", rough: 0.6 },
  pot: { color: "#a65f3e", rough: 0.85 }, leaf: { color: "#4d7a45", rough: 0.8 }, leafL: { color: "#6b9a5a", rough: 0.8 }, soil: { color: "#3a2a20", rough: 1 },
  glass: { color: "#b9d4e3", rough: 0.08, metal: 0.1 }, rubber: { color: "#2c2d31", rough: 0.8 },
  brass: { color: "#c08a4a", metal: 0.8, rough: 0.35 },
})

// the sofa: three seat cushions, two back cushions, rounded arms — Dad's place in the corner
model("sofa",
  box(2.2, 0.26, 0.9, { mat: "fabricD", pos: [0, 0.08, 0] }),
  [-0.7, 0, 0.7].map((x, i) => box(0.68, 0.16, 0.66, { mat: i === 1 ? "fabric" : "fabricL", pos: [x, 0.34, 0.08], jitter: 0.012, seed: i })),
  box(2.2, 0.5, 0.24, { mat: "fabricD", pos: [0, 0.34, -0.33] }),
  [-0.55, 0.55].map((x, i) => box(1.02, 0.44, 0.2, { mat: "fabric", pos: [x, 0.42, -0.2], rot: [-8, 0, 0], jitter: 0.015, seed: 5 + i })),
  sym("x", tf({ pos: [1.03, 0, 0] }, box(0.18, 0.5, 0.9, { mat: "fabricD", pos: [0, 0.08, 0] }), cyl(0.1, 0.9, { mat: "fabric", sides: 10, pos: [0, 0.58, -0.45], rot: [90, 0, 0] }))),
  // a cushion in the club's colour, thrown in the corner
  box(0.42, 0.12, 0.42, { mat: "clubP", pos: [0.72, 0.5, -0.05], rot: [-25, 20, 10], jitter: 0.01 }),
  sym("x", sym("z", cyl(0.035, 0.08, { mat: "walnut", sides: 6, pos: [1.0, 0, 0.36] }))))

model("armchair",
  box(0.95, 0.26, 0.85, { mat: "fabricD", pos: [0, 0.08, 0] }),
  box(0.62, 0.16, 0.62, { mat: "fabricL", pos: [0, 0.34, 0.08], jitter: 0.012 }),
  box(0.95, 0.55, 0.22, { mat: "fabricD", pos: [0, 0.34, -0.31] }),
  sym("x", box(0.17, 0.48, 0.85, { mat: "fabric", pos: [0.39, 0.08, 0] })),
  sym("x", sym("z", cyl(0.03, 0.08, { mat: "walnut", sides: 6, pos: [0.42, 0, 0.35] }))))

// the low table: a magazine, a cup, an ashtray from another decade
model("table_low",
  box(1.4, 0.05, 0.75, { mat: "oak", pos: [0, 0.4, 0] }),
  box(1.3, 0.03, 0.65, { mat: "oakD", pos: [0, 0.14, 0] }),
  sym("x", sym("z", cyl(0.03, 0.42, { mat: "walnut", sides: 6, pos: [0.62, 0, 0.3] }))),
  box(0.3, 0.012, 0.22, { mat: "sheet", pos: [-0.3, 0.45, 0.05], rot: [0, 12, 0] }),
  lathe([0, 0, 0.045, 0, 0.05, 0.09, 0.044, 0.09, 0.04, 0.008, 0, 0.008], { mat: "cream", sides: 10, pos: [0.35, 0.45, -0.1] }))

// the sideboard, and the radio on it: the thing the whole afternoon is about
model("sideboard",
  box(2.0, 0.72, 0.5, { mat: "oak", pos: [0, 0.08, 0] }),
  box(2.04, 0.04, 0.54, { mat: "oakD", pos: [0, 0.8, 0] }),
  [-0.66, 0, 0.66].map(x => [box(0.62, 0.6, 0.02, { mat: "oakL", pos: [x, 0.14, 0.255] }), box(0.12, 0.02, 0.03, { mat: "brass", pos: [x, 0.55, 0.27] })]),
  sym("x", sym("z", cyl(0.03, 0.08, { mat: "walnut", sides: 6, pos: [0.92, 0, 0.2] }))))
model("radio",
  box(0.62, 0.36, 0.26, { mat: "bakelite", pos: [0, 0, 0], jitter: 0.004 }),
  box(0.3, 0.26, 0.012, { mat: "grille", pos: [-0.12, 0.05, 0.13] }),
  [-0.2, -0.16, -0.12, -0.08, -0.04].map(x => box(0.012, 0.24, 0.016, { mat: "bakelite", pos: [x, 0.06, 0.134] })),
  cyl(0.065, 0.02, { mat: "dial", sides: 16, pos: [0.17, 0.2, 0.13], rot: [90, 0, 0] }),
  [0.12, 0.22].map(x => cyl(0.025, 0.03, { mat: "cream", sides: 8, pos: [x, 0.06, 0.13], rot: [90, 0, 0] })),
  tube([0.24, 0.36, -0.05, 0.42, 0.95, -0.12], 0.006, { mat: "chrome", sides: 5 }),
  box(0.5, 0.03, 0.06, { mat: "bakelite", pos: [0, 0.36, 0] }))

// the kitchen: cupboards under a worktop, drawers (the one with the batteries), a sink and a tap, a kettle
model("counter",
  box(3.0, 0.82, 0.6, { mat: "formica", pos: [0, 0.08, 0] }),
  box(3.04, 0.04, 0.64, { mat: "top", pos: [0, 0.9, 0.01] }),
  box(3.0, 0.08, 0.58, { mat: "oakD", pos: [0, 0, -0.01] }),
  [-1.12, -0.37, 0.37, 1.12].map(x => [box(0.7, 0.5, 0.02, { mat: "cream", pos: [x, 0.13, 0.305] }), box(0.7, 0.18, 0.02, { mat: "cream", pos: [x, 0.67, 0.305] }), box(0.16, 0.02, 0.03, { mat: "steel", pos: [x, 0.76, 0.32] }), box(0.02, 0.14, 0.03, { mat: "steel", pos: [x + 0.28, 0.4, 0.32] })]),
  box(0.6, 0.02, 0.4, { mat: "steel", pos: [0.6, 0.93, 0.05] }),
  tube([0.6, 0.93, -0.18, 0.6, 1.2, -0.18, 0.6, 1.2, -0.02], 0.016, { mat: "chrome", sides: 6 }),
  lathe([0, 0, 0.1, 0, 0.11, 0.12, 0.09, 0.2, 0.03, 0.22, 0, 0.22], { mat: "white", sides: 12, pos: [-0.9, 0.93, 0] }),
  tube([-0.8, 1.05, 0, -0.75, 1.12, 0, -0.78, 1.0, 0], 0.012, { mat: "black", sides: 5 }))
model("fridge",
  box(0.72, 1.82, 0.66, { mat: "white", pos: [0, 0.04, 0], jitter: 0.004 }),
  box(0.72, 0.012, 0.67, { mat: "steel", pos: [0, 1.25, 0.001] }),
  box(0.04, 0.34, 0.05, { mat: "chrome", pos: [0.28, 0.82, 0.35] }),
  box(0.04, 0.2, 0.05, { mat: "chrome", pos: [0.28, 1.38, 0.35] }),
  box(0.72, 0.04, 0.62, { mat: "rubber", pos: [0, 0, 0] }),
  // a club magnet holding up a fixture list
  box(0.2, 0.28, 0.006, { mat: "sheet", pos: [-0.1, 1.45, 0.335], rot: [0, 0, -4] }), box(0.05, 0.05, 0.012, { mat: "clubP", pos: [-0.1, 1.58, 0.34] }))
model("table",
  box(1.6, 0.05, 1.1, { mat: "oakL", pos: [0, 0.74, 0] }),
  sym("x", sym("z", cyl(0.035, 0.74, { mat: "oakD", sides: 6, pos: [0.72, 0, 0.47] }))),
  box(0.5, 0.012, 0.35, { mat: "clubS", pos: [0.1, 0.79, 0], rot: [0, 8, 0] }),
  lathe([0, 0, 0.12, 0, 0.13, 0.03, 0.12, 0.04, 0, 0.04], { mat: "cream", sides: 14, pos: [-0.35, 0.79, 0.15] }))
model("chair",
  box(0.44, 0.04, 0.44, { mat: "oakL", pos: [0, 0.44, 0] }),
  sym("x", sym("z", cyl(0.02, 0.44, { mat: "oakD", sides: 6, pos: [0.19, 0, 0.19] }))),
  sym("x", cyl(0.02, 0.48, { mat: "oakD", sides: 6, pos: [0.19, 0.44, -0.2] })),
  [0.62, 0.78].map(y => box(0.42, 0.06, 0.025, { mat: "oakL", pos: [0, y, -0.2] })))

// his room: a bed with a blanket in the club's colours, the wardrobe with the box on top, the desk
model("bed",
  box(1.1, 0.26, 2.0, { mat: "oak", pos: [0, 0.08, 0] }),
  box(1.1, 0.7, 0.07, { mat: "oakD", pos: [0, 0.08, -1.0] }),
  box(1.1, 0.4, 0.06, { mat: "oakD", pos: [0, 0.08, 1.0] }),
  box(1.02, 0.14, 1.92, { mat: "sheet", pos: [0, 0.34, 0] }),
  box(1.06, 0.07, 1.3, { mat: "clubP", pos: [0, 0.47, 0.3], jitter: 0.01 }),
  box(1.07, 0.075, 0.16, { mat: "clubS", pos: [0, 0.47, -0.28] }),
  box(1.06, 0.06, 0.32, { mat: "clubP", pos: [0, 0.54, -0.28], rot: [-10, 0, 0] }),
  box(0.62, 0.13, 0.36, { mat: "sheet", pos: [0, 0.48, -0.72], jitter: 0.02 }),
  sym("x", sym("z", cyl(0.04, 0.1, { mat: "walnut", sides: 6, pos: [0.5, 0, 0.94] }))))
model("wardrobe",
  box(2.4, 2.1, 0.6, { mat: "oak", pos: [0, 0.06, 0] }),
  box(2.44, 0.06, 0.64, { mat: "oakD", pos: [0, 2.16, 0] }),
  box(2.44, 0.06, 0.62, { mat: "oakD", pos: [0, 0, 0] }),
  [-0.6, 0.6].map(x => [box(1.16, 1.98, 0.02, { mat: "oakL", pos: [x, 0.12, 0.305] }), box(0.03, 0.22, 0.04, { mat: "brass", pos: [x + (x < 0 ? 0.5 : -0.5), 1.0, 0.33] })]),
  // the box on top — the archive, Dad calls it; the scarf is in there
  box(0.8, 0.36, 0.5, { mat: "card", pos: [-0.45, 2.22, 0.02], rot: [0, 6, 0] }),
  box(0.84, 0.06, 0.54, { mat: "cardD", pos: [-0.45, 2.58, 0.02], rot: [0, 6, 0] }),
  box(0.86, 0.02, 0.06, { mat: "tape", pos: [-0.45, 2.62, 0.02], rot: [0, 6, 0] }))
model("desk",
  box(1.5, 0.05, 0.62, { mat: "oakL", pos: [0, 0.72, 0] }),
  box(0.45, 0.66, 0.58, { mat: "oak", pos: [0.5, 0.06, 0] }),
  [0.25, 0.48].map(y => box(0.4, 0.18, 0.02, { mat: "oakL", pos: [0.5, y - 0.1, 0.3] })),
  sym("z", cyl(0.03, 0.72, { mat: "oakD", sides: 6, pos: [-0.68, 0, 0.26] })),
  // a lamp, an exercise book, felt tips
  cyl(0.08, 0.02, { mat: "black", sides: 10, pos: [-0.5, 0.77, -0.15] }), tube([-0.5, 0.79, -0.15, -0.5, 1.1, -0.1, -0.38, 1.18, 0.0], 0.012, { mat: "black", sides: 5 }),
  cone(0.11, 0.14, { mat: "shade", sides: 10, pos: [-0.36, 1.06, 0.02], rot: [20, 0, 0] }),
  box(0.3, 0.015, 0.22, { mat: "sheet", pos: [0.05, 0.765, 0.05], rot: [0, -10, 0] }),
  [0, 1, 2].map(i => cyl(0.008, 0.12, { mat: i === 1 ? "clubP" : "clubS", sides: 5, pos: [0.25 + i * 0.03, 0.77, 0.1], rot: [0, 0, 90] })))
model("shoes",
  box(0.6, 0.5, 1.2, { mat: "oakD", pos: [0, 0, 0] }),
  [0, 1, 2, 3].map(i => box(0.26, 0.1, 0.12, { mat: i % 2 ? "black" : "rubber", pos: [0, 0.5, -0.42 + i * 0.28], rot: [0, 90 + i * 6, 0] })),
  // a scarf on the hook above them, in the club's colours
  box(0.06, 0.7, 0.18, { mat: "clubP", pos: [0.22, 0.9, 0.35] }), box(0.065, 0.12, 0.185, { mat: "clubS", pos: [0.22, 1.0, 0.35] }))

// small things the stage sets about the rooms (no block: against a wall, out of the way)
model("lamp_floor",
  cyl(0.16, 0.03, { mat: "black", sides: 12 }), cyl(0.015, 1.45, { mat: "brass", sides: 6, pos: [0, 0.03, 0] }),
  cyl(0.26, 0.32, { mat: "shade", sides: 14, top: 0.15, pos: [0, 1.36, 0] }))
model("plant",
  lathe([0, 0, 0.15, 0, 0.19, 0.32, 0.2, 0.34, 0, 0.34], { mat: "pot", sides: 12 }),
  cyl(0.17, 0.02, { mat: "soil", sides: 12, pos: [0, 0.31, 0] }),
  [0, 1, 2, 3, 4, 5, 6].map(i => tf({ pos: [0, 0.32, 0], rot: [0, i * 51, 0] }, box(0.09, 0.5 + (i % 3) * 0.12, 0.012, { mat: i % 2 ? "leaf" : "leafL", pos: [0, 0, 0.08], rot: [22 + (i % 3) * 8, 0, 0], jitter: 0.02, seed: i }))))
model("bookshelf",
  box(1.0, 1.6, 0.32, { mat: "oakD", pos: [0, 0, 0] }),
  [0.35, 0.75, 1.15].map((y, r) => [0, 1, 2, 3, 4, 5, 6].map(i => box(0.07 + (i % 3) * 0.02, 0.26 + ((i + r) % 4) * 0.03, 0.22, { mat: ["clubP", "cream", "oakL", "black", "clubS", "fabric", "grille"][(i + r * 2) % 7], pos: [-0.38 + i * 0.12, y + 0.02, 0.04] }))),
  [0.33, 0.73, 1.13].map(y => box(0.96, 0.025, 0.3, { mat: "oak", pos: [0, y, 0.01] })))
model("battery",
  cyl(0.05, 0.22, { mat: "black", sides: 12 }), cyl(0.051, 0.07, { mat: "clubP", sides: 12, pos: [0, 0.15, 0] }),
  cyl(0.018, 0.02, { mat: "chrome", sides: 8, pos: [0, 0.22, 0] }))
model("cat",
  sphere(0.12, { mat: "black", detail: 1, scale: [0.85, 0.8, 1.9], pos: [0, 0.2, 0] }),
  sphere(0.085, { mat: "black", detail: 1, pos: [0, 0.32, 0.24] }),
  sym("x", cone(0.03, 0.07, { mat: "black", sides: 4, pos: [0.045, 0.38, 0.24] })),
  sym("x", sym("z", cyl(0.022, 0.12, { mat: "black", sides: 5, pos: [0.05, 0, 0.13] }))),
  tube([0, 0.2, -0.22, 0, 0.3, -0.36, 0, 0.42, -0.38], 0.018, { mat: "black", sides: 5 }))

pack("home", ["sofa", "armchair", "table_low", "sideboard", "radio", "counter", "fridge", "table", "chair", "bed", "wardrobe", "desk", "shoes", "lamp_floor", "plant", "bookshelf", "battery", "cat"])
