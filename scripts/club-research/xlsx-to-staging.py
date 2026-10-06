#!/usr/bin/env python3
"""Research package (xlsx) -> research-staging/<club>/*.json. Lossless: cells that hold JSON are parsed,
'None' strings become null, nothing is approved or invented. Usage: xlsx-to-staging.py <club> <file.xlsx>"""
import sys,json,gzip,os,re,openpyxl
club,path=sys.argv[1],sys.argv[2]
out=f'research-staging/{club}';os.makedirs(out,exist_ok=True)
SHEETS={'זהות המועדון':'club-identity','תקופות אימון':'coach-spells','מחלוקות':'conflicts','תרבות מגרשים מדים':'culture-venues-kits','גמרי גביע לפי עונה':'cup-final-assertions','סגל נוכחי':'current-squad','מאמן נוכחי':'current-staff','טבלאות מוקדמות':'early-tables','קמפיינים UEFA':'uefa-campaigns','מפגשים אירופיים RSSSF':'euro-ties','ראיות':'evidence','בעיות חילוץ':'extraction-issues','סטטיסטיקת זרים בליגה':'foreign-stats','טענות שער':'goal-claims','פרופילים נבחרים':'highlights','אינדקס משחקים היסטוריים':'historical-index','מטריצות תוצאות':'result-matrix','פרקי ארכיון':'chapters','תארים':'honours','טבלאות 1959 עד 1999':'league-tables','רשימות הרכב':'lineups','אירועי משחק':'match-events','משחקים':'matches','שחקני ארכיון':'archive-players','הסגר':'quarantined','משימות השלמה':'backlog','כיסוי עונות':'season-coverage','מקורות':'sources','ציר זמן':'timeline','טענות ברמת שדה':'claims'}
def cell(v):
    if v is None or v=='None': return None
    if isinstance(v,str) and v[:1] in '[{':
        try: return json.loads(v)
        except Exception: return v
    return v
wb=openpyxl.load_workbook(path,read_only=True);counts={}
for ws in wb:
    name=SHEETS.get(ws.title)
    if not name: continue
    rows=ws.iter_rows(values_only=True);head=list(next(rows))
    recs=[{h:cell(c) for h,c in zip(head,r) if h} for r in rows if any(c is not None for c in r)]
    counts[name]=len(recs)
    if name in('claims','evidence'):
        with gzip.open(f'{out}/{name}.jsonl.gz','wt',encoding='utf-8',compresslevel=9) as f:
            for r in recs: f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
    else:
        json.dump(recs,open(f'{out}/{name}.json','w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
json.dump({'club':club,'snapshotAsOf':'2026-10-06','researchVersion':1,'approvedForProduction':0,'counts':counts},open(f'{out}/manifest.json','w'),ensure_ascii=False,indent=1)
print(counts)
