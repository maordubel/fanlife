# The book's order journey runs itself (Broken Collective, 23.11.2026)

Owner, after a paid paperback reached the press without the reader hearing about it: "full automation for the whole purchase — pleasant, reliable and fun".

- **One letter per step, recorded.** `worker_book_orders.mails` is the ledger. `lib/book/journey.dueLetter` decides the letter the order's step owes (received → printing → press → shipped → "has it arrived?"; making for goods; tip). A letter goes once; a failed send is kept with its error and tried again, up to five times. After a missed step the reader gets the current step's letter, never the history.
- **The heartbeat.** pg_cron `marketing:book-tick` posts `/api/book/tick` every 5 minutes: stuck paid orders go on to their maker, printing Lulu jobs are asked about directly every 30 minutes (a lost webhook never strands an order), owed letters go out. The door needs no secret: it only does owed work and runs at most once a minute. The GitHub workflow `book-orders.yml` stays as the red alarm.
- **The journey page** `/book/order/<id>` is the book's, not FAN LIFE's: a whole document outside FAN LIFE's layout, dressed as the book's red thread, phone first with a separate desktop design, no name or address on it. Every letter except the tip's links to it. It sells nothing (rule book-shop-separate still holds).
- **The owner hears of every sale** once (`mails.sale`), to `BOOK_OWNER_EMAIL`.
