import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('quality',Path(__file__).with_name('quality.py'))
q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
class QualityTest(unittest.TestCase):
 def setUp(self):
  self.m={'target_duration_minutes':7,'shots':[{'shot_id':f'S{i+1:03}','start_seconds':i*6,'end_seconds':(i+1)*6,'visual_description':'Terrace','motion_prompt':'Pan across the crowd','rights_status':'original'} for i in range(70)]}
 def test_valid_structure_is_not_release_approval(self):self.assertFalse(q.validate_manifest(self.m)['release_ready'])
 def test_missing_shot_fails(self):
  self.m['shots'].pop()
  with self.assertRaisesRegex(q.QualityError,'Shot count'):q.validate_manifest(self.m)
 def test_gap_fails(self):
  self.m['shots'][10]['start_seconds']+=1
  with self.assertRaisesRegex(q.QualityError,'contiguous'):q.validate_manifest(self.m)
 def test_invalid_duration_fails(self):
  self.m['target_duration_minutes']=True
  with self.assertRaisesRegex(q.QualityError,'Duration'):q.validate_manifest(self.m)
if __name__=='__main__':unittest.main()
