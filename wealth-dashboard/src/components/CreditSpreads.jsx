import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

function fmt(n) {
  const abs = Math.abs(Number(n || 0))
  return '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function CreditSpreads({ compact }) {
  const [trades, setTrades] = useLocalStorage('spreads_trades', [])
  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState(currentMonth())
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    ticker: '',
    spread: '',
    credit: '',
    outcome: 'win',
    pnl: '',
    notes: '',
  })

  function addTrade() {
    if (!form.ticker || !form.pnl) return
    setTrades(t => [{
      id: Date.now(),
      ...form,
      pnl: parseFloat(form.pnl) * (form.outcome === 'loss' ? -1 : 1),
    }, ...t])
    setForm({
      date: new Date().toISOString().slice(0, 10),
      ticker: '',
      spread: '',
      credit: '',
      outcome: 'win',
      pnl: '',
      notes: '',
    })
    setShowForm(false)
  }

  function removeTrade(id) {
    setTrades(t => t.filter(tr => tr.id !== id))
  }

  const monthTrades = trades.filter(t => t.date.startsWith(filterMonth))
  const wins = monthTrades.filter(t => t.pnl > 0)
  const losses = monthTrades.filter(t => t.pnl < 0)
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = losses.reduce((s, t) => s + Math.abs(t.pnl), 0)
  const netPnl = monthTrades.reduce((s, t) => s + t.pnl, 0)
  const runningTotal = trades.reduce((s, t) => s + t.pnl, 0)

  const TARGET_MIN = 500
  const TARGET_MAX = 800
  const pct = Math.min(100, (netPnl / TARGET_MIN) * 100)

  if (compact) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Credit Spreads</span>
          <span className="card-badge">{filterMonth}</span>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-label">Monthly Net</div>
            <div className={`stat-value ${netPnl >= 0 ? 'green' : 'red'}`}>
              {netPnl >= 0 ? '+' : ''}{fmt(netPnl)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Trades</div>
            <div className="stat-value">{monthTrades.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">All-Time</div>
            <div className={`stat-value ${runningTotal >= 0 ? 'green' : 'red'}`}>
              {runningTotal >= 0 ? '+' : ''}{fmt(runningTotal)}
            </div>
          </div>
        </div>
        <div className="progress-wrap" style={{ marginTop: 16 }}>
          <div className="progress-label">
            <span>Monthly target: {fmt(TARGET_MIN)}–{fmt(TARGET_MAX)}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${netPnl >= 0 ? 'green' : ''}`}
              style={{ width: Math.max(0, pct) + '%' }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Credit Spreads Tracker</span>
          <div className="btn-row">
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
            />
            <button className="btn btn-sm" onClick={() => setShowForm(s => !s)}>
              {showForm ? 'Cancel' : '+ Log Trade'}
            </button>
          </div>
        </div>

        <div className="stat-row" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="stat-label">Monthly Net</div>
            <div className={`stat-value ${netPnl >= 0 ? 'green' : 'red'}`}>
              {netPnl >= 0 ? '+' : ''}{fmt(netPnl)}
            </div>
            <div className="stat-sub">target: {fmt(TARGET_MIN)}–{fmt(TARGET_MAX)}/mo</div>
          </div>
          <div className="stat">
            <div className="stat-label">Wins</div>
            <div className="stat-value green">{wins.length}</div>
            <div className="stat-sub">+{fmt(grossWin)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Losses</div>
            <div className="stat-value red">{losses.length}</div>
            <div className="stat-sub">-{fmt(grossLoss)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value accent">
              {monthTrades.length ? ((wins.length / monthTrades.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">All-Time Total</div>
            <div className={`stat-value ${runningTotal >= 0 ? 'green' : 'red'}`}>
              {runningTotal >= 0 ? '+' : ''}{fmt(runningTotal)}
            </div>
            <div className="stat-sub">swept to acquisition fund</div>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-label">
            <span>Monthly goal progress ({fmt(TARGET_MIN)}–{fmt(TARGET_MAX)})</span>
            <span>{pct.toFixed(0)}% of minimum</span>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div
              className={`progress-fill ${netPnl >= 0 ? 'green' : ''}`}
              style={{ width: Math.max(0, pct) + '%' }}
            />
          </div>
        </div>

        {showForm && (
          <div className="form-panel">
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(v => ({ ...v, date: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Ticker</label>
                <input type="text" placeholder="SPY, QQQ..." value={form.ticker} onChange={e => setForm(v => ({ ...v, ticker: e.target.value.toUpperCase() }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Spread Type</label>
                <input type="text" placeholder="Put spread, Call spread..." value={form.spread} onChange={e => setForm(v => ({ ...v, spread: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Credit Received ($)</label>
                <input type="number" placeholder="120" value={form.credit} onChange={e => setForm(v => ({ ...v, credit: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Outcome</label>
                <select value={form.outcome} onChange={e => setForm(v => ({ ...v, outcome: e.target.value }))}>
                  <option value="win">Win (kept premium)</option>
                  <option value="loss">Loss</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">P&L ($) — absolute value</label>
                <input type="number" placeholder="120" value={form.pnl} onChange={e => setForm(v => ({ ...v, pnl: e.target.value }))} />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Notes</label>
                <input type="text" placeholder="Market conditions, setup details..." value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} />
              </div>
            </div>
            <button className="btn" onClick={addTrade}>Log Trade</button>
          </div>
        )}
      </div>

      {monthTrades.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Trade Log — {filterMonth}</span>
            <span className="card-badge">{monthTrades.length} trades</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ticker</th>
                  <th>Spread</th>
                  <th>Credit</th>
                  <th>P&L</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {monthTrades.map(t => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{t.ticker}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{t.spread}</td>
                    <td>{t.credit ? fmt(t.credit) : '—'}</td>
                    <td className={t.pnl >= 0 ? 'td-positive' : 'td-negative'}>
                      {t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.notes || '—'}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => removeTrade(t.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {monthTrades.length === 0 && !showForm && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="empty-state">
            <h3>No trades logged for {filterMonth}</h3>
            <p>Click "Log Trade" to record your credit spread results.</p>
          </div>
        </div>
      )}
    </div>
  )
}
