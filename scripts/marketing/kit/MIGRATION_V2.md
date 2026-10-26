# FAN LIFE Social Kit v2 — compatibility and handoff

26 October 2026 · FAN LIFE / The Weekly

## Stable renderer contract

```js
import {design} from './source/design.mjs';
const editable = design(templateKey, appKey, postData, false);
const print = design(templateKey, appKey, postData, true);
// Both return {svg, width, height, bounds, transparent, audit}.
```

The first five returned fields and the call signature are unchanged. `audit` is additive. T1–T8, caption keys and profile keys retain their names. Every one of the 55 v1 file IDs is present in `manifest.json`. `source/design.mjs` remains the public entry point; shared drawing and policy functions now live alongside it in `source/weekly.mjs`, `source/templates.mjs` and `source/policy.mjs`.

| Existing key | Existing data retained |
|---|---|
| T1 | `hook[]`, `body`, `photo`, `accent` |
| T2 | `feature[]`, `body[]`, `screenshot`, `noPlaceholders` |
| T3 | `masthead`, `line`, `crests[8]`, `ringColours[8]` |
| T4 | `shirt`, `season`, `maker`, `sponsor` |
| T5-A | `home`, `away`, `time`, `competition`, `homeCrest`, `awayCrest`; arrays accepted and joined to one printed line |
| T5-B | `hook[]`; optional new `options[4]`; when missing no answer row is drawn |
| T5-C / D | `hook[]` |
| T6 / T6-BUBBLE | `hook`, `bubble`, `left`, `right`, `illustration` |
| T7-1…T7-5 | Existing five slide keys and `config/content.json → T7` structure |
| T8 and caption keys | `frame`, `hook[]`, `lowerThird[]`, `centreWord` |

The app keys `fanlife`, `worker`, `dubid`, `offsides`, `fuckyou`, `dubel` remain accepted. `dubel` is now a legacy publisher alias for FAN LIFE. Its old green files are still exported under their old IDs, but carry the new publisher styling. The old colour filename is an alias, not a request to print an obsolete colour.

## New daily keys

| Key | Slot | Input |
|---|---|---|
| `T9-OTD` | 08:00 | `date`, `rows[2..5]` of `{year, club, line, ago}`, `exact` |
| `T10-NERDS` | 16:00 | `club`, `question`, `options[4]`, `level` |
| `T11-SPICY` | 20:00 | `club`, `home`, `away`, `score`, `date`, `line`, optional `shirt`, `sponsor` |
| `T12-PARTNER` | 12:00, optional | `app`, `feature[]`, `body[]` |

No new required field was added to an existing key. `club` is accepted anywhere in the input tree for policy discovery; it does not have to exist in v1 calls. A top-level `club` identifies the main club even when supplied asset objects refer to an opponent.

`T5-A` remains available for compatibility; it is not included as a new daily marketing slot. Match schedules still belong to Today's Football. T5-B is the daily 18:00 quiz/poll layout. These times document the plan; the kit does not create or change any scheduler.

For `T9-OTD` with `exact:false`, put the verified original calendar date into each row's existing `ago` field, e.g. `22 OCT 1988`. The renderer changes the heading to THIS WEEK IN HISTORY and prints the supplied date. It never fabricates a day or month from the year. The field name stays stable.

## Policy handling

The packaged `club-packs/<club>/identity.json` files were copied from the Fan Life source repository at commit `934d7a14bbbadd537635bb78d042fe12cc764689`. Refresh these files from the approved project identities when integrating the kit. The renderer reads `colorPolicy.rivalIdentityColors` and the Hapoel legacy yellow rule. Rival families are removed before printing, including the colours used to print supplied images:

- Olympiacos: green → navy.
- Hapoel Tel Aviv: yellow → orange.
- Panathinaikos: red → club green `#0B7A3B`.

Unconfigured club identities are reported in `audit.policy.missing` and use neutral inks. A multi-club history post uses only ink, newsprint/light paper, cyan and navy. T3's multi-club sticker rings are the explicit exception; a single-club T3 still obeys that club's policy. Supplied photos, shirts and crests on locked posts are rendered in controlled inks, so their source pixels cannot reintroduce a banned colour.

### Two explicit conflict resolutions

1. The brief asks for a red date roundel in T9 but also gives a hard neutral-only rule for multi-club history. The hard rule wins: T9 uses cyan for the date roundel.
2. A large app-coloured panel/burst and a separate app-coloured price roundel would create two app-accent areas. Those templates keep the price roundel in ink/paper and give the single app-colour area to the main panel/burst. When the roundel is the accent area, other components remain neutral. Yellow DYK/QUIZ boxes are separately rationed to at most one area.

FUCK YOU uses ink/newsprint only. Yellow is not used for type or a full-page background. T2 uses a comic plate whenever no screenshot is supplied; `noPlaceholders` remains accepted without exposing a screenshot placeholder.

## Font roles and missing glyphs

The six faces are in `assets/type-paths.json`: Shrikhand, Knewave, Weekly Head, Weekly Body, Weekly Caps and Ultra. Body 600 is a separate weight record; Greek Head/Body/Caps are Fira Sans Extra Condensed fallbacks. Head is Archivo Italic 900 at wdth 80; Caps is Archivo 800 at wdth 75. Head/body/caps fonts include Latin extension characters and the supplied Greek fallback. Knewave is used only for fixed shouts, never names or match data.

The shared glyph resolver falls back by role when a display face lacks a character. All six roles resolve `č ć đ š ž ő ű ł ș ț ğ ı`, curly quotes, dashes, ellipsis, multiplication sign and arrow. A vector arrow is bundled for faces without one. Unknown unsupported characters raise an explicit error before export; they are never dropped silently. SVG masters include font-specific text runs; PNGs use the same glyph outlines and require no local font install.

## Profile filename aliases

The six highlight file IDs remain compatible while their public labels follow the new plan:

| v1 file ID | v2 label |
|---|---|
| PROFILE-highlight-fanlife | FAN LIFE |
| PROFILE-highlight-worker | ON THIS DAY |
| PROFILE-highlight-fuckyou | NERDS ONLY |
| PROFILE-highlight-matchday | QUIZ |
| PROFILE-highlight-dubid | DUBID |
| PROFILE-highlight-offsides | OFFSIDES |

The avatar is now the FAN LIFE seal. The Facebook cover contains the FAN LIFE masthead and exactly four partner tickets. Profile templates retain their existing renderer keys.

## Verification and content status

`npm run build` renders every export, validates dimensions, canvas bounds and story text zones, runs the regression checks, and updates `VERIFICATION.json`. `npm test` runs the content/policy regressions separately.

The checks include real names and Greek text, zero forbidden-colour pixels in three rival-lock PNGs, optional story answers, no printed trivia answer, bubble truncation, T9 row counts 2–5, week/date mode, the shirt branch, caption transparency and the square crop for T8. The live-text SVG and outline render use the same data and palette resolver.

The example archive lines and dates are layout data, not verified historical reports. `assets/sample-shirt.png` is an original unbranded illustration used to demonstrate the supplied transparent-PNG path; replace it with an approved archive PNG before publishing. No real crests or real player photos have been added. No Telegram destination, schedule, repository or live application was modified by this deliverable.
