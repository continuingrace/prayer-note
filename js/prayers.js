// prayers.js — 기도제목 목록 & 모달

const Prayers = (() => {
  let _prayers = [];
  let _currentFilter = 'all';
  let _editingId = null;

  const CAT_LABELS = {
    personal: '개인', family: '가족', church: '교회',
    nation: '나라', mission: '선교', work: '직장·학업', other: '기타',
  };
  const STATUS_LABELS = {
    ongoing: '기도 중', answered: '응답됨', paused: '잠시 멈춤',
  };

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
  }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  // ===== RENDER LIST =====
  async function load() {
    try {
      _prayers = await DB.getPrayers();
      renderList();
      renderAnswered();
    } catch (e) {
      console.error(e);
    }
  }

  function renderList() {
    const list = document.getElementById('prayer-list');
    const empty = document.getElementById('empty-prayers');
    const filtered = _currentFilter === 'all'
      ? _prayers.filter(p => p.status !== 'answered')
      : _prayers.filter(p => p.category === _currentFilter && p.status !== 'answered');

    // clear existing cards
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
    const answered = _prayers.filter(p => p.status === 'answered');

    Array.from(list.querySelectorAll('.prayer-card')).forEach(el => el.remove());

    if (answered.length === 0) {
      empty.style.display = 'flex';
    } else {
      empty.style.display = 'none';
      answered.forEach(p => list.appendChild(makeCard(p)));
    }
  }

  function makeCard(p) {
    const card = document.createElement('div');
    card.className = 'prayer-card';
    card.dataset.id = p.id;

    const scripture = p.scripture
      ? `<div class="prayer-scripture-line">✦ ${p.scripture}</div>` : '';

    card.innerHTML = `
      <div class="prayer-card-header">
        <div class="prayer-card-title">${p.title}</div>
        <div class="prayer-cat-badge">${CAT_LABELS[p.category] || p.category}</div>
      </div>
      ${p.content ? `<div class="prayer-card-content">${p.content}</div>` : ''}
      ${scripture}
      <div class="prayer-card-footer">
        <span class="prayer-date">${formatDate(p.start_date)}</span>
        <span class="prayer-status ${p.status}">${STATUS_LABELS[p.status] || p.status}</span>
      </div>
    `;

    card.addEventListener('click', () => openEdit(p.id));
    return card;
  }

  // ===== MODAL =====
  function openNew() {
    _editingId = null;
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

  async function openEdit(id) {
    _editingId = id;
    try {
      const p = await DB.getPrayer(id);
      document.getElementById('field-title').value = p.title;
      document.getElementById('field-category').value = p.category;
      document.getElementById('field-status').value = p.status;
      document.getElementById('field-content').value = p.content || '';
      document.getElementById('field-scripture').value = p.scripture || '';
      document.getElementById('field-start-date').value = p.start_date || todayStr();
      document.getElementById('prayer-log-section').classList.remove('hidden');
      document.getElementById('btn-delete-wrap').classList.remove('hidden');
      document.getElementById('new-log-form').classList.add('hidden');

      // logs
      const logs = await DB.getLogs(id);
      renderLogs(logs);

      document.getElementById('modal-prayer').classList.remove('hidden');
    } catch (e) {
      App.toast('불러오기 실패: ' + e.message);
    }
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
        ${log.scripture ? `<div class="log-entry-scripture">✦ ${log.scripture}</div>` : ''}
      `;
      container.appendChild(div);
    });
  }

  function closeModal() {
    document.getElementById('modal-prayer').classList.add('hidden');
    _editingId = null;
  }

  async function save() {
    const title = document.getElementById('field-title').value.trim();
    if (!title) { App.toast('기도제목을 입력해주세요'); return; }

    const data = {
      title,
      category: document.getElementById('field-category').value,
      status: document.getElementById('field-status').value,
      content: document.getElementById('field-content').value.trim(),
      scripture: document.getElementById('field-scripture').value.trim(),
      start_date: document.getElementById('field-start-date').value,
    };

    try {
      if (_editingId) {
        await DB.updatePrayer(_editingId, data);
        App.toast('수정되었습니다');
      } else {
        await DB.createPrayer(data);
        App.toast('기도제목이 추가되었습니다');
      }
      closeModal();
      await load();
      Calendar.refresh();
    } catch (e) {
      App.toast('저장 실패: ' + e.message);
    }
  }

  async function deletePrayer() {
    if (!_editingId) return;
    if (!confirm('이 기도제목을 삭제할까요?')) return;
    try {
      await DB.deletePrayer(_editingId);
      App.toast('삭제되었습니다');
      closeModal();
      await load();
      Calendar.refresh();
    } catch (e) {
      App.toast('삭제 실패: ' + e.message);
    }
  }

  async function saveLog() {
    if (!_editingId) return;
    const content = document.getElementById('log-content').value.trim();
    if (!content) { App.toast('내용을 입력해주세요'); return; }

    const log = {
      prayer_id: _editingId,
      date: document.getElementById('log-date').value || todayStr(),
      content,
      scripture: document.getElementById('log-scripture').value.trim(),
    };

    try {
      await DB.createLog(log);
      document.getElementById('log-content').value = '';
      document.getElementById('log-scripture').value = '';
      document.getElementById('new-log-form').classList.add('hidden');

      const logs = await DB.getLogs(_editingId);
      renderLogs(logs);
      App.toast('기록이 추가되었습니다');
      Calendar.refresh();
    } catch (e) {
      App.toast('저장 실패: ' + e.message);
    }
  }

  // ===== BIND EVENTS =====
  function bindEvents() {
    document.getElementById('btn-new-prayer').addEventListener('click', openNew);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', save);
    document.getElementById('btn-delete-prayer').addEventListener('click', deletePrayer);

    document.getElementById('btn-add-log').addEventListener('click', () => {
      const form = document.getElementById('new-log-form');
      const isHidden = form.classList.contains('hidden');
      form.classList.toggle('hidden', !isHidden);
      if (isHidden) {
        document.getElementById('log-date').value = todayStr();
        document.getElementById('log-content').focus();
      }
    });

    document.getElementById('btn-save-log').addEventListener('click', saveLog);

    // category filter
    document.getElementById('category-filter').addEventListener('click', e => {
      const chip = e.target.closest('.cat-chip');
      if (!chip) return;
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      _currentFilter = chip.dataset.cat;
      renderList();
    });

    // close modal on backdrop
    document.getElementById('modal-prayer').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  function getPrayers() { return _prayers; }

  return { load, bindEvents, openEdit, getPrayers };
})();
