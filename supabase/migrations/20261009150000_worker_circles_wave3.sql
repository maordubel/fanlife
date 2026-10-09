-- =====================================================================
-- THE SHIRT HUB — Wave 3: circles, the pipe, a place of your own, "what shirt is this?"
-- Everything here starts with worker_ (shared Supabase project with DUBID — rule 89); nothing touches auth.
-- Runs AFTER 20261009120000_worker_deal_wave2.sql. Idempotent: the verify script runs it twice.
--
--  1. worker_place_set / worker_place_mine — which country and city you are in. OPT-IN: until you choose
--     to show it, your place is used for nothing and nobody can see it.
--  2. circles — a club, a country or a city. Not a chat, not a feed: a way to look at the same market.
--     worker_circle_set / worker_circles_mine follow them; worker_circle_overview counts what is in one.
--  3. worker_pipe — what the market has for YOU: shirts you asked for, requests your shirts answer,
--     what is new in the circles you follow. Every row says in words how it reaches you.
--  4. identification help — a photo of a shirt nobody can name, and proposals from people who can.
-- =====================================================================

-- ---------------------------------------------------------------- 0. keys
create or replace function public.worker_circle_key_ok(p_kind text, p_key text) returns boolean
language sql immutable as $$
  select case p_kind
    when 'club' then coalesce(p_key ~ '^[a-z0-9]{2,30}$', false)
    when 'country' then coalesce(p_key ~ '^[A-Z]{2}$', false)
    when 'city' then coalesce(p_key ~ '^[a-z0-9-]{1,40}$', false)
    else false end
$$;

/* a city's key: its latin letters and digits, or — for a name in another script — a short stable hash */
create or replace function public.worker_city_key(p_city text) returns text
language sql immutable as $$
  select case
    when nullif(trim(both '-' from regexp_replace(lower(coalesce(p_city, '')), '[^a-z0-9]+', '-', 'g')), '') is not null
      then left(trim(both '-' from regexp_replace(lower(p_city), '[^a-z0-9]+', '-', 'g')), 40)
    else 'c' || substr(md5(lower(trim(coalesce(p_city, '')))), 1, 8) end
$$;

-- ---------------------------------------------------------------- 1. place
create or replace function public.worker_place_set(p_country text, p_city text default null, p_show boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_country text := nullif(upper(trim(coalesce(p_country, ''))), '');
  v_city text := nullif(left(trim(coalesce(p_city, '')), 40), '');
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then return public.worker_fail('bad_value'); end if;
  if v_country is null then v_city := null; end if;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'place_set', 20, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  update public.worker_collector_profile
     set country = v_country, city = v_city,
         city_key = case when v_city is null then null else public.worker_city_key(v_city) end,
         show_place = (v_country is not null and coalesce(p_show, true))
   where user_id = v_me;
  return public.worker_place_mine();
end $$;

create or replace function public.worker_place_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  c public.worker_collector_profile;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into c from public.worker_collector_profile where user_id = v_me;
  return jsonb_build_object('ok', true, 'country', c.country, 'city', c.city, 'cityKey', c.city_key,
                            'show', coalesce(c.show_place, false));
end $$;

-- ---------------------------------------------------------------- 2. circles
create table if not exists public.worker_collector_circle (
  user_id    uuid not null references public.worker_profile(id) on delete cascade,
  kind       text not null check (kind in ('club', 'country', 'city')),
  key        text not null check (key ~ '^[A-Za-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);
alter table public.worker_collector_circle enable row level security;
revoke all on public.worker_collector_circle from public, anon, authenticated;

create or replace function public.worker_circle_set(p_kind text, p_key text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_circle_key_ok(p_kind, p_key) then return public.worker_fail('bad_value'); end if;
  perform public.worker_collector_touch(v_me);
  if coalesce(p_on, true) then
    if not exists (select 1 from public.worker_collector_circle where user_id = v_me and kind = p_kind and key = p_key)
       and (select count(*) from public.worker_collector_circle where user_id = v_me) >= 30 then
      return public.worker_fail('too_many');
    end if;
    insert into public.worker_collector_circle (user_id, kind, key) values (v_me, p_kind, p_key) on conflict do nothing;
  else
    delete from public.worker_collector_circle where user_id = v_me and kind = p_kind and key = p_key;
  end if;
  return public.worker_circles_mine();
end $$;

create or replace function public.worker_circles_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'circles', coalesce((
    select jsonb_agg(jsonb_build_object('kind', k.kind, 'key', k.key) order by k.created_at)
      from public.worker_collector_circle k where k.user_id = v_me), '[]'::jsonb));
end $$;

/* the query that selects a circle's shirts — the same language the market and saved searches speak */
create or replace function public.worker_circle_query(p_kind text, p_key text) returns jsonb
language sql immutable as $$
  select case p_kind
    when 'club' then jsonb_build_object('clubs', jsonb_build_array(p_key))
    when 'country' then jsonb_build_object('countries', jsonb_build_array(p_key))
    when 'city' then jsonb_build_object('cities', jsonb_build_array(p_key))
    else '{}'::jsonb end
$$;

/* what is in a circle: counts only, never people. Anyone may look. */
create or replace function public.worker_circle_overview(p_kind text, p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_q jsonb;
  v_label text;
  v_shirts integer;
  v_week integer;
  v_people integer;
  v_wanted integer;
  v_top jsonb;
begin
  if not public.worker_circle_key_ok(p_kind, p_key) then return public.worker_fail('bad_value'); end if;
  v_q := public.worker_market_q(public.worker_circle_query(p_kind, p_key));
  if p_kind = 'city' then
    select max(c.city) into v_label from public.worker_collector_profile c where c.show_place and c.city_key = p_key;
  end if;

  select count(*), count(*) filter (where coalesce(i.opened_at, 'epoch'::timestamptz) > now() - interval '7 days'),
         count(distinct i.user_id)
    into v_shirts, v_week, v_people
    from public.worker_collector_item i
   where public.worker_item_visible(i, v_me) and public.worker_item_matches(i, v_q);

  select count(*) into v_wanted
    from public.worker_collector_want w
   where w.public_request and (v_me is null or not public.worker_blocked(v_me, w.user_id))
     and case p_kind
           when 'club' then public.worker_slug_club(w.archive_slug) = p_key
           when 'country' then exists (select 1 from public.worker_collector_profile c where c.user_id = w.user_id and c.show_place and c.country = p_key)
           else exists (select 1 from public.worker_collector_profile c where c.user_id = w.user_id and c.show_place and c.city_key = p_key)
         end;

  select coalesce(jsonb_agg(jsonb_build_object('slug', t.slug, 'count', t.n) order by t.n desc, t.slug), '[]'::jsonb) into v_top
    from (select i.archive_slug slug, count(*) n from public.worker_collector_item i
           where public.worker_item_visible(i, v_me) and public.worker_item_matches(i, v_q)
           group by i.archive_slug order by count(*) desc, i.archive_slug limit 6) t;

  return jsonb_build_object('ok', true, 'kind', p_kind, 'key', p_key, 'label', v_label,
    'shirts', v_shirts, 'newThisWeek', v_week, 'people', v_people, 'wanted', v_wanted, 'top', v_top,
    'following', v_me is not null and exists (select 1 from public.worker_collector_circle k where k.user_id = v_me and k.kind = p_kind and k.key = p_key));
end $$;

-- ---------------------------------------------------------------- 3. the pipe
/* how a copy reaches a viewer, in words the screen can print. Never a score.
   sameCity / sameCountry / crossBorder only when BOTH sides chose to show a place; reaches is null while the viewer has none. */
create or replace function public.worker_item_route(i public.worker_collector_item, p_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select c.country, c.city_key from public.worker_collector_profile c where c.user_id = p_me and c.show_place),
       them as (select c.country, c.city_key from public.worker_collector_profile c where c.user_id = i.user_id and c.show_place)
  select jsonb_build_object(
    'sameCity', coalesce((select m.city_key is not null and m.city_key = t.city_key and m.country = t.country from me m, them t), false),
    'sameCountry', coalesce((select m.country = t.country from me m, them t), false),
    'crossBorder', coalesce((select m.country <> t.country from me m, them t), false),
    'reaches', case when exists (select 1 from me) then public.worker_item_reaches(i, (select country from me)) end,
    'delivery', i.delivery)
$$;

create or replace function public.worker_pipe() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_found jsonb;
  v_answers jsonb;
  v_clubs jsonb;
  v_help integer;
  v_place jsonb;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;

  -- 1. shirts others hold that match something I asked for — nearest first, then newest
  select coalesce(jsonb_agg(z.row_j order by z.rank_city desc, z.rank_country desc, z.opened desc), '[]'::jsonb)
    into v_found
  from (
    select d.rank_city, d.rank_country, d.opened,
           public.worker_item_public(d.i) || jsonb_build_object(
             'mine', false, 'wantId', d.want_id, 'route', d.route) row_j
      from (
        select distinct on (i.id) i, w.id want_id,
               coalesce(i.opened_at, 'epoch'::timestamptz) opened,
               public.worker_item_route(i, v_me) route,
               coalesce((public.worker_item_route(i, v_me) ->> 'sameCity')::boolean, false) rank_city,
               coalesce((public.worker_item_route(i, v_me) ->> 'sameCountry')::boolean, false) rank_country
          from public.worker_collector_want w
          join public.worker_collector_item i
            on public.worker_same_shirt(w.archive_slug, w.kit_id, i.archive_slug, i.kit_id)
           and i.user_id <> v_me and public.worker_item_visible(i, v_me)
           and (w.preferred_size is null or i.size = w.preferred_size)
           and (w.mode = 'any' or (w.mode = 'buy' and i.for_sale) or (w.mode = 'trade' and i.for_trade))
           and (w.max_price is null or i.asking_price is null or i.currency <> w.currency or i.asking_price <= w.max_price)
         where w.user_id = v_me
         order by i.id, w.created_at) d
     order by d.rank_city desc, d.rank_country desc, d.opened desc
     limit 20) z;

  -- 2. public requests that one of MY copies would answer
  select coalesce(jsonb_agg(y.row_j order by y.created_at desc), '[]'::jsonb) into v_answers
  from (
    select w.created_at,
           jsonb_build_object(
             'id', w.id, 'archiveSlug', w.archive_slug, 'kitId', w.kit_id, 'size', w.preferred_size,
             'mode', w.mode, 'delivery', w.delivery, 'note', w.public_note, 'createdAt', w.created_at,
             'requester', public.worker_collector_label(w.user_id), 'mine', false,
             'myMatches', (select jsonb_agg(mi.id) from (
                select i2.id from public.worker_collector_item i2
                 where i2.user_id = v_me and i2.state = 'held' and (i2.for_sale or i2.for_trade)
                   and public.worker_same_shirt(w.archive_slug, w.kit_id, i2.archive_slug, i2.kit_id)
                   and (w.preferred_size is null or i2.size = w.preferred_size) limit 3) mi)) row_j
      from public.worker_collector_want w
     where w.public_request and w.user_id <> v_me and not public.worker_blocked(v_me, w.user_id)
       and exists (select 1 from public.worker_collector_item i2
                    where i2.user_id = v_me and i2.state = 'held' and (i2.for_sale or i2.for_trade)
                      and public.worker_same_shirt(w.archive_slug, w.kit_id, i2.archive_slug, i2.kit_id)
                      and (w.preferred_size is null or i2.size = w.preferred_size))
     order by w.created_at desc limit 12) y;

  -- 3. what is new (14 days) in the club circles I follow
  select coalesce(jsonb_object_agg(k.key, (
           select count(*) from public.worker_collector_item i
            where i.user_id <> v_me and public.worker_item_visible(i, v_me)
              and public.worker_slug_club(i.archive_slug) = k.key
              and coalesce(i.opened_at, 'epoch'::timestamptz) > now() - interval '14 days')), '{}'::jsonb)
    into v_clubs
    from public.worker_collector_circle k where k.user_id = v_me and k.kind = 'club';

  -- 4. open "what shirt is this?" questions I have not answered and did not ask
  select count(*) into v_help from public.worker_collector_idreq r
   where r.status = 'open' and r.user_id <> v_me and not public.worker_blocked(v_me, r.user_id)
     and not exists (select 1 from public.worker_collector_idprop p where p.req_id = r.id and p.user_id = v_me);

  v_place := public.worker_place_mine();
  return jsonb_build_object('ok', true, 'found', v_found, 'answers', v_answers, 'clubs', v_clubs, 'help', v_help,
    'place', jsonb_build_object('country', v_place -> 'country', 'city', v_place -> 'city', 'show', v_place -> 'show'));
end $$;

-- ---------------------------------------------------------------- 4. "what shirt is this?"
create table if not exists public.worker_collector_idreq (
  id          uuid primary key,
  user_id     uuid not null references public.worker_profile(id) on delete cascade,
  note        text check (note is null or char_length(note) <= 300),
  photos      text[] not null check (cardinality(photos) between 1 and 4),
  club_hint   text check (club_hint is null or club_hint ~ '^[a-z0-9]{2,30}$'),
  status      text not null default 'open' check (status in ('open', 'solved', 'closed')),
  solved_slug text check (solved_slug is null or solved_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  solved_by   uuid references public.worker_profile(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists worker_collector_idreq_open_idx on public.worker_collector_idreq (created_at desc, id desc) where status = 'open';
alter table public.worker_collector_idreq enable row level security;
revoke all on public.worker_collector_idreq from public, anon, authenticated;

create table if not exists public.worker_collector_idprop (
  id           uuid primary key default gen_random_uuid(),
  req_id       uuid not null references public.worker_collector_idreq(id) on delete cascade,
  user_id      uuid not null references public.worker_profile(id) on delete cascade,
  archive_slug text not null check (archive_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  kit_id       text check (kit_id is null or kit_id ~ '^kit-[0-9]{4}-[0-9]{2}-[a-z0-9-]{2,24}$'),
  note         text check (note is null or char_length(note) <= 200),
  created_at   timestamptz not null default now(),
  unique (req_id, user_id)
);
alter table public.worker_collector_idprop enable row level security;
revoke all on public.worker_collector_idprop from public, anon, authenticated;

/* ask. The id is made by the app first, because the photos are uploaded to <me>/<id>/<file> before this is called. */
create or replace function public.worker_idreq_open(p_id uuid, p_photos text[], p_note text default null, p_club text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_path text;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if p_id is null or p_photos is null or cardinality(p_photos) not between 1 and 4 then return public.worker_fail('bad_value'); end if;
  if p_club is not null and p_club !~ '^[a-z0-9]{2,30}$' then return public.worker_fail('bad_value'); end if;
  foreach v_path in array p_photos loop
    if v_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$'
       or split_part(v_path, '/', 1) <> v_me::text or split_part(v_path, '/', 2) <> p_id::text then
      return public.worker_fail('bad_path');
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'worker-collector' and o.name = v_path) then
      return public.worker_fail('not_uploaded');
    end if;
  end loop;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'idreq_open', 6, interval '1 day') then return public.worker_fail('slow_down'); end if;
  if (select count(*) from public.worker_collector_idreq where user_id = v_me and status = 'open') >= 5 then
    return public.worker_fail('too_many');
  end if;
  insert into public.worker_collector_idreq (id, user_id, note, photos, club_hint)
    values (p_id, v_me, nullif(trim(p_note), ''), p_photos, p_club)
    on conflict (id) do nothing;
  if not found then return public.worker_fail('exists'); end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;

create or replace function public.worker_idreq_row(r public.worker_collector_idreq, p_me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'note', r.note, 'photos', to_jsonb(r.photos), 'clubHint', r.club_hint, 'status', r.status,
    'solvedSlug', r.solved_slug, 'createdAt', r.created_at,
    'asker', public.worker_collector_label(r.user_id),
    'mine', r.user_id = p_me,
    'proposals', (select count(*) from public.worker_collector_idprop p where p.req_id = r.id),
    'iProposed', exists (select 1 from public.worker_collector_idprop p where p.req_id = r.id and p.user_id = p_me))
$$;

create or replace function public.worker_idreq_list(p_limit integer default 20, p_after_at timestamptz default null, p_after_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 40);
  v_rows jsonb;
  v_n integer;
  v_last_at timestamptz;
  v_last_id uuid;
  v_next jsonb := null;
begin
  select count(*), coalesce(jsonb_agg(public.worker_idreq_row(q, v_me) order by q.created_at desc, q.id desc), '[]'::jsonb)
    into v_n, v_rows
  from (select * from public.worker_collector_idreq r
         where r.status = 'open' and (v_me is null or not public.worker_blocked(v_me, r.user_id))
           and (p_after_id is null or (r.created_at, r.id) < (coalesce(p_after_at, 'epoch'::timestamptz), p_after_id))
         order by r.created_at desc, r.id desc limit v_limit) q;
  if v_n = v_limit then
    select r.created_at, r.id into v_last_at, v_last_id from public.worker_collector_idreq r
     where r.status = 'open' and (v_me is null or not public.worker_blocked(v_me, r.user_id))
       and (p_after_id is null or (r.created_at, r.id) < (coalesce(p_after_at, 'epoch'::timestamptz), p_after_id))
     order by r.created_at desc, r.id desc limit 1 offset v_limit - 1;
    if exists (select 1 from public.worker_collector_idreq r
                where r.status = 'open' and (v_me is null or not public.worker_blocked(v_me, r.user_id))
                  and (r.created_at, r.id) < (v_last_at, v_last_id)) then
      v_next := jsonb_build_object('at', v_last_at, 'id', v_last_id);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'requests', v_rows, 'next', v_next);
end $$;

create or replace function public.worker_idreq_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := public.worker_market_uid();
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  return jsonb_build_object('ok', true, 'requests', coalesce((
    select jsonb_agg(public.worker_idreq_row(r, v_me) order by r.created_at desc)
      from public.worker_collector_idreq r where r.user_id = v_me), '[]'::jsonb));
end $$;

/* one question. The asker sees every proposal; anyone else sees only their own. */
create or replace function public.worker_idreq_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  r public.worker_collector_idreq;
begin
  select * into r from public.worker_collector_idreq where id = p_id;
  if not found or (v_me is not null and public.worker_blocked(v_me, r.user_id)) then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'request', public.worker_idreq_row(r, v_me),
    'proposals', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'archiveSlug', p.archive_slug, 'kitId', p.kit_id, 'note', p.note,
                                          'createdAt', p.created_at, 'by', public.worker_collector_label(p.user_id),
                                          'mine', p.user_id = v_me)
                       order by p.created_at)
        from public.worker_collector_idprop p
       where p.req_id = r.id and (r.user_id = v_me or p.user_id = v_me)), '[]'::jsonb));
end $$;

create or replace function public.worker_idreq_propose(p_id uuid, p_slug text, p_kit text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  r public.worker_collector_idreq;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  if not public.worker_slug_ok(p_slug) then return public.worker_fail('bad_slug'); end if;
  if not public.worker_kit_ok(p_kit) then return public.worker_fail('bad_kit'); end if;
  select * into r from public.worker_collector_idreq where id = p_id;
  if not found or r.status <> 'open' or r.user_id = v_me or public.worker_blocked(v_me, r.user_id) then
    return public.worker_fail('not_found');
  end if;
  perform public.worker_collector_touch(v_me);
  if not public.worker_rate_ok(v_me, 'idreq_propose', 40, interval '1 day') then return public.worker_fail('slow_down'); end if;
  insert into public.worker_collector_idprop (req_id, user_id, archive_slug, kit_id, note)
    values (p_id, v_me, p_slug, p_kit, nullif(trim(p_note), ''))
    on conflict (req_id, user_id) do update set archive_slug = excluded.archive_slug, kit_id = excluded.kit_id, note = excluded.note;
  perform public.worker_notify(r.user_id, 'COLLECTOR_MESSAGE',
    jsonb_build_object('event', 'id_proposal', 'reqId', p_id, 'archiveSlug', p_slug), 'idp:' || p_id::text || ':' || v_me::text);
  return jsonb_build_object('ok', true);
end $$;

/* the asker picks the answer that fits (p_prop) — or closes the question without one (null) */
create or replace function public.worker_idreq_resolve(p_id uuid, p_prop uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.worker_market_uid();
  r public.worker_collector_idreq;
  p public.worker_collector_idprop;
begin
  if v_me is null then return public.worker_fail('auth_required'); end if;
  select * into r from public.worker_collector_idreq where id = p_id and user_id = v_me for update;
  if not found or r.status <> 'open' then return public.worker_fail('not_found'); end if;
  if p_prop is null then
    update public.worker_collector_idreq set status = 'closed', updated_at = now() where id = p_id;
    return jsonb_build_object('ok', true, 'status', 'closed');
  end if;
  select * into p from public.worker_collector_idprop where id = p_prop and req_id = p_id;
  if not found then return public.worker_fail('not_found'); end if;
  update public.worker_collector_idreq set status = 'solved', solved_slug = p.archive_slug, solved_by = p.user_id, updated_at = now()
   where id = p_id;
  perform public.worker_notify(p.user_id, 'COLLECTOR_MESSAGE',
    jsonb_build_object('event', 'id_solved', 'reqId', p_id, 'archiveSlug', p.archive_slug), 'ids:' || p_id::text);
  return jsonb_build_object('ok', true, 'status', 'solved', 'archiveSlug', p.archive_slug);
end $$;

-- ---------------------------------------------------------------- 5. grants (this file's functions only)
do $grants$
declare
  v_fn record;
  v_public text[] := array['worker_circle_overview', 'worker_idreq_list', 'worker_idreq_get'];
  v_member text[] := array['worker_place_set', 'worker_place_mine', 'worker_circle_set', 'worker_circles_mine', 'worker_pipe',
                           'worker_idreq_open', 'worker_idreq_mine', 'worker_idreq_propose', 'worker_idreq_resolve'];
  v_internal text[] := array['worker_circle_key_ok', 'worker_city_key', 'worker_circle_query', 'worker_item_route', 'worker_idreq_row'];
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = any(v_public || v_member || v_internal)
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname = any(v_public) then
      execute format('grant execute on function %s to anon, authenticated', v_fn.sig);
    elsif v_fn.proname = any(v_member) then
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
end
$grants$;
