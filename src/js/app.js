/* ═══════════════════════════════════════════════════════════
   مركز معلومات مرسال — Main Application Logic v3.1
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
let currentSelectedCode = ''; // For modal
const PAGE_SIZE = 50;

// قائمة الإيميلات المصرح لها بالدخول
const ALLOWED_EMAILS = [
  'admin@mersal.org',
  'demo@mersal.org',
  'moataz@mersal.org',
  'alaa@mersal.org',
  'nour@mersal.org'
];

// ── Egyptian Governorate Locations (for map) ──
const GOV_LOCATIONS = {
  'القاهرة': { lat: 30.04, lng: 31.24 },
  'الجيزة': { lat: 30.01, lng: 31.21 },
  'الإسكندرية': { lat: 31.20, lng: 29.92 },
  'الاسكندرية': { lat: 31.20, lng: 29.92 },
  'الدقهلية': { lat: 31.05, lng: 31.38 },
  'دقهلية': { lat: 31.05, lng: 31.38 },
  'الشرقية': { lat: 30.55, lng: 31.70 },
  'شرقية': { lat: 30.55, lng: 31.70 },
  'القليوبية': { lat: 30.33, lng: 31.24 },
  'قليوبية': { lat: 30.33, lng: 31.24 },
  'كفر الشيخ': { lat: 31.34, lng: 30.94 },
  'الغربية': { lat: 30.87, lng: 31.03 },
  'غربية': { lat: 30.87, lng: 31.03 },
  'المنوفية': { lat: 30.52, lng: 30.99 },
  'منوفية': { lat: 30.52, lng: 30.99 },
  'البحيرة': { lat: 30.84, lng: 30.34 },
  'بحيرة': { lat: 30.84, lng: 30.34 },
  'الإسماعيلية': { lat: 30.60, lng: 32.27 },
  'الاسماعيلية': { lat: 30.60, lng: 32.27 },
  'السويس': { lat: 29.97, lng: 32.55 },
  'سويس': { lat: 29.97, lng: 32.55 },
  'بورسعيد': { lat: 31.27, lng: 32.30 },
  'دمياط': { lat: 31.42, lng: 31.82 },
  'الفيوم': { lat: 29.30, lng: 30.84 },
  'فيوم': { lat: 29.30, lng: 30.84 },
  'بني سويف': { lat: 29.07, lng: 31.10 },
  'المنيا': { lat: 28.08, lng: 30.75 },
  'منيا': { lat: 28.08, lng: 30.75 },
  'أسيوط': { lat: 27.18, lng: 31.17 },
  'اسيوط': { lat: 27.18, lng: 31.17 },
  'سوهاج': { lat: 26.56, lng: 31.69 },
  'قنا': { lat: 26.16, lng: 32.72 },
  'الأقصر': { lat: 25.69, lng: 32.64 },
  'اقصر': { lat: 25.69, lng: 32.64 },
  'الاقصر': { lat: 25.69, lng: 32.64 },
  'أسوان': { lat: 24.09, lng: 32.90 },
  'اسوان': { lat: 24.09, lng: 32.90 },
  'البحر الأحمر': { lat: 25.07, lng: 33.82 },
  'البحر الاحمر': { lat: 25.07, lng: 33.82 },
  'الوادي الجديد': { lat: 25.44, lng: 30.55 },
  'مطروح': { lat: 31.35, lng: 27.24 },
  'مرسى مطروح': { lat: 31.35, lng: 27.24 },
  'شمال سيناء': { lat: 31.07, lng: 33.83 },
  'جنوب سيناء': { lat: 28.50, lng: 33.97 },
  '6 أكتوبر': { lat: 29.96, lng: 30.93 },
  'السادس من أكتوبر': { lat: 29.96, lng: 30.93 },
  'حلوان': { lat: 29.84, lng: 31.30 },
  'العاشر من رمضان': { lat: 30.30, lng: 31.75 },
};

// ══════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Listen for live progress updates from main process
  if (window.electronAPI?.onProgress) {
    window.electronAPI.onProgress((msg) => {
      const progressEl = document.getElementById('loadingProgress');
      const statusEl = document.getElementById('statusText');
      if (progressEl) progressEl.textContent = msg;
      if (statusEl) statusEl.textContent = msg;
    });
  }

  // Enter key triggers search in filters
  document.querySelectorAll('.field-input, .sub-input').forEach(el => {
    el.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
  });

  // Enter key triggers login
  const loginInput = document.getElementById('loginEmail');
  if (loginInput) {
    loginInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
  }

  // Always show filter sidebar on startup
  localStorage.removeItem('mersal_filter_collapsed');
  document.getElementById('filterSidebar')?.classList.remove('collapsed');
  document.querySelector('.search-layout')?.classList.remove('sidebar-collapsed');
  const togBtn = document.getElementById('filterToggleBtn');
  if (togBtn) togBtn.classList.remove('flipped');

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCaseModal();
      closeFrameworkModal();
    }
  });

  // Check if user already logged in
  const savedEmail = localStorage.getItem('mersal_user_email');
  if (savedEmail) {
    currentUserEmail = savedEmail;
    showApp();
    await loadAllData();
  }
});

// ══════════════════════════════════════════════════
//  EMAIL LOGIN
// ══════════════════════════════════════════════════
async function handleLogin() {
  const emailInput = document.getElementById('loginEmail');
  const errorEl = document.getElementById('loginError');
  const email = emailInput.value.trim().toLowerCase();

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

  if (!ALLOWED_EMAILS.includes(email)) {
    errorEl.textContent = 'هذا البريد غير مصرح له بالدخول';
    emailInput.classList.add('input-error');
    return;
  }

  errorEl.textContent = '';
  emailInput.classList.remove('input-error');

  currentUserEmail = email;
  localStorage.setItem('mersal_user_email', email);

  showApp();
  await loadAllData();
}

function showApp() {
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) loginOverlay.classList.add('hidden');

  document.getElementById('userEmail').textContent = currentUserEmail;
  const initials = currentUserEmail.split('@')[0].substring(0, 2).toUpperCase();
  document.getElementById('userAvatar').textContent = initials;

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
  if (progressEl) progressEl.textContent = 'جارٍ تحميل البيانات...';

  try {
    const result = await window.electronAPI.loadData();

    if (result.error) {
      console.error('Data load error:', result.error);
      document.getElementById('statusText').textContent = `خطأ: ${result.error}`;
      overlay.classList.add('hidden');
      return;
    }

    casesData = result.cases || [];
    // servicesData is no longer loaded globally to stay lightweight ⚡

    // Update data version in header
    if (result.dataVersion) {
      document.getElementById('dataVersion').textContent = result.dataVersion;
    }

    const source = result.fromCache ? '(من الذاكرة المحلية)' : '(من OneDrive)';
    console.log(`✅ Loaded ${casesData.length} cases ${source}`);

    // Populate filters async
    await populateFilters();
    populateYearTimeline();

    // Initial display
    filteredData = [...casesData];
    filteredData.sort((a, b) => {
      let va = a['C-Code'] ?? '';
      let vb = b['C-Code'] ?? '';
      return va.localeCompare(vb, 'ar', { numeric: true });
    });
    
    sortCol = 'C-Code';
    sortDir = 'asc';
    document.querySelectorAll('th.sortable').forEach(th => {
      if (th.dataset.col === 'C-Code') th.classList.add('sort-asc');
    });

    renderTable();
    updateSearchStats();

    // Initialize dashboard
    initDashboard();

    const loadTime = new Date().toLocaleTimeString('ar-EG');
    const cacheNote = result.fromCache ? ' ⚡' : '';
    document.getElementById('statusText').textContent = `جاهز — ${casesData.length.toLocaleString('ar-EG')} سجل ${source} (${loadTime})${cacheNote}`;

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
  // Clear existing filter options
  const selects = ['filterNationality', 'filterAsylum', 'dashNationality', 'dashAsylum', 'dashService'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    while (el.options.length > 1) el.remove(1);
  });

  // Clear year timeline
  const timelineYears = document.getElementById('timelineYears');
  const allBtn = timelineYears.querySelector('.yr-all');
  timelineYears.innerHTML = '';
  if (allBtn) timelineYears.appendChild(allBtn);

  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  document.getElementById('statusText').textContent = 'جارٍ تحديث البيانات...';
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
    // servicesData removed from global scope

    // Update data version in header
    if (result.dataVersion) {
      document.getElementById('dataVersion').textContent = result.dataVersion;
    }

    await populateFilters();
    populateYearTimeline();
    
    filteredData = [...casesData];
    filteredData.sort((a, b) => {
      let va = a['C-Code'] ?? '';
      let vb = b['C-Code'] ?? '';
      return va.localeCompare(vb, 'ar', { numeric: true });
    });

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

// ══════════════════════════════════════════════════
//  POPULATE FILTERS
// ══════════════════════════════════════════════════
async function populateFilters() {
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
  if (!asylums.includes('مواطن')) asylums.push('مواطن');
  
  const asylumSelect = document.getElementById('filterAsylum');
  const dashAsylumSelect = document.getElementById('dashAsylum');
  asylums.forEach(a => {
    asylumSelect.add(new Option(a, a));
    dashAsylumSelect.add(new Option(a, a));
  });

  // Governorates
  const govs = [...new Set(casesData.map(r => String(r['محافظة السكن الحالي'] || '').trim()).filter(Boolean))].sort();
  const govSelect = document.getElementById('filterGovernorate');
  govs.forEach(g => govSelect.add(new Option(g, g)));

  // Services (for dashboard) — load distinct options blazingly fast using SQLite
  const opts = await window.electronAPI.getFilterOptions();
  const svcList = opts.specialties.length > 0 ? opts.specialties : opts.files;
  const svcSelect = document.getElementById('dashService');
  svcList.forEach(s => svcSelect.add(new Option(s, s)));
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
//  SEARCH & FILTER
// ══════════════════════════════════════════════════
function doSearch() {
  const code = document.getElementById('filterCode').value.trim();
  const name = document.getElementById('filterName').value.trim();
  const individual = document.getElementById('filterIndividual').value.trim();
  const family = document.getElementById('filterFamily').value.trim();
  const nationalId = document.getElementById('filterNationalId').value.trim();
  const nationality = document.getElementById('filterNationality').value;
  const asylum = document.getElementById('filterAsylum').value;
  const governorate = document.getElementById('filterGovernorate').value;

  let df = [...casesData];

  if (selectedYear !== 'all') {
    df = df.filter(r => String(r['Year'] || '').trim() === selectedYear);
  }

  if (code) {
    const lc = code.toLowerCase();
    df = df.filter(r =>
      String(r['C-Code'] || '').toLowerCase().includes(lc) ||
      String(r['P-Code'] || '').toLowerCase().includes(lc)
    );
  }

  if (name) {
    const ln = name.toLowerCase();
    df = df.filter(r => String(r['Name'] || '').toLowerCase().includes(ln));
  }

  if (individual) df = df.filter(r => String(r['رقم كارت المفاوضية للفرد'] || '').includes(individual));
  if (family) df = df.filter(r => String(r['رقم ملف المفاوضية'] || '').includes(family));
  if (nationalId) df = df.filter(r => String(r['الرقم القومى'] || '').includes(nationalId));
  if (nationality) df = df.filter(r => String(r['الجنسية'] || '').includes(nationality));
  if (asylum) df = df.filter(r => String(r['موقف اللجوء'] || '').includes(asylum));
  if (governorate) df = df.filter(r => String(r['محافظة السكن الحالي'] || '').trim() === governorate);

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
  document.getElementById('filterNationalId').value = '';
  document.getElementById('filterNationality').value = '';
  document.getElementById('filterAsylum').value = '';
  document.getElementById('filterGovernorate').value = '';

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

// ── Filter by governorate (called from map click) ──
function filterByGovernorate(govName) {
  // Switch to search tab
  switchTab('search');

  // Clear all other filters first
  document.getElementById('filterCode').value = '';
  document.getElementById('filterName').value = '';
  document.getElementById('filterIndividual').value = '';
  document.getElementById('filterFamily').value = '';
  document.getElementById('filterNationalId').value = '';
  document.getElementById('filterNationality').value = '';
  document.getElementById('filterAsylum').value = '';
  document.querySelectorAll('.accordion').forEach(a => a.classList.remove('open'));

  // Set the governorate filter
  const govSelect = document.getElementById('filterGovernorate');
  // Try exact match first, then try partial
  let matched = false;
  for (const opt of govSelect.options) {
    if (opt.value === govName) {
      govSelect.value = govName;
      matched = true;
      break;
    }
  }
  if (!matched) {
    // Try partial match
    for (const opt of govSelect.options) {
      if (opt.value.includes(govName) || govName.includes(opt.value)) {
        govSelect.value = opt.value;
        break;
      }
    }
  }

  // Run the search
  doSearch();
}

// ══════════════════════════════════════════════════
//  STATS CALCULATION
// ══════════════════════════════════════════════════
async function updateSearchStats(code) {
  const casesCount = filteredData.length;
  
  // Collect all filter logic identical to doSearch to send to SQLite
  const filters = {
    code: code || document.getElementById('filterCode').value.trim(),
    name: document.getElementById('filterName').value.trim(),
    individual: document.getElementById('filterIndividual').value.trim(),
    family: document.getElementById('filterFamily').value.trim(),
    nationalId: document.getElementById('filterNationalId').value.trim(),
    nationality: document.getElementById('filterNationality').value,
    asylum: document.getElementById('filterAsylum').value,
    year: selectedYear
  };

  const stats = await window.electronAPI.getSearchStats(filters);
  
  animateValue('searchCases', casesCount);
  animateValue('searchServices', Math.floor(stats.svcSum));
  animateValue('searchCost', stats.costSum);
  document.getElementById('resultCount').textContent = `${casesCount.toLocaleString('ar-EG')} نتيجة`;
}

// ── Smooth number animation ──
function animateValue(elementId, endVal) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const startVal = parseInt(el.textContent.replace(/[^\d]/g, '') || '0');
  const diff = endVal - startVal;
  if (diff === 0) { el.textContent = endVal.toLocaleString('ar-EG'); return; }

  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
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
    <tr onclick="selectRow(this, '${ccode.replace(/'/g, "\\\'")}')">
      <td>${ccode}</td>
      <td>${escapeHtml(String(row['Name'] || ''))}</td>
      <td>${escapeHtml(String(row['Age'] || ''))}</td>
      <td>${escapeHtml(String(row['الجنسية'] || ''))}</td>
      <td>${escapeHtml(String(row['الرقم القومى'] || ''))}</td>
      <td>${escapeHtml(String(row['رقم كارت المفاوضية للفرد'] || ''))}</td>
      <td>${escapeHtml(String(row['رقم ملف المفاوضية'] || ''))}</td>
      <td>${escapeHtml(String(row['محافظة السكن الحالي'] || ''))}</td>
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
//  ROW SELECTION → CASE MODAL
// ══════════════════════════════════════════════════
function selectRow(tr, code) {
  document.querySelectorAll('#tableBody tr').forEach(r => r.classList.remove('selected'));
  tr.classList.add('selected');
  currentSelectedCode = code;

  // Find the case data
  const caseRow = casesData.find(r => String(r['C-Code'] || '').trim() === code);
  if (!caseRow) return;

  // Build modal content
  const modalBody = document.getElementById('caseModalBody');
  modalBody.innerHTML = `
    <div class="case-detail-grid">
      <div class="case-detail-item">
        <span class="case-detail-label">الكود</span>
        <span class="case-detail-value case-code-link" onclick="openFrameworkDetails()" title="اضغط لعرض تفاصيل Framework">${escapeHtml(String(caseRow['C-Code'] || ''))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">اسم الحالة</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['Name'] || 'غير معروف'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">الجنسية</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['الجنسية'] || '—'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">العمر</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['Age'] || '—'))} سنة</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">المحافظة</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['محافظة السكن الحالي'] || '—'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">الرقم القومي</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['الرقم القومى'] || '—'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">رقم المفاوضية للفرد</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['رقم كارت المفاوضية للفرد'] || '—'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">رقم المفاوضية للاسرة</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['رقم ملف المفاوضية'] || '—'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">تاريخ الإضافة</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['CreatedOn'] || '—'))}</span>
      </div>
      <div class="case-detail-item">
        <span class="case-detail-label">موقف اللجوء</span>
        <span class="case-detail-value">${escapeHtml(String(caseRow['موقف اللجوء'] || '—'))}</span>
      </div>
    </div>
  `;

  // Show modal
  document.getElementById('caseModal').classList.remove('hidden');
}

function closeCaseModal() {
  document.getElementById('caseModal').classList.add('hidden');
}

async function openFrameworkDetails() {
  closeCaseModal();
  const code = currentSelectedCode;
  if (!code) return;

  const modalBody = document.getElementById('frameworkModalBody');
  modalBody.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="loading-spinner" style="width:30px;height:30px;border-width:3px;margin:0 auto 1rem;"></div><p>جاري البحث عن تفاصيل Framework...</p></div>';
  document.getElementById('frameworkModal').classList.remove('hidden');

  try {
    const result = await window.electronAPI.getFrameworkData(code);
    
    if (!result.records || result.records.length === 0) {
      // Try patient details as fallback
      const patResult = await window.electronAPI.getPatientDetails(code);
      if (patResult.cases && patResult.cases.length > 0) {
        const patient = patResult.cases[0];
        let html = '<div class="framework-detail-grid">';
        for (const [key, val] of Object.entries(patient)) {
          if (String(val).trim()) {
            html += `<div class="case-detail-item"><span class="case-detail-label">${escapeHtml(key)}</span><span class="case-detail-value">${escapeHtml(String(val))}</span></div>`;
          }
        }
        html += '</div>';
        modalBody.innerHTML = html;
      } else {
        modalBody.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--slate-400);"><p>لا توجد بيانات Framework لهذا الكود بعد.<br>سيتم إضافتها عند رفع ملف Framework v5.</p></div>';
      }
      return;
    }

    let html = '';
    for (const record of result.records) {
      html += '<div class="framework-detail-grid">';
      for (const [key, val] of Object.entries(record.data)) {
        if (String(val).trim()) {
          html += `<div class="case-detail-item"><span class="case-detail-label">${escapeHtml(key)}</span><span class="case-detail-value">${escapeHtml(String(val))}</span></div>`;
        }
      }
      html += '</div>';
    }
    modalBody.innerHTML = html;
  } catch (err) {
    modalBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger);">خطأ: ${err.message}</div>`;
  }
}

function closeFrameworkModal() {
  document.getElementById('frameworkModal').classList.add('hidden');
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
//  FILTER SIDEBAR TOGGLE
// ══════════════════════════════════════════════════
function toggleFilterSidebar() {
  const sidebar = document.getElementById('filterSidebar');
  const layout = document.querySelector('.search-layout');
  const togBtn = document.getElementById('filterToggleBtn');
  
  sidebar.classList.toggle('collapsed');
  layout.classList.toggle('sidebar-collapsed');
  togBtn.classList.toggle('flipped');
  
  localStorage.setItem('mersal_filter_collapsed', sidebar.classList.contains('collapsed'));
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
    setTimeout(() => { 
      if (!dashMap) {
        initDashboard();
        updateMap(filteredData);
      } else {
        dashMap.invalidateSize(); 
      }
    }, 150);
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
    const container = document.getElementById('mapContainer');
    const isVisible = container && container.offsetHeight > 0 && container.offsetWidth > 0;
    
    if (!dashMap && isVisible) {
      dashMap = L.map('mapContainer', {
        center: [27.0, 30.0],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 18,
      }).addTo(dashMap);
      
      // Force correct sizing after creation
      setTimeout(() => dashMap.invalidateSize(), 200);
    }
  } catch (e) {
    console.warn('Map init skipped:', e.message);
    dashMap = null; // Reset so it can be retried
  }

  applyDashboardFilters();
}

async function applyDashboardFilters() {
  const asylum = document.getElementById('dashAsylum').value;
  const ageGroup = document.getElementById('dashAge').value;
  const nationality = document.getElementById('dashNationality').value;
  const service = document.getElementById('dashService').value;

  // Filter cases natively
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

  // Filter services instantly via SQLite aggregate map
  const stats = await window.electronAPI.getDashboardStats({ asylum, nationality, service });

  const casesCount = filtC.length;
  const svcSum = stats.svcSum;
  const costSum = stats.costSum;

  animateValue('dashCases', casesCount);
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

// ── Map (Egyptian Governorates) ──
function updateMap(data) {
  if (!dashMap) return;

  dashMarkers.forEach(m => dashMap.removeLayer(m));
  dashMarkers = [];

  // Count by governorate
  const counts = {};
  data.forEach(r => {
    let gov = String(r['محافظة السكن الحالي'] || '').trim();
    if (!gov) return;
    // Normalize the name
    const loc = GOV_LOCATIONS[gov];
    if (loc) {
      // Use the first matching key as canonical name
      counts[gov] = (counts[gov] || 0) + 1;
    }
  });

  const maxCount = Math.max(...Object.values(counts), 1);

  for (const [gov, count] of Object.entries(counts)) {
    const loc = GOV_LOCATIONS[gov];
    if (!loc) continue;
    const ratio = count / maxCount;
    const size = 18 + ratio * 32;

    const icon = L.divIcon({
      html: `<div style="
        width:${size}px; height:${size}px;
        background: radial-gradient(circle, rgba(0,169,157,0.9), rgba(0,169,157,0.5));
        border: 2px solid rgba(255,255,255,0.9);
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
        font-size:${Math.max(9, size * 0.28)}px; font-weight:700; color:white;
        font-family: 'DM Sans', sans-serif;
      ">${count > 999 ? Math.round(count / 1000) + 'K' : count}</div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(dashMap);
    marker.bindPopup(`
      <div style="font-family:'Cairo',sans-serif;font-size:13px;min-width:150px;text-align:right;direction:rtl;padding:4px">
        <div style="font-size:14px;font-weight:700;color:#0a3a38;margin-bottom:4px">${gov}</div>
        <div style="color:#566070;margin-bottom:8px">عدد الحالات: <b style="color:#00A99D">${count.toLocaleString('ar-EG')}</b></div>
        <button onclick="filterByGovernorate('${gov}')" style="
          width:100%; padding:6px 12px; border:none; border-radius:6px;
          background:linear-gradient(135deg,#00A99D,#33d1c6); color:white;
          font-family:'Cairo',sans-serif; font-size:12px; font-weight:700;
          cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;
        ">📋 عرض الحالات</button>
      </div>
    `);
    // Also make the marker itself clickable (direct click without popup)
    marker.on('click', function(e) {
      // Show popup on first click, the button inside handles navigation
    });
    dashMarkers.push(marker);
  }

  // Fit bounds to Egypt
  if (Object.keys(counts).length > 0) {
    dashMap.fitBounds([[22, 25], [31.8, 35]], { padding: [20, 20] });
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

// ══════════════════════════════════════════════════
//  TAB: PROFILE (التفاصيل الشاملة)
// ══════════════════════════════════════════════════

document.getElementById('profileSearchInput')?.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') searchProfile();
});

async function searchProfile() {
  const input = document.getElementById('profileSearchInput');
  const code = input.value.trim();
  
  if (!code) return;

  document.getElementById('profileEmptyState').style.display = 'none';
  document.getElementById('profileResults').style.display = 'none';
  document.getElementById('profileLoadingState').style.display = 'block';

  try {
    const result = await window.electronAPI.getPatientDetails(code);

    document.getElementById('profileLoadingState').style.display = 'none';

    if (result.error || !result.cases || result.cases.length === 0) {
      document.getElementById('profileEmptyState').style.display = 'block';
      document.getElementById('profileEmptyState').querySelector('h3').textContent = 'لم يتم العثور على أي حالة بهذا الكود';
      return;
    }

    const patient = result.cases[0];

    // Populate Header
    document.getElementById('profName').textContent = patient['Name'] || 'غير معروف';
    document.getElementById('profNat').textContent = patient['الجنسية'] || 'غير مسجل';
    document.getElementById('profAge').textContent = patient['Age'] || '0';
    document.getElementById('profAsylum').textContent = patient['موقف اللجوء'] || 'غير مسجل';
    document.getElementById('profCCode').textContent = patient['C-Code'] || '-';
    document.getElementById('profPCode').textContent = patient['P-Code'] || '-';

    // Fetch services dynamically using SQLite for high speed
    const profileServices = await window.electronAPI.getProfileServices(patient['C-Code'], patient['P-Code']);

    // Helper function to render a list of items
    const renderList = (containerId, items, keyFilters) => {
      const container = document.getElementById(containerId);
      if (!container) return; // safety
      container.innerHTML = '';
      if (!items || items.length === 0) {
        container.innerHTML = '<div class="prof-empty">لا يوجد بيانات مسجلة</div>';
        return;
      }

      items.forEach(item => {
        let titleVal = '';
        let subtitleVal = '';
        const data = item.data || item;
        
        for (const k of Object.keys(data)) {
          if (k.toLowerCase().includes('c-code') || k.toLowerCase().includes('c code') || k.toLowerCase().includes('p-code')) continue;
          
          const text = String(data[k]).trim();
          if (!text) continue;

          if (keyFilters.some(f => k.includes(f))) {
            if (!titleVal) titleVal = `<span class="badge bg-primary me-2">${k}</span> ${text}`;
            else {
              subtitleVal += `<div class="prof-kv"><span>${k}</span> <span>${text}</span></div>`;
            }
          }
        }
        
        if (!titleVal) {
          const keys = Object.keys(data).filter(k => 
            !k.toLowerCase().includes('c-code') && !k.toLowerCase().includes('c code') && !k.toLowerCase().includes('p-code') && String(data[k]).trim() !== ''
          );
          
          if (keys.length > 0) {
            titleVal = data[keys[0]];
            keys.slice(1).forEach(k => {
              subtitleVal += `<div class="prof-kv"><span>${k}</span> <span>${data[k]}</span></div>`;
            });
          }
        }

        const div = document.createElement('div');
        div.className = 'prof-item';
        div.innerHTML = `<div style="color:var(--text-primary); margin-bottom: ${subtitleVal ? '8px': '0'}; font-weight: bold; font-size: 1.05rem;">${titleVal||'بيان مسجل'}</div>
                         ${subtitleVal}`;
        container.appendChild(div);
      });
    };

    // Filter details by type
    const details = result.details || [];
    const diseases = details.filter(d => d.type === 'disease');
    const decisions = details.filter(d => d.type === 'decision');
    const researches = details.filter(d => d.type === 'research' || d.type === 'classification');
    const budgets = details.filter(d => d.type === 'budget');

    renderList('profDiseases', diseases, ['مرض', 'أمراض', 'disease', 'تشخيص', 'المرض']);
    renderList('profDecisions', decisions, ['قرار', 'القرار', 'تاريخ', 'لجنة', 'النوع', 'تصنيف', 'أطباء']);
    renderList('profResearch', researches, ['تصنيف', 'بحث', 'تاريخ', 'حالة البحث', 'class', 'موقف', 'نتيجة']);
    renderList('profBudget', budgets, ['مبلغ', 'صرف', 'دخل', 'ميزانية', 'نوع', 'جهة', 'قيمة', 'تاريخ']);

    // Render Services (Very Organized, Premium Look)
    const svcsContainer = document.getElementById('profServices');
    if (svcsContainer) {
      svcsContainer.innerHTML = '';
      if (!profileServices || profileServices.length === 0) {
        svcsContainer.innerHTML = '<div class="prof-empty">لا يوجد خدمات طبيّة مسجلة</div>';
      } else {
        profileServices.forEach(svc => {
          const specialty = svc['التخصص'] || svc['specialty'] || 'غير مسجل';
          const fileName = svc['الملف'] || svc['file_name'] || 'بدون ملف';
          const cost = svc['التكلفة'] || svc['cost'] || '0';
          const count = svc['عدد الخدمات'] || svc['services_count'] || '1';

          const div = document.createElement('div');
          div.className = 'prof-item';
          div.innerHTML = `
            <div style="color:var(--text-primary); margin-bottom:8px; font-weight:bold; font-size:1.05rem; display:flex; justify-content:space-between; align-items:center;">
              <span>${specialty}</span>
              <span class="badge bg-primary" style="font-size:0.75rem">${count} خدمة</span>
            </div>
            <div class="prof-kv"><span>الملف</span> <span>${fileName}</span></div>
            <div class="prof-kv"><span>التكلفة</span> <span style="color:#2196f3; font-weight:bold">${cost} ج.م</span></div>
          `;
          svcsContainer.appendChild(div);
        });
      }
    }

    document.getElementById('profileResults').style.display = 'block';

  } catch (err) {
    console.error(err);
    document.getElementById('profileLoadingState').style.display = 'none';
    document.getElementById('profileEmptyState').style.display = 'block';
  }
}
