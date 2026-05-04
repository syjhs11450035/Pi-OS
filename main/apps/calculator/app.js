/**
 * πOS Calculator v1
 * 科學計算機：一般+三角學+微積分+數線+AI解題
 */
const _calculatorIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>`;

PiOS.app.register('calculator', {
  id: 'calculator',
  title: '科學計算機',
  iconChar: 'CA',
  iconSvg: _calculatorIcon,
  width: 400,
  height: 600,

  render(body, args, winId) {
    body.innerHTML = `
      <div class="calculator-wrap">
        <div class="calc-tabs">
          <button class="calc-tab active" data-tab="basic">一般</button>
          <button class="calc-tab" data-tab="trig">三角學</button>
          <button class="calc-tab" data-tab="calc">微積分</button>
          <button class="calc-tab" data-tab="graph">數線</button>
          <button class="calc-tab" data-tab="ai">AI解題</button>
        </div>
        <div class="calc-content">
          <div class="calc-display">
            <input type="text" id="calc-input-${winId}" readonly>
            <div id="calc-result-${winId}"></div>
          </div>
          <div class="calc-panel" id="calc-panel-${winId}"></div>
        </div>
      </div>
    `;

    const tabs = body.querySelectorAll('.calc-tab');
    const panel = document.getElementById(`calc-panel-${winId}`);
    const input = document.getElementById(`calc-input-${winId}`);
    const result = document.getElementById(`calc-result-${winId}`);

    let currentTab = 'basic';
    let expression = '';

    function updateDisplay() {
      input.value = expression;
      try {
        const res = eval(expression.replace('^', '**'));
        result.textContent = res;
      } catch {
        result.textContent = '';
      }
    }

    function renderBasic() {
      panel.innerHTML = `
        <div class="calc-buttons">
          <button data-val="7">7</button><button data-val="8">8</button><button data-val="9">9</button><button data-op="/">/</button>
          <button data-val="4">4</button><button data-val="5">5</button><button data-val="6">6</button><button data-op="*">*</button>
          <button data-val="1">1</button><button data-val="2">2</button><button data-val="3">3</button><button data-op="-">-</button>
          <button data-val="0">0</button><button data-val=".">.</button><button data-op="=">=</button><button data-op="+">+</button>
          <button data-func="clear">C</button><button data-func="back">←</button><button data-val="(">(</button><button data-val=")">)</button>
        </div>
      `;
    }

    function renderTrig() {
      panel.innerHTML = `
        <div class="calc-buttons">
          <button data-func="sin">sin</button><button data-func="cos">cos</button><button data-func="tan">tan</button><button data-val="π">π</button>
          <button data-func="asin">asin</button><button data-func="acos">acos</button><button data-func="atan">atan</button><button data-val="e">e</button>
          <button data-func="log">log</button><button data-func="ln">ln</button><button data-func="sqrt">√</button><button data-op="^">^</button>
          <button data-func="clear">C</button><button data-func="back">←</button><button data-val="(">(</button><button data-val=")">)</button>
        </div>
      `;
    }

    function renderCalc() {
      panel.innerHTML = `
        <div class="calc-inputs">
          <input type="text" placeholder="函數 f(x)" id="func-input-${winId}">
          <button id="deriv-btn-${winId}">求導</button>
          <button id="integ-btn-${winId}">積分</button>
        </div>
        <div id="calc-output-${winId}"></div>
      `;
      // 簡單實現，實際需要數學庫
    }

    function renderGraph() {
      panel.innerHTML = `
        <canvas id="graph-canvas-${winId}" width="350" height="300"></canvas>
        <input type="text" placeholder="函數 f(x)" id="graph-func-${winId}">
        <button id="graph-btn-${winId}">繪圖</button>
      `;
      // 簡單繪圖實現
    }

    function renderAI() {
      const apiKey = localStorage.getItem('calc_api_key') || '';
      panel.innerHTML = `
        <div class="ai-panel">
          <textarea placeholder="輸入數學問題" id="ai-input-${winId}"></textarea>
          <button id="ai-solve-${winId}">解題</button>
          <div id="ai-output-${winId}"></div>
        </div>
      `;
      document.getElementById(`ai-solve-${winId}`).onclick = async () => {
        const question = document.getElementById(`ai-input-${winId}`).value;
        if (!apiKey) {
          alert('請在設定中設置 API Key');
          return;
        }
        // 調用 AI API，這裡簡化
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{role: 'user', content: `解釋並解答這個數學問題：${question}`}],
            max_tokens: 500
          })
        });
        const data = await response.json();
        document.getElementById(`ai-output-${winId}`).textContent = data.choices[0].message.content;
      };
    }

    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        switch (currentTab) {
          case 'basic': renderBasic(); break;
          case 'trig': renderTrig(); break;
          case 'calc': renderCalc(); break;
          case 'graph': renderGraph(); break;
          case 'ai': renderAI(); break;
        }
      };
    });

    renderBasic();

    panel.addEventListener('click', e => {
      if (e.target.dataset.val) {
        expression += e.target.dataset.val;
        updateDisplay();
      } else if (e.target.dataset.op) {
        if (e.target.dataset.op === '=') {
          try {
            expression = eval(expression.replace('^', '**')).toString();
          } catch {
            expression = 'Error';
          }
        } else {
          expression += e.target.dataset.op;
        }
        updateDisplay();
      } else if (e.target.dataset.func) {
        if (e.target.dataset.func === 'clear') {
          expression = '';
        } else if (e.target.dataset.func === 'back') {
          expression = expression.slice(0, -1);
        } else {
          expression += e.target.dataset.func + '(';
        }
        updateDisplay();
      }
    });
  }
});