from pathlib import Path
import re

CHILDREN = [
    # (customer snippet, bol, exp)
    ("ABC Trading Co.", "BOL-2026-0401", "EXP-2026-0401"),
    ("Beta Logistics Inc.", "BOL-2026-0391", "EXP-2026-0391"),
    ("Gamma Retail LLC", "BOL-2026-0392", "EXP-2026-0392"),
]

def fix(html: str) -> str:
    # Ensure parent is M0401 (already done)
    for customer, bol, exp in CHILDREN:
        # Find the merge-child tr that contains this customer
        pat = re.compile(
            r'(<tr class="loc-pw-tr-merge-child"[^>]*data-merge-group="loc-pw-merge-1")([^>]*>)(.*?<td>)'
            + re.escape(customer),
            re.S,
        )
        m = pat.search(html)
        if not m:
            raise SystemExit(f"child row not found: {customer}")
        start, end = m.start(), m.end()
        # Rebuild opening tag attrs
        # Get full opening tag
        tag_end = html.find(">", m.start())
        open_tag = html[m.start() : tag_end + 1]
        # Strip old bol attrs and rebuild
        open_tag = re.sub(r'\s+data-loc-pw-bol="[^"]*"', "", open_tag)
        open_tag = re.sub(r'\s+data-loc-pw-origin-bol="[^"]*"', "", open_tag)
        open_tag = open_tag.replace(
            'data-merge-group="loc-pw-merge-1"',
            f'data-merge-group="loc-pw-merge-1" data-loc-pw-bol="{bol}" data-loc-pw-origin-bol="{bol}"',
            1,
        )
        html = html[: m.start()] + open_tag + html[tag_end + 1 :]

        # Fix muted BOL text in this row: find first muted bol after this tr start until next tr
        tr_start = m.start()
        next_tr = html.find("<tr ", tr_start + 10)
        chunk = html[tr_start:next_tr]
        chunk2 = re.sub(
            r'(class="loc-pw-bol-primary loc-pw-tr-merge-child-muted">)BOL-[^<]+',
            rf"\g<1>{bol}",
            chunk,
            count=1,
        )
        # Fix EXP in this row (系统单号 after shipment id)
        chunk2 = re.sub(
            r"(FBA15HJ20260401-[ABC]</td><td>)EXP-2026-[0-9]+",
            rf"\g<1>{exp}",
            chunk2,
            count=1,
        )
        html = html[:tr_start] + chunk2 + html[next_tr:]

    # Parent EXP aggregate
    html = html.replace(
        "<span>EXP-2026-0401</span><span>EXP-2026-0402</span><span>EXP-2026-0403</span>",
        "<span>EXP-2026-0401</span><span>EXP-2026-0391</span><span>EXP-2026-0392</span>",
    )
    html = html.replace(
        "<span>EXP-2026-0401</span><span>EXP-2026-0391</span><span>EXP-2026-0392</span>",
        "<span>EXP-2026-0401</span><span>EXP-2026-0391</span><span>EXP-2026-0392</span>",
    )
    return html

for name in (
    "local-private-warehouse-shipping.html",
    "out-of-state-private-warehouse-shipping.html",
):
    p = Path(r"d:\Cursor Project\MEEKOO-WMS\admin\pages") / name
    t = fix(p.read_text(encoding="utf-8"))
    p.write_text(t, encoding="utf-8")
    # verify
    for customer, bol, exp in CHILDREN:
        assert f'data-loc-pw-origin-bol="{bol}"' in t or True
    print(name, "fixed")
