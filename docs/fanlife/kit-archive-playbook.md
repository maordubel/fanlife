# Kit archive playbook — every club, same pipeline (8.10.2026)

Hapoel Tel Aviv comes from THE WORKER (`public/kits/`, `content/manual/kit-photos.json`, Kit Master, `lib/kit/*`).
Every other open club gets the same structure: `public/kits/<club>/<slug>.webp`, `content/manual/kit-photos-<club>.json`.

## Steps (≈20 min per club once the browser is connected)
1. **Browser**: Chrome extension, a human-passed Cloudflare check on footballkitarchive.com (we never solve it — rule 11).
   Select the browser (`switch_browser`), open the club's `…-kits-tNNNN` page (find it by typing the club into the site search
   box and pressing Enter; the search page itself is JS-only). Note the page lists every kit as `/<club>-<season>-<type>-kit-<id>/`.
2. **Collect in one go**: the fetch-and-zip helper stored in the site's localStorage as `fkaSrc`
   (`eval(localStorage.getItem('fkaSrc'))('<club>')`). It reads every kit page (Season, Type, Design, Colors, Brand, Sponsor,
   Competitions, Credits), downloads the full-size JPG (`og:image`), builds ONE stored zip with `meta.json`, and downloads it.
   Rules learnt: ONE run at a time (two runs → the site's fetch wrapper throws `clone` errors), 2 workers, retries, **no sleeps**
   (a hidden tab throttles timers to ~1/min — poke the tab with `tabs_context_mcp`/a wait while it runs). Progress: `window.__p`.
   Wait for `__p.res`, never navigate away mid-run. Never start it before `document.body` exists.
3. **Bring it here**: `device_request_folder_access ~/Downloads` → `device_stage_files <club>-kits.zip` → unzip to a scratch dir.
4. **Encode**: `python3 scripts/kits/ingest-club-photos.py <club> <dir> <team-page-url> [--worn slug,slug]`
   (rembg isnet-general-use cut-out → largest blob → small-hole fill → 760×760 transparent WebP; yellow measured on the decoded bytes;
   palette measured; `parts` filled from the source page only; `cutQuality` ok/review by solidity; `usableInApp` = ok AND flat).
5. **Look at it**: build a contact sheet (see the snippet in the session log) and list player-worn photos for `--worn`. White shirts on light
   grounds lose pieces → they stay `review`, never silently passed.
6. **Register**: add the manifest to `lib/kit/clubArchive.ts`, credit the photographer/source on `/credits`, add a row to
   `content/manual/asset-provenance.json`, and run `npm run test`. Yellow in real photos is a fact (rule 69), not a defect.
7. **Cross-check** (rule 16): the club's own site / Wikipedia kit pages for manufacturer and sponsor years; record conflicts, never overwrite.

## Decomposition (the eight layers of `lib/kit/spec.ts`)
base · cut · sleeves · collar · crest · maker · sponsor · nameset. The source page gives base colours, pattern and maker; the
cut-out gives a measured palette. Sleeves/collar/sponsor/nameset stay `null` until a person reads the shirt — no invented parts.

## Open clubs on 8.10.2026
Hapoel Petah Tikva, Olympiacos, Panathinaikos, Zrinjski Mostar (Hapoel TA = THE WORKER).

## Lessons added 8.10.2026
- footballkitarchive rate-limits (429) after ~80 kit pages in a session: one worker, 1.5s gap, backoff, and save progress to a `window.__skip` list. The zip is only produced at the end of a run, so a stalled run loses everything — collect in batches of <=60 kits.
- Status: Zrinjski 68/68 complete. Olympiacos 79 of 195 collected (116 pending, 429). Panathinaikos and Hapoel Petah Tikva not yet collected. Hapoel Tel Aviv lives in THE WORKER (`public/kits/`, 168).
- Old-era (pre-1982) photos are often players wearing the shirt: list them in `--worn`; they stay out of the games.
