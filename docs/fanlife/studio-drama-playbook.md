# The drama playbook — how a Football Stories film earns "wow"

Research round, 17.11.2026 (the owner asked for "very comprehensive research to refine the pipelines, the information
and the translation of information into a wow film"). What the craft says, and where each idea lives in the studio.

## What the craft says

| Idea | What it is | Source |
|---|---|---|
| Three acts, 25 / 50 / 25 | Setup (character, goal), confrontation (obstacles build tension), resolution (climax, closure) | [Doc Film Academy — three acts](https://www.docfilmacademy.com/blog/master-the-art-of-documentary-storytelling-in-three-acts) |
| Stakes | Say what the subject can lose or gain before the outcome | [Doc Film Academy — suspense](https://www.docfilmacademy.com/blog/how-to-build-suspense-in-a-documentary) |
| Ticking clock | A real deadline, made clear early, carried through every scene | same; [No Film School](https://nofilmschool.com/build-tension-screenwriting) |
| Foreshadowing / plant and payoff | An early detail that pays off in a later high-stakes moment | Doc Film Academy — suspense |
| Withheld payoff | Cut away before a tense moment resolves, return to it later | Doc Film Academy — suspense |
| Open loop | A question, threat, deadline or looming collision; anticipation + delayed payoff = engagement | [Write & Co](https://writeandco.kit.com/posts/suspense-isn-t-just-for-thrillers-4-ways-to-use-it-in-your-script) |
| Dramatic irony | The audience knows what the characters do not (the bomb under the table) | [Industrial Scripts](https://industrialscripts.com/?p=230356) |
| Cross-cutting, silence | Parallel lines that converge multiply tension; a sudden drop to quiet signals something big | Doc Film Academy — suspense |
| Hook in 15–30 s | Lead with intrigue and why it matters; the context can come later | [Subscribr](https://subscribr.ai/youtube-strategy/storytelling-youtube-content-strategy) |
| Promise, keep, promise again | A hook is the first 30 s; retention is making and keeping the next promise; do not save the best for the last 30 s | [OutlierKit](https://outlierkit.com/resources/youtube-hooks-and-retention/) |
| Nostalgia is not an arc | Remembering a score is not caring about the people behind it | [30 for 30 notes](https://presentationbuilder.internationaltrucks.com/espn-30-30-documentary) |
| Data as narrative device | Broadcasters frame storylines from historical context, win probability, comeback patterns | [Stats Perform](https://www.statsperform.com/resource/20-different-ways-to-talk-about-football), [AWS Bundesliga Story Finder](https://aws.amazon.com/blogs/media/bundesliga-data-story-finder-delivering-fans-the-stories-they-love) |

## Where each idea lives now

- **Stakes before the result** — `studio/drama_facts.py` counts, from the whole archive, what each match meant before
  kick-off (record between the clubs, drought, a ground never conquered, a score to settle, the road, the clock) and
  `house_writer.context_line` says one of them *before* the result, so the result answers it.
- **Ticking clock** — "4 league matches left after this one", "The last league match of the season." (league matches
  counted in the ledger).
- **Plant and payoff / open loop** — `house_writer.teasers`: a chapter's cliff edge names what waits in the next
  ("Waiting ahead: Maccabi Haifa, who had beaten them 2–1 in September 2009. Could they settle it this time?"); the
  next chapter tells that match. Runs after the cut, so no promise is left unpaid.
- **Withheld payoff** — the cold open already shows the strongest moment with its result withheld (house writer).
- **The road** — `place_book.py` placed 865 more opponents (913 clubs, 514 cities): the house writer writes the road
  ("the journey ran through …"), the atlas flies it, the longest trip is said with its kilometres.
- **Matches with stakes are picked first** — `pick_matches` adds weight to a match with something at stake.

## Honesty rules (they make the drama believable)

- "on record", never "ever": the archive is what we hold. "The first meeting between them on record."
- A drought is said only across seasons the archive holds whole (`drama_facts.coverage`): a gap in the record is not a
  drought.
- Every number in a context line is the context claim's, which the beat cites (`script.fact_guard`).

## Next in the drama line

- League position and gap before a match (needs the table per round in the archive).
- Win probability / underdog factor: pre-match strength from historical results (an Elo of our own from the archive;
  the open ClubElo and football-data odds are outside this machine's network — a GitHub Actions job could fetch them).
- Cross-cutting the title rival's results on the same day (needs the other club's fixtures).
- Silence before the decisive goal in the mix (audio.build_mix cue).
