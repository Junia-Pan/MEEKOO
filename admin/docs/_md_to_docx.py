# -*- coding: utf-8 -*-
"""
主要用途：
  将 Markdown 格式的产品需求文档（PRD）转换为 Word（.docx），便于评审与对外分发。

默认输入/输出：
  admin/docs/提拆派报价需求文档.md  →  admin/docs/提拆派报价需求文档.docx

用法：
  python admin/docs/_md_to_docx.py

说明：
  支持标题、表格、列表、加粗、Mermaid 代码块（以等宽文本保留）、
  图片引用 ![说明](images/提拆派报价/xx.png)（需先运行 _capture_prd_screenshots.py 或手动放入截图）。
  若 docx 被 Word 占用，会改写到「提拆派报价需求文档-最新.docx」。
"""
import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, Inches
from docx.enum.table import WD_TABLE_ALIGNMENT


def set_cell_shading(cell, fill_hex: str):
    from docx.oxml import OxmlElement

    tc_pr = cell._element.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill_hex)
    shd.set(qn("w:val"), "clear")
    tc_pr.append(shd)


def set_doc_font(doc):
    style = doc.styles["Normal"]
    style.font.name = "微软雅黑"
    style.font.size = Pt(10.5)
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")


def add_table(doc, rows):
    if not rows:
        return
    col_count = max(len(r) for r in rows)
    table = doc.add_table(rows=len(rows), cols=col_count)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j in range(col_count):
            cell = table.rows[i].cells[j]
            text = row[j] if j < len(row) else ""
            cell.text = text.strip()
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.name = "微软雅黑"
                    run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
                    run.font.size = Pt(10)
            if i == 0:
                for run in cell.paragraphs[0].runs:
                    run.bold = True
    doc.add_paragraph()


def add_markdown_image(doc, md_path: Path, alt: str, src: str):
    img_path = Path(src)
    if not img_path.is_absolute():
        img_path = (md_path.parent / img_path).resolve()
    if not img_path.is_file():
        p = doc.add_paragraph()
        run = p.add_run(f"[图片缺失: {src}]")
        run.font.name = "微软雅黑"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
        run.font.color.rgb = None
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(img_path), width=Inches(5.5))
    caption = (alt or img_path.stem).strip()
    if caption:
        cap = doc.add_paragraph(caption)
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in cap.runs:
            run.font.name = "微软雅黑"
            run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
            run.font.size = Pt(9)
            run.italic = True


def parse_md_to_docx(md_path: Path, docx_path: Path):
    lines = md_path.read_text(encoding="utf-8").splitlines()
    doc = Document()
    set_doc_font(doc)

    sections = doc.sections
    for section in sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(3.17)
        section.right_margin = Cm(3.17)

    i = 0
    table_buf = []

    def flush_table():
        nonlocal table_buf
        if table_buf:
            add_table(doc, table_buf)
            table_buf = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("|") and "|" in stripped[1:]:
            if re.match(r"^\|[\s\-:|]+\|$", stripped):
                i += 1
                continue
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            table_buf.append(cells)
            i += 1
            continue
        else:
            flush_table()

        if stripped == "---":
            doc.add_paragraph()
            i += 1
            continue

        if stripped.startswith("# "):
            doc.add_heading(stripped[2:].strip(), level=1)
            i += 1
            continue
        if stripped.startswith("## "):
            doc.add_heading(stripped[3:].strip(), level=2)
            i += 1
            continue
        if stripped.startswith("### "):
            doc.add_heading(stripped[4:].strip(), level=3)
            i += 1
            continue
        if stripped.startswith("#### "):
            doc.add_heading(stripped[5:].strip(), level=4)
            i += 1
            continue

        if stripped.startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1
            p = doc.add_paragraph()
            run = p.add_run("\n".join(code_lines))
            run.font.name = "Consolas"
            run.font.size = Pt(9)
            p.paragraph_format.left_indent = Cm(0.5)
            continue

        if stripped.startswith("> "):
            p = doc.add_paragraph(stripped[2:].strip())
            p.paragraph_format.left_indent = Cm(0.5)
            for run in p.runs:
                run.italic = True
            i += 1
            continue

        img_m = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", stripped)
        if img_m:
            add_markdown_image(doc, md_path, img_m.group(1), img_m.group(2))
            i += 1
            continue

        if stripped.startswith("- "):
            text = stripped[2:].strip()
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
            doc.add_paragraph(text, style="List Bullet")
            i += 1
            continue

        cap_m = re.match(r"^\*([^*]+)\*$", stripped)
        if cap_m:
            cap = doc.add_paragraph(cap_m.group(1).strip())
            cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in cap.runs:
                run.font.name = "微软雅黑"
                run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
                run.font.size = Pt(9)
                run.italic = True
            i += 1
            continue

        m = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if m:
            # 使用正文段落 + 显式序号，避免 Word 全局连续编号导致 4.3 节从 9 开始
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", m.group(2))
            p = doc.add_paragraph()
            run = p.add_run(f"{m.group(1)}. {text}")
            run.font.name = "微软雅黑"
            run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
            i += 1
            continue

        if not stripped:
            i += 1
            continue

        text = stripped
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        p = doc.add_paragraph()
        parts = re.split(r"(\*\*.+?\*\*)", stripped)
        for part in parts:
            if part.startswith("**") and part.endswith("**"):
                run = p.add_run(part[2:-2])
                run.bold = True
            else:
                run = p.add_run(re.sub(r"\*\*(.+?)\*\*", r"\1", part))
            run.font.name = "微软雅黑"
            run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
        i += 1

    flush_table()
    doc.save(docx_path)


if __name__ == "__main__":
    import shutil

    base = Path(__file__).resolve().parent
    md = base / "提拆派报价需求文档.md"
    out = base / "提拆派报价需求文档.docx"
    tmp = base / "提拆派报价需求文档._gen.docx"
    parse_md_to_docx(md, tmp)
    try:
        shutil.copy2(tmp, out)
        tmp.unlink(missing_ok=True)
        print(f"Generated: {out}")
    except PermissionError:
        fallback = base / "提拆派报价需求文档-最新.docx"
        shutil.copy2(tmp, fallback)
        tmp.unlink(missing_ok=True)
        print(f"目标文件被占用，已生成: {fallback}")
        print("请关闭 Word 中的旧 docx 后重新运行本脚本以覆盖正式文件名。")
