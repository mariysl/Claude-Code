import { useLocalStorage } from '../hooks/useLocalStorage'

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const FIELDS = [
  { key: 'cash', label: 'Cash & Savings', placeholder: '5000', color: 'var(--accent)' },
  { key: 'brokerage', label: 'Brokerage (tastytrade)', placeholder: '3000', color: 'var(--accent-purple)' },
  { key: 'realEstate', label: 'Real Estate Equity', placeholder: '0', color: 'var(--accent-green)' },
  { key: 'business', label: 'Business Value', placeholder: '0', color: 'var(--accent-yellow)' },
  { key: 'other', label: 'Other Assets', placeholder: '0', color: 'var(--accent-cyan)' },
]

const LIABILITIES = [
  { key: 'studentLoans', label: 'Student Loans', placeholder: '0' },
  { key: 'creditCards', label: 'Credit Card Debt', placeholder: '0' },
  { key: 'otherDebt', label: 'Other Liabilities', placeholder: '0' },
]

export default function NetWorth({ compact }) {
  const [assets, setAssets] = useLocalStorage('networth_assets', {})
  const [liabilities, setLiabilities] = useLocalStorage('networth_liabilities', {})

  const totalAssets = FIELDS.reduce((s, f) => s + (parseFloat(assets[f.key]) || 0), 0)
  const totalLiabilities = LIABILITIES.reduce((s, f) => s + (parseFloat(liabilities[f.key]) || 0), 0)
  const netWorth = totalAssets - totalLiabilities

  function setAsset(key, val) {
    setAssets(a => ({ ...a, [key]: val }))
  }

  function setLiability(key, val) {
    setLiabilities(l => ({ ...l, [key]: val }))
  }

  if (compact) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Net Worth Snapshot</span>
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value accent">{fmt(totalAssets)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Liabilities</div>
            <div className="stat-value red">{fmt(totalLiabilities)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Net Worth</div>
            <div className={`stat-value ${netWorth >= 0 ? 'green' : 'red'}`}>{fmt(netWorth)}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FIELDS.map(f => {
            const val = parseFloat(assets[f.key]) || 0
            const pct = totalAssets > 0 ? (val / totalAssets) * 100 : 0
            return (
              <div key={f.key} style={{ flex: '1 1 80px', minWidth: 80 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: f.color }}>{fmt(val)}</div>
                {totalAssets > 0 && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{pct.toFixed(0)}%</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Net Worth Snapshot</span>
          <span className="card-badge">Manual Input</span>
        </div>

        <div className="stat-row" style={{ marginBottom: 24 }}>
          <div className="stat">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value accent">{fmt(totalAssets)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total Liabilities</div>
            <div className="stat-value red">{fmt(totalLiabilities)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Net Worth</div>
            <div className={`stat-value ${netWorth >= 0 ? 'green' : 'red'}`}>{fmt(netWorth)}</div>
          </div>
        </div>

        {totalAssets > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="input-label" style={{ marginBottom: 8 }}>Asset Allocation</div>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
              {FIELDS.map(f => {
                const val = parseFloat(assets[f.key]) || 0
                const pct = totalAssets > 0 ? (val / totalAssets) * 100 : 0
                return pct > 0 ? (
                  <div
                    key={f.key}
                    style={{ width: pct + '%', background: f.color, minWidth: 4 }}
                    title={`${f.label}: ${pct.toFixed(1)}%`}
                  />
                ) : null
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
              {FIELDS.map(f => {
                const val = parseFloat(assets[f.key]) || 0
                if (!val) return null
                const pct = (val / totalAssets) * 100
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: f.color }} />
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f.label} {pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <hr className="divider" />
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>Assets</div>
        <div className="form-grid">
          {FIELDS.map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label" style={{ color: f.color }}>{f.label}</label>
              <input
                type="number"
                placeholder={f.placeholder}
                value={assets[f.key] || ''}
                onChange={e => setAsset(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <hr className="divider" />
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>Liabilities</div>
        <div className="form-grid">
          {LIABILITIES.map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label" style={{ color: 'var(--accent-red)' }}>{f.label}</label>
              <input
                type="number"
                placeholder={f.placeholder}
                value={liabilities[f.key] || ''}
                onChange={e => setLiability(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
