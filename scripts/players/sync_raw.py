# -*- coding: utf-8 -*-
"""מעביר את תוצאות שלושת המתאמים חזרה אל `player-facts-wiki.json`, שהוא הקובץ
שהצינור קורא ממנו. הטבלאות הגולמיות (`table`) לא נגעות — הן מה שנקרא מהמקור."""
import json

RAW = 'content/manual/player-facts-wiki.json'

def main():
    raw = json.load(open(RAW, encoding='utf-8'))
    he = json.load(open('/tmp/claude-0/wiki/matched.json', encoding='utf-8'))
    en = json.load(open('/tmp/claude-0/wiki/en-matched.json', encoding='utf-8'))
    wa = json.load(open('/tmp/claude-0/wiki/wfall-matched.json', encoding='utf-8'))
    raw['wikiHe'] = {'table': raw['wikiHe']['table'], 'matched': he['rows'],
                     'wikiTitlesWithNoArchiveRow': he['wikiUnmatched']}
    raw['wikiEn'] = {'table': raw['wikiEn']['table'], 'matched': en['rows'],
                     'refused': en['refused'], 'enTitlesWithNoArchiveRow': en['enUnmatched']}
    raw['wfAllPlayers'] = {'table': raw['wfAllPlayers']['table'], 'matched': wa['rows'],
                           'refused': wa['refused'], 'duplicateLatin': wa['duplicateLatin']}
    json.dump(raw, open(RAW, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('sync_raw: wikiHe %d · wikiEn %d · wfAll %d'
          % (len(he['rows']), len(en['rows']), len(wa['rows'])))

if __name__ == '__main__':
    main()
