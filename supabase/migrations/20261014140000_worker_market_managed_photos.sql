-- THE WORKER / FAN LIFE — photographs of the five managed listings (owner, 14.10.2026).
-- Run AFTER 20261014120000_worker_market_managed_listings.sql. Rule 89: only worker_ objects, and the auth schema is not touched.
-- The files ship with the site (public/market/listings/, served by lib/collector/seedPhotos.ts); these rows only
-- say which photograph belongs to which listing, first one first. Safe to run twice.
do $photos$
declare r record;
begin
  for r in select * from (values
    ('stpauli--st-pauli-cof-k-19',               'p/345fc078846b01778aae7ad863fd1396.webp', 0),
    ('celtic--celtic-cof-k-49',                  'p/1b517731ce2191279135073a704f59c5.webp', 0),
    ('celtic--celtic-cof-k-27',                  'p/d42d0bad57c42391856ee285d14ac12c.webp', 0),
    ('celtic--celtic-cof-k-27',                  'p/ae511a13e8e7a27c1e3b263e6e8f7787.webp', 1),
    ('aekathens--aek-athens-cof-k-45',           'p/a2d8c325ea2a89542f83121f02de4721.webp', 0),
    ('olympiacos--olympiacos-w-k-2016-17-home',  'p/11a84e8c0f1a22056c61ecee983760b6.webp', 0),
    ('olympiacos--olympiacos-w-k-2016-17-home',  'p/074fb11b46c983a9730530c40cbcb8de.webp', 1),
    ('olympiacos--olympiacos-w-k-2016-17-home',  'p/75ecfa91368e89a08812c8ec92c3d678.webp', 2)
  ) as t(slug, path, ord)
  loop
    insert into public.worker_collector_photo (item_id, user_id, storage_path, sort_order)
    select i.id, i.user_id, r.path, r.ord
      from public.worker_collector_item i
      join public.worker_market_managed m on m.user_id = i.user_id
     where i.archive_slug = r.slug
     limit 1
    on conflict (storage_path) do nothing;
  end loop;
end
$photos$;
