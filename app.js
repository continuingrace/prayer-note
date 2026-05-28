// 기도의 방 — localStorage 전용

const STORAGE_KEY = 'prayer_note_data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { prayers: [], logs: [] };
    return JSON.parse(raw);
  } catch { return { prayers: [], logs: [] }; }
}
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function getData() { return loadData(); }
function uuid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function formatDate(d) {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
}

// ===== CRUD =====
const CAT_LABELS = { personal:'개인', family:'가족', church:'교회', nation:'나라', mission:'선교', work:'직장', other:'기타' };
const STATUS_LABELS = { ongoing:'기도 중', answered:'응답됨', paused:'잠시 멈춤' };

let _currentFilter = 'all';
let _editingId = null;

function getPrayers() { return getData().prayers; }
function getLogs(prayerId) { return getData().logs.filter(l => l.prayer_id === prayerId); }
function getAllLogs() { return getData().logs; }

function createPrayer(prayer) {
  const data = getData();
  const p = { ...prayer, id: uuid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  data.prayers.unshift(p);
  saveData(data);
  return p;
}
function updatePrayer(id, updates) {
  const data = getData();
  const idx = data.prayers.findIndex(p => p.id === id);
  if (idx === -1) return;
  data.prayers[idx] = { ...data.prayers[idx], ...updates, updated_at: new Date().toISOString() };
  saveData(data);
  return data.prayers[idx];
}
function deletePrayer(id) {
  const data = getData();
  data.prayers = data.prayers.filter(p => p.id !== id);
  data.logs = data.logs.filter(l => l.prayer_id !== id);
  saveData(data);
}
function createLog(log) {
  const data = getData();
  const l = { ...log, id: uuid(), created_at: new Date().toISOString() };
  data.logs.push(l);
  const idx = data.prayers.findIndex(p => p.id === log.prayer_id);
  if (idx !== -1) data.prayers[idx].updated_at = new Date().toISOString();
  saveData(data);
  return l;
}

// ===== RENDER =====
function renderList() {
  const list = document.getElementById('prayer-list');
  const empty = document.getElementById('empty-prayers');
  const prayers = getPrayers();
  const filtered = _currentFilter === 'all'
    ? prayers.filter(p => p.status !== 'answered')
    : prayers.filter(p => p.category === _currentFilter && p.status !== 'answered');

  Array.from(list.querySelectorAll('.prayer-card')).forEach(el => el.remove());
  if (filtered.length === 0) {
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    filtered.forEach(p => list.appendChild(makeCard(p)));
  }
}

function renderAnswered() {
  const list = document.getElementById('answered-list');
  const empty = document.getElementById('empty-answered');
  const answered = getPrayers().filter(p => p.status === 'answered');
  Array.from(list.querySelectorAll('.prayer-card')).forEach(el => el.remove());
  if (answered.length === 0) {
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    answered.forEach(p => list.appendChild(makeCard(p)));
  }
}

function makeCard(p) {
  const logs = getLogs(p.id);
  const card = document.createElement('div');
  card.className = 'prayer-card';
  card.innerHTML = `
    <div class="prayer-card-top">
      <div class="prayer-card-title">${p.title}</div>
      <div class="prayer-cat-badge">${CAT_LABELS[p.category] || p.category}</div>
    </div>
    ${p.content ? `<div class="prayer-card-content">${p.content}</div>` : ''}
    ${p.scripture ? `<div class="prayer-scripture-line">† ${p.scripture}</div>` : ''}
    <div class="prayer-card-footer">
      <span class="prayer-date">${formatDate(p.start_date)}</span>
      <div class="prayer-card-footer-right">
        ${logs.length > 0 ? `<span class="prayer-log-badge">이력 ${logs.length}</span>` : ''}
        <span class="prayer-status ${p.status}">${STATUS_LABELS[p.status]}</span>
      </div>
    </div>
  `;
  card.addEventListener('click', () => openEdit(p.id));
  return card;
}

function refreshAll() {
  renderList();
  renderAnswered();
  calendarRefresh();
  updateStorageInfo();
}

// ===== MODAL =====
function openNew() {
  _editingId = null;
  document.getElementById('modal-title-label').textContent = '새 기도제목';
  document.getElementById('field-title').value = '';
  document.getElementById('field-category').value = 'personal';
  document.getElementById('field-status').value = 'ongoing';
  document.getElementById('field-content').value = '';
  document.getElementById('field-scripture').value = '';
  document.getElementById('field-start-date').value = todayStr();
  document.getElementById('prayer-log-section').classList.add('hidden');
  document.getElementById('btn-delete-wrap').classList.add('hidden');
  document.getElementById('new-log-form').classList.add('hidden');
  document.getElementById('prayer-log-list').innerHTML = '';
  document.getElementById('modal-prayer').classList.remove('hidden');
  setTimeout(() => document.getElementById('field-title').focus(), 300);
}

function openEdit(id) {
  _editingId = id;
  const prayers = getPrayers();
  const p = prayers.find(pr => pr.id === id);
  if (!p) return;

  document.getElementById('modal-title-label').textContent = '기도제목 편집';
  document.getElementById('field-title').value = p.title;
  document.getElementById('field-category').value = p.category;
  document.getElementById('field-status').value = p.status;
  document.getElementById('field-content').value = p.content || '';
  document.getElementById('field-scripture').value = p.scripture || '';
  document.getElementById('field-start-date').value = p.start_date || todayStr();
  document.getElementById('prayer-log-section').classList.remove('hidden');
  document.getElementById('btn-delete-wrap').classList.remove('hidden');
  document.getElementById('new-log-form').classList.add('hidden');
  renderLogs(getLogs(id));
  document.getElementById('modal-prayer').classList.remove('hidden');
}

function renderLogs(logs) {
  const container = document.getElementById('prayer-log-list');
  container.innerHTML = '';
  logs.forEach(log => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `
      <div class="log-entry-date">${formatDate(log.date)}</div>
      <div class="log-entry-content">${log.content || ''}</div>
      ${log.scripture ? `<div class="log-entry-scripture">† ${log.scripture}</div>` : ''}
    `;
    container.appendChild(div);
  });
}

function closeModal() {
  document.getElementById('modal-prayer').classList.add('hidden');
  _editingId = null;
}

function saveModal() {
  const title = document.getElementById('field-title').value.trim();
  if (!title) { showToast('기도제목을 입력해주세요'); return; }
  const data = {
    title,
    category: document.getElementById('field-category').value,
    status: document.getElementById('field-status').value,
    content: document.getElementById('field-content').value.trim(),
    scripture: document.getElementById('field-scripture').value.trim(),
    start_date: document.getElementById('field-start-date').value,
  };
  if (_editingId) {
    updatePrayer(_editingId, data);
    showToast('수정되었습니다');
  } else {
    createPrayer(data);
    showToast('기도제목이 추가되었습니다');
  }
  closeModal();
  refreshAll();
}

function saveLog() {
  if (!_editingId) return;
  const content = document.getElementById('log-content').value.trim();
  if (!content) { showToast('내용을 입력해주세요'); return; }
  createLog({
    prayer_id: _editingId,
    date: document.getElementById('log-date').value || todayStr(),
    content,
    scripture: document.getElementById('log-scripture').value.trim(),
  });
  document.getElementById('log-content').value = '';
  document.getElementById('log-scripture').value = '';
  document.getElementById('new-log-form').classList.add('hidden');
  renderLogs(getLogs(_editingId));
  showToast('기록이 추가되었습니다');
  refreshAll();
}

// ===== CALENDAR =====
let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth();
const DOW = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function calendarRefresh() {
  document.getElementById('cal-month-label').textContent = `${_calYear}년 ${MONTHS[_calMonth]}`;
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow'; el.textContent = d; grid.appendChild(el);
  });

  const prayers = getPrayers();
  const logs = getAllLogs();
  const prayerDates = new Set();
  prayers.forEach(p => { if (p.start_date) prayerDates.add(p.start_date); });
  logs.forEach(l => { if (l.date) prayerDates.add(l.date); });

  const today = new Date();
  const todayS = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const firstDay = new Date(_calYear, _calMonth, 1).getDay();
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  const daysInPrev = new Date(_calYear, _calMonth, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    const el = document.createElement('div'); el.className = 'cal-day other-month';
    el.textContent = daysInPrev - i; grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div'); el.className = 'cal-day'; el.textContent = d;
    if (ds === todayS) el.classList.add('today');
    if (prayerDates.has(ds)) el.classList.add('has-prayer');
    el.addEventListener('click', () => calSelectDay(ds, el));
    grid.appendChild(el);
  }
  const total = firstDay + daysInMonth;
  const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let d = 1; d <= rem; d++) {
    const el = document.createElement('div'); el.className = 'cal-day other-month';
    el.textContent = d; grid.appendChild(el);
  }
}

function calSelectDay(dateStr, el) {
  document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  const detail = document.getElementById('cal-day-detail');
  const prayers = getPrayers();
  const logs = getAllLogs();
  const started = prayers.filter(p => p.start_date === dateStr);
  const dayLogs = logs.filter(l => l.date === dateStr);

  if (started.length === 0 && dayLogs.length === 0) {
    detail.innerHTML = `<div class="cal-detail-date">${formatDate(dateStr)}</div><p class="cal-detail-hint">이 날의 기도 기록이 없어요</p>`;
    return;
  }
  let html = `<div class="cal-detail-date">${formatDate(dateStr)}</div>`;
  started.forEach(p => {
    html += `<div class="cal-detail-item" data-id="${p.id}"><div class="cal-detail-item-title">🙏 ${p.title} <span class="cal-start-badge">시작</span></div>${p.content ? `<div class="cal-detail-item-content">${p.content.substring(0,60)}</div>` : ''}</div>`;
  });
  dayLogs.forEach(log => {
    const pr = prayers.find(p => p.id === log.prayer_id);
    html += `<div class="cal-detail-item" data-id="${log.prayer_id}"><div class="cal-detail-item-title">${pr ? pr.title : '기도'}</div>${log.content ? `<div class="cal-detail-item-content">${log.content.substring(0,80)}</div>` : ''}${log.scripture ? `<div class="log-entry-scripture" style="font-size:12px;margin-top:4px">† ${log.scripture}</div>` : ''}</div>`;
  });
  detail.innerHTML = html;
  detail.querySelectorAll('.cal-detail-item[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelector('[data-tab="prayers"]').click();
      openEdit(item.dataset.id);
    });
  });
}

// ===== SETTINGS =====
function openSettings() {
  document.getElementById('panel-settings').classList.add('open');
  document.getElementById('panel-overlay').classList.remove('hidden');
  updateStorageInfo();
}
function closeSettings() {
  document.getElementById('panel-settings').classList.remove('open');
  document.getElementById('panel-overlay').classList.add('hidden');
}
function updateStorageInfo() {
  const raw = localStorage.getItem(STORAGE_KEY) || '';
  const kb = (new Blob([raw]).size / 1024).toFixed(1);
  const data = getData();
  document.getElementById('storage-info').textContent =
    `기도제목 ${data.prayers.length}개 · 기록 ${data.logs.length}개 · ${kb} KB`;
}

function exportData() {
  const data = getData();
  const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: 1 }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `기도의방_백업_${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('백업 파일이 다운로드되었습니다');
}

async function importData(file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    if (!json.prayers) { showToast('올바른 백업 파일이 아닙니다'); return; }
    if (!confirm(`기도제목 ${json.prayers.length}개를 불러올까요?\n기존 데이터와 병합됩니다.`)) return;
    const current = getData();
    json.prayers.forEach(p => {
      const idx = current.prayers.findIndex(x => x.id === p.id);
      if (idx === -1) current.prayers.push(p); else current.prayers[idx] = p;
    });
    (json.logs || []).forEach(l => {
      const idx = current.logs.findIndex(x => x.id === l.id);
      if (idx === -1) current.logs.push(l); else current.logs[idx] = l;
    });
    saveData(current);
    showToast('복구 완료!');
    closeSettings();
    refreshAll();
  } catch (e) { showToast('불러오기 실패: ' + e.message); }
}

// ===== TOAST =====
let _toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// ===== SCREEN =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {

  // Cover → App
  document.getElementById('btn-enter').addEventListener('click', () => {
    showScreen('screen-app');
    refreshAll();
  });

  // App → Cover (홈 버튼)
  document.getElementById('btn-go-cover').addEventListener('click', () => {
    showScreen('screen-cover');
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'calendar') calendarRefresh();
    });
  });

  // Category filter
  document.getElementById('category-filter').addEventListener('click', e => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    _currentFilter = chip.dataset.cat;
    renderList();
  });

  // New prayer
  document.getElementById('btn-new-prayer').addEventListener('click', openNew);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveModal);
  document.getElementById('modal-prayer').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('btn-delete-prayer').addEventListener('click', () => {
    if (!_editingId) return;
    if (!confirm('이 기도제목을 삭제할까요?')) return;
    deletePrayer(_editingId);
    showToast('삭제되었습니다');
    closeModal(); refreshAll();
  });

  // Log
  document.getElementById('btn-add-log').addEventListener('click', () => {
    const form = document.getElementById('new-log-form');
    const hidden = form.classList.contains('hidden');
    form.classList.toggle('hidden', !hidden);
    if (hidden) { document.getElementById('log-date').value = todayStr(); document.getElementById('log-content').focus(); }
  });
  document.getElementById('btn-save-log').addEventListener('click', saveLog);

  // Settings
  document.getElementById('btn-settings-open').addEventListener('click', openSettings);
  document.getElementById('btn-settings-close').addEventListener('click', closeSettings);
  document.getElementById('panel-overlay').addEventListener('click', closeSettings);
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('import-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (f) await importData(f); e.target.value = '';
  });

  // Calendar nav
  document.getElementById('cal-prev').addEventListener('click', () => {
    _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; } calendarRefresh();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; } calendarRefresh();
  });

  showScreen('screen-cover');
});
