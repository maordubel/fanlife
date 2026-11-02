#!/usr/bin/env python3
"""Create paper-shot prompts from prepared narration beats, not historical research."""
import argparse
import json
import re
import sys
from pathlib import Path

END='premium handcrafted stop-motion paper aesthetic, ultra-detailed, 8K, no text, no logos, no watermark.'
MOTION=('Locked camera: no zoom, pan, tilt, rotation or camera movement. Over the first seven seconds, '
        'paper pieces assemble from back to front, sliding and settling with layered shadows and subtle '
        'handcrafted stop-motion imperfections. For the final three seconds hold the composition; '
        'only small paper deformations and gentle lighting changes are allowed. No objects enter or leave, '
        'change position or scale during the hold. Preserve all real-person faces fully obscured. '
        'Use subtle paper ASMR only when a rights-cleared sound is available.')
class PromptError(ValueError):pass

def make_prompts(data):
 if not isinstance(data,dict):raise PromptError('Prompt brief must be an object')
 def field(v,label,limit=600):
  if not isinstance(v,str) or not v.strip() or len(v)>limit or re.search(r'[\r\n]',v):raise PromptError('Invalid '+label)
  return v.strip()
 club=field(data.get('club'),'club',100);era=field(data.get('era'),'era',100);palette=field(data.get('palette'),'palette',150)
 beats=data.get('beats')
 if not isinstance(beats,list) or not beats or len(beats)>300:raise PromptError('Provide 1–300 narration beats')
 prompts=[]
 for beat in beats:
  if not isinstance(beat,dict):raise PromptError('Invalid beat')
  text=field(beat.get('narration'),'narration');hero=field(beat.get('hero'),'hero',150);context=field(beat.get('setting'),'setting',200)
  props=beat.get('supporting_objects',[])
  if not isinstance(props,list) or len(props)>3:raise PromptError('Use at most three supporting objects')
  extras=', '.join(field(x,'supporting object',100) for x in props) or 'none'
  prompts.append(f'Football documentary for {club}, {era}. Narrated beat: {text} '
   f'One hero object: {hero}. Supporting objects: {extras}. Setting: {context}. '
   f'Palette: {palette}, respecting club rival-colour restrictions. Generous negative space. '
   'Every element is handcrafted from thick cardstock, kraft and construction paper, '
   'with layered cut edges, visible thickness, glue joints, soft directional light and deep shadow gaps. '
   'The entire world is paper; no table, canvas, frame or board. '
   'Real or historical people must have fully obscured faces with no identifiable likeness. '
   'No unverified historical details or implied authentic archival imagery. '+END)
 return {'image_prompts':prompts,'motion_prompt':MOTION,'status':'draft_requires_historical_and_visual_review'}

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('beats',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
 try:
  data=make_prompts(json.loads(a.beats.read_text(encoding='utf-8')))
  with a.output.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2);f.write('\n')
 except (OSError,ValueError,PromptError) as e:print(f'Prompt error: {e}',file=sys.stderr);return 1
 print(f'Created {len(data["image_prompts"])} review-required prompts.');return 0
if __name__=='__main__':raise SystemExit(main())
