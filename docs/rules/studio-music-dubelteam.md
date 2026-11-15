# The studio is scored only with DubelTeam music (owner, 15.11.2026)

The owner, 15.11.2026: *"These are all music files I edited, with no rights. From now on use only them. Credit the music
to DubelTeam. Give the studio a standing instruction to work only with them."*

1. Every film, Short, Reel, CLASSIFIED, vlog and promo is scored only with the eight tracks in
   `scripts/football-stories/studio/kit/music/dubelteam/`, marked `owner: true` in `kit/music/index.json`. Every
   earlier track (Pixabay, Free To Use, Tanner Helland) is `owner: false` and is never picked again. A film that is
   already published keeps its own score.
2. The credit in every description is "Music: <title> — DubelTeam". These tracks are the owner's own, so they are
   committed to the repository; they carry no third-party attribution block.
3. The tracks are picked by mood (`audio.pick_owner_track`):
   - Under the Iron Watch, Before the Collapse: tension and CLASSIFIED
   - A Seat by the Exit: heartbreak
   - The Weight of Stillness: reflective and explainer
   - After the Final Whistle: memory and warmth
   - The Tapan's Final Surge, A Stand of Thousands: drive, matchday and rivalry
   - Ninety Minutes of Glory: triumph
4. A new track joins only when the owner supplies it, under the same rule.
