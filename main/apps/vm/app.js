/**
 * πOS VM v2
 * 真 v86 啟動器、環境診斷、VFS 映像檔支援與明確限制回報。
 */
const _vmIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

PiOS.app.register('vm', {
  id: 'vm',
  title: '虛擬機',
  iconChar: 'VM',
  iconSvg: _vmIcon,
  width: 900,
  height: 620,

  render(body, args, winId) {
    let instance = null;
    let imageObjectUrl = null;
    const presets = {
      freedos: { label: 'FreeDOS', media: 'fda', url: 'https://copy.sh/v86/images/freedos722.img', memory: 32 },
      kolibri: { label: 'KolibriOS', media: 'fda', url: 'https://copy.sh/v86/images/kolibri.img', memory: 64 },
      linux: { label: 'Buildroot Linux', media: 'bzimage', url: 'https://copy.sh/v86/images/buildroot-bzimage.bin', memory: 128 }
    };

    body.innerHTML = `
      <div class="vm-wrap">
        <div class="vm-toolbar">
          <select id="vm-preset-${winId}">${Object.entries(presets).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('')}</select>
          <select id="vm-memory-${winId}">
            <option value="32">32 MB</option><option value="64">64 MB</option><option value="128" selected>128 MB</option><option value="256">256 MB</option>
          </select>
          <button id="vm-start-${winId}">啟動</button>
          <button id="vm-stop-${winId}">停止</button>
          <button id="vm-reset-${winId}">重置</button>
          <button id="vm-vfs-${winId}">載入 VFS 映像</button>
          <button id="vm-full-${winId}">全螢幕</button>
          <span id="vm-state-${winId}" style="font-size:12px;color:#888;margin-left:8px">未啟動</span>
        </div>
        <div class="vm-screen" id="vm-screen-${winId}">
          <div class="vm-diagnostics" id="vm-diag-${winId}"></div>
        </div>
        <div class="vm-status" id="vm-status-${winId}">就緒</div>
      </div>
    `;

    const screen = document.getElementById(`vm-screen-${winId}`);
    const status = document.getElementById(`vm-status-${winId}`);
    const state = document.getElementById(`vm-state-${winId}`);
    const diag = document.getElementById(`vm-diag-${winId}`);

    function setStatus(text, color = '#888') {
      status.textContent = text;
      state.textContent = text;
      state.style.color = color;
    }
    function renderDiagnostics() {
      const pwa = PiOS.pwa.status();
      const info = PiOS.system.info();
      diag.innerHTML = `
        <h3>VM 環境診斷</h3>
        <div>WebAssembly：${info.webAssembly ? '支援' : '不支援'}</div>
        <div>SharedArrayBuffer：${info.sharedArrayBuffer ? '支援' : '不支援，部分映像效能受限'}</div>
        <div>PWA/Service Worker：${pwa.serviceWorker ? '可用' : '不可用'}</div>
        <div>狀態：VM 會載入真實 v86 與映像檔；網路、HTTPS、COOP/COEP 會影響啟動。</div>
        ${args.file ? `<div>待載入檔案：${args.file}</div>` : ''}
      `;
    }
    function loadV86Script() {
      const urls = [
        'https://copy.sh/v86/build/libv86.js',
        'https://cdn.jsdelivr.net/npm/v86/build/libv86.js',
        'https://unpkg.com/v86/build/libv86.js'
      ];
      return new Promise((resolve, reject) => {
        if (window.V86Starter || window.V86) return resolve();

        let index = 0;
        function tryLoad() {
          const script = document.createElement('script');
          script.src = urls[index];
          script.async = false;
          script.onload = () => {
            if (window.V86Starter || window.V86) {
              resolve();
            } else {
              index += 1;
              if (index < urls.length) {
                tryLoad();
              } else {
                reject(new Error('載入 v86 引擎完成，但 V86Starter / V86 未定義'));
              }
            }
          };
          script.onerror = () => {
            index += 1;
            if (index < urls.length) {
              tryLoad();
            } else {
              reject(new Error('無法下載 v86 引擎，請檢查網路或 CDN'));
            }
          };
          document.head.appendChild(script);
        }
        tryLoad();
      });
    }
    async function resolveMedia(preset) {
      if (!args.file) return { [preset.media]: { url: preset.url } };
      const item = await PiOS.fs.get(args.file);
      if (!item || item.type !== 'file') throw new Error('VFS 映像檔不存在');
      const buffer = await PiOS.fs.readBinary(args.file);
      imageObjectUrl = URL.createObjectURL(new Blob([buffer]));
      const ext = item.name.split('.').pop().toLowerCase();
      if (ext === 'iso') return { cdrom: { url: imageObjectUrl } };
      return { fda: { url: imageObjectUrl } };
    }
    async function start() {
      if (instance) return;
      const preset = presets[document.getElementById(`vm-preset-${winId}`).value];
      const memory = Number(document.getElementById(`vm-memory-${winId}`).value || preset.memory);
      try {
        setStatus('載入 v86...', '#fa4');
        await loadV86Script();
        screen.innerHTML = '';
        const config = {
          wasm_path: 'https://copy.sh/v86/build/v86.wasm',
          memory_size: memory * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          screen_container: screen,
          bios: { url: 'https://copy.sh/v86/bios/seabios.bin' },
          vga_bios: { url: 'https://copy.sh/v86/bios/vgabios.bin' },
          autostart: true,
          ...(await resolveMedia(preset))
        };
        if (preset.media === 'bzimage' && !args.file) {
          config.cmdline = 'console=ttyS0 root=/dev/sda rw init=/sbin/init';
        }
        const V86Ctor = window.V86Starter || window.V86;
        if (!V86Ctor) throw new Error('v86 引擎載入完成，但找不到 V86Starter 或 V86');
        instance = new V86Ctor(config);
        instance.add_listener('emulator-ready', () => setStatus('執行中', '#4f4'));
        instance.add_listener('emulator-stopped', () => setStatus('已停止', '#f44'));
      } catch (e) {
        renderDiagnostics();
        setStatus('啟動失敗：' + e.message, '#f44');
        PiOS.ui.notify('VM 啟動失敗', e.message);
      }
    }
    function stop() {
      if (!instance) return;
      instance.stop();
      setStatus('已停止', '#f44');
    }
    function reset() {
      if (!instance) return;
      instance.restart();
      setStatus('重置中', '#fa4');
    }

    document.getElementById(`vm-start-${winId}`).onclick = start;
    document.getElementById(`vm-stop-${winId}`).onclick = stop;
    document.getElementById(`vm-reset-${winId}`).onclick = reset;
    document.getElementById(`vm-full-${winId}`).onclick = () => screen.requestFullscreen?.();
    document.getElementById(`vm-vfs-${winId}`).onclick = () => {
      const path = prompt('輸入 VFS ISO/IMG 路徑：', args.file || '/Downloads/disk.img');
      if (!path) return;
      args.file = path;
      renderDiagnostics();
    };

    renderDiagnostics();
    window[`_vm_${winId}`] = {
      cleanup() {
        try { instance?.stop?.(); } catch {}
        if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
      }
    };
  },

  onClose(winId) {
    window[`_vm_${winId}`]?.cleanup?.();
    delete window[`_vm_${winId}`];
  }
});
