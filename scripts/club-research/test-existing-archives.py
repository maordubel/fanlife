"""Source-parser regression tests with minimal synthetic HTML; no network requests."""
import importlib.util, json, tempfile, unittest
from pathlib import Path

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file))
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
c=module('collector','collect-existing-archives.py')
a=module('assembler','assemble-existing-archives.py')
DFB='https://datencenter.dfb.de/competitions/bundesliga/seasons/2024-2025/teams/fc-st-pauli'
NFS='https://www.nfsbih.ba/en/component/stats/team/46565761/517-hsk-zrinjski/'

def match(date,score):
    return '<div class="c-MatchTable-row"><div class="c-MatchTable-team--home"><a>FC St. Pauli</a></div>'+\
        '<div class="c-MatchTable-team--away"><a>Opponent</a></div><div class="c-MatchTable-score">'+\
        '<a href="/datencenter/match-123">'+score+'</a></div><div class="c-MatchTable-description"><p>'+date+'</p></div></div>'

class SourceParserTests(unittest.TestCase):
    def test_completed_league_dates_are_not_schedule_or_extra_time(self):
        body=('<title>FC St. Pauli</title>'+match('01.09.2024','2:1')+
              match('01.11.2026','3:0')+match('02.09.2024','-:-')+
              match('03.09.2024','2:1 n.V.')).encode()
        result=c.parse_dfb(body,DFB)
        self.assertEqual(len(result['matches']),1)
        self.assertEqual(result['matches'][0]['on'],'2024-09-01')
        self.assertEqual(len(result['skipped']),3)

    def test_reserve_or_wrong_club_cannot_become_first_team(self):
        for title in ['FC St. Pauli II','Doxa Dramas']:
            with self.assertRaises(ValueError):c.parse_dfb(('<title>'+title+'</title>').encode(),DFB)

    def test_squad_membership_is_not_a_match_appearance(self):
        body=b'<title>FC St. Pauli</title><table><thead><tr><th>Torwart</th></tr></thead><tbody><tr><td>1</td><td><a href="/profil/77">Keeper</a></td><td>12.03.1990</td></tr></tbody></table>'
        result=c.parse_dfb(body,DFB)
        self.assertEqual(result['memberships'][0]['providerPersonId'],'dfb:77')
        self.assertEqual(result['memberships'][0]['position'],'GK')
        self.assertEqual(result['memberships'][0]['identityState'],'unresolved')
        self.assertEqual(result['matches'],[])

    def test_federation_score_uses_full_time_not_half_time(self):
        body='<table><tr><th>WWIN liga BiH 25/26</th></tr><tr><td><a>HŠK ZRINJSKI</a></td><td></td><td></td><td><a>Opponent</a></td><td>10.09.2025 20:00</td><td>(1:0) <strong>2:0</strong></td><td><a href="/en/stats/match/46565814-match/">detail</a></td></tr></table>'
        result=c.parse_nfs(('<meta charset="utf-8">'+body).encode(),NFS)
        self.assertEqual(result['matches'][0]['homeGoals'],2)
        self.assertEqual(result['matches'][0]['on'],'2025-09-10')
        self.assertEqual(result['matches'][0]['providerMatchId'],'nfs:46565814')

    def test_partial_directory_empty_page_is_not_full_empty_squad(self):
        result=c.parse_nft(b'<title>Zrinjski Mostar (1994/95)</title>',c.NFT)
        self.assertEqual(result['memberships'],[])
        self.assertFalse(result['completeArchiveClaim'])
        with self.assertRaises(ValueError):
            c.parse_nft(b'<title>Doxa Dramas (2024/25)</title>',c.NFT)

    def test_reimport_preserves_owner_decision_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp)
            old={'id':'existing','name':'Original','status':'approved','approvedBy':'owner'}
            c.write(directory/'records.json',[old])
            incoming=[{'id':'existing','name':'Competing','status':'review'},
                      {'id':'new','name':'Candidate','status':'review'}]
            a.save_rows(directory,'records',incoming)
            first=(directory/'records.json').read_bytes()
            a.save_rows(directory,'records',incoming)
            self.assertEqual((directory/'records.json').read_bytes(),first)
            self.assertEqual(next(r for r in json.loads(first) if r['id']=='existing'),old)

    def test_european_continuation_rows_keep_the_explicit_season_heading(self):
        arrays=a.defaultdict(list)
        doc={'source':{'url':'https://hskzrinjski.ba/zrinjski-u-europi/'},'observations':{'tabs':[
            {'tabIndex':1,'rows':[{'keyAsReported':'24/25','valueAsReported':'UECL I Opponent 1:0, 0:1'},
                                {'keyAsReported':'','valueAsReported':'UECL I Next opponent 0:0, 1:0'}]}]}}
        a.zrinjski_tables('zrinjski-mostar',doc,arrays,[],[],[])
        self.assertEqual(arrays['euro-ties'][1]['season'],'2024/25')
        self.assertEqual(arrays['euro-ties'][1]['keyAsReported'],'')
        self.assertTrue(arrays['euro-ties'][1]['continuedSeasonHeading'])
        self.assertEqual(arrays['matches'],[])

if __name__=='__main__':unittest.main()
