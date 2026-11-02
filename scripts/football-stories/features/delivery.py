"""The week's FAN LIFE videos → one Telegram delivery: an opening note, then each Short with its copy-paste (YouTube title,
Instagram/TikTok caption, the first comment that holds the answer), then the film with its title and description.

    python3 scripts/football-stories/features/delivery.py <week.json> <out dir> <raw base url> > delivery.json
"""
from __future__ import annotations

import html
import json
import sys
from pathlib import Path

week = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
base = sys.argv[3].rstrip('/')
rep = json.loads((out / 'shorts-report.json').read_text()) if (out / 'shorts-report.json').exists() else {}
film = json.loads((out / 'film-report.json').read_text()) if (out / 'film-report.json').exists() else {'made': False}
pre = lambda s: '<pre>' + html.escape(s) + '</pre>'
DAYNAME = {'Mon': 'שני', 'Tue': 'שלישי', 'Wed': 'רביעי', 'Thu': 'חמישי', 'Fri': 'שישי', 'Sat': 'שבת', 'Sun': 'ראשון'}

items = [{'before': [
    f"🎬 <b>FAN LIFE · סרטוני השבוע · {week['week']}</b>\n"
    f"{len(rep)} שורטס + {'סרט אחד' if film.get('made') else 'בלי סרט השבוע'} — מתחיל ב-{week['monday']}.\n\n"
    "מה לעשות:\n"
    "1. לצפות. מה שלא עובר — כותבים לי בצ'אט איזה (למשל: \"בלי רביעי\").\n"
    "2. לאשר לי בצ'אט — אני מעלה ליוטיוב ומתזמן: שורט כל יום ב-18:00, הסרט ביום ראשון ב-19:00.\n"
    "3. אינסטגרם / טיקטוק / פייסבוק: אותו קובץ, הטקסט מהבלוק שמתחת לכל סרטון, ובתגובה הראשונה — התשובה (בלוק שני).\n"
    "המלצה: להעלות לאינסטגרם ולטיקטוק באותו יום של הסרטון, 18:00–20:00 שעון אתונה."]}]
for i, s in enumerate(week['shorts']):
    r = rep.get(str(i)) or rep.get(i)
    if not r:
        continue
    items.append({
        'video': {'url': f"{base}/{r['file']}", 'name': r['file'], 'width': 1080, 'height': 1920,
                  'caption': f"<b>{DAYNAME.get(s['day'], s['day'])} · {html.escape(s['clubName'])} · {html.escape(s['kind'])}</b>\n{html.escape(s['hook'])}"},
        'messages': [
            '📺 <b>YouTube Shorts — title</b>\n' + pre(s['title']),
            '📸 <b>Instagram / TikTok / Facebook — caption</b>\n' + pre(s['caption']),
            '📌 <b>First comment (the answer — after posting)</b>\n' + pre(s['comment']),
        ]})
if film.get('made'):
    items.append({
        'video': {'url': f"{base}/{film['file']}", 'name': film['file'], 'width': 1920, 'height': 1080,
                  'caption': f"🎞 <b>סרט השבוע · {html.escape(film['feature'])}</b> · {html.escape(film['club'])}"},
        'messages': ['📺 <b>YouTube — title</b>\n' + pre(film['title']), '📝 <b>YouTube — description</b>\n' + pre(film['description'][:3500])]})
elif film.get('why'):
    items.append({'before': [f"🎞 סרט השבוע ({html.escape(film.get('feature', ''))}) לא נוצר: {html.escape(film['why'])}."]})
print(json.dumps({'week': week['week'], 'items': items}, ensure_ascii=False, indent=2))
