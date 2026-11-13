# A public page is answered from the front door's shelf; only the desk, the APIs and the owner's session always reach the server (13.11.2026)

Owner, 13.11.2026: "the site's loading speed is terrible, it takes almost a minute."

Cause: every public page is `force-dynamic`, one render costs seconds of the instance's single CPU (sixteen at once took 80 s each, PR #470), and a visit is such a burst: the page plus every link Next prefetches. Nothing was kept between two visitors.

- `deploy/space/proxy.mjs` keeps each rendered public page (HTML and its flight data) in the instance's memory: fresh for `FRESH_MS` = 60 s, then answered at once for up to `STALE_MS` = 12 h while one render refreshes it behind (rules 104, 105).
- The key is what the server really reads: host, path, query (`?lang`; campaign parameters dropped), and the kind of answer. A public page must therefore never read a visitor's cookie on the server. A page that needs the visitor is personalised in the browser, or its path is added to `NEVER`.
- Never shelved: `/api`, `/master`, `/qa`, `/auth`, signed pages (`/studio-cancel`, `/final-whistle-render`), files, non-GET, a request carrying the admin or tester cookie, an answer that is not a whole 200 or that sets a cookie.
- A change made in the desk shows on public pages within a minute (the first visitor after it may still see the previous copy once). A deploy starts with an empty shelf.
- The answer carries `x-fanlife-shelf: hit | stale | miss`; that header is how the speed is checked on production.
