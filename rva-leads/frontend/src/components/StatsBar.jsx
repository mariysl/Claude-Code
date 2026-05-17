import React from 'react';

function StatCard({ label, value, sub, color = 'text-navy' }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex-1 min-w-[140px]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StatsBar({ stats, loading }) {
  if (loading) {
    return (
      <div className="flex gap-3 px-4 md:px-6 mb-4 overflow-x-auto">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex-1 min-w-[140px] animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const openLeads = stats?.by_status?.find(s => s.status === 'new')?.count ?? 0;
  const responseStr = stats?.avg_response_minutes != null
    ? stats.avg_response_minutes < 60
      ? `${stats.avg_response_minutes}m`
      : `${Math.round(stats.avg_response_minutes / 60)}h`
    : '—';

  return (
    <div className="flex gap-3 px-4 md:px-6 mb-4 overflow-x-auto pb-1">
      <StatCard
        label="This Week"
        value={stats?.week_leads ?? 0}
        sub="new leads"
        color="text-blue-600"
      />
      <StatCard
        label="Open Leads"
        value={openLeads}
        sub="need follow-up"
        color={openLeads > 0 ? 'text-orange' : 'text-gray-400'}
      />
      <StatCard
        label="Avg Response"
        value={responseStr}
        sub="new → contacted"
        color="text-green-600"
      />
      <StatCard
        label="Conversion"
        value={stats?.conversion_rate != null ? `${stats.conversion_rate}%` : '—'}
        sub="last 30 days"
        color="text-purple-600"
      />
      <StatCard
        label="Revenue"
        value={stats?.week_revenue ? `$${Math.round(stats.week_revenue).toLocaleString()}` : '$0'}
        sub="closed this week"
        color="text-green-700"
      />
    </div>
  );
}
