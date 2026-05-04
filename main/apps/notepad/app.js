/**
 * πOS Notepad v2
 * 真檔案、真自動儲存、系統剪貼簿、下載匯出。
 */
const _notepadIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;

PiOS.app.register('notepad', {
  id: 'notepad',
  title: '記事本',
  iconChar: 'NP',
  iconSvg: _notepadIcon,
  width: 720,
  height: 520,

  render(body, args, winId) {
    let currentPath = args.path || '';
    let savedText = '';
    let autoSaveTimer = null;

    body.innerHTML = `
      <div class="notepad-wrap">
        <div class="notepad-menubar">
          <button id="np-new-${winId}">新增</button>
          <button id="np-open-${winId}">開啟</button>
          <button id="np-save-${winId}">儲存</button>
          <button id="np-saveas-${winId}">另存</button>
          <button id="np-export-${winId}">下載</button>
          <span style="width:1px;height:20px;background:var(--border);margin:0 4px"></span>
          <button id="np-copy-${winId}">複製</button>
          <button id="np-paste-${winId}">貼上</button>
          <button id="np-select-${winId}">全選</button>
          <input id="np-path-${winId}" value="${escapeAttr(currentPath || '/Documents/未命名.txt')}" style="flex:1;min-width:180px;padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:rgba(0,0,0,.35);color:var(--text);font-size:12px;outline:none;">
        </div>
        <textarea class="notepad-editor" id="np-editor-${winId}" spellcheck="false" placeholder="在此輸入文字..."></textarea>
        <div class="notepad-statusbar" id="np-status-${winId}">就緒</div>
      </div>
    `;

    const editor = document.getElementById(`np-editor-${winId}`);
    const status = document.getElementById(`np-status-${winId}`);
    const pathInput = document.getElementById(`np-path-${winId}`);

    function setStatus(text) { status.textContent = text; }
    function isModified() { return editor.value !== savedText; }
    function updateTitle() {
      const win = PiOS.window.get(winId);
      const name = currentPath ? currentPath.split('/').pop() : '未命名';
      if (win) win.el.querySelector('.win-title').textContent = `${name}${isModified() ? ' *' : ''} — 記事本`;
    }
    function updateStatus() {
      const pos = editor.selectionStart;
      const line = editor.value.slice(0, pos).split('\n').length;
      setStatus(`行 ${line} · ${editor.value.length} 字元 · UTF-8${isModified() ? ' · 已修改' : ''}${currentPath ? ` · ${currentPath}` : ''}`);
      updateTitle();
    }

    async function load(path) {
      try {
        const item = await PiOS.fs.get(path);
        if (!item || item.type !== 'file') throw new Error('路徑不是檔案');
        const text = await PiOS.fs.readText(path);
        currentPath = path;
        pathInput.value = path;
        editor.value = text;
        savedText = text;
        updateStatus();
        PiOS.ui.notify('記事本', `已開啟 ${path}`);
      } catch (e) {
        PiOS.ui.notify('開啟失敗', e.message);
      }
    }

    async function save(path = pathInput.value.trim()) {
      if (!path) return;
      try {
        await PiOS.fs.writeText(path, editor.value);
        currentPath = path;
        pathInput.value = path;
        savedText = editor.value;
        updateStatus();
        PiOS.ui.notify('記事本', `已儲存 ${path}`);
      } catch (e) {
        PiOS.ui.notify('儲存失敗', e.message);
      }
    }

    function scheduleAutoSave() {
      if (localStorage.getItem('pios_auto_save') === '0' || !currentPath) return;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => save(currentPath), 900);
    }

    function ensureCanDiscard() {
      return !isModified() || confirm('目前檔案尚未儲存，確定要繼續？');
    }

    document.getElementById(`np-new-${winId}`).onclick = () => {
      if (!ensureCanDiscard()) return;
      currentPath = '';
      pathInput.value = '/Documents/未命名.txt';
      editor.value = '';
      savedText = '';
      updateStatus();
    };
    document.getElementById(`np-open-${winId}`).onclick = () => load(pathInput.value.trim());
    document.getElementById(`np-save-${winId}`).onclick = () => save();
    document.getElementById(`np-saveas-${winId}`).onclick = () => {
      const path = prompt('另存路徑：', pathInput.value || '/Documents/未命名.txt');
      if (path) save(path);
    };
    document.getElementById(`np-export-${winId}`).onclick = () => {
      const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (currentPath || 'untitled.txt').split('/').pop();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    };
    document.getElementById(`np-copy-${winId}`).onclick = () => PiOS.clipboard.write(editor.value.slice(editor.selectionStart, editor.selectionEnd) || editor.value);
    document.getElementById(`np-paste-${winId}`).onclick = async () => {
      const data = await PiOS.clipboard.read();
      if (typeof data !== 'string') return;
      editor.setRangeText(data, editor.selectionStart, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input'));
    };
    document.getElementById(`np-select-${winId}`).onclick = () => editor.select();

    editor.addEventListener('input', () => { updateStatus(); scheduleAutoSave(); });
    editor.addEventListener('keyup', updateStatus);
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); load(pathInput.value.trim()); }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') { e.preventDefault(); document.getElementById(`np-new-${winId}`).click(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
      }
    });

    if (currentPath) load(currentPath);
    else updateStatus();

    window[`_np_${winId}`] = { cleanup() { clearTimeout(autoSaveTimer); } };
  },

  onClose(winId) {
    window[`_np_${winId}`]?.cleanup?.();
    delete window[`_np_${winId}`];
  }
});

function escapeAttr(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
