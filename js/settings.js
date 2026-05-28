// settings.js — 설정 패널

const Settings = (() => {

  function open() {
    const user = Auth.getUser();
    document.getElementById('settings-user-info').textContent =
      user ? `로그인: ${user.email}` : '로그인 없음';

    document.getElementById('panel-settings').classList.add('open');
    document.getElementById('panel-overlay').classList.remove('hidden');
  }

  function close() {
    document.getElementById('panel-settings').classList.remove('open');
    document.getElementById('panel-overlay').classList.add('hidden');
  }

  async function exportData() {
    try {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `기도의방_백업_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      App.toast('백업 파일이 다운로드되었습니다');
    } catch (e) {
      App.toast('내보내기 실패: ' + e.message);
    }
  }

  async function importData(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json.version || !json.prayers) {
        App.toast('올바른 백업 파일이 아닙니다');
        return;
      }
      if (!confirm(`기도제목 ${json.prayers.length}개를 불러올까요?\n기존 데이터와 병합됩니다.`)) return;

      await DB.importAll(json);
      App.toast('복구 완료!');
      close();
      await Prayers.load();
      await Calendar.refresh();
    } catch (e) {
      App.toast('불러오기 실패: ' + e.message);
    }
  }

  function bindEvents() {
    document.getElementById('btn-settings-open').addEventListener('click', open);
    document.getElementById('btn-settings-close').addEventListener('click', close);
    document.getElementById('panel-overlay').addEventListener('click', close);

    document.getElementById('btn-export').addEventListener('click', exportData);

    document.getElementById('import-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (file) await importData(file);
      e.target.value = ''; // reset
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      if (!confirm('로그아웃 할까요?')) return;
      await Auth.logout();
      close();
    });
  }

  return { open, close, bindEvents };
})();
