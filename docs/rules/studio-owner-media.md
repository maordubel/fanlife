# studio-owner-media · The owner's pictures and clips are VOX moments; the cover is ours

Owner, 24.11.2026: "I want the system to combine the pictures I upload to Drive or to the specific film … with our VOX
technology: an effect, a transition with motion, a cool entrance onto the screen, together with the text — not as a
slideshow. Between the speech." · "also video files I upload, inside the edit." · "titles and preview pictures that are
different, special, ours — not like all of YouTube and the current trend." · "The cover picture preferably from a picture
I upload, if I upload one; a direct connection to the script through the picture."

1. **Uploads take clips** (`lib/stories/pictureUpload.ts`, `ART_NAME`, the desk): PNG, JPG, WebP and MP4, MOV, M4V,
   WebM, 45 MB each, 30 a film. A Drive folder pinned to or named by the film brings its clips too (`drive_scan.plan`);
   the general library never brings video.
2. **A clip is a piece like a picture** (`studio/owner_media.py`): a muted 1920×1080 30 fps proxy of its first 20 seconds
   in `kit/clips/<set>/`, a poster frame beside it, `clip:<set>/<slug>` in the set's clip index, required. It is placed
   under the line it matches (`media_assets.place`) and checked like a picture (`require_file`); an unreadable required
   clip stops the job and names it. The narrator speaks over it: the clip's own sound is never in the mix.
3. **Never a slide** (`docu/reveal.py`, `build.Film.reveal`). The first beat of a line that carries the owner's picture
   or clip is a reveal: `print` (slides in as a taped print, the line's words stamped beside it), `tear` (the newsprint
   tears and its halves are pulled apart), `strips` (six strips close into the picture; stills only), `frame` (a frame of
   the club's colour the camera flies through), `stack` (a picture with no line drops onto the pile of the ones before).
   Never the same entrance twice running. The words are the narrator's own (press.headline), never a caption we wrote.
   Soft entrances (rule 142), no 3D, no filter, no mask gradient; the paper and tape boil at 8 fps.
4. **A clip is drawn once it settles**: the renderer leaves a moving `<video>` blank for its first ~0.5 s (measured on
   24.11), so the clip's poster frame sits under it in the print or frame.
5. **The cover is the Terrace Gazette** (`thumbs/gazette.py`), thumbnail 1, before the three documentary hooks: the
   masthead, the line the film says over the owner's first picture under a spoken line as the headline, his picture as a
   taped print on a disc of the club's colour, the number ringed by hand, the crest pinned to the print. With no owner
   picture, the first hook and its picture. It must read at 168×94 (≥ 9 px a letter; held by test_thumbs).
6. **One picture, three places**: that same picture is the photograph on the film's front page (`docu/press.front_page`),
   so the cover, the first frame and the script are one thing.
7. Switches: `STORIES_REVEAL=0` (pictures cut in as before), `STORIES_GAZETTE_COVER=0` (the three hook covers only).

Held by `studio/tests/test_owner_media.py` and `test_thumbs.py`.
