// LIFE — the cues Season One and RUSH were missing, synthesised with chirp (skill: chirp-game-audio).
// Build:  node ~/.cache/claude-tools/chirp/bin/chirp.js build scripts/life/audio/life-cues.cx.js --out /tmp/life-cues
// then    python3 scripts/life/audio/encode-cues.py /tmp/life-cues   (ogg + m4a into public/life/sfx, manifest rows)
// Quiet, short and physical: a paper, a phone, a stamp — never a chiptune blip. Peaks around -12 dBFS.

// ---- Season One: the hooks -------------------------------------------------------------------------

// a message arriving on a phone on the table: two short buzzes of the motor, a soft pop of the bubble
sfx("phone-text", { vol: 0.5, fx: [filter({ type: "lp", cutoff: 5200 })] },
  tone({ wave: "saw", freq: 175, dur: 0.11, env: [0.004, 0.02, 0.8, 0.03], vol: 0.55, tremolo: { rate: 38, depth: 0.7 }, filter: { type: "lp", cutoff: 900 } }),
  at(0.16, tone({ wave: "saw", freq: 175, dur: 0.11, env: [0.004, 0.02, 0.8, 0.03], vol: 0.55, tremolo: { rate: 38, depth: 0.7 }, filter: { type: "lp", cutoff: 900 } })),
  at(0.32, tone({ wave: "sine", freq: "E6", to: "B6", slide: 0.05, dur: 0.05, env: [0.002, 0.03, 0.3, 0.08], vol: 0.22 })))

// a cardboard flap lifted: a dull thump and the rustle of what is inside
sfx("box-lid", { vol: 0.55 },
  noise({ color: "brown", dur: 0.09, env: [0.002, 0.05, 0.2, 0.1], filter: { type: "lp", cutoff: 420 }, vol: 0.9 }),
  tone({ wave: "sine", freq: 95, to: 60, dur: 0.1, env: [0.002, 0.06, 0.2, 0.08], vol: 0.5 }),
  at(0.08, noise({ color: "pink", dur: 0.38, env: [0.04, 0.2, 0.3, 0.2], filter: { type: "bp", from: 2400, to: 1500, q: 0.7 }, vol: 0.28 })))

// the flash-forward: air pulled in, a hit, and the picture freezing
sfx("flash", { vol: 0.5, fx: [reverb({ size: 0.5, mix: 0.18 })] },
  noise({ color: "pink", dur: 0.45, env: [0.4, 0.02, 1, 0.04], filter: { type: "bp", from: 400, to: 3800, q: 0.6 }, vol: 0.5 }),
  at(0.44, tone({ wave: "sine", freq: 70, to: 42, dur: 0.3, env: [0.002, 0.15, 0.3, 0.4], vol: 0.8 })),
  at(0.44, noise({ color: "white", dur: 0.05, env: [0.001, 0.04, 0, 0.05], filter: { type: "hp", cutoff: 2500 }, vol: 0.35 })))

// "two hours earlier": a tape spooling back, falling
sfx("rewind", { vol: 0.42, fx: [filter({ type: "lp", cutoff: 6000 })] },
  tone({ wave: "saw", freq: 1400, to: 240, slide: 0.75, dur: 0.75, env: [0.02, 0.1, 0.8, 0.1], vol: 0.12, vibrato: { rate: 23, depth: 0.6 }, filter: { type: "bp", cutoff: 1600, q: 0.8 } }),
  noise({ color: "pink", dur: 0.75, env: [0.02, 0.1, 0.7, 0.12], filter: { type: "bp", from: 5200, to: 900, q: 1.1 }, vol: 0.32 }),
  at(0.76, noise({ color: "brown", dur: 0.04, env: [0.001, 0.03, 0, 0.03], filter: { type: "lp", cutoff: 900 }, vol: 0.6 })))

// a rubber stamp: the thud is the same, what rings after it says what happened
sfx("_thud", {},
  noise({ color: "brown", dur: 0.06, env: [0.001, 0.04, 0.1, 0.07], filter: { type: "lp", cutoff: 700 }, vol: 1 }),
  tone({ wave: "sine", freq: 120, to: 70, dur: 0.07, env: [0.001, 0.05, 0.1, 0.06], vol: 0.7 }))
sfx("stamp-pass", { vol: 0.5, fx: [reverb({ size: 0.3, mix: 0.12 })] },
  play("_thud"),
  at(0.06, tone({ wave: "fm", fm: { ratio: 3, index: 1.6, decay: 0.2 }, freq: "G5", dur: 0.08, env: [0.002, 0.1, 0.3, 0.3], vol: 0.2 })),
  at(0.13, tone({ wave: "fm", fm: { ratio: 3, index: 1.6, decay: 0.2 }, freq: "D6", dur: 0.12, env: [0.002, 0.12, 0.3, 0.4], vol: 0.18 })))
sfx("stamp-miss", { vol: 0.5, fx: [reverb({ size: 0.3, mix: 0.1 })] },
  play("_thud"),
  at(0.07, tone({ wave: "triangle", freq: "D3", to: "A2", slide: 0.3, dur: 0.3, env: [0.005, 0.1, 0.5, 0.2], vol: 0.3 })))
sfx("stamp-new", { vol: 0.48, fx: [reverb({ size: 0.4, mix: 0.16 })] },
  play("_thud"),
  at(0.06, tone({ wave: "triangle", freq: "C5", dur: 0.07, env: [0.002, 0.05, 0.4, 0.1], vol: 0.18 })),
  at(0.12, tone({ wave: "triangle", freq: "F5", dur: 0.07, env: [0.002, 0.05, 0.4, 0.1], vol: 0.18 })),
  at(0.18, tone({ wave: "triangle", freq: "C6", dur: 0.14, env: [0.002, 0.08, 0.4, 0.25], vol: 0.18 })))

// a secret: something in the room you did not hear then — a soft, open, unresolved shimmer
sfx("secret", { vol: 0.42, fx: [chorus({ mix: 0.4 }), reverb({ size: 0.8, damp: 0.5, mix: 0.4 })] },
  tone({ wave: "fm", fm: { ratio: 3.5, index: 2.2, decay: 0.6 }, freq: "E5", dur: 0.5, env: [0.02, 0.4, 0.3, 0.9], vol: 0.16 }),
  at(0.14, tone({ wave: "fm", fm: { ratio: 3.5, index: 2.2, decay: 0.6 }, freq: "B5", dur: 0.5, env: [0.02, 0.4, 0.3, 0.9], vol: 0.13 })),
  at(0.28, tone({ wave: "fm", fm: { ratio: 3.5, index: 2.2, decay: 0.6 }, freq: "F#6", dur: 0.6, env: [0.02, 0.4, 0.3, 1.1], vol: 0.11 })),
  tone({ wave: "sine", freq: "E3", dur: 1.1, env: [0.3, 0.3, 0.6, 0.6], vol: 0.12 }))

// the envelope torn open: three ripping bursts of paper
sfx("envelope-tear", { vol: 0.5 },
  [0, 0.09, 0.2].map((t, i) => at(t, noise({ color: "white", freq: 9000 - i * 1800, dur: 0.07 + i * 0.03, env: [0.003, 0.03, 0.6, 0.04], filter: { type: "bp", from: 3800 - i * 500, to: 2200, q: 0.9 }, vol: 0.5 - i * 0.08 }))),
  at(0.34, noise({ color: "pink", dur: 0.25, env: [0.01, 0.1, 0.2, 0.15], filter: { type: "bp", cutoff: 1800, q: 0.7 }, vol: 0.2 })))

// the letter unfolded: paper, and one warm chord under it that stays a moment
sfx("letter", { vol: 0.4, fx: [reverb({ size: 0.7, mix: 0.3 })] },
  noise({ color: "pink", dur: 0.3, env: [0.02, 0.12, 0.3, 0.2], filter: { type: "bp", from: 1200, to: 2600, q: 0.6 }, vol: 0.25 }),
  at(0.18, ["A3", "C#4", "E4", "B4"].map((n, i) => tone({ wave: "triangle", freq: n, dur: 1.4, env: [0.25 + i * 0.05, 0.4, 0.6, 1.2], vol: 0.07, filter: { type: "lp", cutoff: 2200 } }))))

// the clock under twenty seconds: two tight, low pulses (a heartbeat that is not quite one)
sfx("clock-hot", { vol: 0.5 },
  tone({ wave: "sine", freq: 62, to: 48, dur: 0.09, env: [0.002, 0.06, 0.2, 0.06], vol: 0.9 }),
  at(0.17, tone({ wave: "sine", freq: 58, to: 45, dur: 0.09, env: [0.002, 0.06, 0.2, 0.06], vol: 0.75 })),
  at(0.0, noise({ color: "brown", dur: 0.03, env: [0.001, 0.02, 0, 0.02], filter: { type: "lp", cutoff: 600 }, vol: 0.4 })))

// one second of the last ten: a wooden tick
sfx("clock-tick", { vol: 0.35 },
  tone({ wave: "triangle", freq: 1900, dur: 0.012, env: [0.001, 0.01, 0, 0.02], vol: 0.35 }),
  noise({ color: "white", dur: 0.01, env: [0.001, 0.008, 0, 0.01], filter: { type: "bp", cutoff: 3400, q: 2 }, vol: 0.4 }))

// the end card's ledger: each row lands like a typed line
sfx("ledger", { vol: 0.38 },
  noise({ color: "white", dur: 0.015, env: [0.001, 0.012, 0, 0.02], filter: { type: "bp", cutoff: 2600, q: 1.2 }, vol: 0.7 }),
  tone({ wave: "triangle", freq: 420, dur: 0.02, env: [0.001, 0.015, 0, 0.02], vol: 0.25 }))

// a timed choice: the fuse catches
sfx("fuse", { vol: 0.38 },
  noise({ color: "white", freq: 6000, dur: 0.5, env: [0.01, 0.1, 0.5, 0.15], filter: { type: "hp", cutoff: 3000 }, vol: 0.3, tremolo: { rate: 17, depth: 0.5 } }))

// ---- RUSH: the street at night ----------------------------------------------------------------------

// a metal bin banged on purpose
sfx("clang", { vol: 0.5, fx: [reverb({ size: 0.45, mix: 0.2 })] },
  tone({ wave: "fm", fm: { ratio: 2.7, index: 5, decay: 0.25 }, freq: 310, dur: 0.05, env: [0.001, 0.2, 0.1, 0.45], vol: 0.35 }),
  tone({ wave: "fm", fm: { ratio: 1.41, index: 3, decay: 0.2 }, freq: 523, dur: 0.05, env: [0.001, 0.15, 0.1, 0.35], vol: 0.2 }),
  noise({ color: "white", dur: 0.04, env: [0.001, 0.03, 0, 0.04], filter: { type: "bp", cutoff: 2800, q: 0.8 }, vol: 0.45 }))

// something picked up off the pavement: quick, bright, small
sfx("pickup", { vol: 0.42, fx: [reverb({ size: 0.25, mix: 0.1 })] },
  noise({ color: "pink", dur: 0.05, env: [0.002, 0.04, 0, 0.05], filter: { type: "bp", cutoff: 1500, q: 0.8 }, vol: 0.4 }),
  at(0.03, tone({ wave: "triangle", freq: "A5", dur: 0.05, env: [0.002, 0.04, 0.3, 0.08], vol: 0.18 })),
  at(0.08, tone({ wave: "triangle", freq: "E6", dur: 0.08, env: [0.002, 0.05, 0.3, 0.14], vol: 0.16 })))

// a step of the job done: a short rising figure that says "next"
sfx("objective", { vol: 0.42, fx: [reverb({ size: 0.4, mix: 0.18 })] },
  ["D5", "G5", "B5"].map((n, i) => at(i * 0.07, tone({ wave: "fm", fm: { ratio: 2, index: 1.2, decay: 0.15 }, freq: n, dur: 0.07, env: [0.002, 0.06, 0.4, 0.18], vol: 0.16 }))),
  at(0.21, tone({ wave: "fm", fm: { ratio: 2, index: 1.2, decay: 0.2 }, freq: "D6", dur: 0.2, env: [0.002, 0.1, 0.4, 0.35], vol: 0.15 })))

// caught by a steward: a hand on the shoulder — a dull drop and a low clamp
sfx("caught", { vol: 0.48 },
  tone({ wave: "sine", freq: 150, to: 55, dur: 0.25, env: [0.002, 0.12, 0.3, 0.2], vol: 0.7 }),
  noise({ color: "brown", dur: 0.08, env: [0.001, 0.05, 0.1, 0.08], filter: { type: "lp", cutoff: 800 }, vol: 0.6 }),
  at(0.12, tone({ wave: "saw", freq: "C3", dur: 0.25, env: [0.01, 0.1, 0.4, 0.2], vol: 0.07, filter: { type: "lp", cutoff: 700 } })),
  at(0.12, tone({ wave: "saw", freq: "C#3", dur: 0.25, env: [0.01, 0.1, 0.4, 0.2], vol: 0.07, filter: { type: "lp", cutoff: 700 } })))

// a spray can shaken and pressed
sfx("spray", { vol: 0.4 },
  [0, 0.11, 0.22].map(t => at(t, noise({ color: "white", freq: 2200, dur: 0.05, env: [0.001, 0.04, 0, 0.03], filter: { type: "bp", cutoff: 2600, q: 3 }, vol: 0.35 }))),
  at(0.36, noise({ color: "white", dur: 0.6, env: [0.03, 0.1, 0.8, 0.12], filter: { type: "hp", cutoff: 4200 }, vol: 0.4 })))

bank("life-cues", ["phone-text", "box-lid", "flash", "rewind", "stamp-*", "secret", "envelope-tear", "letter", "clock-*", "ledger", "fuse", "clang", "pickup", "objective", "caught", "spray"])
