import importlib.util
import unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('claims',Path(__file__).with_name('archive_claims.py'))
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class ClaimsTest(unittest.TestCase):
    def test_holds_conflicts_and_missing_source(self):
        row={'matchId':'m1','playedOn':{'value':'2000-05-17','precision':'day'},'home':'A','away':'B','score':{'home':2,'away':2},'sourceIds':['s1'],'conflictRefs':[]}
        data={'matches':[row,{**row,'matchId':'m2','conflictRefs':['x']},{**row,'matchId':'m3','sourceIds':[]}],'sources':{'s1':{'url':'https://example.org'}}}
        result=m.convert(data,'Season');self.assertEqual([x['id'] for x in result['claims']],['m1']);self.assertEqual(result['held_match_ids'],['m2','m3'])
if __name__=='__main__':unittest.main()
