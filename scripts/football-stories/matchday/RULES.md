# I WAS THERE — editing rules for the matchday series (2.11.2026)

A FAN LIFE matchday diary built from the owner's own footage of matches he attended. Published as FAN LIFE, never
as a person, as a series (its own playlist) on the studio's channel, FanLife: Football Stories (owner, 2.11.2026). This file **inherits** the Football Stories studio (PR #353): `engine/MASTER_PROMPT.md` (sourcing, the
real-person face rule, rights ledger, captions, QA honesty) and `studio/` (voice, mix to −14 LUFS / −1.5 dBTP,
captions, packaging, QA). Where this file is stricter, it wins. Studio code is owned by the studio track: anything
this series needs from it is asked for there, never edited from here (rule 120).

## 1 · Two products from one matchday, never one design scaled

| | Film (YouTube) | Reel (Instagram · TikTok · Shorts) |
|---|---|---|
| frame | 1920×1080, 25 fps (the studio engine) | 1080×1920, 30 fps |
| length | 3:00–5:00 | 15–45 s (one moment each) |
| per matchday | 1 | 3–5, cut from the film's edit list |
| captions | burnt in, the studio plate (`studio/captions.py`), word-timed by Whisper on the voice; SRT too | burnt in, 3 words, the same plate stood up |
| templates | `templates.py` → `wide-*` | `templates.py` → `tall-*` (keep `TALL_SAFE` clear) |
| master | H.264 High, CRF 18, AAC 320k / 48 kHz | same, ≤ 50 MB so it travels by Telegram |

## 2 · The film's shape — a matchday is the story

`cold open` (≤ 8 s, the loudest TRUE moment + the question) → `ticket` (title, 4 s) → **01 The walk in** (city,
gate, ticket) → **02 The terrace** (before kick-off, the songs) → **03 The match** (the game as the archive records
it) → **04 The moment** (the goal / the turn) → **05 Full time** (result card, the walk home) → `end card` (20 s,
YouTube end-screen slots). Something changes every 20–30 s: a place, a sound, a stake, a card. A chapter with no
footage for it is dropped, not filled.

## 3 · The crowd is the soundtrack

- Original stadium sound is the score. Clean it (high-pass 80 Hz, de-wind, de-clip), duck it 8 dB under the voice,
  and **never** under a goal, a chant's peak or the final whistle.
- Narration covers at most 60% of the runtime. Silence of the narrator is a tool.
- Stadium PA music, a phone playing a song, anything copyrighted → muted or cut (Content ID).
- Added score only from the studio's synthesised score (`studio/audio.py`); never a library track without a licence row.
- **Narration is free** (owner, 2.11.2026): a self-hosted open model with a licence that allows a monetised channel
  (Kokoro — Apache-2.0, Chatterbox — MIT), never a paid API. `voice_audition.py` reads the same lines with each
  candidate; the owner picks by ear and the pick is written here.
  **The narrator is Kokoro `bm_lewis` (British male), speed 0.94** — take B, owner, 2.11.2026. Fixed in `series.json`;
  every film of the series uses it, so the channel has one voice. XTTS-v2 (non-commercial) and F5-TTS (CC-BY-NC) are out.

## 4 · Anonymity — the owner is never in the film

- No face, voice, name, nickname, reflection, hand with a known tattoo/ring, or season card / ticket that carries a
  name, barcode or seat.
- Speech in a clip (the owner, friends) is transcribed and muted; names said aloud are cut.
- **All metadata stripped** (`-map_metadata -1`, no GPS, no device) from every published file. `survey.py` reports
  what each source carries so the strip can be checked; QA re-probes the master and fails on any ID tag.
- The narrator is "we" — the supporters. Never "I", never a first name.

## 5 · Other people's faces (MASTER_PROMPT §5 applied to real footage)

- **Owner, 3.11.2026:** *"אנשים ופרצופים אחרים ניתן להראות."* Adults in the crowd are shown as filmed — the
  owner's privacy is about the owner alone (§4). What stays out: children close and recognisable (treated with the
  series' **paper-cut patch**, halftone ink — not a soft blur), and anything below that could incriminate a fan.
- Children: always treated. Players from the stand: no zoom-in close-ups.
- Pyro and smoke are shown as the terrace's atmosphere only where no person in the frame can be recognised (a stand
  under smoke, from across the ground). Fights, anything that could incriminate an identifiable fan, and hate chants
  or banners: not published.
- Owner footage is iPhone HDR (HLG, BT.2020) in 4K: the edit tone-maps it to SDR BT.709 once, at ingest, before the
  house grade — never leave HDR flags on a master the platforms will re-map differently.

## 6 · Facts

- Date, ground, competition, score, scorers, minutes come **only** from the archive row (`core.fixtures` / club
  pack), with its source on the full-time card and in the description. No row → no score on screen (rule 11).
- The matchday is found by the camera's own date (`survey.py → matchday`) + the ground, then confirmed by the owner.
- Narration never claims what the footage does not show or the archive does not hold.
- **Whose display is it?** Pyro, smoke, a banner: the film says which stand, and only what the frame shows (the
  banner on the curve, the end it sits on). It never invents an exchange between ends. Episode 1 said "one end turns
  red, the other answers in blue" — both were Željezničar's own home end (owner, 2.11.2026); the edit now says so, and
  the camera's clock (20:54 · 21:47) is printed on the clip as proof of when.

## 6a · The film is cut on the studio engine

`film.py` builds every shot with PR #353's own parts: `motion.Shot`/`ShotRenderer` (camera push on a 1.12× canvas,
grain, the black/fade/accent-wipe entries), `paper.ClipWorld` (the footage as a moving world), `SpriteFactory`
(title, chapter + date stamp, ticket, score + scorer chips, labels, turning plates, CTA tiles, URL banner),
`maps.render` (where the two clubs are), `captions.Captions` (burnt word-by-word plates) and `audio` (score, paper /
stamp / whoosh / pop / end cues, the real crowd recordings). A beat lasts lead + voice + tail, so picture, voice and
captions cannot drift. The episode file is the edit: `film.beats`, one shot each. The camera's own clock goes on
every clip as an ink chip — the diary of the night. Footage is never held on a frozen last frame: a beat longer than
its clip slows the clip (to 0.55× at most) instead.

## 7 · Picture

- House grade on owner footage: contrast +8%, saturation −12%, brightness −18% under cards, a printed-dot texture
  at ~35% multiply, a 14 px ink frame. No LUT that changes a club's colour.
- Stabilise handheld walking shots; keep terrace shake in moments of joy (it is the feeling).
- A vertical clip in the wide film sits in a **taped paper frame** on newsprint; a wide clip in a reel sits between
  newsprint bands with the headline — never a blurred copy of itself behind it.
- **All colours are approved** (owner, 2.11.2026): the series is a hub product, so no rival-colour ban applies to
  its graphics or its footage, and the studio's rival-colour frame check does not block a matchday film. Footage is
  never recoloured.

## 8 · Signature and identity

The **match ticket** opens every film, holds the score (split-flap tiles), and the end card asks the viewer to stamp
their own: *Were you there? Stamp your ticket on FAN LIFE* → the match's archive page / `/today`. Faces by job
(rule 124): Shrikhand for the series mark, Weekly Head for names and chapters, Ultra for numbers, Knewave for the
fixed shout (GOAL!) only. The FAN LIFE badge, never the word set in type.

## 8a · Every video asks the viewer to join — in the terrace's voice (owner, 2.11.2026)

The ask is football, never YouTube-speak: no "smash the like button", no "don't forget to". It says who we are —
fans, the stand, real nights — and it is the same ask on every video, so the channel has one voice.

- **The stub (film):** once per film, a season-ticket stub with a SUBSCRIBE button slides into the free side of the
  frame, a cursor taps it, it flips to ✓ SUBSCRIBED with a stamp, and leaves (≈4 s, `subscribe.py`). It sits on the
  first silent clip after the first chapter (or a beat marked `"subscribe": true`) — never over a goal, a chant's peak,
  a card or the narrator. One line under the button, from `series.json → subscribe.stub`.
- **The end (film):** the narrator's last sentence is the spoken ask (`end_voice`), the end card's line repeats it
  (`end_line`).
- **The end (reel):** the last line spoken and printed is the follow (`reel_voice`, `reel_line`) — "follow", because
  the same file goes to Instagram and TikTok.
- **The words rotate** by episode number through the pools in `series.json`, so no two neighbouring films say the
  same sentence. New lines go into the pools, never into a single episode.
- **Channel-wide:** the FAN LIFE badge is the YouTube video watermark for the entire video (a clickable subscribe
  button on desktop) — set in Studio → Customization → Branding, 2.11.2026.
- **Art:** `ART-BRIEF-SUBSCRIBE.md` lists the assets that lift the ask (the scarf, the stamp, the end-screen ground,
  the banner). Each one is optional: when its file is in `public/brand/fanlife/iwt/` the edit uses it; until then
  nothing is drawn in its place.

## 8b · The documentary layer (3.11.2026, ep 2)

The owner asked for *The Last Dance*, not a vlog: `matchday/doc.py` is the layer, and every episode may use it.
- **Typed lines** (Courier Prime, a key click per letter, a blinking cursor): the place and the camera's own clock on
  footage (`doc`), a date or a slate on black (`typed`). Over a picture the words sit on an ink band (`panel`).
- **Counted numbers** (`stat`): the figure counts up, lands with a boom, its source printed under it. Every one is
  an archive row or a cited page.
- **A timeline** (`timeline`) draws the season as points; the last one is the night.
- **Props** (`prop`): the owner's art pack (`matchday/art`, `iwt-art:`), lettered with the night's facts — never a
  real ticket, which would carry a seat and a barcode (§4).
- **Look**: scope bars ease in on footage, a vignette everywhere, `flashback` (sepia, flicker) for what is told
  rather than filmed. A half the camera did not film is told on cards, never with someone else's footage.
- **Voice**: pauses are written into the text (`…` 0.85 s, `—` 0.5 s); a beat may slow the reader (`speed_voice`).
- **Music**: one track from `studio/kit/music` (owner-supplied), normalised and shaped per beat, ducked under the
  voice, faded at the end.

## 8c · Uploading (3.11.2026)

- **Studio opens on the owner's personal channel by default.** Always open
  `https://studio.youtube.com/channel/UC2KULoLBFCSZC4jeRGYkKfQ` and check the channel name reads
  *FanLife: Football Stories* before the upload button is pressed. Ep 2 was first uploaded to the personal channel
  by mistake (left private, its playlist set private) — that is what this line prevents.
- Subtitles: Languages → Upload manual → With timing → the `.en.srt` from the `matchday-render` branch, then
  Edit subtitles → Publish. The end screen: subscribe on the round hole, the I WAS THERE playlist on the frame.
- Footage a friend sent (WhatsApp, no camera metadata) is usable — owner, 3.11.2026.

## 9 · QA before a film reaches the desk

Duration in range · loudness −14 ±1 LUFS, TP ≤ −1.5 · no ID tag in the master · face frames treated (sampled) ·
every number on screen traced to the archive row · captions match the voice · tall frames: nothing inside the
platform bands · thumbnail readable at 320 px wide. A failed check blocks the film; it is never reported as ready.

## 8d · What the camera did not film is drawn, never invented (3.11.2026, ep 4)

The owner asked for visuals of the goal, the stand and the celebration "as close to the source as possible".
`matchday/plays.py` is the layer:
- **Goal plates** (`play`): a broadcast-style tactics view, our side in the club's colour, theirs in white, the
  ball's path traced. Every movement is a sentence in a cited report; RECONSTRUCTION and the source are printed on
  the plate. A goal nobody described gets no plate — only its minute and the board (ep 4: Fernandes 86′).
- **The ground's scoreboard** (`board`), re-drawn from the owner's own clip of it, filling up goal by goal.
- **Red card** (`red`), **phone lights** (`lights`) — each only when a report names it.
- **The studio kit in the club's colour**: `beat:` / `cut:` / `kitclip:` / `kitprop:` keys; anything drawn in the
  signal red (`-kr`) is recoloured to the episode's accent (`doc.art_image`, `doc.kit_clip`).
- **The owner's footage is the spine; plates fill what it missed.** Ep 4: the camera's clock on each clip is matched to
  the match minute through the ground's own board in a still (IMG_2832, 21:25 → 1–0 at 21:54), so a clip is called a
  goal's only when the clock says so. A clip is never held frozen and never replayed backwards.
- **Survey the whole folder** — stills too (`survey.py → photos`, HEIC through pillow-heif) — before writing a beat.
  A photo is a beat (`'kind': 'art', 'photo': <file>`, optional `crop`). Text typed onto a clip, a number plate:
  `'blur': [[x, y, w, h]]`. Selfies of the owner, his hands, tattoos: left out.
- A single Drive FILE link works wherever a folder link does (`drive_fetch.py`).

## 10 · The automatic episode (4.11.2026)

Owner: *"add VLOG production to the studio, by the settings and design of I WAS THERE, pulling the material straight
from the Drive."* `vlog_auto.py` writes an episode file the way the four hand-made ones were written, and the studio
worker can call it: `make_episode(footage_dir, match, club, notes, minutes, work_dir, log)` → `episode.json`, then
`render(episode, footage_dir, out_dir, log)` → film.py's film and reel. Map: `docs/fanlife/63-vlog-auto.md`.
- **Measured, then written.** survey.py + the scout run over the folder; the writer (Gemini, free, the studio's model
  walk) sees the material table, the strips and the stills as pictures, the match's research claims and this file's
  rules, and one hand-made episode as the gold standard.
- **The record and the camera are filled in, never written:** the fixture (sides, date, score, scorers only when a
  claim names every goal), the sources, the accent, the look, the camera clock on every clip, and the mute on any clip
  in which Whisper heard a voice (§4).
- **The fact guard is the studio's:** a number in a beat must be in a claim the beat cites (`"claims"`), or the hour
  and minute of that beat's own clip or still; an HH:MM must be on the camera's clock or in a cited claim. The owner's
  free notes are one claim (`owner`) — he was in the stand.
- **What stays hand-made:** goal reconstructions, the ground's board, red cards, phone lights, maps and timelines —
  each needs a report or coordinates the claims do not carry.
- A failed check goes back to the writer with the exact problems, four rounds at most; then the job stops with them.
- **Owner, 4.11.2026:** in his targeted folders, press photos with real faces are used as they are — never blurred,
  never rejected. Voices and names said aloud in clips stay as in §4.
