#!/usr/bin/env python3
"""Research only the EXISTING Zrinjski/St Pauli packs. Python 3 + lxml + curl.

Public HTTPS sources, bounded requests, no credentials/images/article copies. A source's own
season/competition/person ids are retained; neither names nor dates are guessed. Nothing is approved.
Run: python3 scripts/club-research/collect-existing-archives.py --cache /absolute/scratch/path
Metadata + factual observations go to research-data/existing-archives-2026-10-09/<club>/.
The private scratch cache makes interrupted runs resumable without re-requesting successful pages.
"""
import argparse, concurrent.futures, datetime, hashlib, json, re, subprocess, threading, time
from pathlib import Path
from urllib.parse import urlparse, urljoin
from lxml import html

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'research-data/existing-archives-2026-10-09'
AS_OF = '2026-10-09'
ALLOWED = {'datencenter.dfb.de', 'hskzrinjski.ba', 'www.nfsbih.ba', 'www.national-football-teams.com'}
DFB_INDEX = 'https://datencenter.dfb.de/clubs/fc-st-pauli-von-1910-e-v'
NFT = 'https://www.national-football-teams.com/club/3207/2024_1/Zrinjski_Mostar.html'
LOCKS = {h: threading.Lock() for h in ALLOWED}
LAST = {h: 0.0 for h in ALLOWED}

def txt(el): return ' '.join(el.text_content().split())
def cls(el, name): return name in (el.get('class') or '').split()
def digest(v): return hashlib.sha256(v).hexdigest()
def iso_day(s, fmt='%d.%m.%Y'):
    try: return datetime.datetime.strptime(s, fmt).date().isoformat()
    except (ValueError, TypeError): return None
def season_label(s):
    m = re.fullmatch(r'(\d{2})/(\d{2})', s)
    if not m: return None
    year = (1900 if int(m[1]) >= 40 else 2000) + int(m[1])
    return f'{year}/{m[2]}' if (year+1)%100 == int(m[2]) else None
def write(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def fetch(url, cache):
    host = urlparse(url).hostname
    if host not in ALLOWED or urlparse(url).scheme != 'https': raise ValueError('unapproved origin')
    key = digest(url.encode()); bodyfile = cache/(key+'.html'); metafile = cache/(key+'.json')
    if bodyfile.exists() and metafile.exists():
        return bodyfile.read_bytes(), json.loads(metafile.read_text())
    with LOCKS[host]:
        gap = 3 - (time.monotonic()-LAST[host])
        if gap > 0: time.sleep(gap)
        LAST[host] = time.monotonic()
    # curl uses the environment's configured HTTP proxy; production's DNS/SSRF guard is untouched.
    r = subprocess.run(['curl','--silent','--show-error','--proto','=https','--max-time','35',
                        '--max-filesize','10485760','--output',str(bodyfile),'--write-out','%{http_code}',url],
                       capture_output=True, timeout=40)
    status = int(r.stdout.decode().strip() or '0')
    body = bodyfile.read_bytes() if bodyfile.exists() else b''
    meta = {'url':url,'status':status,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'contentHash':digest(body),'bytes':len(body),'transport':'curl via environment proxy',
            'error':r.stderr.decode().strip()[:300] if r.returncode else None}
    # A refusal is recorded, never retried in this pass and never treated as an empty archive.
    if status == 200 and body: write(metafile, meta)
    return body if status == 200 else b'', meta

def parse_dfb(body, url):
    tree = html.fromstring(body); title = tree.findtext('.//title') or ''
    path = urlparse(url).path
    if not path.endswith('/teams/fc-st-pauli') or 'FC St. Pauli' not in title or 'FC St. Pauli II' in title:
        raise ValueError('first-team identity not confirmed')
    m = re.search(r'/competitions/([^/]+)/seasons/(\d{4})-(\d{2,4})[^/]*/', path)
    if not m: raise ValueError('competition season missing')
    competition, start, end = m.groups(); season = f'{start}/{end[-2:]}'
    if (int(start)+1)%100 != int(end[-2:]): raise ValueError('invalid season')
    members, matches, skipped = [], [], []
    positions = {'Torwart':'GK','Abwehr':'DF','Mittelfeld':'MF','Sturm':'FW'}
    for table in tree.xpath('//table'):
        headings = table.xpath('./thead/tr/th')
        role = txt(headings[0]) if headings else ''
        if role not in positions and role != 'Trainer': continue
        for row in table.xpath('./tbody/tr'):
            cells = row.xpath('./td'); links = cells[1].xpath('./a') if len(cells)>=3 else []
            if len(links)!=1: continue
            profile = urljoin(url,links[0].get('href')).split('?')[0]
            pid = re.search(r'/profil/(\d+)$',profile)
            if not pid: continue
            members.append({'providerPersonId':'dfb:'+pid[1], 'profileUrl':profile,
                            'nameAsReported':txt(links[0]),'role':'coach' if role=='Trainer' else 'player',
                            'position':positions.get(role),'birthDate':iso_day(txt(cells[2])),
                            'shirtNumberAsReported':txt(cells[0]) or None,'season':season,
                            'competition':competition,'sourceUrl':url,'identityState':'unresolved',
                            'scope':'first-team competition squad; does not prove an appearance'})
    for row in tree.xpath('//div'):
        if not cls(row,'c-MatchTable-row'): continue
        home = row.xpath('.//div[contains(@class,"c-MatchTable-team--home")]/a')
        away = row.xpath('.//div[contains(@class,"c-MatchTable-team--away")]/a')
        scores = row.xpath('.//div[@class="c-MatchTable-score"]/a')
        dates = row.xpath('.//div[@class="c-MatchTable-description"]/p')
        if not home or not away or not scores or not dates: continue
        scoretext=txt(scores[0]); date_m = re.search(r'\b\d{2}\.\d{2}\.\d{4}\b',txt(dates[0]))
        on=iso_day(date_m[0]) if date_m else None
        sc=re.fullmatch(r'(\d+)\s*:\s*(\d+)',scoretext)
        if not on or on>AS_OF or not sc:
            skipped.append({'dateAsReported':txt(dates[0]),'scoreAsReported':scoretext,
                            'reason':'future, scheduled, or non-regulation score; not a completed match'});continue
        if 'FC St. Pauli' not in [txt(home[0]),txt(away[0])]: raise ValueError('unrelated match')
        match_url=urljoin(url,scores[0].get('href')).split('?')[0]
        matches.append({'providerMatchId':'dfb:'+match_url.rsplit('-',1)[-1], 'sourceUrl':url,
                        'detailUrl':match_url,'on':on,'home':txt(home[0]),'away':txt(away[0]),
                        'homeGoals':int(sc[1]),'awayGoals':int(sc[2]),'scoreKind':'regulation-full-time',
                        'competition':competition,'season':season,'sport':'football'})
    return {'season':season,'competition':competition,'memberships':members,'matches':matches,
            'skipped':skipped,'completeArchiveClaim':False}

def parse_zrinjski_tabs(body, url):
    tree=html.fromstring(body); tabs=[e for e in tree.xpath('//div') if cls(e,'tab')]
    out=[]
    for i,tab in enumerate(tabs):
        rows=[]
        for row in tab.xpath('.//div'):
            if not cls(row,'trophy-row'):continue
            left=[e for e in row if cls(e,'trophy-year')]; right=[e for e in row if cls(e,'trophy-text')]
            if left and right:rows.append({'keyAsReported':txt(left[0]),'valueAsReported':txt(right[0])})
        if rows:out.append({'tabIndex':i,'rows':rows})
    awards=[]
    if url.endswith('/navijaci/'):
        for row in tree.xpath('//div[contains(@class,"year-content")]/p'):
            m=re.fullmatch(r'(\d{4})\.\s*(.+)',txt(row))
            if m:awards.append({'year':int(m[1]),'nameAsReported':m[2]})
    coaches=[]
    if url.endswith('/trofejni-treneri/'):
        for heading in tree.xpath('//h2'):
            following=[];n=heading.getnext();score_block=''
            while n is not None and n.tag!='h2':
                if n.tag=='h3' and txt(n)=='SKOR' and n.getnext() is not None:
                    score_block=txt(n.getnext())
                following.append(txt(n));n=n.getnext()
            # Only the explicitly labelled numerical record, never prose inferred career dates.
            m=re.search(r'(\d+)\s+(?:službene\s+|službenih\s+)?utakmi(?:ce|ca).*?(\d+)\s+pobjed(?:e|a).*?(\d+)\s+remija.*?(\d+)\s+poraza',score_block,re.I)
            coaches.append({'nameAsReported':txt(heading),'matchesAsReported':int(m[1]) if m else None,
                            'winsAsReported':int(m[2]) if m else None,'drawsAsReported':int(m[3]) if m else None,
                            'lossesAsReported':int(m[4]) if m else None})
    return {'tabs':out,'fanAwards':awards,'trophyCoaches':coaches,'sourceUrl':url,'completeArchiveClaim':False,
            'scopeNote':'Keep season/cup/European/overall scopes separate. Page publication is not statistics cut-off.'}

def parse_nfs(body,url):
    tree=html.fromstring(body);matches=[]
    for table in tree.xpath('//table'):
        headings=table.xpath('.//th')
        if not headings or txt(headings[0])!='WWIN liga BiH 25/26':continue
        for row in table.xpath('.//tr'):
            cells=row.xpath('./td')
            if len(cells)!=7:continue
            home=cells[0].xpath('.//a');away=cells[3].xpath('.//a');scores=cells[5].xpath('./strong');details=cells[6].xpath('.//a/@href')
            if not home or not away or not scores or not details:continue
            if 'HŠK ZRINJSKI' not in [txt(home[0]),txt(away[0])]:raise ValueError('unrelated NFS match')
            on=iso_day(txt(cells[4]).split(' ')[0]);sc=re.fullmatch(r'(\d+)\s*:\s*(\d+)',txt(scores[0]))
            if not on or on>AS_OF or not sc:continue
            detail=urljoin(url,details[0]);pid=re.search(r'/match/(\d+)-',detail)
            if not pid:continue
            matches.append({'providerMatchId':'nfs:'+pid[1],'sourceUrl':url,'detailUrl':detail,'on':on,
                            'home':txt(home[0]),'away':txt(away[0]),'homeGoals':int(sc[1]),'awayGoals':int(sc[2]),
                            'scoreKind':'regulation-full-time','competition':'wwin-liga-bih','season':'2025/26','sport':'football'})
    if not matches:raise ValueError('expected first-team league table missing')
    return {'matches':matches,'season':'2025/26','competition':'wwin-liga-bih','completeArchiveClaim':False}

def parse_nft(body,url):
    tree=html.fromstring(body); title=tree.findtext('.//title') or ''
    if not title.startswith('Zrinjski Mostar ('):raise ValueError('club identity mismatch')
    rows=[]
    for table in tree.xpath('//table'):
        if not cls(table,'player'):continue
        for row in table.xpath('./tbody/tr'):
            cells=row.xpath('./td'); ns=[c for c in cells if cls(c,'name')]
            if not ns:continue
            links=ns[0].xpath('.//a'); name=txt(ns[0]); pid=re.search(r'/player/(\d+)/',links[0].get('href') or '') if links else None
            if not pid:continue
            field=lambda k:next((txt(c) for c in cells if cls(c,k)),None)
            rows.append({'providerPersonId':'nft:'+pid[1],'nameAsReported':name,
                         'profileUrl':urljoin(url,links[0].get('href')),'season':field('season'),
                         'birthDate':field('dob'),'positionAsReported':field('position'),
                         'sourceUrl':url,'identityState':'unresolved','scope':'partial national-player directory, not a full squad'})
    return {'memberships':rows,'completeArchiveClaim':False}

def main():
    p=argparse.ArgumentParser();p.add_argument('--cache',required=True);p.add_argument('--club',choices=['st-pauli','zrinjski-mostar','both'],default='both');args=p.parse_args()
    cache=Path(args.cache);cache.mkdir(parents=True,exist_ok=True)
    jobs=[];discovery=[]
    if args.club in ['st-pauli','both']:
        body,meta=fetch(DFB_INDEX,cache)
        if not body:raise RuntimeError('DFB discovery unavailable; no invented season URLs')
        scripts='\n'.join(html.fromstring(body).xpath('//script[not(@src)]/text()'))
        m=re.search(r'var data = (\[.*?\]);',scripts,re.S)
        if not m:raise RuntimeError('DFB discovery schema changed')
        labels=json.loads(re.search(r'var seasons = (\[.*?\]);',scripts,re.S)[1])
        for label,d in zip(labels,json.loads(m[1])):
            discovery.append({'seasonAsReported':label,'url':d['url'].split('?')[0] if d['url'] else None})
            if d['url']:jobs.append(('st-pauli','dfb',d['url'].split('?')[0]))
        write(OUT/'st-pauli/discovery.json',{'source':meta,'seasons':discovery,'completeArchiveClaim':False})
    if args.club in ['zrinjski-mostar','both']:
        for slug in ['povijest','brojke','zrinjski-u-wwin-ligi','zrinjski-u-kupu-bih','zrinjski-u-europi',
                     'zrinjski-u-ligi-hrvatske-republike-herceg-bosne','trofejni-treneri','stadion','navijaci']:
            jobs.append(('zrinjski-mostar','club-tabs','https://hskzrinjski.ba/'+slug+'/'))
        body,meta=fetch(NFT,cache)
        if body:
            tree=html.fromstring(body)
            for option in tree.xpath('//select/option/@value'):
                if re.fullmatch(r'\d{4}_\d',option):jobs.append(('zrinjski-mostar','nft',f'https://www.national-football-teams.com/club/3207/{option}/Zrinjski_Mostar.html'))
        jobs.append(('zrinjski-mostar','nfs','https://www.nfsbih.ba/en/component/stats/team/46565761/517-hsk-zrinjski/'))
    def one(job):
        club,provider,url=job;body,meta=fetch(url,cache);parsed=None
        if body:
            try:parsed=parse_dfb(body,url) if provider=='dfb' else parse_nft(body,url) if provider=='nft' else parse_zrinjski_tabs(body,url) if provider=='club-tabs' else parse_nfs(body,url)
            except (ValueError,IndexError) as e:meta['parseError']=str(e)
        record={'provider':provider,'source':meta,'observations':parsed,'approvedForProduction':0}
        write(OUT/club/'documents'/(digest(url.encode())[:16]+'.json'),record)
        print(club,provider,meta['status'],len((parsed or {}).get('matches',[])),len((parsed or {}).get('memberships',[])),url,flush=True)
    # Two in-flight requests maximum per origin; request STARTS remain at least three seconds apart.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(one,jobs))

if __name__=='__main__':main()
