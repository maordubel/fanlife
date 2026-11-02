import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw
spec=importlib.util.spec_from_file_location('paper',Path(__file__).with_name('papercut.py'))
paper=importlib.util.module_from_spec(spec);spec.loader.exec_module(paper)
class PaperTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.dir=Path(self.tmp.name)
  bg=Image.new('RGBA',(128,72),(244,236,216,255));bg.save(self.dir/'bg.png')
  fg=Image.new('RGBA',(128,72));ImageDraw.Draw(fg).rectangle((35,20,80,52),fill=(180,20,20,255));fg.save(self.dir/'fg.png')
  self.shot={'size':[128,72],'duration_seconds':1,'fps':8,'layers':[{'file':p,'rights':{'status':'owned','evidence':'test fixture'}} for p in ['bg.png','fg.png']]}
 def tearDown(self):self.tmp.cleanup()
 def test_end_is_still(self):
  dur,size,_,layers=paper.prepare(self.shot,self.dir)
  self.assertEqual(paper.frame_at(.8,dur,size,layers).tobytes(),paper.frame_at(.99,dur,size,layers).tobytes())
  self.assertNotEqual(paper.frame_at(.05,dur,size,layers).tobytes(),paper.frame_at(.8,dur,size,layers).tobytes())
 def test_uncleared_layer_fails(self):
  self.shot['layers'][1]['rights']['status']='unknown'
  with self.assertRaisesRegex(paper.PaperError,'rights'):paper.prepare(self.shot,self.dir)
 def test_render_and_no_overwrite(self):
  path=self.dir/'shot.json';path.write_text(json.dumps(self.shot));out=self.dir/'out.mp4'
  result=paper.render(path,out)
  self.assertEqual(result['frames'],8);self.assertGreater(out.stat().st_size,100)
  with self.assertRaisesRegex(paper.PaperError,'new MP4'):paper.render(path,out)
if __name__=='__main__':unittest.main()
