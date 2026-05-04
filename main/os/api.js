/**
 * πOS Unified API
 * 統一提供 app 呼叫系統能力的入口，避免各 app 直接耦合底層模組。
 */
const PiOS = (() => {
  const commands = {};
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    OS.emit('pwa:install_available', {});
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    OS.emit('pwa:installed', {});
    OS.notify('πOS 已安裝', '可以從主畫面或桌面啟動。');
  });

  function normalizePath(path, cwd = '/') {
    if (!path || path === '~') return '/Users/User';
    const raw = path.startsWith('/') ? path : `${cwd}/${path}`;
    const stack = [];
    raw.split('/').forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') stack.pop();
      else stack.push(part);
    });
    return '/' + stack.join('/');
  }

  const fs = {
    normalizePath,
    get: path => VFS.get(path),
    exists: path => VFS.exists(path),
    list: path => VFS.listDir(path),
    readText: path => VFS.readFile(path),
    writeText: (path, content) => VFS.writeFile(path, content),
    readBinary: path => VFS.readBinary(path),
    writeBinary: (path, buffer) => VFS.writeBinary(path, buffer),
    mkdir: path => VFS.mkdir(path),
    remove: path => VFS.remove(path),
    rename: (oldPath, newPath) => VFS.rename(oldPath, newPath),
    copy: (srcPath, dstPath) => VFS.copy(srcPath, dstPath),
  };

  const app = {
    register: (id, def) => OS.registerApp(id, def),
    launch: (id, args = {}) => OS.launch(id, args),
    list: () => OS.getApps(),
    info: id => AppLoader.getInfo(id),
  };

  const windowApi = {
    open: (def, args = {}) => WM.open(def, args),
    close: id => WM.close(id),
    focus: id => WM.focus(id),
    minimize: id => WM.minimize(id),
    restore: id => WM.restore(id),
    maximize: id => WM.toggleMaximize(id),
    get: id => WM.getWindow(id),
    list: () => WM.getAllWindows(),
  };

  const process = {
    list: () => OS.getProcesses(),
    kill: pidOrWinId => OS.kill(pidOrWinId),
  };

  const clipboard = {
    read: () => OS.readClipboard(),
    write: data => OS.writeClipboard(data),
  };

  const settings = {
    get: (key, fallback = null) => OS.getSetting(key, fallback),
    set: (key, value) => OS.setSetting(key, value),
    getRaw: (key, fallback = null) => localStorage.getItem(key) ?? fallback,
    setRaw: (key, value) => localStorage.setItem(key, value),
  };

  const ui = {
    notify: (title, body = '', opts = {}) => OS.notify(title, body, opts),
    contextMenu: (x, y, items) => Desktop.showContextMenu(x, y, items),
    refreshDesktop: () => Desktop.renderIcons(),
    applySettings: () => Desktop.applyUserSettings(),
    render(schema, target, context = {}) {
      const root = typeof target === 'string' ? document.querySelector(target) : target;
      if (!root) throw new Error('PiOS.ui.render target not found');
      root.innerHTML = '';
      root.appendChild(renderNode(schema, context));
    },
  };

  const system = {
    shutdown: () => OS.shutdown(),
    restart: () => OS.restart(),
    info() {
      return {
        name: 'πOS',
        version: '1.0.0',
        language: i18n.getLang(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        deviceMemory: navigator.deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        webAssembly: typeof WebAssembly !== 'undefined',
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
      };
    }
  };

  const pwa = {
    async init() {
      if (!('serviceWorker' in navigator)) return { supported: false, reason: 'service_worker_unavailable' };
      try {
      const registration = await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
        OS.emit('pwa:ready', { registration });
        return { supported: true, registration };
      } catch (e) {
        OS.emit('pwa:error', { error: e });
        return { supported: false, reason: e.message };
      }
    },
    canInstall() {
      return !!deferredInstallPrompt;
    },
    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    },
    status() {
      return {
        serviceWorker: 'serviceWorker' in navigator,
        controller: !!navigator.serviceWorker?.controller,
        canInstall: !!deferredInstallPrompt,
        standalone: this.isStandalone(),
        online: navigator.onLine,
      };
    },
    async install() {
      if (!deferredInstallPrompt) {
        OS.notify('加入主畫面', '如果瀏覽器沒有顯示安裝提示，請使用瀏覽器選單中的「加入主畫面」。');
        return { installed: false, reason: 'prompt_unavailable' };
      }
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return { installed: choice.outcome === 'accepted', outcome: choice.outcome };
    },
  };

  function registerCommand(name, handler, meta = {}) {
    commands[name] = { handler, meta };
  }

  async function exec(commandLine, context = {}) {
    const tokens = parseArgs(commandLine);
    if (!tokens.length) return { code: 0, output: '' };
    const name = tokens[0];
    const command = commands[name];
    if (!command) return { code: 127, output: `${name}: command not found` };
    try {
      const result = await command.handler(tokens.slice(1), context);
      if (typeof result === 'string') return { code: 0, output: result };
      return { code: 0, output: '', ...(result || {}) };
    } catch (e) {
      return { code: 1, output: e.message || String(e) };
    }
  }

  function parseArgs(raw) {
    const tokens = [];
    let cur = '', inQuote = false, quote = '';
    for (const char of String(raw)) {
      if (inQuote) {
        if (char === quote) inQuote = false;
        else cur += char;
      } else if (char === '"' || char === "'") {
        inQuote = true;
        quote = char;
      } else if (/\s/.test(char)) {
        if (cur) { tokens.push(cur); cur = ''; }
      } else {
        cur += char;
      }
    }
    if (cur) tokens.push(cur);
    return tokens;
  }

  function renderNode(schema, context) {
    if (!schema) return document.createTextNode('');
    if (typeof schema === 'string') return document.createTextNode(t(schema));

    const type = schema.type || 'panel';
    if (type === 'panel') {
      const el = document.createElement('div');
      el.className = 'api-panel';
      if (schema.title) {
        const h = document.createElement('h2');
        h.textContent = t(schema.title);
        el.appendChild(h);
      }
      (schema.children || []).forEach(child => el.appendChild(renderNode(child, context)));
      return el;
    }

    if (type === 'row') {
      const row = document.createElement('div');
      row.className = 'settings-row api-row';
      if (schema.label) {
        const label = document.createElement('label');
        label.textContent = t(schema.label);
        row.appendChild(label);
      }
      const content = document.createElement('div');
      content.className = 'api-row-content';
      (schema.children || []).forEach(child => content.appendChild(renderNode(child, context)));
      row.appendChild(content);
      return row;
    }

    if (type === 'text') {
      const span = document.createElement('span');
      span.textContent = t(schema.text || '');
      return span;
    }

    if (type === 'button') {
      const btn = document.createElement('button');
      btn.className = 'api-button';
      btn.textContent = t(schema.label || 'Button');
      btn.onclick = () => runUiAction(schema.onClick, btn.value, context);
      return btn;
    }

    if (type === 'input') {
      const input = document.createElement('input');
      input.type = schema.inputType || 'text';
      input.value = getUiValue(schema, '');
      input.placeholder = schema.placeholder ? t(schema.placeholder) : '';
      input.oninput = () => setUiValue(schema, input.value, context);
      return input;
    }

    if (type === 'select') {
      const select = document.createElement('select');
      (schema.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = t(opt.label);
        select.appendChild(o);
      });
      select.value = getUiValue(schema, schema.options?.[0]?.value || '');
      select.onchange = () => setUiValue(schema, select.value, context);
      return select;
    }

    if (type === 'toggle') {
      const label = document.createElement('label');
      label.className = 'toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!getUiValue(schema, schema.default ?? false);
      input.onchange = () => setUiValue(schema, input.checked, context);
      const slider = document.createElement('span');
      slider.className = 'toggle-slider';
      label.append(input, slider);
      return label;
    }

    if (type === 'slider') {
      const wrap = document.createElement('div');
      wrap.className = 'api-slider';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = schema.min ?? 0;
      input.max = schema.max ?? 100;
      input.step = schema.step ?? 1;
      input.value = getUiValue(schema, schema.default ?? input.min);
      const value = document.createElement('span');
      value.textContent = schema.suffix ? `${input.value}${schema.suffix}` : input.value;
      input.oninput = () => {
        value.textContent = schema.suffix ? `${input.value}${schema.suffix}` : input.value;
        setUiValue(schema, Number(input.value), context);
      };
      wrap.append(input, value);
      return wrap;
    }

    const fallback = document.createElement('div');
    fallback.textContent = `Unknown schema type: ${type}`;
    return fallback;
  }

  function getUiValue(schema, fallback) {
    if (schema.setting) return settings.get(schema.setting, fallback);
    if (schema.value !== undefined) return schema.value;
    return fallback;
  }

  function setUiValue(schema, value, context) {
    if (schema.setting) settings.set(schema.setting, value);
    runUiAction(schema.onChange, value, context);
  }

  function runUiAction(action, value, context) {
    if (!action) return;
    if (typeof action === 'function') return action(value, context);
    const fn = action.split('.').reduce((obj, key) => obj && obj[key], context.actions || {});
    if (typeof fn === 'function') fn(value, context);
  }

  function t(key) {
    if (typeof key !== 'string') return String(key ?? '');
    return key.includes('.') ? i18n.t(key) : key;
  }

  function resolveContextPath(path, context = {}) {
    return normalizePath(path, context.cwd || '/');
  }

  function registerBuiltInCommands() {
    registerCommand('help', async () => {
      return Object.entries(commands)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, cmd]) => `${name.padEnd(10)} ${cmd.meta.description || ''}`)
        .join('\n');
    }, { description: '列出可用指令' });

    registerCommand('ls', async (args, ctx) => {
      const path = resolveContextPath(args[0] || '.', ctx);
      const items = await fs.list(path);
      if (!items.length) return '（空目錄）';
      return items
        .sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'dir' ? -1 : 1))
        .map(i => `${i.type === 'dir' ? '[D]' : '[F]'} ${i.name}`)
        .join('\n');
    }, { description: '列出目錄內容' });

    registerCommand('cd', async (args, ctx) => {
      const path = resolveContextPath(args[0] || '~', ctx);
      const item = await fs.get(path);
      if (!item) throw new Error(`${path}: 沒有此目錄`);
      if (item.type !== 'dir') throw new Error(`${path}: 不是目錄`);
      if (ctx.setCwd) ctx.setCwd(path);
      return '';
    }, { description: '切換目錄' });

    registerCommand('pwd', async (_, ctx) => ctx.cwd || '/', { description: '顯示目前路徑' });

    registerCommand('cat', async (args, ctx) => {
      if (!args[0]) throw new Error('用法：cat <檔案>');
      return fs.readText(resolveContextPath(args[0], ctx));
    }, { description: '顯示文字檔內容' });

    registerCommand('echo', async args => args.join(' '), { description: '輸出文字' });

    registerCommand('mkdir', async (args, ctx) => {
      if (!args[0]) throw new Error('用法：mkdir <目錄>');
      const path = resolveContextPath(args[0], ctx);
      await fs.mkdir(path);
      return `已建立目錄：${path}`;
    }, { description: '建立目錄' });

    registerCommand('touch', async (args, ctx) => {
      if (!args[0]) throw new Error('用法：touch <檔案>');
      const path = resolveContextPath(args[0], ctx);
      if (!(await fs.exists(path))) await fs.writeText(path, '');
      return path;
    }, { description: '建立空檔案' });

    registerCommand('rm', async (args, ctx) => {
      const targets = args.filter(a => !a.startsWith('-'));
      if (!targets[0]) throw new Error('用法：rm [-r] <路徑>');
      const path = resolveContextPath(targets[0], ctx);
      const item = await fs.get(path);
      if (!item) throw new Error(`${path}: 不存在`);
      if (item.type === 'dir' && !args.includes('-r') && !args.includes('-rf')) throw new Error(`${path}: 是目錄，請使用 -r`);
      await fs.remove(path);
      return `已刪除：${path}`;
    }, { description: '刪除檔案或目錄' });

    registerCommand('cp', async (args, ctx) => {
      if (args.length < 2) throw new Error('用法：cp <來源> <目標>');
      const src = resolveContextPath(args[0], ctx);
      const dst = resolveContextPath(args[1], ctx);
      await fs.copy(src, dst);
      return `已複製：${src} -> ${dst}`;
    }, { description: '複製檔案或目錄' });

    registerCommand('mv', async (args, ctx) => {
      if (args.length < 2) throw new Error('用法：mv <來源> <目標>');
      const src = resolveContextPath(args[0], ctx);
      const dst = resolveContextPath(args[1], ctx);
      await fs.rename(src, dst);
      return `已移動：${src} -> ${dst}`;
    }, { description: '移動或重新命名' });

    registerCommand('write', async (args, ctx) => {
      if (args.length < 2) throw new Error('用法：write <檔案> <內容>');
      const path = resolveContextPath(args[0], ctx);
      await fs.writeText(path, args.slice(1).join(' '));
      return `已寫入：${path}`;
    }, { description: '寫入文字檔' });

    registerCommand('open', async (args, ctx) => {
      if (!args[0]) throw new Error('用法：open <應用程式|檔案>');
      const maybePath = resolveContextPath(args[0], ctx);
      const item = await fs.get(maybePath);
      if (item) {
        if (item.type === 'dir') app.launch('explorer', { path: item.path });
        else openSystemFile(item);
        return `已開啟：${item.path}`;
      }
      app.launch(args[0]);
      return `已啟動：${args[0]}`;
    }, { description: '開啟 app 或檔案' });

    registerCommand('ps', async () => {
      const rows = Object.values(process.list());
      if (!rows.length) return '沒有執行中的程序';
      return rows.map(p => `${String(p.pid).padStart(4)} ${p.state.padEnd(10)} ${p.appId} ${p.title}`).join('\n');
    }, { description: '列出程序' });

    registerCommand('kill', async args => {
      if (!args[0]) throw new Error('用法：kill <pid|winId>');
      return process.kill(args[0]) ? `已結束：${args[0]}` : `找不到程序：${args[0]}`;
    }, { description: '結束程序' });

    registerCommand('clip', async args => {
      if (args.length) {
        await clipboard.write(args.join(' '));
        return '已寫入剪貼簿';
      }
      const data = await clipboard.read();
      return typeof data === 'string' ? data : JSON.stringify(data ?? '');
    }, { description: '讀寫剪貼簿' });

    registerCommand('sysinfo', async () => {
      const info = system.info();
      return Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n');
    }, { description: '顯示系統資訊' });

    registerCommand('date', async () => new Date().toLocaleString('zh-TW'), { description: '顯示日期時間' });
    registerCommand('whoami', async () => 'user', { description: '顯示目前使用者' });
    registerCommand('clear', async () => ({ clear: true }), { description: '清除終端畫面' });
  }

  function openSystemFile(item) {
    const ext = item.name.split('.').pop().toLowerCase();
    if (['txt','md','js','ts','css','html','json','log','sh','py','c','cpp','rs','java','ini','cfg'].includes(ext)) {
      app.launch('notepad', { path: item.path });
    } else if (['exe','com','bin','img','iso'].includes(ext)) {
      app.launch('vm', { file: item.path });
    } else if (['png','jpg','jpeg','gif','svg','webp','bmp'].includes(ext)) {
      app.launch('explorer', { path: item.parent || '/' });
      ui.notify('圖片檔案', `${item.name} 可在檔案總管中預覽`);
    } else {
      ui.notify('無法開啟檔案', `不支援的檔案類型：${item.name}`);
    }
  }

  registerBuiltInCommands();

  return {
    fs,
    app,
    window: windowApi,
    process,
    clipboard,
    settings,
    ui,
    system,
    pwa,
    command: { register: registerCommand, exec, parseArgs, list: () => ({ ...commands }) },
  };
})();
