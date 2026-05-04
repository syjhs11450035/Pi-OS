/**
 * πOS Browser v2
 * 多分頁、離線首頁、書籤、iframe 限制明確回報。
 */
const _browserIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

PiOS.app.register('browser', {
  id: 'browser',
  title: '瀏覽器',
  iconChar: 'BR',
  iconSvg: _browserIcon,
  width: 1000,
  height: 660,

  render(body, args, winId) {
    const homeUrl = 'pios://home';
    let tabs = [];
    let active = null;
    let seq = 0;
    let bookmarks = readBookmarks();

    body.innerHTML = `
      <div class="browser-v2">
        <div class="browser-tabs" id="br-tabs-${winId}"></div>
        <div class="browser-toolbar">
          <button id="br-back-${winId}">‹</button>
          <button id="br-fwd-${winId}">›</button>
          <button id="br-refresh-${winId}">重新整理</button>
          <button id="br-home-${winId}">首頁</button>
          <input id="br-url-${winId}" spellcheck="false">
          <button id="br-go-${winId}">前往</button>
          <button id="br-star-${winId}">書籤</button>
        </div>
        <div class="browser-bookmarks" id="br-bookmarks-${winId}"></div>
        <div class="browser-page" id="br-page-${winId}"></div>
        <div class="browser-status" id="br-status-${winId}">就緒</div>
      </div>
    `;

    injectBrowserStyle();
    const tabsEl = document.getElementById(`br-tabs-${winId}`);
    const pageEl = document.getElementById(`br-page-${winId}`);
    const urlEl = document.getElementById(`br-url-${winId}`);
    const statusEl = document.getElementById(`br-status-${winId}`);

    function normalizeUrl(input) {
      if (!input || input === homeUrl) return homeUrl;
      if (/^pios:\/\//.test(input)) return input;
      if (/^https?:\/\//.test(input)) return input;
      if (input.includes('.') && !input.includes(' ')) return 'https://' + input;
      return 'https://www.google.com/search?q=' + encodeURIComponent(input);
    }
    function current() { return tabs.find(t => t.id === active); }
    function setStatus(text) { statusEl.textContent = text; }

    function createTab(url = homeUrl) {
      const tab = { id: ++seq, title: '新分頁', url: homeUrl, back: [], forward: [] };
      tabs.push(tab);
      active = tab.id;
      navigate(url, false);
      renderTabs();
      return tab.id;
    }
    function closeTab(id) {
      const idx = tabs.findIndex(t => t.id === id);
      if (idx === -1) return;
      tabs.splice(idx, 1);
      if (!tabs.length) createTab(homeUrl);
      else if (active === id) active = tabs[Math.max(0, idx - 1)].id;
      render();
    }
    function switchTab(id) { active = id; render(); }
    function navigate(input, push = true) {
      const tab = current();
      if (!tab) return;
      const url = normalizeUrl(input);
      if (push && tab.url !== url) {
        tab.back.push(tab.url);
        tab.forward = [];
      }
      tab.url = url;
      tab.title = url === homeUrl ? 'πOS 首頁' : url.replace(/^https?:\/\//, '').split('/')[0];
      render();
    }
    function renderTabs() {
      tabsEl.innerHTML = tabs.map(t => `
        <button class="browser-tab ${t.id === active ? 'active' : ''}" onclick="_br_${winId}.switchTab(${t.id})">
          <span>${escapeHtml(t.title)}</span>
          <b onclick="event.stopPropagation();_br_${winId}.closeTab(${t.id})">×</b>
        </button>
      `).join('') + `<button class="browser-tab add" onclick="_br_${winId}.newTab()">+</button>`;
    }
    function renderBookmarks() {
      document.getElementById(`br-bookmarks-${winId}`).innerHTML = bookmarks.map((b, i) => `
        <button onclick="_br_${winId}.navigate('${escapeJs(b.url)}')" oncontextmenu="event.preventDefault();_br_${winId}.removeBookmark(${i})">${escapeHtml(b.title)}</button>
      `).join('');
    }
    function render() {
      const tab = current();
      if (!tab) return;
      renderTabs();
      renderBookmarks();
      urlEl.value = tab.url === homeUrl ? '' : tab.url;
      if (tab.url === homeUrl) renderHome();
      else renderFrame(tab.url);
    }
    function renderHome() {
      pageEl.innerHTML = `
        <div class="browser-home">
          <h2>πOS Browser</h2>
          <form id="br-search-form-${winId}">
            <input id="br-search-${winId}" placeholder="搜尋或輸入網址" autofocus>
            <button>前往</button>
          </form>
          <div class="browser-home-grid">
            <button onclick="_br_${winId}.navigate('https://www.wikipedia.org')">Wikipedia</button>
            <button onclick="_br_${winId}.navigate('https://developer.mozilla.org')">MDN</button>
            <button onclick="_br_${winId}.navigate('pios://apps')">已安裝 App</button>
            <button onclick="_br_${winId}.navigate('pios://status')">瀏覽器狀態</button>
          </div>
        </div>
      `;
      document.getElementById(`br-search-form-${winId}`).onsubmit = e => {
        e.preventDefault();
        navigate(document.getElementById(`br-search-${winId}`).value);
      };
      setStatus('本機首頁 · 可離線使用');
    }
    function renderFrame(url) {
      if (url === 'pios://apps') {
        pageEl.innerHTML = `<div class="browser-home"><h2>Apps</h2>${Object.keys(PiOS.app.list()).map(id => `<button onclick="PiOS.app.launch('${id}')">${id}</button>`).join('')}</div>`;
        return;
      }
      if (url === 'pios://status') {
        pageEl.innerHTML = `<pre class="browser-pre">${escapeHtml(JSON.stringify(PiOS.pwa.status(), null, 2))}</pre>`;
        return;
      }
      pageEl.innerHTML = `<iframe class="browser-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" referrerpolicy="no-referrer" src="${escapeAttr(url)}"></iframe>`;
      setStatus('載入中。部分網站會因 CSP/X-Frame-Options 拒絕 iframe，這是瀏覽器安全限制。');
      const iframe = pageEl.querySelector('iframe');
      iframe.onload = () => setStatus('已載入：' + url);
    }
    function addBookmark() {
      const tab = current();
      if (!tab || tab.url === homeUrl) return;
      const title = prompt('書籤名稱：', tab.title);
      if (!title) return;
      bookmarks.push({ title, url: tab.url });
      localStorage.setItem('pios_bookmarks', JSON.stringify(bookmarks));
      renderBookmarks();
    }

    document.getElementById(`br-back-${winId}`).onclick = () => {
      const tab = current();
      if (!tab || !tab.back.length) return;
      tab.forward.push(tab.url);
      tab.url = tab.back.pop();
      render();
    };
    document.getElementById(`br-fwd-${winId}`).onclick = () => {
      const tab = current();
      if (!tab || !tab.forward.length) return;
      tab.back.push(tab.url);
      tab.url = tab.forward.pop();
      render();
    };
    document.getElementById(`br-refresh-${winId}`).onclick = render;
    document.getElementById(`br-home-${winId}`).onclick = () => navigate(homeUrl);
    document.getElementById(`br-go-${winId}`).onclick = () => navigate(urlEl.value);
    document.getElementById(`br-star-${winId}`).onclick = addBookmark;
    urlEl.onkeydown = e => { if (e.key === 'Enter') navigate(urlEl.value); };

    window[`_br_${winId}`] = {
      newTab: () => createTab(homeUrl),
      closeTab,
      switchTab,
      navigate,
      removeBookmark(i) {
        bookmarks.splice(i, 1);
        localStorage.setItem('pios_bookmarks', JSON.stringify(bookmarks));
        renderBookmarks();
      }
    };
    createTab(args.url || homeUrl);
  },

  onClose(winId) { delete window[`_br_${winId}`]; }
});

function readBookmarks() {
  try { return JSON.parse(localStorage.getItem('pios_bookmarks') || '[]'); }
  catch { return []; }
}
function injectBrowserStyle() {
  if (document.getElementById('browser-v2-style')) return;
  const style = document.createElement('style');
  style.id = 'browser-v2-style';
  style.textContent = `
    .browser-v2{display:flex;flex-direction:column;height:100%;background:#111827;color:var(--text)}
    .browser-tabs,.browser-toolbar,.browser-bookmarks{display:flex;align-items:center;gap:4px;padding:5px 8px;border-bottom:1px solid var(--border);flex-shrink:0}
    .browser-tab,.browser-toolbar button,.browser-bookmarks button,.browser-home button{border:none;border-radius:4px;background:rgba(255,255,255,.08);color:var(--text);padding:6px 10px;cursor:pointer}
    .browser-tab.active{background:rgba(0,120,212,.55)}
    .browser-tab b{margin-left:8px;color:var(--text-dim)}
    .browser-toolbar input{flex:1;border:1px solid var(--border);border-radius:18px;background:rgba(0,0,0,.35);color:var(--text);padding:7px 12px;outline:none}
    .browser-page{flex:1;position:relative;overflow:hidden;background:#fff;color:#111}
    .browser-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
    .browser-status{padding:3px 10px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border);background:#0d1320}
    .browser-home{padding:32px;display:grid;gap:18px;align-content:start;background:#101827;color:#eef}
    .browser-home form{display:flex;gap:8px;max-width:720px}.browser-home input{flex:1;padding:12px;border-radius:8px;border:1px solid var(--border);background:rgba(0,0,0,.35);color:#fff}
    .browser-home-grid{display:flex;flex-wrap:wrap;gap:8px}.browser-pre{margin:0;padding:20px;background:#101827;color:#cde;height:100%;overflow:auto}
  `;
  document.head.appendChild(style);
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function escapeAttr(value) { return escapeHtml(value); }
function escapeJs(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
