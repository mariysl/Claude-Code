import React from 'react';
import LeadCard from './LeadCard';

const COLUMNS = [
  { status: 'new',       label: 'New',       color: 'bg-blue-500',   ring: 'ring-blue-200'   },
  { status: 'contacted', label: 'Contacted',  color: 'bg-yellow-500', ring: 'ring-yellow-200' },
  { status: 'booked',    label: 'Booked',     color: 'bg-green-500',  ring: 'ring-green-200'  },
  { status: 'closed',    label: 'Closed',     color: 'bg-gray-400',   ring: 'ring-gray-200'   },
];

function KanbanColumn({ column, leads, onUpdate }) {
  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <span className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
        <h3 className="font-bold text-navy text-sm uppercase tracking-wider">{column.label}</h3>
        <span className={`ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full ring-1 ${column.ring}`}>
          {leads.length}
        </span>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin pb-4 pr-1">
        {leads.length === 0 ? (
          <div className="text-center py-10 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            No {column.label.toLowerCase()} leads
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onUpdate={onUpdate} />
          ))
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ leads, onUpdate }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-6">
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col.status}
          column={col}
          leads={leads.filter(l => l.status === col.status)}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
