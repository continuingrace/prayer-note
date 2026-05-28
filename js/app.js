// app.js — 앱 진입점, 화면 전환, 탭, 토스트

const App = (() => {

  // ===== SCREEN TRANSITIONS =====
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function showCover() { showScreen('screen-cover'); }
  function showAuth() { showScreen('screen-auth'); }
  function showApp() {
    showScreen('screen-app');
    Prayers.load();
    Calendar.refresh();
  }

  // ===== TOAST =====
  let _toastTimer;
  function toast(msg, duration = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  // ===== TABS =====
  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');

        if (tab === 'calendar') Calendar.refresh();
      });
    });
  }

  // ===== COVER & AUTH =====
  function bindCoverAuth() {
    document.getElementById('btn-enter').addEventListener('click', showAuth);
    document.getElementById('btn-back-cover').addEventListener('click', showCover);

    document.getElementById('switch-to-signup').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('auth-mode-login').classList.add('hidden');
      document.getElementById('auth-mode-signup').classList.remove('hidden');
      clearAuthMessage();
    });

    document.getElementById('switch-to-login').addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('auth-mode-signup').classList.add('hidden');
      document.getElementById('auth-mode-login').classList.remove('hidden');
      clearAuthMessage();
    });

    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const pw = document.getElementById('login-password').value;
      if (!email || !pw) { showAuthMessage('이메일과 비밀번호를 입력해주세요', 'error'); return; }
      try {
        document.getElementById('btn-login').textContent = '로그인 중...';
        await Auth.loginEmail(email, pw);
      } catch (e) {
        showAuthMessage(e.message, 'error');
        document.getElementById('btn-login').textContent = '로그인';
      }
    });

    document.getElementById('btn-signup').addEventListener('click', async () => {
      const email = document.getElementById('signup-email').value.trim();
      const pw = document.getElementById('signup-password').value;
      if (!email || !pw) { showAuthMessage('이메일과 비밀번호를 입력해주세요', 'error'); return; }
      if (pw.length < 8) { showAuthMessage('비밀번호는 8자 이상이어야 합니다', 'error'); return; }
      try {
        document.getElementById('btn-signup').textContent = '처리 중...';
        await Auth.signupEmail(email, pw);
        showAuthMessage('가입 완료! 이메일을 확인해 인증을 완료하세요 📩', 'success');
        document.getElementById('btn-signup').textContent = '회원가입';
      } catch (e) {
        showAuthMessage(e.message, 'error');
        document.getElementById('btn-signup').textContent = '회원가입';
      }
    });

    document.getElementById('btn-google-login').addEventListener('click', async () => {
      try {
        await Auth.loginGoogle();
      } catch (e) {
        showAuthMessage(e.message, 'error');
      }
    });
  }

  function showAuthMessage(msg, type) {
    const el = document.getElementById('auth-message');
    el.textContent = msg;
    el.className = `auth-message ${type}`;
  }

  function clearAuthMessage() {
    const el = document.getElementById('auth-message');
    el.className = 'auth-message hidden';
  }

  // ===== INIT =====
  async function init() {
    bindCoverAuth();
    bindTabs();
    Prayers.bindEvents();
    Calendar.bindEvents();
    Settings.bindEvents();

    const user = await Auth.init();
    if (user) {
      showApp();
    } else {
      showCover();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { showCover, showAuth, showApp, toast };
})();
