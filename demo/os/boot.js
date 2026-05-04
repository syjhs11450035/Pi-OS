/**
 * πOS 開機序列
 * 初始化順序：i18n → VFS → AppLoader → Desktop → Clock
 */
const Boot = (() => {
  async function start() {
    const bar = document.querySelector('.boot-bar');
    const msg = document.querySelector('.boot-msg');
    const bootScreen = document.getElementById('boot-screen');

    if (bar) { bar.style.animation = 'none'; bar.style.width = '0'; }

    const steps = [
      {
        key: 'boot.step_kernel',
        fn: async () => {
          // 載入語言（優先讀取使用者設定，預設 zh-tw）
          const lang = localStorage.getItem('pios_lang') || 'zh-tw';
          await i18n.loadSysLang(lang);
        }
      },
      {
        key: 'boot.step_vfs',
        fn: () => VFS.init().then(() => VFS.ensureDefaults())
      },
      {
        key: 'boot.step_apps',
        fn: () => AppLoader.init()
      },
      {
        key: 'boot.step_desktop',
        fn: null
      },
      {
        key: 'boot.step_done',
        fn: null
      },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const text = i18n.t(step.key);
      if (msg) msg.textContent = text;
      if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%';
      if (step.fn) {
        try { await step.fn(); }
        catch (e) { console.error('[Boot] error at step', step.key, e); }
      }
      await sleep(350);
    }

    bootScreen.classList.add('fade-out');
    await sleep(800);
    bootScreen.style.display = 'none';

    document.getElementById('desktop').classList.remove('hidden');

    Desktop.init();
    StartMenu.init();
    Clock.start();

    OS.emit('boot:complete', {});
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  return { start };
})();

// 時鐘
const Clock = (() => {
  function start() { update(); setInterval(update, 1000); }
  function update() {
    const el = document.getElementById('tray-clock');
    if (!el) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const d = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`;
    el.textContent = `${h}:${m}  ${d}`;
  }
  return { start };
})();

// 開始選單
const StartMenu = (() => {
  let visible = false;

  function init() {
    // 更新搜尋框 placeholder
    const inp = document.getElementById('start-search-input');
    if (inp) inp.placeholder = i18n.t('taskbar.search_placeholder');

    // 更新使用者名稱
    const user = document.querySelector('.start-user');
    if (user) user.textContent = i18n.t('taskbar.user');

    // 更新關機/重啟按鈕
    const btns = document.querySelectorAll('.start-footer button');
    if (btns[0]) btns[0].textContent = i18n.t('system.shutdown');
    if (btns[1]) btns[1].textContent = i18n.t('system.restart');

    document.getElementById('desktop').addEventListener('mousedown', e => {
      const menu = document.getElementById('start-menu');
      const btn  = document.getElementById('start-btn');
      if (!menu.contains(e.target) && !btn.contains(e.target)) hide();
    });
    renderApps();
  }

  function toggle() { visible ? hide() : show(); }

  function show() {
    document.getElementById('start-menu').classList.remove('hidden');
    visible = true;
    document.getElementById('start-search-input').focus();
  }

  function hide() {
    document.getElementById('start-menu').classList.add('hidden');
    visible = false;
  }

  function renderApps(filter = '') {
    const container = document.getElementById('start-apps');
    if (!container) return;
    const apps = OS.getApps();
    container.innerHTML = '';
    Object.entries(apps).forEach(([id, app]) => {
      const title = typeof app.title === 'function' ? app.title() : (app.title || id);
      if (filter && !title.toLowerCase().includes(filter.toLowerCase())) return;
      const item = document.createElement('div');
      item.className = 'start-app-item';
      const iconHtml = app.iconSvg
        ? `<span class="app-icon svg-icon">${app.iconSvg}</span>`
        : `<span class="app-icon app-icon-text">${app.iconChar || '?'}</span>`;
      item.innerHTML = `${iconHtml}<span class="app-name">${title}</span>`;
      item.onclick = () => OS.launch(id);
      container.appendChild(item);
    });
  }

  function search(val) { renderApps(val); }

  // 語言切換時重新渲染
  OS.on('i18n:loaded', () => { if (visible) renderApps(); });

  return { init, toggle, show, hide, search };
})();

window.addEventListener('DOMContentLoaded', () => Boot.start());
