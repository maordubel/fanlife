// LIFE · RUSH — the things on the pavement a run picks up, made with kiln (skill: kiln-3d-assets).
// Low-poly on purpose: RUSH is the GTA engine of LIFE, read at a glance while running.
// `clubP` / `clubS` are placeholders: the stage repaints them with the club's own colours (never a rival's),
// so one file serves every club. Everything else is a neutral material.
//
// Build:  node ~/.cache/claude-tools/kiln/bin/kiln.js build scripts/life/rush/props.kx.js --out <dir>
// Ship:   cp <dir>/rush-props.glb <dir>/models/bin.glb public/life/rush/models/

pal({
  clubP: "#c8102e", clubS: "#f2efe6",
  silver: { color: "#cfd3da", metal: 0.85, rough: 0.28 }, steel: { color: "#8c9099", metal: 0.6, rough: 0.4 },
  glass: { color: "#b9d4e3", rough: 0.08, metal: 0.1 }, paper: { color: "#efe9dc", rough: 0.85 },
  wood: { color: "#8a6346", rough: 0.75 }, card: { color: "#b08a62", rough: 0.9 }, tape: { color: "#5d6068", rough: 0.55 },
  black: { color: "#22252b", rough: 0.6 }, zip: { color: "#b7b2a6", metal: 0.6, rough: 0.35 },
})

// a coin: a rim and a face, read as money from across a street
model("coin", { pivot: "center" },
  lathe([0, -0.018, 0.15, -0.018, 0.15, 0.018, 0, 0.018], { mat: "silver", sides: 20, rot: [90, 0, 0] }),
  lathe([0.118, 0.019, 0.132, 0.019, 0.132, 0.024, 0.118, 0.024], { mat: "steel", sides: 20, rot: [90, 0, 0] }),
  lathe([0.118, -0.024, 0.132, -0.024, 0.132, -0.019, 0.118, -0.019], { mat: "steel", sides: 20, rot: [90, 0, 0] }))

// a glass bottle with a paper label: deposit money on the kiosk counter
model("bottle",
  lathe([0, 0, 0.075, 0, 0.078, 0.02, 0.078, 0.17, 0.06, 0.21, 0.03, 0.25, 0.028, 0.31, 0.033, 0.315, 0.033, 0.33, 0, 0.33], { mat: "glass", sides: 12 }),
  cyl(0.0795, 0.07, { mat: "paper", sides: 12, pos: [0, 0.07, 0] }))

// a rolled banner: the club's cloth on two poles
model("roll", { pivot: "center" },
  tf({ rot: [0, 0, 90] },
    cyl(0.15, 0.82, { mat: "clubP", sides: 12, pos: [0, -0.41, 0] }),
    cyl(0.152, 0.1, { mat: "clubS", sides: 12, pos: [0, -0.1, 0] }),
    cyl(0.152, 0.1, { mat: "clubS", sides: 12, pos: [0, 0.12, 0] }),
    cyl(0.025, 1.1, { mat: "wood", sides: 6, pos: [0, -0.55, 0] })))

// a holdall: the club's colour down the side, a zip, two handles
model("bag",
  box(0.52, 0.3, 0.26, "black"),
  box(0.525, 0.07, 0.265, { mat: "clubP", pos: [0, 0.1, 0] }),
  box(0.4, 0.012, 0.03, { mat: "zip", pos: [0, 0.301, 0] }),
  sym("z", tube([-0.12, 0.3, 0.06, -0.1, 0.42, 0.06, 0.1, 0.42, 0.06, 0.12, 0.3, 0.06], 0.014, { mat: "black" })))

// a scarf, folded three times: bars of the two colours and a fringe at the end
model("scarf",
  [0, 1, 2].map(i => box(0.95 - i * 0.06, 0.035, 0.2, { mat: i % 2 ? "clubS" : "clubP", pos: [i * 0.02, i * 0.036, 0], jitter: 0.004, seed: i })),
  [0, 1, 2, 3].map(i => box(0.08, 0.036, 0.205, { mat: i % 2 ? "clubP" : "clubS", pos: [-0.33 + i * 0.22, 0.073, 0] })),
  Array.from({ length: 7 }, (_, i) => box(0.012, 0.012, 0.07, { mat: "clubS", pos: [0.46, 0.08, -0.09 + i * 0.03], rot: [0, 0, -12] })))

// a spray can: a metal body with a band of the club, a cap and the nozzle
model("paint",
  cyl(0.11, 0.3, { mat: "steel", sides: 14 }),
  cyl(0.112, 0.09, { mat: "clubP", sides: 14, pos: [0, 0.1, 0] }),
  lathe([0.11, 0.3, 0.07, 0.34, 0.03, 0.35, 0, 0.35], { mat: "steel", sides: 14 }),
  cyl(0.032, 0.05, { mat: "black", sides: 8, pos: [0, 0.34, 0] }),
  box(0.012, 0.012, 0.03, { mat: "black", pos: [0, 0.37, 0.02] }))

// a folded flag
model("cloth",
  box(0.55, 0.05, 0.4, { mat: "clubP", jitter: 0.006, seed: 3 }),
  box(0.53, 0.05, 0.38, { mat: "clubS", pos: [0.005, 0.05, 0.005], jitter: 0.006, seed: 4 }),
  box(0.51, 0.045, 0.36, { mat: "clubP", pos: [-0.004, 0.1, -0.004], jitter: 0.006, seed: 5 }))

// a roll of gaffer tape on its cardboard core
model("tape", { pivot: "center" },
  lathe([0.06, -0.025, 0.11, -0.025, 0.11, 0.025, 0.06, 0.025, 0.06, -0.025], { mat: "tape", sides: 16 }),
  lathe([0.05, -0.026, 0.06, -0.026, 0.06, 0.026, 0.05, 0.026, 0.05, -0.026], { mat: "card", sides: 16 }))

// a street bin with ribs and a lid that lifts (the stage bangs `lid`)
model("bin",
  lathe([0, 0, 0.3, 0, 0.34, 0.92, 0, 0.92], { mat: "steel", sides: 16 }),
  [0.2, 0.5, 0.8].map(y => cyl(0.318 + y * 0.03, 0.035, { mat: "steel", sides: 16, pos: [0, y, 0] })),
  sym("x", box(0.04, 0.04, 0.12, { mat: "black", pos: [0.34, 0.75, 0] })),
  part("lid", { pivot: [0, 0.92, 0] },
    lathe([0, 0.92, 0.37, 0.92, 0.37, 0.96, 0.3, 0.99, 0, 1.0], { mat: "steel", sides: 16 }),
    tube([-0.08, 1.0, 0, -0.06, 1.06, 0, 0.06, 1.06, 0, 0.08, 1.0, 0], 0.012, { mat: "black" })))

pack("rush-props", ["coin", "bottle", "roll", "bag", "scarf", "paint", "cloth", "tape"])   // the bin ships on its own (out/models/bin.glb): a pack flattens its lid into the body
