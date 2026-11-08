import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from studio import intros

@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg required')
class Openings(unittest.TestCase):
    def film(self, out, colour, seconds):
        subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i',f'color=c={colour}:s=160x90:r=25:d={seconds}',
                        '-f','lavfi','-i',f'sine=frequency=440:sample_rate=48000:duration={seconds}',
                        '-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(out)],check=True)

    def test_both_series_and_resume(self):
        for kind in ('film', 'classified'):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as d:
                job=Path(d); opening=job/'source.mp4'; master=job/'master.mp4'
                self.film(opening,'red',1); self.film(master,'blue',2)
                with patch.dict('os.environ', {'STORIES_MASTER_PRESET':'ultrafast'}):
                    dt=intros.prepend(master,job,kind,lambda _:None,opening)
                    digest=intros._sha(master)
                    d=min(intros.XFADE[kind][1],1/3)   # the opening dissolves into the film (owner, 8.11.2026)
                    self.assertAlmostEqual(dt,1-d,delta=.1)
                    self.assertEqual(intros.prepend(master,job,kind,lambda _:None,opening),dt)
                    self.assertEqual(intros._sha(master),digest)
                    self.assertAlmostEqual(float(intros._probe(master)['format']['duration']),3-d,delta=.15)
                    self.assertEqual(json.loads((job/'intro.json').read_text())['kind'],kind)

    def test_timelines_shift_without_mutating_render_plan(self):
        plan={'duration':10,'shots':[{'start':0,'voice_at':.2}, {'start':5,'voice_at':None}],'chapters':[{'t':0}]}
        shifted=intros.shift_plan(plan,10)
        self.assertEqual(shifted['shots'][0]['voice_at'],10.2)
        self.assertIsNone(shifted['shots'][1]['voice_at'])
        self.assertEqual(shifted['chapters'][0]['t'],10)
        self.assertEqual(plan['shots'][0]['start'],0)

if __name__=='__main__': unittest.main()


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg required')
class ClassifiedTrim(unittest.TestCase):
    def test_classified_uses_only_three_seconds(self):
        with tempfile.TemporaryDirectory() as d:
            job=Path(d); opening=job/'source.mp4'; master=job/'master.mp4'
            Openings.film(None,opening,'red',6); Openings.film(None,master,'blue',2)
            with patch.dict('os.environ', {'STORIES_MASTER_PRESET':'ultrafast'}):
                dt=intros.prepend(master,job,'classified',lambda _:None,opening)
            self.assertAlmostEqual(dt,3-intros.XFADE['classified'][1],delta=.12)
