-- FanLife: Football Stories (owner-only documentary studio, 2 Nov 2026).
-- A PRIVATE bucket for rendered films: previews, thumbnails, captions, packages and the master in 45 MB chunks
-- (the free plan's per-file cap is 50 MB). No policy is created on purpose: anon and authenticated can neither read
-- nor write; only the server (service role) signs short-lived upload links for the GitHub Actions worker and
-- download links for the owner's studio. Local to FAN LIFE (worker-* bucket prefix, like worker-collector).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('worker-stories', 'worker-stories', false, 52428800,
        array['video/mp4', 'image/jpeg', 'application/zip', 'application/json', 'text/vtt', 'application/x-subrip', 'application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

select 'worker-stories bucket' as check, public, file_size_limit from storage.buckets where id = 'worker-stories';
