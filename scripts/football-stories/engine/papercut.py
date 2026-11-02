#!/usr/bin/env python3
"""Render supplied paper-art layers into one fixed-camera stop-motion shot.

Inputs are original or rights-cleared RGBA PNG layers, back to front. This is a
compositor, not a text-to-image or generative-video provider.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

class PaperError(ValueError): pass

def prepare(spec, base):
    if not isinstance(spec,dict): raise PaperError('Shot must be an object')
    duration=spec.get('duration_seconds',10)
    if isinstance(duration,bool) or not isinstance(duration,(float,int)) or not math.isfinite(duration) or not 0.5<=duration<=60: raise PaperError('Duration must be between 0.5 and 60 seconds')
    size=spec.get('size',[1280,720]);fps=spec.get('fps',24)
    if not isinstance(size,list) or len(size)!=2 or any(type(x)!=int or x<64 or x>1920 or x%2 for x in size): raise PaperError('Size must contain two even dimensions between 64 and 1920')
    if type(fps)!=int or not 8<=fps<=30: raise PaperError('FPS must be an integer between 8 and 30')
    layers=spec.get('layers')
    if not isinstance(layers,list) or not 2<=len(layers)<=20: raise PaperError('Provide 2–20 layers, back to front')
    result=[]
    for entry in layers:
        if not isinstance(entry,dict): raise PaperError('Invalid layer')
        rights=entry.get('rights',{})
        if not isinstance(rights,dict) or rights.get('status') not in ('owned','licensed','public_domain') or not isinstance(rights.get('evidence'),str) or not rights['evidence'].strip(): raise PaperError('Each layer needs a documented rights record')
        path=entry.get('file')
        if not isinstance(path,str) or not path.strip(): raise PaperError('Each layer needs a PNG file')
        file=(base/path).resolve()
        if file.suffix.lower()!='.png' or not file.is_file(): raise PaperError('Layer must be an existing PNG')
        try:
            with Image.open(file) as image:
                if image.size!=tuple(size): raise PaperError('Each layer must match shot size')
                result.append(image.convert('RGBA'))
        except OSError as e: raise PaperError('Cannot open layer image') from e
    return float(duration),tuple(size),fps,result

def frame_at(t,duration,size,layers):
    """Camera stays still. Hold after 70% (7 s of a 10 s shot)."""
    canvas=Image.new('RGBA',size,(244,236,216,255))
    assembly=duration*0.7
    for i,layer in enumerate(layers):
        if i==0: progress=1.0
        else:
            start=assembly*(i-1)/max(1,len(layers)-1)
            span=max(0.05,assembly/max(1,len(layers)-1))
            progress=max(0.0,min(1.0,(t-start)/span))
        if progress<=0: continue
        # Quantised hand-cut movements, settled before the final hold.
        eased=1-(1-progress)**3
        offset=round((1-eased)*min(24,size[0]*.03)/2)*2
        mask=layer.getchannel('A')
        shifted=ImageChops.offset(layer,0,offset) if offset else layer
        if offset: shifted.paste((0,0,0,0),(0,0,size[0],offset))
        if i:
            shadow=Image.new('RGBA',size,(0,0,0,0));alpha=ImageChops.offset(mask,3,5).filter(ImageFilter.GaussianBlur(3)).point(lambda p: round(p*.32));shadow.putalpha(alpha)
            if offset: shadow=ImageChops.offset(shadow,0,offset);shadow.paste((0,0,0,0),(0,0,size[0],offset))
            canvas=Image.alpha_composite(canvas,shadow)
        canvas=Image.alpha_composite(canvas,shifted)
    return canvas.convert('RGB')

def render(spec_path,output):
    try: spec=json.loads(spec_path.read_text(encoding='utf-8'))
    except (OSError,json.JSONDecodeError) as e: raise PaperError('Cannot read shot manifest') from e
    duration,size,fps,layers=prepare(spec,spec_path.parent)
    if output.suffix.lower()!='.mp4' or output.exists(): raise PaperError('Choose a new MP4 output path')
    output.parent.mkdir(parents=True,exist_ok=True)
    count=round(duration*fps)
    with tempfile.TemporaryDirectory(prefix='paper-',dir=output.parent) as temp:
        result=Path(temp)/'shot.mp4'
        cmd=['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{size[0]}x{size[1]}','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',str(result)]
        try:
            proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
            try:
                for i in range(count): proc.stdin.write(frame_at(i/fps,duration,size,layers).tobytes())
                proc.stdin.close();err=proc.stderr.read();proc.stderr.close();code=proc.wait()
            except (BrokenPipeError,OSError):
                proc.stdin.close();proc.stderr.close();proc.wait();raise PaperError('FFmpeg could not render the shot')
            if code: raise PaperError('FFmpeg failed to encode the shot: '+err.decode(errors='replace')[-500:])
        except FileNotFoundError as e: raise PaperError('FFmpeg is required') from e
        os.link(result,output)
    return {'video':str(output),'seconds':count/fps,'frames':count,'audio':'none','status':'rendered_shot_not_a_finished_film'}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('manifest',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
    try: print(json.dumps(render(args.manifest,args.output),indent=2))
    except (PaperError,OSError) as e: print(f'Paper render error: {e}',file=sys.stderr);return 1
    return 0
if __name__=='__main__': raise SystemExit(main())
