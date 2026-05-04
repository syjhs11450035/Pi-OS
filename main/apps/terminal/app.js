/**
 * πOS 終端機
 */
const _termIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;

OS.registerApp('terminal', {
  id: 'terminal',
  title: '終端機',
  iconChar: '>_',
  iconSvg: _termIcon,
  width: 700,
  height: 450,

  render(body, args, winId) {
    let cwd = '/';
    const history = [];
    let histIdx = -1;
    let env = { HOME: '/', USER: 'user', PATH: '/System:/bin', SHELL: '/bin/bash' };

    body.innerHTML = `
      <div class="terminal-wrap">
        <div class="terminal-output" id="term-out-${winId}"></div>
        <div class="terminal-input-row">
          <span class="terminal-prompt" id="term-prompt-${winId}">user@pios:/ $</span>
          <input class="terminal-input" id="term-in-${winId}" autocomplete="off" spellcheck="false">
        </div>
      </div>
    `;

    const out    = document.getElementById(`term-out-${winId}`);
    const input  = document.getElementById(`term-in-${winId}`);
    const prompt = document.getElementById(`term-prompt-${winId}`);

    function updatePrompt() {
      prompt.textContent = `user@pios:${cwd} $`;
    }

    function print(text, cls = '') {
      const line = document.createElement('div');
      line.className = 't-line' + (cls ? ' ' + cls : '');
      line.textContent = text;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    function printHTML(html) {
      const line = document.createElement('div');
      line.className = 't-line';
      line.innerHTML = html;
      out.appendChild(line);
      out.scrollTop = out.scrollHeight;
    }

    function parseArgs(raw) { return PiOS.command.parseArgs(raw); }

    function resolvePath(p) {
      if (!p || p === '~') return env.HOME;
      if (p.startsWith('/')) return normPath(p);
      return normPath(cwd + '/' + p);
    }

    function normPath(p) {
      const parts = p.split('/').filter(Boolean);
      const stack = [];
      for (const part of parts) {
        if (part === '..') stack.pop();
        else if (part !== '.') stack.push(part);
      }
      return '/' + stack.join('/');
    }

    const commands = {
      async help() {
        print('可用指令：', 't-info');
        print('  ls [路徑]           — 列出目錄內容');
        print('  cd <路徑>           — 切換目錄');
        print('  pwd                 — 顯示目前路徑');
        print('  cat <檔案>          — 顯示檔案內容');
        print('  echo <文字>         — 輸出文字');
        print('  mkdir <目錄>        — 建立目錄');
        print('  touch <檔案>        — 建立空檔案');
        print('  rm [-r] <路徑>      — 刪除檔案/目錄');
        print('  cp <來源> <目標>    — 複製檔案或資料夾');
        print('  mv <來源> <目標>    — 移動/重新命名');
        print('  write <檔案> <內容> — 寫入檔案');
        print('  clear               — 清除畫面');
        print('  env                 — 顯示環境變數');
        print('  export K=V          — 設定環境變數');
        print('  open <應用程式|檔案> — 開啟應用程式或檔案');
        print('  sysinfo             — 系統資訊');
        print('  date                — 顯示日期時間');
        print('  whoami              — 顯示使用者');
        print('  history             — 指令歷史');
      },

      async ls(args) {
        const path = resolvePath(args[0]) || cwd;
        try {
          const items = await VFS.listDir(path);
          if (!items.length) { print('（空目錄）'); return; }
          items.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'dir' ? -1 : 1;
          });
          const cols = items.map(i => {
            const color = i.type === 'dir' ? '#4af' : '#ccc';
            const prefix = i.type === 'dir' ? '[D] ' : '[F] ';
            return `<span style="color:${color};margin-right:16px">${prefix}${i.name}</span>`;
          });
          for (let i = 0; i < cols.length; i += 4) {
            printHTML(cols.slice(i, i + 4).join(''));
          }
        } catch (e) { print('ls: ' + e.message, 't-err'); }
      },

      async cd(args) {
        const path = resolvePath(args[0] || env.HOME);
        try {
          const item = await VFS.get(path);
          if (!item) { print(`cd: ${path}: 沒有此目錄`, 't-err'); return; }
          if (item.type !== 'dir') { print(`cd: ${path}: 不是目錄`, 't-err'); return; }
          cwd = path;
          updatePrompt();
        } catch (e) { print('cd: ' + e.message, 't-err'); }
      },

      pwd() { print(cwd); },

      async cat(args) {
        if (!args[0]) { print('用法：cat <檔案>', 't-err'); return; }
        const path = resolvePath(args[0]);
        try {
          const content = await VFS.readFile(path);
          content.split('\n').forEach(line => print(line));
        } catch (e) { print('cat: ' + e.message, 't-err'); }
      },

      echo(args) { print(args.join(' ')); },

      async mkdir(args) {
        if (!args[0]) { print('用法：mkdir <目錄>', 't-err'); return; }
        const path = resolvePath(args[0]);
        try { await VFS.mkdir(path); print(`已建立目錄：${path}`, 't-ok'); }
        catch (e) { print('mkdir: ' + e.message, 't-err'); }
      },

      async touch(args) {
        if (!args[0]) { print('用法：touch <檔案>', 't-err'); return; }
        const path = resolvePath(args[0]);
        try {
          if (!(await VFS.exists(path))) await VFS.writeFile(path, '');
          print(path, 't-ok');
        } catch (e) { print('touch: ' + e.message, 't-err'); }
      },

      async rm(args) {
        let recursive = false;
        const filtered = args.filter(a => {
          if (a === '-r' || a === '-rf') { recursive = true; return false; }
          return true;
        });
        if (!filtered[0]) { print('用法：rm [-r] <路徑>', 't-err'); return; }
        const path = resolvePath(filtered[0]);
        try {
          const item = await VFS.get(path);
          if (!item) { print(`rm: ${path}: 不存在`, 't-err'); return; }
          if (item.type === 'dir' && !recursive) { print(`rm: ${path}: 是目錄，請使用 -r`, 't-err'); return; }
          await VFS.remove(path);
          print(`已刪除：${path}`, 't-ok');
        } catch (e) { print('rm: ' + e.message, 't-err'); }
      },

      async cp(args) {
        if (args.length < 2) { print('用法：cp <來源> <目標>', 't-err'); return; }
        const src = resolvePath(args[0]), dst = resolvePath(args[1]);
        try {
          await VFS.copy(src, dst);
          print(`已複製：${src} -> ${dst}`, 't-ok');
        } catch (e) { print('cp: ' + e.message, 't-err'); }
      },

      async mv(args) {
        if (args.length < 2) { print('用法：mv <來源> <目標>', 't-err'); return; }
        const src = resolvePath(args[0]), dst = resolvePath(args[1]);
        try { await VFS.rename(src, dst); print(`已移動：${src} -> ${dst}`, 't-ok'); }
        catch (e) { print('mv: ' + e.message, 't-err'); }
      },

      async write(args) {
        if (args.length < 2) { print('用法：write <檔案> <內容>', 't-err'); return; }
        const path = resolvePath(args[0]);
        const content = args.slice(1).join(' ');
        try { await VFS.writeFile(path, content); print(`已寫入：${path}`, 't-ok'); }
        catch (e) { print('write: ' + e.message, 't-err'); }
      },

      clear() { out.innerHTML = ''; },

      env() { Object.entries(env).forEach(([k, v]) => print(`${k}=${v}`)); },

      export(args) {
        if (!args[0] || !args[0].includes('=')) { print('用法：export KEY=VALUE', 't-err'); return; }
        const [k, ...v] = args[0].split('=');
        env[k] = v.join('=');
        print(`已設定 ${k}=${env[k]}`, 't-ok');
      },

      async open(args) {
        if (!args[0]) { print('用法：open <應用程式ID|檔案>', 't-err'); return; }
        const maybePath = resolvePath(args[0]);
        const item = await VFS.get(maybePath);
        if (item) {
          if (item.type === 'dir') OS.launch('explorer', { path: item.path });
          else openFile(item);
          return;
        }
        OS.launch(args[0]);
      },

      sysinfo() {
        print('=== πOS 系統資訊 ===', 't-info');
        print(`核心版本：πOS Kernel 1.0`);
        print(`瀏覽器：${navigator.userAgent.split(' ').slice(-2).join(' ')}`);
        print(`平台：${navigator.platform}`);
        print(`語言：${navigator.language}`);
        print(`記憶體：${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '未知'}`);
        print(`CPU 核心：${navigator.hardwareConcurrency || '未知'}`);
        print(`螢幕：${screen.width}x${screen.height}`);
        print(`視窗：${window.innerWidth}x${window.innerHeight}`);
        print(`IndexedDB：${typeof indexedDB !== 'undefined' ? '支援' : '不支援'}`);
        print(`WebAssembly：${typeof WebAssembly !== 'undefined' ? '支援' : '不支援'}`);
        print(`SharedArrayBuffer：${typeof SharedArrayBuffer !== 'undefined' ? '支援' : '不支援'}`);
        print(`Service Worker：${('serviceWorker' in navigator) ? '支援' : '不支援'}`);
      },

      date()   { print(new Date().toLocaleString('zh-TW')); },
      whoami() { print(env.USER); },
      history() { history.forEach((h, i) => print(`${String(i+1).padStart(4)}  ${h}`)); },
    };

    async function execute(raw) {
      const trimmed = raw.trim();
      if (!trimmed) return;
      history.unshift(trimmed);
      histIdx = -1;

      printHTML(`<span style="color:#4af">user@pios:${cwd} $</span> ${escapeHtml(trimmed)}`);

      const expanded = trimmed.replace(/\$(\w+)/g, (_, k) => env[k] || '');
      const result = await PiOS.command.exec(expanded, {
        cwd,
        env,
        setCwd(path) {
          cwd = path;
          updatePrompt();
        }
      });
      if (result.clear) {
        out.innerHTML = '';
        return;
      }
      if (result.output) result.output.split('\n').forEach(line => print(line, result.code === 0 ? '' : 't-err'));
    }

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    input.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        await execute(val);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx]; }
        else { histIdx = -1; input.value = ''; }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const val = input.value;
        const tokens = parseArgs(val);
        if (tokens.length >= 1) {
          const last   = tokens[tokens.length - 1];
          const dir    = last.includes('/') ? resolvePath(last.substring(0, last.lastIndexOf('/')+1)) : cwd;
          const prefix = last.includes('/') ? last.substring(last.lastIndexOf('/')+1) : last;
          try {
            const items   = await VFS.listDir(dir);
            const matches = items.filter(i => i.name.startsWith(prefix));
            if (matches.length === 1) {
              tokens[tokens.length - 1] = last.substring(0, last.length - prefix.length) + matches[0].name;
              input.value = tokens.join(' ');
            } else if (matches.length > 1) {
              print(matches.map(m => m.name).join('  '));
            }
          } catch {}
        }
      } else if (e.ctrlKey && e.key === 'c') {
        print('^C', 't-err');
        input.value = '';
      } else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        out.innerHTML = '';
      }
    });

    body.addEventListener('click', () => input.focus());

    print('πOS 終端機 v1.0', 't-info');
    print('輸入 help 查看可用指令', 't-info');
    print('');
    input.focus();
  }
});
