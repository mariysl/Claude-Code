import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const STATUSES = ['Prospecting', 'Under Contract', 'Rehab', 'Listed', 'Closed']

const STATUS_CLASS = {
  'Prospecting': 'status-prospecting',
  'Under Contract': 'status-under-contract',
  'Rehab': 'status-rehab',
  'Listed': 'status-listed',
  'Closed': 'status-closed',
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const EMPTY_FORM = {
  address: '',
  purchasePrice: '',
  arv: '',
  rehabEstimate: '',
  status: 'Prospecting',
  notes: '',
}

export default function FlipPipeline() {
  const [deals, setDeals] = useLocalStorage('flip_deals', [])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('All')

  function calcProfit(deal) {
    const pp = parseFloat(deal.purchasePrice) || 0
    const arv = parseFloat(deal.arv) || 0
    const rehab = parseFloat(deal.rehabEstimate) || 0
    if (!pp && !arv) return null
    return arv - pp - rehab
  }

  function openForm(deal) {
    if (deal) {
      setEditId(deal.id)
      setForm({
        address: deal.address,
        purchasePrice: deal.purchasePrice,
        arv: deal.arv,
        rehabEstimate: deal.rehabEstimate,
        status: deal.status,
        notes: deal.notes || '',
      })
    } else {
      setEditId(null)
      setForm(EMPTY_FORM)
    }
    setShowForm(true)
  }

  function saveDeal() {
    if (!form.address) return
    if (editId) {
      setDeals(d => d.map(deal => deal.id === editId ? { ...deal, ...form } : deal))
    } else {
      setDeals(d => [{ id: Date.now(), ...form }, ...d])
    }
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  function removeDeal(id) {
    setDeals(d => d.filter(deal => deal.id !== id))
  }

  function updateStatus(id, status) {
    setDeals(d => d.map(deal => deal.id === id ? { ...deal, status } : deal))
  }

  const filtered = filterStatus === 'All' ? deals : deals.filter(d => d.status === filterStatus)

  const totalProjected = deals.reduce((s, d) => {
    const p = calcProfit(d)
    return p ? s + p : s
  }, 0)

  const closed = deals.filter(d => d.status === 'Closed')
  const closedProfit = closed.reduce((s, d) => {
    const p = calcProfit(d)
    return p ? s + p : s
  }, 0)

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Flip Pipeline — Graystone Solutions LLC</span>
          <button className="btn btn-sm" onClick={() => openForm(null)}>+ Add Deal</button>
        </div>

        <div className="stat-row" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="stat-label">Total Deals</div>
            <div className="stat-value accent">{deals.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Active</div>
            <div className="stat-value">{deals.filter(d => d.status !== 'Closed').length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Closed</div>
            <div className="stat-value green">{closed.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Realized Profit</div>
            <div className="stat-value green">{fmt(closedProfit)}</div>
            <div className="stat-sub">Phase 1 target: $25K</div>
          </div>
          <div className="stat">
            <div className="stat-label">Projected (Pipeline)</div>
            <div className="stat-value purple">{fmt(totalProjected)}</div>
          </div>
        </div>

        <div className="btn-row" style={{ marginBottom: 4 }}>
          {['All', ...STATUSES].map(s => (
            <button
              key={s}
              className={`btn btn-sm btn-ghost ${filterStatus === s ? 'active' : ''}`}
              style={filterStatus === s ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="form-panel">
            <div className="form-grid">
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Property Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, Richmond VA 23220"
                  value={form.address}
                  onChange={e => setForm(v => ({ ...v, address: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Purchase Price ($)</label>
                <input type="number" placeholder="120000" value={form.purchasePrice} onChange={e => setForm(v => ({ ...v, purchasePrice: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">ARV ($)</label>
                <input type="number" placeholder="200000" value={form.arv} onChange={e => setForm(v => ({ ...v, arv: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Rehab Estimate ($)</label>
                <input type="number" placeholder="35000" value={form.rehabEstimate} onChange={e => setForm(v => ({ ...v, rehabEstimate: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Notes</label>
                <input type="text" placeholder="Seller motivation, deal structure..." value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} />
              </div>
            </div>
            <div className="btn-row">
              <button className="btn" onClick={saveDeal}>{editId ? 'Update Deal' : 'Add Deal'}</button>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditId(null) }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="empty-state">
            <h3>No deals in pipeline</h3>
            <p>Add your first prospective property to start tracking.</p>
          </div>
        </div>
      ) : (
        <div className="flip-grid">
          {filtered.map(deal => {
            const profit = calcProfit(deal)
            return (
              <div key={deal.id} className="flip-card">
                <div className="flip-card-header">
                  <div className="flip-address">{deal.address}</div>
                  <span className={`status ${STATUS_CLASS[deal.status]}`}>{deal.status}</span>
                </div>

                <div className="flip-metrics">
                  <div className="flip-metric">
                    <div className="flip-metric-label">Purchase</div>
                    <div className="flip-metric-value">{fmt(deal.purchasePrice)}</div>
                  </div>
                  <div className="flip-metric">
                    <div className="flip-metric-label">ARV</div>
                    <div className="flip-metric-value">{fmt(deal.arv)}</div>
                  </div>
                  <div className="flip-metric">
                    <div className="flip-metric-label">Rehab</div>
                    <div className="flip-metric-value">{fmt(deal.rehabEstimate)}</div>
                  </div>
                  <div className="flip-metric">
                    <div className="flip-metric-label">Proj. Profit</div>
                    <div className={`flip-metric-value ${profit >= 0 ? 'profit' : ''}`}>
                      {profit !== null ? fmt(profit) : '—'}
                    </div>
                  </div>
                </div>

                {deal.notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{deal.notes}</p>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div className="input-label" style={{ marginBottom: 6 }}>Update Status</div>
                  <select
                    value={deal.status}
                    onChange={e => updateStatus(deal.id, e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flip-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => openForm(deal)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => removeDeal(deal.id)}>Remove</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
