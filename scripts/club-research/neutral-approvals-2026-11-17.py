#!/usr/bin/env python3
"""
Approval stamps name a rule, never a person or a conversation (17.11.2026, rule archive-single-source).

Walks the repository's data (club-packs, content, research-data, data) and rewrites, in place:
  * approvedBy that names a person, the owner or a chat  ->  'editorial:<approvedAt>'  (automated:* and legacy-curation untouched)
  * a report's "approval" line that names one                 ->  'editorial:<checkedAt>'
Notes keep their research: a reader sees a note only through lib/clubs/public-note.ts, which drops approval sentences.
The research desk's staged files (research-staging/) and content/ are left alone.
Idempotent. Usage: python3 scripts/club-research/neutral-approvals-2026-11-17.py [--dry-run]
"""
import json, os, re, sys, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DRY = '--dry-run' in sys.argv
PERSON = re.compile(r'maor|harel|owner|\bchat\b|in chat|מאשר|מאושר|תאשר|אישור|תעלה|תכין', re.I)
PRIVATE = re.compile(r'\b(owner|maor|harel|in chat|chat|approv\w*|standing decision|blanket|reviewer)\b|מאשר|מאושר|תאשר|אישור', re.I)
SPLIT = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9"\'“(])')


def clean_note(text):
    if not isinstance(text, str) or not PRIVATE.search(text):
        return text
    t = re.sub(r'\([^()]*\)', lambda m: '' if PRIVATE.search(m.group(0)) else m.group(0), text)
    kept = [s.strip() for s in SPLIT.split(t) if s.strip() and not PRIVATE.search(s)]
    out = re.sub(r'\s{2,}', ' ', ' '.join(kept)).strip()
    out = re.sub(r'\s+([.,;:])', r'\1', out)
    return out


def walk(o, counts):
    if isinstance(o, dict):
        by = o.get('approvedBy')
        if isinstance(by, str) and not by.startswith('automated:') and by != 'legacy-curation' and PERSON.search(by):
            day = o.get('approvedAt') if isinstance(o.get('approvedAt'), str) else ''
            o['approvedBy'] = 'editorial:' + (day[:10] if day else 'reviewed')
            counts['approvedBy'] += 1
        ap = o.get('approval')
        if isinstance(ap, str) and PERSON.search(ap):
            day = o.get('checkedAt') if isinstance(o.get('checkedAt'), str) else ''
            o['approval'] = 'editorial:' + (day[:10] if day else 'reviewed')
            counts['approval'] += 1
        for v in o.values():
            walk(v, counts)
    elif isinstance(o, list):
        for v in o:
            walk(v, counts)


def fmt(raw):
    m = re.match(r'[\[{]\n( +)', raw)
    if m:
        return len(m.group(1)), None
    compact = '":' in raw[:4000] and '": ' not in raw[:4000]
    return None, ((',', ':') if compact else (', ', ': '))


def main():
    total = collections.Counter(); files = 0
    for base in ('club-packs', 'research-data'):
        for p in glob.glob(os.path.join(ROOT, base, '**', '*.json'), recursive=True):
            try:
                raw = open(p, encoding='utf-8').read()
            except OSError:
                continue
            if not PERSON.search(raw):
                continue
            try:
                d = json.loads(raw)
            except ValueError:
                continue
            c = collections.Counter(); walk(d, c)
            if not c:
                continue
            files += 1; total.update(c)
            if not DRY:
                indent, seps = fmt(raw)
                with open(p, 'w', encoding='utf-8') as fh:
                    json.dump(d, fh, ensure_ascii=raw.isascii() and '\\u' in raw, indent=indent, separators=seps)
                    if raw.endswith('\n'):
                        fh.write('\n')
    print(json.dumps({'files': files, **total}))


if __name__ == '__main__':
    main()
