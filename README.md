<p align="center">
  <img src="src/assets/logo.webp" alt="Mersal Info Center Logo" width="120"/>
</p>

<h1 align="center">مركز معلومات مرسال — Mersal Info Center</h1>

<p align="center">
  تطبيق سطح مكتب لإدارة وعرض بيانات مؤسسة مرسال الخيرية
  <br/>
  Desktop application for managing and viewing Mersal Foundation data
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-blue" alt="Platform"/>
  <img src="https://img.shields.io/badge/License-Private-red" alt="License"/>
</p>

---

## 📋 الوصف | Description

**مركز معلومات مرسال** هو تطبيق سطح مكتب مبني بتقنية **Electron** يتيح لموظفي مؤسسة مرسال الخيرية:

- 📊 عرض وتصفح بيانات الحالات والخدمات  
- 🔍 البحث المتقدم وفلترة البيانات  
- 📥 تحميل البيانات تلقائيًا من OneDrive  
- 💾 تخزين مؤقت محلي (Cache) لسرعة الأداء  
- 📤 تصدير البيانات إلى ملفات Excel  

---

## 🛠️ المتطلبات | Prerequisites

| الأداة | الإصدار المطلوب | رابط التحميل |
|--------|----------------|-------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.8+ | [python.org](https://www.python.org/) |
| **Git** | أي إصدار | [git-scm.com](https://git-scm.com/) |

---

## 🚀 التشغيل المحلي | Local Development

```bash
# 1. استنساخ المشروع
git clone https://github.com/YOUR_USERNAME/mersal-info-center.git
cd mersal-info-center

# 2. تثبيت المكتبات
npm install

# 3. تثبيت مكتبات Python
pip install requests

# 4. تشغيل التطبيق
npm start
```

---

## 📦 بناء ملف التثبيت | Building

### Windows (EXE)
```bash
npm run build:win
```

### Linux (AppImage / deb)
```bash
npm run build:linux
```

### الكل | All Platforms
```bash
npm run build:all
```

> 📁 ملفات البناء تظهر في مجلد `build/`

---

## 📂 هيكل المشروع | Project Structure

```
mersal-info-center/
├── main.js              # Electron main process
├── preload.js           # Secure bridge (contextBridge)
├── download_helper.py   # Python download utility
├── package.json         # Dependencies & build config
├── src/
│   ├── index.html       # Main UI page
│   ├── js/
│   │   └── app.js       # Frontend JavaScript
│   ├── styles/
│   │   └── main.css     # UI Styles
│   └── assets/
│       └── logo.webp    # App logo
└── README.md
```

---

## 📖 دليل بناء ملف EXE على Windows

للاطلاع على الدليل التفصيلي خطوة بخطوة باللغة العربية لبناء ملف `.exe` على نظام Windows، راجع:

**[`BUILD_GUIDE_AR.md`](BUILD_GUIDE_AR.md)**

---

## 👥 المساهمون | Contributors

- **Moataz Samy** — Development & Architecture

---

## 📄 الترخيص | License

هذا المشروع خاص بمؤسسة مرسال الخيرية — جميع الحقوق محفوظة.

This project is proprietary to Mersal Foundation — All rights reserved.
