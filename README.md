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
| **Git LFS** | أي إصدار | [git-lfs.com](https://git-lfs.com/) |

> ⚠️ **مهم — قاعدة البيانات:** هذا المشروع يستخدم **Git LFS** لتخزين ملف `mersal.db` (276 MB). إذا استنسخت المشروع بدون تثبيت Git LFS مسبقاً، ستجد التطبيق يعمل لكن **بدون بيانات**. تأكد من تنفيذ الخطوة التالية أولاً.
>
> **Important — Database:** This project uses **Git LFS** to store `mersal.db` (276 MB). If you clone without Git LFS installed, the app will open but **show no data**. Make sure to run the step below first.

---

## 🚀 التشغيل المحلي | Local Development

```bash
# 0. تثبيت Git LFS (مرة واحدة فقط على الجهاز)
#    Install Git LFS (one-time setup per machine)
git lfs install

# 1. استنساخ المشروع (سيتم تحميل قاعدة البيانات تلقائياً)
#    Clone the repo (database will download automatically)
git clone https://github.com/YOUR_USERNAME/mersal-info-center.git
cd mersal-info-center

# 2. تثبيت المكتبات
npm install

# 3. تثبيت مكتبات Python
pip install requests

# 4. تشغيل التطبيق
npm start
```

> 💡 **إذا استنسخت المشروع مسبقاً بدون Git LFS | Already cloned without LFS?**
> ```bash
> git lfs install
> git lfs pull
> ```
> هذا سيحمّل قاعدة البيانات الحقيقية بدلاً من ملف المؤشر الصغير.
> This downloads the real database instead of the small pointer file.

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

## 🎉 تحديثات الإصدار الأخير (v3.2.0)

### 1️⃣ الأداء الفائق والتعامل مع البيانات الضخمة (High Performance SQLite)
* **محرك SQLite-First:** تم استبدال معالجة البيانات في الذاكرة (Memory) بمحرك بحث SQLite مباشر.
* **التعامل مع +200,000 سجل:** البرنامج أصبح يفتح ويقوم بالفلترة في أقل من ثانية واحدة بفضل الفهرسة الذكية.
* **تحميل الخدمات عند الطلب:** يتم تحميل التاريخ الطبي للمريض فقط عند فتح ملفه، مما يوفر استهلاك الـ RAM بشكل كبير.

### 2️⃣ الخريطة التفاعلية والبحث الجغرافي (Interactive Map)
* **دوائر المحافظات المتفاعلة:** الخريطة الآن تعرض عدد الحالات في كل محافظة في مصر بشكل مرئي.
* **البحث المباشر من الخريطة:** عند الضغط على أي محافظة في الخريطة، يمكنك الضغط على زر "عرض الحالات" للانتقال فوراً لجدول البحث وتصفح حالات هذه المحافظة فقط.
* **فلتر المحافظة:** تم إضافة قائمة منسدلة (Dropdown) في شاشة البحث لاختيار المحافظة يدوياً.

### 3️⃣ تنظيم ملف المريض (Organized Case Profile)
* **قسم الخدمات الطبي المميز:** تم إعادة تصميم عرض الخدمات الطبية ليكون أكثر احترافية وتنظيماً، حيث يظهر التخصص، التكلفة بالجنيه، وعدد الخدمات لكل مريض بشكل منفصل.

### 4️⃣ دعم بناء التطبيق على Windows
* **دليل التثبيت الجديد:** تم إضافة أدلة شاملة باللغة العربية والإنجليزية لمساعدة الزملاء على تشغيل البرنامج وبنائه على نظام ويندوز.
* **سكريبت البناء التلقائي:** إضافة ملف `build-on-windows.bat` لتوليد نسخة الـ EXE بضغطة واحدة.

---

## 📖 أدلة بناء ملف EXE على Windows

- **[`WINDOWS_SETUP_AR.md`](WINDOWS_SETUP_AR.md)** (باللغة العربية 🆕)
- **[`WINDOWS_SETUP.md`](WINDOWS_SETUP.md)** (English Version 🆕)

---

## 👥 فريق العمل | Team

- **Nada Naser** — Principle Developer
- **Moataz Samy** — Architecture & Support

---

## 📄 الترخيص | License

هذا المشروع خاص بمؤسسة مرسال الخيرية — جميع الحقوق محفوظة.

This project is proprietary to Mersal Foundation — All rights reserved.
