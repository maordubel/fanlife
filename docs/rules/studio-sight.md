# The studio looks at what it shows (owner, 15.11.2026)

The owner, 15.11.2026: *"The studio still does not produce films at the right level, does not choose the right
graphics, does not produce the editing and directing I wanted."*

What was measured on AEK 0–1 PAO (14.11): 42% of the running time was type or a diagram on a plain ground (one colour
covering 45% or more of the frame), with runs of about 14 s. "He signed for AEK" played over a silhouette behind bars. The
causes were in the code, not in a missing rule. Pictures were chosen by the words in their file names, nothing decided
what a line should show, and no gate looked at a frame. Every earlier round had added one more card device, so each fix
moved the film further toward a slideshow.

1. **Pictures are chosen by what they show.** Every still and cut-out is described once by Gemini (`studio/sight.py`,
   `kit/sight/captions.json`, keyed by content hash). The worker describes what is new before each film, up to 240
   pictures, and commits the book.
2. **The director writes the shot list.** For every narrated line, one call per film decides what the viewer sees, picks
   the candidate that shows it from the pictures the media index allows (club, rival colours and freshness stay hard
   filters), and refuses the candidates that would mislead. A refused picture never stands on that line, including a
   picture the plan chose itself (a `required_asset` stays). The answer is kept in the job (`sight-shots.json`).
3. **No card on an empty ground.** Every full-frame card and every slammed word is read over the beat's moving picture,
   and its ground thins toward the edges (`editor.ground`, `build.glass`). A card leaves after 4 s (it used to be 6 s).
   In a film of a minute or more, cards together take at most 15% of the running time, and the latest ones are cut to
   2.6 s first. A subtitle whose words are already on screen as type is not shown twice.
4. **The gate looks.** On the render, the slide share must stay at 15% or less (with 3 points of measuring grain), with
   no slide run longer than 4 s (`experience · not a slide`, reason `flat`). One frame every 3 s is judged against the
   words spoken over it (`experience · pictures fit the words`). More than 3 wrong frames re-plans those shots once:
   the pictures it called wrong are refused there (reason `mismatch`).
5. Without a Gemini key, or when the quota is spent, every step falls back to the index as before and says so. Nothing
   here writes a fact on screen. `STORIES_SIGHT=0` switches it off.
