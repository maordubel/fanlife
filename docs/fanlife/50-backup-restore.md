# Backup and restore (12.10.2026)

Owner's reliability plan §10. What is kept, where, and how to get it back.

## What runs
- `.github/workflows/backup.yml`, daily 02:41 UTC (and on demand: GitHub → Actions → Backup → Run workflow).
- It asks `GET /api/master/backup` (CRON_SECRET) for every row of every `worker_*` table plus `worker_fanlife_files`
  (control.json, desk packs, players, goals, research profiles, audit archive). Nothing of DUBID's is read (rule 89).
- The file is checked (header, end line), gzip'd and **encrypted with `FAN_LIFE_BACKUP_PASSPHRASE`** on the runner, the
  encrypted copy is decrypted once to prove it opens, and only the encrypted file is kept: an artifact on the run, 90 days.

## Not included
- Photos in the Storage buckets `worker-collector-pub` / `worker-collector` (the rows that point at them are included).
- Research runs and snapshots (`research-data/` is committed to the repo by `archive-collect.yml`).
- Browser-only data (Gate 4 collection, kit studio) — it lives on the fan's device by design.

## Setup (owner, once, clicks only)
GitHub → maordubel/fanlife → Settings → Secrets and variables → Actions → New repository secret →
name `FAN_LIFE_BACKUP_PASSPHRASE`, value a long passphrase (20+ characters). Keep a copy in a password manager:
**without it no backup can be opened**, and nobody can recover it.

## Restore
1. Actions → Backup → the run of the day you want → Artifacts → download.
2. Claude decrypts it (`openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000`) with the passphrase you give it in the session,
   compares with the live rows, and restores only what you approve — never blind over newer edits (plan §5.5).
