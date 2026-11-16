# FAN LIFE Drive library — the tagged index

The owner's shared library `1CNLhWlab7Irfq4jJw-QRGHI37tpJcucw` (3.11.2026: "lots of graphic material for general,
specific and as-needed use"). Reorganised and tagged 16.11.2026 (owner: "complete the tagging index in our Drive and
make the system know how to work with it perfectly; you may change order, names and folders").

## The files here

| File | Who writes it | What it is |
|---|---|---|
| `tags.json` | by hand | the tag map: tags per folder id (inherited by everything below) and path rules |
| `inventory.json` | the daily job | the live listing: folders and files (id, path, name, MIME, bytes) |
| `index.json` | the daily job | one tagged row per file — what the engines read |

`Drive index (daily)` (`.github/workflows/drive-index.yml`, 05:17 Athens) lists the Drive live, rebuilds both files and
commits them when they changed. Locally: `cd scripts/football-stories && python -m studio.drive_index build`.
`python -m studio.drive_index check` fails when a folder has no tags; `studio/tests/test_drive_index.py` fails when
`index.json` is stale or a folder name is not English.

## Tags

`clubs` (club ids; empty = any club) · `use` (studio, shop, marketing, site, life, reference) · `status` (approved,
draft, reference, source-photo, doc, vlog) · `rights` (owner-made, needs-check) · `kind` (still, clip, cutout, texture,
vector, 3d, doc, archive) · `subjects` (the media index vocabulary: stadium, crowd, goal, newspaper, …) · `era`,
`series` (classified, fanlife-kids), `feature`, `project`, `story`, `priority`, `protect` (never delete: the owner's
phone `IMG_*.MOV` vlog footage).

## Who reads it

- **The media index** (`studio/media_index.py → drive_records`): clubs, subjects and rights come from the tags; drafts,
  documents, rendered films and vlog footage are never candidates; only approved owner-made folders count as
  `owner-made`.
- **The film's Drive scan** (`studio/drive_scan.py`): a folder is matched to a film by its name AND its tags (club,
  story, label), so "Approved Graphics" is found for a Hapoel Tel Aviv film.
- **The worker** (`studio/worker.py → drive_folder_fits`): a club's general folders come from the tags too.
- `studio.drive_index.usable(row, use, club, rivals)` is the one test for "may this surface take this piece": no
  drafts, no documents, no other club's art, never a rival's.

## The structure (16.11.2026)

```
00_START_HERE_FANLIFE_FOLDER_GUIDE.txt · FANLIFE_ASSET_INDEX.csv
01_Football_Stories_Clubs_and_Matches/   one pack per club or match (AEK-Athens, Panathinaikos, Olympiacos v Maccabi 2024,
                                         Zrinjski v AZ 2023, Hapoel-Petah-Tikva, Hapoel-Tel-Aviv_vs_Beer-Sheva_2005)
02_Documentary_Studio_Assets/            any-club studio art: paper-cut scene library, cut-outs, story graphics v2,
                                         Flow stock stills and clips, drafts, motion tests, story beats and prompts
03_Games_and_Features/                   Manager of Legends, Royal Rumble, THE WORKER (Ussishkin 3D, owner favourites)
04_Branding_and_Shared_Assets/           logos and posters, social templates, product concepts, club stickers,
                                         approved THE WORKER / Hapoel Tel Aviv graphics, Supergoal scans, graphic kit
05_Documents_and_Plans/                  scripts and prompts, platform plans and reviews, players and data, research, marketing
06_Graphics_by_Project/                  FAN LIFE, THE WORKER, OFFSIDES, TakeMeOut, other
07_Opening_Movies/                       channel and film intros
08_Rendered_Films_and_Shorts/            finished renders (output, not source art)
99_Packages_and_Archive/                 zips
```

Read `00_START_HERE_FANLIFE_FOLDER_GUIDE.txt`: drafts and tests need review before production, and source photos,
original crests and archival footage may need permission before publication. To bring a folder into the studio kit:
Actions → *Drive art into the studio*, with the folder path exactly as in `inventory.json`.
