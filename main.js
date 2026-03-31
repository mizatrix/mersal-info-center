const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');

let mainWindow;

// ── Cache Config ──
const CACHE_DIR = path.join(os.homedir(), '.mersal-info-center');
const CACHE_FILE = path.join(CACHE_DIR, 'data_cache.json');
const CACHE_MAX_AGE_HOURS = 6; // Re-download if cache is older than 6 hours

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCachedData() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const stat = fs.statSync(CACHE_FILE);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    console.log(`📦 Loading from cache (${Math.round(ageHours * 10) / 10}h old)...`);
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    data.ageHours = ageHours; // Add age to signal UI if refresh is needed
    return data;
  } catch (err) {
    console.warn('⚠️ Cache read error:', err.message);
    return null;
  }
}

function saveCacheData(data) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
    console.log(`💾 Data cached to ${CACHE_FILE}`);
  } catch (err) {
    console.warn('⚠️ Cache write error:', err.message);
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

// ── Download file using Python (handles SharePoint auth redirects) ──
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'download_helper.py');
    const { spawn } = require('child_process');

    const proc = spawn('python3', [pythonScript, url, outputPath], {
      timeout: 300000,
    });

    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        const buffer = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath); // cleanup
        resolve(buffer);
      } else {
        reject(new Error(`Download failed (code ${code}): ${stderr.trim()}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

// ── Send progress updates to renderer ──
function sendProgress(msg) {
  console.log(`📡 ${msg}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', msg);
  }
}

// ── Download and parse fresh data from OneDrive ──
async function downloadFreshData() {
  const CASES_URL = 'https://mersalcharity-my.sharepoint.com/:x:/g/personal/omar_abdallah_mersal-ngo_org1/IQAZAIJBc3rMR4MABivs_NY4AU9ZwCDrPRi6BkAVIcAzCsY?download=1';
  const SERVICES_URL = 'https://mersalcharity-my.sharepoint.com/:x:/g/personal/omar_abdallah_mersal-ngo_org1/IQAJo7kuiuNzTYl7RkX1w_A6Ab45dnNs4ZUiC3o6WHnZD4U?download=1';

  const CASES_SHEETS = ['all التكوين', 'تكوين كالك القديم'];
  const SERVICES_SHEETS = ['2014-2024'];

  // Columns we actually use (strip everything else to shrink cache)
  const CASES_KEEP = ['C-Code', 'P-Code', 'Name', 'Age', 'Year', 'الجنسية', 'الرقم القومى', 'رقم كارت المفاوضية للفرد', 'رقم ملف المفاوضية', 'كود المفاوضية', 'موقف اللجوء'];
  const SERVICES_KEEP = ['C-Code', 'P-Code', 'الملف', 'عدد الخدمات', 'التكلفة', 'الجنسية', 'موقف اللجوء'];

  const tmpDir = os.tmpdir();

  // ⚡ Download BOTH files in parallel (halves total time)
  sendProgress('📥 جارٍ تحميل ملفي الحالات والخدمات معاً...');
  const startTime = Date.now();

  const [casesBuffer, svcBuffer] = await Promise.all([
    downloadFile(CASES_URL, path.join(tmpDir, 'mersal_cases.xlsx')).then(buf => {
      sendProgress('✅ تم تحميل ملف الحالات');
      return buf;
    }),
    downloadFile(SERVICES_URL, path.join(tmpDir, 'mersal_services.xlsx')).then(buf => {
      sendProgress('✅ تم تحميل ملف الخدمات');
      return buf;
    }),
  ]);

  const dlTime = ((Date.now() - startTime) / 1000).toFixed(1);
  sendProgress(`⬇️ اكتمل التحميل في ${dlTime} ثانية — جارٍ قراءة Excel...`);

  // Parse cases
  const casesWb = XLSX.read(casesBuffer, { type: 'buffer' });
  console.log('📋 Cases sheets:', casesWb.SheetNames.join(', '));

  let casesData = [];
  for (const sheetName of CASES_SHEETS) {
    if (casesWb.SheetNames.includes(sheetName)) {
      const rows = XLSX.utils.sheet_to_json(casesWb.Sheets[sheetName], { defval: '' });
      casesData = casesData.concat(rows);
      console.log(`  ✅ Read ${rows.length} rows from "${sheetName}"`);
    }
  }
  if (casesData.length === 0 && casesWb.SheetNames.length > 0) {
    const firstSheet = casesWb.SheetNames[0];
    casesData = XLSX.utils.sheet_to_json(casesWb.Sheets[firstSheet], { defval: '' });
    console.log(`  ⚠️ Fallback to first sheet "${firstSheet}": ${casesData.length} rows`);
  }

  sendProgress(`📊 تمت قراءة ${casesData.length.toLocaleString()} حالة — جارٍ قراءة الخدمات...`);

  // Strip unused columns from cases (massive cache savings)
  casesData = casesData.map(row => {
    const clean = {};
    for (const key of CASES_KEEP) {
      const val = row[key] ?? row[key.trim()] ?? '';
      clean[key] = typeof val === 'string' ? val.trim() : val;
    }
    return clean;
  });

  // Parse services
  const svcWb = XLSX.read(svcBuffer, { type: 'buffer' });
  console.log('📋 Services sheets:', svcWb.SheetNames.join(', '));

  let servicesData = [];
  for (const sheetName of SERVICES_SHEETS) {
    if (svcWb.SheetNames.includes(sheetName)) {
      const rows = XLSX.utils.sheet_to_json(svcWb.Sheets[sheetName], { defval: '' });
      servicesData = servicesData.concat(rows);
      console.log(`  ✅ Read ${rows.length} rows from "${sheetName}"`);
    }
  }
  if (servicesData.length === 0 && svcWb.SheetNames.length > 0) {
    const firstSheet = svcWb.SheetNames[0];
    servicesData = XLSX.utils.sheet_to_json(svcWb.Sheets[firstSheet], { defval: '' });
    console.log(`  ⚠️ Fallback to first sheet "${firstSheet}": ${servicesData.length} rows`);
  }

  // Strip unused columns from services
  servicesData = servicesData.map(row => {
    const clean = {};
    for (const key of SERVICES_KEEP) {
      const val = row[key] ?? row[key.trim()] ?? '';
      clean[key] = typeof val === 'string' ? val.trim() : val;
    }
    return clean;
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  sendProgress(`✅ جاهز — ${casesData.length.toLocaleString()} حالة، ${servicesData.length.toLocaleString()} خدمة (${totalTime}ث)`);

  console.log(`\n✅ Total: ${casesData.length} cases, ${servicesData.length} services in ${totalTime}s`);
  if (casesData.length > 0) console.log('Cases columns:', Object.keys(casesData[0]).join(', '));
  if (servicesData.length > 0) console.log('Services columns:', Object.keys(servicesData[0]).join(', '));

  return { cases: casesData, services: servicesData };
}

// ── IPC: Load Data (with cache) ──
ipcMain.handle('load-data', async () => {
  try {
    // Try cache first
    const cached = getCachedData();
    if (cached) {
      const needsRefresh = cached.ageHours > CACHE_MAX_AGE_HOURS;
      if (needsRefresh) {
        console.log(`⏳ Cache is old (${Math.round(cached.ageHours)}h), returning it but signaling UI to refresh in background.`);
      } else {
        console.log(`✅ Loaded from cache: ${cached.cases.length} cases.`);
      }
      return { cases: cached.cases, services: cached.services, error: null, fromCache: true, needsRefresh };
    }

    // Download fresh
    console.log('🚨 No cache found. Downloading fresh data blocking UI...');
    const data = await downloadFreshData();
    saveCacheData(data);
    return { cases: data.cases, services: data.services, error: null, fromCache: false, needsRefresh: false };
  } catch (err) {
    console.error('❌ Error loading data:', err.message);
    // Try stale cache as last resort
    try {
      if (fs.existsSync(CACHE_FILE)) {
        console.log('🔄 Falling back to stale cache...');
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const stale = JSON.parse(raw);
        return { cases: stale.cases, services: stale.services, error: null, fromCache: true, staleCache: true };
      }
    } catch (e) { /* ignore */ }
    return { cases: [], services: [], error: err.message };
  }
});

// ── IPC: Force Refresh (bypass cache) ──
ipcMain.handle('refresh-data', async () => {
  try {
    const data = await downloadFreshData();
    saveCacheData(data);
    return { cases: data.cases, services: data.services, error: null, fromCache: false };
  } catch (err) {
    console.error('❌ Error refreshing data:', err.message);
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
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
