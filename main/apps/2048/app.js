/**
 * πOS 2048 遊戲
 * 數字合併遊戲
 */
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
    
    // 2048 遊戲實現
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
