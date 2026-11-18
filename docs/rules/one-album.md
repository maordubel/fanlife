# THE ALBUM is one album of every open club (18.11.2026)

**Owner:** "one big album of all the FAN LIFE clubs; every club I open to the public joins it, and a user gets random stickers each time, not always from his club — it also gives the community a reason to swap."

- The album's clubs are the clubs whose archive is open to fans. `lib/album/server.ts → syncOpenWings` writes that list to `worker_album_wing` (service role, `worker_album_open_set`) whenever it changes; opening or pausing a club needs nothing else.
- Every packet (daily, starter) is drawn from `worker_album_pool()`, the whole album. The fan's own club is "my club": the cover's colours and nothing more.
- Swaps between collectors: `worker_album_swap_offer / _board / _accept / _cancel`. Only a spare can be offered (one of each stays in the album; spares promised in open offers are counted), both sides move in one transaction, each collector opens the new sticker as a `swap` packet. Collectors show as `Collector #NNNNN` (a hash), never a name. Closed swaps are swept after 60 days (`marketing:album-swaps-sweep`).
- Economy at 468 stickers: about 380 days alone at two a day (simulation, `lib/album/economy.ts`); swaps, picks and the 5-for-1 trade are what make it finishable.
