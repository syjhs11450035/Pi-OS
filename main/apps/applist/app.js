/**
 * πOS 應用清單
 * 顯示所有公開和隱藏應用，支援應用管理
 */
const _applistIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

PiOS.app.register('applist', {
  id: 'applist',
  title: '應用清單',
  iconChar: 'AL',
  iconSvg: _applistIcon,
  width: 700,
  height: 600,

  render(body, args, winId) {
    // 獲取所有已註冊應用
    const allApps = PiOS.app.listAll ? PiOS.app.listAll() : [];
    
    // 區分公開和隱藏應用
    const publicApps = allApps.filter(app => !app.hidden && app.id !== 'applist');
    const hiddenApps = allApps.filter(app => app.hidden);

    body.innerHTML = `
      <div class="applist-wrap">
        <div class="applist-header">
          <div class="applist-title">應用清單</div>
          <div class="applist-info">已安裝 ${allApps.length} 個應用，其中 ${hiddenApps.length} 個隱藏</div>
        </div>

        <div class="applist-section">
          <div class="applist-section-title">公開應用</div>
          <div class="applist-grid">${publicApps.map(app => `
            <div class="applist-card" data-app="${app.id}">
              <div class="applist-card-icon">${getAppIcon(app)}</div>
              <div class="applist-card-info">
                <div class="applist-card-title">${app.title || app.name || app.id}</div>
                <div class="applist-card-desc">${app.desc || app.description || '無描述'}</div>
              </div>
              <div class="applist-card-btn">
                <button class="applist-btn-launch" data-app="${app.id}">啟動</button>
              </div>
            </div>
          `).join('')}</div>
        </div>

        ${hiddenApps.length > 0 ? `
        <div class="applist-section">
          <div class="applist-section-title">隱藏應用</div>
          <div class="applist-grid">${hiddenApps.map(app => `
            <div class="applist-card applist-card-hidden" data-app="${app.id}">
              <div class="applist-card-icon">${getAppIcon(app)}</div>
              <div class="applist-card-info">
                <div class="applist-card-title">${app.title || app.name || app.id}</div>
                <div class="applist-card-desc">${app.desc || app.description || '無描述'}</div>
              </div>
              <div class="applist-card-btn">
                <button class="applist-btn-launch" data-app="${app.id}">啟動</button>
              </div>
            </div>
          `).join('')}</div>
        </div>
        ` : ''}
      </div>
    `;

    if (!document.getElementById('applist-style')) {
      const style = document.createElement('style');
      style.id = 'applist-style';
      style.textContent = `
        .applist-wrap { padding: 18px; display: flex; flex-direction: column; gap: 18px; height: 100%; overflow-y: auto; }
        .applist-header { padding: 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; }
        .applist-title { font-size: 20px; font-weight: 700; color: #fff; }
        .applist-info { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 8px; }
        .applist-section { display: flex; flex-direction: column; gap: 10px; }
        .applist-section-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.8); text-transform: uppercase; letter-spacing: 1px; }
        .applist-grid { display: flex; flex-direction: column; gap: 8px; }
        .applist-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; transition: background .2s; }
        .applist-card:hover { background: rgba(255,255,255,.08); }
        .applist-card-hidden { opacity: 0.7; }
        .applist-card-icon { font-size: 24px; min-width: 32px; text-align: center; }
        .applist-card-info { flex: 1; }
        .applist-card-title { font-size: 14px; font-weight: 600; color: #fff; }
        .applist-card-desc { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 3px; }
        .applist-card-btn { display: flex; gap: 6px; }
        .applist-btn-launch { padding: 6px 12px; border: none; border-radius: 6px; background: #0078d4; color: #fff; cursor: pointer; font-size: 12px; transition: background .2s; }
        .applist-btn-launch:hover { background: #1a85ff; }
      `;
      document.head.appendChild(style);
    }

    // 綁定啟動按鈕
    body.querySelectorAll('.applist-btn-launch').forEach(btn => {
      btn.onclick = () => {
        const appId = btn.dataset.app;
        PiOS.app.launch(appId, {}, true);
      };
    });
  }
});

// 取得應用圖示
function getAppIcon(app) {
  const icons = {
    'explorer': '📁',
    'notepad': '📝',
    'terminal': '⌨️',
    'browser': '🌐',
    'vm': '🖥️',
    'settings': '⚙️',
    'calculator': '🧮',
    'games': '🎮',
    'store': '🛍️',
    '2048': '🧩',
    'minesweeper': '💣',
    'solitaire': '🃏',
    'applist': '📋'
  };
  return icons[app.id] || (app.iconChar ? app.iconChar : '📦');
}
