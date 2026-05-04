/**
 * πOS Settings v2
 * JSON UI schema + PiOS API 驅動。
 */
const _settingsIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

PiOS.app.register('settings', {
  id: 'settings',
  get title() { return i18n.t('app:settings.title'); },
  iconChar: 'ST',
  iconSvg: _settingsIcon,
  width: 760,
  height: 560,

  render(body, args, winId) {
    const tabs = {
      display: '顯示',
      wallpaper: '桌布',
      system: '系統',
      storage: '儲存',
      apps: '應用程式',
      about: '關於'
    };
    let current = args.section || 'display';

    body.innerHTML = `
      <div class="settings-wrap">
        <div class="settings-nav" id="settings-nav-${winId}"></div>
        <div class="settings-content" id="settings-content-${winId}"></div>
      </div>
    `;
    const nav = document.getElementById(`settings-nav-${winId}`);
    const content = document.getElementById(`settings-content-${winId}`);

    const actions = {
      display: {
        applyScale: value => {
          localStorage.setItem('pios_ui_scale', value);
          PiOS.ui.applySettings();
        },
        applyTaskbar: value => {
          localStorage.setItem('pios_taskbar_pos', value);
          PiOS.ui.applySettings();
        },
        applyMotion: value => {
          localStorage.setItem('pios_animations', value ? '1' : '0');
          PiOS.ui.applySettings();
        },
        applyTransparency: value => {
          localStorage.setItem('pios_transparency', value ? '1' : '0');
          PiOS.ui.applySettings();
        }
      },
      system: {
        setLang: async value => {
          await i18n.loadSysLang(value);
          await Promise.all(Object.keys(PiOS.app.list()).map(id => i18n.loadAppLang(id, value)));
          render();
        },
        setTimezone: value => Clock.setTimezone(value),
        setBootSound: value => localStorage.setItem('pios_boot_sound', value ? '1' : '0'),
        setAutoSave: value => localStorage.setItem('pios_auto_save', value ? '1' : '0'),
        install: () => PiOS.pwa.install(),
        restart: () => PiOS.system.restart(),
        shutdown: () => PiOS.system.shutdown()
      }
    };

    function boolRaw(key, fallback) {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === '1';
    }
    function renderNav() {
      nav.innerHTML = Object.entries(tabs).map(([key, label]) => `
        <div class="settings-nav-item ${key === current ? 'active' : ''}" onclick="_st_${winId}.goto('${key}')">${label}</div>
      `).join('');
    }
    function render() {
      renderNav();
      if (current === 'display') return renderSchema(displaySchema(), actions.display);
      if (current === 'system') return renderSchema(systemSchema(), actions.system);
      if (current === 'wallpaper') return renderWallpaper();
      if (current === 'storage') return renderStorage();
      if (current === 'apps') return renderApps();
      return renderAbout();
    }
    function renderSchema(schema, schemaActions) {
      PiOS.ui.render(schema, content, { actions: schemaActions });
    }
    function displaySchema() {
      return {
        type: 'panel',
        title: '顯示設定',
        children: [
          { type: 'row', label: 'UI 縮放', children: [{ type: 'slider', min: 80, max: 130, suffix: '%', value: Number(localStorage.getItem('pios_ui_scale') || 100), onChange: 'applyScale' }] },
          { type: 'row', label: '工作列位置', children: [{ type: 'select', value: localStorage.getItem('pios_taskbar_pos') || 'bottom', onChange: 'applyTaskbar', options: [{ label: '底部', value: 'bottom' }, { label: '頂部', value: 'top' }] }] },
          { type: 'row', label: '動畫效果', children: [{ type: 'toggle', value: boolRaw('pios_animations', true), onChange: 'applyMotion' }] },
          { type: 'row', label: '透明度效果', children: [{ type: 'toggle', value: boolRaw('pios_transparency', true), onChange: 'applyTransparency' }] }
        ]
      };
    }
    function systemSchema() {
      const tz = localStorage.getItem('pios_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
      return {
        type: 'panel',
        title: '系統設定',
        children: [
          { type: 'row', label: '語言', children: [{ type: 'select', value: i18n.getLang(), onChange: 'setLang', options: [{ label: 'English', value: 'en' }, { label: '繁體中文', value: 'zh-tw' }, { label: '简体中文', value: 'zh-cn' }] }] },
          { type: 'row', label: '時區', children: [{ type: 'select', value: tz, onChange: 'setTimezone', options: ['Asia/Taipei','UTC','America/New_York','Europe/London','Asia/Tokyo'].map(value => ({ label: value, value })) }] },
          { type: 'row', label: '開機音效', children: [{ type: 'toggle', value: boolRaw('pios_boot_sound', false), onChange: 'setBootSound' }] },
          { type: 'row', label: '記事本自動儲存', children: [{ type: 'toggle', value: boolRaw('pios_auto_save', true), onChange: 'setAutoSave' }] },
          { type: 'row', label: '加入主畫面', children: [{ type: 'button', label: '安裝 πOS', onClick: 'install' }] },
          { type: 'row', label: '電源', children: [{ type: 'button', label: '重新啟動', onClick: 'restart' }, { type: 'button', label: '關機', onClick: 'shutdown' }] },
          { type: 'row', label: 'PWA 狀態', children: [{ type: 'text', text: JSON.stringify(PiOS.pwa.status()) }] }
        ]
      };
    }
    function renderWallpaper() {
      const wallpapers = [
        ['深夜藍', 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)'],
        ['極光', 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)'],
        ['森林', 'linear-gradient(135deg,#134e5e,#71b280)'],
        ['純黑', '#000']
      ];
      content.innerHTML = `<div class="api-panel"><h2>桌布設定</h2><div style="display:flex;flex-wrap:wrap;gap:10px">${wallpapers.map(([name, bg]) => `<button class="wallpaper-swatch" style="background:${bg}" onclick="_st_${winId}.wallpaper('${bg.replace(/'/g, "\\'")}')">${name}</button>`).join('')}</div><div class="settings-row"><label>圖片 URL</label><input id="st-wallpaper-url-${winId}" placeholder="https://..." style="flex:1"><button class="api-button" onclick="_st_${winId}.wallpaperUrl()">套用</button></div></div>`;
    }
    async function renderStorage() {
      content.innerHTML = '<div class="api-panel"><h2>儲存空間</h2><div>計算中...</div></div>';
      let vfsSize = 0;
      async function walk(path) {
        for (const item of await PiOS.fs.list(path)) {
          if (item.type === 'file') vfsSize += item.size || 0;
          else await walk(item.path);
        }
      }
      await walk('/');
      const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
      content.innerHTML = `<div class="api-panel"><h2>儲存空間</h2>
        <div class="settings-row"><label>VFS 大小</label><span>${formatBytes(vfsSize)}</span></div>
        <div class="settings-row"><label>瀏覽器使用量</label><span>${formatBytes(estimate.usage || 0)}</span></div>
        <div class="settings-row"><label>瀏覽器配額</label><span>${formatBytes(estimate.quota || 0)}</span></div>
        <div class="settings-row"><label>後端</label><span>IndexedDB</span></div>
        <button class="api-button" onclick="_st_${winId}.clearStorage()">清除 πOS 資料</button>
      </div>`;
    }
    function renderApps() {
      const infos = Object.keys(PiOS.app.list()).map(id => PiOS.app.info(id)).filter(Boolean);
      content.innerHTML = `<div class="api-panel"><h2>應用程式</h2>${infos.map(info => `
        <div class="settings-row"><label>${info.id}</label><span>${info.version} · ${info.uiMode || 'html'} · ${info.installable ? '可安裝' : '不可安裝'}</span></div>
      `).join('')}</div>`;
    }
    function renderAbout() {
      const info = PiOS.system.info();
      content.innerHTML = `<div class="api-panel"><h2>關於 πOS</h2>${Object.entries(info).map(([k, v]) => `<div class="settings-row"><label>${k}</label><span>${String(v)}</span></div>`).join('')}</div>`;
    }
    function formatBytes(bytes) {
      if (!bytes) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    window[`_st_${winId}`] = {
      goto(section) { current = section; render(); },
      wallpaper(bg) {
        localStorage.setItem('webos_wallpaper', bg);
        PiOS.ui.applySettings();
      },
      wallpaperUrl() {
        const url = document.getElementById(`st-wallpaper-url-${winId}`).value.trim();
        if (url) this.wallpaper(`url(${url}) center/cover no-repeat`);
      },
      async clearStorage() {
        if (!confirm('確定要清除所有 πOS 資料？')) return;
        indexedDB.deleteDatabase('WebOS_FS');
        localStorage.clear();
        location.reload();
      }
    };
    render();
  },

  onClose(winId) { delete window[`_st_${winId}`]; }
});
