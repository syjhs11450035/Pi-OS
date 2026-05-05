/**
 * πOS 踩地雷遊戲
 * 經典邏輯遊戲
 */
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
    
    // 踩地雷遊戲實現
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
