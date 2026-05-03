/**
 * πOS 瀏覽器 — 多分頁、完整導航
 */
const _browserIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

OS.registerApp('browser', {
  id: 'browser',
  get title() { return i18n.t('app:browser.title') || '瀏覽器'; },
  iconChar: 'BR',
  iconSvg: _browserIcon,
  width: 1000,
  height: 660,

  render(body, args, winId) {
    const homeUrl = 'https://www.google.com/webhp?igu=1';
    let bookmarks = JSON.parse(localStorage.getItem('pios_bookmarks') || '[]');

    // SVG icons
    const I = {
      back:    `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="10 3 5 8 10 13"/></svg>`,
      forward: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="6 3 11 8 6 13"/></svg>`,
      reload:  `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="1 4 1 10 7 10"/><path d="M3.5 14.5a7 7 0 1 0 .5-7.5"/></svg>`,
      home:    `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 9.5V14h4v-3h2v3h4V9.5"/><polyline points="1 8 8 1 15 8"/></svg>`,
      star:    `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="8 1 10 6 15 6 11 9.5 12.5 15 8 12 3.5 15 5 9.5 1 6 6 6"/></svg>`,
      tabs:    `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1" y="4" width="14" height="10" rx="1"/><path d="M1 7h14"/><path d="M5 4V2h4v2"/></svg>`,
      close:   `<svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.4"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>`,
      plus:    `<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>`,
    };

    body.style.cssText = 'display:flex;flex-direction:column;height:100%;background:#12121e;';
    body.innerHTML = `
      <!-- 分頁列 -->
      <div id="br-tabbar-${winId}" style="display:flex;align-items:center;background:#0d0d1a;border-bottom:1px solid rgba(255,255,255,.08);padding:4px 4px 0;gap:2px;flex-shrink:0;min-height:34px;overflow-x:auto;overflow-y:hidden;">
        <div id="br-tabs-${winId}" style="display:flex;gap:2px;flex:1;overflow-x:auto;overflow-y:hidden;"></div>
        <button id="br-newtab-${winId}" title="新分頁" style="flex-shrink:0;width:26px;height:26px;border:none;border-radius:4px;background:transparent;color:#aaa;cursor:pointer;display:flex;align-items:center;justify-content:center;">${I.plus}</button>
      </div>
      <!-- 工具列 -->
      <div style="display:flex;align-items:center;gap:3px;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;background:#12121e;">
        <button class="br-nav" id="br-back-${winId}"    title="上一頁">${I.back}</button>
        <button class="br-nav" id="br-forward-${winId}" title="下一頁">${I.forward}</button>
        <button class="br-nav" id="br-reload-${winId}"  title="重新載入">${I.reload}</button>
        <button class="br-nav" id="br-home-${winId}"    title="首頁">${I.home}</button>
        <!-- 安全鎖 + 網址列 -->
        <div style="flex:1;display:flex;align-items:center;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:0 10px;gap:6px;">
          <span id="br-lock-${winId}" style="font-size:11px;color:#4f4;flex-shrink:0;">&#128274;</span>
          <input id="br-url-${winId}" type="text" autocomplete="off" spellcheck="false"
            style="flex:1;background:transparent;border:none;outline:none;color:#eee;font-size:13px;padding:4px 0;"
            value="${homeUrl}">
          <button id="br-go-${winId}" style="border:none;background:transparent;color:#aaa;cursor:pointer;padding:0;display:flex;align-items:center;">${I.reload}</button>
        </div>
        <button class="br-nav" id="br-bm-btn-${winId}" title="書籤">${I.star}</button>
        <button class="br-nav" id="br-bm-list-${winId}" title="書籤列表">${I.tabs}</button>
      </div>
      <!-- 書籤列 -->
      <div id="br-bmbar-${winId}" style="display:none;padding:3px 8px;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;gap:4px;background:#0d0d1a;flex-shrink:0;"></div>
      <!-- 內容區 -->
      <div id="br-content-${winId}" style="flex:1;position:relative;overflow:hidden;"></div>
      <!-- 狀態列 -->
      <div id="br-status-${winId}" style="padding:2px 10px;font-size:11px;color:#555;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;background:#0d0d1a;">就緒</div>
    `;

    // 樣式注入
    const style = document.createElement('style');
    style.textContent = `
      .br-nav { padding:4px 7px;border:none;border-radius:4px;background:transparent;color:#ccc;cursor:pointer;display:flex;align-items:center;justify-content:center; }
      .br-nav:hover { background:rgba(255,255,255,.1); }
      .br-nav:disabled { opacity:.3;cursor:default; }
      .br-tab { display:flex;align-items:center;gap:5px;padding:4px 10px 4px 10px;border-radius:6px 6px 0 0;cursor:pointer;font-size:12px;color:#aaa;background:transparent;border:1px solid transparent;border-bottom:none;max-width:180px;min-width:80px;flex-shrink:0;transition:background .1s; }
      .br-tab:hover { background:rgba(255,255,255,.07); }
      .br-tab.active { background:#12121e;border-color:rgba(255,255,255,.1);color:#eee; }
      .br-tab .br-tab-title { flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
      .br-tab .br-tab-close { opacity:.5;flex-shrink:0;display:flex;align-items:center;padding:1px; }
      .br-tab .br-tab-close:hover { opacity:1; }
      .br-tab .br-tab-favicon { width:14px;height:14px;flex-shrink:0; }
    `;
    body.appendChild(style);

    // ── 分頁管理 ──
    let tabs = [];       // [{ id, url, title, histBack:[], histFwd:[] }]
    let activeTab = -1;
    let tabCounter = 0;

    const tabsEl   = document.getElementById(`br-tabs-${winId}`);
    const contentEl= document.getElementById(`br-content-${winId}`);
    const urlBar   = document.getElementById(`br-url-${winId}`);
    const statusEl = document.getElementById(`br-status-${winId}`);
    const lockEl   = document.getElementById(`br-lock-${winId}`);
    const backBtn  = document.getElementById(`br-back-${winId}`);
    const fwdBtn   = document.getElementById(`br-forward-${winId}`);

    function createTab(url = homeUrl) {
      const id = ++tabCounter;
      const tab = { id, url, title: '新分頁', histBack: [], histFwd: [] };
      tabs.push(tab);

      // iframe
      const iframe = document.createElement('iframe');
      iframe.id = `br-iframe-${winId}-${id}`;
      iframe.src = url;
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;background:#fff;display:none;';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      contentEl.appendChild(iframe);

      iframe.addEventListener('load', () => {
        if (activeTab !== id) return;
        let href = url;
        try { href = iframe.contentWindow.location.href; } catch {}
        if (href && href !== 'about:blank') {
          tab.url = href;
          urlBar.value = href;
          updateLock(href);
        }
        let title = tab.title;
        try { title = iframe.contentDocument.title || href.replace(/^https?:\/\//, '').split('/')[0]; } catch {}
        tab.title = title || '頁面';
        renderTabs();
        statusEl.textContent = '已載入';
      });

      // 分頁按鈕
      const tabEl = document.createElement('div');
      tabEl.className = 'br-tab';
      tabEl.id = `br-tab-el-${winId}-${id}`;
      tabEl.innerHTML = `
        <span class="br-tab-favicon">${_browserIcon.replace('stroke="currentColor"','stroke="#4af"')}</span>
        <span class="br-tab-title">新分頁</span>
        <span class="br-tab-close" onclick="event.stopPropagation();_br_${winId}.closeTab(${id})">${I.close}</span>
      `;
      tabEl.addEventListener('click', () => switchTab(id));
      tabsEl.appendChild(tabEl);

      switchTab(id);
      return id;
    }

    function switchTab(id) {
      activeTab = id;
      tabs.forEach(t => {
        const iframe = document.getElementById(`br-iframe-${winId}-${t.id}`);
        if (iframe) iframe.style.display = t.id === id ? 'block' : 'none';
      });
      const tab = tabs.find(t => t.id === id);
      if (tab) {
        urlBar.value = tab.url;
        updateLock(tab.url);
        updateNavBtns(tab);
      }
      renderTabs();
    }

    function renderTabs() {
      tabs.forEach(t => {
        const el = document.getElementById(`br-tab-el-${winId}-${t.id}`);
        if (!el) return;
        el.className = 'br-tab' + (t.id === activeTab ? ' active' : '');
        el.querySelector('.br-tab-title').textContent = t.title;
      });
    }

    function closeTab(id) {
      const idx = tabs.findIndex(t => t.id === id);
      if (idx === -1) return;
      const iframe = document.getElementById(`br-iframe-${winId}-${id}`);
      if (iframe) iframe.remove();
      const tabEl = document.getElementById(`br-tab-el-${winId}-${id}`);
      if (tabEl) tabEl.remove();
      tabs.splice(idx, 1);
      if (tabs.length === 0) { createTab(); return; }
      if (activeTab === id) switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
    }

    function navigate(url, pushHistory = true) {
      if (!url) return;
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
        // 判斷是搜尋還是網址
        url = url.includes('.') && !url.includes(' ')
          ? 'https://' + url
          : 'https://www.google.com/search?q=' + encodeURIComponent(url);
      }
      const tab = tabs.find(t => t.id === activeTab);
      if (!tab) return;
      if (pushHistory && tab.url !== url) {
        tab.histBack.push(tab.url);
        tab.histFwd = [];
      }
      tab.url = url;
      urlBar.value = url;
      updateLock(url);
      statusEl.textContent = '載入中...';
      const iframe = document.getElementById(`br-iframe-${winId}-${activeTab}`);
      if (iframe) iframe.src = url;
      updateNavBtns(tab);
    }

    function goBack() {
      const tab = tabs.find(t => t.id === activeTab);
      if (!tab || !tab.histBack.length) return;
      tab.histFwd.push(tab.url);
      const prev = tab.histBack.pop();
      navigate(prev, false);
    }

    function goForward() {
      const tab = tabs.find(t => t.id === activeTab);
      if (!tab || !tab.histFwd.length) return;
      tab.histBack.push(tab.url);
      const next = tab.histFwd.pop();
      navigate(next, false);
    }

    function updateNavBtns(tab) {
      backBtn.disabled = !tab || !tab.histBack.length;
      fwdBtn.disabled  = !tab || !tab.histFwd.length;
    }

    function updateLock(url) {
      lockEl.textContent = url.startsWith('https://') ? '\uD83D\uDD12' : '\uD83D\uDD13';
      lockEl.style.color = url.startsWith('https://') ? '#4f4' : '#fa4';
    }

    // 書籤
    function renderBmBar() {
      const bar = document.getElementById(`br-bmbar-${winId}`);
      if (!bar) return;
      if (!bookmarks.length) { bar.style.display = 'none'; return; }
      bar.style.display = 'flex';
      bar.innerHTML = bookmarks.map((b, i) => `
        <span style="padding:2px 8px;border-radius:10px;background:rgba(0,120,212,.25);font-size:11px;cursor:pointer;color:#ccc;white-space:nowrap;"
          onclick="_br_${winId}.navigate('${b.url.replace(/'/g,"\\'")}');"
          oncontextmenu="event.preventDefault();_br_${winId}.removeBm(${i})">
          ${b.title}
        </span>
      `).join('');
    }

    // 事件綁定
    backBtn.addEventListener('click', goBack);
    fwdBtn.addEventListener('click', goForward);
    document.getElementById(`br-reload-${winId}`).addEventListener('click', () => {
      const iframe = document.getElementById(`br-iframe-${winId}-${activeTab}`);
      if (iframe) { iframe.src = iframe.src; statusEl.textContent = '重新載入中...'; }
    });
    document.getElementById(`br-home-${winId}`).addEventListener('click', () => navigate(homeUrl));
    document.getElementById(`br-newtab-${winId}`).addEventListener('click', () => createTab());
    document.getElementById(`br-go-${winId}`).addEventListener('click', () => navigate(urlBar.value));
    urlBar.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigate(urlBar.value);
      if (e.key === 'Escape') { const tab = tabs.find(t => t.id === activeTab); if (tab) urlBar.value = tab.url; }
    });
    urlBar.addEventListener('focus', () => urlBar.select());
    document.getElementById(`br-bm-btn-${winId}`).addEventListener('click', () => {
      const tab = tabs.find(t => t.id === activeTab);
      if (!tab) return;
      const title = prompt('書籤名稱：', tab.title || tab.url.replace(/^https?:\/\//, '').split('/')[0]);
      if (!title) return;
      bookmarks.push({ title, url: tab.url });
      localStorage.setItem('pios_bookmarks', JSON.stringify(bookmarks));
      renderBmBar();
    });
    document.getElementById(`br-bm-list-${winId}`).addEventListener('click', () => {
      const bar = document.getElementById(`br-bmbar-${winId}`);
      if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
    });

    // 右鍵選單
    body.addEventListener('contextmenu', e => {
      if (e.target.closest('iframe')) return;
      e.preventDefault();
      Desktop.showContextMenu(e.clientX, e.clientY, [
        { label: '新分頁', action: () => createTab() },
        { label: '重新載入', action: () => { const f = document.getElementById(`br-iframe-${winId}-${activeTab}`); if(f) f.src=f.src; } },
        { sep: true },
        { label: '複製網址', action: () => navigator.clipboard?.writeText(urlBar.value) },
      ]);
    });

    window[`_br_${winId}`] = {
      navigate,
      closeTab,
      removeBm(i) { bookmarks.splice(i,1); localStorage.setItem('pios_bookmarks', JSON.stringify(bookmarks)); renderBmBar(); },
    };

    // 初始化
    createTab(args.url || homeUrl);
    renderBmBar();
  },

  onClose(winId) { delete window[`_br_${winId}`]; }
});
