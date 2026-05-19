import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const GOAL = 20000

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function CapitalStack({ compact }) {
  const [balance, setBalance] = useLocalStorage('capital_balance', 0)
  const [history, setHistory] = useLocalStorage('capital_history', [])
  const [showForm, setShowForm] = useState(false)
  const [entry, setEntry] = useState({ amount: '', note: '', type: 'deposit' })

  const pct = Math.min(100, ((balance / GOAL) * 100)).toFixed(1)

  function addEntry() {
    const amt = parseFloat(entry.amount)
    if (!amt) return
    const delta = entry.type === 'withdrawal' ? -amt : amt
    const newBalance = Math.max(0, balance + delta)
    setBalance(newBalance)
    setHistory(h => [{
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      type: entry.type,
      amount: amt,
      note: entry.note,
      balance: newBalance,
    }, ...h])
    setEntry({ amount: '', note: '', type: 'deposit' })
    setShowForm(false)
  }

  function removeEntry(id, amt, type) {
    const delta = type === 'withdrawal' ? amt : -amt
    setBalance(b => Math.max(0, b + delta))
    setHistory(h => h.filter(e => e.id !== id))
  }

  if (compact) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Capital Stack</span>
          <span className="card-badge">{pct}%</span>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-label">Saved</div>
            <div className="stat-value accent">{fmt(balance)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Goal</div>
            <div className="stat-value">{fmt(GOAL)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Remaining</div>
            <div className="stat-value">{fmt(Math.max(0, GOAL - balance))}</div>
          </div>
        </div>
        <div className="progress-wrap" style={{ marginTop: 16 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: pct + '%' }} />
          </div>
          <div className="progress-label" style={{ marginTop: 6, marginBottom: 0 }}>
            <span>First Flip Down Payment</span>
            <span>{pct}% of {fmt(GOAL)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Capital Stack — First Flip Fund</span>
          <button className="btn btn-sm" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        <div className="stat-row" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="stat-label">Current Balance</div>
            <div className="stat-value accent">{fmt(balance)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Goal</div>
            <div className="stat-value">{fmt(GOAL)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Remaining</div>
            <div className="stat-value">{fmt(Math.max(0, GOAL - balance))}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Progress</div>
            <div className="stat-value green">{pct}%</div>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-label">
            <span>First Flip Down Payment Fund</span>
            <span>{fmt(balance)} / {fmt(GOAL)}</span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div className="progress-fill" style={{ width: pct + '%' }} />
          </div>
        </div>

        {showForm && (
          <div className="form-panel">
            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Type</label>
                <select value={entry.type} onChange={e => setEntry(v => ({ ...v, type: e.target.value }))}>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Amount ($)</label>
                <input
                  type="number"
                  placeholder="500"
                  value={entry.amount}
                  onChange={e => setEntry(v => ({ ...v, amount: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Note</label>
                <input
                  type="text"
                  placeholder="Dominion paycheck, spread profit..."
                  value={entry.note}
                  onChange={e => setEntry(v => ({ ...v, note: e.target.value }))}
                />
              </div>
            </div>
            <button className="btn" onClick={addEntry}>Save Entry</button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Transaction History</span>
            <span className="card-badge">{history.length} entries</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th>Balance After</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>
                      <span className={e.type === 'deposit' ? 'td-positive' : 'td-negative'}>
                        {e.type}
                      </span>
                    </td>
                    <td className={e.type === 'deposit' ? 'td-positive' : 'td-negative'}>
                      {e.type === 'deposit' ? '+' : '-'}{fmt(e.amount)}
                    </td>
                    <td style={{ color: 'var(--text-dim)' }}>{e.note || '—'}</td>
                    <td>{fmt(e.balance)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeEntry(e.id, e.amount, e.type)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
