/**
 * WebOS 虛擬檔案系統 (VFS)
 * 使用 IndexedDB 持久化儲存，模擬完整目錄樹
 */
const VFS = (() => {
  const DB_NAME = 'WebOS_FS';
  const DB_VER = 1;
  const STORE = 'files';
  let db = null;

  // 初始化 IndexedDB
  async function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const store = d.createObjectStore(STORE, { keyPath: 'path' });
          store.createIndex('parent', 'parent', { unique: false });
        }
      };
      req.onsuccess = e => { db = e.target.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  // 確保預設目錄存在
  async function ensureDefaults() {
    const defaults = [
      { path: '/', name: '/', type: 'dir', parent: null },
      { path: '/Desktop', name: 'Desktop', type: 'dir', parent: '/' },
      { path: '/Documents', name: 'Documents', type: 'dir', parent: '/' },
      { path: '/Downloads', name: 'Downloads', type: 'dir', parent: '/' },
      { path: '/System', name: 'System', type: 'dir', parent: '/' },
      { path: '/Documents/歡迎.txt', name: '歡迎.txt', type: 'file', parent: '/Documents',
        content: '歡迎使用 WebOS！\n\n這是一個在瀏覽器中運行的模擬作業系統。\n\n功能：\n- 虛擬檔案系統（IndexedDB 持久化）\n- 視窗管理器（拖曳、縮放、最大化）\n- 記事本、檔案總管、終端機\n- x86 虛擬機（可執行真實 Linux）\n\n祝使用愉快！', size: 0, modified: Date.now() },
    ];
    for (const item of defaults) {
      const exists = await get(item.path);
      if (!exists) await put(item);
    }
  }

  function tx(mode) {
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function get(path) {
    return new Promise((res, rej) => {
      const req = tx('readonly').get(path);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  }

  function put(item) {
    return new Promise((res, rej) => {
      const req = tx('readwrite').put(item);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  function del(path) {
    return new Promise((res, rej) => {
      const req = tx('readwrite').delete(path);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  }

  function listDir(parent) {
    return new Promise((res, rej) => {
      const idx = tx('readonly').index('parent');
      const req = idx.getAll(parent);
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  }

  // 公開 API
  async function readFile(path) {
    const f = await get(path);
    if (!f || f.type !== 'file') throw new Error('檔案不存在: ' + path);
    return f.content || '';
  }

  async function writeFile(path, content) {
    const parts = path.split('/');
    const name = parts.pop();
    const parent = parts.join('/') || '/';
    const existing = await get(path);
    await put({
      path, name, type: 'file', parent,
      content,
      size: (content || '').length,
      modified: Date.now(),
      created: existing ? existing.created : Date.now()
    });
    OS.emit('fs:change', { path, type: 'write' });
  }

  async function mkdir(path) {
    const parts = path.split('/');
    const name = parts.pop();
    const parent = parts.join('/') || '/';
    await put({ path, name, type: 'dir', parent, created: Date.now(), modified: Date.now() });
    OS.emit('fs:change', { path, type: 'mkdir' });
  }

  async function remove(path) {
    const item = await get(path);
    if (!item) return;
    if (item.type === 'dir') {
      const children = await listDir(path);
      for (const c of children) await remove(c.path);
    }
    await del(path);
    OS.emit('fs:change', { path, type: 'delete' });
  }

  async function rename(oldPath, newPath) {
    const item = await get(oldPath);
    if (!item) throw new Error('不存在: ' + oldPath);
    const parts = newPath.split('/');
    const name = parts.pop();
    const parent = parts.join('/') || '/';
    await put({ ...item, path: newPath, name, parent });
    if (item.type === 'dir') {
      await renameChildren(oldPath, newPath);
    }
    await del(oldPath);
    OS.emit('fs:change', { path: newPath, type: 'rename' });
  }

  async function renameChildren(oldParent, newParent) {
    const children = await listDir(oldParent);
    for (const child of children) {
      const childNewPath = newParent + child.path.slice(oldParent.length);
      await put({ ...child, path: childNewPath, parent: newParent });
      if (child.type === 'dir') {
        await renameChildren(child.path, childNewPath);
      }
      await del(child.path);
    }
  }

  async function exists(path) {
    return !!(await get(path));
  }

  // 寫入二進位（ArrayBuffer → base64）
  async function writeBinary(path, buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    const parts = path.split('/');
    const name = parts.pop();
    const parent = parts.join('/') || '/';
    await put({ path, name, type: 'file', parent, content: b64, encoding: 'base64', size: buffer.byteLength, modified: Date.now() });
    OS.emit('fs:change', { path, type: 'write' });
  }

  async function readBinary(path) {
    const f = await get(path);
    if (!f) throw new Error('不存在: ' + path);
    if (f.encoding === 'base64') {
      const binary = atob(f.content);
      const buf = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
      return buf.buffer;
    }
    return new TextEncoder().encode(f.content || '').buffer;
  }

  return { init, ensureDefaults, readFile, writeFile, mkdir, remove, rename, exists, listDir, readBinary, writeBinary, get };
})();
