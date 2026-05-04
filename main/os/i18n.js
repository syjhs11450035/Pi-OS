/**
 * πOS 多語言系統 (i18n)
 *
 * 優先順序：
 *   1. os/lang/{lang}.json  (擴充語言包，使用者安裝)
 *   2. 內建 JSON (fetch 失敗時 fallback)
 *   3. en (最終 fallback)
 *
 * 用法：
 *   i18n.t('boot.step_kernel')          → "初始化核心..."
 *   i18n.t('desktop.open')              → "開啟"
 *   i18n.t('app:explorer.menu.file')    → 從 app 語言包取值
 */
const i18n = (() => {
  // 內建語言包（同步 fallback，避免網路失敗時 UI 空白）
  const BUILTIN = {
    'en': null,     // 由 fetch 載入
    'zh-tw': null,
    'zh-cn': null,
  };

  let _sys  = {};   // 系統語言包（已合併）
  let _apps = {};   // { appId: { strings } }
  let _lang = 'zh-tw';
  let _fallback = {};  // en fallback

  // 深度取值：'boot.step_kernel' → obj.boot.step_kernel
  function _get(obj, key) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  /**
   * 載入系統語言包
   * 先嘗試 os/lang/{lang}.json（擴充包），
   * 失敗則用內建 BUILTIN[lang]
   */
  async function loadSysLang(lang) {
    _lang = lang;

    // 載入 en fallback
    if (!_fallback || Object.keys(_fallback).length === 0) {
      _fallback = await _fetchLang('en') || _getBuiltinEn();
    }

    // 載入目標語言
    const loaded = await _fetchLang(lang);
    _sys = loaded || _getBuiltinByLang(lang) || _fallback;

    // 儲存偏好
    localStorage.setItem('pios_lang', lang);
    OS.emit('i18n:loaded', { lang });
  }

  async function _fetchLang(lang) {
    try {
      const res = await fetch(`os/lang/${lang}.json`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  // 載入 app 語言包
  // 路徑：apps/{appId}/{lang}.json
  // fallback：apps/{appId}/en.json
  async function loadAppLang(appId, lang) {
    const loaded = await _fetchAppLang(appId, lang)
                || await _fetchAppLang(appId, 'en')
                || {};
    _apps[appId] = loaded;
  }

  async function _fetchAppLang(appId, lang) {
    try {
      const res = await fetch(`apps/${appId}/${lang}.json`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  /**
   * 翻譯函式
   * key 格式：
   *   'section.key'           → 系統語言包
   *   'app:appId.section.key' → app 語言包
   */
  function t(key, vars = {}) {
    let val;

    if (key.startsWith('app:')) {
      // app 語言包
      const rest  = key.slice(4);
      const dot   = rest.indexOf('.');
      const appId = rest.substring(0, dot);
      const aKey  = rest.substring(dot + 1);
      val = _get(_apps[appId] || {}, aKey);
    } else {
      // 系統語言包
      val = _get(_sys, key) ?? _get(_fallback, key) ?? key;
    }

    if (val === undefined) return key;

    // 變數替換：{name} → vars.name
    return String(val).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }

  function getLang()  { return _lang; }
  function getLangs() { return ['en', 'zh-tw', 'zh-cn']; }

  // 內建 en fallback（硬編碼，確保離線也能用）
  function _getBuiltinEn() {
    return {
      system:  { name:'πOS', shutdown:'Shut Down', restart:'Restart', loading:'Loading...', booting:'Starting...', welcome:'Welcome to πOS' },
      boot:    { step_kernel:'Initializing kernel...', step_vfs:'Mounting VFS...', step_desktop:'Loading desktop...', step_apps:'Starting services...', step_done:'Welcome to πOS' },
      desktop: { new_folder:'New Folder', new_file:'New Text File', refresh:'Refresh', display_settings:'Display Settings', open:'Open', pin_taskbar:'Pin to Taskbar', folder_name_prompt:'Folder name:', file_name_prompt:'File name:' },
      taskbar: { search_placeholder:'Search apps...', user:'User' },
      wm:      { minimize:'Minimize', maximize:'Maximize', restore:'Restore', close:'Close' },
      ctx:     { open:'Open', rename:'Rename', delete:'Delete', info:'Properties', refresh:'Refresh', new_folder:'New Folder', new_file:'New Text File', display_settings:'Display Settings', pin_taskbar:'Pin to Taskbar' },
    };
  }

  function _getBuiltinByLang(lang) {
    if (lang === 'zh-tw') return {
      system:  { name:'πOS', shutdown:'關機', restart:'重新啟動', loading:'載入中...', booting:'正在啟動...', welcome:'歡迎使用 πOS' },
      boot:    { step_kernel:'初始化核心...', step_vfs:'掛載虛擬檔案系統...', step_desktop:'載入桌面環境...', step_apps:'啟動應用程式服務...', step_done:'歡迎使用 πOS' },
      desktop: { new_folder:'新增資料夾', new_file:'新增文字檔', refresh:'重新整理', display_settings:'顯示設定', open:'開啟', pin_taskbar:'釘選到工作列', folder_name_prompt:'資料夾名稱：', file_name_prompt:'檔案名稱（含副檔名）：' },
      taskbar: { search_placeholder:'搜尋程式...', user:'使用者' },
      wm:      { minimize:'最小化', maximize:'最大化', restore:'還原', close:'關閉' },
      ctx:     { open:'開啟', rename:'重新命名', delete:'刪除', info:'內容', refresh:'重新整理', new_folder:'新增資料夾', new_file:'新增文字檔', display_settings:'顯示設定', pin_taskbar:'釘選到工作列' },
    };
    if (lang === 'zh-cn') return {
      system:  { name:'πOS', shutdown:'关机', restart:'重新启动', loading:'加载中...', booting:'正在启动...', welcome:'欢迎使用 πOS' },
      boot:    { step_kernel:'初始化内核...', step_vfs:'挂载虚拟文件系统...', step_desktop:'加载桌面环境...', step_apps:'启动应用程序服务...', step_done:'欢迎使用 πOS' },
      desktop: { new_folder:'新建文件夹', new_file:'新建文本文件', refresh:'刷新', display_settings:'显示设置', open:'打开', pin_taskbar:'固定到任务栏', folder_name_prompt:'文件夹名称：', file_name_prompt:'文件名（含扩展名）：' },
      taskbar: { search_placeholder:'搜索应用...', user:'用户' },
      wm:      { minimize:'最小化', maximize:'最大化', restore:'还原', close:'关闭' },
      ctx:     { open:'打开', rename:'重命名', delete:'删除', info:'属性', refresh:'刷新', new_folder:'新建文件夹', new_file:'新建文本文件', display_settings:'显示设置', pin_taskbar:'固定到任务栏' },
    };
    return null;
  }

  return { loadSysLang, loadAppLang, t, getLang, getLangs };
})();
