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
      api: 'API',
      storage: '儲存',
      apps: '應用程式',
      sound: '音效',
      shortcuts: '快捷鍵',
      associations: '檔案關聯',
      network: '網路',
      security: '安全性',
      notifications: '通知',
      appearance: '外觀',
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
        setLang: value => {
          localStorage.setItem('pios_lang', value);
          i18n.setLang(value);
          location.reload();
        },
        setTimezone: value => localStorage.setItem('pios_timezone', value),
        setBootSound: value => localStorage.setItem('pios_boot_sound', value ? '1' : '0'),
        setAutoSave: value => localStorage.setItem('pios_auto_save', value ? '1' : '0'),
        install: () => PiOS.pwa.install(),
        restart: () => location.reload(),
        shutdown: () => window.close()
      },
      api: {
        setApiKey: value => localStorage.setItem('calc_api_key', value)
      },
      sound: {
        setMasterVolume: value => localStorage.setItem('pios_master_volume', value),
        setSoundEnabled: value => localStorage.setItem('pios_sound_enabled', value ? '1' : '0'),
        setNotificationSound: value => localStorage.setItem('pios_notification_sound', value ? '1' : '0'),
        setAppSound: value => localStorage.setItem('pios_app_sound', value ? '1' : '0')
      },
      shortcuts: {
        setShortcut: (action, keys) => {
          const shortcuts = JSON.parse(localStorage.getItem('pios_shortcuts') || '{}');
          shortcuts[action] = keys;
          localStorage.setItem('pios_shortcuts', JSON.stringify(shortcuts));
        }
      },
      associations: {
        setAssociation: (ext, app) => {
          const associations = JSON.parse(localStorage.getItem('pios_associations') || '{}');
          associations[ext] = app;
          localStorage.setItem('pios_associations', JSON.stringify(associations));
        }
      },
      network: {
        setProxy: value => localStorage.setItem('pios_proxy', value),
        setTimeout: value => localStorage.setItem('pios_network_timeout', value)
      },
      security: {
        setPassword: value => localStorage.setItem('pios_password', btoa(value)),
        enableEncryption: value => localStorage.setItem('pios_encryption', value ? '1' : '0')
      },
      notifications: {
        setEnabled: value => localStorage.setItem('pios_notifications', value ? '1' : '0'),
        setDuration: value => localStorage.setItem('pios_notification_duration', value)
      },
      appearance: {
        setTheme: value => {
          localStorage.setItem('pios_theme', value);
          PiOS.ui.applySettings();
        },
        setFontSize: value => {
          localStorage.setItem('pios_font_size', value);
          PiOS.ui.applySettings();
        },
        setFontFamily: value => {
          localStorage.setItem('pios_font_family', value);
          PiOS.ui.applySettings();
        }
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
      if (current === 'api') return renderApi();
      if (current === 'wallpaper') return renderWallpaper();
      if (current === 'storage') return renderStorage();
      if (current === 'apps') return renderApps();
      if (current === 'sound') return renderSchema(soundSchema(), actions.sound);
      if (current === 'shortcuts') return renderShortcuts();
      if (current === 'associations') return renderAssociations();
      if (current === 'network') return renderSchema(networkSchema(), actions.network);
      if (current === 'security') return renderSchema(securitySchema(), actions.security);
      if (current === 'notifications') return renderSchema(notificationsSchema(), actions.notifications);
      if (current === 'appearance') return renderSchema(appearanceSchema(), actions.appearance);
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
    function soundSchema() {
      return {
        type: 'panel',
        title: '音效設定',
        children: [
          { type: 'row', label: '主音量', children: [{ type: 'slider', min: 0, max: 100, suffix: '%', value: Number(localStorage.getItem('pios_master_volume') || 50), onChange: 'setMasterVolume' }] },
          { type: 'row', label: '啟用音效', children: [{ type: 'toggle', value: boolRaw('pios_sound_enabled', true), onChange: 'setSoundEnabled' }] },
          { type: 'row', label: '通知音效', children: [{ type: 'toggle', value: boolRaw('pios_notification_sound', true), onChange: 'setNotificationSound' }] },
          { type: 'row', label: '應用音效', children: [{ type: 'toggle', value: boolRaw('pios_app_sound', false), onChange: 'setAppSound' }] }
        ]
      };
    }

    function networkSchema() {
      return {
        type: 'panel',
        title: '網路設定',
        children: [
          { type: 'row', label: '代理伺服器', children: [{ type: 'input', value: localStorage.getItem('pios_proxy') || '', placeholder: 'http://proxy.example.com:8080', onChange: 'setProxy' }] },
          { type: 'row', label: '網路逾時', children: [{ type: 'slider', min: 5, max: 60, suffix: '秒', value: Number(localStorage.getItem('pios_network_timeout') || 30), onChange: 'setTimeout' }] }
        ]
      };
    }

    function securitySchema() {
      return {
        type: 'panel',
        title: '安全性設定',
        children: [
          { type: 'row', label: '系統密碼', children: [{ type: 'password', value: '', placeholder: '設定系統密碼', onChange: 'setPassword' }] },
          { type: 'row', label: '資料加密', children: [{ type: 'toggle', value: boolRaw('pios_encryption', false), onChange: 'enableEncryption' }] }
        ]
      };
    }

    function notificationsSchema() {
      return {
        type: 'panel',
        title: '通知設定',
        children: [
          { type: 'row', label: '啟用通知', children: [{ type: 'toggle', value: boolRaw('pios_notifications', true), onChange: 'setEnabled' }] },
          { type: 'row', label: '顯示持續時間', children: [{ type: 'slider', min: 1, max: 10, suffix: '秒', value: Number(localStorage.getItem('pios_notification_duration') || 3), onChange: 'setDuration' }] }
        ]
      };
    }

    function appearanceSchema() {
      return {
        type: 'panel',
        title: '外觀設定',
        children: [
          { type: 'row', label: '主題', children: [{ type: 'select', value: localStorage.getItem('pios_theme') || 'dark', onChange: 'setTheme', options: [{ label: '深色', value: 'dark' }, { label: '淺色', value: 'light' }, { label: '自動', value: 'auto' }] }] },
          { type: 'row', label: '字體大小', children: [{ type: 'slider', min: 12, max: 24, suffix: 'px', value: Number(localStorage.getItem('pios_font_size') || 14), onChange: 'setFontSize' }] },
          { type: 'row', label: '字體家族', children: [{ type: 'select', value: localStorage.getItem('pios_font_family') || 'system', onChange: 'setFontFamily', options: [{ label: '系統預設', value: 'system' }, { label: 'Sans Serif', value: 'sans-serif' }, { label: 'Serif', value: 'serif' }, { label: '等寬', value: 'monospace' }] }] }
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
    function renderShortcuts() {
      const shortcuts = JSON.parse(localStorage.getItem('pios_shortcuts') || '{}');
      const defaultShortcuts = {
        'explorer': 'Ctrl+E',
        'notepad': 'Ctrl+N',
        'terminal': 'Ctrl+T',
        'settings': 'Ctrl+,',
        'calculator': 'Ctrl+C',
        'games': 'Ctrl+G'
      };
      const allShortcuts = { ...defaultShortcuts, ...shortcuts };

      content.innerHTML = `<div class="api-panel"><h2>快捷鍵設定</h2>${Object.entries(allShortcuts).map(([action, keys]) => `
        <div class="settings-row">
          <label>${action}</label>
          <input type="text" value="${keys}" onchange="_st_${winId}.setShortcut('${action}', this.value)" style="flex:1">
        </div>
      `).join('')}</div>`;
    }

    function renderAssociations() {
      const associations = JSON.parse(localStorage.getItem('pios_associations') || '{}');
      const defaultAssociations = {
        '.txt': 'notepad',
        '.js': 'notepad',
        '.json': 'notepad',
        '.md': 'notepad',
        '.png': 'explorer',
        '.jpg': 'explorer',
        '.gif': 'explorer'
      };
      const allAssociations = { ...defaultAssociations, ...associations };
      const apps = Object.keys(PiOS.app.list());

      content.innerHTML = `<div class="api-panel"><h2>檔案關聯</h2>${Object.entries(allAssociations).map(([ext, app]) => `
        <div class="settings-row">
          <label>${ext}</label>
          <select onchange="_st_${winId}.setAssociation('${ext}', this.value)" style="flex:1">
            ${apps.map(a => `<option value="${a}" ${a === app ? 'selected' : ''}>${a}</option>`).join('')}
          </select>
        </div>
      `).join('')}</div>`;
    }
    function renderApi() {
      content.innerHTML = `<div class="api-panel"><h2>API 設定</h2>
        <div class="settings-row"><label>計算機 AI API Key</label><input type="password" id="api-key-${winId}" value="${localStorage.getItem('calc_api_key') || ''}" style="flex:1"><button class="api-button" onclick="_st_${winId}.setApiKey(document.getElementById('api-key-${winId}').value)">儲存</button></div>
      </div>`;
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
      setApiKey(value) {
        localStorage.setItem('calc_api_key', value);
        alert('API Key 已儲存');
      },
      async clearStorage() {
        if (!confirm('確定要清除所有 πOS 資料？')) return;
        indexedDB.deleteDatabase('WebOS_FS');
        localStorage.clear();
        location.reload();
      },
      setShortcut(action, keys) {
        const shortcuts = JSON.parse(localStorage.getItem('pios_shortcuts') || '{}');
        shortcuts[action] = keys;
        localStorage.setItem('pios_shortcuts', JSON.stringify(shortcuts));
      },
      setAssociation(ext, app) {
        const associations = JSON.parse(localStorage.getItem('pios_associations') || '{}');
        associations[ext] = app;
        localStorage.setItem('pios_associations', JSON.stringify(associations));
      }
    };
    render();
  },

  onClose(winId) { delete window[`_st_${winId}`]; }
});
