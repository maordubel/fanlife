# Studio deletion and Commons discovery

The owner requested permanent production deletion, including completed films, and automatic free graphical material for each documentary script (6 November 2026).

## Delete production

Every production card has **Delete production**, including finished and uploaded jobs. The confirmation covers its script, uploaded copies, master chunks, preview, shorts, captions, package and job-specific working caches. Original Drive files and copies already published on external platforms are unaffected.

The authenticated, same-origin DELETE endpoint first replaces the complete job document through compare-and-swap with a tiny deletion marker. It contains only the job id and cleanup scheduling timestamps. All ordinary job reads, queue selection, lease writes, social scheduling and checkpoint requests reject deleted jobs; stale writers cannot restore them. A final `{id,deleted:true}` marker prevents legacy storage migration or replayed create requests resurrecting the production.

Storage cleanup enumerates every page under the exact `jobs/<id>` prefix, including orphan uploads and nested files. It removes files in batches, checks every response and keeps failures queued. The listener deletes all exact per-job GitHub Actions cache keys before asking the server to purge Storage again. Failed cleanup retries automatically. A second sweep after eight hours covers old workers and previously issued signed upload URLs. New workers check the job still exists before saving checkpoints. The Studio displays pending cleanup; disappearing from the list is not presented as proof that storage is already empty.

## Wikimedia Commons

Each documentary script option searches Commons after it has been written; supplied scripts and resumed selected scripts use the same path. Queries use the club/year and named venues and scorers in the actual script's cited archive facts. The search never creates historical claims or treats file descriptions as instructions.

Requests use MediaWiki's official API, an identifying User-Agent, sequential bounded searches, maxlag, per-query caching and a per-script fingerprint. API outages are logged and do not block a film. Only the chosen script downloads pictures (at most 12), with byte/dimension limits, raster validation and restricted HTTPS redirect hosts.

Automatic reuse initially accepts only explicit **Public domain / CC0** metadata with no attribution requirement or additional restriction. CC BY, CC BY-SA, missing/unclear licences and other obligations are excluded pending a complete attribution/adaptation policy for all social crops. Their exclusion counts are recorded; Commons availability does not mean every result is reusable automatically.

Images must match a named entity; event searches must match the year. Context photographs are labelled on screen and matched only to shots mentioning the entity. They complement, never displace, required owner pictures. Classic, VOX and HyperFrames retain whole-picture treatment; VOX cannot silently substitute an illustration when a selected archive picture fails.

The package includes `commons-search.json` (queries, licence/relevance rejections, candidates and actual used keys), plus creator, source page, licence and image date in `assets.json`. Used Commons photographs receive description credits and accurate disclosure, rather than being called owner-generated AI art. Images are resized and colour graded under the existing club palette rules.

No production was deleted to test this feature. Tests use isolated stores, mocked Storage and Commons responses, real raster ingestion/edit planning and renderer frames.
