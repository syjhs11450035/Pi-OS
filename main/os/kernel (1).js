/**
 * πOS Kernel — 事件匯流排
 * 提供應用程式啟動、事件管理、系統彈窗、關機/重啟
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

  // 註冊應用程式（由 app.js 呼叫）
  function registerApp(id, def) {
    apps[id] = def;
  }

  function getApps() { return apps; }

  /**
   * 啟動應用程式
   * 啟動前交由 AppLoader 進行沙盒權限檢查
   */
  function launch(id, args = {}) {
    const app = apps[id];
    if (!app) { console.warn('[Kernel] 找不到應用:', id); return; }

    if (typeof AppLoader !== 'undefined') {
      const check = AppLoader.checkLaunch(id, args);
      if (!check.allowed) {
        console.warn(`[Kernel] 拒絕啟動 ${id}: ${check.reason}`);
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
      no_background_permission: `應用程式「${appId}」嘗試在背景執行，但沒有此權限。`,
      app_not_found:            `找不到應用程式：${appId}`,
    };
    OS.alert('[πOS 安全警告]\n' + (msgs[reason] || `啟動遭拒：${reason}`));
  }

  // ─── 自訂彈窗系統（取代原生 alert / confirm / prompt）───────────────

  /**
   * OS.alert(message) → Promise<void>
   */
  function alert(message) {
    return new Promise(resolve => {
      _createDialog({
        message,
        buttons: [{ label: '確定', primary: true, resolve: () => resolve() }]
      });
    });
  }

  /**
   * OS.confirm(message) → Promise<boolean>
   */
  function confirm(message) {
    return new Promise(resolve => {
      _createDialog({
        message,
        buttons: [
          { label: '取消', resolve: () => resolve(false) },
          { label: '確定', primary: true, resolve: () => resolve(true) }
        ]
      });
    });
  }

  /**
   * OS.prompt(message, defaultValue) → Promise<string|null>
   */
  function prompt(message, defaultValue = '') {
    return new Promise(resolve => {
      const inputId = 'os-prompt-input-' + Date.now();
      _createDialog({
        message,
        inputId,
        defaultValue,
        buttons: [
          { label: '取消', resolve: () => resolve(null) },
          { label: '確定', primary: true, resolve: () => {
            const el = document.getElementById(inputId);
            resolve(el ? el.value : null);
          }}
        ]
      });
    });
  }

  function _createDialog({ message, buttons, inputId, defaultValue }) {
    // 黑色遮罩
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99999',
      'background:rgba(0,0,0,0.65)',
      'display:flex;align-items:center;justify-content:center',
      'backdrop-filter:blur(4px)',
      'animation:os-fade-in 0.12s ease'
    ].join(';');

    // 彈出視窗
    const box = document.createElement('div');
    box.style.cssText = [
      'background:#1e1e2e',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:10px',
      'box-shadow:0 8px 40px rgba(0,0,0,0.7)',
      'padding:28px 32px 20px',
      'min-width:320px;max-width:480px;width:90%',
      'font-family:Segoe UI,system-ui,sans-serif',
      'color:#eee',
      'animation:os-slide-in 0.15s ease'
    ].join(';');

    // πOS 標題列
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:16px;';
    titleBar.innerHTML = `
      <img src="/api/logo.svg" width="18" height="18" style="border-radius:4px;opacity:.8">
      <span style="font-size:12px;color:#888;letter-spacing:1px;">πOS</span>
    `;

    // 訊息
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:14px;line-height:1.6;white-space:pre-wrap;margin-bottom:20px;';
    msg.textContent = message;

    // 可選輸入框
    let inputEl = null;
    if (inputId) {
      inputEl = document.createElement('input');
      inputEl.id = inputId;
      inputEl.type = 'text';
      inputEl.value = defaultValue;
      inputEl.style.cssText = [
        'width:100%;box-sizing:border-box',
        'padding:7px 10px;margin-bottom:16px',
        'background:rgba(255,255,255,0.06)',
        'border:1px solid rgba(255,255,255,0.2)',
        'border-radius:5px;color:#eee;font-size:13px;outline:none'
      ].join(';');
    }

    // 按鈕列
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    function closeDialog(resolveFn) {
      overlay.style.animation = 'os-fade-out 0.1s ease forwards';
      setTimeout(() => { overlay.remove(); resolveFn(); }, 100);
    }

    buttons.forEach(({ label, primary, resolve: resolveFn }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = [
        'padding:6px 18px;border:none;border-radius:5px',
        'font-size:13px;cursor:pointer',
        primary
          ? 'background:#0078D4;color:#fff;'
          : 'background:rgba(255,255,255,0.08);color:#ccc;'
      ].join(';');
      btn.onmouseover = () => btn.style.opacity = '0.85';
      btn.onmouseout  = () => btn.style.opacity = '1';
      btn.onclick = () => closeDialog(resolveFn);
      btnRow.appendChild(btn);
    });

    box.appendChild(titleBar);
    box.appendChild(msg);
    if (inputEl) box.appendChild(inputEl);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // 按 Enter = 第一個 