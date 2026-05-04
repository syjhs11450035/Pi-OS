/**
 * πOS App Store
 * 展示系統應用與推薦應用，支援快速啟動。
 */
const _storeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 11h18"/><path d="M9 17V7"/><path d="M15 17V7"/></svg>`;

PiOS.app.register('store', {
  id: 'store',
  title: '應用商店',
  iconChar: 'ST',
  iconSvg: _storeIcon,
  width: 700,
  height: 540,

  render(body, args, winId) {
    const catalog = [
      { id: 'calculator', title: '科學計算機', desc: '一般計算、三角學、微積分、函數圖形', badge: '工具' },
      { id: 'games', title: '遊戲中心', desc: '2048、踩地雷、接龍等娛樂遊戲', badge: '娛樂' },
      { id: 'browser', title: '網頁瀏覽器', desc: '開啟網站與內建搜尋功能', badge: '工具' },
      { id: 'vm', title: '虛擬機', desc: '在瀏覽器中執行 x86 作業系統與程式', badge: '系統' },
      { id: 'explorer', title: '檔案總管', desc: '管理虛擬檔案系統與快速操作', badge: '生產力' },
      { id: 'notepad', title: '記事本', desc: '簡易文字編輯與檔案保存', badge: '工具' },
      { id: 'settings', title: '系統設定', desc: '調整桌面、系統與應用設定', badge: '系統' }
    ];

    body.innerHTML = `
      <div class="store-wrap">
        <div class="store-hero">
          <div>
            <div class="store-title">應用商店</div>
            <div class="store-subtitle">探索 πOS 內建應用，快速啟動與管理系統工具。</div>
          </div>
        </div>
        <div class="store-grid">${catalog.map(app => `
          <div class="store-card">
            <div class="store-card-header">
              <span class="store-card-icon">${app.id === 'calculator' ? '🧮' : app.id === 'games' ? '🎮' : app.id === 'vm' ? '🖥️' : app.id === 'explorer' ? '📁' : app.id === 'notepad' ? '📝' : '⚙️'}</span>
              <span class="store-card-badge">${app.badge}</span>
            </div>
            <div class="store-card-title">${app.title}</div>
            <div class="store-card-desc">${app.desc}</div>
            <div class="store-card-actions"><button data-app="${app.id}">打開</button></div>
          </div>
        `).join('')}</div>
      </div>
    `;

    if (!document.getElementById('store-style')) {
      const style = document.createElement('style');
      style.id = 'store-style';
      style.textContent = `
        .store-wrap { padding: 18px; display: flex; flex-direction: column; gap: 18px; height: 100%; }
        .store-hero { display: flex; align-items: center; justify-content: space-between; padding: 20px 18px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; }
        .store-title { font-size: 24px; font-weight: 700; color: #fff; }
        .store-subtitle { margin-top: 8px; color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.6; }
        .store-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .store-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .store-card-header { display: flex; align-items: center; justify-content: space-between; }
        .store-card-icon { font-size: 28px; }
        .store-card-badge { font-size: 11px; padding: 4px 8px; border-radius: 999px; background: rgba(0,120,212,.18); color: #9fd1ff; }
        .store-card-title { font-size: 16px; font-weight: 600; }
        .store-card-desc { font-size: 13px; color: rgba(255,255,255,.72); line-height: 1.6; flex: 1; }
        .store-card-actions { display: flex; justify-content: flex-end; }
        .store-card-actions button { padding: 8px 12px; border: none; border-radius: 10px; background: #0078d4; color: #fff; cursor: pointer; font-size: 13px; }
        .store-card-actions button:hover { background: #1a85ff; }
      `;
      document.head.appendChild(style);
    }

    body.querySelectorAll('.store-card-actions button').forEach(btn => {
      btn.onclick = () => {
        const appId = btn.dataset.app;
        if (!PiOS.app.info(appId)) {
          PiOS.ui.notify('應用不存在', `應用「${appId}」尚未安裝或無法啟動。`);
          return;
        }
        PiOS.app.launch(appId, {}, true);
      };
    });
  }
});
