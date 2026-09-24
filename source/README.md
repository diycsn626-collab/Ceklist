# Source workbook

Letakkan workbook audit terbaru di folder ini bila ingin regenerate master checklist.

Contoh:

```bash
python scripts/extract_checklist.py "source/Checklist_Audit_SOP_ASKON_Engineering_HSE.xlsx"
```

Script hanya membaca sheet `Engineering` dan `HSE`, lalu menulis ulang `src/data/checklist.json`.
