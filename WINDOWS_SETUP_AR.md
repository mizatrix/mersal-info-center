# دليل إعداد وبناء التطبيق على ويندوز - مركز معلومات مرسال

هذا التطبيق مبني بتقنية Electron ويستخدم قواعد بيانات SQLite محلية. لضمان تشغيله وبناء النسخة النهائية (EXE) على نظام Windows، يرجى اتباع الخطوات التالية:

## 1. المتطلبات الأساسية (إلزامي)

قبل البدء، تأكد من تثبيت الأدوات التالية على جهازك:

1. **Node.js (الإصدار المستقر LTS):** حمله من [nodejs.org](https://nodejs.org/).
2. **Git for Windows:** حمله من [git-scm.com](https://git-scm.com/).
3. **أدوات بناء Visual Studio (Build Tools):**
   * التطبيق يستخدم مكتبة SQLite أصلية (Native) تحتاج للتجميع البرمجي على ويندوز.
   * افتح PowerShell كمسؤول (Run as Administrator) وشغل الأمر التالي:

     ```powershell
     npm install --global windows-build-tools
     ```

   * **أو** قم بتحميل [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/)، واختر **"Desktop development with C++"** أثناء التثبيت.

## 2. التثبيت والتشغيل (للمطورين)

1. اسحب المشروع (Clone):

   ```bash
   git clone https://github.com/mizatrix/mersal-info-center.git
   cd mersal-info-center
   ```

2. تثبيت المكتبات البرمجية:

   ```bash
   npm install
   ```

   *(سيقوم سكريبت `postinstall` تلقائياً ببرمجة مكتبة SQLite لتعمل على إصدار الويندوز الخاص بك).*

## 3. تشغيل التطبيق

```bash
npm start
```

## 4. استخراج ملف الـ EXE (البناء النهائي)

لإنشاء ملف تثبيت EXE جاهز للعمل:

1. يمكنك تشغيل الأمر:

   ```bash
   npm run build:win
   ```

2. **أو ببساطة:** قم بالضغط مرتين على ملف الطوارئ الذي أنشأته لك: **`build-on-windows.bat`** وسيقوم هو بكل شيء بالنيابة عنك.

---

### ملاحظة هامة:

إذا ظهر لك خطأ يتعلق بـ `better-sqlite3` أو إصدار Node.js، قم بتشغيل هذا الأمر لإصلاحه فوراً:

```bash
npm run rebuild
```
