/**
 * πOS Kernel — 核心系統
 * 管理應用程式登錄、事件匯流排、系統狀態、沙盒控制
 */
const OS = (() => {
  const apps      = {};
  const listeners = {};

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
    apps[id] = def;
  }

  function getApps() { return apps; }

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

    WM.open(app, args);
    StartMenu.hide();
    emit('app:launch', { id, args });
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

  return { emit, on, registerApp, getApps, launch, shutdown, restart };
})();
