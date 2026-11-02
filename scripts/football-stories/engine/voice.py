#!/usr/bin/env python3
"""Generate one narration file and alignment using ElevenLabs.

An intentional run may consume credits. Existing output is never overwritten.
No automatic retry is attempted after an ambiguous network failure.
"""
import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('text_file',type=Path);p.add_argument('output',type=Path)
    p.add_argument('--voice-id',required=True);p.add_argument('--model',default='eleven_multilingual_v2')
    a=p.parse_args()
    key=os.environ.get('ELEVENLABS_API_KEY','').strip()
    if not key: p.error('ELEVENLABS_API_KEY is not configured')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}',a.voice_id): p.error('Invalid voice id')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}',a.model): p.error('Invalid model id')
    text=a.text_file.read_text(encoding='utf-8').strip()
    if not text or len(text)>10000: p.error('Narration must contain 1–10000 characters')
    if a.output.suffix.lower()!='.mp3': p.error('Output must use the .mp3 extension')
    timing=a.output.with_suffix('.alignment.json')
    if a.output.exists() or timing.exists(): p.error('Output already exists; select a new filename')
    req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+a.voice_id+'/with-timestamps',data=json.dumps({'text':text,'model_id':a.model}).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=90) as response: data=json.load(response)
        sound=base64.b64decode(data['audio_base64'],validate=True)
        alignment=data.get('alignment')
        if not sound or not isinstance(alignment,dict): raise ValueError('Missing audio or alignment')
    except (urllib.error.URLError,TimeoutError,ValueError,KeyError,json.JSONDecodeError) as e:
        print('Voice generation failed or returned invalid data; check provider status before retrying.',file=sys.stderr);return 1
    a.output.parent.mkdir(parents=True,exist_ok=True)
    try:
        # Exclusive creation prevents accidentally overwriting previous generated work.
        with a.output.open('xb') as f:f.write(sound)
        with timing.open('x',encoding='utf-8') as f:json.dump(alignment,f,ensure_ascii=False)
    except OSError as e:
        print('Could not save the generated narration; the provider request may have been charged.',file=sys.stderr);return 1
    print('Narration and timing saved:',a.output,timing);return 0
if __name__=='__main__': raise SystemExit(main())
