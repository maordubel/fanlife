# Artwork provenance — v2

The fictional empty-stadium photo `stadium-original.png` was originally generated for the user’s v1 social kit on 25 October 2026 using the built-in image generator. It is reused as a replaceable photo slot; the Weekly renderer prints it in controlled inks.

Comic line plates (kicker, keeper, dribbler, bootball, memo, swap, scarf and fans) are existing Fan Life project assets from `public/brand/weekly/plates/`. They are original comic artwork, not photographs of named players. The copied identity files come from that project’s `club-packs/`.

The phone, ticket, price roundel, speed lines, split-flap tiles, stadium clock, speech bubble, highlight icons, seal/ball and sample-shirt silhouette are vector drawings in this kit. `sample-shirt.png` is an unbranded demonstration fixture, not a historical club shirt.

Primary font sources are the official Google Fonts families Shrikhand, Knewave, Archivo, Ultra and Fira Sans Extra Condensed. The six primary face outlines and Greek/weight fallback roles are bundled. Font license files are included in `assets/fonts/`; the Ultra source subset is retained from the existing Fan Life font assets.

## Art round 2 — 27.10.2026

61 files supplied by the owner (`FANLIFE_ART_ROUND2_COMPLETE_2026-10-27.zip`), made with an image-generation tool to
`docs/fanlife/52-social-art-prompts.md`: 15 gate plates, 6 moments, 3 carousel covers (each a `-line` + `-tone` pair),
10 stickers and 3 textures. Original drawings — no real player, face, crest or logo. On the way in each file was
resized for its slot (gates 1200 px, moments 1600 px, covers 1080 px, stickers 512 px; textures untouched) and stored
as grey + alpha with ONE colour per file (line #000000, tone #808080). `tests/marketing/art.test.ts` holds both.
Wired: gate plates on L-GATE (by the gate's printed name), covers on the first carousel slide, moments in the T1 window
and on the FAN LIFE safety-net card. Stickers and textures are in the kit and not drawn yet.
