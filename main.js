const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

let mainWindow;

// ── SQLite Database Config ──
const DB_DIR = path.join(os.homedir(), '.mersal-info-center');
const DB_PATH = path.join(DB_DIR, 'mersal.db');
const SCHEMA_VERSION = 2; // Increment when schema changes to trigger migration

let db = null;

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

function getDatabase() {
  if (db) return db;
  ensureDbDir();

  // Auto-seed database from project workspace if missing in hone directory
  const localDbPath = path.join(__dirname, 'mersal.db');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(localDbPath)) {
    console.log('🔄 Auto-seeding mersal.db from project directory to home directory...');
    fs.copyFileSync(localDbPath, DB_PATH);
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');   // Much faster for reads
  db.pragma('synchronous = NORMAL'); // Safe enough, faster than FULL

  // Check schema version and migrate if needed
  db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);
  const currentVersion = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
  const ver = currentVersion ? parseInt(currentVersion.value) : 0;

  if (ver < SCHEMA_VERSION) {
    console.log(`🔄 Migrating DB schema from v${ver} to v${SCHEMA_VERSION}...`);
    // Drop old tables and recreate (data is re-imported from Excel)
    db.exec(`
      DROP TABLE IF EXISTS cases;
      DROP TABLE IF EXISTS services;
      DROP TABLE IF EXISTS details;
      DROP TABLE IF EXISTS ic_records;
      DROP TABLE IF EXISTS framework_records;
    `);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
  }

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      p_code TEXT,
      name TEXT,
      age TEXT,
      year TEXT,
      nationality TEXT,
      national_id TEXT,
      individual_card TEXT,
      family_file TEXT,
      negotiation_code TEXT,
      asylum_status TEXT,
      governorate TEXT,
      created_on TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      p_code TEXT,
      file_name TEXT,
      services_count TEXT,
      cost TEXT,
      nationality TEXT,
      asylum_status TEXT,
      specialty TEXT
    );

    CREATE TABLE IF NOT EXISTS details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      p_code TEXT,
      record_type TEXT,
      record_data TEXT
    );

    CREATE TABLE IF NOT EXISTS ic_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      case_name TEXT,
      phone TEXT,
      date_added TEXT,
      governorate TEXT,
      record_data TEXT
    );

    CREATE TABLE IF NOT EXISTS framework_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      record_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cases_ccode ON cases(c_code);
    CREATE INDEX IF NOT EXISTS idx_cases_pcode ON cases(p_code);
    CREATE INDEX IF NOT EXISTS idx_cases_name ON cases(name);
    CREATE INDEX IF NOT EXISTS idx_cases_nationality ON cases(nationality);
    CREATE INDEX IF NOT EXISTS idx_cases_governorate ON cases(governorate);
    CREATE INDEX IF NOT EXISTS idx_services_ccode ON services(c_code);
    CREATE INDEX IF NOT EXISTS idx_services_specialty ON services(specialty);
    CREATE INDEX IF NOT EXISTS idx_details_ccode ON details(c_code);
    CREATE INDEX IF NOT EXISTS idx_details_pcode ON details(p_code);
    CREATE INDEX IF NOT EXISTS idx_details_type ON details(record_type);
    CREATE INDEX IF NOT EXISTS idx_ic_ccode ON ic_records(c_code);
    CREATE INDEX IF NOT EXISTS idx_framework_ccode ON framework_records(c_code);
  `);

  console.log(`🗄️ SQLite database ready at ${DB_PATH}`);
  return db;
}

// ── Column mapping: JS object keys ↔ SQLite columns ──
const CASES_COL_MAP = {
  'C-Code': 'c_code',
  'P-Code': 'p_code',
  'Name': 'name',
  'Age': 'age',
  'Year': 'year',
  'الجنسية': 'nationality',
  'الرقم القومى': 'national_id',
  'رقم كارت المفاوضية للفرد': 'individual_card',
  'رقم ملف المفاوضية': 'family_file',
  'كود المفاوضية': 'negotiation_code',
  'موقف اللجوء': 'asylum_status',
  'محافظة السكن الحالي': 'governorate',
  'CreatedOn': 'created_on',
};

const SERVICES_COL_MAP = {
  'C-Code': 'c_code',
  'P-Code': 'p_code',
  'الملف': 'file_name',
  'عدد الخدمات': 'services_count',
  'التكلفة': 'cost',
  'الجنسية': 'nationality',
  'موقف اللجوء': 'asylum_status',
  'التخصص': 'specialty',
};

// Reverse maps: SQLite column → JS key
const CASES_REVERSE_MAP = Object.fromEntries(Object.entries(CASES_COL_MAP).map(([k, v]) => [v, k]));
const SERVICES_REVERSE_MAP = Object.fromEntries(Object.entries(SERVICES_COL_MAP).map(([k, v]) => [v, k]));

function dbRowToJsObject(row, reverseMap) {
  const obj = {};
  for (const [dbCol, jsKey] of Object.entries(reverseMap)) {
    if (dbCol === 'id') continue;
    obj[jsKey] = row[dbCol] ?? '';
  }
  return obj;
}

function getCachedData() {
  try {
    const database = getDatabase();
    const casesCount = database.prepare('SELECT COUNT(*) as cnt FROM cases').get().cnt;
    if (casesCount === 0) return null;

    const lastSync = database.prepare("SELECT value FROM meta WHERE key = 'last_sync'").get();
    const syncTime = lastSync ? parseInt(lastSync.value) : 0;

    const casesRows = database.prepare('SELECT * FROM cases').all();

    const cases = casesRows.map(r => dbRowToJsObject(r, CASES_REVERSE_MAP));

    // OMIT SERVICES FROM CACHED DATA TO PREVENT 400,000 ROWS OVER IPC
    return { cases, services: [], ageHours: 0 };
  } catch (err) {
    console.warn('⚠️ SQLite read error:', err.message);
    return null;
  }
}

function saveCacheData(data) {
  try {
    const database = getDatabase();
    const startMs = Date.now();

    const insertCase = database.prepare(`
      INSERT INTO cases (c_code, p_code, name, age, year, nationality, national_id, individual_card, family_file, negotiation_code, asylum_status, governorate, created_on)
      VALUES (@c_code, @p_code, @name, @age, @year, @nationality, @national_id, @individual_card, @family_file, @negotiation_code, @asylum_status, @governorate, @created_on)
    `);

    const insertService = database.prepare(`
      INSERT INTO services (c_code, p_code, file_name, services_count, cost, nationality, asylum_status, specialty)
      VALUES (@c_code, @p_code, @file_name, @services_count, @cost, @nationality, @asylum_status, @specialty)
    `);

    const insertDetail = database.prepare(`
      INSERT INTO details (c_code, p_code, record_type, record_data)
      VALUES (@c_code, @p_code, @type, @data)
    `);

    const insertIC = database.prepare(`
      INSERT INTO ic_records (c_code, case_name, phone, date_added, governorate, record_data)
      VALUES (@c_code, @case_name, @phone, @date_added, @governorate, @record_data)
    `);

    const insertFramework = database.prepare(`
      INSERT INTO framework_records (c_code, record_data)
      VALUES (@c_code, @record_data)
    `);

    const bulkInsert = database.transaction((casesArr, servicesArr, detailsArr, icArr, frameworkArr) => {
      // Clear existing data
      database.prepare('DELETE FROM cases').run();
      // Only clear services if we have new ones to insert (otherwise they were streamed directly)
      const existingServices = database.prepare('SELECT COUNT(*) as cnt FROM services').get().cnt;
      if (servicesArr.length > 0 || existingServices === 0) {
        database.prepare('DELETE FROM services').run();
      }
      database.prepare('DELETE FROM details').run();
      database.prepare('DELETE FROM ic_records').run();
      database.prepare('DELETE FROM framework_records').run();

      // Insert cases
      for (const row of casesArr) {
        const params = {};
        for (const [jsKey, dbCol] of Object.entries(CASES_COL_MAP)) {
          params[dbCol] = String(row[jsKey] ?? '').trim();
        }
        insertCase.run(params);
      }

      // Insert services (only if we have them — otherwise they were streamed directly)
      for (const row of servicesArr) {
        const params = {};
        for (const [jsKey, dbCol] of Object.entries(SERVICES_COL_MAP)) {
          params[dbCol] = String(row[jsKey] ?? '').trim();
        }
        insertService.run(params);
      }

      // Insert details
      for (const row of (detailsArr || [])) {
        insertDetail.run({
          c_code: row.c_code || '',
          p_code: row.p_code || '',
          type: row.type || '',
          data: JSON.stringify(row.data || {})
        });
      }

      // Insert IC records
      for (const row of (icArr || [])) {
        insertIC.run({
          c_code: row.c_code || '',
          case_name: row.case_name || '',
          phone: row.phone || '',
          date_added: row.date_added || '',
          governorate: row.governorate || '',
          record_data: JSON.stringify(row.data || {})
        });
      }

      // Insert framework records
      for (const row of (frameworkArr || [])) {
        insertFramework.run({
          c_code: row.c_code || '',
          record_data: JSON.stringify(row.data || {})
        });
      }

      // Update sync timestamp and data version
      const now = String(Date.now());
      database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync', ?)").run(now);
      database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('data_version', ?)").run(new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }));
    });

    bulkInsert(data.cases, data.services, data.details, data.ic_records, data.framework_records);
    const writeMs = Date.now() - startMs;
    console.log(`💾 SQLite write: ${data.cases.length} cases + ${data.services.length} services + ${(data.details||[]).length} details + ${(data.ic_records||[]).length} IC + ${(data.framework_records||[]).length} framework in ${writeMs}ms`);
  } catch (err) {
    console.warn('⚠️ SQLite write error:', err.message);
  }
}

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  // Auto-fit window to screen size
  const winWidth = Math.min(1440, screenW - 40);
  const winHeight = Math.min(900, screenH - 40);

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 400,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f5f8fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'src', 'assets', 'logo.webp'),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Auto-zoom for small screens (e.g. ThinkPad 1366x768)
  mainWindow.webContents.on('did-finish-load', () => {
    let zoomFactor = 1.0;
    if (screenW <= 1366) zoomFactor = 0.75;
    else if (screenW <= 1600) zoomFactor = 0.85;
    else if (screenW <= 1920) zoomFactor = 0.95;
    mainWindow.webContents.setZoomFactor(zoomFactor);
    console.log(`🖥️ Screen: ${screenW}x${screenH} → zoom: ${zoomFactor}`);
  });

  // Keyboard zoom: Ctrl+Plus / Ctrl+Minus / Ctrl+0
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.type === 'keyDown') {
      const current = mainWindow.webContents.getZoomFactor();
      if (input.key === '=' || input.key === '+') {
        mainWindow.webContents.setZoomFactor(Math.min(current + 0.1, 1.5));
        event.preventDefault();
      } else if (input.key === '-') {
        mainWindow.webContents.setZoomFactor(Math.max(current - 0.1, 0.5));
        event.preventDefault();
      } else if (input.key === '0') {
        mainWindow.webContents.setZoomFactor(1.0);
        event.preventDefault();
      }
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ── IPC Progress Helper ──
function sendProgress(msg) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('parse-progress', msg);
  }
}

// ── Stream services from huge Excel directly into SQLite (zero memory accumulation) ──
async function streamServicesIntoDb(fullPath, database) {
  const INSERT_SQL = `INSERT INTO services (c_code, p_code, file_name, services_count, cost, nationality, asylum_status, specialty)
    VALUES (@c_code, @p_code, @file_name, @services_count, @cost, @nationality, @asylum_status, @specialty)`;
  const insertService = database.prepare(INSERT_SQL);

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(fullPath, {
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    worksheets: 'emit',
    styles: 'ignore',
  });

  let totalInserted = 0;

  for await (const ws of reader) {
    const headers = [];
    const keepIndices = [];
    let rowNum = 0;
    let batch = [];

    for await (const row of ws) {
      rowNum++;
      if (rowNum === 1) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const name = String(cell.value || '').trim();
          headers.push(name);
          if (['C-Code','P-Code','الملف','الخدمة','الخدمات','نوع الخدمة','عدد الخدمات','التكلفة','الجنسية','موقف اللجوء','التخصص'].includes(name)) {
            keepIndices.push({ col: colNumber, value: name });
          }
        });
        const score = scoreColumns(headers);
        if (score <= 0) break;
        console.log(`  📊 Streaming "${ws.name}" → SQLite...`);
        continue;
      }
      if (keepIndices.length === 0) continue;

      const obj = {};
      for (const ki of keepIndices) obj[ki.value] = row.getCell(ki.col).value;

      const nr = normalizeRow(obj);
      const fileName = String(nr['الملف'] ?? nr['الخدمة'] ?? nr['الخدمات'] ?? nr['نوع الخدمة'] ?? '').trim();
      batch.push({
        c_code: String(nr['C-Code'] ?? '').trim(),
        p_code: String(nr['P-Code'] ?? '').trim(),
        file_name: fileName,
        services_count: String(nr['عدد الخدمات'] ?? '').trim(),
        cost: String(nr['التكلفة'] ?? '').trim(),
        nationality: String(nr['الجنسية'] ?? '').trim(),
        asylum_status: String(nr['موقف اللجوء'] ?? '').trim(),
        specialty: String(nr['التخصص'] ?? '').trim(),
      });

      if (batch.length >= 5000) {
        database.transaction(() => { for (const r of batch) insertService.run(r); })();
        totalInserted += batch.length;
        batch = [];
        if (totalInserted % 50000 === 0) sendProgress(`📊 ${totalInserted.toLocaleString('ar-EG')} خدمة...`);
      }
    }
    if (batch.length > 0) {
      database.transaction(() => { for (const r of batch) insertService.run(r); })();
      totalInserted += batch.length;
    }
  }
  console.log(`  ✅ Streamed ${totalInserted} services into SQLite`);
  return totalInserted;
}

// ── Score a set of column names for relevance ──
function scoreColumns(cols) {
  const lower = cols.map(c => c.trim().toLowerCase());
  let score = 0;
  if (lower.includes('c-code') || lower.includes('c code')) score += 10;
  if (lower.includes('p-code') || lower.includes('p code')) score += 5;
  if (lower.includes('الجنسية') || lower.includes('nationality')) score += 3;
  if (lower.includes('الخدمة') || lower.includes('نوع الخدمة')) score += 3;
  if (lower.some(c => c.includes('موقف'))) score += 2;
  if (lower.some(c => c.includes('count of') || c === 'row labels')) score -= 5;
  return score;
}

// ── Normalize a row's keys (trim whitespace) ──
function normalizeRow(row) {
  const nr = {};
  for (const [k, v] of Object.entries(row)) {
    if (k) nr[k.trim()] = v;
  }
  return nr;
}

// ── Route rows to the correct data array based on file name ──
function routeRows(lowerFile, allRows, casesData, servicesData, detailsData, icData, frameworkData) {
  const CASES_KEEP = ['C-Code', 'P-Code', 'Name', 'Age', 'Year', 'الجنسية', 'الرقم القومى', 'رقم كارت المفاوضية للفرد', 'رقم ملف المفاوضية', 'كود المفاوضية', 'موقف اللجوء', 'مواطن', 'محافظة السكن الحالي', 'CreatedOn'];
  const SERVICES_KEEP = ['C-Code', 'P-Code', 'الملف', 'الخدمة', 'الخدمات', 'نوع الخدمة', 'عدد الخدمات', 'التكلفة', 'الجنسية', 'موقف اللجوء', 'التخصص'];

  // 1. Cases
  if (lowerFile.includes('حالات') || lowerFile.includes('تكوين') || lowerFile.includes('cases')) {
    for (const row of allRows) {
      const nr = normalizeRow(row);
      const clean = {};
      for (const key of CASES_KEEP) {
        const val = nr[key] ?? '';
        clean[key] = typeof val === 'string' ? val.trim() : val;
      }
      casesData.push(clean);
    }
  }
  // 2. Services
  else if (lowerFile.includes('خدمات') || lowerFile.includes('services')) {
    const serviceNameVariations = ['الملف', 'الخدمة', 'الخدمات', 'نوع الخدمة'];
    for (const row of allRows) {
      const nr = normalizeRow(row);
      const clean = {};
      let foundServiceName = '';
      for (const k of serviceNameVariations) {
        if (nr[k] !== undefined && nr[k] !== '') {
          foundServiceName = String(nr[k]).trim();
          break;
        }
      }
      for (const key of SERVICES_KEEP) {
        let val = nr[key] ?? '';
        if (key === 'الملف' && val === '') val = foundServiceName;
        clean[key] = typeof val === 'string' ? val.trim() : val;
      }
      servicesData.push(clean);
    }
  }
  // 3. IC file
  else if (lowerFile.includes('ic') && !lowerFile.includes('services')) {
    for (const row of allRows) {
      const nr = {};
      for (const [k, v] of Object.entries(row)) {
        if (k) { nr[k.trim()] = v; nr[k.trim().toLowerCase()] = v; }
      }
      let ccode = nr['c-code'] || nr['c code'] || nr['الكود'] || nr['كود'] || nr['كود الحالة'] || '';
      if (ccode) {
        const caseName = nr['اسم الحالة'] || nr['الاسم'] || nr['name'] || nr['case name'] || '';
        const phone = nr['رقم التليفون'] || nr['التليفون'] || nr['الهاتف'] || nr['phone'] || '';
        const dateAdded = nr['تاريخ الاضافة'] || nr['تاريخ الإضافة'] || nr['التاريخ'] || nr['createdon'] || '';
        const gov = nr['المحافظة'] || nr['محافظة السكن الحالي'] || nr['المحافظه'] || '';
        icData.push({ c_code: String(ccode).trim(), case_name: String(caseName).trim(), phone: String(phone).trim(), date_added: String(dateAdded).trim(), governorate: String(gov).trim(), data: row });
      }
    }
  }
  // 4. Framework v5 file
  else if (lowerFile.includes('framework')) {
    for (const row of allRows) {
      let ccode = '';
      for (const key of Object.keys(row)) {
        const k = key.trim().toLowerCase();
        if (k === 'c-code' || k === 'c code' || k === 'الكود' || k === 'كود' || k === 'كود الحالة') ccode = String(row[key]||'').trim();
      }
      if (ccode) frameworkData.push({ c_code: ccode, data: row });
    }
  }
  // 5. Details (Research, Classification, Decisions, Diseases, Budget)
  else {
    let type = 'other';
    if (lowerFile.includes('أبحاث') || lowerFile.includes('البحث') || lowerFile.includes('بحث') || lowerFile.includes('research')) type = 'research';
    if (lowerFile.includes('تصنيف') || lowerFile.includes('classification')) type = 'classification';
    if (lowerFile.includes('قرار') || lowerFile.includes('decisions')) type = 'decision';
    if (lowerFile.includes('مرض') || lowerFile.includes('أمراض') || lowerFile.includes('امراض') || lowerFile.includes('diseases')) type = 'disease';
    if (lowerFile.includes('الميزانية') || lowerFile.includes('ميزانية') || lowerFile.includes('صرف') || lowerFile.includes('دخل')) type = 'budget';

    if (type !== 'other') {
      for (const row of allRows) {
        let ccode = '', pcode = '';
        for (const key of Object.keys(row)) {
          const k = key.trim().toLowerCase();
          if (k === 'c-code' || k === 'c code' || k === 'كود الحالة') ccode = String(row[key]||'').trim();
          if (k === 'p-code' || k === 'p code' || k === 'كود الأسرة') pcode = String(row[key]||'').trim();
        }
        if (ccode || pcode) detailsData.push({ c_code: ccode, p_code: pcode, type: type, data: row });
      }
    }
  }
}

// ── Parse Data from Local Folder ──
async function parseLocalFolder(folderPath) {
  let casesData = [];
  let servicesData = [];
  let detailsData = [];
  let icData = [];
  let frameworkData = [];

  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    if (!file.match(/\.(xlsx|xls|xlsb)$/i)) continue;
    if (file.startsWith('~$')) continue;

    const fullPath = path.join(folderPath, file);
    const lowerFile = file.toLowerCase();
    sendProgress(`📥 قراءة ملف: ${file}...`);

    try {
      // ── Strategy 1: Try xlsx library first (fast for normal-sized files) ──
      let bestSheetRows = [];
      let maxScore = -1;
      let bestSheetName = '';
      let hasNullSheets = false;

      const buffer = fs.readFileSync(fullPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) { hasNullSheets = true; continue; }

        if (!sheet['!ref']) {
          let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
          for (const key of Object.keys(sheet)) {
            if (key.startsWith('!')) continue;
            const cell = XLSX.utils.decode_cell(key);
            if (cell.r < minR) minR = cell.r;
            if (cell.r > maxR) maxR = cell.r;
            if (cell.c < minC) minC = cell.c;
            if (cell.c > maxC) maxC = cell.c;
          }
          if (minR <= maxR && minC <= maxC) {
            sheet['!ref'] = XLSX.utils.encode_range({s:{c:minC, r:minR}, e:{c:maxC, r:maxR}});
          }
        }

        if (!sheet['!ref']) continue;
        const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (sheetRows.length === 0) continue;

        const cols = Object.keys(sheetRows[0]);
        const score = scoreColumns(cols);

        if (score > maxScore) {
          maxScore = score;
          bestSheetRows = sheetRows;
          bestSheetName = sheetName;
        }
      }

      // ── Strategy 2: If xlsx can't parse the services file, stream directly into SQLite ──
      if (hasNullSheets && (bestSheetRows.length === 0 || maxScore <= 0) &&
          (lowerFile.includes('خدمات') || lowerFile.includes('services'))) {
        console.log(`  ⚡ xlsx can't parse "${file}" — streaming into SQLite...`);
        sendProgress(`⚡ استيراد متدفق مباشر: ${file}...`);
        try {
          const database = getDatabase();
          const count = await streamServicesIntoDb(fullPath, database);
          sendProgress(`✅ تم استيراد ${count.toLocaleString('ar-EG')} خدمة`);
          continue; // Data is already in SQLite, skip routeRows
        } catch (streamErr) {
          console.warn(`  ⚠️ Streaming failed for ${file}:`, streamErr.message);
        }
      }

      if (bestSheetRows.length === 0) continue;
      console.log(`  📊 Picked optimal sheet "${bestSheetName}" (${bestSheetRows.length} rows, score: ${maxScore})`);

      // Route to the correct data array
      routeRows(lowerFile, bestSheetRows, casesData, servicesData, detailsData, icData, frameworkData);

    } catch (e) {
      console.warn(`Could not parse ${file}:`, e.message);
    }
  }

  sendProgress(`✅ اكتملت قراءة ${casesData.length} حالات، ${servicesData.length} خدمات، ${icData.length} IC، ${frameworkData.length} framework، و ${detailsData.length} تفاصيل إضافية.`);
  return { cases: casesData, services: servicesData, details: detailsData, ic_records: icData, framework_records: frameworkData };
}

// ── IPC: Load Data (with cache) ──
ipcMain.handle('load-data', async () => {
  try {
    // Try cache first
    const cached = getCachedData();
    if (cached) {
      console.log(`✅ Loaded from cache: ${cached.cases.length} cases.`);
      const database = getDatabase();
      const dvRow = database.prepare("SELECT value FROM meta WHERE key = 'data_version'").get();
      const dataVersion = dvRow ? dvRow.value : null;
      return { cases: cached.cases, services: cached.services, error: null, fromCache: true, needsRefresh: false, dataVersion };
    }

    // No cache found -> Auto-load from default mersal_data folder
    const autoFolder = path.join(__dirname, 'mersal_data');
    if (require('fs').existsSync(autoFolder)) {
      console.log('🔄 No cache found. Auto-importing from local mersal_data folder...');
      const data = await parseLocalFolder(autoFolder);
      saveCacheData(data);
      const dvRow = getDatabase().prepare("SELECT value FROM meta WHERE key = 'data_version'").get();
      return { cases: data.cases, services: data.services, error: null, fromCache: false, dataVersion: dvRow ? dvRow.value : null };
    }

    console.log('🚨 No cache found. Returning empty...');
    return { cases: [], services: [], error: null, fromCache: false, needsRefresh: false, missingData: true };
  } catch (err) {
    console.error('❌ Error loading data:', err.message);
    // Try stale DB as last resort (data may exist even if download fails)
    try {
      const staleDb = getDatabase();
      const cnt = staleDb.prepare('SELECT COUNT(*) as cnt FROM cases').get().cnt;
      if (cnt > 0) {
        console.log('🔄 Falling back to stale SQLite data...');
        const casesRows = staleDb.prepare('SELECT * FROM cases').all();
        const servicesRows = staleDb.prepare('SELECT * FROM services').all();
        const cases = casesRows.map(r => dbRowToJsObject(r, CASES_REVERSE_MAP));
        const services = servicesRows.map(r => dbRowToJsObject(r, SERVICES_REVERSE_MAP));
        return { cases, services, error: null, fromCache: true, staleCache: true };
      }
    } catch (e) { /* ignore */ }
    return { cases: [], services: [], error: err.message };
  }
});

// ── High Speed Services Endpoints ──
ipcMain.handle('get-filter-options', async () => {
  try {
    const database = getDatabase();
    const specialties = database.prepare("SELECT DISTINCT specialty FROM services WHERE specialty IS NOT NULL AND specialty != '' ORDER BY specialty").all().map(r => r.specialty);
    const files = database.prepare("SELECT DISTINCT file_name FROM services WHERE file_name IS NOT NULL AND file_name != '' ORDER BY file_name").all().map(r => r.file_name);
    return { specialties, files };
  } catch (err) {
    console.error('Error fetching filter options:', err);
    return { specialties: [], files: [] };
  }
});

ipcMain.handle('get-search-stats', async (event, filters) => {
  try {
    const database = getDatabase();
    let query = `
      SELECT SUM(CAST(REPLACE(s.services_count, ',', '') AS FLOAT)) as svcCount, 
             SUM(CAST(REPLACE(s.cost, ',', '') AS FLOAT)) as totalCost 
      FROM services s
      WHERE EXISTS (
        SELECT 1 FROM cases c 
        WHERE (c.c_code = s.c_code OR c.p_code = s.p_code)
    `;
    const params = [];

    // Apply the same filters as doSearch
    if (filters.code) {
      query += " AND (c.c_code LIKE ? OR c.p_code LIKE ?)";
      params.push(`%${filters.code}%`, `%${filters.code}%`);
    }
    if (filters.year && filters.year !== 'all') {
      query += " AND c.year = ?";
      params.push(filters.year);
    }
    if (filters.name) {
      query += " AND c.name LIKE ?";
      params.push(`%${filters.name}%`);
    }
    if (filters.individual) {
      query += " AND c.individual_card LIKE ?";
      params.push(`%${filters.individual}%`);
    }
    if (filters.family) {
      query += " AND c.family_file LIKE ?";
      params.push(`%${filters.family}%`);
    }
    if (filters.nationalId) {
      query += " AND c.national_id LIKE ?";
      params.push(`%${filters.nationalId}%`);
    }
    if (filters.nationality) {
      query += " AND c.nationality LIKE ?";
      params.push(`%${filters.nationality}%`);
    }
    if (filters.asylum) {
      query += " AND c.asylum_status LIKE ?";
      params.push(`%${filters.asylum}%`);
    }

    query += ")"; // close EXISTS

    const row = database.prepare(query).get(...params);
    return {
      svcSum: row ? (row.svcCount || 0) : 0,
      costSum: row ? (row.totalCost || 0) : 0
    };
  } catch (err) {
    console.error('Error fetching search stats:', err);
    return { svcSum: 0, costSum: 0 };
  }
});

ipcMain.handle('get-dashboard-stats', async (event, filters) => {
  try {
    const database = getDatabase();
    let query = "SELECT SUM(CAST(REPLACE(services_count, ',', '') AS FLOAT)) as svcCount, SUM(CAST(REPLACE(cost, ',', '') AS FLOAT)) as totalCost FROM services WHERE 1=1";
    const params = [];
    
    if (filters.asylum) {
      query += " AND asylum_status LIKE ?";
      params.push(`%${filters.asylum}%`);
    }
    if (filters.nationality) {
      query += " AND nationality LIKE ?";
      params.push(`%${filters.nationality}%`);
    }
    if (filters.service) {
      query += " AND (specialty LIKE ? OR file_name LIKE ?)";
      params.push(`%${filters.service}%`, `%${filters.service}%`);
    }

    const row = database.prepare(query).get(...params);
    return {
      svcSum: row ? (row.svcCount || 0) : 0,
      costSum: row ? (row.totalCost || 0) : 0
    };
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return { svcSum: 0, costSum: 0 };
  }
});

ipcMain.handle('get-profile-services', async (event, ccode, pcode) => {
  try {
    const database = getDatabase();
    let query = "SELECT * FROM services WHERE c_code = ?";
    let params = [ccode || ''];
    if (pcode && pcode !== 'لا يوجد' && pcode !== '') {
      query = "SELECT * FROM services WHERE c_code = ? OR p_code = ?";
      params.push(pcode);
    }
    const rows = database.prepare(query).all(...params);
    return rows.map(r => dbRowToJsObject(r, SERVICES_REVERSE_MAP));
  } catch (err) {
    console.error('Error fetching profile services:', err);
    return [];
  }
});

// ── IPC: Force Refresh (Using Folder Picker) ──
ipcMain.handle('refresh-data', async (event) => {
  const { dialog } = require('electron');
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر المجلد (Folder) الذي يحتوي على جميع إكسيلات البيانات',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
       return { error: 'تم إلغاء اختيار المجلد' };
    }

    const folderPath = result.filePaths[0];
    const data = await parseLocalFolder(folderPath);
    saveCacheData(data);
    const database = getDatabase();
    const dvRow = database.prepare("SELECT value FROM meta WHERE key = 'data_version'").get();
    return { cases: data.cases, services: data.services, error: null, fromCache: false, dataVersion: dvRow ? dvRow.value : null };
  } catch (err) {
    console.error('❌ Error refreshing data:', err.message);
    return { cases: [], services: [], error: err.message };
  }
});

// ── IPC: Get Patient Full Profile Details ──
ipcMain.handle('get-patient-details', async (event, code) => {
  try {
    const database = getDatabase();
    code = String(code).trim();
    if (!code) throw new Error('لا يوجد كود');

    // Fetch master cases
    const cRows = database.prepare(`SELECT * FROM cases WHERE c_code LIKE ? OR p_code LIKE ? COLLATE NOCASE`).all('%'+code+'%', '%'+code+'%');
    const cases = cRows.map(r => dbRowToJsObject(r, CASES_REVERSE_MAP));

    // Fetch services
    const sRows = database.prepare(`SELECT * FROM services WHERE c_code LIKE ? OR p_code LIKE ? COLLATE NOCASE`).all('%'+code+'%', '%'+code+'%');
    const services = sRows.map(r => dbRowToJsObject(r, SERVICES_REVERSE_MAP));

    // Fetch details
    const dRows = database.prepare(`SELECT * FROM details WHERE c_code LIKE ? OR p_code LIKE ? COLLATE NOCASE`).all('%'+code+'%', '%'+code+'%');
    const details = dRows.map(r => ({
      c_code: r.c_code,
      p_code: r.p_code,
      type: r.record_type,
      data: JSON.parse(r.record_data || '{}')
    }));

    return { cases, services, details, error: null };
  } catch (err) {
    return { error: err.message };
  }
});

// ── IPC: Get IC Data for a case ──
ipcMain.handle('get-ic-data', async (event, code) => {
  try {
    const database = getDatabase();
    code = String(code).trim();
    if (!code) return { records: [], error: null };
    const rows = database.prepare(`SELECT * FROM ic_records WHERE c_code LIKE ? COLLATE NOCASE`).all('%'+code+'%');
    const records = rows.map(r => ({
      c_code: r.c_code,
      case_name: r.case_name,
      phone: r.phone,
      date_added: r.date_added,
      governorate: r.governorate,
      data: JSON.parse(r.record_data || '{}')
    }));
    return { records, error: null };
  } catch (err) {
    return { records: [], error: err.message };
  }
});

// ── IPC: Get Framework v5 Data for a case ──
ipcMain.handle('get-framework-data', async (event, code) => {
  try {
    const database = getDatabase();
    code = String(code).trim();
    if (!code) return { records: [], error: null };
    const rows = database.prepare(`SELECT * FROM framework_records WHERE c_code LIKE ? COLLATE NOCASE`).all('%'+code+'%');
    const records = rows.map(r => ({
      c_code: r.c_code,
      data: JSON.parse(r.record_data || '{}')
    }));
    return { records, error: null };
  } catch (err) {
    return { records: [], error: err.message };
  }
});

// ── IPC: Get Data Version ──
ipcMain.handle('get-data-version', async () => {
  try {
    const database = getDatabase();
    const row = database.prepare("SELECT value FROM meta WHERE key = 'data_version'").get();
    return { version: row ? row.value : null };
  } catch (err) {
    return { version: null };
  }
});

// ── IPC: Add Records Incrementally ──
ipcMain.handle('add-records', async (event, { cases: newCases, services: newServices }) => {
  try {
    const database = getDatabase();

    const insertCase = database.prepare(`
      INSERT INTO cases (c_code, p_code, name, age, year, nationality, national_id, individual_card, family_file, negotiation_code, asylum_status, governorate, created_on)
      VALUES (@c_code, @p_code, @name, @age, @year, @nationality, @national_id, @individual_card, @family_file, @negotiation_code, @asylum_status, @governorate, @created_on)
    `);

    const insertService = database.prepare(`
      INSERT INTO services (c_code, p_code, file_name, services_count, cost, nationality, asylum_status, specialty)
      VALUES (@c_code, @p_code, @file_name, @services_count, @cost, @nationality, @asylum_status, @specialty)
    `);

    const bulkAdd = database.transaction(() => {
      if (newCases && newCases.length > 0) {
        for (const row of newCases) {
          const params = {};
          for (const [jsKey, dbCol] of Object.entries(CASES_COL_MAP)) {
            params[dbCol] = String(row[jsKey] ?? '').trim();
          }
          insertCase.run(params);
        }
      }
      if (newServices && newServices.length > 0) {
        for (const row of newServices) {
          const params = {};
          for (const [jsKey, dbCol] of Object.entries(SERVICES_COL_MAP)) {
            params[dbCol] = String(row[jsKey] ?? '').trim();
          }
          insertService.run(params);
        }
      }
      // Update sync time
      database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync', ?)").run(String(Date.now()));
    });

    bulkAdd();

    // Return full updated data
    const casesRows = database.prepare('SELECT * FROM cases').all();
    const servicesRows = database.prepare('SELECT * FROM services').all();
    const cases = casesRows.map(r => dbRowToJsObject(r, CASES_REVERSE_MAP));
    const services = servicesRows.map(r => dbRowToJsObject(r, SERVICES_REVERSE_MAP));

    console.log(`➕ Added ${(newCases || []).length} cases, ${(newServices || []).length} services. Total: ${cases.length} cases, ${services.length} services`);
    return { cases, services, error: null };
  } catch (err) {
    console.error('❌ Error adding records:', err.message);
    return { cases: [], services: [], error: err.message };
  }
});

// ── IPC: Export Excel ──
ipcMain.handle('export-excel', async (event, data) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    defaultPath: 'mersal_export.xlsx',
  });

  if (result.canceled) return { saved: false };

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'بيانات');
  XLSX.writeFile(wb, result.filePath);

  return { saved: true, path: result.filePath };
});

// Window control IPC handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Close SQLite connection gracefully
  if (db) {
    try { db.close(); } catch (e) { /* ignore */ }
    db = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
