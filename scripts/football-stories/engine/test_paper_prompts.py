import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('paper_prompts',Path(__file__).with_name('paper_prompts.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class PromptTest(unittest.TestCase):
 def setUp(self):self.data={'club':'Example FC','era':'1999','palette':'red and cream','beats':[{'narration':'The season began.','hero':'football','setting':'paper stadium','supporting_objects':['scarf']},{'narration':'A cup match followed.','hero':'ticket','setting':'paper terrace'}]}
 def test_one_self_contained_prompt_per_beat(self):
  result=p.make_prompts(self.data)
  self.assertEqual(len(result['image_prompts']),2)
  for item in result['image_prompts']:
   self.assertIn('Example FC, 1999',item);self.assertTrue(item.endswith(p.END));self.assertIn('obscured',item)
 def test_reject_four_supporting_objects(self):
  self.data['beats'][0]['supporting_objects']=['a','b','c','d']
  with self.assertRaisesRegex(p.PromptError,'three'):p.make_prompts(self.data)
if __name__=='__main__':unittest.main()
