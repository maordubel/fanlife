"""Per-script Commons discovery: optional, bounded, cached, and never a source of historical claims.

Only explicitly public-domain / CC0 images are reused automatically. Other licences need review before their
obligations can be guaranteed in every exported social crop. Original sources and credits travel with the package.
"""
from __future__ import annotations
import hashlib
import html
import io
import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image
from .common import read_json, sha256_json, write_json

API = 'https://commons.wikimedia.org/w/api.php'
UA = 'FanLifeStudio/1.0 (https://github.com/maordubel/fanlife; documentary media discovery)'
MAX_BYTES = 12 * 1024 * 1024


def plain(value):
    return html.unescape(re.sub(r'<[^>]*>', ' ', str(value or ''))).strip()[:3000]


def normal(value):
    return ' '.join(re.findall(r'[^\W_]+', unicodedata.normalize('NFKD', plain(value)).casefold(), re.UNICODE))


def allowed_url(url):
    p = urllib.parse.urlparse(url)
    return p.scheme == 'https' and p.hostname in ('commons.wikimedia.org', 'upload.wikimedia.org') and not p.username and p.port in (None, 443)


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed_url(newurl):
            raise ValueError('Unexpected media redirect')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url, limit=MAX_BYTES):
    if not allowed_url(url):
        raise ValueError('Unexpected media URL')
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.build_opener(SafeRedirect()).open(request, timeout=12) as response:
        if int(response.headers.get('Content-Length') or 0) > limit:
            raise ValueError('Media too large')
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Media too large')
    return data


def queries(brief, ledger, script):
    """Named entities from this script's cited archive facts, not guessed search terms."""
    beats = [b for ch in script.get('chapters', []) for b in ch.get('beats', [])]
    ids = {cid for b in beats for cid in b.get('claim_ids', [])}
    ids.update(b.get('visual', {}).get('claim') for b in beats)
    ids.update(cid for b in beats for cid in b.get('visual', {}).get('claims', []))
    club = ledger.get('club_name') or brief.get('club_name') or ''
    year = str(ledger.get('season') or brief.get('season') or '')[:4]
    result = [{'entity': club, 'year': year, 'context': False}] if club and re.fullmatch(r'\d{4}', year) else []
    for claim in ledger.get('claims', []):
        if claim.get('id') not in ids:
            continue
        fact = claim.get('fact') or {}
        venue = fact.get('venue') or {}
        if isinstance(venue, dict) and venue.get('name'):
            result.append({'entity': venue['name'], 'context': True})
        for scorer in fact.get('scorers') or []:
            if scorer.get('name') and len(normal(scorer['name']).split()) >= 2:
                result.append({'entity': scorer['name'], 'context': True})
    seen, out = set(), []
    for q in result:
        q['entity'] = plain(q['entity'])[:100]
        key = (normal(q['entity']), q.get('year'))
        if key in seen or len(key[0]) < 5:
            continue
        seen.add(key)
        q['search'] = '"' + q['entity'].replace('"', '') + '"' + (' ' + q['year'] if q.get('year') else '')
        out.append(q)
    return out[:8]


def candidate(page, query):
    info = (page.get('imageinfo') or [{}])[0]
    meta = info.get('extmetadata') or {}
    value = lambda k: plain((meta.get(k) or {}).get('value'))
    title, description = plain(page.get('title')), value('ImageDescription')
    if normal(query['entity']) not in normal(title + ' ' + description):
        return None, 'unrelated'
    years = set(re.findall(r'\b(?:18|19|20)\d{2}\b', title + ' ' + description + ' ' + value('DateTimeOriginal')))
    if query.get('year') and query['year'] not in years:
        return None, 'undated-event'
    title_years = set(re.findall(r'\b(?:18|19|20)\d{2}\b', title))
    if query.get('year') and title_years and query['year'] not in title_years:
        return None, 'wrong-year'
    licence = value('LicenseShortName')
    if licence.casefold() not in ('public domain', 'cc0', 'cc0 1.0') or value('AttributionRequired').casefold() not in ('false', '0') or value('Restrictions'):
        return None, 'licence-review'
    if info.get('mime') not in ('image/jpeg', 'image/png', 'image/webp') or min(info.get('width', 0), info.get('height', 0)) < 480:
        return None, 'format-size'
    url = info.get('thumburl') or info.get('url') or ''
    if not allowed_url(url) or urllib.parse.urlparse(url).hostname != 'upload.wikimedia.org':
        return None, 'url'
    return {'pageid': int(page['pageid']), 'title': title, 'description': description, 'entity': query['entity'],
            'context': query['context'], 'date': value('DateTimeOriginal'), 'creator': value('Artist') or 'Not recorded',
            'licence': licence, 'licence_url': value('LicenseUrl'), 'source_url': f'https://commons.wikimedia.org/?curid={int(page["pageid"])}',
            'url': url, 'sha1': info.get('sha1'), 'required': False, 'origin': 'wikimedia-commons'}, None


def discover(brief, ledger, script, cache: Path, log=print):
    cache.mkdir(parents=True, exist_ok=True)
    qs = queries(brief, ledger, script)
    path = cache / ('search-' + sha256_json({'v': 1, 'script': script, 'queries': qs}) + '.json')
    if path.exists():
        saved = read_json(path)
        if time.time() - saved.get('checked_at', 0) < (86400 if saved.get('status') == 'complete' else 300):
            return saved
    report = {'status': 'complete', 'queries': qs, 'candidates': [], 'rejected': {}, 'checked_at': time.time()}
    if os.environ.get('STORIES_COMMONS', '1') == '0':
        return {**report, 'status': 'disabled'}
    seen, start = set(), time.monotonic()
    for q in qs:
        if time.monotonic() - start > 75:
            report['status'] = 'partial'
            break
        try:
            qp = cache / ('query-' + sha256_json(q) + '.json')
            if qp.exists() and time.time() - qp.stat().st_mtime < 86400:
                data = read_json(qp)
            else:
                params = {'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': q['search'], 'gsrlimit': 12,
                          'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata|sha1', 'iiurlwidth': 1600,
                          'format': 'json', 'formatversion': 2, 'maxlag': 5}
                data = json.loads(fetch(API + '?' + urllib.parse.urlencode(params), 2 * 1024 * 1024))
                if data.get('error'):
                    raise ValueError('Commons temporarily unavailable')
                write_json(qp, data)
            for page in data.get('query', {}).get('pages', []):
                row, reason = candidate(page, q)
                if reason:
                    report['rejected'][reason] = report['rejected'].get(reason, 0) + 1
                elif row['pageid'] not in seen:
                    seen.add(row['pageid']);report['candidates'].append(row)
        except Exception as error:
            report['status'] = 'partial'
            log(f'Commons: search unavailable ({type(error).__name__}); continuing with the production library')
    report['candidates'] = report['candidates'][:12]
    write_json(path, report)
    log(f'Commons: {len(report["candidates"])} relevant public-domain / CC0 images found; search {report["status"]}')
    return report


def ingest(report, brief, cache: Path, log=print):
    from . import kit_ingest
    set_id = 'commons-' + re.sub(r'[^a-z0-9-]', '-', brief.get('media_set') or brief['club_id'])
    out = kit_ingest.BEATS / set_id
    out.mkdir(parents=True, exist_ok=True)
    (out / 'index.json').unlink(missing_ok=True)
    sources, masks, started = [], {}, time.monotonic()
    for row in report['candidates']:
        if time.monotonic() - started > 75:
            break
        path = cache / (str(row['pageid']) + '-' + hashlib.sha256(row['url'].encode()).hexdigest()[:12] + '.jpg')
        try:
            if not path.exists():
                data = fetch(row['url'])
                with Image.open(io.BytesIO(data)) as im:
                    if im.width * im.height > 40_000_000 or min(im.size) < 480:
                        raise ValueError('Unsupported image dimensions')
                    im.convert('RGB').save(path, 'JPEG', quality=92)
            with Image.open(path) as im:
                im.verify()
            masks[str(path)] = {**row, 'source': row['title'], 'slug': str(row['pageid']), 'archive': True,
                                'pack': 'Wikimedia Commons', 'description': row['entity'] + ' ' + row['description']}
            sources.append(path)
        except Exception as error:
            path.unlink(missing_ok=True)
            log(f'Commons: image {row["pageid"]} unavailable ({type(error).__name__})')
    if not sources:
        return []
    idx = kit_ingest.ingest(set_id, sources, masks, brief['club_id'], brief['season'], 'Verified public-domain / CC0 context images; optional.')
    return idx['pieces']
