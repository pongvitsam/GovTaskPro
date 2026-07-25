# GovTaskPro

ระบบจัดการงาน/โปรเจกต์ — **React frontend บน GitHub Pages** + **Google Apps Script / Sheets backend**

## URLs

| ส่วน | URL |
|------|-----|
| Frontend (GitHub Pages) | https://pongvitsam.github.io/GovTaskPro/ |
| Backend / bridge | https://script.google.com/macros/s/AKfycbx7hW5XO0qGwApnthIHOLxevSrGwyxm7K1P1NCbmmZyyDbv1InzKibX2WY-JgE4FSgYWQ/exec |
| Script editor | https://script.google.com/d/1zONm-pkadJXG9_JoV7tb9maJeEfX6WlUW8stHSB18FaWrXQgFCWZdw32/edit |

Script ID: `1zONm-pkadJXG9_JoV7tb9maJeEfX6WlUW8stHSB18FaWrXQgFCWZdw32`

## GitHub Pages (frontend)

URL: **https://pongvitsam.github.io/GovTaskPro/**

### ตั้งค่าครั้งแรก (สำคัญ)

เปิด https://github.com/pongvitsam/GovTaskPro/settings/pages แล้วเลือก:

1. **Source** = `Deploy from a branch`
2. **Branch** = `main`
3. **Folder** = `/docs`
4. Save

### Deploy frontend

```bash
npm run build:pages
git add docs && git commit -m "Update Pages build" && git push
```

มี workflow `.github/workflows/deploy-pages.yml` สำรอง (ถ้าตั้ง Source = GitHub Actions)
## Apps Script (backend)

```bash
npm run deploy         # build GAS embed + clasp push + อัปเดต deployment
```

- `?bridge=1` — iframe API สำหรับ Pages (`google.script.run`)
- `?embed=1` — UI เก่าใน HtmlService (optional)
- ไม่มี query — redirect ไป GitHub Pages

Web app access ต้องเป็น **Anyone**

## พัฒนา local

```bash
npm run dev            # mock DB ในหน่วยความจำ
# หรือทดสอบกับ Sheets จริง:
# VITE_USE_GAS=1 npm run dev
```

## โครงสร้าง

| ส่วน | รายละเอียด |
|------|------------|
| `src/` | React UI (GitHub Pages) |
| `gas/Code.js` | API + Sheets DB |
| `gas/Bridge.html` | postMessage bridge สำหรับ Pages |
| `.github/workflows/` | Deploy Pages |
