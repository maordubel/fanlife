import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('film_render',Path(__file__).with_name('render.py'))
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class FilmRenderTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        for name,color in [('a','red'),('b','blue')]:
            subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'color=c={color}:s=320x180:r=24:d=3','-c:v','libx264','-pix_fmt','yuv420p',str(self.root/f'{name}.mp4')],check=True)
        subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','sine=frequency=440:duration=2','-c:a','pcm_s16le',str(self.root/'voice.wav')],check=True)
        self.rights={'status':'owned','evidence':'synthetic fixture'}
        self.scene={'id':'one','narration':'A test narration.','narration_audio':'voice.wav','shots':[{'file':'a.mp4','in':0,'duration':1,'rights':self.rights},{'file':'b.mp4','in':0,'duration':1.1,'rights':self.rights}]}
    def tearDown(self): self.tmp.cleanup()
    def manifest(self):
        path=self.root/'episode.json';path.write_text(json.dumps({'version':1,'scenes':[self.scene]}));return path
    def test_render_multiple_shots_with_audio_and_subtitles(self):
        result=mod.render(self.manifest(),self.root/'out.mp4')
        self.assertAlmostEqual(result['duration_seconds'],2,delta=.1)
        self.assertEqual(result['scene_count'],1)
        self.assertIn('A test narration.',(self.root/'out.srt').read_text())
        _,streams=mod.probe(self.root/'out.mp4');self.assertTrue({'video','audio'}.issubset(streams))
    def test_reject_unlicensed_before_creating_output(self):
        self.scene['shots'][0]['rights']={'status':'unknown'}
        with self.assertRaisesRegex(mod.ProductionError,'documented rights'):mod.render(self.manifest(),self.root/'out.mp4')
        self.assertFalse((self.root/'out.mp4').exists())
    def test_reject_shots_shorter_than_narration(self):
        self.scene['shots']=self.scene['shots'][:1]
        with self.assertRaisesRegex(mod.ProductionError,'shorter than narration'):mod.render(self.manifest(),self.root/'out.mp4')
    def test_no_overwrite(self):
        path=self.root/'out.mp4';path.write_bytes(b'existing')
        with self.assertRaisesRegex(mod.ProductionError,'already exists'):mod.render(self.manifest(),path)
        self.assertEqual(path.read_bytes(),b'existing')
if __name__=='__main__': unittest.main()
