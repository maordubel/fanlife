-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- A shirt sponsor can differ by competition within the same season.
--
-- Confirmed by Maor Harel for 2010/11: Keter appeared in the Champions League while
-- the league shirt carried Bonei HaTichon. A deal keyed only by season would have
-- forced one of those two facts out of the database.

alter table sponsor_deal add column if not exists competition_id uuid references competition(id);

comment on column sponsor_deal.competition_id is
  'Null = every competition that season. Set when a sponsor applied to one competition only.';

-- The natural key now carries the competition, so the two 2010/11 deals coexist.
comment on column sponsor_deal.natural_key is
  'club|sport|sponsor|placement|from|competition — competition included so a season can hold more than one deal.';

create index if not exists sponsor_deal_competition_idx on sponsor_deal (competition_id);

-- A resolved conflict keeps its history: who resolved it and on what basis.
alter table fact_conflict add column if not exists resolved_at timestamptz;

create or replace view v_dq_sponsor_gaps as
  select s.label as season, c.name_he as competition
  from season s
  cross join competition c
  where c.sport = 'football'
    and c.type in ('league', 'europe')
    and not exists (
      select 1 from sponsor_deal d
      where d.from_label = s.label
        and (d.competition_id is null or d.competition_id = c.id)
    );
