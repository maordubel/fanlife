-- THE SHIRT HUB — contributions (privacy plan, stage C).
-- A photo is the owner's. Using it for anything beyond their own listing needs a separate, revocable yes, per photo:
--   archive use (the editors may reuse it in the club archive) · marketing use · how to be credited (none / anonymous / nickname).
-- No row = no consent. Withdrawing archive use takes the photo out of review at once. Editors see an opaque path, the club, the
-- season and the consent — never who uploaded it.
-- Everything is worker_-prefixed; nothing on auth.

create table if not exists public.worker_photo_consent (
  photo_id      uuid primary key references public.worker_collector_photo(id) on delete cascade,
  archive_use   boolean not null default false,
  marketing_use boolean not null default false,
  credit        text not null default 'none' check (credit in ('none', 'anonymous', 'nickname')),
  review        text not null default 'none' check (review in ('none', 'pending', 'approved', 'rejected')),
  review_note   text check (review_note is null or char_length(review_note) <= 300),
  decided_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);
alter table public.worker_photo_consent enable row level security;
revoke all on public.worker_photo_consent from public, anon, authenticated;

/* Append-only record of every decision (a withdrawal is a row, not a deletion). No FK: it outlives the photo. */
create table if not exists public.worker_photo_consent_log (
  id            bigserial primary key,
  photo_id      uuid not null,
  archive_use   boolean not null,
  marketing_use boolean not null,
  credit        text not null,
  at            timestamptz not null default now()
);
alter table public.worker_photo_consent_log enable row level security;
revoke all on public.worker_photo_consent_log from public, anon, authenticated;

create or replace function public.worker_photo_consent_log_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.worker_photo_consent_log (photo_id, archive_use, marketing_use, credit)
  values (new.photo_id, new.archive_use, new.marketing_use, new.credit);
  return new;
end $$;
drop trigger if exists worker_photo_consent_log_t on public.worker_photo_consent;
create trigger worker_photo_consent_log_t after insert or update of archive_use, marketing_use, credit
  on public.worker_photo_consent for each row execute function public.worker_photo_consent_log_trg();

-- ---------------------------------------------------------------- the owner
create or replace function public.worker_photo_consent_set(p_photo uuid, p_archive boolean, p_marketing boolean, p_credit text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_old public.worker_photo_consent;
  v_credit text := coalesce(p_credit, 'none');
  v_review text;
begin
  if v_me is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return public.worker_fail('not_signed_in'); end if;
  if v_credit not in ('none', 'anonymous', 'nickname') then return public.worker_fail('bad_credit'); end if;
  if not exists (select 1 from public.worker_collector_photo where id = p_photo and user_id = v_me) then
    return public.worker_fail('not_yours');
  end if;
  if not public.worker_rate_ok(v_me, 'photo_consent', 200, interval '1 hour') then return public.worker_fail('slow_down'); end if;
  if v_credit = 'nickname' and not exists (
       select 1 from public.worker_collector_profile c where c.user_id = v_me and c.identity_mode = 'nickname' and c.public_nickname is not null) then
    return public.worker_fail('credit_needs_nickname');
  end if;
  -- credit only means something when a use was granted
  if not (coalesce(p_archive, false) or coalesce(p_marketing, false)) then v_credit := 'none'; end if;

  select * into v_old from public.worker_photo_consent where photo_id = p_photo;
  v_review := case
    when not coalesce(p_archive, false) then 'none'
    when v_old.review in ('approved', 'rejected') then v_old.review
    else 'pending' end;

  insert into public.worker_photo_consent as c (photo_id, archive_use, marketing_use, credit, review, decided_at, reviewed_at, review_note)
  values (p_photo, coalesce(p_archive, false), coalesce(p_marketing, false), v_credit, v_review, now(), null, null)
  on conflict (photo_id) do update set
    archive_use = excluded.archive_use, marketing_use = excluded.marketing_use, credit = excluded.credit,
    review = excluded.review, decided_at = now(),
    reviewed_at = case when excluded.review = 'none' then null else c.reviewed_at end,
    review_note = case when excluded.review = 'none' then null else c.review_note end;
  return jsonb_build_object('ok', true, 'review', v_review);
end $$;

/* Everything the owner has put forward, one row per photo. Paths are opaque; the owner may see their own. */
create or replace function public.worker_contributions_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then return public.worker_fail('not_signed_in'); end if;
  return jsonb_build_object('ok', true, 'photos', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'path', p.storage_path, 'itemId', i.id,
      'club', coalesce(l.name, i.club_label, i.archive_slug), 'season', i.season_label,
      'archiveUse', coalesce(c.archive_use, false), 'marketingUse', coalesce(c.marketing_use, false),
      'credit', coalesce(c.credit, 'none'), 'review', coalesce(c.review, 'none'),
      'decidedAt', c.decided_at) order by p.created_at desc)
      from public.worker_collector_photo p
      join public.worker_collector_item i on i.id = p.item_id
      left join public.worker_club_library l on l.key = i.club_key
      left join public.worker_photo_consent c on c.photo_id = p.id
     where p.user_id = v_me and public.worker_photo_is_opaque(p.storage_path)), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- the editors
create or replace function public.worker_admin_contribution_queue(p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  if p_status not in ('pending', 'approved', 'rejected') then return public.worker_fail('bad_status'); end if;
  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'path', p.storage_path,
      'club', coalesce(l.name, i.club_label, i.archive_slug), 'season', i.season_label, 'variant', i.variant,
      'marketingUse', c.marketing_use,
      'credit', case c.credit
                  when 'nickname' then (select k.public_nickname from public.worker_collector_profile k
                                         where k.user_id = p.user_id and k.identity_mode = 'nickname')
                  when 'anonymous' then 'A collector'
                  else null end,
      'note', c.review_note, 'decidedAt', c.decided_at) order by c.decided_at)
      from public.worker_photo_consent c
      join public.worker_collector_photo p on p.id = c.photo_id
      join public.worker_collector_item i on i.id = p.item_id
      left join public.worker_club_library l on l.key = i.club_key
     where c.archive_use and c.review = p_status), '[]'::jsonb));
end $$;

create or replace function public.worker_admin_contribution_review(p_photo uuid, p_status text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  if p_status not in ('approved', 'rejected', 'pending') then return public.worker_fail('bad_status'); end if;
  if p_status = 'rejected' and coalesce(btrim(p_note), '') = '' then return public.worker_fail('note_required'); end if;
  update public.worker_photo_consent
     set review = p_status, review_note = nullif(left(btrim(coalesce(p_note, '')), 300), ''), reviewed_at = now()
   where photo_id = p_photo and archive_use;
  if not found then return public.worker_fail('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

/* Two library entries that are the same club. Items move over, the old name stays findable as an alias. */
create or replace function public.worker_admin_club_merge(p_from text, p_to text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_from public.worker_club_library; v_to public.worker_club_library; v_moved int;
begin
  if not public.worker_is_admin() then return public.worker_fail('forbidden'); end if;
  if p_from = p_to then return public.worker_fail('same_club'); end if;
  select * into v_from from public.worker_club_library where key = p_from;
  select * into v_to from public.worker_club_library where key = p_to;
  if v_from.key is null or v_to.key is null then return public.worker_fail('not_found'); end if;
  if v_to.merged_into is not null or v_from.merged_into is not null then return public.worker_fail('already_merged'); end if;
  update public.worker_collector_item set club_key = p_to where club_key = p_from;
  get diagnostics v_moved = row_count;
  update public.worker_club_library set aliases = (
      select coalesce(array_agg(distinct a), '{}') from unnest(aliases || v_from.aliases || array[v_from.name]) a
       where lower(a) <> lower(v_to.name))
   where key = p_to;
  update public.worker_club_library set merged_into = p_to where key = p_from;
  return jsonb_build_object('ok', true, 'moved', v_moved);
end $$;

-- ---------------------------------------------------------------- grants
do $grants$
declare v_fn record;
begin
  for v_fn in
    select p.oid::regprocedure::text as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in (
       'worker_photo_consent_log_trg', 'worker_photo_consent_set', 'worker_contributions_mine',
       'worker_admin_contribution_queue', 'worker_admin_contribution_review', 'worker_admin_club_merge')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn.sig);
    if v_fn.proname <> 'worker_photo_consent_log_trg' then
      execute format('grant execute on function %s to authenticated', v_fn.sig);
    end if;
  end loop;
end
$grants$;

select 'contributions_tables ' || (select count(*) from pg_tables where schemaname = 'public' and tablename like 'worker_photo_consent%')
    || ' · anon_can_run ' || (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ('worker_photo_consent_set','worker_contributions_mine','worker_admin_contribution_queue','worker_admin_contribution_review','worker_admin_club_merge')
           and has_function_privilege('anon', p.oid, 'execute')) as report;
