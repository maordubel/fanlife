# I WAS THERE — Art brief: the subscribe call

**For:** the designer / image tool (Midjourney, Firefly, Ideogram, or by hand).
**Goal:** make the ask to subscribe feel like a moment on the terrace rather than a YouTube banner, so a fan who
watched one night wants to come back for the next.
**Rules for every file:**
- Original artwork only: no real person's face, no real club crest, no real club kit, no real sponsor, no league logo.
- The scarf and the art belong to FAN LIFE, not to any club.
- Inks: vermilion `#D71920`, ink `#15130F`, newsprint `#F4ECD8`, paper `#FFFBF2`. The look is FAN LIFE's printed
  weekly: two-plate screen print, halftone dots, slight misregistration, paper grain.
- No text inside the artwork unless it says so below. The code sets the words, so they can change.
- **Delivery:** PNG with a transparent background where it says *transparent*. Upload the files to the Drive folder
  `I WAS THERE / art` with exactly the names below. Claude places them in `public/brand/fanlife/iwt/` and the next
  render uses them automatically.

---

## 1 · `subscribe-scarf.png` — the scarf raised (most important)

Shown behind the SUBSCRIBE stub in every film and at the end of every reel.

- **Size:** 2400 × 760 px, transparent.
- **Subject:** a knitted bar scarf held up taut, straight across the frame, by two forearms rising from the bottom
  edge. The hands are in plain dark gloves or plain sleeves: no faces, tattoos, rings or watches.
- **Knitted text on the scarf:** `I WAS THERE` in chunky knitted block capitals. Vermilion on cream, ink-black bars
  at both ends.
- **Fringe:** tassels hanging at both ends.
- **Light:** stadium floodlight from upper left, a warm red flare glow from below. The glow must stay inside the
  silhouette, with nothing on the transparent area.
- **Prompt (EN):**
  > Knitted football supporter bar scarf held up taut horizontally by two gloved forearms rising from the bottom
  > edge, the scarf reads "I WAS THERE" in chunky knitted block capitals, vermilion red on cream with black bars at
  > both ends and fringe tassels, two-colour screen-print illustration style, halftone dots, slight
  > misregistration, warm red flare glow from below, floodlight from upper left, flat front view, isolated on a
  > transparent background, no faces, no logos --ar 3:1

## 2 · `subscribed-stamp.png` — the rubber stamp

Hits the stub at the moment of SUBSCRIBED.

- **Size:** 900 × 900 px, transparent.
- **Subject:** a round rubber-stamp impression in vermilion, with the uneven ink of a real stamp (dry patches,
  rough edges).
  - Outer ring text: `FAN LIFE · I WAS THERE · FAN LIFE · I WAS THERE ·`
  - Centre text: `JOINED` in heavy condensed capitals.
  - Slightly rotated, about −8°.
- **Prompt (EN):**
  > Round vintage rubber stamp impression in vermilion red ink, outer ring text "FAN LIFE · I WAS THERE", large centre
  > word "JOINED" in heavy condensed capitals, uneven ink, dry patches, rough edges, rotated slightly, isolated on a
  > transparent background, flat scan --ar 1:1

## 3 · `endscreen-ground.png` — the last 20 seconds of every film

This opens up YouTube's end screen, with a Subscribe button and a "next video" box placed on top of the film. The
picture has to leave two zones empty, because YouTube draws its own buttons there.

- **Size:** 1920 × 1080 px, opaque.
- **Empty zone A (Subscribe circle):** centre x 420, y 560, diameter 300. Leave a dark, plain disc-shaped area there.
- **Empty zone B (next video):** a rectangle from x 900 to 1780 and from y 300 to 795 (16:9). Leave a dark, plain
  card-shaped area there.
- **Around the zones:** a night terrace seen from behind the supporters.
  - Silhouettes of raised arms and scarves at the bottom edge, red flare glow, smoke drifting across the floodlights.
  - Halftone print style.
  - Top-left corner kept quiet for the FAN LIFE badge. A clear strip at the top (y 60–200) for the line the code
    writes.
- **Prompt (EN):**
  > Football terrace at night seen from behind the supporters, silhouettes of raised arms and scarves along the
  > bottom edge, red flare glow and drifting smoke under floodlights, two-colour screen-print illustration,
  > halftone dots, ink black and vermilion on newsprint, a large dark empty circular area on the left and a large dark
  > empty 16:9 rectangle on the right left completely plain for overlays, no faces, no text, no logos --ar 16:9

## 4 · `channel-banner.png` — the channel's banner (drives subscribes from the channel page)

- **Size:** 2560 × 1440 px.
- **Safe area:** everything that matters sits inside the centre 1546 × 423, because that is all a phone shows.
- **Inside the safe area, set as text:**
  - `I WAS THERE` (large)
  - `Real nights. From the stand. Every week.` (small)
  - The FAN LIFE badge on the left.
- **Outside the safe area:** a panoramic terrace, flares and smoke, the same style as #3.
- **Prompt (EN, background only, without the text):**
  > Wide panoramic football stadium terrace at night, packed stand with raised scarves in silhouette, red flares and
  > smoke under floodlights, two-colour screen-print illustration with halftone dots, ink black and vermilion on
  > newsprint, calm darker band across the middle for text, no faces, no logos --ar 16:9

## 5 · `reel-follow.png` — the last frame of every reel (optional)

- **Size:** 1080 × 1920 px, opaque.
- **Subject:** the same terrace as #3, upright. Raised scarves fill the lower third.
- **Clear zones:**
  - The top 900 px stays clear for the follow line the code writes.
  - The bottom 400 px stays plain, because Instagram and TikTok draw their own buttons there.

---

## What happens with each file

| File | Where it shows | Until it exists |
|---|---|---|
| `subscribe-scarf.png` | behind the stub in the film, at the end of the reel | the stub stands alone |
| `subscribed-stamp.png` | on the stub at the moment it turns to SUBSCRIBED | the code's own stamp |
| `endscreen-ground.png` | the film's last 20 s, with YouTube's end-screen buttons on top | the current end card, no end screen |
| `channel-banner.png` | the channel page | Claude uploads it in Studio once it arrives |
| `reel-follow.png` | the reel's last frame | the dark end card |

Already live with no art needed: the FAN LIFE badge as the YouTube watermark on the entire video, and the SUBSCRIBE
stub and spoken ask in every new render.
