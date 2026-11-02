# Football Stories — documentary assembly stage

This stage assembles real video clips with one narration audio file per scene, then exports a 1280×720 MP4 and scene-timed SRT. It validates every media file, checks clip ranges and refuses shots without a documented rights status and evidence reference. It does **not** perform research, generate scripts, imagery, animation, music or speech, check the truth of claims, verify a licence, or upload/publish. The SRT timing uses optional ElevenLabs alignment JSON, otherwise scene-level timing. Captions require review and are not burned in. Its output quality depends on the input footage, sound, script and creative editing. This is an early production component, not the autonomous system.

## Requirements

Python 3.9+, FFmpeg with libx264 and AAC, and ffprobe. No API keys or network access are needed for this component.

## Manifest

Paths may be relative to the manifest. Each shot must be video with an `in` point and duration in seconds; no automatic looping or fabricated replacement. Total shot duration must cover the narration. `rights.evidence` records the documented permission or legal basis; this is a safety check, not legal verification. Use correctly licensed video and audio.

```json
{
  "version": 1,
  "scenes": [
    {
      "id": "summer-1999",
      "narration": "Summer, 1999. A new season begins.",
      "narration_audio": "media/scene-one.wav",
      "shots": [
        {
          "file": "media/terrace.mp4",
          "in": 0,
          "duration": 10,
          "rights": {"status": "licensed", "evidence": "licence-record-123"}
        }
      ]
    }
  ]
}
```

Run `python3 scripts/football-stories/engine/render.py episode.json output.mp4`. Intermediate files are removed on success or error; final files are committed after media checks. Existing output files are never overwritten. Source clips and narration are never modified. Secrets are not read or stored.

## Remaining work

Editorial research and approved sources, per-shot visual design, reusable animated compositions, professional voice generation and pronunciation controls, aligned captions, licensed music and sound design, quality gates, durable scheduling and idempotency, private channel authorization and uploads, and public launch checks. Those parts are not implemented or configured here.

## Optional ElevenLabs voice stage

`voice.py` sends one UTF-8 text file to ElevenLabs' `with-timestamps` endpoint and saves an MP3 and alignment JSON. It requires the user's `ELEVENLABS_API_KEY` environment variable and an explicitly chosen `--voice-id`; it never prints or commits credentials. Running it can incur charges. It refuses to overwrite outputs and does not retry ambiguous failures, which can otherwise generate duplicate charges. Example: `python3 scripts/football-stories/engine/voice.py narration.txt narration.mp3 --voice-id YOUR_VOICE_ID`. This integration has not been tested against a live account. Set a scene’s optional `alignment` path to the generated JSON for timed caption groups; the alignment text must match the narration.

## Hapoel Tel Aviv season dossier

`python3 scripts/football-stories/engine/archive.py --season 1999/00 --output /tmp/hapoel-1999-dossier.json` extracts a chronologically ordered dossier from FanLife's current Hapoel-centric generated match master. Each row keeps its match id, source ids, scorer claims, confidence and conflict references, while the dossier records a source-file SHA-256. It does not convert Hebrew names to English, identify dramatic moments, independently fact-check records, or cover other clubs. An unknown source entry remains null and requires further research. Existing output is not overwritten.

## YouTube private-upload stage

`upload.py VIDEO.mp4 metadata.json upload-state.json` uploads **private** only using a short-lived user OAuth access token in `YOUTUBE_ACCESS_TOKEN`. The token must be authorized for the exact channel `UC2KULoLBFCSZC4jeRGYkKfQ`; the script checks the authenticated channel before initiating an upload. Metadata JSON requires `title`, `description`, `channel_id`, and explicit Boolean `contains_synthetic_media`. Upload state contains the video hash and status but no token or resumable session URL. Any failed/interrupted attempt remains marked as uncertain; inspect YouTube Studio before retrying to prevent duplicates. It is a one-request resumable protocol upload and does not resume after interruption. OAuth setup, token refresh, live upload verification, scheduling, automatic publishing, thumbnails and playlists remain unimplemented. No live upload has been attempted.


## Editorial and YouTube packaging

`editorial.py DOSSIER.json PACKAGE.json --model MODEL` sends a curated topic and numbered, source-linked claims to OpenAI Responses and requests a structured English draft: hook, ten title candidates, selected title, description, tags, thumbnail text, segments, and Shorts. Every segment and Short must cite known claim IDs. Input shape: `{"topic":"...","claims":[{"id":"c1","statement":"...","source_url":"https://..."}]}`. The model is selected explicitly; `OPENAI_API_KEY` is read from the environment and never written. A call may incur charges; no automatic retry occurs. The output is marked `needs_editorial_review`: source IDs and schema do not prove factual correctness, sources require independent checking, and untrusted material can still influence output. The API integration has only mock tests, no live test. The synthetic-media disclosure is null and the private uploader refuses it until decided based on the rendered film. Tags are limited and included on private upload; they do not guarantee views or ranking.

## Convert archive records to editorial inputs

`python3 scripts/football-stories/engine/archive_claims.py /tmp/hapoel-1999-dossier.json /tmp/hapoel-claims.json --topic 'Hapoel Tel Aviv 1999–2000'` transforms source-linked match records into machine-readable claim inputs. Rows with missing scores, dates or source URLs, or known conflicts, are held. These are **unverified archive-derived claims**, not independently checked facts or images. Review every material statement and consult sources before publishing. Current support is for the Hapoel-centric match master; adding other clubs needs club-specific adapters.

## Owner studio and master prompt

`/master/stories` is behind the existing owner login and allows saving briefs to configured durable storage. It does not start a job, call AI services, or schedule video production. Production access uses the existing `FAN_LIFE_ADMIN_KEY`; without that key production is closed. The studio refuses to save to ephemeral memory. `MASTER_PROMPT.md` is the full requested creative brief. The existing editorial stage applies some, not all, of those instructions and now requests ten title candidates. It is not yet a full-length script or shot-manifest generator.

`python3 scripts/football-stories/engine/quality.py manifest.json` validates shot count, sequential IDs, continuous timing, direction and rights-status fields. The input has `target_duration_minutes` and `shots` from the master prompt. A passing result is structural only; it does not clear facts, licences, real-person faces, narration, assets or video for release.


## Paper stop-motion compositor

`python3 scripts/football-stories/engine/papercut.py shot.json shot.mp4` renders one silent MP4 from 2–20 supplied, same-size RGBA PNG layers ordered back to front. Each layer needs a rights status (`owned`, `licensed`, `public_domain`) and evidence. Requires Pillow, FFmpeg and libx264. Example:

```json
{"size":[1280,720],"fps":24,"duration_seconds":10,"layers":[{"file":"background.png","rights":{"status":"owned","evidence":"original art"}},{"file":"foreground.png","rights":{"status":"owned","evidence":"original art"}}]}
```

The camera is fixed and layers slide into place over 70% of the shot, then hold; shadows are composited. The shot can be supplied to `render.py` with narration and documented rights. This deterministic compositor does not create paper art from text, add cloth/cloud motion, generate speech, music or ASMR, inspect likeness, or produce an entire film. It has not been evaluated for professional cinematic quality. The desk stores a visual-style choice, but does not dispatch this renderer.

`paper_prompts.py beats.json prompts.json` creates one standalone image prompt for every supplied beat and one fixed-camera animation prompt. The input is `{ "club": "...", "era": "...", "palette": "...", "beats": [{ "narration": "...", "hero": "...", "setting": "...", "supporting_objects": [] }] }`. Supply sourced, manually prepared beats; it does not research or generate narration, images, motion, or fact-check its input.
