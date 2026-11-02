# FanLife: Football Stories — art round 2: from a slideshow to a film

For the owner (2.11.2026). Round 1 (`55-football-stories-art-prompts.md`) gave the library its *pictures*. A documentary
moves: the camera drifts through layers, people run, the crowd breathes, one scene tears into the next. This round asks
for the pieces that let the studio **animate** — layers, figures, transitions and moments — so every film plays like a
paper-cut documentary, not a slideshow.

Use the **style block and colour rule from doc 55** (§1–§3) in front of every prompt, with two changes learnt from batch 1:

- In clip prompts **never write a hex code** — write the colours in words: *deep ink black, cream paper, signal red*.
  (A generator printed "#15130F" into the corners of a clip.)
- Ask for **no letters and no digits anywhere** — not on boards, papers, shirts or scoreboards. The studio prints every
  word and number itself, from the archive.

Kinds stay the same: **A `-kr`** (only colour signal red, repainted per club) · **B `-n`** (no colour) · **C** one club.

---

## 1 · Layered scenes for parallax (the biggest upgrade)

Each scene is **three files of the same picture**: `-bg` (sky, far stands), `-mid` (pitch, near stand), `-fg` (crowd heads,
fence, railings). The studio moves them at different speeds, so the camera feels like it travels into the scene.

Prompt each layer as: *style block* + scene line + one of
`Background layer only: …, nothing in the foreground.` · `Middle layer only on a transparent background: …` ·
`Foreground layer only on a transparent background: …, the bottom third of the frame.`
Layers 2 and 3 as **transparent PNG**, same 16:9 framing, same camera.

| Key | Scene |
|---|---|
| `layer-terrace-night-kr` | A floodlit home end at night: sky and pylons (bg) · the pitch and far stand (mid) · supporters' heads and raised scarves (fg). |
| `layer-street-march-kr` | A street to the ground: rooftops and floodlights (bg) · the road with walking supporters (mid) · a lamp post and shoulders close to camera (fg). |
| `layer-away-end-kr` | A foreign ground: its big stands (bg) · the pitch (mid) · a fence and a small group in signal-red scarves (fg). |
| `layer-tunnel-n` | The players' tunnel: the bright pitch at the end (bg) · the tunnel walls (mid) · the gate bars and a silhouette (fg). |
| `layer-city-dawn-kr` | A city at dawn: sky and sun (bg) · roofs with one stadium (mid) · a balcony with a signal-red flag (fg). |
| `layer-rain-stand-kr` | A rainy afternoon: grey sky (bg) · the pitch in rain (mid) · umbrellas and wet scarves (fg). |
| `layer-old-ground-kr` | A 1930s ground: chimneys and sky (bg) · the wooden stand and pitch (mid) · flat caps and rosettes (fg). |
| `layer-europe-night-kr` | A big European stadium: the bowl roof and night sky (bg) · the lit pitch (mid) · away supporters behind a net (fg). |

## 2 · Figures that move (transparent PNG cut-outs)

Whole-body figures, **side or three-quarter view from behind, no faces**, each on a transparent background, 2400 px tall,
kit in signal red with white shorts (A) — the studio repaints the red. These are animated over the scenes: they run, jump,
dive and fall.

`fig-striker-shoot-kr` (striking the ball) · `fig-striker-run-kr` (sprinting) · `fig-header-kr` (in the air, heading) ·
`fig-celebrate-arms-kr` (arms wide, running away) · `fig-celebrate-knee-slide-kr` · `fig-kneel-despair-kr` ·
`fig-keeper-dive-n` (keeper in grey, full stretch) · `fig-keeper-stand-n` · `fig-defender-slide-n` (grey kit) ·
`fig-referee-whistle-n` · `fig-referee-card-n` (card blank) · `fig-manager-coat-n` (on the touchline, arm pointing) ·
`fig-captain-cup-kr` (lifting a plain cup) · `fig-supporter-scarf-up-kr` · `fig-supporter-jump-kr` ·
`fig-supporter-child-shoulders-kr` (a child on a man's shoulders, both from behind) · `fig-ballboy-n`.

Add: `Isolated figure, full body, on a transparent background, no ground, no shadow, no face visible.`

## 3 · Crowd strips (transparent, wide)

4000×700 px transparent PNGs of **one row of supporters from behind**, so the studio can stack and bob them:
`crowd-row-scarves-up-kr` · `crowd-row-arms-up-kr` · `crowd-row-still-kr` (hands in pockets) · `crowd-row-umbrellas-n` ·
`crowd-row-flags-kr` (plain flags on short poles) · `crowd-row-away-small-kr` (a thin row with gaps).

## 4 · Transitions (clips, 1.5–3 s, kind B)

Short paper moves the editor uses between scenes. Full frame, cream and ink only, each one **ending on a full cover of paper or ink** (the studio cuts to the next scene
under it):
`tr-paper-tear-n` (a sheet tears from left to right) · `tr-page-turn-n` · `tr-ink-wipe-n` (ink floods the frame and
leaves) · `tr-newspaper-cover-n` (a newspaper slaps down and lifts) · `tr-tape-strip-n` (masking tape pulls across) ·
`tr-iris-floodlight-n` (a floodlight beam opens a circle) · `tr-confetti-cover-kr` · `tr-curtain-scarf-kr` (a huge scarf
sweeps across).

## 5 · Match moments (clips, 8–10 s, last 2 s still)

The emotional peaks of every film. Prompt = style block + `Stop-motion animation of paper layers, gentle 12 fps paper
movement, the camera slowly pushes in.` + the line:

| Key | Line |
|---|---|
| `clip-goal-net-ripple-kr` | A low shot from behind the goal: the ball hits the net, the net ripples, the stand behind erupts in signal-red scarves. |
| `clip-keeper-save-kr` | A keeper in grey dives and pushes the ball round the post; a corner flag in the foreground. |
| `clip-penalty-runup-kr` | From behind a taker in signal red: the run-up, the keeper sways, the camera holds before the kick (cut before contact). |
| `clip-shootout-walk-kr` | A lone player walks from the halfway line to the box, his team arm in arm behind him. |
| `clip-late-goal-surge-kr` | The terrace surges forward as one, scarves flying, a fence shaking. |
| `clip-final-whistle-kr` | A referee raises the whistle; players fall to the grass; supporters climb the fence. |
| `clip-trophy-lift-kr` | A captain from behind lifts a plain silver cup; red and cream ticker tape falls. |
| `clip-parade-bus-kr` | An open-top bus inches through a packed street, flags waving from balconies. |
| `clip-derby-smoke-free-kr` | Two ends of a stadium: one in signal red scarves, the other grey, both singing (no smoke, no flares). |
| `clip-empty-after-n` | Supporters leave a terrace; the camera stays on the empty steps and one lost scarf. |
| `clip-relegation-silence-kr` | Rain on a full terrace that does not move; the floodlights hum. |
| `clip-away-coach-night-kr` | A supporters' coach on a motorway at night, signal-red scarves in the back window. |
| `clip-radio-kitchen-kr` | A family in a kitchen leans towards a radio; a child jumps up at the end. |
| `clip-programme-pages-n` | Pages of a match programme flip by; the pages are photographs and lines, never text. |
| `clip-ticket-stub-tear-n` | A hand tears a ticket at the turnstile; the stub falls in slow motion. |

## 6 · Emotion close-ups (stills, no faces)

The film needs breath between facts. Hands and objects, kind A:
`close-hands-fence-kr` (fingers through a wire fence) · `close-scarf-over-mouth-kr` (a scarf pulled up, eyes out of frame) ·
`close-fingers-crossed-kr` · `close-hands-clasp-prayer-kr` · `close-boots-tunnel-n` (boots on the tunnel floor) ·
`close-armband-kr` (a captain's armband being pulled on) · `close-ticket-in-hand-kr` · `close-old-man-hands-scarf-kr` ·
`close-child-hand-railing-kr` · `close-ball-under-arm-n`.

## 7 · Openings and closings

| Key | What |
|---|---|
| `open-archive-drawer-kr` (clip) | A long archive drawer slides open: tickets, programmes and a signal-red scarf inside, camera dives in. |
| `open-projector-n` (clip) | An old film projector starts; its beam lights dust in a dark room; ends on a bright square of light. |
| `open-stadium-dawn-kr` (clip) | A city wakes, a stadium's floodlights switch on one by one. |
| `close-lights-out-kr` (clip) | The last floodlight goes out over a terrace; one signal-red scarf remains on the rail. |
| `close-phone-glow-kr` (still) | A supporter from behind on the night bus home, the glow of a phone in his hands (screen blank). |
| `close-badge-plate-n` (still) | A blank round paper plate on a cream background, lit from the side (the studio prints the FanLife badge on it). |

## 8 · Thumbnails and Shorts

- **Thumbnail bases** (1280×720, kind A): a hero figure or object on the left two-thirds, **the right third empty
  paper** for the studio's big words. `thumb-hero-penalty-kr` · `thumb-hero-trophy-kr` · `thumb-hero-despair-kr` ·
  `thumb-hero-terrace-kr` · `thumb-hero-derby-kr` · `thumb-hero-europe-kr`.
- **Shorts** (vertical 1080×1920): the eight most used scenes of doc 55 §4 again in 9:16 — `terrace-full-kr`,
  `street-matchday-crowd-kr`, `ball-in-net-kr`, `shootout-line-kr`, `trophy-lift-crowd-kr`, `scarf-on-railing-kr`,
  `father-son-walk-kr`, `stadium-lights-off-n` — named with `-v` (e.g. `terrace-full-v-kr`).

## 9 · Delivery

Same as doc 55 §9. Layers of one scene: same name with `-bg` / `-mid` / `-fg` before the kind (e.g.
`layer-terrace-night-mid-kr.png`). Figures and strips: PNG with a real transparent background (no checkerboard painted
in). One ZIP per section is easiest to check.
