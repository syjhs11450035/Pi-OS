/**
 * πOS 檔案總管 — Windows 風格，完整導航、上傳/下載、雙擊執行
 */
const FileIcons = {
  dir:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h3.172a2 2 0 0 1 1.414.586l1.828 1.828A2 2 0 0 0 12.828 8H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  img:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  zip:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
  exe:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  txt:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
};

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','svg','webp','bmp'].includes(ext)) return FileIcons.img;
  if (['js','ts','css','html','json','py','sh','c','cpp','rs','java'].includes(ext)) return FileIcons.code;
  if (['zip','tar','gz','7z','rar'].includes(ext)) return FileIcons.zip;
  if (['exe','com','msi','bin'].includes(ext)) return FileIcons.exe;
  if (['txt','md','log','ini','cfg'].includes(ext)) return FileIcons.txt;
  return FileIcons.file;
}

// 副檔名 → 開啟方式
function openFile(item) {
  const ext = item.name.split('.').pop().toLowerCase();
  if (['txt','md','js','ts','css','html','json','log','sh','py','c','cpp','rs','java','ini','cfg'].includes(ext)) {
    OS.launch('notepad', { path: item.path });
  } else if (['exe','com','bin'].includes(ext)) {
    if (confirm(`以虛擬機執行「${item.name}」？`)) OS.launch('vm', { file: item.path });
  } else if (['png','jpg','jpeg','gif','svg','webp','bmp'].includes(ext)) {
    _showImageViewer(item);
  } else {
    alert(`無法開啟：${item.name}\n（不支援的檔案類型）`);
  }
}

function _showImageViewer(item) {
  VFS.readBinary(item.path).then(buf => {
    const blob = new Blob([buf]);
    const url  = URL.createObjectURL(blob);
    const win  = WM.open({
      id: '_imgview', title: item.name, iconChar: 'IMG',
      iconSvg: FileIcons.img, width: 600, height: 480,
      render(body) {
        body.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden;';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
        body.appendChild(img);
      },
      onClose() { URL.revokeObjectURL(url); }
    });
  }).catch(() => alert('無法讀取圖片'));
}

OS.registerApp('explorer', {
  id: 'explorer',
  get title() { return i18n.t('app:explorer.title') || '檔案總管'; },
  iconChar: 'EX',
  iconSvg: FileIcons.dir,
  width: 820,
  height: 540,

  render(body, args, winId) {
    let currentPath = args.path || '/';
    let selectedItems = [];
    const navHistory = [currentPath];
    let histIdx = 0;

    body.innerHTML = `
      <div class="explorer-wrap" style="display:flex;flex-direction:column;height:100%;">
        <!-- 工具列 -->
        <div class="exp-toolbar" style="display:flex;align-items:center;gap:4px;padding:5px 8px;border-bottom:1px solid var(--border);flex-shrink:0;background:rgba(0,0,0,.2);">
          <button class="exp-btn" id="exp-back-${winId}"    title="上一頁"  onclick="_exp_${winId}.goBack()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="10 3 5 8 10 13"/></svg>
          </button>
          <button class="exp-btn" id="exp-fwd-${winId}"     title="下一頁"  onclick="_exp_${winId}.goForward()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="6 3 11 8 6 13"/></svg>
          </button>
          <button class="exp-btn"                            title="上層目錄" onclick="_exp_${winId}.goUp()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="4 10 8 5 12 10"/></svg>
          </button>
          <button class="exp-btn"                            title="重新整理" onclick="_exp_${winId}.refresh()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="1 4 1 10 7 10"/><path d="M3.5 14.5a7 7 0 1 0 .5-7.5"/></svg>
          </button>
          <!-- 路徑麵包屑 + 輸入 -->
          <div id="exp-pathbar-${winId}" style="flex:1;display:flex;align-items:center;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:0 8px;min-height:26px;cursor:text;" onclick="_exp_${winId}.editPath()">
            <span id="exp-breadcrumb-${winId}" style="font-size:12px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;"></span>
            <input id="exp-pathinput-${winId}" type="text" style="display:none;flex:1;background:transparent;border:none;outline:none;color:#eee;font-size:12px;"
              onblur="_exp_${winId}.commitPath()" onkeydown="if(event.key==='Enter')_exp_${winId}.commitPath();if(event.key==='Escape')_exp_${winId}.cancelPath()">
          </div>
          <!-- 搜尋 -->
          <input id="exp-search-${winId}" type="text" placeholder="搜尋..." style="width:120px;padding:3px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.3);color:#eee;font-size:12px;outline:none;"
            oninput="_exp_${winId}.search(this.value)">
          <!-- 上傳 -->
          <button class="exp-btn" title="上傳檔案" onclick="_exp_${winId}.uploadFile()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="8 1 8 10"/><polyline points="4 5 8 1 12 5"/><path d="M2 12v2h12v-2"/></svg>
          </button>
          <button class="exp-btn" title="新增資料夾" onclick="_exp_${winId}.newFolder()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 4a1 1 0 0 1 1-1h3.172a1 1 0 0 1 .707.293L7.293 4.7A1 1 0 0 0 8 5h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4z"/><line x1="10" y1="8" x2="10" y2="12"/><line x1="8" y1="10" x2="12" y2="10"/></svg>
          </button>
          <button class="exp-btn" title="新增檔案" onclick="_exp_${winId}.newFile()">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z"/><polyline points="9 2 9 6 13 6"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="6" y1="11" x2="10" y2="11"/></svg>
          </button>
        </div>
        <!-- 主體 -->
        <div style="display:flex;flex:1;overflow:hidden;">
          <!-- 側邊欄 -->
          <div class="explorer-sidebar" id="exp-sidebar-${winId}" style="width:150px;flex-shrink:0;border-right:1px solid var(--border);padding:8px;overflow-y:auto;"></div>
          <!-- 檔案區 -->
          <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
            <div class="explorer-files" id="exp-files-${winId}" style="flex:1;overflow-y:auto;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;"></div>
            <!-- 狀態列 -->
            <div id="exp-status-${winId}" style="padding:3px 10px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border);flex-shrink:0;"></div>
          </div>
        </div>
      </div>
      <!-- 隱藏 file input -->
      <input type="file" id="exp-fileinput-${winId}" multiple style="display:none" onchange="_exp_${winId}.handleUpload(this)">
    `;

    // 注入樣式
    if (!document.getElementById('exp-style')) {
      const s = document.createElement('style');
      s.id = 'exp-style';
      s.textContent = `.exp-btn{padding:4px 7px;border:none;border-radius:4px;background:transparent;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;}.exp-btn:hover{background:rgba(255,255,255,.1);}.exp-btn:disabled{opacity:.3;cursor:default;}`;
      document.head.appendChild(s);
    }

    const sidebar = [
      { label: '桌面',   key: 'dir',  path: '/Desktop'   },
      { label: '文件',   key: 'txt',  path: '/Documents' },
      { label: '下載',   key: 'zip',  path: '/Downloads' },
      { label: '圖片',   key: 'img',  path: '/Pictures'  },
      { label: '根目錄', key: 'dir',  path: '/'          },
    ];

    function renderSidebar() {
      const el = document.getElementById(`exp-sidebar-${winId}`);
      if (!el) return;
      el.innerHTML = sidebar.map(s => `
        <div class="explorer-sidebar-item ${currentPath === s.path ? 'active' : ''}"
          onclick="_exp_${winId}.navigate('${s.path}')">
          <span class="svg-icon" style="width:14px;height:14px;color:#60b0ff">${FileIcons[s.key]}</span>
          <span style="font-size:12px">${s.label}</span>
        </div>
      `).join('');
    }

    function renderBreadcrumb() {
      const el = document.getElementById(`exp-breadcrumb-${winId}`);
      if (!el) return;
      const parts = currentPath === '/' ? [''] : currentPath.split('/');
      el.innerHTML = parts.map((p, i) => {
        const path = parts.slice(0, i + 1).join('/') || '/';
        const label = p || '根目錄';
        return `<span style="cursor:pointer;color:#aaa;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='#aaa'" onclick="event.stopPropagation();_exp_${winId}.navigate('${path}')">${label}</span><span style="color:#555;margin:0 3px">/</span>`;
      }).join('');
    }

    let searchFilter = '';

    async function renderFiles() {
      const el = document.getElementById(`exp-files-${winId}`);
      const statusEl = document.getElementById(`exp-status-${winId}`);
      if (!el) return;
      el.innerHTML = `<div style="color:#555;font-size:12px;padding:8px">載入中...</div>`;
      renderBreadcrumb();
      renderSidebar();
      updateNavBtns();

      try {
        let items = await VFS.listDir(currentPath);
        if (searchFilter) items = items.filter(i => i.name.toLowerCase().includes(searchFilter.toLowerCase()));
        el.innerHTML = '';
        if (!items.length) {
          el.innerHTML = `<div style="color:#555;font-size:12px;padding:8px">${searchFilter ? '無符合結果' : '（空資料夾）'}</div>`;
          if (statusEl) statusEl.textContent = '0 個項目';
          return;
        }
        items.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name, 'zh-TW');
          return a.type === 'dir' ? -1 : 1;
        });
        items.forEach(item => {
          const iconSvg = item.type === 'dir' ? FileIcons.dir : getFileIcon(item.name);
          const div = document.createElement('div');
          div.className = 'file-item';
          div.dataset.path = item.path;
          div.innerHTML = `
            <div class="fi-icon svg-icon" style="color:${item.type==='dir'?'#60b0ff':'#a0c8ff'}">${iconSvg}</div>
            <div class="fi-name">${item.name}</div>
          `;
          div.addEventListener('click', e => {
            if (!e.ctrlKey) {
              document.querySelectorAll(`#exp-files-${winId} .file-item`).forEach(d => d.classList.remove('selected'));
              selectedItems = [];
            }
            div.classList.toggle('selected');
            if (div.classList.contains('selected')) selectedItems.push(item);
            else selectedItems = selectedItems.filter(i => i.path !== item.path);
            if (statusEl) statusEl.textContent = selectedItems.length ? `已選取 ${selectedItems.length} 個項目` : `${items.length} 個項目`;
          });
          div.addEventListener('dblclick', () => {
            if (item.type === 'dir') navigate(item.path);
            else openFile(item);
          });
          div.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (!div.classList.contains('selected')) {
              document.querySelectorAll(`#exp-files-${winId} .file-item`).forEach(d => d.classList.remove('selected'));
              selectedItems = [item];
              div.classList.add('selected');
            }
            showItemContextMenu(e.clientX, e.clientY, item);
          });
          el.appendChild(div);
        });
        if (statusEl) statusEl.textContent = `${items.length} 個項目`;
      } catch (e) {
        el.innerHTML = `<div style="color:#f44;font-size:12px;padding:8px">錯誤：${e.message}</div>`;
      }
    }

    function showItemContextMenu(x, y, item) {
      const isDir = item.type === 'dir';
      Desktop.showContextMenu(x, y, [
        { label: '開啟',     action: () => isDir ? navigate(item.path) : openFile(item) },
        ...(isDir ? [] : [{ label: '下載到本機', action: () => downloadItem(item) }]),
        { sep: true },
        { label: '複製',     action: () => _clipboard = { op:'copy', items: [...selectedItems] } },
        { label: '剪下',     action: () => _clipboard = { op:'cut',  items: [...selectedItems] } },
        { label: '貼上',     action: () => pasteItems() },
        { sep: true },
        { label: '重新命名', action: () => renameItem(item) },
        { label: '刪除',     action: () => deleteSelected() },
        { sep: true },
        { label: '內容',     action: () => showInfo(item) },
      ]);
    }

    let _clipboard = null;

    async function pasteItems() {
      if (!_clipboard) return;
      for (const item of _clipboard.items) {
        const dest = currentPath + (currentPath.endsWith('/') ? '' : '/') + item.name;
        try {
          if (item.type === 'file') {
            const content = await VFS.readFile(item.path);
            await VFS.writeFile(dest, content);
            if (_clipboard.op === 'cut') await VFS.remove(item.path);
          } else {
            await VFS.mkdir(dest);
          }
        } catch (e) { alert('貼上失敗：' + e.message); }
      }
      if (_clipboard.op === 'cut') _clipboard = null;
      renderFiles();
    }

    function navigate(path) {
      if (path === currentPath) return;
      navHistory.splice(histIdx + 1);
      navHistory.push(path);
      histIdx = navHistory.length - 1;
      currentPath = path;
      selectedItems = [];
      searchFilter = '';
      const si = document.getElementById(`exp-search-${winId}`);
      if (si) si.value = '';
      renderFiles();
    }

    function updateNavBtns() {
      const back = document.getElementById(`exp-back-${winId}`);
      const fwd  = document.getElementById(`exp-fwd-${winId}`);
      if (back) back.disabled = histIdx <= 0;
      if (fwd)  fwd.disabled  = histIdx >= navHistory.length - 1;
    }

    async function renameItem(item) {
      const newName = prompt('新名稱：', item.name);
      if (!newName || newName === item.name) return;
      const newPath = (item.parent.endsWith('/') ? item.parent : item.parent + '/') + newName;
      try { await VFS.rename(item.path, newPath); renderFiles(); }
      catch (e) { alert('重新命名失敗：' + e.message); }
    }

    async function deleteSelected() {
      if (!selectedItems.length) return;
      if (!confirm(`確定要刪除 ${selectedItems.length} 個項目？`)) return;
      for (const item of selectedItems) {
        try { await VFS.remove(item.path); } catch (e) { alert('刪除失敗：' + e.message); }
      }
      selectedItems = [];
      renderFiles();
    }

    function showInfo(item) {
      const size = item.size ? `${item.size} bytes` : '—';
      const mod  = item.modified ? new Date(item.modified).toLocaleString() : '—';
      alert(`名稱：${item.name}\n路徑：${item.path}\n類型：${item.type === 'dir' ? '資料夾' : '檔案'}\n大小：${size}\n修改時間：${mod}`);
    }

    async function downloadItem(item) {
      try {
        let blob;
        if (item.encoding === 'base64') {
          const buf = await VFS.readBinary(item.path);
          blob = new Blob([buf]);
        } else {
          const content = await VFS.readFile(item.path);
          blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = item.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } catch (e) { alert('下載失敗：' + e.message); }
    }

    async function handleUpload(input) {
      const files = Array.from(input.files);
      for (const file of files) {
        const path = currentPath + (currentPath.endsWith('/') ? '' : '/') + file.name;
        const buf = await file.arrayBuffer();
        const isText = file.type.startsWith('text/') || /\.(txt|md|js|ts|css|html|json|sh|py|c|cpp|rs|java|log|ini|cfg)$/i.test(file.name);
        if (isText) {
          const text = await file.text();
          await VFS.writeFile(path, text);
        } else {
          await VFS.writeBinary(path, buf);
        }
      }
      input.value = '';
      renderFiles();
    }

    // 桌面右鍵（空白處）
    document.getElementById(`exp-files-${winId}`).addEventListener('contextmenu', e => {
      if (e.target.closest('.file-item')) return;
      e.preventDefault();
      Desktop.showContextMenu(e.clientX, e.clientY, [
        { label: '新增資料夾', action: () => window[`_exp_${winId}`].newFolder() },
        { label: '新增文字檔', action: () => window[`_exp_${winId}`].newFile()   },
        { label: '上傳檔案',   action: () => window[`_exp_${winId}`].uploadFile() },
        { sep: true },
        { label: '貼上',       action: () => pasteItems() },
        { sep: true },
        { label: '重新整理',   action: () => renderFiles() },
      ]);
    });

    window[`_exp_${winId}`] = {
      navigate,
      goBack() {
        if (histIdx > 0) { histIdx--; currentPath = navHistory[histIdx]; selectedItems = []; renderFiles(); }
      },
      goForward() {
        if (histIdx < navHistory.length - 1) { histIdx++; currentPath = navHistory[histIdx]; selectedItems = []; renderFiles(); }
      },
      goUp() {
        if (currentPath === '/') return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        navigate(parts.length ? '/' + parts.join('/') : '/');
      },
      refresh() { renderFiles(); },
      search(val) { searchFilter = val; renderFiles(); },
      editPath() {
        const bc = document.getElementById(`exp-breadcrumb-${winId}`);
        const inp = document.getElementById(`exp-pathinput-${winId}`);
        if (!bc || !inp) return;
        bc.style.display = 'none';
        inp.style.display = 'block';
        inp.value = currentPath;
        inp.focus(); inp.select();
      },
      commitPath() {
        const bc = document.getElementById(`exp-breadcrumb-${winId}`);
        const inp = document.getElementById(`exp-pathinput-${winId}`);
        if (!bc || !inp) return;
        bc.style.display = '';
        inp.style.display = 'none';
        const val = inp.value.trim();
        if (val && val !== currentPath) navigate(val);
      },
      cancelPath() {
        const bc = document.getElementById(`exp-breadcrumb-${winId}`);
        const inp = document.getElementById(`exp-pathinput-${winId}`);
        if (bc) bc.style.display = '';
        if (inp) inp.style.display = 'none';
      },
      async newFolder() {
        const name = prompt('資料夾名稱：');
        if (!name) return;
        await VFS.mkdir(currentPath + (currentPath.endsWith('/') ? '' : '/') + name);
        renderFiles();
      },
      async newFile() {
        const name = prompt('檔案名稱：', '新文字檔.txt');
        if (!name) return;
        const path = currentPath + (currentPath.endsWith('/') ? '' : '/') + name;
        await VFS.writeFile(path, '');
        renderFiles();
        OS.launch('notepad', { path });
      },
      uploadFile() {
        document.getElementById(`exp-fileinput-${winId}`).click();
      },
      handleUpload,
    };

    renderFiles();
    OS.on('fs:change', () => { if (document.getElementById(`exp-files-${winId}`)) renderFiles(); });
  },

  onClose(winId) { delete window[`_exp_${winId}`]; }
});
