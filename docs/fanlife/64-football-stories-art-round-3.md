# FanLife: Football Stories — art round 3: pieces that MOVE (4.11.2026)

For the owner. Rounds 1–2 (docs 55, 56) filled the library with scenes, figures, crowd rows, close-ups and paper
transitions — 175 stills, 80 cut-outs, 13 clips are in. What the films still lack is **motion**: the camera can only
drift over flat pictures, and people can only slide across them. This round orders the pieces that let the studio
**animate for real** — depth layers, paper puppets with moving joints, overlay plates (smoke, rain, light), era props,
and the CLASSIFIED dossier kit.

Order of value (do them in this order): **§1 puppets · §2 depth layers · §3 overlays · §4 CLASSIFIED kit · §5 era props ·
§6 clips · §7 thumbnails**. §8 says how to name a folder for ONE story so the studio finds it by itself.

---

## 0 · Rules for every prompt

**Documentary style block** (Football Stories films — paste first):
```
Handmade paper-cut collage diorama, layered cut paper with visible torn and cut edges, soft real shadows between
layers, halftone dot texture and newsprint scraps on some surfaces, matte cream paper and deep ink black as the main
inks, mid-century sports-poster composition, cinematic framing, gentle depth of field. Figures are fictional, seen from
behind, in silhouette or too small to recognise. No text, no letters, no numbers, no logos, no club crests, no brand
marks, no sponsor names, no flags of real countries.
```

**CLASSIFIED style block** (CLASSIFIED panels — paste first, attach S01 as the style reference):
```
Prestige graphic-novel panel at feature-animation quality. Bold confident ink linework with varied line weight,
hand-printed halftone dot shading and a slight print misregistration, on warm cream newsprint. Limited process-ink
palette — ink black, vermilion red, process cyan, deep navy, cream paper — with ONE accent colour per panel. Cinematic
film-camera composition, dramatic light, rich texture. No text, letters, numbers, logos or watermarks. No blood.
```

**Colours** (doc 55 §2): `-kr` = ink + cream + greys + ONE signal red (the studio repaints the red per club) ·
`-n` = no colour at all. Never write a hex code in a prompt.

**Transparent pieces:** ask for *"isolated on a transparent background (real alpha, PNG)"*. If the tool cannot, ask for
*"isolated on a flat pure white background, nothing touching the edges"* and name the file `…-white.png` — the studio
cuts it out.

**Sizes:** scenes 16:9 at the largest size offered · puppets and props 2048 px on the long side · overlays 16:9.

**Your own story folders** (§8) are the exception to "no faces": there, press photos with real faces are used as they are.

---

## 1 · Paper puppets — the biggest upgrade (figures that really move)

Today a figure is ONE flat cut-out, so it can only slide. A **puppet** is the same figure cut into parts, like a
stop-motion paper doll: the studio pins the parts at the joints and animates them — a striker's leg swings into the
shot, a keeper's arms stretch, a supporter's arm lifts the scarf, a head turns. Each puppet is **one sheet with every
part laid out separately**, not overlapping, each part with a little extra paper at the joint (so a rotating limb never
shows a gap).

**Prompt (fill in the figure line):**
```
[Documentary style block]
A paper-doll PUPPET SHEET on a flat pure white background: one fictional [FIGURE], seen [VIEW], cut into separate
paper pieces laid out flat and apart from each other in a neat grid, nothing overlapping: head, torso, upper arm left,
forearm with hand left, upper arm right, forearm with hand right, thigh left, shin with boot left, thigh right, shin with
boot right [+ EXTRA]. Every piece has a rounded overlap tab at its joint end. Same scale for all pieces, consistent
lighting from the top left, soft paper shadow under each piece. No face details visible. 3:2 landscape.
```

| File | FIGURE | VIEW | EXTRA |
|---|---|---|---|
| `pup-striker-kr` | striker in a plain signal-red shirt, white shorts, dark socks | from behind, slightly to the side | the ball as a separate circle |
| `pup-keeper-n` | goalkeeper in a plain grey long-sleeved jersey and gloves | from the side, facing right | gloves as separate pieces |
| `pup-defender-n` | defender in a plain grey kit | from the side, facing left | — |
| `pup-supporter-kr` | adult supporter in a dark coat with a signal-red scarf | from behind | the scarf as two separate pieces (neck loop, hanging ends) |
| `pup-supporter-child-kr` | child supporter, about eight, in a signal-red shirt | from behind | a small flag on a stick |
| `pup-old-man-kr` | old supporter in a flat cap and long coat, signal-red scarf | from behind | the cap as a separate piece |
| `pup-referee-n` | referee in plain black | from the side, facing right | the whistle arm bent; a blank card as a piece |
| `pup-manager-n` | manager in a long dark coat | three-quarter from behind | — |
| `pup-captain-kr` | captain in a signal-red shirt with a plain armband | from behind | a plain silver cup as a piece |

Then **one matching full pose** of each for checking: same prompt but *"assembled, standing, on a transparent
background"* → `pup-striker-pose-kr.png` etc.

---

## 2 · Depth layers — scenes the camera can travel into

Still the round-2 §1 list (none arrived yet), now with a simpler recipe: **make the full scene once, then make the
same scene again twice**, each time "only" one layer. The studio stacks them and moves each at its own speed.

```
[Documentary style block] [SCENE]. Wide 16:9.
```
then, with the first result attached as reference:
```
Exactly the same scene, same camera, same light — FOREGROUND LAYER ONLY: [FG], isolated on a transparent
background, everything else removed.
```
```
Exactly the same scene, same camera, same light — BACKGROUND ONLY: [BG], with the foreground and middle removed and the
empty space filled with what would be behind them.
```

| Files (`-full`, `-fg`, `-bg`) | SCENE | FG | BG |
|---|---|---|---|
| `layer-terrace-night-kr` | a floodlit home end at night, supporters with raised signal-red scarves, the pitch below | supporters' heads and raised scarves along the bottom third | sky, floodlight pylons, far stand |
| `layer-street-march-kr` | supporters walking down a narrow street towards a stadium at dusk | a lamp post and the shoulders of two supporters close to camera | rooftops, sky, floodlights glowing over the roofs |
| `layer-away-end-kr` | a small away end behind a high fence in a huge foreign bowl | the fence and a small group in signal-red scarves | the far stands and the roof |
| `layer-tunnel-n` | the players' tunnel looking out at a bright pitch | the gate bars and a player's silhouette | the bright pitch and the stand opposite |
| `layer-rain-stand-kr` | a rainy afternoon on an old terrace | umbrellas and wet scarves | grey sky and the pitch in rain |
| `layer-europe-night-kr` | a big European night, the bowl full | the backs of away supporters behind a net | the bowl roof and night sky |
| `layer-old-ground-kr` | a 1930s wooden ground on match day | flat caps and rosettes | chimneys, sky, the wooden stand |
| `layer-dressing-room-n` | an empty old dressing room, shirts on pegs | the bench and a bag | the pegs, the wall, a high window |
| `layer-kitchen-radio-kr` | a small family kitchen on match day, a radio on the table | the radio and a cup | the window, the street outside |
| `layer-bar-tv-kr` | a crowded bar watching the match on an old TV | the backs of heads and raised glasses | the TV glow (screen blank) and the bar |

---

## 3 · Overlay plates — life on top of every picture

Painted effects the studio lays OVER a scene (blended, moving): smoke drifts, rain falls, light flares. Each one
**on a pure black background** (the studio uses black as transparent), **no objects, no people, no ground**.

```
[Documentary style block — but replace the first line with: "Hand-painted and cut-paper visual effect element"]
[EFFECT], isolated on a pure black background, nothing else in the frame. Wide 16:9.
```

| File | EFFECT |
|---|---|
| `fx-smoke-drift-n` | soft grey-white smoke drifting in wisps across the frame, thicker at the bottom |
| `fx-smoke-red-kr` | signal-red flare smoke rising in a column, dense at the base, wisps at the top (no flare, no fire visible) |
| `fx-rain-streaks-n` | diagonal cut-paper rain streaks of different lengths, scattered over the whole frame |
| `fx-snow-flakes-n` | torn white paper snowflakes of different sizes, scattered |
| `fx-floodlight-rays-n` | four beams of cold white floodlight from the top corners, soft edges, dust in the beams |
| `fx-lens-flare-n` | a warm round lens flare with a soft streak, centred |
| `fx-confetti-kr` | cut paper confetti and ticker tape, signal red and cream, scattered, some curled |
| `fx-embers-kr` | small glowing signal-red embers and sparks rising |
| `fx-paper-dust-n` | fine floating paper dust and fibres catching light |
| `fx-film-burn-n` | an orange-white film burn spreading from one edge |
| `fx-halftone-burst-n` | a radial burst of halftone dots exploding from the centre |
| `fx-speed-lines-n` | comic speed lines converging on the centre |
| `fx-breath-steam-n` | small clouds of breath steam in cold air, five or six, at head height |

Also two **textures** (full frame, not on black): `tex-newsprint-n` (an old newsprint page, all text blurred into grey
lines, no letters readable) · `tex-cream-card-n` (plain cream card with fibres, soft vignette).

---

## 4 · CLASSIFIED — the dossier kit and the five missing FILE 01 panels

**Dossier pieces** (CLASSIFIED style block, on a transparent background — the studio prints every word):
`cl-folder-closed` (a buff case-file folder, plain cover, string tie) · `cl-folder-open` (same folder open, empty
pages) · `cl-stamp-block` (a wooden rubber stamp, its face blank) · `cl-ink-splat` (a vermilion stamp-ink splat,
empty in the middle) · `cl-redaction-bar` (a thick black marker bar, slightly uneven) · `cl-evidence-bag` (an empty
clear plastic evidence bag with a blank tag) · `cl-paperclip` · `cl-pushpin-red` · `cl-red-string` (a length of red
string, gently curved) · `cl-polaroid-blank` (an empty instant-photo frame) · `cl-typewriter-strip` (a typed paper strip,
the letters blurred so nothing reads) · `cl-magnifier` · `cl-coffee-ring` (a coffee ring stain) · `cl-cork-board`
(an empty cork board, full frame, not transparent).

**FILE 01 panels still missing** (from the art brief, doc 60, exact prompts there): `f01-p03-camp.png` (the training
camp near Jerez) · `f01-p06-final-bench.png` (the young keeper rising from the bench in a final) ·
`f01-p09-foot-catch.png` (version B: the foot reaches to stop the bottle) · `f01-p11-shards.png` (after: glass on the
tiles, a bare foot, no blood) · `f01-p18-pile-on.png` (the team piling on the young keeper). Upload into the
`CLASSIFIED` folder with these exact names.

---

## 5 · Era props — "where were you when…"

Objects of each decade, **on a transparent background, the screen or page blank** (the studio prints the picture,
headline or score into it). `-n`, documentary style block:

| File | Object |
|---|---|
| `era-tv-1970s-n` · `era-tv-1980s-n` · `era-tv-1990s-n` · `era-tv-2000s-n` | a home television of that decade, front view, screen blank and lit |
| `era-radio-1950s-n` · `era-radio-1980s-n` | a radio of that decade on a table |
| `era-scoreboard-1970s-n` · `era-scoreboard-1990s-n` · `era-scoreboard-2010s-n` | a stadium scoreboard of that decade, panels blank |
| `era-newspaper-front-n` | a folded newspaper front page, masthead area and headline area blank, columns blurred |
| `era-ticket-stub-n` | an old paper match ticket, all fields blank, perforated edge |
| `era-programme-n` | a match programme cover, the cover blank cream |
| `era-phone-2000s-n` · `era-phone-2020s-n` | a mobile phone of that decade, screen blank and lit |
| `era-transistor-ear-n` | a hand holding a small transistor radio to an ear (no face), close-up |

---

## 6 · Clips (only if your tool makes video — Veo, Kling, Sora; 5–8 s, last second still)

Add *"Stop-motion animation of paper layers, gentle 12 frames-a-second paper movement"* after the style block. Still
open from round 2 §5: `clip-goal-net-ripple-kr` · `clip-keeper-save-kr` · `clip-penalty-runup-kr` ·
`clip-shootout-walk-kr` · `clip-late-goal-surge-kr` · `clip-final-whistle-kr` · `clip-trophy-lift-kr` ·
`clip-empty-after-n` · `clip-radio-kitchen-kr` · `clip-ticket-stub-tear-n`. New: `clip-flag-ripple-kr` (a big plain
signal-red flag ripples across the frame, full screen) · `clip-tifo-rise-kr` (a giant plain banner rises up a terrace) ·
`clip-floodlights-off-n` (the last floodlight goes out).

---

## 7 · Thumbnails (1280×720)

A hero on the left two thirds, **the right third empty paper** for the studio's words:
`thumb-hero-penalty-kr` · `thumb-hero-trophy-kr` · `thumb-hero-despair-kr` · `thumb-hero-derby-kr` ·
`thumb-hero-europe-kr` · `thumb-classified-laugh` · `thumb-classified-war` · `thumb-classified-heart` (CLASSIFIED style:
the case folder on the desk, lit, one object on it — a bottle / a smoke grenade shape / a scarf).

---

## 8 · A folder for ONE story — so the studio finds it by itself

Every film now scans the Drive and takes the folders whose **names** fit the story first, before the general library.
Name a story folder with the club, the opponent, the year and one or two story words:

`Hapoel_Tel_Aviv_Maccabi_2003_Fouad_Derby_Pack` · `Maksimir_1990_Dinamo_Red_Star_Documentary_Pack` ·
`AEK_Athens_Real_Madrid_2002_Pack`

Inside (optional but best): `01_Scenes` (your pictures for the film) · `02_Editing_Assets` (cut-outs on transparent
background) · `03_Source_References` (the original press photos — used as they are, faces included) · `README.md`
(two lines: what the pack is, anything the writer must know). Or paste the folder link in the studio's
"Drive folder for this story" field — that folder always comes first.

## 9 · Delivery

Into the Drive library folder `02_סטודיו_דוקומנטרי_ונכסים/Art_Round_3/` with the file names above (one sub-folder per
section is easiest: `01_Puppets`, `02_Layers`, `03_Overlays`, `04_Classified`, `05_Era`, `06_Clips`, `07_Thumbnails`).
Write "עלה" and the studio ingests, checks and wires them.
