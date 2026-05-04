/**
 * πOS 記事本
 */
const _notepadIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

OS.registerApp('notepad', {
  id: 'notepad',
  title: '記事本',
  iconChar: 'NP',
  iconSvg: _notepadIcon,
  width: 600,
  height: 450,

  render(body, args, winId) {
    let currentPath = args.path || null;
    let modified = false;
    let autoSaveTimer = null;

    body.innerHTML = `
      <div class="notepad-wrap">
        <div class="notepad-menubar">
          <button onclick="_np_${winId}.fileMenu()">檔案</button>
          <button onclick="_np_${winId}.editMenu()">編輯</button>
          <button onclick="_np_${winId}.viewMenu()">檢視</button>
        </div>
        <textarea class="notepad-editor" id="np-editor-${winId}" spellcheck="false" placeholder="在此輸入文字..."></textarea>
        <div class="notepad-statusbar" id="np-status-${winId}">就緒 | UTF-8</div>
      </div>
    `;

    const editor = document.getElementById(`np-editor-${winId}`);
    const status  = document.getElementById(`np-status-${winId}`);

    function updateStatus() {
      const chars  = editor.value.length;
      const pos    = editor.selectionStart;
      const lineNum = editor.value.substring(0, pos).split('\n').length;
      status.textContent = `行 ${lineNum}，字元 ${chars} | UTF-8${modified ? ' [已修改]' : ''}`;
    }

    editor.addEventListener('input', () => {
      modified = true;
      updateStatus();
      scheduleAutoSave();
    });
    editor.addEventListener('keyup',  updateStatus);
    editor.addEventListener('click',  updateStatus);

    editor.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); save(); }
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); newFile(); }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); openFile(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = editor.selectionStart, en = editor.selectionEnd;
        editor.value = editor.value.substring(0, s) + '    ' + editor.value.substring(en);
        editor.selectionStart = editor.selectionEnd = s + 4;
      }
    });

    async function loadFile(path) {
      try {
        const content = await VFS.readFile(path);
        editor.value = content;
        currentPath = path;
        modified = false;
        const win = WM.getWindow(winId);
        if (win) win.el.querySelector('.win-title').textContent = path.split('/').pop() + ' — 記事本';
        updateStatus();
      } catch (e) { alert('無法開啟檔案：' + e.message); }
    }

    async function save() {
      if (!currentPath) return saveAs();
      try {
        await VFS.writeFile(currentPath, editor.value);
        modified = false;
        updateStatus();
      } catch (e) { alert('儲存失敗：' + e.message); }
    }

    function scheduleAutoSave() {
      if (localStorage.getItem('pios_auto_save') === '0' || !currentPath) return;
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        if (modified) save();
      }, 800);
    }

    async function saveAs() {
      const path = prompt('儲存路徑：', currentPath || '/Documents/未命名.txt');
      if (!path) return;
      currentPath = path;
      await save();
    }

    function newFile() {
      if (modified && !confirm('有未儲存的變更，確定要新增？')) return;
      editor.value = '';
      currentPath = null;
      modified = false;
      const win = WM.getWindow(winId);
      if (win) win.el.querySelector('.win-title').textContent = '未命名 — 記事本';
      updateStatus();
    }

    async function openFile() {
      const path = prompt('開啟路徑：', '/Documents/');
      if (!path) return;
      await loadFile(path);
    }

    window[`_np_${winId}`] = {
      fileMenu() {
        Desktop.showContextMenu(100, 60, [
          { label: '新增 (Ctrl+N)',    action: newFile  },
          { label: '開啟 (Ctrl+O)',    action: openFile },
          { sep: true },
          { label: '儲存 (Ctrl+S)',    action: save     },
          { label: '另存新檔',         action: saveAs   },
          { sep: true },
          { label: '關閉',             action: () => WM.close(winId) },
        ]);
      },
      editMenu() {
        Desktop.showContextMenu(150, 60, [
          { label: '復原 (Ctrl+Z)', action: () => document.execCommand('undo') },
          { sep: true },
          { label: '剪下',          action: () => document.execCommand('cut')   },
          { label: '複製',          action: () => document.execCommand('copy')  },
          { label: '貼上',          action: () => document.execCommand('paste') },
          { sep: true },
          { label: '全選',          action: () => editor.select() },
        ]);
      },
      viewMenu() {
        Desktop.showContextMenu(200, 60, [
          { label: '字型大小 +', action: () => { const s = parseFloat(getComputedStyle(editor).fontSize); editor.style.fontSize = (s + 1) + 'px'; } },
          { label: '字型大小 -', action: () => { const s = parseFloat(getComputedStyle(editor).fontSize); editor.style.fontSize = Math.max(8, s - 1) + 'px'; } },
          { sep: true },
          { label: '深色模式', action: () => editor.style.background = '#0c0c0c' },
          { label: '淺色模式', action: () => { editor.style.background = '#fff'; editor.style.color = '#111'; } },
        ]);
      },
      cleanup() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
      }
    };

    if (currentPath) loadFile(currentPath);
    updateStatus();
  },

  onClose(winId) {
    if (window[`_np_${winId}`] && window[`_np_${winId}`].cleanup) window[`_np_${winId}`].cleanup();
    delete window[`_np_${winId}`];
  }
});
