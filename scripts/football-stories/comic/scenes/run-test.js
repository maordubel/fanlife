const T = 3
function frame(t) {
  DRAW = Math.floor(t * 12); const td = DRAW / 12
  page()
  panel(60, 60, 1800, 960, 1, (pw, ph) => {
    x.fillStyle = GREEN; x.fillRect(0, 0, pw, ph); x.fillStyle = '#26a05a'; for (let i = 0; i < 9; i++) if (i % 2) x.fillRect(i * pw / 9, 0, pw / 9, ph)
    crowd(260, 260, [NAVY, RED, PAPER, '#7a5b3f'], td, 300, {scarf: RED})
    speedLines(pw / 2, ph * .7, 200, 1400, 30, 'rgba(255,255,255,.35)', 3, 5)
    player(700 + td * 120, 760, 1.15, td * 2.2, {shirt: RED, shorts: PAPER, socks: RED, number: 10})
    player(1200 + td * 90, 780, 1.1, td * 2.2 + .4, {shirt: CYAN, shorts: NAVY, socks: CYAN, number: 4}, -1)
    shout('GOAL!', 1350, 260, 170, k01(td, .6, 1.1))
  })
  finish()
}
