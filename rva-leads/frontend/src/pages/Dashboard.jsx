import React, { useState, useEffect, useCallback } from 'react';
import KanbanBoard from '../components/KanbanBoard';
import StatsBar from '../components/StatsBar';
import WeeklySummary from '../components/WeeklySummary';
import { getLeads, getStats } from '../api';

export default function Dashboard() {
  const [leads, setLeads]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError]         = useState(null);

  const fetchLeads = useCallback(async () => {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (e) {
      setError('Could not load leads. Is the backend running?');
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch {
      // Stats failing silently is acceptable
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchStats();
    const interval = setInterval(() => {
      fetchLeads();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads, fetchStats]);

  function handleLeadUpdate(updatedLead) {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    fetchStats();
  }

  return (
    <div className="h-full flex flex-col pt-4">
      {error && (
        <div className="mx-4 md:mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      <StatsBar stats={stats} loading={loadingStats} />
      <WeeklySummary stats={stats} />

      {loadingLeads ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-spin">⚙️</div>
            <p>Loading leads...</p>
          </div>
        </div>
      ) : (
        <KanbanBoard leads={leads} onUpdate={handleLeadUpdate} />
      )}
    </div>
  );
}
