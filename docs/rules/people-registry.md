# People Registry — one person, one id, every club (18.11.2026)

**Rule.** A football man is one PERSON across the universe. A club pack holds him as a record (a *stint*: `club:recordId`); the People Registry joins stints into people only through a recorded verdict, never through a name (rule 7).

- Every record is minted a person id once (`pl_` + 10 hex) in `content/manual/people-ids.json` — append-only, written only by `npm run people:build`. A person's id is the smallest id among his records, so a merge only retires ids and every id ever minted still resolves (the profile redirects to the canonical one).
- Verdicts live in `content/manual/people-links.json` (repository) and `players/people-links.json` (the owner's desk, durable store); the desk wins. `same` joins two records, `different` keeps them apart. A cross-club pair that shares a written name and has no verdict waits on **Players → Across clubs**.
- The system decides what a public source proves: `npm run people:links` (daily, in `research-daily`) asks Wikidata — one footballer item listing both clubs → `same`; two items each listing one → `different`; anything else stays for the owner.
- A stint carries the same hidden rating, reputation and Legends stars the games compute (`rawPool`, `rateClub`), so a profile and a game never disagree. Hidden ratings stay on the server (rule 4); a profile shows stars.
- The player profile (`/players/<id>`, switch **Player profiles**) shows only clubs whose archive is open to fans; the owner's preview shows every record, marked. The archive's player sheet links to it; Legends cards carry `person`.
- Record ids are unique across clubs (tested), so a game joins a man to his person by record id alone (`lib/people/by-record.ts`).

Why: the owner (18.11.2026) — "the system must give each player an ID and navigate him correctly in an internal index that knows how to separate properly" (Walid Badir: Hapoel Petah Tikva and Hapoel Tel Aviv; Loukas Vyntra: Panathinaikos and Hapoel Tel Aviv).
