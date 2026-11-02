#!/usr/bin/env python3
"""Silent motion study. Draws a short magazine animation from project artwork.
Requires Pillow and ffmpeg. Editorial sample only; no upload or audio.
"""
import argparse
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W,H,FPS=960,540,24
INK='#15130F'; PAPER='#F4ECD8'; WHITE='#FFFBF2'; RED='#D71920'; DEEP='#A20F18'; NIGHT='#16203F'
FONT=ROOT/'lib/og/fonts/archivo-latin-800.ttf'
FANS=ROOT/'scripts/marketing/kit/assets/fans-line.png'

def font(size): return ImageFont.truetype(str(FONT),size)
def ease(t):
 t=max(0,min(1,t));return 1-(1-t)**3

def rect(draw,coords,fill,outline=INK,width=3):
 draw.rectangle(coords,fill=fill,outline=outline,width=width)

def render_frame(t, fans):
 img=Image.new('RGB',(W,H),PAPER); d=ImageDraw.Draw(img)
 # Restrained halftone and ink lines, all flat colors.
 for y in range(82,H,18):
  for x in range(0,W,18):
   if (x//18+y//18)%3==0: d.ellipse((x,y,x+2,y+2),fill='#D7CDBA')
 d.rectangle((0,0,W,58),fill=INK)
 d.text((24,15),'FANLIFE: FOOTBALL STORIES',font=font(23),fill=WHITE)
 d.text((W-184,20),'MOTION STUDY',font=font(13),fill=WHITE)
 # Each element is independently animated, not a camera move on a still.
 if t < 5.7:
  entrance=ease(t/0.9)
  x=round(-520+550*entrance)
  rect(d,(x+7,101+7,x+500+7,238+7),INK)
  rect(d,(x,101,x+500,238),RED)
  d.text((x+22,112),'SUMMER',font=font(44),fill=WHITE,stroke_width=1,stroke_fill=INK)
  d.text((x+22,158),'1999',font=font(69),fill=WHITE,stroke_width=2,stroke_fill=INK)
  slide=ease((t-.35)/1.0); fx=round(1010-500*slide); fy=178+round(5*math.sin(t*1.5))
  img.paste(fans,(fx,fy),fans)
  d=ImageDraw.Draw(img)
  for i in range(5):
   start=round(575-110*ease((t-.4-i*.1)/.5)); yy=91+i*14
   d.line((start,yy,910,yy),fill=RED,width=3)
  if t>.8:
   rect(d,(38,315,450,422),WHITE)
   d.text((55,332),'A CITY WAITS.',font=font(32),fill=INK)
   d.text((55,375),'A SEASON BEGINS.',font=font(25),fill=INK)
 elif t < 11.5:
  u=t-5.7
  # Newspaper strip crosses in; scoreboard digits drop independently.
  d.rectangle((0,60,W,H),fill=NIGHT)
  for i in range(14):
   xx=(i*125+round(u*22))%(W+180)-120
   d.line((xx,110,xx-150,440),fill='#233C8F',width=2)
  y=round(80+35*(1-ease(u/.6)))
  rect(d,(85,y,875,y+65),RED)
  d.text((107,y+14),'15 AUGUST 1999  •  LEAGUE',font=font(26),fill=WHITE)
  rect(d,(85,180,875,427),PAPER)
  d.text((110,207),'HAPOEL TEL AVIV',font=font(29),fill=INK)
  d.text((110,348),'HAPOEL PETAH TIKVA',font=font(27),fill=INK)
  for j,(value,ypos) in enumerate([('2',190),('0',320)]):
   x=740; dy=round(35*(1-ease((u-.35-j*.2)/.65)))
   rect(d,(x+5,ypos+dy+5,x+85,ypos+dy+95),INK)
   rect(d,(x,ypos+dy,x+80,ypos+dy+90),RED if j==0 else WHITE)
   d.text((x+22,ypos+dy+4),value,font=font(62),fill=WHITE if j==0 else INK)
 else:
  u=t-11.5
  rect(d,(36,93,924,474),WHITE)
  d.text((65,119),'THE STORY',font=font(58),fill=INK)
  d.text((65,184),'IS ONLY',font=font(58),fill=INK)
  d.text((65,249),'BEGINNING.',font=font(58),fill=RED)
  slide=ease(u/1.0); fx=round(1000-510*slide);fy=154+round(5*math.sin(t*1.6))
  img.paste(fans,(fx,fy),fans)
  d=ImageDraw.Draw(img)
 d.rectangle((0,H-31,W,H),fill=INK)
 d.text((20,H-25),'SILENT MOTION STUDY  •  NOT HISTORICAL FOOTAGE',font=font(12),fill=WHITE)
 return img

def main():
 ap=argparse.ArgumentParser();ap.add_argument('output',type=Path);args=ap.parse_args()
 fans=Image.open(FANS).convert('RGBA');fans.thumbnail((425,305))
 args.output.parent.mkdir(parents=True,exist_ok=True)
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(args.output)]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 try:
  for i in range(16*FPS):proc.stdin.write(render_frame(i/FPS,fans).tobytes())
  proc.stdin.close()
  if proc.wait(): raise RuntimeError('ffmpeg failed')
 except BaseException:
  if proc.stdin and not proc.stdin.closed:proc.stdin.close()
  proc.terminate();proc.wait();raise
 print('Wrote silent motion study',args.output)
if __name__=='__main__':main()
