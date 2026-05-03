/**
 * πOS 桌面管理
 * - 圖示同步 /Desktop VFS 資料夾
 * - 可拖動、自動換行
 * - 圖示背景色（來自 app info.json 的 iconBg，預設半透明）
 * - 完整右鍵選單（含上傳）
 */
const Desktop = (() => {
  // 內建 app SVG 圖示
  const icons = {
    explorer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h3.172a2 2 0 0 1 1.414.586l1.828 1.828A2 2 0 0 0 12.828 8H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`,
    notepad:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    browser:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    vm:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  };

  // 內建 app 圖示背景色
  const iconBg = {
    explorer: 'rgba(0,100,200,.5)',
    notepad:  'rgba(0,140,120,.5)',
    terminal: 'rgba(20,20,20,.8)',
    browser:  'rgba(0,80,180,.5)',
    vm:       'rgba(80,0,160,.5)',
    settings: 'rgba(60,60,80,.6)',
  };

  const builtinApps = [
    { label: '檔案總管', iconKey: 'explorer', appId: 'explorer' },
    { label: '記事本',   iconKey: 'notepad',  appId: 'notepad'  },
    { label: '終端機',   iconKey: 'terminal', appId: 'terminal' },
    { label: '瀏覽器',   iconKey: 'browser',  appId: 'browser'  },
    { label: '虛擬機',   iconKey: 'vm',       appId: 'vm'       },
    { label: '設定',     iconKey: 'settings', appId: 'settings' },
  ];

  // 圖示位置儲存
  function loadPositions() {
    try { return JSON.parse(localStorage.getItem('pios_icon_pos') || '{}'); } catch { return {}; }
  }
  function savePositions(pos) {
    localStorage.setItem('pios_icon_pos', JSON.stringify(pos));
  }

  function init() {
    renderIcons();
    bindContextMenu();
    // 監聽 /Desktop 資料夾變更
    OS.on('fs:change', ({ path }) => {
      if (path && path.startsWith('/Desktop')) renderIcons();
    });
  }

  async function renderIcons() {
    const container = document.getElementById('desktop-icons');
    container.innerHTML = '';
    const positions = loadPositions();

    // 1. 內建 app 圖示
    for (const item of builtinApps) {
      const el = createAppIcon(item, positions);
      container.appendChild(el);
    }

    // 2. /Desktop 資料夾內容（同步）
    try {
      const files = await VFS.listDir('/Desktop');
      for (const file of files) {
        const el = createFileIcon(file, positions);
        container.appendChild(el);
      }
    } catch {}
  }

  function createAppIcon(item, positions) {
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.dataset.id = 'app:' + item.appId;
    const bg = iconBg[item.iconKey] || 'rgba(40,40,60,.6)';
    el.innerHTML = `
      <div class="icon-img" style="background:${bg};border-radius:10px;padding:6px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#fff;">
        <span class="svg-icon" style="width:28px;height:28px;">${icons[item.iconKey] || ''}</span>
      </div>
      <div class="icon-label">${item.label}</div>
    `;
    el.addEventListener('dblclick', () => OS.launch(item.appId));
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        { label: `開啟 ${item.label}`, action: () => OS.launch(item.appId) },
        { sep: true },
        { label: '釘選到工作列', action: () => {} },
      ]);
    });
    applyDrag(el, positions);
    return el;
  }

  function createFileIcon(file, positions) {
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.dataset.id = 'file:' + file.path;
    const isDir = file.type === 'dir';
    const iconSvg = isDir
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h3.172a2 2 0 0 1 1.414.586l1.828 1.828A2 2 0 0 0 12.828 8H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`
      : getDesktopFileIcon(file.name);
    const bg = isDir ? 'rgba(0,100,200,.4)' : 'rgba(30,30,50,.7)';
    el.innerHTML = `
      <div class="icon-img" style="background:${bg};border-radius:10px;padding:6px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#a0c8ff;">
        <span class="svg-icon" style="width:28px;height:28px;">${iconSvg}</span>
      </div>
      <div class="icon-label">${file.name}</div>
    `;
    el.addEventListener('dblclick', () => {
      if (isDir) OS.launch('explorer', { path: file.path });
      else openDesktopFile(file);
    });
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        { label: '開啟',     action: () => isDir ? OS.launch('explorer', { path: file.path }) : openDesktopFile(file) },
        { label: '下載',     action: () => downloadDesktopFile(file) },
        { sep: true },
        { label: '重新命名', action: () => renameDesktopFile(file) },
        { label: '刪除',     action: () => deleteDesktopFile(file) },
        { sep: true },
        { label: '內容',     action: () => showFileInfo(file) },
      ]);
    });
    applyDrag(el, positions);
    return el;
  }

  function getDesktopFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','gif','svg','webp'].includes(ext))
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    if (['js','ts','py','sh','html','css','json'].includes(ext))
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    if (['exe','com','bin'].includes(ext))
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  }

  function openDesktopFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['txt','md','js','ts','css','html','json','log','sh','py','c','cpp','rs'].includes(ext)) {
      OS.launch('notepad', { path: file.path });
    } else if (['exe','com','bin'].includes(ext)) {
      if (confirm(`以虛擬機執行「${file.name}」？`)) OS.launch('vm', { file: file.path });
    } else {
      OS.launch('explorer', { path: '/Desktop' });
    }
  }

  async function downloadDesktopFile(file) {
    try {
      let blob;
      if (file.encoding === 'base64') {
        const buf = await VFS.readBinary(file.path);
        blob = new Blob([buf]);
      } else {
        const content = await VFS.readFile(file.path);
        blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { alert('下載失敗：' + e.message); }
  }

  async function renameDesktopFile(file) {
    const newName = prompt('新名稱：', file.name);
    if (!newName || newName === file.name) return;
    try { await VFS.rename(file.path, '/Desktop/' + newName); }
    catch (e) { alert('重新命名失敗：' + e.message); }
  }

  async function deleteDesktopFile(file) {
    if (!confirm(`確定要刪除「${file.name}」？`)) return;
    try { await VFS.remove(file.path); }
    catch (e) { alert('刪除失敗：' + e.message); }
  }

  function showFileInfo(file) {
    const size = file.size ? `${file.size} bytes` : '—';
    const mod  = file.modified ? new Date(file.modified).toLocaleString() : '—';
    alert(`名稱：${file.name}\n路徑：${file.path}\n類型：${file.type === 'dir' ? '資料夾' : '檔案'}\n大小：${size}\n修改時間：${mod}`);
  }

  // 圖示拖動
  function applyDrag(el, positions) {
    const id = el.dataset.id;
    // 還原位置
    if (positions[id]) {
      el.style.position = 'absolute';
      el.style.left = positions[id].x + 'px';
      el.style.top  = positions[id].y + 'px';
    }

    let dragging = false, ox, oy, startX, startY;
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      dragging = false;
      startX = e.clientX; startY = e.clientY;
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;

      const onMove = mv => {
        if (!dragging && (Math.abs(mv.clientX - startX) > 4 || Math.abs(mv.clientY - startY) > 4)) {
          dragging = true;
          el.style.position = 'absolute';
          el.style.zIndex = '50';
          el.classList.add('dragging');
        }
        if (dragging) {
          const container = document.getElementById('desktop-icons');
          const rect = container.getBoundingClientRect();
          el.style.left = Math.max(0, mv.clientX - ox - rect.left) + 'px';
          el.style.top  = Math.max(0, Math.min(mv.clientY - oy - rect.top, window.innerHeight - 100)) + 'px';
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (dragging) {
          el.style.zIndex = '';
          el.classList.remove('dragging');
          const pos = loadPositions();
          pos[id] = { x: parseInt(el.style.left), y: parseInt(el.style.top) };
          savePositions(pos);
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function bindContextMenu() {
    const desktop = document.getElementById('desktop');
    desktop.addEventListener('contextmenu', e => {
      if (e.target.closest('.desktop-icon') || e.target.closest('#taskbar') ||
          e.target.closest('.os-window')    || e.target.closest('#start-menu')) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: '重新整理',   action: () => renderIcons() },
        { sep: true },
        { label: '新增資料夾', action: () => newFolder() },
        { label: '新增文字檔', action: () => newTextFile() },
        { label: '上傳檔案',   action: () => uploadToDesktop() },
        { sep: true },
        { label: '開啟檔案總管', action: () => OS.launch('explorer', { path: '/Desktop' }) },
        { label: '顯示設定',     action: () => OS.launch('settings') },
      ]);
    });

    document.addEventListener('mousedown', e => {
      const menu = document.getElementById('context-menu');
      if (!menu.contains(e.target)) hideContextMenu();
    });
  }

  function showContextMenu(x, y, items) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';
    menu.classList.remove('hidden');
    items.forEach(item => {
      if (item.sep) {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        menu.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = 'ctx-item';
        el.textContent = item.label;
        el.onclick = () => { hideContextMenu(); item.action(); };
        menu.appendChild(el);
      }
    });
    const mw = 200, mh = items.length * 34;
    const cx = x + mw > window.innerWidth  ? x - mw : x;
    const cy = y + mh > window.innerHeight ? y - mh : y;
    menu.style.left = cx + 'px';
    menu.style.top  = cy + 'px';
  }

  function hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
  }

  async function newFolder() {
    const name = prompt('資料夾名稱：');
    if (!name) return;
    await VFS.mkdir('/Desktop/' + name);
  }

  async function newTextFile() {
    const name = prompt('檔案名稱（含副檔名）：', '新文字檔.txt');
    if (!name) return;
    await VFS.writeFile('/Desktop/' + name, '');
    OS.launch('notepad', { path: '/Desktop/' + name });
  }

  function uploadToDesktop() {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = async () => {
      for (const file of Array.from(input.files)) {
        const path = '/Desktop/' + file.name;
        const buf = await file.arrayBuffer();
        const isText = file.type.startsWith('text/') || /\.(txt|md|js|ts|css|html|json|sh|py|c|cpp|rs|java|log|ini|cfg)$/i.test(file.name);
        if (isText) { const text = await file.text(); await VFS.writeFile(path, text); }
        else await VFS.writeBinary(path, buf);
      }
    };
    input.click();
  }

  function getIcon(key) {
    return `<span class="svg-icon">${icons[key] || icons.notepad}</span>`;
  }

  return { init, showContextMenu, hideContextMenu, getIcon, renderIcons };
})();
