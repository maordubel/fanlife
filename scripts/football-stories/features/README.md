# FAN LIFE feature videos

Owner decisions, 2.11.2026:
- **Formats:** viewer-challenge Shorts and feature explainers.
- **Clubs:** the published clubs, in rotation.
- **Production:** automatic, then sent to Telegram for approval. Claude uploads to YouTube after the owner approves.
- **Pace:** 7 Shorts and 1 film a week.

## Every week

| | |
|---|---|
| When | Sunday ≈17:15 Athens (`features-weekly.yml`) builds **next** week. Until the file is on `main`, a change to `trigger.txt` runs it once. |
| Plan | `build-week.mts` → `weeks/<YYYY-Www>.json` (not committed; it is published with the videos) |
| Shorts | `shorts.py`: 1080×1920, ≈22–30 s, ≤ 45 MB |
| Film | `explainer.py`: 1920×1080, ≈1 min plus the 20 s end screen |
| Files | branch `features-publish` (videos, frames, thumbnails, `week.json`, reports) |
| Telegram | `delivery.py` → `../matchday/deliver.mjs`: each video, then its copy-paste (YouTube title, IG/TikTok caption, first comment) |

## The seven Shorts, one a day, a different club each day

1. **Mon · quiz**: who did they play.
2. **Tue · who am I**: Blind Cow clues.
3. **Wed · guess the score**.
4. **Thu · in order**: four dated nights.
5. **Fri · who scored**.
6. **Sat · true or false**.
7. **Sun · which decade**.

A club with no data for that day's kind passes its turn to the next club.

Each Short has the same shape:
1. Hook, in the club's colours with its crest.
2. The challenge.
3. A 5-second countdown, with "Answer in the comments".
4. The reveal: the right answer lights up in the club's colour while the crowd sound plays.
5. The call: play the full round on FAN LIFE, and follow.

The answer never goes in the caption. It goes in the first comment.

## Data rules (same as the social plan)

- Only approved facts with confidence ≥ 2, read through the FAN LIFE trivia forge (rule 109) and the Blind Cow
  mysteries (rule 102). English only.
- **Nothing from before 1980**, and that includes the wrong options.
- No question about a betting sponsor (the audience is 15–55).
- Wrong options come from the question's own pool, never from another club.

## The film

Each week covers one feature, in the order set in `explainers.json`:

1. Trivia
2. Blind Cow
3. Timeline
4. Royal Rumble
5. Legends Manager
6. Memory
7. Away Days
8. All-time XI

The words describe the feature's real rules, and nothing it does not do. The picture is the live site on a phone
screen, filmed for a club whose page for that feature is open. If no club has it open, the film is skipped and
Telegram says why. The subscribe call follows matchday RULES §8a.
