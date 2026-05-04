/**
 * πOS 系統設定
 */
const _settingsIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

OS.registerApp('settings', {
  id: 'settings',
  get title() { return i18n.t('app:settings.title'); },
  iconChar: 'ST',
  iconSvg: _settingsIcon,
  width: 680,
  height: 480,

  render(body, args, winId) {
    const T = k => i18n.t('app:settings.' + k);
    const getBool = (key, fallback = true) => {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === '1';
    };
    const setBool = (key, value) => localStorage.setItem(key, value ? '1' : '0');

    const sections = {
      display:  { get label() { return T('nav.display');   }, render: renderDisplay  },
      wallpaper:{ get label() { return T('nav.wallpaper'); }, render: renderWallpaper},
      system:   { get label() { return T('nav.system');    }, render: renderSystem   },
      storage:  { get label() { return T('nav.storage');   }, render: renderStorage  },
      about:    { get label() { return T('nav.about');     }, render: renderAbout    },
    };

    let currentSection = 'display';

    body.innerHTML = `
      <div class="settings-wrap">
        <div class="settings-nav" id="settings-nav-${winId}"></div>
        <div class="settings-content" id="settings-content-${winId}"></div>
      </div>
    `;

    function renderNav() {
      const nav = document.getElementById(`settings-nav-${winId}`);
      if (!nav) return;
      nav.innerHTML = Object.entries(sections).map(([k, s]) => `
        <div class="settings-nav-item ${k === currentSection ? 'active' : ''}"
          onclick="_st_${winId}.goto('${k}')">
          ${s.label}
        </div>
      `).join('');
    }

    function renderContent() {
      const content = document.getElementById(`settings-content-${winId}`);
      if (!content) return;
      sections[currentSection].render(content);
    }

    function renderDisplay(el) {
      const T = k => i18n.t('app:settings.display.' + k);
      const scale = Number(localStorage.getItem('pios_ui_scale') || 100);
      const taskbarPos = localStorage.getItem('pios_taskbar_pos') || 'bottom';
      const animations = getBool('pios_animations', true);
      const transparency = getBool('pios_transparency', true);
      el.innerHTML = `
        <div class="settings-section">
          <h2>${T('title')}</h2>
          <div class="settings-row">
            <label>${T('scale')}</label>
            <input type="range" min="80" max="130" value="${scale}" id="st-scale-${winId}"
              oninput="_st_${winId}.setScale(this.value)">
            <span id="st-scale-val-${winId}">${scale}%</span>
          </div>
          <div class="settings-row">
            <label>${T('taskbar_pos')}</label>
            <select onchange="_st_${winId}.setTaskbarPos(this.value)">
              <option value="bottom" ${taskbarPos === 'bottom' ? 'selected' : ''}>${T('taskbar_bottom')}</option>
              <option value="top" ${taskbarPos === 'top' ? 'selected' : ''}>${T('taskbar_top')}</option>
            </select>
          </div>
          <div class="settings-row">
            <label>${T('animations')}</label>
            <label class="toggle">
              <input type="checkbox" ${animations ? 'checked' : ''} onchange="_st_${winId}.toggleAnim(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <label>${T('transparency')}</label>
            <label class="toggle">
              <input type="checkbox" ${transparency ? 'checked' : ''} onchange="_st_${winId}.toggleBlur(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      `;
    }

    function renderWallpaper(el) {
      const T  = k => i18n.t('app:settings.wallpaper.' + k);
      const TN = k => i18n.t('app:settings.wallpaper.names.' + k);
      const gradients = [
        { key: 'midnight', value: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
        { key: 'aurora',   value: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' },
        { key: 'sunset',   value: 'linear-gradient(135deg,#f093fb,#f5576c,#4facfe)' },
        { key: 'forest',   value: 'linear-gradient(135deg,#134e5e,#71b280)'          },
        { key: 'flame',    value: 'linear-gradient(135deg,#f7971e,#ffd200,#f7971e)'  },
        { key: 'black',    value: '#000'    },
        { key: 'dark',     value: '#1a1a2e' },
      ];
      el.innerHTML = `
        <div class="settings-section">
          <h2>${T('title')}</h2>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
            ${gradients.map(g => `
              <div onclick="_st_${winId}.setWallpaper('${g.value}')"
                style="width:80px;height:50px;border-radius:6px;cursor:pointer;background:${g.value};border:2px solid rgba(255,255,255,.2);display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;">
                <span style="font-size:10px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8)">${TN(g.key)}</span>
              </div>
            `).join('')}
          </div>
          <div class="settings-row">
            <label>${T('custom_url')}</label>
            <input type="text" id="st-wp-url-${winId}" placeholder="https://..."
              style="flex:1;padding:5px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4);color:#eee;font-size:12px;outline:none;margin:0 8px;">
            <button onclick="_st_${winId}.setWallpaperUrl()"
              style="padding:5px 10px;border:none;border-radius:4px;background:rgba(0,120,212,.6);color:#fff;cursor:pointer;font-size:12px;">${T('apply')}</button>
          </div>
        </div>
      `;
    }

    function renderSystem(el) {
      const T = k => i18n.t('app:settings.system.' + k);
      const langs = i18n.getLangs();
      const langNames = { 'en': 'English', 'zh-tw': '繁體中文', 'zh-cn': '简体中文' };
      const timezone = localStorage.getItem('pios_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const bootSound = getBool('pios_boot_sound', false);
      const autoSave = getBool('pios_auto_save', true);
      const installState = PiOS.pwa.isStandalone()
        ? T('installed')
        : (PiOS.pwa.canInstall() ? T('install_ready') : T('install_browser_menu'));
      const pwaStatus = PiOS.pwa.status();
      el.innerHTML = `
        <div class="settings-section">
          <h2>${T('title')}</h2>
          <div class="settings-row">
            <label>${T('language')}</label>
            <select id="st-lang-${winId}" onchange="_st_${winId}.setLang(this.value)">
              ${langs.map(l => `<option value="${l}" ${l === i18n.getLang() ? 'selected' : ''}>${langNames[l] || l}</option>`).join('')}
            </select>
          </div>
          <div class="settings-row">
            <label>${T('timezone')}</label>
            <select onchange="_st_${winId}.setTimezone(this.value)">
              ${['Asia/Taipei', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'].map(tz =>
                `<option value="${tz}" ${tz === timezone ? 'selected' : ''}>${tz}</option>`
              ).join('')}
            </select>
          </div>
          <div class="settings-row">
            <label>${T('boot_sound')}</label>
            <label class="toggle"><input type="checkbox" ${bootSound ? 'checked' : ''} onchange="_st_${winId}.setBootSound(this.checked)"><span class="toggle-slider"></span></label>
          </div>
          <div class="settings-row">
            <label>${T('auto_save')}</label>
            <label class="toggle"><input type="checkbox" ${autoSave ? 'checked' : ''} onchange="_st_${winId}.setAutoSave(this.checked)"><span class="toggle-slider"></span></label>
          </div>
          <div class="settings-row">
            <label>${T('install_app')}</label>
            <button onclick="_st_${winId}.installPwa()" style="padding:7px 12px;border:none;border-radius:4px;background:rgba(0,120,212,.65);color:#fff;cursor:pointer;font-size:12px;">${T('install_button')}</button>
          </div>
          <div class="settings-row"><label>${T('pwa_state')}</label><span>${pwaStatus.serviceWorker ? 'Service Worker' : 'Browser'} · ${pwaStatus.online ? 'Online' : 'Offline'}</span></div>
          <div style="font-size:12px;color:#888;padding-top:6px;">${installState}</div>
          <div style="margin-top:20px;display:flex;gap:8px;">
            <button onclick="OS.restart()"  style="padding:8px 16px;border:none;border-radius:4px;background:rgba(0,120,212,.6);color:#fff;cursor:pointer;font-size:13px;">${T('restart')}</button>
            <button onclick="OS.shutdown()" style="padding:8px 16px;border:none;border-radius:4px;background:rgba(200,0,0,.6);color:#fff;cursor:pointer;font-size:13px;">${T('shutdown')}</button>
          </div>
        </div>
      `;
    }

    async function renderStorage(el) {
      const T = k => i18n.t('app:settings.storage.' + k);
      el.innerHTML = `<div class="settings-section"><h2>${T('title')}</h2><div style="color:#888">${T('calculating')}</div></div>`;
      try {
        let totalSize = 0;
        async function calcDir(path) {
          const items = await VFS.listDir(path);
          for (const item of items) {
            if (item.type === 'file') totalSize += item.size || 0;
            else await calcDir(item.path);
          }
        }
        await calcDir('/');
        let quota = i18n.t('system.loading'), usage = i18n.t('system.loading');
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          quota = formatBytes(est.quota || 0);
          usage = formatBytes(est.usage || 0);
        }
        const memory = getMemoryInfo();
        el.innerHTML = `
          <div class="settings-section">
            <h2>${T('title')}</h2>
            <div class="settings-row"><label>${T('vfs_size')}</label><span>${formatBytes(totalSize)}</span></div>
            <div class="settings-row"><label>${T('browser_used')}</label><span>${usage}</span></div>
            <div class="settings-row"><label>${T('browser_quota')}</label><span>${quota}</span></div>
            <div class="settings-row"><label>${T('device_memory')}</label><span>${memory.device}</span></div>
            <div class="settings-row"><label>${T('js_heap')}</label><span>${memory.heap}</span></div>
            <div class="settings-row"><label>${T('backend')}</label><span>IndexedDB</span></div>
            <div style="margin-top:16px;">
              <button onclick="_st_${winId}.clearStorage()"
                style="padding:8px 16px;border:none;border-radius:4px;background:rgba(200,0,0,.4);color:#fff;cursor:pointer;font-size:13px;">
                ${T('clear')}
              </button>
            </div>
          </div>
        `;
      } catch (e) {
        el.innerHTML = `<div class="settings-section"><h2>${T('title')}</h2><div style="color:#f44">${e.message}</div></div>`;
      }
    }

    function renderAbout(el) {
      const T = k => i18n.t('app:settings.about.' + k);
      el.innerHTML = `
        <div class="settings-section">
          <h2>${T('title')}</h2>
          <div style="text-align:center;padding:20px 0;">
            <img src="../api/logo.svg" width="64" height="64" alt="πOS" style="border-radius:14px;">
            <div style="font-size:24px;font-weight:300;letter-spacing:4px;margin:12px 0">πOS</div>
            <div style="color:#888;font-size:13px">${T('version')} 1.0.0</div>
          </div>
          <div class="settings-row"><label>${T('kernel')}</label><span>πOS Kernel 1.0</span></div>
          <div class="settings-row"><label>${T('vfs')}</label><span>IndexedDB v1</span></div>
          <div class="settings-row"><label>${T('wm')}</label><span>WM 1.0</span></div>
          <div class="settings-row"><label>${T('browser_engine')}</label><span>${navigator.userAgent.split('/')[0]}</span></div>
          <div class="settings-row"><label>${T('wasm')}</label><span>${typeof WebAssembly !== 'undefined' ? T('supported') : T('not_supported')}</span></div>
          <div class="settings-row"><label>${T('sab')}</label><span>${typeof SharedArrayBuffer !== 'undefined' ? T('supported') : T('sab_limited')}</span></div>
          <div class="settings-row"><label>${T('idb')}</label><span>${T('supported')}</span></div>
          <div style="margin-top:16px;font-size:12px;color:#555;text-align:center;white-space:pre-line">${T('footer')}</div>
        </div>
      `;
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
      return (bytes/1024/1024).toFixed(2) + ' MB';
    }

    function getMemoryInfo() {
      const device = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : i18n.t('system.loading');
      const perfMemory = performance.memory;
      if (!perfMemory) return { device, heap: i18n.t('app:settings.storage.unavailable') };
      return {
        device,
        heap: `${formatBytes(perfMemory.usedJSHeapSize)} / ${formatBytes(perfMemory.jsHeapSizeLimit)}`
      };
    }

    window[`_st_${winId}`] = {
      goto(section) { currentSection = section; renderNav(); renderContent(); },
      setScale(val) {
        localStorage.setItem('pios_ui_scale', val);
        document.getElementById(`st-scale-val-${winId}`).textContent = val + '%';
        Desktop.applyUserSettings();
      },
      setTaskbarPos(pos) {
        localStorage.setItem('pios_taskbar_pos', pos);
        Desktop.applyUserSettings();
      },
      toggleAnim(on) {
        setBool('pios_animations', on);
        Desktop.applyUserSettings();
      },
      toggleBlur(on) {
        setBool('pios_transparency', on);
        Desktop.applyUserSettings();
      },
      setWallpaper(bg) {
        document.getElementById('desktop').style.background = bg;
        localStorage.setItem('webos_wallpaper', bg);
      },
      setWallpaperUrl() {
        const url = document.getElementById(`st-wp-url-${winId}`).value;
        if (!url) return;
        this.setWallpaper(`url(${url}) center/cover no-repeat`);
      },
      async setLang(lang) {
        await i18n.loadSysLang(lang);
        // 重新載入所有 app 語言包
        const apps = OS.getApps();
        await Promise.all(Object.keys(apps).map(id => i18n.loadAppLang(id, lang)));
        // 重新渲染設定頁
        renderNav();
        renderContent();
        // 通知全系統
        OS.emit('i18n:loaded', { lang });
      },
      setTimezone(timeZone) { Clock.setTimezone(timeZone); },
      setBootSound(on) { setBool('pios_boot_sound', on); },
      setAutoSave(on) { setBool('pios_auto_save', on); },
      async installPwa() {
        const result = await PiOS.pwa.install();
        if (result.installed) PiOS.ui.notify(i18n.t('app:settings.system.install_app'), i18n.t('app:settings.system.installed'));
      },
      async clearStorage() {
        const T = k => i18n.t('app:settings.storage.' + k);
        if (!confirm(T('clear_confirm'))) return;
        indexedDB.deleteDatabase('WebOS_FS');
        localStorage.clear();
        alert(T('clear_done'));
        location.reload();
      }
    };

    Desktop.applyUserSettings();

    renderNav();
    renderContent();
  },

  onClose(winId) { delete window[`_st_${winId}`]; }
});
