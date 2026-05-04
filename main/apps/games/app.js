/**
 * πOS Games v1
 * 遊戲中心：2048、踩地雷、接龍
 */
const _gamesIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="8" cy="8" r="1"/><circle cx="12" cy="8" r="1"/><path d="M7 13h10"/></svg>`;

PiOS.app.register('games', {
  id: 'games',
  title: '遊戲',
  iconChar: 'GM',
  iconSvg: _gamesIcon,
  width: 600,
  height: 400,

  render(body, args, winId) {
    body.innerHTML = `
      <div class="games-wrap">
        <h2>遊戲中心</h2>
        <div class="games-grid">
          <div class="game-card" data-game="2048">
            <div class="game-icon">🧩</div>
            <div class="game-title">2048</div>
            <div class="game-desc">數字合併遊戲</div>
          </div>
          <div class="game-card" data-game="minesweeper">
            <div class="game-icon">💣</div>
            <div class="game-title">踩地雷</div>
            <div class="game-desc">經典邏輯遊戲</div>
          </div>
          <div class="game-card" data-game="solitaire">
            <div class="game-icon">🃏</div>
            <div class="game-title">接龍</div>
            <div class="game-desc">撲克牌遊戲</div>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('.game-card').forEach(card => {
      card.onclick = () => {
        const game = card.dataset.game;
        PiOS.app.launch(game, {}, true);
      };
    });
  }
});

// 註冊遊戲應用
PiOS.app.register('2048', {
  id: '2048',
  title: '2048',
  iconChar: '48',
  width: 400,
  height: 500,

  render(body, args, winId) {
    body.innerHTML = `
      <div class="game-2048">
        <div class="score">分數: <span id="score-${winId}">0</span></div>
        <div class="grid" id="grid-${winId}"></div>
        <button id="reset-${winId}">重新開始</button>
      </div>
    `;
    // 簡單 2048 實現
    const grid = document.getElementById(`grid-${winId}`);
    const scoreEl = document.getElementById(`score-${winId}`);
    let board = Array(16).fill(0);
    let score = 0;

    function initBoard() {
      board = Array(16).fill(0);
      addRandomTile();
      addRandomTile();
      renderBoard();
    }

    function addRandomTile() {
      const empty = board.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
      if (empty.length) {
        const pos = empty[Math.floor(Math.random() * empty.length)];
        board[pos] = Math.random() < 0.9 ? 2 : 4;
      }
    }

    function renderBoard() {
      grid.innerHTML = '';
      board.forEach(val => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = val || '';
        if (val) cell.classList.add(`cell-${val}`);
        grid.appendChild(cell);
      });
      scoreEl.textContent = score;
    }

    function move(dir) {
      // 簡化移動邏輯
      // 實際需要完整的 2048 邏輯
      addRandomTile();
      renderBoard();
    }

    document.addEventListener('keydown', e => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        move(e.key);
      }
    });

    document.getElementById(`reset-${winId}`).onclick = initBoard;
    initBoard();
  }
});

PiOS.app.register('minesweeper', {
  id: 'minesweeper',
  title: '踩地雷',
  iconChar: 'MS',
  width: 400,
  height: 450,

  render(body, args, winId) {
    body.innerHTML = `
      <div class="minesweeper">
        <div class="header">
          <div>地雷: <span id="mines-${winId}">10</span></div>
          <button id="reset-ms-${winId}">重新開始</button>
        </div>
        <div class="board" id="board-${winId}"></div>
      </div>
    `;
    // 簡單踩地雷實現
    const boardEl = document.getElementById(`board-${winId}`);
    const minesEl = document.getElementById(`mines-${winId}`);
    let board = [];
    let mines = 10;

    function initBoard() {
      board = Array(81).fill(0);
      // 放置地雷
      for (let i = 0; i < mines; i++) {
        let pos;
        do {
          pos = Math.floor(Math.random() * 81);
        } while (board[pos] === -1);
        board[pos] = -1;
      }
      // 計算數字
      for (let i = 0; i < 81; i++) {
        if (board[i] !== -1) {
          let count = 0;
          const neighbors = getNeighbors(i);
          neighbors.forEach(n => {
            if (board[n] === -1) count++;
          });
          board[i] = count;
        }
      }
      renderBoard();
    }

    function getNeighbors(pos) {
      const row = Math.floor(pos / 9);
      const col = pos % 9;
      const neighbors = [];
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < 9 && c >= 0 && c < 9 && (r !== row || c !== col)) {
            neighbors.push(r * 9 + c);
          }
        }
      }
      return neighbors;
    }

    function renderBoard() {
      boardEl.innerHTML = '';
      board.forEach((val, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.onclick = () => reveal(i);
        cell.oncontextmenu = e => {
          e.preventDefault();
          flag(i);
        };
        boardEl.appendChild(cell);
      });
    }

    function reveal(pos) {
      // 簡化揭示邏輯
    }

    function flag(pos) {
      // 標記邏輯
    }

    document.getElementById(`reset-ms-${winId}`).onclick = initBoard;
    initBoard();
  }
});

PiOS.app.register('solitaire', {
  id: 'solitaire',
  title: '接龍',
  iconChar: 'SL',
  width: 600,
  height: 500,

  render(body, args, winId) {
    body.innerHTML = `
      <div class="solitaire">
        <div class="tableau" id="tableau-${winId}"></div>
        <div class="foundations" id="foundations-${winId}"></div>
        <div class="stock" id="stock-${winId}"></div>
      </div>
    `;
    // 簡單接龍實現，實際很複雜
    // 這裡只顯示占位
  }
});