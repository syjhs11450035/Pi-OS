/**
 * πOS 虛擬機 (VM)
 * 整合 v86 WebAssembly x86 模擬器
 */
const _vmIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

OS.registerApp('vm', {
  id: 'vm',
  title: '虛擬機',
  iconChar: 'VM',
  iconSvg: _vmIcon,
  width: 800,
  height: 560,

  render(body, args, winId) {
    let v86instance = null;
    let running = false;

    const presets = {
      freedos: {
        label: 'FreeDOS (執行 .exe)',
        cdrom: 'https://copy.sh/v86/images/freedos722.img',
        memory: 32,
        desc: '可執行 DOS 程式，支援 .exe/.com 檔案'
      },
      linux: {
        label: 'Linux (buildroot)',
        cdrom: 'https://copy.sh/v86/images/buildroot-bzimage.bin',
        bzimage: true,
        memory: 64,
        desc: '輕量 Linux，支援 ELF 二進位'
      },
      kolibri: {
        label: 'KolibriOS',
        cdrom: 'https://copy.sh/v86/images/kolibri.img',
        memory: 32,
        desc: '極輕量圖形 OS，純組語撰寫'
      }
    };

    body.innerHTML = `
      <div class="vm-wrap">
        <div class="vm-toolbar">
          <select id="vm-preset-${winId}">
            ${Object.entries(presets).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
          <button onclick="_vm_${winId}.start()">&#9654; 啟動</button>
          <button onclick="_vm_${winId}.stop()">&#9632; 停止</button>
          <button onclick="_vm_${winId}.reset()">&#8635; 重置</button>
          <button onclick="_vm_${winId}.fullscreen()">&#x26F6; 全螢幕</button>
          <button onclick="_vm_${winId}.loadISO()">載入 ISO</button>
          <span id="vm-state-${winId}" style="font-size:12px;color:#888;margin-left:8px">未啟動</span>
        </div>
        <div class="vm-screen" id="vm-screen-${winId}">
          <div id="vm-placeholder-${winId}" style="text-align:center;color:#555;padding:40px;">
            <div style="margin-bottom:16px;">
              <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="#444" stroke-width="1.5">
                <rect x="4" y="8" width="56" height="38" rx="4"/>
                <line x1="20" y1="54" x2="44" y2="54"/>
                <line x1="32" y1="46" x2="32" y2="54"/>
              </svg>
            </div>
            <div style="font-size:16px;margin-bottom:8px;color:#666">x86 虛擬機</div>
            <div style="font-size:12px;color:#444;max-width:400px;line-height:1.6">
              使用 <strong style="color:#4af">WebAssembly v86</strong> 在瀏覽器中執行真實 x86 程式碼。<br>
              選擇作業系統後點擊「啟動」。<br><br>
              <span style="color:#fa4">首次啟動需下載映像檔（約 5-30MB）</span>
            </div>
            <div style="margin-top:20px;font-size:11px;color:#333;line-height:1.8">
              支援技術：WebAssembly · SharedArrayBuffer · Canvas VGA<br>
              可執行：DOS .exe · Linux ELF · ARM (規劃中)
            </div>
          </div>
        </div>
        <div class="vm-status" id="vm-status-${winId}">就緒 | 選擇作業系統後點擊啟動</div>
      </div>
    `;

    const stateEl  = document.getElementById(`vm-state-${winId}`);
    const statusEl = document.getElementById(`vm-status-${winId}`);
    const screenEl = document.getElementById(`vm-screen-${winId}`);

    function setStatus(msg, color = '#888') {
      if (statusEl) statusEl.textContent = msg;
      if (stateEl)  { stateEl.textContent = msg; stateEl.style.color = color; }
    }

    function loadV86Script() {
      return new Promise((resolve, reject) => {
        if (window.V86Starter) { resolve(); return; }
        setStatus('下載 v86 引擎...', '#fa4');
        const script = document.createElement('script');
        script.src = 'https://copy.sh/v86/build/libv86.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('無法載入 v86 引擎'));
        document.head.appendChild(script);
      });
    }

    async function startVM() {
      if (running) return;
      const presetKey = document.getElementById(`vm-preset-${winId}`).value;
      const preset = presets[presetKey];

      try {
        setStatus('載入 v86 引擎...', '#fa4');
        await loadV86Script();

        const placeholder = document.getElementById(`vm-placeholder-${winId}`);
        if (placeholder) placeholder.remove();

        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'max-width:100%;max-height:100%;image-rendering:pixelated;cursor:default;';
        screenEl.appendChild(canvas);

        setStatus('初始化虛擬機...', '#fa4');

        const config = {
          wasm_path: 'https://copy.sh/v86/build/v86.wasm',
          memory_size: (preset.memory || 32) * 1024 * 1024,
          vga_memory_size: 2 * 1024 * 1024,
          screen_container: screenEl,
          bios:     { url: 'https://copy.sh/v86/bios/seabios.bin' },
          vga_bios: { url: 'https://copy.sh/v86/bios/vgabios.bin' },
          autostart: true,
        };

        if (preset.bzimage) {
          config.bzimage = { url: preset.cdrom };
          config.cmdline = 'console=ttyS0 root=/dev/sda rw init=/sbin/init';
        } else {
          config.fda = { url: preset.cdrom };
        }

        v86instance = new V86Starter(config);
        running = true;

        v86instance.add_listener('emulator-ready',   () => setStatus('執行中 — ' + preset.label, '#4f4'));
        v86instance.add_listener('emulator-stopped',  () => { setStatus('已停止', '#f44'); running = false; });

      } catch (e) {
        setStatus('錯誤：' + e.message, '#f44');
        console.error('VM Error:', e);
        screenEl.innerHTML = `
          <div style="padding:20px;color:#f88;font-size:13px;line-height:1.8">
            <div style="font-size:18px;margin-bottom:8px;font-weight:500">無法啟動虛擬機</div>
            <div>${e.message}</div>
            <div style="margin-top:12px;color:#888;font-size:12px">
              可能原因：<br>
              - 需要 HTTPS 環境（SharedArrayBuffer 限制）<br>
              - 需要設定 COOP/COEP HTTP 標頭<br>
              - 網路無法連線到 copy.sh<br><br>
              本地開發請使用：<br>
              <code style="color:#4af">npx serve -H '{"Cross-Origin-Opener-Policy":"same-origin","Cross-Origin-Embedder-Policy":"require-corp"}'</code>
            </div>
          </div>
        `;
      }
    }

    window[`_vm_${winId}`] = {
      start: startVM,
      stop() {
        if (v86instance) { v86instance.stop(); running = false; setStatus('已停止', '#f44'); }
      },
      reset() {
        if (v86instance) { v86instance.restart(); setStatus('重置中...', '#fa4'); }
      },
      async loadISO() {
        const url = prompt('輸入 ISO/IMG 映像檔 URL：', 'https://');
        if (!url) return;
        const sel = document.getElementById(`vm-preset-${winId}`);
        presets['custom'] = { label: '自訂映像', cdrom: url, memory: 64 };
        const opt = document.createElement('option');
        opt.value = 'custom'; opt.textContent = '自訂：' + url.split('/').pop();
        sel.appendChild(opt);
        sel.value = 'custom';
      },
      fullscreen() {
        if (screenEl.requestFullscreen) screenEl.requestFullscreen();
      }
    };
  },

  onClose(winId) { delete window[`_vm_${winId}`]; }
});
