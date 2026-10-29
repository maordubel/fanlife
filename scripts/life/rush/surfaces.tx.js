// LIFE · RUSH — the ground under a night run, made with loom (skill: loom-textures).
// The camera in RUSH is at a runner's shoulder or behind his eyes, so the street is seen close: the relief and
// the sheen are what make it a street. Height first; colour, roughness and puddles all follow it.
//
// Build:  node ~/.cache/claude-tools/loom/bin/loom.js build scripts/life/rush/surfaces.tx.js --out <dir>
// Pack:   python3 scripts/life/rush/pack-surfaces.py <dir>   → public/life/rush/tex/<name>-{albedo,height,rough}.webp
// The normal map is rebuilt in the browser from the height (lib/life/rush-render/surfaces.ts), so only grey
// tiles and one colour tile ship — a lossy normal map would bend the light.

pal({ tar: "#2a2b30", tarL: "#3a3b41", tarD: "#1c1d21", patch: "#18191c", line: "#cfc9bc",
  slab: "#8d8a86", slabL: "#a19d98", slabD: "#76736f", joint: "#4a4846", grime: "#2e2b28",
  conc: "#6e6f73", concL: "#808185", concD: "#5a5b5f" })

// asphalt: aggregate, tar patches where it was dug up, sealed cracks, and the hollows that hold the rain
{
  const grit = noise({ scale: 96, octaves: 2, seed: 61 })
  const stones = dots({ scale: 48, radius: 0.3, jitter: 1, soft: 0.5, seed: 62 })
  const swell = noise({ scale: 3, octaves: 4, seed: 63 }).as("swell")
  const patches = cells({ scale: 3, seed: 64 }).threshold(0.32, 0.02).invert().mul(noise({ scale: 4, seed: 65 }).threshold(0.6, 0.04)).as("patches")
  const cracks = ridged({ scale: 4, octaves: 3, seed: 66 }).threshold(0.94, 0.02).as("cracks")
  const puddle = swell.blur(0.03).levels(0.33, 0.42, 1, 0).as("puddles")
  // water lies flat: inside a puddle the stones are under it, so the relief goes still and the hollow becomes a mirror
  const height = swell.mul(0.45).add(stones.mul(0.3)).add(grit.mul(0.15)).sub(cracks.mul(0.25)).add(patches.mul(0.05)).normalize().mix(0.2, puddle.mul(0.92))
  material("asphalt", { size: 1024, depth: 0.006, ao: 0.5 }, {
    height,
    color: ramp(grit.mix(stones, 0.4), ["tarD", "tar", "tarL"]).mix("patch", patches.mul(0.8)).mix("tarD", cracks.mul(0.9)).mix("patch", puddle.mul(0.7)),
    // wet: the hollows are mirrors, the rest is a damp sheen; the shader lifts all of it when the night is dry
    rough: puddle.invert().mul(0.4).add(grit.mul(0.12)).add(0.24).clamp(0.2, 0.9),
  })
}

// pavement slabs: 4 × 4 to the tile like the street's own, joints sunk, edges chipped, grime in the joints
{
  const t = tiles({ rows: 4, cols: 4, gap: 0.01, bevel: 0.01, vary: 0.06, wobble: 0.04, seed: 71 }).as("slabs")
  const grain = noise({ scale: 40, octaves: 3, seed: 72 })
  const chips = cells({ scale: 14, seed: 73 }).threshold(0.06, 0.02).invert().mul(t.dist.levels(0, 0.15, 1, 0)).as("chips")
  const height = t.mul(0.85).add(grain.mul(0.1)).sub(chips.mul(0.2)).normalize()
  const dirt = height.cavity(0.006, 12).max(t.mask.invert()).as("dirt")
  material("slabs", { size: 512, depth: 0.012, ao: 0.6 }, {
    height,
    color: ramp(t.id.mix(grain, 0.4), ["slabD", "slab", "slabL"]).mix("joint", t.mask.invert()).mix("grime", dirt.mul(0.45)),
    rough: grain.levels(0, 1, 0.55, 0.85).max(t.mask.invert().mul(0.95)).clamp(0, 1),
  })
}

// concrete floor: the terrace steps, the school yard, the hall — trowelled, stained, worn shiny where walked on
{
  const trowel = noise({ scale: 4, octaves: 4, seed: 81 }).warp(noise({ scale: 6, seed: 82 }), 0.06)
  const sand = noise({ scale: 80, octaves: 2, seed: 83 })
  const pores = dots({ scale: 60, radius: 0.15, jitter: 1, soft: 0.2, seed: 84 }).invert()
  const height = trowel.mul(0.5).add(sand.mul(0.3)).mul(pores.mix(1, 0.7)).normalize()
  const worn = noise({ scale: 2, octaves: 2, seed: 85 }).levels(0.45, 0.8, 0, 1).as("worn")
  material("concrete", { size: 512, depth: 0.008, ao: 0.4 }, {
    height,
    color: ramp(trowel.mix(sand, 0.3), ["concD", "conc", "concL"]).mul(height.cavity(0.004, 10).invert().mix(1, 0.6)),
    rough: sand.levels(0, 1, 0.65, 0.9).sub(worn.mul(0.3)).clamp(0.2, 1),
  })
}
