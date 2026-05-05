/**
 * πOS Kernel — 核心系統
 * 管理應用程式、事件匯流排、系統對話框、關機/重啟
 */
const OS = (() => {
  const apps       = {};
  const listeners  = {};
  const processes  = {};
  let pidCounter   = 100;
  let clipboard    = null;

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
  function getProcesses() { return { ...processes }; }

  /**
   * 啟動應用程式
   * 啟動前經過 AppLoader 沙盒權限檢查
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
      no_background_permission: `應用程式「${appId}」嘗試在背景執行，但沒有此權限。`,
      app_not_found:            `找不到應用程式：${appId}`,
    };
    alert('[πOS 安全警告]\n' + (msgs[reason] || `啟動被阻止：${reason}`));
  }

  // ─── 自訂對話框系統（取代 alert / confirm / prompt）───────────────

  /**
   * OS.alert(message) → Promise<void>
   */
  window.OS_alert = function(message) {
    return new Promise(resolve => {
      _createDialog({
        message,
        buttons: [{ label: '確定', primary: true, resolve: () => resolve() }]
      });
    });
  };

  /**
   * OS.confirm(message) → Promise<boolean>
   */
  window.OS_confirm = function(message) {
    return new Promise(resolve => {
      _createDialog({
        message,
        buttons: [
          { label: '取消', resolve: () => resolve(false) },
          { label: '確定', primary: true, resolve: () => resolve(true) }
        ]
      });
    });
  };

  /**
   * OS.prompt(message, defaultValue) → Promise<string|null>
   */
  window.OS_prompt = function(message, defaultValue = '') {
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
  };

  function _createDialog({ message, buttons, inputId, defaultValue }) {
    // 黑色遮罩
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99999',
      'background:rgba(0,0,0,0.7)',
      'display:flex;align-items:center;justify-content:center',
      'backdrop-filter:blur(8px)',
      'animation:os-fade-in 0.12s ease'
    ].join(';');

    // 彈出視窗（Windows 風格）
    const box = document.createElement('div');
    box.style.cssText = [
      'background:#1e1e2e',
      'border:1px solid rgba(255,255,255,0.15)',
      'border-radius:10px',
      'box-shadow:0 12px 50px rgba(0,0,0,0.8)',
      'padding:24px 28px 20px',
      'min-width:360px;max-width:500px;width:92%',
      'font-family:Segoe UI,system-ui,sans-serif',
      'color:#eee',
      'animation:os-slide-in 0.18s cubic-bezier(0.2,0.9,0.3,1)'
    ].join(';');

    // πOS 標題列
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);';
    titleBar.innerHTML = `
      <img src="/api/logo.svg" width="20" height="20" style="border-radius:5px;opacity:.85">
      <span style="font-size:13px;color:#aaa;font-weight:500;letter-spacing:0.5px;">πOS</span>
    `;

    // 訊息
    const msg = document.createElement('div');
    msg.style.cssText = 'font-size:14.5px;line-height:1.7;white-space:pre-wrap;margin-bottom:24px;color:#ddd;';
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
        'padding:9px 12px;margin-bottom:20px',
        'background:rgba(255,255,255,0.08)',
        'border:1px solid rgba(255,255,255,0.25)',
        'border-radius:6px;color:#eee;font-size:14px;outline:none',
        'transition:border-color 0.15s,background 0.15s'
      ].join(';');
      inputEl.onfocus = () => {
        inputEl.style.borderColor = 'rgba(0,120,212,0.6)';
        inputEl.style.background = 'rgba(255,255,255,0.12)';
      };
      inputEl.onblur = () => {
        inputEl.style.borderColor = 'rgba(255,255,255,0.25)';
        inputEl.style.background = 'rgba(255,255,255,0.08)';
      };
    }

    // 按鈕列
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;';

    function closeDialog(resolveFn) {
      overlay.style.animation = 'os-fade-out 0.12s ease forwards';
      box.style.animation = 'os-slide-out 0.12s ease forwards';
      setTimeout(() => { overlay.remove(); resolveFn(); }, 120);
    }

    buttons.forEach(({ label, primary, resolve: resolveFn }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = [
        'padding:8px 22px;border:none;border-radius:6px',
        'font-size:13.5px;font-weight:500;cursor:pointer',
        'transition:all 0.15s',
        primary
          ? 'background:#0078D4;color:#fff;box-shadow:0 2px 8px rgba(0,120,212,0.4);'
          : 'background:rgba(255,255,255,0.10);color:#ccc;'
      ].join(';');
      btn.onmouseover = () => btn.style.opacity = primary ? '0.9' : '0.8';
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

    // 按 Enter = 第一個 primary 按鈕
    if (inputEl) {
      inputEl.focus();
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const primaryBtn = buttons.find(b => b.primary);
          if (primaryBtn) closeDialog(primaryBtn.resolve);
        }
      });
    }

    // 按 Escape = 第一個非 primary 按鈕
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const cancelBtn = buttons.find(b => !b.primary) || buttons[0];
        closeDialog(cancelBtn.resolve);
      }
    });
  }

  // ─── 關機與重啟 ───────────────────────────────────────────────────

  async function shutdown() {
    if (!(await OS_confirm(i18n.t('system.shutdown') + '?'))) return;
    document.body.innerHTML = `
      <div style="background:#000;color:#888;height:100vh;display:flex;align-items:center;
        justify-content:center;font-size:18px;font-family:Segoe UI,sans-serif;flex-direction:column;gap:20px;">
        <img src="/api/logo.svg" width="56" height="56" style="border-radius:12px;opacity:0.4;">
        <span>已關機</span>
        <button onclick="location.reload()" style="margin-top:12px;padding:10px 24px;background:#0078D4;
          border:none;border-radius:6px;color:#fff;font-size:15px;cursor:pointer;">立即開機</button>
      </div>`;
  }

  function restart() {
    location.reload();
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
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'": '&#39;' }[c]));
  }

  // CSS 動畫（插入 <style> 標籤）
  if (!document.getElementById('os-dialog-animations')) {
    const style = document.createElement('style');
    style.id = 'os-dialog-animations';
    style.textContent = `
      @keyframes os-fade-in { from { opacity:0; } to { opacity:1; } }
      @keyframes os-fade-out { from { opacity:1; } to { opacity:0; } }
      @keyframes os-slide-in { from { transform:translateY(-20px) scale(0.95); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
      @keyframes os-slide-out { from { transform:translateY(0) scale(1); opacity:1; } to { transform:translateY(10px) scale(0.98); opacity:0; } }
    `;
    document.head.appendChild(style);
  }

  return { emit, on, registerApp, getApps, getProcesses, launch, kill, notify, writeClipboard, readClipboard, setSetting, getSetting, shutdown, restart };
})();

// 將自訂對話框掛載到全域，方便舊程式碼使用
window.alert = window.OS_alert;
window.confirm = window.OS_confirm;
window.prompt = window.OS_prompt;
