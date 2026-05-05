/**
 * πOS Kernel — 核心系統
 * 管理應用程式登錄、事件匯流排、系統狀態、沙盒控制
 */
const OS = (() => {
  const apps      = {};
  const listeners = {};
  const processes = {};
  let pidCounter  = 100;
  let clipboard   = null;

  // 事件匯流排
  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }
  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  // 登錄應用程式（由 app.js 呼叫）
  function registerApp(id, def) {
    // 檢查應用是否在隱藏列表中
    if (typeof AppLoader !== 'undefined' && AppLoader.isHidden && AppLoader.isHidden(id)) {
      def.hidden = true;
    }
    apps[id] = def;
  }

  function getApps() { return apps; }
  function getProcesses() { return { ...processes }; }

  /**
   * 啟動應用程式
   * 啟動前經過 AppLoader 沙盒檢查
   */
  function launch(id, args = {}) {
    const app = apps[id];
    if (!app) { console.warn('[Kernel] 未知應用:', id); return; }

    // 沙盒檢查（AppLoader 初始化後才有效）
    if (typeof AppLoader !== 'undefined') {
      const check = AppLoader.checkLaunch(id, args);
      if (!check.allowed) {
        console.warn(`[Kernel] 阻止啟動 ${id}：${check.reason}`);
        _showSecurityAlert(id, check.reason);
        return;
      }
    }

    const winId = WM.open(app, args);
    const pid = ++pidCounter;
    processes[winId] = {
      pid,
      winId,
      appId: id,
      title: app.title || id,
      args,
      started: Date.now(),
      state: 'running'
    };
    StartMenu.hide();
    emit('app:launch', { id, args, winId, pid });
    emit('process:start', processes[winId]);
    return winId;
  }

  function kill(pidOrWinId) {
    const entry = Object.values(processes).find(p => String(p.pid) === String(pidOrWinId) || p.winId === pidOrWinId);
    if (!entry) return false;
    WM.close(entry.winId);
    return true;
  }

  function notify(title, body = '', opts = {}) {
    const center = document.getElementById('notification-center');
    if (!center) return;
    const toast = document.createElement('div');
    toast.className = 'os-toast';
    toast.innerHTML = `
      <div class="os-toast-title">${escapeHtml(title)}</div>
      ${body ? `<div class="os-toast-body">${escapeHtml(body)}</div>` : ''}
    `;
    toast.onclick = () => toast.remove();
    center.appendChild(toast);
    setTimeout(() => toast.remove(), opts.timeout || 4200);
    emit('system:notify', { title, body });
  }

  async function writeClipboard(data) {
    clipboard = data;
    if (typeof data === 'string' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(data); } catch {}
    }
    emit('clipboard:write', { data });
  }

  async function readClipboard() {
    if (navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) clipboard = text;
      } catch {}
    }
    return clipboard;
  }

  function setSetting(key, value) {
    localStorage.setItem('pios_' + key, JSON.stringify(value));
    emit('setting:change', { key, value });
  }

  function getSetting(key, fallback = null) {
    try {
      const raw = localStorage.getItem('pios_' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }

  function _showSecurityAlert(appId, reason) {
    const msgs = {
      no_background_permission: `應用程式「${appId}」嘗試在背景執行，但未獲授權。`,
      app_not_found:            `找不到應用程式：${appId}`,
    };
    alert('[πOS 安全警告]\n' + (msgs[reason] || `啟動被阻止：${reason}`));
  }

  function shutdown() {
    if (!confirm(i18n.t('system.shutdown') + '?')) return;
    document.body.innerHTML = `
      <div style="background:#000;color:#fff;height:100vh;display:flex;align-items:center;
        justify-content:center;font-size:20px;font-family:sans-serif;flex-direction:column;gap:12px;">
        <img src="../api/logo.svg" width="48" height="48" style="border-radius:10px;opacity:.5">
        <span>已關機。請重新整理頁面以重新啟動。</span>
      </div>`;
  }

  function restart() {
    const bs = document.getElementById('boot-screen');
    bs.style.display = 'flex';
    bs.classList.remove('fade-out');
    document.getElementById('desktop').classList.add('hidden');
    document.getElementById('window-layer').innerHTML = '';
    document.getElementById('taskbar-apps').innerHTML = '';
    setTimeout(() => Boot.start(), 500);
  }

  on('wm:close', ({ id }) => {
    const process = processes[id];
    if (!process) return;
    delete processes[id];
    emit('process:exit', process);
  });
  on('wm:minimize', ({ id }) => { if (processes[id]) processes[id].state = 'minimized'; });
  on('wm:restore', ({ id }) => { if (processes[id]) processes[id].state = 'running'; });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  return { emit, on, registerApp, getApps, getProcesses, launch, kill, notify, writeClipboard, readClipboard, setSetting, getSetting, shutdown, restart };
})();
