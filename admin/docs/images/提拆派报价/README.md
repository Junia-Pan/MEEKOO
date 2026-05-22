# 提拆派报价 — PRD 图片目录

界面截图与流程图 PNG 均放在本目录，供 `提拆派报价需求文档.md` 引用；导出 docx 时自动嵌入。

## 建议文件名

| 文件 | 内容 | 生成方式 |
|------|------|----------|
| `01-列表页.png` | 报价列表全貌 | `_capture_prd_screenshots.py` |
| `02-编辑页-基础信息.png` | 编辑页顶部表单 | 同上 |
| `03-编辑页-价目Tab.png` | 任一价目 Tab + 费用项绑定 | 同上 |
| `04-状态与提示.png` | 只读态 / Toast / 报错（可选） | 同上 |
| `05-核心业务流程.png` | 第 3.1 章主流程图 | `_render_mermaid.py` |
| `06-页面流转图.png` | 第 3.2 章页面跳转 | `_render_mermaid.py` |

Mermaid 源码：`admin/docs/diagrams/提拆派报价/*.mmd`

## 维护命令

```bash
python admin/docs/_capture_prd_screenshots.py
python admin/docs/_render_mermaid.py
python admin/docs/_md_to_docx.py
```

## 截图建议

- 分辨率：宽度 1280～1920px，保证文字可读
- 敏感信息：客户名、金额等可打码
- 浏览器：与员工端验收环境一致（Chrome / Edge）
