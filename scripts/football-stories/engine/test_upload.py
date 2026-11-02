import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

spec=importlib.util.spec_from_file_location('film_upload',Path(__file__).with_name('upload.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class FakeResponse:
    status=200
    def read(self,n):return b'{"id":"demo-video"}'
class FakeConnection:
    def __init__(self,*args,**kwargs):self.sent=0
    def putrequest(self,*args):pass
    def putheader(self,*args):pass
    def endheaders(self):pass
    def send(self,chunk):self.sent+=len(chunk)
    def getresponse(self):return FakeResponse()
    def close(self):pass

class UploadTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.video=self.root/'movie.mp4';self.video.write_bytes(b'synthetic data')
        self.meta=self.root/'meta.json';self.meta.write_text(json.dumps({'title':'Example','description':'Test','channel_id':mod.EXPECTED_CHANNEL,'contains_synthetic_media':False,'tags':['football history']}))
        self.state=self.root/'state.json'
    def tearDown(self):self.tmp.cleanup()
    def test_refuses_wrong_channel_without_upload(self):
        with patch.object(mod,'request_json',return_value={'items':[{'id':'different'}]}),patch.object(mod,'initiate') as start:
            with self.assertRaisesRegex(mod.UploadError,'does not match'):mod.upload('test-token',self.video,self.meta,self.state)
            start.assert_not_called();self.assertFalse(self.state.exists())
    def test_private_upload_and_duplicate_guard(self):
        with patch.object(mod,'request_json',return_value={'items':[{'id':mod.EXPECTED_CHANNEL}]}),patch.object(mod,'initiate',return_value=urlsplit('https://www.googleapis.com/upload?test=1')) as start,patch.object(mod.http.client,'HTTPSConnection',FakeConnection):
            self.assertEqual(mod.upload('test-token',self.video,self.meta,self.state),'demo-video')
            self.assertEqual(start.call_args.args[1]['status']['privacyStatus'],'private')
            self.assertEqual(start.call_args.args[1]['snippet']['tags'],['football history'])
            record=json.loads(self.state.read_text());self.assertEqual(record['status'],'uploaded_private');self.assertNotIn('test-token',self.state.read_text())
            with self.assertRaisesRegex(mod.UploadError,'state exists'):mod.upload('test-token',self.video,self.meta,self.state)
            self.assertEqual(start.call_count,1)
if __name__=='__main__':unittest.main()
