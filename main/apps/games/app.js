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

    if (!document.getElementById('games-style')) {
      const style = document.createElement('style');
      style.id = 'games-style';
      style.textContent = `
        .games-wrap { padding: 20px; }
        .games-wrap h2 { margin-bottom: 20px; color: #fff; }
        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
        .game-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; transition: background .2s; }
        .game-card:hover { background: rgba(255,255,255,.1); }
        .game-icon { font-size: 32px; margin-bottom: 10px; }
        .game-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 5px; }
        .game-desc { font-size: 12px; color: rgba(255,255,255,.7); }
      `;
      document.head.appendChild(style);
    }

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

    if (!document.getElementById('2048-style')) {
      const style = document.createElement('style');
      style.id = '2048-style';
      style.textContent = `
        .game-2048 { padding: 20px; text-align: center; }
        .score { font-size: 18px; margin-bottom: 10px; color: #fff; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; width: 300px; height: 300px; margin: 0 auto; }
        .cell { background: rgba(255,255,255,.1); border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #fff; }
        .cell-2 { background: #eee4da; color: #776e65; }
        .cell-4 { background: #ede0c8; color: #776e65; }
        .cell-8 { background: #f2b179; color: #f9f6f2; }
        .cell-16 { background: #f59563; color: #f9f6f2; }
        .cell-32 { background: #f67c5f; color: #f9f6f2; }
        .cell-64 { background: #f65e3b; color: #f9f6f2; }
        .cell-128 { background: #edcf72; color: #f9f6f2; }
        .cell-256 { background: #edcc61; color: #f9f6f2; }
        .cell-512 { background: #edc850; color: #f9f6f2; }
        .cell-1024 { background: #edc53f; color: #f9f6f2; }
        .cell-2048 { background: #edc22e; color: #f9f6f2; }
      `;
      document.head.appendChild(style);
    }
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
      let moved = false;
      const newBoard = [...board];

      function slide(row) {
        const filtered = row.filter(v => v !== 0);
        for (let i = 0; i < filtered.length - 1; i++) {
          if (filtered[i] === filtered[i + 1]) {
            filtered[i] *= 2;
            score += filtered[i];
            filtered[i + 1] = 0;
          }
        }
        const newRow = filtered.filter(v => v !== 0);
        while (newRow.length < 4) newRow.push(0);
        return newRow;
      }

      if (dir === 'ArrowLeft') {
        for (let i = 0; i < 4; i++) {
          const row = newBoard.slice(i * 4, i * 4 + 4);
          const newRow = slide(row);
          if (newRow.some((v, idx) => v !== row[idx])) moved = true;
          newBoard.splice(i * 4, 4, ...newRow);
        }
      } else if (dir === 'ArrowRight') {
        for (let i = 0; i < 4; i++) {
          const row = newBoard.slice(i * 4, i * 4 + 4).reverse();
          const newRow = slide(row).reverse();
          if (newRow.some((v, idx) => v !== newBoard[i * 4 + idx])) moved = true;
          newBoard.splice(i * 4, 4, ...newRow);
        }
      } else if (dir === 'ArrowUp') {
        for (let i = 0; i < 4; i++) {
          const col = [newBoard[i], newBoard[i + 4], newBoard[i + 8], newBoard[i + 12]];
          const newCol = slide(col);
          if (newCol.some((v, idx) => v !== col[idx])) moved = true;
          newBoard[i] = newCol[0];
          newBoard[i + 4] = newCol[1];
          newBoard[i + 8] = newCol[2];
          newBoard[i + 12] = newCol[3];
        }
      } else if (dir === 'ArrowDown') {
        for (let i = 0; i < 4; i++) {
          const col = [newBoard[i], newBoard[i + 4], newBoard[i + 8], newBoard[i + 12]].reverse();
          const newCol = slide(col).reverse();
          if (newCol.some((v, idx) => v !== [newBoard[i], newBoard[i + 4], newBoard[i + 8], newBoard[i + 12]][idx])) moved = true;
          newBoard[i] = newCol[0];
          newBoard[i + 4] = newCol[1];
          newBoard[i + 8] = newCol[2];
          newBoard[i + 12] = newCol[3];
        }
      }

      if (moved) {
        board = newBoard;
        addRandomTile();
        renderBoard();
        if (board.every(v => v !== 0) && !canMove()) {
          alert('遊戲結束！');
        }
      }
    }

    function canMove() {
      for (let i = 0; i < 16; i++) {
        if (board[i] === 0) return true;
        const row = Math.floor(i / 4);
        const col = i % 4;
        if (row > 0 && board[i] === board[i - 4]) return true;
        if (row < 3 && board[i] === board[i + 4]) return true;
        if (col > 0 && board[i] === board[i - 1]) return true;
        if (col < 3 && board[i] === board[i + 1]) return true;
      }
      return false;
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

    if (!document.getElementById('minesweeper-style')) {
      const style = document.createElement('style');
      style.id = 'minesweeper-style';
      style.textContent = `
        .minesweeper { padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 10px; color: #fff; }
        .board { display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; width: 270px; height: 270px; margin: 0 auto; }
        .cell { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: #fff; }
        .cell.revealed { background: rgba(255,255,255,.05); }
        .cell.flagged { background: #f00; }
      `;
      document.head.appendChild(style);
    }
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
      if (board[pos] === -1) {
        alert('踩到地雷！遊戲結束');
        initBoard();
        return;
      }
      if (board[pos] === 0) {
        // 揭示空單元格及其鄰居
        const toReveal = [pos];
        const revealed = new Set();
        while (toReveal.length) {
          const p = toReveal.pop();
          if (revealed.has(p)) continue;
          revealed.add(p);
          const cell = boardEl.children[p];
          cell.classList.add('revealed');
          cell.textContent = board[p] || '';
          if (board[p] === 0) {
            getNeighbors(p).forEach(n => {
              if (!revealed.has(n)) toReveal.push(n);
            });
          }
        }
      } else {
        const cell = boardEl.children[pos];
        cell.classList.add('revealed');
        cell.textContent = board[pos];
      }
      checkWin();
    }

    function flag(pos) {
      const cell = boardEl.children[pos];
      if (cell.classList.contains('flagged')) {
        cell.classList.remove('flagged');
        cell.textContent = '';
        mines++;
      } else {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
        mines--;
      }
      minesEl.textContent = mines;
    }

    function checkWin() {
      const revealedCells = Array.from(boardEl.children).filter(c => c.classList.contains('revealed')).length;
      if (revealedCells === 81 - 10) {
        alert('勝利！');
      }
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
        <div class="foundations" id="foundations-${winId}"></div>
        <div class="tableau" id="tableau-${winId}"></div>
        <div class="stock" id="stock-${winId}"></div>
        <button id="new-game-${winId}">新遊戲</button>
      </div>
    `;

    if (!document.getElementById('solitaire-style')) {
      const style = document.createElement('style');
      style.id = 'solitaire-style';
      style.textContent = `
        .solitaire { padding: 20px; }
        .foundations { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
        .tableau { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
        .stock { display: flex; justify-content: center; }
        .pile { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2); border-radius: 5px; width: 80px; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
        .card { background: #fff; border: 1px solid #000; border-radius: 3px; width: 70px; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 12px; position: absolute; bottom: 0; }
        .card.face-down { background: #0078d4; color: #0078d4; }
        .card:nth-child(1) { z-index: 1; }
        .card:nth-child(2) { z-index: 2; bottom: 10px; }
        .card:nth-child(3) { z-index: 3; bottom: 20px; }
        .card:nth-child(4) { z-index: 4; bottom: 30px; }
        .card:nth-child(5) { z-index: 5; bottom: 40px; }
        .card:nth-child(6) { z-index: 6; bottom: 50px; }
        .card:nth-child(7) { z-index: 7; bottom: 60px; }
      `;
      document.head.appendChild(style);
    }

    const foundationsEl = document.getElementById(`foundations-${winId}`);
    const tableauEl = document.getElementById(`tableau-${winId}`);
    const stockEl = document.getElementById(`stock-${winId}`);

    let deck = [];
    let foundations = [[], [], [], []];
    let tableau = [[], [], [], [], [], [], []];
    let stock = [];
    let waste = [];

    function createDeck() {
      const suits = ['♠', '♥', '♦', '♣'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      deck = [];
      suits.forEach(suit => {
        ranks.forEach(rank => {
          deck.push({ suit, rank, value: ranks.indexOf(rank) });
        });
      });
      shuffle(deck);
    }

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function deal() {
      for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
          tableau[j].push(deck.pop());
        }
      }
      stock = deck;
    }

    function render() {
      // 渲染 foundations
      foundationsEl.innerHTML = '';
      foundations.forEach((pile, i) => {
        const pileEl = document.createElement('div');
        pileEl.className = 'pile';
        pileEl.textContent = pile.length ? `${pile[pile.length - 1].rank}${pile[pile.length - 1].suit}` : '';
        foundationsEl.appendChild(pileEl);
      });

      // 渲染 tableau
      tableauEl.innerHTML = '';
      tableau.forEach((pile, i) => {
        const pileEl = document.createElement('div');
        pileEl.className = 'pile';
        pile.forEach((card, j) => {
          const cardEl = document.createElement('div');
          cardEl.className = 'card';
          if (j === pile.length - 1) {
            cardEl.textContent = `${card.rank}${card.suit}`;
            cardEl.classList.add('face-up');
          } else {
            cardEl.textContent = '🂠';
            cardEl.classList.add('face-down');
          }
          pileEl.appendChild(cardEl);
        });
        tableauEl.appendChild(pileEl);
      });

      // 渲染 stock
      stockEl.innerHTML = '';
      if (stock.length) {
        const stockPile = document.createElement('div');
        stockPile.className = 'pile';
        stockPile.textContent = '🂠';
        stockPile.onclick = drawCard;
        stockEl.appendChild(stockPile);
      }
    }

    function drawCard() {
      if (stock.length) {
        waste.push(stock.pop());
        render();
      }
    }

    function initGame() {
      createDeck();
      deal();
      render();
    }

    document.getElementById(`new-game-${winId}`).onclick = initGame;
    initGame();
  }
});