import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('film_editorial',Path(__file__).with_name('editorial.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class Response:
    def __init__(self,payload):self.data=json.dumps(payload).encode()
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,*args):return self.data

class EditorialTest(unittest.TestCase):
    def setUp(self):
        self.dossier={'topic':'A season','claims':[{'id':'c1','statement':'They won 2–0.','source_url':'https://example.com/source'}]}
        self.result={'subject':'A season','hook':'A new beginning','title_candidates':['A season: the story','A season documentary'],'selected_title':'A season: the story','description':'A documentary.','tags':['football history'],'thumbnail_text':'THE SEASON','segments':[{'label':'Start','narration':'A new beginning. A game.','visual_direction':'Animated graphic.','claim_ids':['c1']},{'label':'Match','narration':'They won 2–0.','visual_direction':'Scorecard.','claim_ids':['c1']}],'shorts':[]}
    def test_reject_unknown_claim(self):
        self.result['segments'][1]['claim_ids']=['fabricated']
        with self.assertRaisesRegex(mod.EditorialError,'unknown'):mod.validate_package(self.result,{'c1'})
    def test_reject_missing_sources(self):
        self.dossier['claims'][0]['source_url']=''
        with self.assertRaisesRegex(mod.EditorialError,'source URL'):mod.validate_dossier(self.dossier)
    def test_mocked_generation_requires_disclosure_decision(self):
        response={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(self.result)}]}]}
        with patch.object(mod.urllib.request,'urlopen',return_value=Response(response)):
            out=mod.draft(self.dossier,'model-name','not-a-real-key')
        self.assertEqual(out['status'],'needs_editorial_review')
        self.assertIsNone(out['upload_metadata']['contains_synthetic_media'])
    def test_incomplete_output_rejected(self):
        with patch.object(mod.urllib.request,'urlopen',return_value=Response({'status':'incomplete','output':[]})):
            with self.assertRaisesRegex(mod.EditorialError,'incomplete'):mod.draft(self.dossier,'model-name','not-a-real-key')
if __name__=='__main__':unittest.main()
