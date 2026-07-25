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

Push ไป `main` แล้ว GitHub Actions จะ build + deploy ให้อัตโนมัติ

ตั้งค่าครั้งแรก: **Settings → Pages → Source = GitHub Actions**

```bash
npm install
npm run build          # ออกที่ dist/ (base /GovTaskPro/)
npm run preview
```

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
