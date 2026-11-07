import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from studio import shorts_hooks

@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),'ffmpeg required')
class HookShorts(unittest.TestCase):
    def test_new_short_has_own_voice_and_is_under_thirty_seconds(self):
        with tempfile.TemporaryDirectory() as d:
            job=Path(d); (job/'out').mkdir()
            subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','color=c=blue:s=320x180:r=25:d=3',
                            '-f','lavfi','-i','sine=frequency=300:duration=3','-c:v','libx264','-pix_fmt','yuv420p',
                            '-c:a','aac','-shortest',str(job/'out/master.mp4')],check=True)
            (job/'plan.json').write_text(json.dumps({'fps':25,'shots':[{'start':0,'frames':75,'claim_ids':['a'],'visual':{'type':'score'}}]}))
            (job/'ledger.json').write_text(json.dumps({'claims':[{'id':'a','fact':{'kind':'detail'}}],'summary':{}}))
            text='A night to remember. This is the story of supporters and a match that nobody would forget.'
            script={'chapters':[{'beats':[{'narration':'Different long film narration.'}]}],
                    'shorts':[{'hook':'A night to remember.','narration':text,'claim_ids':['a']} ]}
            def voice(_s,out,_cache,_log):
                out.mkdir(parents=True,exist_ok=True)
                subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','sine=frequency=600:duration=1',str(out/'beat-001.wav')],check=True)
                return {'beats':[{'duration':1,'file':'beat-001.wav'}]}
            def overlay(_h,_k,_a,path):
                Image.new('RGBA',(1080,1920),(0,0,0,0)).save(path); return path
            with patch('studio.voice.voice_script',side_effect=voice),patch('studio.shorts.overlay',side_effect=overlay):
                made=shorts_hooks.make(job,script,'Test','2001/02','#0055bb')
            self.assertEqual(len(made),1)
            self.assertLessEqual(made[0]['seconds'],30)
            self.assertTrue(made[0]['independent'])
            self.assertEqual(made[0]['narration'],text)
            self.assertEqual(shorts_hooks.make(job,{'shorts':[{'hook':'legacy'}]},'Test','2001/02','#0055bb'),[])

if __name__=='__main__':unittest.main()
