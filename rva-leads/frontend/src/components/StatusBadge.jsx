import React from 'react';

const STATUS_STYLES = {
  new:        'bg-blue-100 text-blue-800',
  contacted:  'bg-yellow-100 text-yellow-800',
  booked:     'bg-green-100 text-green-800',
  closed:     'bg-gray-100 text-gray-700',
};

const URGENCY_STYLES = {
  'Emergency':      'bg-red-100 text-red-800',
  'ASAP':           'bg-orange-100 text-orange-800',
  'Within a week':  'bg-yellow-100 text-yellow-800',
  'Just planning':  'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
  new:       'New',
  contacted: 'Contacted',
  booked:    'Booked',
  closed:    'Closed',
};

export default function StatusBadge({ value, type = 'status', className = '' }) {
  const styles = type === 'urgency' ? URGENCY_STYLES : STATUS_STYLES;
  const label  = type === 'status' ? (STATUS_LABELS[value] || value) : value;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[value] || 'bg-gray-100 text-gray-600'} ${className}`}>
      {label}
    </span>
  );
}
