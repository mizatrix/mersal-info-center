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

## 🎉 تحديثات الإصدار الأخير (v3.0.0)

### 1️⃣ التابة الثالثة: ملف المريض الشامل (Patient Profile Tab)
* **محرك بحث سريع:** صفحة مخصصة للبحث عن أي حالة بكود `C-Code` أو `P-Code`.
* **تصنيف طبي ومالي متكامل:** شاشة تلخص حياة المريض (أمراض، قرارات، أبحاث، ميزانية، صرف).
* **قارئ ذكي للأعمدة (Smart Renderer):** التطبيق يقرأ محتويات الإكسيل ويعرضها أياً كانت أسماء الأعمدة دون الحاجة لتوحيدها.

### 2️⃣ مزامنة محلية فائقة السرعة (Local Folder Import)
* **اختيار مجلد واحد (Folder Picker):** تم استبدال الروابط السحابية بآلية قراءة مجلد محلي بالكامل يحتوي على الـ 7 ملفات إكسيل ودمجها بذكاء.
* **تصنيف آلي للملفات:** البرنامج يعرف محتوى الملف من اسمه تلقائياً.

### 3️⃣ تحديثات الأمان والأداء (Security & DB)
* **قائمة الإيميلات البيضاء (Email Whitelist):** لا يفتح البرنامج إلا بإيميلات مسجلة ومصرح لها فقط.
* **قاعدة بيانات SQLite:** الانتقال لتخزين البيانات في داتابيز حقيقية (Indexed) قادرة على التعامل مع مئات الآلاف من السجلات لحظياً.
* **تصفية إحصائيات الداش بورد (Dynamic Stats):** الإحصائيات تتغير تلقائياً حسب الفلاتر.
* **تنظيف الخريطة التفاعلية:** تتجاهل دول الإكسيل المكتوبة بالخطأ.

---

## 🔮 التحديثات المقترحة للمستقبل (Future Roadmap)

1. **تصدير ملف المريض لـ PDF:** إمكانية تحويل ملفات المرضى وتاريخهم الطبي إلى PDF منسق بضغطة زر.
2. **تقارير ذكية تلقائية:** تصدير الإحصائيات الشهرية من الداش بورد كملفات وتقارير جاهزة.
3. **التنبيهات لوجود بيانات ناقصة:** إعلام الباحثين في حال وجود خدمات لمريض بدون قرارات مسجلة.
4. **AI Search Assistant:** إمكانية التحدث مع البرنامج باللغة العربية للرد الفوري على أسئلة حول البيانات.
5. **مزامنة عبر الكلاود مستقبلاً:** دمج `Supabase` للسماح لأكثر من موظف بفتح البرنامج من أجهزة مختلفة دون نقل للإكسيلات.

---

## 📖 دليل بناء ملف EXE على Windows

للاطلاع على الدليل التفصيلي خطوة بخطوة باللغة العربية لبناء ملف `.exe` على نظام Windows، راجع:

**[`BUILD_GUIDE_AR.md`](BUILD_GUIDE_AR.md)**

---

## 👥 فريق العمل | Team

- **Nada Naser** — Principle Developer
- **Moataz Samy** — Architecture & Support

---

## 📄 الترخيص | License

هذا المشروع خاص بمؤسسة مرسال الخيرية — جميع الحقوق محفوظة.

This project is proprietary to Mersal Foundation — All rights reserved.
