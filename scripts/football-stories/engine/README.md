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
