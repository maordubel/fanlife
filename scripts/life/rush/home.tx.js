// LIFE · RUSH — the floors of the family flat, made with loom (skill: loom-textures). Seen from above (rule 130), so
// the floor is most of the picture: oak boards with grain and worn edges, a kitchen in old two-tone tiles, a soft
// carpet in his room. Height first; colour and roughness follow it.
//
// Build:  node ~/.cache/claude-tools/loom/bin/loom.js build scripts/life/rush/home.tx.js --out <dir>
// Pack:   python3 scripts/life/rush/pack-surfaces.py <dir> boards tiles carpet

pal({ oakD: "#6e4529", oak: "#94603a", oakL: "#b57d4f", gap: "#3a2416",
  tileA: "#e8e1d2", tileB: "#7a7b80", grout: "#9b9284", tileW: "#f3eee3",
  pile: "#8b7b6e", pileL: "#a08f80", pileD: "#74665b" })

// oak boards: random lengths, grain along the board, the edges a little worn where feet go
{
  const p = planks({ rows: 6, per: 2, gap: 0.006, bevel: 0.012, vary: 0.25, grain: 46, seed: 11 }).as("boards")
  const tone = noise({ scale: 2, octaves: 2, seed: 12 })
  const height = p.mul(0.9).add(p.grain.mul(0.08)).normalize()
  const wear = height.convex(0.008, 10).as("wear")
  material("boards", { size: 1024, depth: 0.004, ao: 0.5 }, {
    height,
    color: ramp(p.grain.mix(tone, 0.35).mix(p.id, 0.45), ["oakD", "oak", "oakL"]).mix("gap", p.mask.invert().mul(0.9)).mix("oakL", wear.mul(0.25)),
    rough: p.grain.mul(0.15).add(0.42).add(p.mask.invert().mul(0.3)).clamp(0.3, 0.85),
  })
}

// kitchen tiles: a checker of cream and charcoal (neutral: a rival’s colour is never a floor), set in grout, a few crazed with age
{
  const t = tiles({ rows: 4, cols: 4, gap: 0.014, bevel: 0.01, vary: 0.04, seed: 21 }).as("tiles")
  const chk = checker({ cols: 4 })
  const craze = ridged({ scale: 10, octaves: 2, seed: 22 }).threshold(0.92, 0.02).mul(t.mask).as("craze")
  const height = t.mul(0.9).sub(craze.mul(0.05)).normalize()
  material("tiles", { size: 512, depth: 0.004, ao: 0.6 }, {
    height,
    color: color("tileA").mix("tileB", chk.mul(t.mask)).mix("grout", t.mask.invert()).mix("grout", craze.mul(0.4)).mul(noise({ scale: 6, seed: 23 }).mul(0.08).add(0.96)),
    rough: t.mask.mul(-0.4).add(0.75).clamp(0.2, 0.9),
  })
}

// his carpet: a short pile, soft, a little trodden where the door is
{
  const fibre = noise({ scale: 160, octaves: 2, seed: 31 })
  const tufts = dots({ scale: 64, radius: 0.35, jitter: 1, soft: 0.6, seed: 32 })
  const height = fibre.mul(0.5).add(tufts.mul(0.5)).normalize()
  material("carpet", { size: 512, depth: 0.003, ao: 0.4 }, {
    height,
    color: ramp(height.mix(noise({ scale: 3, seed: 33 }), 0.3), ["pileD", "pile", "pileL"]),
    rough: color("#ffffff").luma().mul(0.95),
  })
}
