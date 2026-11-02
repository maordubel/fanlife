# FanLife: Football Stories — editorial animatic

This first step creates a silent, watermarked editorial preview from a small episode manifest. It does not research facts, generate AI imagery, create voiceovers, license media, upload, or publish. Its purpose is to test visual pacing before those production stages exist. The text and source fields need editorial fact-checking; a source URL is not a media licence.

Requirements: Python 3, Pillow, FFmpeg, FFprobe, and DejaVu Sans Bold at `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`. Run from the repository root:

```sh
python3 scripts/football-stories/preview.py scripts/football-stories/episodes/hapoel-1999-2000-preview.json /tmp/fanlife-editorial-preview.mp4
```

The renderer uses only generated graphics and the project's own FanLife logo, with no audio. The manifest has explicit scenes and source links; its preview is not a complete chronology or documentary. Do not represent it as historical footage. Output is a draft, and publishing requires factual and rights verification, appropriate disclosure, authenticated channel access and further implementation.
