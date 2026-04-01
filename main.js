const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

let mainWindow;

// ── SQLite Database Config ──
const DB_DIR = path.join(os.homedir(), '.mersal-info-center');
const DB_PATH = path.join(DB_DIR, 'mersal.db');
const CACHE_MAX_AGE_HOURS = 6; // Re-download if data is older than 6 hours

let db = null;

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

function getDatabase() {
  if (db) return db;
  ensureDbDir();
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');   // Much faster for reads
  db.pragma('synchronous = NORMAL'); // Safe enough, faster than FULL

  // Create tables if they don't exist
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
      asylum_status TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      p_code TEXT,
      file_name TEXT,
      services_count TEXT,
      cost TEXT,
      nationality TEXT,
      asylum_status TEXT
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      c_code TEXT,
      p_code TEXT,
      record_type TEXT,
      record_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cases_ccode ON cases(c_code);
    CREATE INDEX IF NOT EXISTS idx_cases_pcode ON cases(p_code);
    CREATE INDEX IF NOT EXISTS idx_cases_name ON cases(name);
    CREATE INDEX IF NOT EXISTS idx_cases_nationality ON cases(nationality);
    CREATE INDEX IF NOT EXISTS idx_services_ccode ON services(c_code);
    CREATE INDEX IF NOT EXISTS idx_details_ccode ON details(c_code);
    CREATE INDEX IF NOT EXISTS idx_details_pcode ON details(p_code);
    CREATE INDEX IF NOT EXISTS idx_details_type ON details(record_type);
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
};

const SERVICES_COL_MAP = {
  'C-Code': 'c_code',
  'P-Code': 'p_code',
  'الملف': 'file_name',
  'عدد الخدمات': 'services_count',
  'التكلفة': 'cost',
  'الجنسية': 'nationality',
  'موقف اللجوء': 'asylum_status',
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
    const servicesRows = database.prepare('SELECT * FROM services').all();

    const cases = casesRows.map(r => dbRowToJsObject(r, CASES_REVERSE_MAP));
    const services = servicesRows.map(r => dbRowToJsObject(r, SERVICES_REVERSE_MAP));

    return { cases, services, ageHours: 0 };
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
      INSERT INTO cases (c_code, p_code, name, age, year, nationality, national_id, individual_card, family_file, negotiation_code, asylum_status)
      VALUES (@c_code, @p_code, @name, @age, @year, @nationality, @national_id, @individual_card, @family_file, @negotiation_code, @asylum_status)
    `);

    const insertService = database.prepare(`
      INSERT INTO services (c_code, p_code, file_name, services_count, cost, nationality, asylum_status)
      VALUES (@c_code, @p_code, @file_name, @services_count, @cost, @nationality, @asylum_status)
    `);

    const insertDetail = database.prepare(`
      INSERT INTO details (c_code, p_code, record_type, record_data)
      VALUES (@c_code, @p_code, @type, @data)
    `);

    const bulkInsert = database.transaction((casesArr, servicesArr, detailsArr) => {
      // Clear existing data
      database.prepare('DELETE FROM cases').run();
      database.prepare('DELETE FROM services').run();
      database.prepare('DELETE FROM details').run();

      // Insert cases
      for (const row of casesArr) {
        const params = {};
        for (const [jsKey, dbCol] of Object.entries(CASES_COL_MAP)) {
          params[dbCol] = String(row[jsKey] ?? '').trim();
        }
        insertCase.run(params);
      }

      // Insert services
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

      // Update sync timestamp
      database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_sync', ?)").run(String(Date.now()));
    });

    bulkInsert(data.cases, data.services, data.details);
    const writeMs = Date.now() - startMs;
    console.log(`💾 SQLite write: ${data.cases.length} cases + ${data.services.length} services + ${(data.details||[]).length} details in ${writeMs}ms`);
  } catch (err) {
    console.warn('⚠️ SQLite write error:', err.message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
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

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// ── Parse Data from Local Folder ──
async function parseLocalFolder(folderPath) {
  const CASES_KEEP = ['C-Code', 'P-Code', 'Name', 'Age', 'Year', 'الجنسية', 'الرقم القومى', 'رقم كارت المفاوضية للفرد', 'رقم ملف المفاوضية', 'كود المفاوضية', 'موقف اللجوء', 'مواطن'];
  const SERVICES_KEEP = ['C-Code', 'P-Code', 'الملف', 'الخدمة', 'الخدمات', 'نوع الخدمة', 'عدد الخدمات', 'التكلفة', 'الجنسية', 'موقف اللجوء'];

  let casesData = [];
  let servicesData = [];
  let detailsData = [];

  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    if (!file.match(/\.(xlsx|xls|xlsb)$/i)) continue;
    if (file.startsWith('~$')) continue;

    const fullPath = path.join(folderPath, file);
    sendProgress(`📥 قراءة ملف: ${file}...`);
    
    try {
      const buffer = fs.readFileSync(fullPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        allRows = allRows.concat(XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }));
      }
      if (allRows.length === 0) continue;

      const lowerFile = file.toLowerCase();
      // 1. Cases
      if (lowerFile.includes('حالات') || lowerFile.includes('تكوين') || lowerFile.includes('cases')) {
        casesData = casesData.concat(allRows.map(row => {
          const clean = {};
          for (const key of CASES_KEEP) {
            const val = row[key] ?? row[key.trim()] ?? '';
            clean[key] = typeof val === 'string' ? val.trim() : val;
          }
          return clean;
        }));
      }
      // 2. Services
      else if (lowerFile.includes('خدمات') || lowerFile.includes('services')) {
        servicesData = servicesData.concat(allRows.map(row => {
          const clean = {};
          const serviceNameVariations = ['الملف', 'الخدمة', 'الخدمات', 'نوع الخدمة'];
          let foundServiceName = '';
          for (const k of serviceNameVariations) {
            if ((row[k] || row[k.trim()]) !== undefined && (row[k] || row[k.trim()]) !== '') {
              foundServiceName = String(row[k] ?? row[k.trim()]).trim();
              break;
            }
          }
          for (const key of SERVICES_KEEP) {
            let val = row[key] ?? row[key.trim()] ?? '';
            if (key === 'الملف' && val === '') val = foundServiceName;
            clean[key] = typeof val === 'string' ? val.trim() : val;
          }
          return clean;
        }));
      }
      // 3. Details (Research, Classification, Decisions, Diseases, Budget)
      else {
        let type = 'other';
        if (lowerFile.includes('أبحاث') || lowerFile.includes('البحث') || lowerFile.includes('بحث') || lowerFile.includes('research')) type = 'research';
        if (lowerFile.includes('تصنيف') || lowerFile.includes('classification')) type = 'classification';
        if (lowerFile.includes('قرار') || lowerFile.includes('decisions')) type = 'decision';
        if (lowerFile.includes('مرض') || lowerFile.includes('أمراض') || lowerFile.includes('امراض') || lowerFile.includes('diseases')) type = 'disease';
        if (lowerFile.includes('الميزانية') || lowerFile.includes('ميزانية') || lowerFile.includes('صرف') || lowerFile.includes('دخل')) type = 'budget';

        if (type !== 'other') {
          for (const row of allRows) {
            // Try to find C-Code or P-Code from any similar column names
            let ccode = '';
            let pcode = '';
            for (const key of Object.keys(row)) {
              const k = key.trim().toLowerCase();
              if (k === 'c-code' || k === 'c code' || k === 'كود الحالة') ccode = String(row[key]||'').trim();
              if (k === 'p-code' || k === 'p code' || k === 'كود الأسرة') pcode = String(row[key]||'').trim();
            }
            if (ccode || pcode) {
              detailsData.push({ c_code: ccode, p_code: pcode, type: type, data: row });
            }
          }
        }
      }

    } catch (e) {
      console.warn(`Could not parse ${file}:`, e.message);
    }
  }

  sendProgress(`✅ اكتملت قراءة ${casesData.length} حالات، ${servicesData.length} خدمات، و ${detailsData.length} تفاصيل إضافية.`);
  return { cases: casesData, services: servicesData, details: detailsData };
}

// ── IPC: Load Data (with cache) ──
ipcMain.handle('load-data', async () => {
  try {
    // Try cache first
    const cached = getCachedData();
    if (cached) {
      console.log(`✅ Loaded from cache: ${cached.cases.length} cases.`);
      return { cases: cached.cases, services: cached.services, error: null, fromCache: true, needsRefresh: false };
    }

    // No cache found -> Do NOT auto download, return nothing and let user refresh
    console.log('🚨 No cache found. Returning empty to prompt user implementation...');
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
    return { cases: data.cases, services: data.services, error: null, fromCache: false };
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

// ── IPC: Add Records Incrementally ──
ipcMain.handle('add-records', async (event, { cases: newCases, services: newServices }) => {
  try {
    const database = getDatabase();

    const insertCase = database.prepare(`
      INSERT INTO cases (c_code, p_code, name, age, year, nationality, national_id, individual_card, family_file, negotiation_code, asylum_status)
      VALUES (@c_code, @p_code, @name, @age, @year, @nationality, @national_id, @individual_card, @family_file, @negotiation_code, @asylum_status)
    `);

    const insertService = database.prepare(`
      INSERT INTO services (c_code, p_code, file_name, services_count, cost, nationality, asylum_status)
      VALUES (@c_code, @p_code, @file_name, @services_count, @cost, @nationality, @asylum_status)
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
