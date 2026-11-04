"""Code-drawn paper-cut animations for a film (first: Real Madrid in Athens, 4.11.2026) — 1920x1080, 24 fps, into kit/clips/<set>/

    python3 animate.py <out dir> [scene ...]

Each scene is a JS function draw(ctx, t, T) on a canvas; frames are rendered deterministically (t is set, not timed).
"""
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
FPS = 24
FONTS = str(Path(__file__).resolve().parents[3] / 'public' / 'fonts')

PAGE = r'''<!doctype html><meta charset=utf-8>
<style>
@font-face{font-family:'Head';src:url('file://@@F@@/weekly-head-latin.woff2')}
@font-face{font-family:'Caps';src:url('file://@@F@@/weekly-caps-latin.woff2')}
@font-face{font-family:'Ultra';src:url('file://@@F@@/ultra-latin-400-normal.woff2')}
html,body{margin:0;background:#000}canvas{display:block}</style>
<canvas id=c width=1920 height=1080></canvas>
<script>
const W=1920,H=1080,c=document.getElementById('c'),x=c.getContext('2d');
const INK='#15130F',PAPER='#FFFBF2',CREAM='#EFE6D2';
function rnd(s){return function(){s=(s*16807)%2147483647;return (s-1)/2147483646}}
const ease=k=>k<0?0:k>1?1:1-Math.pow(1-k,3);
const back=k=>{k=Math.max(0,Math.min(1,k));const s=1.7;return 1+(s+1)*Math.pow(k-1,3)+s*Math.pow(k-1,2)};
const cl=(a,b,v)=>Math.max(a,Math.min(b,v));
// paper grain, made once
const grain=document.createElement('canvas');grain.width=W;grain.height=H;{const g=grain.getContext('2d'),im=g.createImageData(W,H),r=rnd(7);for(let i=0;i<im.data.length;i+=4){const v=200+r()*55;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=22}g.putImageData(im,0,0)}
function torn(pts,seed,amp){const r=rnd(seed),out=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const n=Math.max(2,Math.floor(Math.hypot(b[0]-a[0],b[1]-a[1])/14));for(let j=0;j<n;j++){const k=j/n;out.push([a[0]+(b[0]-a[0])*k+(r()-.5)*amp,a[1]+(b[1]-a[1])*k+(r()-.5)*amp])}}return out}
function poly(p,fill,shadow){if(shadow){x.save();x.translate(9,9);x.fillStyle='rgba(21,19,15,.55)';x.beginPath();p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fill();x.restore()}x.fillStyle=fill;x.beginPath();p.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fill()}
function finish(){x.drawImage(grain,0,0);const g=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.42)');x.fillStyle=g;x.fillRect(0,0,W,H)}
function label(text,cx,cy,size,fill,bg,rot){x.save();x.translate(cx,cy);x.rotate(rot||0);x.font=size+'px Head';const w=x.measureText(text).width;const p=size*.35;x.fillStyle=INK;x.fillRect(-w/2-p+8,-size*.72+8,w+2*p,size*1.15);x.fillStyle=bg;x.fillRect(-w/2-p,-size*.72,w+2*p,size*1.15);x.fillStyle=fill;x.textAlign='center';x.textBaseline='middle';x.fillText(text,0,-size*.12+size*.02);x.restore()}
function shirt(cx,cy,s,body,pattern){ // a plain shirt, no marks
  const P=[[-.5,-.62],[-.18,-.7],[0,-.6],[.18,-.7],[.5,-.62],[.82,-.25],[.6,-.05],[.42,-.22],[.42,.7],[-.42,.7],[-.42,-.22],[-.6,-.05],[-.82,-.25]].map(q=>[cx+q[0]*s,cy+q[1]*s]);
  x.save();x.translate(10,12);x.fillStyle='rgba(21,19,15,.55)';x.beginPath();P.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fill();x.restore();
  x.save();x.beginPath();P.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fillStyle=body;x.fill();x.clip();
  if(pattern)pattern(cx,cy,s);
  x.restore();x.lineWidth=s*.03;x.strokeStyle=INK;x.beginPath();P.forEach((q,i)=>i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.stroke();
  x.beginPath();x.moveTo(cx-.18*s,cy-.7*s);x.quadraticCurveTo(cx,cy-.48*s,cx+.18*s,cy-.7*s);x.stroke();}
@@SCENE@@
window.frame=t=>{x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,W,H);draw(t,@@T@@);finish();};
</script>'''

SCENES = {}

# 1 — Athens at night: the Acropolis on its rock, the city lights, floodlights in the distance. The camera breathes in.
SCENES['acropolis-night'] = (10, r'''
function draw(t,T){
  const z=1+.06*t/T; x.translate(W/2,H/2);x.scale(z,z);x.translate(-W/2,-H/2-12*t/T);
  const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0E1330');sky.addColorStop(.6,'#2A2546');sky.addColorStop(1,'#5A3A3A');x.fillStyle=sky;x.fillRect(-100,-100,W+200,H+200);
  const r=rnd(3);for(let i=0;i<140;i++){const sx=r()*W,sy=r()*H*.55,tw=.5+.5*Math.sin(t*2.2+i);x.fillStyle=`rgba(255,251,242,${.25+.6*tw*r()})`;x.fillRect(sx,sy,2.2,2.2)}
  // moon rising
  const my=330-80*ease(t/T);x.fillStyle='#F3E9CF';x.beginPath();x.arc(1460,my,70,0,7);x.fill();x.fillStyle='rgba(243,233,207,.08)';x.beginPath();x.arc(1460,my,150,0,7);x.fill();
  // far hills (Hymettus), torn paper
  poly(torn([[-100,690],[300,560],[700,610],[1100,520],[1500,590],[2020,540],[2020,1180],[-100,1180]],11,10),'#3A3150',false);
  // floodlights far right: four towers with beams
  for(const fx of [1640,1790]){x.fillStyle=INK;x.fillRect(fx-4,560,8,140);x.fillRect(fx-26,548,52,22);
    const a=.35+.25*Math.sin(t*1.3+fx);const g=x.createRadialGradient(fx,556,4,fx,556,150);g.addColorStop(0,`rgba(255,250,225,${a+.3})`);g.addColorStop(1,'rgba(255,250,225,0)');x.fillStyle=g;x.beginPath();x.arc(fx,556,150,0,7);x.fill()}
  // the city: rows of lit windows
  poly(torn([[-100,800],[2020,780],[2020,1180],[-100,1180]],5,6),'#1D1A2A',false);
  const r2=rnd(9);for(let i=0;i<520;i++){const wx=r2()*W,wy=790+r2()*300,on=Math.sin(i*12.9+t*.6)>-.6;if(on){x.fillStyle=r2()<.15?'rgba(255,200,120,.9)':'rgba(255,236,190,.65)';x.fillRect(wx,wy,4,3)}}
  // the rock
  poly(torn([[260,860],[420,700],[640,650],[1020,640],[1220,680],[1330,770],[1420,880],[260,900]],21,12),'#2B2236',true);
  // the Parthenon, lit warm
  const glow=x.createRadialGradient(830,560,40,830,560,420);glow.addColorStop(0,'rgba(255,214,150,.38)');glow.addColorStop(1,'rgba(255,214,150,0)');x.fillStyle=glow;x.fillRect(-100,-100,W+200,H+200);
  x.fillStyle='#E9C98F';x.fillRect(600,625,470,22);x.fillRect(585,646,500,16);
  for(let i=0;i<8;i++){x.fillStyle=i%2?'#E2BE80':'#EDCE97';x.fillRect(612+i*58,520,30,105)}
  x.fillStyle='#EDCE97';x.fillRect(596,500,478,22);x.beginPath();x.moveTo(596,500);x.lineTo(835,452);x.lineTo(1074,500);x.closePath();x.fill();
  x.strokeStyle=INK;x.lineWidth=3;x.strokeRect(596,500,478,22);
}''')

# 2 — The four shirts: Real Madrid's white, then the three Greek clubs, each dropping onto its peg.
SCENES['four-shirts'] = (8, r'''
function draw(t,T){
  x.fillStyle=CREAM;x.fillRect(0,0,W,H);
  x.fillStyle='rgba(21,19,15,.08)';for(let i=0;i<W;i+=22)for(let j=0;j<H;j+=22){x.beginPath();x.arc(i+(j/22%2)*11,j,2.4,0,7);x.fill()}
  x.fillStyle=INK;x.fillRect(120,250,1680,14);
  const S=[
    ['REAL MADRID','#FBFBF7',null],
    ['OLYMPIACOS','#FBFBF7',(cx,cy,s)=>{x.fillStyle='#C8102E';for(let k=-4;k<5;k++)x.fillRect(cx+k*s*.2-s*.05,cy-s,s*.1,2*s)}],
    ['PANATHINAIKOS','#0B7A3B',null],
    ['AEK ATHENS','#F7C600',(cx,cy,s)=>{x.fillStyle=INK;x.fillRect(cx-s,cy-s*.66,2*s,s*.1);x.fillRect(cx-.9*s,cy-s*.32,s*.42,s*.06);x.fillRect(cx+.48*s,cy-s*.32,s*.42,s*.06)}],
  ];
  S.forEach(([name,body,pat],i)=>{
    const t0=.35+i*.9,k=back((t-t0)/.7);if(t<t0)return;
    const cx=330+i*420,cy=560-(1-k)*700+Math.sin(t*1.6+i)*6;
    x.fillStyle=INK;x.fillRect(cx-3,256,6,cy-256-260);
    x.save();x.translate(cx,cy);x.rotate(Math.sin(t*1.8+i*1.3)*.03*(1-ease((t-t0)/3)));x.translate(-cx,-cy);
    shirt(cx,cy,310,body,pat);x.restore();
    const lk=ease((t-t0-.4)/.5);if(lk>0){x.globalAlpha=lk;label(name,cx,cy+300,46,i==0?INK:PAPER,i==0?PAPER:INK,(i%2?.03:-.03));x.globalAlpha=1}
  });
}''')

# 3 — a ground at night in its club's colours: the bowl from the upper tier, the stand flickering with flares.
BOWL = r"""
function draw(t,T){
  const z=1.0+.08*t/T;x.translate(W/2,H/2);x.scale(z,z);x.rotate(-.01+.02*t/T);x.translate(-W/2,-H/2);
  const sky=x.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0B0D1C');sky.addColorStop(1,'#1E1B2C');x.fillStyle=sky;x.fillRect(-200,-200,W+400,H+400);
  // far stand
  poly(torn([[-100,250],[2020,230],[2020,470],[-100,490]],4,8),'#24202E',true);
  const r=rnd($SEED$);for(let i=0;i<2600;i++){const px=r()*W,py=270+r()*200,c=r();const fl=Math.sin(t*6+i)*.5+.5;x.fillStyle=c<$A$?$COL1$:c<$B$?$COL2$:'rgba(255,251,242,.5)';x.globalAlpha=.55+.45*fl;x.fillRect(px,py,4,4)}x.globalAlpha=1;
  // flares in the curve
  for(let i=0;i<$FLARES$;i++){const fx=220+i*(1480/Math.max(1,$FLARES$-1)),fy=340+Math.sin(i*3)*40,k=.6+.4*Math.sin(t*9+i*2);const g=x.createRadialGradient(fx,fy,2,fx,fy,90*k);g.addColorStop(0,'rgba(255,240,200,.95)');g.addColorStop(.3,$FLARE$);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(fx,fy,90,0,7);x.fill()}
  // smoke drifting
  for(let i=0;i<6;i++){const sx=(i*360+t*40)%2200-140,g=x.createRadialGradient(sx,250,10,sx,250,260);g.addColorStop(0,$SMOKE$);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(sx-300,0,600,520)}
  // pitch
  const pg=x.createLinearGradient(0,480,0,H);pg.addColorStop(0,'#1F5A2E');pg.addColorStop(1,'#2F7A3E');x.fillStyle=pg;x.beginPath();x.moveTo(-200,500);x.lineTo(2120,500);x.lineTo(2120,1300);x.lineTo(-200,1300);x.fill();
  for(let i=0;i<9;i++){x.fillStyle=i%2?'rgba(255,255,255,.04)':'rgba(0,0,0,.05)';x.beginPath();x.moveTo(-200+i*270,500);x.lineTo(-200+(i+1)*270,500);x.lineTo(-500+(i+1)*360,1300);x.lineTo(-500+i*360,1300);x.fill()}
  x.strokeStyle='rgba(255,251,242,.7)';x.lineWidth=4;x.beginPath();x.moveTo(-200,560);x.lineTo(2120,560);x.stroke();x.beginPath();x.ellipse(W/2,760,300,90,0,0,7);x.stroke();x.beginPath();x.moveTo(W/2,560);x.lineTo(W/2,1300);x.stroke();
  // floodlight towers
  for(const fx of [120,1800]){x.fillStyle=INK;x.fillRect(fx-6,40,12,240);x.fillRect(fx-60,20,120,40);const g=x.createRadialGradient(fx,40,4,fx,40,380);g.addColorStop(0,'rgba(255,252,235,.85)');g.addColorStop(1,'rgba(255,252,235,0)');x.fillStyle=g;x.beginPath();x.arc(fx,40,380,0,7);x.fill()}
  // the white side walking out: a line of small white figures
  const k=ease((t-1)/4);for(let i=0;i<11;i++){const px=W/2-600+i*110*k+ (1-k)*-300,py=600;x.fillStyle='#FBFBF7';x.fillRect(px,py,16,40);x.beginPath();x.arc(px+8,py-8,9,0,7);x.fill();x.fillStyle=INK;x.fillRect(px+2,py+40,5,18);x.fillRect(px+9,py+40,5,18)}
  for(let i=0;i<11;i++){const px=W/2+600-i*110*k+(1-k)*300,py=720;x.fillStyle=$HOME$;x.fillRect(px,py,16,40);x.beginPath();x.arc(px+8,py-8,9,0,7);x.fill();x.fillStyle=INK;x.fillRect(px+2,py+40,5,18);x.fillRect(px+9,py+40,5,18)}
  label($PLACE$,W/2,960,58,PAPER,INK,-.02);
}"""
for key, d in {
    'night-piraeus': dict(SEED=11, A='.55', B='.8', COL1="'#C8102E'", COL2="'#FBFBF7'", FLARES=7, FLARE="'rgba(220,40,40,.6)'", SMOKE="'rgba(200,60,60,.10)'", HOME="'#C8102E'", PLACE="'PIRAEUS'"),
    'night-leoforos': dict(SEED=12, A='.6', B='.82', COL1="'#0B7A3B'", COL2="'#FBFBF7'", FLARES=6, FLARE="'rgba(60,200,90,.55)'", SMOKE="'rgba(60,170,90,.10)'", HOME="'#0B7A3B'", PLACE="'ATHENS'"),
    'night-aek': dict(SEED=13, A='.5', B='.8', COL1="'#F2C200'", COL2="'#15130F'", FLARES=7, FLARE="'rgba(250,200,40,.6)'", SMOKE="'rgba(230,190,60,.10)'", HOME="'#F2C200'", PLACE="'ATHENS'"),
}.items():
    js = BOWL
    for k_, v_ in d.items():
        js = js.replace('$' + k_ + '$', str(v_))
    SCENES[key] = (10, js)


def render(names, out: Path):
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        p = b.new_page(viewport={'width': 1920, 'height': 1080})
        for name in names:
            T, js = SCENES[name]
            page = out / f'_{name}.html'
            page.write_text(PAGE.replace('@@F@@', FONTS).replace('@@SCENE@@', js).replace('@@T@@', str(T)))
            p.goto(page.as_uri())
            p.evaluate('document.fonts.ready')
            p.wait_for_timeout(300)
            fr = out / f'_frames-{name}'
            fr.mkdir(exist_ok=True)
            n = int(T * FPS)
            for i in range(n):
                p.evaluate(f'frame({i / FPS})')
                p.locator('#c').screenshot(path=str(fr / f'{i:04d}.jpg'), type='jpeg', quality=88)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', str(fr / '%04d.jpg'),
                            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-an',
                            str(out / f'{name}.mp4')], check=True)
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(T * .8), '-i', str(out / f'{name}.mp4'),
                            '-frames:v', '1', str(out / f'{name}.jpg')], check=True)
            print(name, n, 'frames')
        b.close()


if __name__ == '__main__':
    out = Path(sys.argv[1]).resolve()
    render(sys.argv[2:] or list(SCENES), out)
