/**
 * πOS 視窗管理器
 */
const WM = (() => {
  let zCounter = 200;
  const windows = {};
  let winIdCounter = 0;
  const CASCADE_OFFSET = 24;

  function open(app, args = {}) {
    const id = 'win-' + (++winIdCounter);
    const el = document.createElement('div');
    el.className = 'os-window';
    el.id = id;

    const w = app.width  || 700;
    const h = app.height || 480;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - 48;
    const cascade = (winIdCounter - 1) * CASCADE_OFFSET;
    const left = Math.max(0, Math.min(80 + cascade, maxW - w));
    const top  = Math.max(0, Math.min(40 + cascade, maxH - h));

    el.style.cssText = `width:${w}px;height:${h}px;left:${left}px;top:${top}px;z-index:${++zCounter}`;

    // 標題列圖示：優先用 SVG，否則用文字
    const titleIcon = app.iconSvg
      ? `<span class="win-icon svg-icon">${app.iconSvg}</span>`
      : `<span class="win-icon win-icon-text">${app.iconChar || ''}</span>`;

    el.innerHTML = `
      <div class="win-titlebar" data-winid="${id}">
        ${titleIcon}
        <span class="win-title">${app.title || '視窗'}</span>
        <div class="win-controls">
          <button class="win-btn minimize" title="${i18n.t('wm.minimize')}" onclick="WM.minimize('${id}')">
            <svg viewBox="0 0 10 1" width="10" height="1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button class="win-btn maximize" title="${i18n.t('wm.maximize')}" onclick="WM.toggleMaximize('${id}')">
            <svg viewBox="0 0 10 10" width="10" height="10"><rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button class="win-btn close" title="${i18n.t('wm.close')}" onclick="WM.close('${id}')">
            <svg viewBox="0 0 10 10" width="10" height="10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.4"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.4"/></svg>
          </button>
        </div>
      </div>
      <div class="win-body" id="${id}-body"></div>
      <div class="win-resize" data-winid="${id}"></div>
    `;

    document.getElementById('window-layer').appendChild(el);

    const state = { id, app, maximized: false, minimized: false, prevRect: null };
    windows[id] = { el, app, state };

    const body = document.getElementById(id + '-body');
    if (app.render) app.render(body, args, id);

    bindDrag(el.querySelector('.win-titlebar'), el, state);
    bindResize(el.querySelector('.win-resize'), el, state);
    el.addEventListener('mousedown', () => focus(id));

    addTaskbarBtn(id, app);
    focus(id);

    OS.emit('wm:open', { id, app });
    return id;
  }

  function focus(id) {
    const win = windows[id];
    if (!win) return;
    Object.values(windows).forEach(w => w.el.classList.remove('focused'));
    win.el.classList.add('focused');
    win.el.style.zIndex = ++zCounter;
    document.querySelectorAll('.taskbar-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tbtn-' + id);
    if (btn) btn.classList.add('active');
  }

  function close(id) {
    const win = windows[id];
    if (!win) return;
    if (win.app.onClose) win.app.onClose(id);
    win.el.remove();
    const btn = document.getElementById('tbtn-' + id);
    if (btn) btn.remove();
    delete windows[id];
    OS.emit('wm:close', { id });
  }

  function minimize(id) {
    const win = windows[id];
    if (!win) return;
    win.state.minimized = true;
    win.el.classList.add('minimized');
    const btn = document.getElementById('tbtn-' + id);
    if (btn) btn.classList.remove('active');
    OS.emit('wm:minimize', { id });
  }

  function restore(id) {
    const win = windows[id];
    if (!win) return;
    win.state.minimized = false;
    win.el.classList.remove('minimized');
    focus(id);
    OS.emit('wm:restore', { id });
  }

  function toggleMaximize(id) {
    const win = windows[id];
    if (!win) return;
    const el = win.el;
    if (win.state.maximized) {
      const r = win.state.prevRect;
      el.style.left = r.left; el.style.top = r.top;
      el.style.width = r.width; el.style.height = r.height;
      el.classList.remove('maximized');
      win.state.maximized = false;
    } else {
      win.state.prevRect = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      el.classList.add('maximized');
      win.state.maximized = true;
    }
    focus(id);
  }

  function addTaskbarBtn(id, app) {
    const btn = document.createElement('button');
    btn.className = 'taskbar-btn';
    btn.id = 'tbtn-' + id;
    const iconHtml = app.iconSvg
      ? `<span class="svg-icon taskbar-btn-icon">${app.iconSvg}</span>`
      : `<span class="taskbar-btn-icon-text">${app.iconChar || ''}</span>`;
    btn.innerHTML = `${iconHtml}<span>${app.title || '視窗'}</span>`;
    btn.onclick = () => {
      const win = windows[id];
      if (!win) return;
      if (win.state.minimized) restore(id);
      else if (win.el.classList.contains('focused')) minimize(id);
      else focus(id);
    };
    document.getElementById('taskbar-apps').appendChild(btn);
  }

  function bindDrag(handle, el, state) {
    let ox, oy, dragging = false;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('.win-btn')) return;
      if (state.maximized) return;
      dragging = true;
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const maxW = window.innerWidth - el.offsetWidth;
      const maxH = window.innerHeight - 48 - el.offsetHeight;
      el.style.left = Math.max(0, Math.min(e.clientX - ox, maxW)) + 'px';
      el.style.top  = Math.max(0, Math.min(e.clientY - oy, maxH)) + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
    handle.addEventListener('dblclick', e => {
      if (e.target.closest('.win-btn')) return;
      toggleMaximize(state.id);
    });
  }

  function bindResize(handle, el, state) {
    let resizing = false, sx, sy, sw, sh;
    handle.addEventListener('mousedown', e => {
      if (state.maximized) return;
      resizing = true;
      sx = e.clientX; sy = e.clientY;
      sw = el.offsetWidth; sh = el.offsetHeight;
      e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!resizing) return;
      el.style.width  = Math.max(300, sw + e.clientX - sx) + 'px';
      el.style.height = Math.max(200, sh + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', () => { resizing = false; });
  }

  function getWindow(id) { return windows[id]; }
  function getAllWindows() { return windows; }

  return { open, close, focus, minimize, restore, toggleMaximize, getWindow, getAllWindows };
})();
