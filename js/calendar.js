// calendar.js — 달력 탭

const Calendar = (() => {
  let _year = new Date().getFullYear();
  let _month = new Date().getMonth(); // 0-indexed
  let _allLogs = [];
  let _prayers = [];

  const DOW = ['일','월','화','수','목','금','토'];
  const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d + 'T00:00:00');
    return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
  }

  async function refresh() {
    try {
      _allLogs = await DB.getAllLogs();
      _prayers = Prayers.getPrayers();
      render();
    } catch(e) { console.error(e); }
  }

  function getPrayerDatesForMonth() {
    // collect dates from logs + prayer start_dates
    const dates = new Set();

    // from logs
    _allLogs.forEach(log => {
      if (log.date) dates.add(log.date);
    });

    // from prayer start_dates
    _prayers.forEach(p => {
      if (p.start_date) dates.add(p.start_date);
    });

    return dates;
  }

  function render() {
    document.getElementById('cal-month-label').textContent = `${_year}년 ${MONTH_KO[_month]}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Day-of-week headers
    DOW.forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });

    const prayerDates = getPrayerDatesForMonth();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // First day of month
    const firstDay = new Date(_year, _month, 1).getDay();
    const daysInMonth = new Date(_year, _month + 1, 0).getDate();
    const daysInPrev = new Date(_year, _month, 0).getDate();

    // prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const el = document.createElement('div');
      el.className = 'cal-day other-month';
      el.textContent = daysInPrev - i;
      grid.appendChild(el);
    }

    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${_year}-${String(_month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const el = document.createElement('div');
      el.className = 'cal-day';
      el.textContent = d;

      if (dateStr === todayStr) el.classList.add('today');
      if (prayerDates.has(dateStr)) el.classList.add('has-prayer');

      el.addEventListener('click', () => selectDay(dateStr, el));
      grid.appendChild(el);
    }

    // next month padding
    const total = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remaining; d++) {
      const el = document.createElement('div');
      el.className = 'cal-day other-month';
      el.textContent = d;
      grid.appendChild(el);
    }
  }

  function selectDay(dateStr, el) {
    // deselect all
    document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');

    const detail = document.getElementById('cal-day-detail');

    // find prayers started on this date
    const startedPrayers = _prayers.filter(p => p.start_date === dateStr);
    // find logs on this date
    const logsOnDay = _allLogs.filter(log => log.date === dateStr);

    if (startedPrayers.length === 0 && logsOnDay.length === 0) {
      detail.innerHTML = `<div class="cal-detail-date">${formatDate(dateStr)}</div><p class="cal-detail-hint">이 날의 기도 기록이 없어요</p>`;
      return;
    }

    let html = `<div class="cal-detail-date">${formatDate(dateStr)}</div>`;

    startedPrayers.forEach(p => {
      html += `
        <div class="cal-detail-item" data-id="${p.id}">
          <div class="cal-detail-item-title">🙏 ${p.title} <small style="color:var(--text-muted)">시작</small></div>
          ${p.content ? `<div class="cal-detail-item-content">${p.content.substring(0,60)}...</div>` : ''}
        </div>
      `;
    });

    logsOnDay.forEach(log => {
      const prayerTitle = log.prayers?.title || '기도';
      html += `
        <div class="cal-detail-item" data-id="${log.prayer_id}">
          <div class="cal-detail-item-title">${prayerTitle}</div>
          ${log.content ? `<div class="cal-detail-item-content">${log.content.substring(0,80)}</div>` : ''}
          ${log.scripture ? `<div class="log-entry-scripture" style="font-size:12px;color:var(--scripture);margin-top:4px">✦ ${log.scripture}</div>` : ''}
        </div>
      `;
    });

    detail.innerHTML = html;

    // click to open prayer
    detail.querySelectorAll('.cal-detail-item[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelector('[data-tab="prayers"]').click();
        Prayers.openEdit(item.dataset.id);
      });
    });
  }

  function bindEvents() {
    document.getElementById('cal-prev').addEventListener('click', () => {
      _month--;
      if (_month < 0) { _month = 11; _year--; }
      render();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      _month++;
      if (_month > 11) { _month = 0; _year++; }
      render();
    });
  }

  return { refresh, bindEvents, render };
})();
