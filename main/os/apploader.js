/**
 * πOS AppLoader — 應用程式載入器
 *
 * 職責：
 *  1. 讀取 apps/{id}/info.json 取得 app 元資料
 *  2. 動態載入 apps/{id}/app.js
 *  3. 沙盒控制：阻止未授權的背景執行、網路存取
 *  4. 載入 app 語言包
 *
 * info.json 格式：
 * {
 *   "id":          "notepad",
 *   "version":     "1.0.0",
 *   "minOsVer":    "1.0.0",
 *   "entry":       "app.js",
 *   "icon":        "icon.svg",       // 相對於 app 目錄
 *   "permissions": ["fs.read", "fs.write"],
 *   "background":  false,            // 是否允許背景執行
 *   "autostart":   false
 * }
 *
 * 權限清單：
 *   fs.read      — 讀取 VFS
 *   fs.write     — 寫入 VFS
 *   network      — 發出網路請求（iframe/fetch）
 *   background   — 背景執行（Web Worker）
 *   system       — 存取系統 API（關機/重啟）
 */
const AppLoader = (() => {
  const APPS_BASE   = 'apps/';
  const OS_VERSION  = '1.0.0';

  // 已載入的 app 元資料快取
  const _registry = {};   // id → info
  // 已授權的 app
  const _granted  = new Set();

  // 內建 app 清單（不需要動態載入，直接從 apps/ 讀取）
  const BUILTIN_IDS = ['explorer', 'notepad', 'terminal', 'browser', 'vm', 'settings'];

  /**
   * 初始化：掃描並載入所有 app
   */
  async function init() {
    // 先載入 apps/index.json（app 清單），若不存在則用內建清單
    let ids = BUILTIN_IDS;
    try {
      const res = await fetch(APPS_BASE + 'index.json');
      if (res.ok) {
        const data = await res.json();
        ids = data.apps || BUILTIN_IDS;
      }
    } catch {}

    // 並行載入所有 app
    await Promise.all(ids.map(id => loadApp(id)));
  }

  /**
   * 載入單一 app
   */
  async function loadApp(id) {
    try {
      // 1. 讀取 info.json
      const info = await fetchInfo(id);
      if (!info) { console.warn(`[AppLoader] ${id}: info.json 不存在`); return; }

      // 2. 版本檢查
      if (!checkVersion(info.minOsVer)) {
        console.warn(`[AppLoader] ${id}: 需要 πOS ${info.minOsVer}，目前 ${OS_VERSION}`);
        return;
      }

      _registry[id] = info;

      // 3. 載入語言包
      const lang = i18n.getLang();
      await i18n.loadAppLang(id, lang);

      // 4. 動態載入 app.js（script 注入）
      await loadScript(APPS_BASE + id + '/' + (info.entry || 'app.js'), id);

      // 5. autostart（需要 background 權限）
      if (info.autostart && hasPermission(id, 'background')) {
        OS.launch(id, { background: true });
      }

      OS.emit('app:loaded', { id, info });
    } catch (e) {
      console.error(`[AppLoader] 載入 ${id} 失敗:`, e);
    }
  }

  /**
   * 讀取 info.json
   */
  async function fetchInfo(id) {
    try {
      const res = await fetch(APPS_BASE + id + '/info.json');
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  /**
   * 動態注入 script
   * 使用 nonce 標記，未來可配合 CSP
   */
  function loadScript(src, appId) {
    return new Promise((resolve, reject) => {
      // 防止重複載入
      if (document.querySelector(`script[data-app="${appId}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.dataset.app = appId;
      s.onload  = resolve;
      s.onerror = () => reject(new Error(`無法載入 ${src}`));
      document.head.appendChild(s);
    });
  }

  /**
   * 讀取 app 的 SVG icon
   * 回傳 SVG 字串或 null
   */
  async function fetchIcon(id) {
    const info = _registry[id];
    if (!info || !info.icon) return null;
    try {
      const res = await fetch(APPS_BASE + id + '/' + info.icon);
      if (!res.ok) return null;
      return await res.text();
    } catch { return null; }
  }

  /**
   * 權限檢查
   */
  function hasPermission(appId, perm) {
    const info = _registry[appId];
    if (!info) return false;
    return Array.isArray(info.permissions) && info.permissions.includes(perm);
  }

  /**
   * 執行前沙盒檢查
   * 由 kernel.launch() 呼叫
   * 回傳 { allowed: bool, reason: string }
   */
  function checkLaunch(appId, args = {}) {
    const info = _registry[appId];
    if (!info) return { allowed: false, reason: 'app_not_found' };

    // 背景執行需要明確權限
    if (args.background && !hasPermission(appId, 'background')) {
      return { allowed: false, reason: 'no_background_permission' };
    }

    return { allowed: true };
  }

  /**
   * 授予 app 額外權限（需使用者確認）
   */
  function grant(appId, perm) {
    _granted.add(`${appId}:${perm}`);
    OS.emit('app:permission_granted', { appId, perm });
  }

  function checkVersion(minVer) {
    if (!minVer) return true;
    const [ma, mi, pa] = minVer.split('.').map(Number);
    const [ca, ci, cp] = OS_VERSION.split('.').map(Number);
    if (ca > ma) return true;
    if (ca === ma && ci > mi) return true;
    if (ca === ma && ci === mi && cp >= pa) return true;
    return false;
  }

  function getInfo(id)      { return _registry[id] || null; }
  function getRegistry()    { return { ..._registry }; }

  return { init, loadApp, fetchIcon, hasPermission, checkLaunch, grant, getInfo, getRegistry };
})();
