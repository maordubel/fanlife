# THE ALBUM coupons: free packets for a code (18.11.2026)

**Owner:** a free packet for a code posted now and then on FAN LIFE's social accounts, to promote the album; and an unlimited master code for his own tests.

- Codes are made on the desk (Settings → Features → THE ALBUM → Coupons): label, packets (1–5), max uses, end date. Once per collector.
- The database keeps only `sha256(lowercase code)` (`worker_album_coupon`). No code is ever written in this public repository, a migration, a log or a doc — the master code included; it was created directly in the database.
- A fan types the code in the album; `worker_album_redeem` checks the window, the cap and "once per collector" and issues the packets as `coupon` envelopes in one transaction. Ten wrong tries per collector per day, then it waits for tomorrow.
- A master code (`master = true`) ignores caps and repeats; it cannot be made from the desk, only by the owner's request in the database.
