/* ══════════════════════════════════════════════════════════════
   Budget Bestie — app.js
   ══════════════════════════════════════════════════════════════ */

// ── Constants ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  "Bills & Rent":      "#f87171",
  "Groceries & Food":  "#fb923c",
  "Going Out & Fun":   "#60a5fa",
  "Shopping & Beauty": "#f472b6",
  "Emergency Fund":    "#34d399",
  "Savings":           "#fbbf24",
  "Other":             "#c084fc"
};

const CATEGORY_ICONS = {
  "Bills & Rent":      "🏠",
  "Groceries & Food":  "🛒",
  "Going Out & Fun":   "🎉",
  "Shopping & Beauty": "💄",
  "Emergency Fund":    "🚨",
  "Savings":           "💰",
  "Other":             "📦"
};

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  transactions: [],
  budgets: {},
  income: 4000,
  isDemo: true,
  bankConnected: false,
  bankName: null,
  plaidConfigured: false,
  charts: { donut: null, bar: null }
};

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  try {
    await checkStatus();
    await loadBudget();
    await loadTransactions();
    renderDashboard();
    renderBankTab();
    populateBudgetForm();
    // Show success toast when returning from OAuth bank redirect
    if (new URLSearchParams(window.location.search).get('connected')) {
      showToast('Bank connected successfully! 🎉', 'success');
      history.replaceState({}, '', '/');
    }
  } catch (e) {
    console.error('Init error:', e);
  }
}

async function checkStatus() {
  try {
    const data = await apiGet('/api/status');
    state.bankConnected   = data.bank_connected;
    state.bankName        = data.bank_name;
    state.plaidConfigured = data.plaid_configured;
    state.plaidEnv        = data.plaid_env;
    state.aiConfigured    = data.ai_configured;

    const pill = document.getElementById('connectionPill');
    if (state.bankConnected) {
      pill.textContent = `🏦 ${state.bankName || 'Bank Connected'}`;
      pill.className = 'status-pill connected';
    } else {
      pill.textContent = '📊 Demo Mode';
      pill.className = 'status-pill demo';
    }
  } catch (e) { /* non-fatal */ }
}

async function loadBudget() {
  const data = await apiGet('/api/budget');
  state.income  = data.income;
  state.budgets = data.budgets;
}

async function loadTransactions() {
  const data = await apiGet('/api/plaid/transactions');
  state.transactions = data.transactions || [];
  state.isDemo       = data.demo !== false;
}

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + tabName);
  });
}

// ── Dashboard rendering ────────────────────────────────────────────────────
function renderDashboard() {
  const spending = computeSpending();
  const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
  const remaining  = state.income - totalSpent;

  // Summary cards
  document.getElementById('summaryIncome').textContent    = formatCurrency(state.income);
  document.getElementById('summarySpent').textContent     = formatCurrency(totalSpent);
  document.getElementById('summaryRemaining').textContent = formatCurrency(remaining);

  renderDonutChart(spending);
  renderBarChart(spending, state.budgets);
  renderCategoryProgress(spending, state.budgets);
  renderTransactions(state.transactions);
}

function computeSpending() {
  const spending = {};
  for (const t of state.transactions) {
    const cat = t.category || 'Other';
    spending[cat] = (spending[cat] || 0) + parseFloat(t.amount);
  }
  return spending;
}

// ── Donut Chart ────────────────────────────────────────────────────────────
function renderDonutChart(spending) {
  const categories = Object.keys(spending).filter(c => spending[c] > 0);
  if (!categories.length) return;

  const ctx = document.getElementById('donutChart').getContext('2d');
  if (state.charts.donut) state.charts.donut.destroy();

  const total = Object.values(spending).reduce((a, b) => a + b, 0);

  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
      const { ctx: c, chartArea: { top, bottom, left, right } } = chart;
      c.save();
      c.font = 'bold 18px Poppins, sans-serif';
      c.fillStyle = '#db2777';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      c.fillText(formatCurrency(total), cx, cy - 10);
      c.font = '12px Poppins, sans-serif';
      c.fillStyle = '#6b7280';
      c.fillText('total spent', cx, cy + 14);
      c.restore();
    }
  };

  state.charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: categories.map(c => spending[c]),
        backgroundColor: categories.map(c => CATEGORY_COLORS[c] || '#c084fc'),
        borderWidth: 3,
        borderColor: '#fff',
        hoverBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 12, font: { family: 'Poppins', size: 11 } }
        },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` }
        }
      }
    },
    plugins: [centerTextPlugin]
  });
}

// ── Bar Chart ──────────────────────────────────────────────────────────────
function renderBarChart(spending, budgets) {
  const categories = Object.keys(budgets);
  const ctx = document.getElementById('barChart').getContext('2d');
  if (state.charts.bar) state.charts.bar.destroy();

  state.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories.map(c => `${CATEGORY_ICONS[c] || ''} ${c}`),
      datasets: [
        {
          label: 'Spent',
          data: categories.map(c => spending[c] || 0),
          backgroundColor: categories.map(c => (CATEGORY_COLORS[c] || '#c084fc') + 'cc'),
          borderRadius: 6
        },
        {
          label: 'Budget',
          data: categories.map(c => budgets[c]?.limit || 0),
          backgroundColor: '#f9a8d455',
          borderColor: '#f9a8d4',
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Poppins', size: 11 } } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x)}` }
        }
      },
      scales: {
        x: {
          grid: { color: '#fce7f3' },
          ticks: { callback: v => '$' + v, font: { family: 'Poppins', size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Poppins', size: 11 } }
        }
      }
    }
  });
}

// ── Category Progress Bars ─────────────────────────────────────────────────
function renderCategoryProgress(spending, budgets) {
  const container = document.getElementById('categoryProgress');
  if (!container) return;

  const html = Object.entries(budgets).map(([cat, info]) => {
    const spent = spending[cat] || 0;
    const limit = info.limit || 0;
    const pct   = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    const over  = spent > limit;
    const color = info.color || CATEGORY_COLORS[cat] || '#c084fc';
    const icon  = info.icon  || CATEGORY_ICONS[cat]  || '📦';

    return `
      <div class="progress-item">
        <div class="progress-header">
          <div class="progress-label">
            <span class="progress-icon">${icon}</span>
            <span>${esc(cat)}</span>
          </div>
          <div class="progress-amounts">
            <strong>${formatCurrency(spent)}</strong> / ${formatCurrency(limit)}
          </div>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${over ? 'over' : ''}"
               style="width:${pct.toFixed(1)}%; background:${over ? '#f87171' : color}">
          </div>
        </div>
        <div class="progress-pct ${over ? 'over' : ''}">
          ${over ? '⚠️ ' : ''}${pct.toFixed(0)}% used${over ? ' — over budget!' : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No budget categories found</div></div>';
}

// ── Transactions List ──────────────────────────────────────────────────────
function renderTransactions(transactions) {
  const container = document.getElementById('transactionList');
  if (!container) return;

  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  if (!recent.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-text">No transactions yet</div></div>';
    return;
  }

  const rows = recent.map(t => {
    const color = CATEGORY_COLORS[t.category] || '#c084fc';
    const icon  = CATEGORY_ICONS[t.category]  || '📦';
    return `
      <tr class="transaction-row">
        <td>
          <div class="txn-name-cell">
            <div class="txn-color-bar" style="background:${color}"></div>
            <div>
              <span class="txn-name">${esc(t.name)}</span>
              <span class="txn-merchant">${esc(t.merchant || '')}</span>
            </div>
          </div>
        </td>
        <td class="txn-amount">${formatCurrency(t.amount)}</td>
        <td class="txn-date">${formatDate(t.date)}</td>
        <td><span class="category-badge" style="background:${color}22; color:${color}">${icon} ${esc(t.category)}</span></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="transaction-table">
      <thead>
        <tr>
          <th>Transaction</th>
          <th>Amount</th>
          <th>Date</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ── Bank Tab ───────────────────────────────────────────────────────────────
function renderBankTab() {
  const container = document.getElementById('bankContent');
  if (!container) return;

  if (state.bankConnected) {
    container.innerHTML = `
      <div class="bank-status-icon">🏦</div>
      <div class="bank-status-text">Connected!</div>
      <div class="bank-info">
        <div class="bank-info-label">Connected to</div>
        <div class="bank-info-name">${esc(state.bankName || 'Your Bank')} ✅</div>
      </div>
      <div class="bank-btns">
        <button class="btn btn-primary" onclick="syncTransactions()">🔄 Sync Transactions</button>
        <button class="btn btn-outline" onclick="disconnectBank()">Disconnect</button>
      </div>
    `;
    return;
  }

  if (!state.plaidConfigured) {
    container.innerHTML = `
      <div class="bank-status-icon">📊</div>
      <div class="bank-status-text">Running in Demo Mode</div>
      <div class="demo-notice">
        💡 Add <strong>PLAID_CLIENT_ID</strong> and <strong>PLAID_SECRET</strong> environment variables to connect your real bank account.
      </div>
      <div class="bank-status-sub">
        In demo mode, Budget Bestie uses sample transactions so you can explore all features right away.
        Your data is never stored or shared.
      </div>
    `;
    return;
  }

  const envLabel = state.plaidEnv === 'production' ? '🟢 Production'
                 : state.plaidEnv === 'development' ? '🔵 Development (real banks)'
                 : '🟡 Sandbox (test only)';
  container.innerHTML = `
    <div class="bank-status-icon">🔐</div>
    <div class="bank-status-text">Connect Your Bank Securely</div>
    <div class="bank-status-sub">
      Connect your bank using Plaid's secure, bank-level encryption. Budget Bestie <strong>never</strong> stores your login credentials.
    </div>
    <div class="bank-env-badge">${envLabel}</div>
    <button class="btn btn-primary" onclick="initPlaidLink()" id="plaidBtn">🏦 Connect Your Bank</button>
  `;
}

async function initPlaidLink() {
  const btn = document.getElementById('plaidBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }

  try {
    const data = await apiPost('/api/plaid/create-link-token', {});
    if (data.demo || !data.link_token) {
      showToast('Plaid not configured — running in demo mode', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🏦 Connect Your Bank'; }
      return;
    }
    const handler = Plaid.create({
      token: data.link_token,
      onSuccess: async (publicToken, metadata) => {
        const res = await apiPost('/api/plaid/exchange-token', {
          public_token: publicToken,
          institution_name: metadata.institution?.name || 'Your Bank'
        });
        if (res.ok) {
          await checkStatus();
          await loadTransactions();
          renderDashboard();
          renderBankTab();
          showToast(`${res.bank_name} connected! 🎉`, 'success');
        } else {
          showToast('Connection failed: ' + (res.error || 'Unknown'), 'error');
        }
      },
      onExit: () => {
        if (btn) { btn.disabled = false; btn.textContent = '🏦 Connect Your Bank'; }
      }
    });
    handler.open();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🏦 Connect Your Bank'; }
  }
}

async function syncTransactions() {
  showToast('Syncing transactions...', '');
  await loadTransactions();
  renderDashboard();
  showToast('Transactions synced! 💕', 'success');
}

function disconnectBank() {
  // Reset state (in a real app you'd also revoke the Plaid access token)
  state.bankConnected = false;
  state.bankName = null;
  renderBankTab();
  showToast('Bank disconnected', '');
}

// ── AI Insights (streaming) ────────────────────────────────────────────────
async function getInsights() {
  const btn    = document.getElementById('getInsightsBtn');
  const output = document.getElementById('insightsOutput');
  btn.disabled = true;
  btn.textContent = '✨ Getting insights...';
  output.style.display = 'block';
  output.innerHTML = '<div class="loading-text">Budget Bestie is thinking... 💕</div>';

  try {
    const response = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: state.transactions })
    });

    if (!response.ok) throw new Error('Server error ' + response.status);

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    output.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim() === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            fullText += parsed.text;
            output.innerHTML = markdownToHtml(fullText);
          } catch { /* ignore partial JSON */ }
        }
      }
    }
    if (!fullText) output.innerHTML = '<p style="color:var(--gray-500)">No insights available yet.</p>';
  } catch (e) {
    output.innerHTML = `<p style="color:#dc2626">Error getting insights: ${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Get My Insights';
  }
}

// ── AI Budget Suggestion ───────────────────────────────────────────────────
async function suggestBudget() {
  const btn      = document.getElementById('suggestBtn');
  const output   = document.getElementById('suggestionOutput');
  const incomeEl = document.getElementById('suggestIncome');

  const income = parseFloat(incomeEl.value) || state.income;
  const priorities = [...document.querySelectorAll('input[name="priority"]:checked')].map(el => el.value);

  btn.disabled = true;
  btn.textContent = '💡 Building your budget...';
  output.style.display = 'block';
  output.innerHTML = '<div class="loading-text">Building your perfect budget... 💕</div>';

  try {
    const data = await apiPost('/api/ai/suggest-budget', { income, priorities });
    if (data.error || !data.suggestion) {
      output.innerHTML = `<p style="color:#dc2626">${esc(data.error || 'No suggestion available')}</p>`;
      return;
    }

    const suggestion = data.suggestion;
    const itemsHtml = Object.entries(suggestion).map(([cat, amount]) => {
      const icon  = CATEGORY_ICONS[cat]  || '📦';
      const color = CATEGORY_COLORS[cat] || '#c084fc';
      return `
        <div class="suggestion-item">
          <div class="suggestion-item-name" style="color:${color}">${icon} ${esc(cat)}</div>
          <div class="suggestion-item-amount">${formatCurrency(amount)}</div>
        </div>
      `;
    }).join('');

    const total = Object.values(suggestion).reduce((a, b) => a + b, 0);

    output.innerHTML = `
      <h4>💡 Budget Bestie's Suggested Budget for ${formatCurrency(income)}/mo</h4>
      <div class="suggestion-grid">${itemsHtml}</div>
      <p style="font-size:12px;color:var(--gray-500);margin-bottom:14px">Total allocated: ${formatCurrency(total)} / ${formatCurrency(income)}</p>
      <button class="btn btn-success btn-sm" onclick='applyBudgetSuggestion(${JSON.stringify(suggestion)}, ${income})'>✅ Apply This Budget</button>
      ${data.note ? `<p style="font-size:12px;color:var(--gray-400);margin-top:8px">${esc(data.note)}</p>` : ''}
    `;
  } catch (e) {
    output.innerHTML = `<p style="color:#dc2626">Error: ${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '💡 Build My Budget';
  }
}

async function applyBudgetSuggestion(suggestion, income) {
  // Update state
  if (income) state.income = income;
  for (const [cat, amount] of Object.entries(suggestion)) {
    if (state.budgets[cat]) state.budgets[cat].limit = amount;
  }

  // Save to backend
  const budgetMap = {};
  for (const [cat, amount] of Object.entries(suggestion)) budgetMap[cat] = amount;
  await apiPost('/api/budget', { income: income || state.income, budgets: budgetMap });

  // Refresh UI
  populateBudgetForm();
  renderDashboard();
  showToast('Budget applied! 💕', 'success');
  switchTab('budget');
}

// ── Check Purchase ─────────────────────────────────────────────────────────
async function checkPurchase() {
  const btn      = document.getElementById('checkBtn');
  const itemName = document.getElementById('purchaseItem').value.trim();
  const amount   = parseFloat(document.getElementById('purchaseAmount').value) || 0;
  const category = document.getElementById('purchaseCategory').value;
  const result   = document.getElementById('purchaseResult');

  if (!itemName || amount <= 0) {
    showToast('Please fill in all fields 💕', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '🔍 Checking...';
  result.style.display = 'none';

  try {
    const data = await apiPost('/api/ai/warning', { category, amount, item_name: itemName });
    const safe = !data.warning;
    const pct  = Math.min(data.percentage, 100);
    const color = CATEGORY_COLORS[category] || '#c084fc';

    result.style.display = 'block';
    result.innerHTML = `
      <div class="purchase-result-card ${safe ? 'safe' : 'warning'}">
        <div class="purchase-result-title">${safe ? '✅ Good to Go!' : '⚠️ Budget Alert!'}</div>
        <div class="purchase-result-message">${esc(data.message)}</div>
        <div class="purchase-stats">
          <div class="purchase-stat">
            <div class="purchase-stat-label">Current Spent</div>
            <div class="purchase-stat-value">${formatCurrency(data.current_spending)}</div>
          </div>
          <div class="purchase-stat">
            <div class="purchase-stat-label">This Purchase</div>
            <div class="purchase-stat-value">+${formatCurrency(amount)}</div>
          </div>
          <div class="purchase-stat">
            <div class="purchase-stat-label">New Total</div>
            <div class="purchase-stat-value">${formatCurrency(data.new_total)}</div>
          </div>
          <div class="purchase-stat">
            <div class="purchase-stat-label">Budget Limit</div>
            <div class="purchase-stat-value">${formatCurrency(data.budget_limit)}</div>
          </div>
        </div>
        <div class="purchase-progress-label">
          ${CATEGORY_ICONS[category] || '📦'} ${esc(category)} — ${data.percentage}% of budget used after purchase
        </div>
        <div class="purchase-progress-bg">
          <div class="purchase-progress-fill"
               style="width:${pct}%; background:${safe ? '#34d399' : '#f87171'}">
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    result.style.display = 'block';
    result.innerHTML = `<p style="color:#dc2626;padding:12px">Error: ${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Check It!';
  }
}

// ── Budget Form ────────────────────────────────────────────────────────────
function populateBudgetForm() {
  const grid    = document.getElementById('budgetFormGrid');
  const incomeI = document.getElementById('budgetIncome');
  if (incomeI) incomeI.value = state.income;
  if (!grid) return;

  grid.innerHTML = Object.entries(state.budgets).map(([cat, info]) => {
    const color = info.color || CATEGORY_COLORS[cat] || '#c084fc';
    const icon  = info.icon  || CATEGORY_ICONS[cat]  || '📦';
    return `
      <div class="budget-form-item">
        <div class="budget-form-item-label">
          <div class="dot" style="background:${color}"></div>
          <span>${icon} ${esc(cat)}</span>
        </div>
        <input
          type="number"
          class="form-input"
          id="budget-${esc(cat)}"
          value="${info.limit}"
          min="0"
          step="10"
          placeholder="0"
        />
      </div>
    `;
  }).join('');
}

async function saveBudget() {
  const incomeEl = document.getElementById('budgetIncome');
  const income   = parseFloat(incomeEl?.value) || state.income;
  const budgets  = {};

  for (const cat of Object.keys(state.budgets)) {
    const el = document.getElementById(`budget-${cat}`);
    if (el) budgets[cat] = parseFloat(el.value) || 0;
  }

  try {
    await apiPost('/api/budget', { income, budgets });
    state.income = income;
    for (const [cat, limit] of Object.entries(budgets)) {
      if (state.budgets[cat]) state.budgets[cat].limit = limit;
    }
    renderDashboard();
    showToast('Budget saved! 💾✨', 'success');
  } catch (e) {
    showToast('Error saving budget: ' + e.message, 'error');
  }
}

// ── Markdown → HTML ────────────────────────────────────────────────────────
function markdownToHtml(text) {
  let html = esc(text);

  // ## Headings
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

  // **bold**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Numbered lists  (must come before bullet list)
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Bullet lists
  html = html.replace(/((?:^[-*] .+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^[-*] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Paragraph breaks
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;

  // Fix double-wrapped paragraphs around headings and lists
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<[ou]l>)/g, '$1');
  html = html.replace(/(<\/[ou]l>)<\/p>/g, '$1');

  return html;
}

// ── Utilities ──────────────────────────────────────────────────────────────
function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = '') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  // Force reflow
  toast.offsetHeight;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── API helpers ────────────────────────────────────────────────────────────
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
