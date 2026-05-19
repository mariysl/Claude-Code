const PHASES = [
  {
    num: 1,
    label: 'Foundation',
    age: '21–23',
    status: 'active',
    targets: [
      '$25K net from first flip',
      '$500–$800/mo credit spreads',
      'Dominion Energy income',
    ],
    milestone: 'Close first fix-and-flip with Graystone Solutions',
  },
  {
    num: 2,
    label: 'Scale Capital',
    age: '23–25',
    status: 'upcoming',
    targets: [
      '$150K capital saved',
      'Second flip completed',
      'Transition to Systems Analyst',
    ],
    milestone: '$150K acquisition war chest',
  },
  {
    num: 3,
    label: 'Acquisition',
    age: '25–27',
    status: 'upcoming',
    targets: [
      'SBA 7(a) business acquisition',
      'HVAC / plumbing / property maintenance',
      '$400K–$500K SDE target',
      '~$1.5M purchase, 10% down',
    ],
    milestone: 'Close service business via SBA 7(a)',
  },
  {
    num: 4,
    label: 'Tax Shield Loop',
    age: '27+',
    status: 'upcoming',
    targets: [
      'Commercial real estate via business',
      'Cost segregation & depreciation',
      'Offset business profits',
      'Build wealth tax-efficiently',
    ],
    milestone: 'First commercial property under business entity',
  },
]

export default function PhaseProgress() {
  const currentPhase = PHASES.find(p => p.status === 'active')

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Wealth Path — Phase Progress</span>
        <span className="card-badge">Age 21 · Phase 1 Active</span>
      </div>

      <div className="phase-timeline">
        {PHASES.map((phase, i) => (
          <div key={phase.num} className="phase-item">
            <div className="phase-dot-wrap">
              {i > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  right: '50%',
                  left: 0,
                  height: 2,
                  background: phase.status === 'complete'
                    ? 'var(--accent-green)'
                    : 'var(--border)',
                  transform: 'translateY(-50%)',
                  zIndex: 0,
                }} />
              )}
              {i < PHASES.length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  right: 0,
                  height: 2,
                  background: 'var(--border)',
                  transform: 'translateY(-50%)',
                  zIndex: 0,
                }} />
              )}
              <div className={`phase-dot ${phase.status}`}>{phase.num}</div>
            </div>
            <div className="phase-content">
              <div className={`phase-label ${phase.status !== 'active' ? 'dim' : ''}`}>
                Phase {phase.num} · {phase.label}
              </div>
              <div className="phase-age">Age {phase.age}</div>
              <div className="phase-target">
                {phase.targets.map((t, j) => (
                  <div key={j} style={{ marginBottom: 2 }}>
                    <strong>{t}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentPhase && (
        <div className="next-milestone">
          <div className="milestone-icon">🎯</div>
          <div className="milestone-text">
            <h3>Next Milestone — Phase {currentPhase.num}</h3>
            <p>{currentPhase.milestone}</p>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border-light)' }}>
          <div className="stat-label">Current Income</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginTop: 4 }}>Dominion Energy</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Associate Program Analyst · $1,500–$2,000/mo take-home</div>
        </div>
        <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border-light)' }}>
          <div className="stat-label">Active Entities</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginTop: 4 }}>Graystone Solutions LLC</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Fix-and-flip real estate · Richmond, VA</div>
        </div>
        <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border-light)' }}>
          <div className="stat-label">Brand</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginTop: 4 }}>Amari Stocks</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Finance content · options trading education</div>
        </div>
        <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border-light)' }}>
          <div className="stat-label">Education</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginTop: 4 }}>CS Junior — May 2027</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Graduating Richmond, VA · transitioning to Systems Analyst</div>
        </div>
      </div>
    </div>
  )
}
