#!/usr/bin/env python3
"""Upload one rendered MP4 as private to the explicitly identified channel.

Needs a short-lived user OAuth access token in YOUTUBE_ACCESS_TOKEN. This is
not an OAuth login implementation, scheduler, or automatic public publishing.
A failed or interrupted upload is recorded as uncertain and never auto-retried.
"""
import argparse
import hashlib
import http.client
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

EXPECTED_CHANNEL='UC2KULoLBFCSZC4jeRGYkKfQ'

class UploadError(Exception):pass

def request_json(url,token,method='GET',data=None):
    headers={'Authorization':'Bearer '+token}
    if data is not None:headers['Content-Type']='application/json; charset=UTF-8'
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)
    except (urllib.error.URLError,TimeoutError,ValueError) as e:raise UploadError('YouTube request failed; check authorization and network') from e

def initiate(token,meta,size):
    url='https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status'
    body=json.dumps(meta).encode('utf-8')
    req=urllib.request.Request(url,data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Length':str(size),'X-Upload-Content-Type':'video/mp4'},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=60) as r:location=r.headers.get('Location')
    except (urllib.error.URLError,TimeoutError) as e:raise UploadError('Could not start upload; outcome may be uncertain') from e
    if not location:raise UploadError('YouTube did not provide an upload session')
    parsed=urllib.parse.urlsplit(location)
    if parsed.scheme!='https' or parsed.hostname not in {'www.googleapis.com','youtube.googleapis.com'} or parsed.username or parsed.password:
        raise UploadError('Unexpected upload session host')
    return parsed

def upload(token,video,metadata_path,state_path):
    if not token:raise UploadError('YOUTUBE_ACCESS_TOKEN is not configured')
    if not video.is_file() or video.suffix.lower()!='.mp4':raise UploadError('A local MP4 is required')
    try: spec=json.loads(metadata_path.read_text(encoding='utf-8'))
    except (OSError,ValueError) as e:raise UploadError('Cannot read metadata JSON') from e
    title=spec.get('title');description=spec.get('description','')
    if not isinstance(title,str) or not title.strip() or len(title)>100 or not isinstance(description,str) or len(description)>5000:raise UploadError('Invalid title or description')
    if spec.get('channel_id')!=EXPECTED_CHANNEL:raise UploadError('Metadata must identify the configured FanLife channel')
    if not isinstance(spec.get('contains_synthetic_media'),bool):raise UploadError('Explicit synthetic media disclosure is required')
    digest=hashlib.sha256()
    with video.open('rb') as f:
        while chunk:=f.read(1024*1024):digest.update(chunk)
    h=digest.hexdigest()
    channels=request_json('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',token)
    if [x.get('id') for x in channels.get('items',[])]!=[EXPECTED_CHANNEL]:raise UploadError('The authorized YouTube channel does not match FanLife')
    state_path.parent.mkdir(parents=True,exist_ok=True)
    try:
        with state_path.open('x',encoding='utf-8') as f:json.dump({'status':'attempt_started','channel_id':EXPECTED_CHANNEL,'sha256':h},f)
    except FileExistsError as e:raise UploadError('Upload state exists; inspect the channel before any retry') from e
    meta={'snippet':{'title':title.strip(),'description':description,'categoryId':'17','defaultLanguage':'en'},'status':{'privacyStatus':'private','selfDeclaredMadeForKids':False,'containsSyntheticMedia':spec['contains_synthetic_media']}}
    session=initiate(token,meta,video.stat().st_size)
    path=urllib.parse.urlunsplit(('', '',session.path,session.query,''))
    conn=http.client.HTTPSConnection(session.hostname,timeout=120)
    try:
        conn.putrequest('PUT',path);conn.putheader('Content-Type','video/mp4');conn.putheader('Content-Length',str(video.stat().st_size));conn.endheaders()
        with video.open('rb') as f:
            while chunk:=f.read(1024*1024):conn.send(chunk)
        response=conn.getresponse();data=response.read(1024*1024)
        if response.status not in (200,201):raise UploadError(f'Upload HTTP {response.status}; outcome may be uncertain')
        result=json.loads(data)
        if not isinstance(result.get('id'),str):raise UploadError('Upload response missing video ID; inspect channel before retry')
    except (OSError,TimeoutError,ValueError,http.client.HTTPException) as e:raise UploadError('Upload interrupted; inspect channel before retry') from e
    finally:conn.close()
    # State never contains tokens or resumable URLs.
    state_path.write_text(json.dumps({'status':'uploaded_private','channel_id':EXPECTED_CHANNEL,'sha256':h,'video_id':result['id']}),encoding='utf-8')
    return result['id']

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('video',type=Path);p.add_argument('metadata',type=Path);p.add_argument('state',type=Path);a=p.parse_args()
    try:vid=upload(os.environ.get('YOUTUBE_ACCESS_TOKEN','').strip(),a.video,a.metadata,a.state)
    except (UploadError,OSError) as e:print('Upload error:',e,file=sys.stderr);return 1
    print('Private video uploaded:',vid);return 0
if __name__=='__main__':raise SystemExit(main())
