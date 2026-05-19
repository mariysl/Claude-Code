import { useState } from 'react'
import CapitalStack from './components/CapitalStack'
import CreditSpreads from './components/CreditSpreads'
import FlipPipeline from './components/FlipPipeline'
import PhaseProgress from './components/PhaseProgress'
import NetWorth from './components/NetWorth'
import './App.css'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'capital', label: 'Capital Stack' },
  { id: 'spreads', label: 'Credit Spreads' },
  { id: 'flips', label: 'Flip Pipeline' },
  { id: 'networth', label: 'Net Worth' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">G</div>
            <div>
              <h1>Graystone Solutions</h1>
              <p className="brand-sub">Personal Wealth Dashboard · Amari Stocks</p>
            </div>
          </div>
          <div className="header-meta">
            <span className="phase-badge">Phase 1 — Active</span>
          </div>
        </div>
        <nav className="tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-full">
              <PhaseProgress />
            </div>
            <CapitalStack compact />
            <NetWorth compact />
            <CreditSpreads compact />
          </div>
        )}
        {activeTab === 'capital' && <CapitalStack />}
        {activeTab === 'spreads' && <CreditSpreads />}
        {activeTab === 'flips' && <FlipPipeline />}
        {activeTab === 'networth' && <NetWorth />}
      </main>
    </div>
  )
}
