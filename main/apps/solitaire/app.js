/**
 * πOS 接龍遊戲
 * 撲克牌遊戲
 */
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
