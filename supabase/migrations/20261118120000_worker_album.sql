-- THE ALBUM (18.11.2026) — the sticker album and the daily envelope. Server authority (skill supabase-server-authority):
-- RLS is on for every table, no policy and no grant to anon or authenticated; a signed-in fan acts ONLY through the
-- SECURITY DEFINER functions below, which read auth.uid() themselves. A guest cannot hold an album (the owner's rule:
-- "every daily entry of a REGISTERED user"). The catalog is written only by the service role (worker_album_catalog_sync).
--
-- Economy (plan 18.11.2026, values to tune):
--   · one daily envelope per Athens day, two DIFFERENT stickers, from the wing (club) the fan collects;
--   · pity: an incomplete wing gives at least one new sticker in every fifth envelope;
--   · five collecting days in an Athens week earn one "pick a missing sticker" token (once a week);
--   · the trade-in desk: five spare copies for one missing sticker of choice;
--   · starter: three envelopes of two when the album is opened;
--   · a missed day deletes nothing; envelopes already received are kept.
-- Size: catalog ≤ 36 × clubs; one copy row per fan per sticker owned; one envelope row per fan per day (kept 60 days).

create table if not exists public.worker_album_sticker (
  id          text primary key check (id ~ '^[a-z0-9-]{2,60}:[0-9]{1,3}$'),
  club        text not null check (club ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  edition     smallint not null default 1,
  slot        smallint not null check (slot between 1 and 120),
  page        smallint not null check (page between 1 and 20),
  person_id   text not null check (person_id ~ '^pl_[0-9a-f]{10}$'),
  record_id   text not null,
  name        text not null,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (club, edition, slot)
);
create index if not exists worker_album_sticker_club on public.worker_album_sticker (club, edition) where active;

create table if not exists public.worker_album_book (
  user_id        uuid primary key,
  wing           text not null check (wing ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  cover          jsonb not null default '{}'::jsonb,
  pity           smallint not null default 0,
  picks          smallint not null default 0,
  week_start     date,
  week_days      smallint not null default 0,
  week_paid      boolean not null default false,
  last_day       date,
  envelopes      integer not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.worker_album_copy (
  user_id     uuid not null,
  sticker_id  text not null references public.worker_album_sticker(id) on delete cascade,
  copies      smallint not null default 0 check (copies >= 0),
  stuck       boolean not null default false,
  best        text not null default 'base' check (best in ('base','silver','gold')),
  first_at    timestamptz not null default now(),
  primary key (user_id, sticker_id)
);

create table if not exists public.worker_album_envelope (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  day         date not null,
  kind        text not null check (kind in ('daily','starter','bonus','pick','trade')),
  seq         smallint not null default 0,
  wing        text not null,
  stickers    text[] not null,
  variants    text[] not null,
  fresh       boolean[] not null,
  opened_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, day, kind, seq)
);
create index if not exists worker_album_envelope_user on public.worker_album_envelope (user_id, created_at desc);

alter table public.worker_album_sticker  enable row level security;
alter table public.worker_album_book     enable row level security;
alter table public.worker_album_copy     enable row level security;
alter table public.worker_album_envelope enable row level security;
revoke all on public.worker_album_sticker, public.worker_album_book, public.worker_album_copy, public.worker_album_envelope from anon, authenticated;

-- ------------------------------------------------------------------ helpers (no grant: called only from the functions below)
create or replace function public.worker_album_today() returns date
language sql stable set search_path = public as $$ select (now() at time zone 'Europe/Athens')::date $$;

create or replace function public.worker_album_uid() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'album: sign in to hold an album' using errcode = '42501'; end if;
  return v;
end $$;

-- a variant for one copy: gold 2%, silver 8%, else base (cosmetic only; never needed to finish a wing)
create or replace function public.worker_album_variant() returns text
language sql volatile set search_path = public as $$
  select case when r < 0.02 then 'gold' when r < 0.10 then 'silver' else 'base' end from (select random() r) x $$;

-- add one copy; returns true when the fan had none before
create or replace function public.worker_album_give(p_user uuid, p_sticker text, p_variant text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_new boolean;
begin
  insert into public.worker_album_copy as c (user_id, sticker_id, copies, best)
  values (p_user, p_sticker, 1, p_variant)
  on conflict (user_id, sticker_id) do update set
    copies = c.copies + 1,
    best = case when p_variant = 'gold' or c.best = 'gold' then 'gold' when p_variant = 'silver' or c.best = 'silver' then 'silver' else 'base' end
  returning (xmax = 0) into v_new;
  return v_new;
end $$;

-- draw N distinct stickers of a wing for a fan; p_force_new guarantees one he lacks (when he lacks any)
create or replace function public.worker_album_draw(p_user uuid, p_wing text, p_n int, p_force_new boolean) returns text[]
language plpgsql security definer set search_path = public as $$
declare v_out text[] := '{}'; v_new text;
begin
  if p_force_new then
    select s.id into v_new from public.worker_album_sticker s
      where s.club = p_wing and s.active
        and not exists (select 1 from public.worker_album_copy c where c.user_id = p_user and c.sticker_id = s.id and c.copies > 0)
      order by random() limit 1;
    if v_new is not null then v_out := array[v_new]; end if;
  end if;
  select v_out || coalesce(array_agg(id), '{}') into v_out from (
    select s.id from public.worker_album_sticker s
     where s.club = p_wing and s.active and not (s.id = any(v_out))
     order by random() limit greatest(p_n - coalesce(array_length(v_out, 1), 0), 0)) x;
  return v_out;
end $$;

-- open one envelope: draw, give, record (idempotent through the unique (user, day, kind, seq))
create or replace function public.worker_album_issue(p_user uuid, p_kind text, p_seq int, p_wing text, p_force_new boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ids text[]; v_var text[] := '{}'; v_fresh boolean[] := '{}'; v_id text; v_v text; v_env uuid; v_day date := public.worker_album_today();
begin
  v_ids := public.worker_album_draw(p_user, p_wing, 2, p_force_new);
  if coalesce(array_length(v_ids, 1), 0) = 0 then return jsonb_build_object('ok', false, 'error', 'This wing has no stickers yet.'); end if;
  foreach v_id in array v_ids loop
    v_v := public.worker_album_variant();
    v_var := v_var || v_v;
    v_fresh := v_fresh || public.worker_album_give(p_user, v_id, v_v);
  end loop;
  insert into public.worker_album_envelope (user_id, day, kind, seq, wing, stickers, variants, fresh)
  values (p_user, v_day, p_kind, p_seq, p_wing, v_ids, v_var, v_fresh)
  returning id into v_env;
  return jsonb_build_object('ok', true, 'envelope', v_env, 'stickers', v_ids, 'variants', v_var, 'fresh', v_fresh);
end $$;

-- ------------------------------------------------------------------ what the fan calls
-- the fan's album: book, copies, today's state
create or replace function public.worker_album_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_book public.worker_album_book; v_today date := public.worker_album_today();
begin
  select * into v_book from public.worker_album_book where user_id = v_user;
  if not found then return jsonb_build_object('ok', true, 'book', null, 'today', v_today); end if;
  return jsonb_build_object('ok', true, 'today', v_today,
    'book', jsonb_build_object('wing', v_book.wing, 'cover', v_book.cover, 'picks', v_book.picks, 'weekDays', case when v_book.week_start = date_trunc('week', v_today)::date then v_book.week_days else 0 end,
      'claimedToday', v_book.last_day = v_today, 'envelopes', v_book.envelopes, 'since', v_book.created_at),
    'copies', coalesce((select jsonb_agg(jsonb_build_array(sticker_id, copies, stuck, best)) from public.worker_album_copy where user_id = v_user and copies > 0), '[]'::jsonb),
    'waiting', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'stickers', stickers, 'variants', variants, 'fresh', fresh) order by created_at)
                          from public.worker_album_envelope where user_id = v_user and opened_at is null), '[]'::jsonb));
end $$;

-- open the album: the wing, the cover, and three starter envelopes
create or replace function public.worker_album_start(p_wing text, p_cover jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); i int;
begin
  if not exists (select 1 from public.worker_album_sticker where club = p_wing and active) then return jsonb_build_object('ok', false, 'error', 'That wing is not in the album yet.'); end if;
  if pg_column_size(p_cover) > 2048 then return jsonb_build_object('ok', false, 'error', 'The cover is too large.'); end if;
  insert into public.worker_album_book (user_id, wing, cover) values (v_user, p_wing, coalesce(p_cover, '{}'::jsonb))
  on conflict (user_id) do nothing;
  if not found then return public.worker_album_me(); end if;
  for i in 1..3 loop perform public.worker_album_issue(v_user, 'starter', i, p_wing, true); end loop;
  update public.worker_album_book set envelopes = envelopes + 3 where user_id = v_user;
  return public.worker_album_me();
end $$;

-- change the wing the next envelope comes from
create or replace function public.worker_album_wing(p_wing text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid();
begin
  if not exists (select 1 from public.worker_album_sticker where club = p_wing and active) then return jsonb_build_object('ok', false, 'error', 'That wing is not in the album yet.'); end if;
  update public.worker_album_book set wing = p_wing where user_id = v_user;
  if not found then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  return jsonb_build_object('ok', true, 'wing', p_wing);
end $$;

-- today's envelope (one per Athens day; a second call the same day returns the same envelope)
create or replace function public.worker_album_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_book public.worker_album_book; v_today date := public.worker_album_today();
        v_week date := date_trunc('week', v_today)::date; v_have int; v_total int; v_force boolean; v_res jsonb;
begin
  select * into v_book from public.worker_album_book where user_id = v_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  if v_book.last_day = v_today then
    return jsonb_build_object('ok', true, 'already', true, 'envelope', (select to_jsonb(e) - 'user_id' from public.worker_album_envelope e where user_id = v_user and day = v_today and kind = 'daily' and seq = 0));
  end if;
  select count(*) into v_total from public.worker_album_sticker where club = v_book.wing and active;
  select count(*) into v_have from public.worker_album_copy c join public.worker_album_sticker s on s.id = c.sticker_id where c.user_id = v_user and s.club = v_book.wing and c.copies > 0;
  v_force := v_book.pity >= 4 and v_have < v_total;
  v_res := public.worker_album_issue(v_user, 'daily', 0, v_book.wing, v_force);
  if not (v_res->>'ok')::boolean then return v_res; end if;
  update public.worker_album_book set
    last_day = v_today, envelopes = envelopes + 1,
    pity = case when true = any(array(select jsonb_array_elements_text(v_res->'fresh')::boolean)) then 0 else least(pity + 1, 10) end,
    week_days = case when week_start = v_week then week_days + 1 else 1 end,
    week_paid = case when week_start = v_week then week_paid else false end,
    week_start = v_week
  where user_id = v_user returning * into v_book;
  if v_book.week_days >= 5 and not v_book.week_paid then
    update public.worker_album_book set picks = least(picks + 1, 20), week_paid = true where user_id = v_user;
    v_res := v_res || jsonb_build_object('pickEarned', true);
  end if;
  return v_res;
end $$;

-- mark an envelope opened (the tear has been played)
create or replace function public.worker_album_opened(p_envelope uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid();
begin
  update public.worker_album_envelope set opened_at = coalesce(opened_at, now()) where id = p_envelope and user_id = v_user;
  return jsonb_build_object('ok', found);
end $$;

-- stick a sticker you hold into its slot
create or replace function public.worker_album_stick(p_sticker text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid();
begin
  update public.worker_album_copy set stuck = true where user_id = v_user and sticker_id = p_sticker and copies > 0;
  if not found then return jsonb_build_object('ok', false, 'error', 'You do not hold that sticker yet.'); end if;
  return jsonb_build_object('ok', true, 'sticker', p_sticker);
end $$;

-- spend a weekly pick token on one missing sticker of the fan's choice
create or replace function public.worker_album_pick(p_sticker text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_book public.worker_album_book;
begin
  select * into v_book from public.worker_album_book where user_id = v_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  if v_book.picks < 1 then return jsonb_build_object('ok', false, 'error', 'No pick to spend — five collecting days in a week earn one.'); end if;
  if not exists (select 1 from public.worker_album_sticker where id = p_sticker and active) then return jsonb_build_object('ok', false, 'error', 'No such sticker.'); end if;
  if exists (select 1 from public.worker_album_copy where user_id = v_user and sticker_id = p_sticker and copies > 0) then return jsonb_build_object('ok', false, 'error', 'You already hold that sticker.'); end if;
  perform public.worker_album_give(v_user, p_sticker, 'base');
  update public.worker_album_book set picks = picks - 1 where user_id = v_user;
  return jsonb_build_object('ok', true, 'sticker', p_sticker);
end $$;

-- the trade-in desk: five spare copies (beyond the one in the album) for one missing sticker of choice
create or replace function public.worker_album_trade(p_give text[], p_want text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_id text; v_need int := 5; v_spare int;
begin
  if p_give is null or array_length(p_give, 1) <> 5 then return jsonb_build_object('ok', false, 'error', 'Give exactly five spare copies.'); end if;
  if not exists (select 1 from public.worker_album_sticker where id = p_want and active) then return jsonb_build_object('ok', false, 'error', 'No such sticker.'); end if;
  if exists (select 1 from public.worker_album_copy where user_id = v_user and sticker_id = p_want and copies > 0) then return jsonb_build_object('ok', false, 'error', 'You already hold that sticker.'); end if;
  -- every copy given must be a spare: the fan keeps at least one of each
  for v_id in select unnest(p_give) group by 1 loop
    select copies - 1 into v_spare from public.worker_album_copy where user_id = v_user and sticker_id = v_id for update;
    if coalesce(v_spare, 0) < (select count(*) from unnest(p_give) g where g = v_id) then
      return jsonb_build_object('ok', false, 'error', 'Only spare copies can be traded in — one of each stays in your album.');
    end if;
  end loop;
  update public.worker_album_copy c set copies = c.copies - g.n
    from (select x as id, count(*)::smallint n from unnest(p_give) x group by x) g
   where c.user_id = v_user and c.sticker_id = g.id;
  perform public.worker_album_give(v_user, p_want, 'base');
  insert into public.worker_album_envelope (user_id, day, kind, seq, wing, stickers, variants, fresh)
  values (v_user, public.worker_album_today(), 'trade', (select count(*) from public.worker_album_envelope where user_id = v_user and day = public.worker_album_today() and kind = 'trade'),
          split_part(p_want, ':', 1), array[p_want], array['base'], array[true]);
  return jsonb_build_object('ok', true, 'sticker', p_want);
end $$;

-- ------------------------------------------------------------------ the service role
-- the catalog: replace one club's edition from the curated list (rows: [{slot,page,person_id,record_id,name}])
create or replace function public.worker_album_catalog_sync(p_club text, p_edition int, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into public.worker_album_sticker as s (id, club, edition, slot, page, person_id, record_id, name, active, updated_at)
  select p_club || ':' || (r->>'slot'), p_club, p_edition, (r->>'slot')::smallint, (r->>'page')::smallint, r->>'person_id', r->>'record_id', r->>'name', true, now()
    from jsonb_array_elements(p_rows) r
  on conflict (id) do update set page = excluded.page, person_id = excluded.person_id, record_id = excluded.record_id, name = excluded.name, active = true, updated_at = now();
  get diagnostics v_n = row_count;
  update public.worker_album_sticker set active = false, updated_at = now()
   where club = p_club and edition = p_edition and slot not in (select (r->>'slot')::smallint from jsonb_array_elements(p_rows) r);
  return jsonb_build_object('ok', true, 'club', p_club, 'rows', v_n);
end $$;

-- a bonus envelope the server grants after verifying a Daily streak (one per fan per Athens week)
create or replace function public.worker_album_grant_bonus(p_user uuid, p_week date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_wing text;
begin
  select wing into v_wing from public.worker_album_book where user_id = p_user;
  if v_wing is null then return jsonb_build_object('ok', false, 'error', 'no album'); end if;
  if exists (select 1 from public.worker_album_envelope where user_id = p_user and kind = 'bonus' and day >= p_week and day < p_week + 7) then return jsonb_build_object('ok', true, 'already', true); end if;
  return public.worker_album_issue(p_user, 'bonus', 0, v_wing, false);
end $$;

-- the catalog a page draws (public facts only: names and slots, no person beyond the id)
create or replace function public.worker_album_catalog(p_club text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_array(id, club, slot, page, person_id, name) order by club, slot), '[]'::jsonb)
    from public.worker_album_sticker where active and edition = 1 and (p_club is null or club = p_club) $$;

-- ------------------------------------------------------------------ grants: helpers to nobody, fan functions to signed-in fans, service functions to the service role
revoke all on function public.worker_album_today(), public.worker_album_uid(), public.worker_album_variant(), public.worker_album_give(uuid, text, text),
  public.worker_album_draw(uuid, text, int, boolean), public.worker_album_issue(uuid, text, int, text, boolean),
  public.worker_album_me(), public.worker_album_start(text, jsonb), public.worker_album_wing(text), public.worker_album_daily(), public.worker_album_opened(uuid),
  public.worker_album_stick(text), public.worker_album_pick(text), public.worker_album_trade(text[], text),
  public.worker_album_catalog_sync(text, int, jsonb), public.worker_album_grant_bonus(uuid, date), public.worker_album_catalog(text) from public, anon, authenticated;
grant execute on function public.worker_album_me(), public.worker_album_start(text, jsonb), public.worker_album_wing(text), public.worker_album_daily(),
  public.worker_album_opened(uuid), public.worker_album_stick(text), public.worker_album_pick(text), public.worker_album_trade(text[], text) to authenticated;
grant execute on function public.worker_album_catalog(text) to anon, authenticated;
grant execute on function public.worker_album_catalog_sync(text, int, jsonb), public.worker_album_grant_bonus(uuid, date) to service_role;

-- retention: an envelope row is history only; after 60 days the copies already hold what it gave
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'marketing:album-envelopes-sweep';
    perform cron.schedule('marketing:album-envelopes-sweep', '37 3 * * *',
      $q$delete from public.worker_album_envelope where created_at < now() - interval '60 days' and opened_at is not null$q$);
  end if;
end $$;
