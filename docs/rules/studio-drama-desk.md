# The drama desk and the place book

Owner, 17.11.2026: "a city for every away ground in the archive, so every film with away matches gets a route on the map — and do everything that helps the writer build mini-drama, tension and excitement with every piece of information you can add to the archive."

1. **The place book is built from open data, offline.** `studio/place_book.py` gives every opponent the archive names its city (openfootball/clubs, CC0) and every city its coordinates (GeoNames, CC BY 4.0). The Wikipedia rows already in the book win. A club neither dataset places has no row (`dossiers/places-missing.json`), because no pin is better than a wrong one. Rebuild it when the archive gains clubs.
2. **Stakes before the result.** `studio/drama_facts.py` counts what every match of the season meant before kick-off: the record between the clubs, the drought, a ground never conquered, a score to settle from earlier in the season, the road in kilometres, the league matches left. Each count is a `context` claim that carries the match's sources. The house writer says one of them before the result (`context_line`), never the same kind twice running, at most twice a film.
3. **Plant and pay off.** A chapter's cliff edge names the match that waits in the next chapter (`teasers`), and that chapter tells it. Teasers run after the cut, so no chapter promises a match the film no longer has.
4. **Honest wording.** Say "on record", never "ever". A drought, a never-won-there or a meeting count is said only across seasons the archive holds whole (`coverage`): a gap in the record is not a drought. Every number in a context line is the cited context claim's (`script.fact_guard`). A line that tells an earlier result also cites that match (director rule 1).
5. Matches with something at stake are picked first (`pick_matches`).

The craft behind it: `docs/fanlife/studio-drama-playbook.md`.
