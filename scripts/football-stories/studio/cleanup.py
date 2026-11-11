"""Remove per-production Actions caches before acknowledging the durable media cleanup queue, and ask the studio to
remove the big files of films YouTube already has (op trim, lib/stories/trim.ts)."""
import json
import os
import re
import subprocess
import urllib.request

# Cloudflare sits in front of the site (11.11.2026) and refuses Python's default agent with error 1010.
UA = 'Mozilla/5.0 (compatible; FanLife-Studio/1.0; +https://fanlife.dubelteam.com)'


def call(op, **data):
    request = urllib.request.Request(os.environ['STORIES_URL'].rstrip('/') + '/api/master/stories/worker',
        json.dumps({'op': op, 'worker': 'cleanup-' + os.environ.get('GITHUB_RUN_ID', 'listener'), **data}).encode(),
        {'Authorization': 'Bearer ' + os.environ['FAN_LIFE_CRON_SECRET'], 'Content-Type': 'application/json',
         'User-Agent': UA})
    with urllib.request.urlopen(request, timeout=40) as response:
        return json.load(response)


def cache_ids(job_id):
    if not re.fullmatch(r'[a-z0-9-]{8,64}', job_id):
        raise ValueError('Invalid production id')
    found, page = [], 1
    while True:
        raw = subprocess.check_output(['gh', 'api', f'repos/{os.environ["GH_REPO"]}/actions/caches?key=stories-{job_id}-&per_page=100&page={page}'], timeout=40)
        rows = json.loads(raw)['actions_caches']
        found.extend(row['id'] for row in rows if re.fullmatch(r'stories-' + re.escape(job_id) + r'-[0-9]+', row['key']))
        if len(rows) < 100:
            return found
        page += 1


def trim():
    try:
        out = call('trim')
        for row in out.get('trimmed', []):
            print(f"Freed {row['bytes'] // 1048576} MB of a published film: {row['id']}", flush=True)
        for job_id in out.get('failed', []):
            print(f'::warning::Trim will retry: {job_id}', flush=True)
    except Exception as error:
        print(f'::warning::Trim will retry ({type(error).__name__})', flush=True)


def run():
    trim()
    for job_id in call('cleanup_due')['ids']:
        try:
            for cache_id in cache_ids(job_id):
                subprocess.run(['gh', 'api', '--method', 'DELETE', f'repos/{os.environ["GH_REPO"]}/actions/caches/{int(cache_id)}'], check=True, timeout=40)
            call('cleanup_done', id=job_id)
            print(f'Deleted production storage: {job_id}', flush=True)
        except Exception as error:
            print(f'::warning::Production cleanup will retry: {job_id} ({type(error).__name__})', flush=True)


if __name__ == '__main__':
    run()
