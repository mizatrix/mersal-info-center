/* ═══════════════════════════════════════════════════════════
   مركز معلومات مرسال — Main Application Logic
   ═══════════════════════════════════════════════════════════ */

// ── State ──
let casesData = [];
let servicesData = [];
let filteredData = [];
let currentPage = 1;
let sortCol = null;
let sortDir = 'asc';
let selectedYear = 'all';
let currentUserEmail = '';
let autoRefreshTimer = null;
const PAGE_SIZE = 50;
const AUTO_REFRESH_MINUTES = 30;

// ── Nationality Locations (for map) ──
const NAT_LOCATIONS = {
  'مصري': { lat: 26.8, lng: 30.8, name: 'مصر' },
  'مصرى': { lat: 26.8, lng: 30.8, name: 'مصر' },
  'سوداني': { lat: 15.6, lng: 32.5, name: 'السودان' },
  'سودانى': { lat: 15.6, lng: 32.5, name: 'السودان' },
  'سورى': { lat: 34.8, lng: 38.9, name: 'سوريا' },
  'سوري': { lat: 34.8, lng: 38.9, name: 'سوريا' },
  'اردني': { lat: 31.95, lng: 35.91, name: 'الأردن' },
  'اردنى': { lat: 31.95, lng: 35.91, name: 'الأردن' },
  'أثيوبي': { lat: 9.1, lng: 40.5, name: 'إثيوبيا' },
  'أثيوبى': { lat: 9.1, lng: 40.5, name: 'إثيوبيا' },
  'إريتري': { lat: 15.3, lng: 39.7, name: 'إريتريا' },
  'إريترى': { lat: 15.3, lng: 39.7, name: 'إريتريا' },
  'يمني': { lat: 15.5, lng: 48.5, name: 'اليمن' },
  'يمنى': { lat: 15.5, lng: 48.5, name: 'اليمن' },
  'صومالي': { lat: 5.15, lng: 46.2, name: 'الصومال' },
  'صومالى': { lat: 5.15, lng: 46.2, name: 'الصومال' },
  'عراقي': { lat: 33.2, lng: 43.7, name: 'العراق' },
  'عراقى': { lat: 33.2, lng: 43.7, name: 'العراق' },
  'ليبي': { lat: 26.3, lng: 17.2, name: 'ليبيا' },
  'ليبى': { lat: 26.3, lng: 17.2, name: 'ليبيا' },
  'فلسطيني': { lat: 31.95, lng: 35.2, name: 'فلسطين' },
  'فلسطينى': { lat: 31.95, lng: 35.2, name: 'فلسطين' },
};

// ══════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Set current date
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('currentDate').textContent = dateStr;

  // Enter key triggers search in filters
  document.querySelectorAll('.field-input, .sub-input').forEach(el => {
    el.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
  });

  // Enter key triggers login
  const loginInput = document.getElementById('loginEmail');
  if (loginInput) {
    loginInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
  }

  // Check if user already logged in
  const savedEmail = localStorage.getItem('mersal_user_email');
  if (savedEmail) {
    currentUserEmail = savedEmail;
    showApp();
    await loadAllData();
  }
  // Otherwise, login overlay is visible and waits for email input
});

// ══════════════════════════════════════════════════
//  EMAIL LOGIN
// ══════════════════════════════════════════════════
async function handleLogin() {
  const emailInput = document.getElementById('loginEmail');
  const errorEl = document.getElementById('loginError');
  const email = emailInput.value.trim().toLowerCase();

  // Basic validation
  if (!email) {
    errorEl.textContent = 'الرجاء إدخال البريد الإلكتروني';
    emailInput.classList.add('input-error');
    return;
  }

  if (!email.includes('@')) {
    errorEl.textContent = 'بريد إلكتروني غير صالح';
    emailInput.classList.add('input-error');
    return;
  }

  errorEl.textContent = '';
  emailInput.classList.remove('input-error');

  // Save email and proceed
  currentUserEmail = email;
  localStorage.setItem('mersal_user_email', email);

  showApp();
  await loadAllData();
}

function showApp() {
  // Hide login overlay
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.classList.add('hidden');

  // Update sidebar user info
  document.getElementById('userEmail').textContent = currentUserEmail;
  const initials = currentUserEmail.split('@')[0].substring(0, 2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;

  // Show app
  document.querySelector('.app-layout').style.opacity = '1';
}

// ══════════════════════════════════════════════════
//  DATA LOADING (via IPC to Main Process)
// ══════════════════════════════════════════════════
async function loadAllData() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  document.getElementById('statusText').textContent = 'جارٍ التحميل...';
  const progressEl = document.getElementById('loadingProgress');
  if (progressEl) progressEl.textContent = 'جارٍ تحميل ملفات Excel من OneDrive...';

  try {
    const result = await window.electronAPI.loadData();

    if (result.error) {
      console.error('Data load error:', result.error);
      document.getElementById('statusText').textContent = `خطأ: ${result.error}`;
      overlay.classList.add('hidden');
      return;
    }

    casesData = result.cases || [];
    servicesData = result.services || [];

    const source = result.fromCache ? '(من الذاكرة المحلية)' : '(من OneDrive)';
    console.log(`✅ Loaded ${casesData.length} cases, ${servicesData.length} services ${source}`);
    if (casesData.length > 0) console.log('Cases cols:', Object.keys(casesData[0]));
    if (servicesData.length > 0) console.log('Services cols:', Object.keys(servicesData[0]));

    // Populate filters
    populateFilters();
    populateYearTimeline();

    // Initial display
    filteredData = [...casesData];
    renderTable();
    updateSearchStats();

    // Initialize dashboard
    initDashboard();

    const loadTime = new Date().toLocaleTimeString('ar-EG');
    const cacheNote = result.fromCache ? ' ⚡' : '';
    document.getElementById('statusText').textContent = `جاهز — ${casesData.length.toLocaleString('ar-EG')} سجل ${source} (${loadTime})${cacheNote}`;

    // Setup auto-refresh timer
    startAutoRefresh();

  } catch (err) {
    console.error('❌ Error:', err);
    document.getElementById('statusText').textContent = 'خطأ في التحميل';
  } finally {
    overlay.classList.add('hidden');
  }
}

// ══════════════════════════════════════════════════
//  DATA REFRESH & AUTO-REFRESH
// ══════════════════════════════════════════════════
async function refreshData() {
  // Clear existing filter options to avoid duplicates
  const selects = ['filterNationality', 'filterAsylum', 'dashNationality', 'dashAsylum', 'dashService'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    while (el.options.length > 1) el.remove(1);
  });

  // Clear year timeline (keep "All" button)
  const timelineYears = document.getElementById('timelineYears');
  const allBtn = timelineYears.querySelector('.yr-all');
  timelineYears.innerHTML = '';
  if (allBtn) timelineYears.appendChild(allBtn);

  // Force fresh download (bypass cache)
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  document.getElementById('statusText').textContent = 'جارٍ تحديث البيانات من OneDrive...';
  const progressEl = document.getElementById('loadingProgress');
  if (progressEl) progressEl.textContent = 'جارٍ تحميل ملفات Excel الجديدة...';

  try {
    const result = await window.electronAPI.refreshData();
    if (result.error) {
      document.getElementById('statusText').textContent = `خطأ: ${result.error}`;
      overlay.classList.add('hidden');
      return;
    }
    casesData = result.cases || [];
    servicesData = result.services || [];

    populateFilters();
    populateYearTimeline();
    filteredData = [...casesData];
    renderTable();
    updateSearchStats();
    initDashboard();

    const loadTime = new Date().toLocaleTimeString('ar-EG');
    document.getElementById('statusText').textContent = `تم التحديث — ${casesData.length.toLocaleString('ar-EG')} سجل (${loadTime})`;
  } catch (err) {
    console.error('❌ Refresh error:', err);
    document.getElementById('statusText').textContent = 'خطأ في التحديث';
  } finally {
    overlay.classList.add('hidden');
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(async () => {
    console.log('🔄 Auto-refreshing data...');
    document.getElementById('statusText').textContent = 'تحديث تلقائي...';
    await refreshData();
  }, AUTO_REFRESH_MINUTES * 60 * 1000);
  console.log(`⏰ Auto-refresh set to every ${AUTO_REFRESH_MINUTES} minutes`);
}

// ══════════════════════════════════════════════════
//  POPULATE FILTERS
// ══════════════════════════════════════════════════
function populateFilters() {
  // Nationalities
  const nats = [...new Set(casesData.map(r => String(r['الجنسية'] || '').trim()).filter(Boolean))].sort();
  const natSelect = document.getElementById('filterNationality');
  const dashNatSelect = document.getElementById('dashNationality');
  nats.forEach(n => {
    natSelect.add(new Option(n, n));
    dashNatSelect.add(new Option(n, n));
  });

  // Asylum statuses
  const asylums = [...new Set(casesData.map(r => String(r['موقف اللجوء'] || '').trim()).filter(Boolean))].sort();
  const asylumSelect = document.getElementById('filterAsylum');
  const dashAsylumSelect = document.getElementById('dashAsylum');
  asylums.forEach(a => {
    asylumSelect.add(new Option(a, a));
    dashAsylumSelect.add(new Option(a, a));
  });

  // Services (for dashboard)
  const services = [...new Set(servicesData.map(r => String(r['الملف'] || '').trim()).filter(Boolean))].sort();
  const svcSelect = document.getElementById('dashService');
  services.forEach(s => svcSelect.add(new Option(s, s)));
}

function populateYearTimeline() {
  const years = [...new Set(casesData.map(r => {
    const y = r['Year'];
    return y ? String(y).trim() : null;
  }).filter(Boolean))].sort();

  const container = document.getElementById('timelineYears');
  years.forEach(yr => {
    const btn = document.createElement('button');
    btn.className = 'yr-btn';
    btn.textContent = yr;
    btn.onclick = () => selectYear(btn, yr);
    container.appendChild(btn);
  });
}

// ══════════════════════════════════════════════════
//  SEARCH & FILTER (Port of backend.py:search)
// ══════════════════════════════════════════════════
function doSearch() {
  const code = document.getElementById('filterCode').value.trim();
  const name = document.getElementById('filterName').value.trim();
  const individual = document.getElementById('filterIndividual').value.trim();
  const family = document.getElementById('filterFamily').value.trim();
  const card = document.getElementById('filterCard').value.trim();
  const nationalId = document.getElementById('filterNationalId').value.trim();
  const nationality = document.getElementById('filterNationality').value;
  const asylum = document.getElementById('filterAsylum').value;

  let df = [...casesData];

  // Year filter
  if (selectedYear !== 'all') {
    df = df.filter(r => String(r['Year'] || '').trim() === selectedYear);
  }

  // Code filter — search in both C-Code and P-Code
  if (code) {
    const lc = code.toLowerCase();
    df = df.filter(r =>
      String(r['C-Code'] || '').toLowerCase().includes(lc) ||
      String(r['P-Code'] || '').toLowerCase().includes(lc)
    );
  }

  // Name
  if (name) {
    const ln = name.toLowerCase();
    df = df.filter(r => String(r['Name'] || '').toLowerCase().includes(ln));
  }

  // Individual number
  if (individual) df = df.filter(r => String(r['رقم كارت المفاوضية للفرد'] || '').includes(individual));

  // Family number
  if (family) df = df.filter(r => String(r['رقم ملف المفاوضية'] || '').includes(family));

  // Card number
  if (card) df = df.filter(r => String(r['كود المفاوضية'] || '').includes(card));

  // National ID
  if (nationalId) df = df.filter(r => String(r['الرقم القومى'] || '').includes(nationalId));

  // Nationality
  if (nationality) df = df.filter(r => String(r['الجنسية'] || '').includes(nationality));

  // Asylum
  if (asylum) df = df.filter(r => String(r['موقف اللجوء'] || '').includes(asylum));

  filteredData = df;
  currentPage = 1;
  renderTable();
  updateSearchStats(code);

  document.getElementById('statusText').textContent = `${filteredData.length.toLocaleString('ar-EG')} نتيجة`;
}

function clearFilters() {
  document.getElementById('filterCode').value = '';
  document.getElementById('filterName').value = '';
  document.getElementById('filterIndividual').value = '';
  document.getElementById('filterFamily').value = '';
  document.getElementById('filterCard').value = '';
  document.getElementById('filterNationalId').value = '';
  document.getElementById('filterNationality').value = '';
  document.getElementById('filterAsylum').value = '';

  document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));

  selectedYear = 'all';
  document.querySelectorAll('.yr-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.yr-all');
  if (allBtn) allBtn.classList.add('active');
  document.getElementById('tlDisplay').textContent = 'كل السنوات';

  filteredData = [...casesData];
  currentPage = 1;
  renderTable();
  updateSearchStats();
  document.getElementById('statusText').textContent = `جاهز — ${casesData.length.toLocaleString('ar-EG')} سجل`;
}

// ══════════════════════════════════════════════════
//  STATS CALCULATION (Port of backend.py:calculate_stats)
// ══════════════════════════════════════════════════
function calculateStats(code) {
  code = String(code || '').trim();

  if (!code) {
    // Global stats based on filtered data context
    const yearFiltered = selectedYear === 'all' ? casesData : casesData.filter(r => String(r['Year'] || '').trim() === selectedYear);
    const casesCount = yearFiltered.filter(r => String(r['P-Code'] || '').includes('-C-')).length;

    const yearSvc = selectedYear === 'all' ? servicesData : servicesData;
    const svcSum = yearSvc.reduce((s, r) => s + (parseFloat(r['عدد الخدمات']) || 0), 0);
    const costSum = yearSvc.reduce((s, r) => s + (parseFloat(r['التكلفة']) || 0), 0);
    return { cases: casesCount, services: Math.floor(svcSum), cost: costSum };
  }

  // Per-code stats
  const lc = code.toLowerCase();
  const codeCases = casesData.filter(r =>
    String(r['C-Code'] || '').toLowerCase().includes(lc) ||
    String(r['P-Code'] || '').toLowerCase().includes(lc)
  );
  const casesCount = codeCases.filter(r => String(r['P-Code'] || '').includes('-C-')).length;

  const codeSvc = servicesData.filter(r =>
    String(r['C-Code'] || '').toLowerCase().includes(lc) ||
    String(r['P-Code'] || '').toLowerCase().includes(lc)
  );
  const svcSum = codeSvc.reduce((s, r) => s + (parseFloat(r['عدد الخدمات']) || 0), 0);
  const costSum = codeSvc.reduce((s, r) => s + (parseFloat(r['التكلفة']) || 0), 0);

  return { cases: casesCount, services: Math.floor(svcSum), cost: costSum };
}

function updateSearchStats(code) {
  const stats = calculateStats(code);
  animateValue('searchCases', stats.cases);
  animateValue('searchServices', stats.services);
  animateValue('searchCost', stats.cost);
  document.getElementById('resultCount').textContent = `${filteredData.length.toLocaleString('ar-EG')} نتيجة`;
}

// ── Smooth number animation ──
function animateValue(elementId, endVal) {
  const el = document.getElementById(elementId);
  const startVal = parseInt(el.textContent.replace(/[^\d]/g, '') || '0');
  const diff = endVal - startVal;
  if (diff === 0) { el.textContent = endVal.toLocaleString('ar-EG'); return; }

  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.floor(startVal + diff * eased);
    el.textContent = current.toLocaleString('ar-EG');
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = endVal.toLocaleString('ar-EG');
  }
  requestAnimationFrame(step);
}

// ══════════════════════════════════════════════════
//  TABLE RENDERING
// ══════════════════════════════════════════════════
function renderTable() {
  const tbody = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');
  const totalRows = filteredData.length;

  if (totalRows === 0) {
    tbody.innerHTML = '';
    emptyState.classList.add('visible');
    renderPagination(0);
    return;
  }

  emptyState.classList.remove('visible');

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalRows);
  const pageData = filteredData.slice(start, end);

  tbody.innerHTML = pageData.map((row) => {
    const ccode = escapeHtml(String(row['C-Code'] || ''));
    return `
    <tr onclick="selectRow(this, '${ccode.replace(/'/g, "\\'")}')">
      <td>${ccode}</td>
      <td>${escapeHtml(String(row['Name'] || ''))}</td>
      <td>${escapeHtml(String(row['Age'] || ''))}</td>
      <td>${escapeHtml(String(row['الجنسية'] || ''))}</td>
      <td>${escapeHtml(String(row['الرقم القومى'] || ''))}</td>
      <td>${escapeHtml(String(row['رقم كارت المفاوضية للفرد'] || ''))}</td>
      <td>${escapeHtml(String(row['رقم ملف المفاوضية'] || ''))}</td>
      <td>${escapeHtml(String(row['كود المفاوضية'] || ''))}</td>
      <td>${escapeHtml(String(row['موقف اللجوء'] || ''))}</td>
    </tr>`;
  }).join('');

  renderPagination(totalRows);
  document.getElementById('pagiRange').textContent = `${start + 1}–${end}`;
  document.getElementById('pagiTotal').textContent = totalRows.toLocaleString('ar-EG');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const container = document.getElementById('pagiButtons');
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = `pagi-btn ${currentPage === 1 ? 'disabled' : ''}`;
  prev.innerHTML = '‹';
  prev.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); scrollTableTop(); } };
  container.appendChild(prev);

  const maxBtns = 7;
  let startP = Math.max(1, currentPage - 3);
  let endP = Math.min(totalPages, startP + maxBtns - 1);
  if (endP - startP < maxBtns - 1) startP = Math.max(1, endP - maxBtns + 1);

  for (let p = startP; p <= endP; p++) {
    const btn = document.createElement('button');
    btn.className = `pagi-btn ${p === currentPage ? 'active' : ''}`;
    btn.textContent = p;
    btn.onclick = () => { currentPage = p; renderTable(); scrollTableTop(); };
    container.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = `pagi-btn ${currentPage === totalPages ? 'disabled' : ''}`;
  next.innerHTML = '›';
  next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); scrollTableTop(); } };
  container.appendChild(next);
}

function scrollTableTop() {
  document.getElementById('tableContainer').scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════
//  SORTING
// ══════════════════════════════════════════════════
function sortTable(col) {
  if (sortCol === col) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = col;
    sortDir = 'asc';
  }

  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === col) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });

  filteredData.sort((a, b) => {
    let va = a[col] ?? '';
    let vb = b[col] ?? '';

    const na = parseFloat(va);
    const nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;

    va = String(va).toLowerCase();
    vb = String(vb).toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb, 'ar') : vb.localeCompare(va, 'ar');
  });

  currentPage = 1;
  renderTable();
}

// ══════════════════════════════════════════════════
//  ROW SELECTION
// ══════════════════════════════════════════════════
function selectRow(tr, code) {
  document.querySelectorAll('#tableBody tr').forEach(r => r.classList.remove('selected'));
  tr.classList.add('selected');
  if (code) updateSearchStats(code);
}

// ══════════════════════════════════════════════════
//  YEAR TIMELINE
// ══════════════════════════════════════════════════
function selectYear(btn, year) {
  document.querySelectorAll('.yr-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedYear = year;
  document.getElementById('tlDisplay').textContent = year === 'all' ? 'كل السنوات' : `السنة: ${year}`;
  doSearch();
}

function scrollTimeline(dir) {
  const c = document.getElementById('timelineYears');
  c.scrollBy({ left: dir * 120, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════
//  ACCORDION
// ══════════════════════════════════════════════════
function toggleAccordion(id) {
  document.getElementById(id).classList.toggle('open');
}

// ══════════════════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════════════════
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'dashboard') {
    setTimeout(() => { if (dashMap) dashMap.invalidateSize(); }, 150);
  }
}

// ══════════════════════════════════════════════════
//  EXPORT EXCEL (via IPC)
// ══════════════════════════════════════════════════
async function exportExcel() {
  document.getElementById('statusText').textContent = 'جارٍ التصدير...';
  try {
    const result = await window.electronAPI.exportExcel(filteredData);
    if (result.saved) {
      document.getElementById('statusText').textContent = `✅ تم الحفظ: ${result.path}`;
    } else {
      document.getElementById('statusText').textContent = 'تم إلغاء التصدير';
    }
  } catch (err) {
    console.error('Export error:', err);
    document.getElementById('statusText').textContent = '❌ خطأ في التصدير';
  }
}

// ══════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════
let dashMap = null;
let dashMarkers = [];
let barChart = null;
let ageChart = null;
let asylumChart = null;
let yearlyChart = null;

function initDashboard() {
  try {
    if (!dashMap) {
      dashMap = L.map('mapContainer', {
        center: [26.8, 30.8],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 18,
      }).addTo(dashMap);
    }
  } catch (e) {
    console.warn('Map init skipped (tab not visible yet)');
  }

  applyDashboardFilters();
}

function applyDashboardFilters() {
  const asylum = document.getElementById('dashAsylum').value;
  const ageGroup = document.getElementById('dashAge').value;
  const nationality = document.getElementById('dashNationality').value;
  const service = document.getElementById('dashService').value;

  // Filter cases
  let filtC = [...casesData];
  if (asylum) filtC = filtC.filter(r => String(r['موقف اللجوء'] || '').includes(asylum));
  if (nationality) filtC = filtC.filter(r => String(r['الجنسية'] || '').includes(nationality));
  if (ageGroup) {
    filtC = filtC.filter(r => {
      const age = parseFloat(r['Age']);
      if (isNaN(age)) return false;
      if (ageGroup === 'تحت السن') return age < 18;
      if (ageGroup === 'فوق السن') return age >= 18;
      return true;
    });
  }

  // Filter services
  let filtS = [...servicesData];
  if (asylum) filtS = filtS.filter(r => String(r['موقف اللجوء'] || '').includes(asylum));
  if (nationality) filtS = filtS.filter(r => String(r['الجنسية'] || '').includes(nationality));
  if (service) filtS = filtS.filter(r => String(r['الملف'] || '').includes(service));

  // Update cards
  const casesCount = filtC.filter(r => String(r['P-Code'] || '').includes('-C-')).length;
  const svcSum = filtS.reduce((s, r) => s + (parseFloat(r['عدد الخدمات']) || 0), 0);
  const costSum = filtS.reduce((s, r) => s + (parseFloat(r['التكلفة']) || 0), 0);

  animateValue('dashCases', filtC.length);
  animateValue('dashServices', Math.floor(svcSum));
  animateValue('dashCost', Math.floor(costSum));

  // Update all charts
  updateMap(filtC);
  updateBarChart(filtC);
  updateAgeChart(filtC);
  updateAsylumChart(filtC);
  updateYearlyChart(filtC);
}

// ── Chart Colors ──
const CHART_COLORS = [
  '#00A99D', '#33d1c6', '#1a6bff', '#E8A900', '#27b67a',
  '#e84545', '#805AD5', '#DD6B20', '#38A169', '#3182CE',
  '#D53F8C', '#718096', '#2D3748', '#C05621',
];

const CHART_TOOLTIP = {
  rtl: true, textDirection: 'rtl',
  backgroundColor: '#1a2535',
  titleFont: { family: 'Cairo', size: 13 },
  bodyFont: { family: 'Cairo', size: 12 },
  padding: 12, cornerRadius: 8,
};

// ── Map ──
function updateMap(data) {
  if (!dashMap) return;

  dashMarkers.forEach(m => dashMap.removeLayer(m));
  dashMarkers = [];

  const counts = {};
  data.forEach(r => {
    const nat = String(r['الجنسية'] || '').trim();
    if (nat) counts[nat] = (counts[nat] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(counts), 1);

  for (const [nat, count] of Object.entries(counts)) {
    const loc = NAT_LOCATIONS[nat] || { lat: 30.05 + Math.random() * 2, lng: 31.24 + Math.random() * 2, name: nat };
    const ratio = count / maxCount;
    const size = 16 + ratio * 30;

    const icon = L.divIcon({
      html: `<div style="
        width:${size}px; height:${size}px;
        background: radial-gradient(circle, rgba(0,169,157,0.9), rgba(0,169,157,0.5));
        border: 2px solid rgba(255,255,255,0.9);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
        font-size:${Math.max(9, size * 0.3)}px; font-weight:700; color:white;
        font-family: 'DM Sans', sans-serif;
      ">${count > 99 ? Math.round(count / 1000) + 'K' : count}</div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(dashMap);
    marker.bindPopup(`
      <div style="font-family:'Cairo',sans-serif;font-size:13px;min-width:100px;text-align:right;direction:rtl;padding:4px">
        <div style="font-size:14px;font-weight:700;color:#0a3a38;margin-bottom:4px">${loc.name || nat}</div>
        <div style="color:#566070">عدد الحالات: <b style="color:#00A99D">${count.toLocaleString('ar-EG')}</b></div>
      </div>
    `);
    dashMarkers.push(marker);
  }

  if (Object.keys(counts).length > 1) {
    const bounds = dashMarkers.map(m => m.getLatLng());
    dashMap.fitBounds(bounds.map(b => [b.lat, b.lng]), { padding: [40, 40] });
  }
}

// ── Bar Chart (Top 10 Nationalities) ──
function updateBarChart(data) {
  const counts = {};
  data.forEach(r => {
    const nat = String(r['الجنسية'] || '').trim();
    if (nat) counts[nat] = (counts[nat] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = sorted.map(s => s[0].length > 15 ? s[0].substring(0, 13) + '...' : s[0]);
  const values = sorted.map(s => s[1]);

  const ctx = document.getElementById('barChart')?.getContext('2d');
  if (!ctx) return;
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'عدد الحالات',
        data: values,
        backgroundColor: CHART_COLORS.slice(0, values.length),
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 18,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: CHART_TOOLTIP,
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'Cairo', size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 11 } } },
      },
    },
  });
}

// ── Age Groups Doughnut ──
function updateAgeChart(data) {
  let under18 = 0, over18 = 0, unknown = 0;
  data.forEach(r => {
    const age = parseFloat(r['Age']);
    if (isNaN(age)) { unknown++; return; }
    if (age < 18) under18++;
    else over18++;
  });

  const ctx = document.getElementById('ageChart')?.getContext('2d');
  if (!ctx) return;
  if (ageChart) ageChart.destroy();

  const labels = ['فوق السن (١٨+)', 'تحت السن (أقل من ١٨)'];
  const values = [over18, under18];
  if (unknown > 0) { labels.push('غير محدد'); values.push(unknown); }

  ageChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#00A99D', '#E8A900', '#a8b6c4'],
        borderWidth: 2, borderColor: '#fff',
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom', rtl: true,
          labels: { font: { family: 'Cairo', size: 12 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 },
        },
        tooltip: CHART_TOOLTIP,
      },
    },
  });
}

// ── Asylum Status Doughnut ──
function updateAsylumChart(data) {
  const counts = {};
  data.forEach(r => {
    const status = String(r['موقف اللجوء'] || '').trim();
    if (status) counts[status] = (counts[status] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let labels, values;
  if (sorted.length > 6) {
    labels = sorted.slice(0, 5).map(s => s[0]);
    values = sorted.slice(0, 5).map(s => s[1]);
    labels.push('أخرى');
    values.push(sorted.slice(5).reduce((s, v) => s + v[1], 0));
  } else {
    labels = sorted.map(s => s[0]);
    values = sorted.map(s => s[1]);
  }

  const ctx = document.getElementById('asylumChart')?.getContext('2d');
  if (!ctx) return;
  if (asylumChart) asylumChart.destroy();

  asylumChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS.slice(0, values.length),
        borderWidth: 2, borderColor: '#fff',
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom', rtl: true,
          labels: { font: { family: 'Cairo', size: 11 }, padding: 10, usePointStyle: true, pointStyleWidth: 10 },
        },
        tooltip: CHART_TOOLTIP,
      },
    },
  });
}

// ── Yearly Trend Line Chart ──
function updateYearlyChart(data) {
  const counts = {};
  data.forEach(r => {
    const year = String(r['Year'] || '').trim();
    if (year && year !== 'undefined' && year.length === 4) counts[year] = (counts[year] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(s => s[0]);
  const values = sorted.map(s => s[1]);

  const ctx = document.getElementById('yearlyChart')?.getContext('2d');
  if (!ctx) return;
  if (yearlyChart) yearlyChart.destroy();

  yearlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'عدد الحالات',
        data: values,
        borderColor: '#00A99D',
        backgroundColor: 'rgba(0,169,157,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00A99D',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: CHART_TOOLTIP,
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'Cairo', size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'Cairo', size: 11 } } },
      },
    },
  });
}

