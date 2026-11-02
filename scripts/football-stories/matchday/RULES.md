# I WAS THERE — editing rules for the matchday series (2.11.2026)

A FAN LIFE matchday diary built from the owner's own footage of matches he attended. Published as FAN LIFE, never
as a person, as a series (its own playlist) on the studio's channel, FanLife: Football Stories (owner, 2.11.2026). This file **inherits** the Football Stories studio (PR #353): `engine/MASTER_PROMPT.md` (sourcing, the
real-person face rule, rights ledger, captions, QA honesty) and `studio/` (voice, mix to −14 LUFS / −1.5 dBTP,
captions, packaging, QA). Where this file is stricter, it wins. Studio code is owned by the studio track: anything
this series needs from it is asked for there, never edited from here (rule 120).

## 1 · Two products from one matchday, never one design scaled

| | Film (YouTube) | Reel (Instagram · TikTok · Shorts) |
|---|---|---|
| frame | 1920×1080, 30 fps | 1080×1920, 30 fps |
| length | 3:00–5:00 | 15–45 s (one moment each) |
| per matchday | 1 | 3–5, cut from the film's edit list |
| captions | SRT/VTT, not burnt | burnt in, 3–4 words, spoken word on the club colour |
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

- A crowd at distance is a crowd. A face that a viewer could recognise (close, sharp, frontal) is treated: the
  series' **paper-cut patch** (halftone ink over the face, the Weekly look) — not a soft blur.
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

## 9 · QA before a film reaches the desk

Duration in range · loudness −14 ±1 LUFS, TP ≤ −1.5 · no ID tag in the master · face frames treated (sampled) ·
every number on screen traced to the archive row · captions match the voice · tall frames: nothing inside the
platform bands · thumbnail readable at 320 px wide. A failed check blocks the film; it is never reported as ready.
