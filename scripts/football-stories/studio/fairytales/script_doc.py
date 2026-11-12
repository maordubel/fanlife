"""Football Fairy Tales — the script that goes out with every video (owner, 12.11.2026: "attach the script, as a rule").

    python3 -m studio.fairytales.script_doc <episode.json> <out.docx> [timing.json]

One row per shot: number, time (when a timing.json is given), the cut that brings it in, the picture, the English line,
the club-language line, and where the facts come from. Hebrew cells are written right-to-left.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

LANG_NAME = {'en': 'English', 'he': 'עברית', 'el': 'Ελληνικά'}


def _rtl(par) -> None:
    ppr = par._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    ppr.append(bidi)
    for r in par.runs:
        rpr = r._r.get_or_add_rPr()
        rtl = OxmlElement('w:rtl')
        rtl.set(qn('w:val'), '1')
        rpr.append(rtl)


def _cell(cell, text: str, rtl: bool = False, size: float = 9, bold: bool = False, grey: bool = False) -> None:
    cell.text = ''
    par = cell.paragraphs[0]
    run = par.add_run(text)
    run.font.size = Pt(size)
    run.bold = bold
    if grey:
        run.font.color.rgb = RGBColor(0x66, 0x5E, 0x55)
    if rtl:
        _rtl(par)


def _mmss(s: float) -> str:
    return f'{int(s // 60)}:{int(s % 60):02d}'


def build(ep: dict, out: Path, timing: dict | None = None) -> Path:
    langs = [l for l in ep['voice'] if l != 'chosen']
    other = next((l for l in langs if l != 'en'), None)
    starts = {t['shot']: t['start'] for t in (timing or {}).get('shots', [])}
    doc = Document()
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width, sec.page_height = sec.page_height, sec.page_width
    for side in ('left_margin', 'right_margin', 'top_margin', 'bottom_margin'):
        setattr(sec, side, Cm(1.4))
    doc.add_heading(f"{ep['series']} — {ep['title']['en']}", level=1)
    if other:
        p = doc.add_paragraph(ep['title'][other])
        if other == 'he':
            _rtl(p)
    total = (timing or {}).get('total')
    meta = [f"{len(ep['shots'])} shots", 'narrator: ' + ', '.join(f"{LANG_NAME[l]} {ep['voice'][l]}" for l in langs)]
    if total:
        meta.insert(0, f'length {_mmss(total)}')
    doc.add_paragraph(' · '.join(meta))
    cols = ['#', 'time', 'cut · picture', 'English'] + ([LANG_NAME[other]] if other else []) + ['sources']
    table = doc.add_table(rows=1, cols=len(cols))
    table.style = 'Light Grid Accent 1'
    for i, c in enumerate(cols):
        _cell(table.rows[0].cells[i], c, bold=True)
    for k, s in enumerate(ep['shots'], 1):
        row = table.add_row().cells
        _cell(row[0], str(k))
        _cell(row[1], _mmss(starts[s['id']]) if s['id'] in starts else '')
        _cell(row[2], f"{s.get('transition', '')} · {s['plate']}\n{s['id']}", grey=True, size=8)
        _cell(row[3], s['en'])
        if other:
            _cell(row[4], s[other], rtl=other == 'he')
        _cell(row[-1], '\n'.join(s.get('sources', [])), grey=True, size=7)
    widths = [Cm(0.8), Cm(1.2), Cm(3.2), Cm(7.6)] + ([Cm(7.6)] if other else []) + [Cm(5.4)]
    for row in table.rows:
        for c, w in zip(row.cells, widths):
            c.width = w
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out)
    return out


def main() -> None:
    ep = json.loads(Path(sys.argv[1]).read_text())
    timing = json.loads(Path(sys.argv[3]).read_text()) if len(sys.argv) > 3 else None
    print(build(ep, Path(sys.argv[2]), timing))


if __name__ == '__main__':
    main()
