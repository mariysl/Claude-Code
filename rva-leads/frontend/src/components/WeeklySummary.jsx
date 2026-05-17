import React from 'react';

export default function WeeklySummary({ stats }) {
  if (!stats?.daily_counts) return null;

  const total = stats.daily_counts.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mx-4 md:mx-6 mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-navy text-sm">Last 7 Days</h3>
      </div>
      <div className="flex overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {stats.daily_counts.map(d => (
                <th key={d.day} className="px-3 py-2 text-center font-semibold text-gray-500 text-xs uppercase">
                  {d.day}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-gray-500 text-xs uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {stats.daily_counts.map(d => (
                <td key={d.day} className="px-3 py-3 text-center">
                  <span className={`font-bold text-lg ${d.count > 0 ? 'text-navy' : 'text-gray-300'}`}>
                    {d.count}
                  </span>
                </td>
              ))}
              <td className="px-3 py-3 text-center">
                <span className="font-black text-lg text-orange">{total}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
