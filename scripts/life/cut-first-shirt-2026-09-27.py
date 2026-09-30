"""
The first shirt — the photograph Maor sent on 27.9.2026, as `shirtVisa86`.

    python3 scripts/life/cut-first-shirt-2026-09-27.py <photo.png>

1. Cut from the studio backdrop: the backdrop is flat cream; the cast shadow is the same
   cream, darker and WARMER (r-b >= 14), while the white bands and collar are cool
   (r-b < 10). Everything backdrop- or shadow-like that touches the frame is outside.
2. De-fringe: edge pixels take their colour from the opaque interior.
3. Trim, resize to the rail's width (963, like its neighbours).
4. Rule 8: VISA's gold band is taken to brown (hue 22, S <= .46, V x .66) over a band wider
   than the scanner's (rule 44), nearly-clear pixels are cleared, and the WebP is chosen by
   counting yellow on the DECODE (rule 61) — lossless if no lossy quality reaches zero.
"""
import numpy as np, cv2
from PIL import Image
import sys
src=sys.argv[1]  # the photograph Maor sent on 27.9.2026
im8=np.array(Image.open(src).convert('RGB')); im=im8.astype(float)
h,w=im.shape[:2]
bg=np.median(np.concatenate([im[:15].reshape(-1,3),im[-15:].reshape(-1,3)]),0)
r,g,b=im[...,0],im[...,1],im[...,2]
d=np.sqrt(((im-bg)**2).sum(2))
bglike=(d<10)&(r-b>=7)
# cast shadow: the backdrop, darker — warm, unsaturated, same hue as the backdrop
br=b/np.maximum(r,1); gr=g/np.maximum(r,1)
shadow=(r-b>=14)&(r-b<48)&(r-g<24)&(r>185)&(g>160)
region=((bglike|shadow)*255).astype(np.uint8)
region=cv2.morphologyEx(region,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
n,lab=cv2.connectedComponents(region)
border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
ext=np.isin(lab,list(border))
fg=(~ext).astype(np.uint8)*255
n,lab,st,_=cv2.connectedComponentsWithStats(fg)
k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); fg=np.where(lab==k,255,0).astype(np.uint8)
fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
fg=cv2.morphologyEx(fg,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
fg=cv2.erode(fg,np.ones((3,3),np.uint8))
a=cv2.GaussianBlur(fg,(0,0),0.9)
# de-fringe: edge pixels take colour from the opaque interior nearby
inner=cv2.erode(fg,np.ones((7,7),np.uint8))>0
col=im8.copy()
edge=(a>0)&~inner
if edge.any():
    blur=cv2.blur(im8.astype(np.float32)*inner[...,None],(9,9)); wgt=cv2.blur(inner.astype(np.float32),(9,9))
    fill=(blur/np.maximum(wgt[...,None],1e-3)).clip(0,255).astype(np.uint8)
    use=edge&(wgt>0.05)
    col[use]=fill[use]
raw=Image.fromarray(np.dstack([col,a]))

# ---- finish
import io
OUT='public/life/art/shirtVisa86.webp'
im=raw
# trim to alpha, pad a little, resize to the rail's width (963, like its neighbours)
bb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
im=im.crop(bb)
W=963; H=round(im.height*W/im.width)
im=im.resize((W,H),Image.LANCZOS)
a=np.array(im).astype(float)
rgb=a[...,:3]/255.0
mx=rgb.max(2); mn=rgb.min(2); d=mx-mn
s=np.where(mx>0,d/np.maximum(mx,1e-6),0)
r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
hue=np.zeros_like(mx)
m=d>0
i=m&(mx==r); hue[i]=(60*(((g-b)/np.where(d>0,d,1))%6))[i]
i=m&(mx==g)&~(mx==r); hue[i]=(60*((b-r)/np.where(d>0,d,1)+2))[i]
i=m&(mx==b)&~(mx==r)&~(mx==g); hue[i]=(60*((r-g)/np.where(d>0,d,1)+4))[i]
# the paint band (rule 44), wider than the scanner's: VISA's gold goes old-brown
import scipy.ndimage as nd
band=(hue>=26)&(hue<=80)&(s>=0.18)
band=nd.binary_dilation(band,iterations=2)&(hue>=18)&(hue<=90)&(s>=0.10)
print('band px', int(band.sum()))
H2=np.full_like(hue,22.0); S2=np.minimum(s,0.46); V2=mx*0.66
def hsv2rgb(h,s,v):
    h=(h/60)%6; c=v*s; x=c*(1-np.abs(h%2-1)); z=np.zeros_like(h)
    k=np.floor(h).astype(int)
    rr=np.choose(k,[c,x,z,z,x,c]); gg=np.choose(k,[x,c,c,x,z,z]); bb_=np.choose(k,[z,z,x,c,c,x])
    mm=v-c; return np.stack([rr+mm,gg+mm,bb_+mm],-1)
new=hsv2rgb(H2,S2,V2)
rgb[band]=new[band]
out=np.dstack([(rgb*255).round().clip(0,255),a[...,3]]).astype(np.uint8)
# nearly-clear pixels carry resampling garbage in their colour; make them truly clear, neutral
clear=out[...,3]<10
out[clear]=0

def yellow(arr):
    f=arr[...,:3].astype(float); alpha=arr[...,3]
    mx=f.max(2); mn=f.min(2); d=mx-mn; s=np.where(mx>0,d/np.maximum(mx,1),0); v=mx/255
    r,g,b=f[...,0],f[...,1],f[...,2]; h=np.zeros_like(mx); m=d>0
    i=m&(mx==r); h[i]=(60*(((g-b)/np.where(d>0,d,1))%6))[i]
    i=m&(mx==g)&~(mx==r); h[i]=(60*((b-r)/np.where(d>0,d,1)+2))[i]
    i=m&(mx==b)&~(mx==r)&~(mx==g); h[i]=(60*((r-g)/np.where(d>0,d,1)+4))[i]
    return int(((s>=0.35)&(v>=0.35)&(h>=38)&(h<=70)&(alpha>0)).sum())
for q in [92,90,86]:
    buf=io.BytesIO(); Image.fromarray(out).save(buf,'WEBP',quality=q,method=6); dec=np.array(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))
    print(q, len(buf.getvalue()), 'yellow on decode', yellow(dec))
    if yellow(dec)==0:
        open(OUT,'wb').write(buf.getvalue()); print('chosen',q); break
else:
    buf=io.BytesIO(); Image.fromarray(out).save(buf,'WEBP',lossless=True); open(OUT,'wb').write(buf.getvalue()); print('lossless', len(buf.getvalue()), yellow(np.array(Image.open(io.BytesIO(buf.getvalue())).convert('RGBA'))))
print(W,H)
