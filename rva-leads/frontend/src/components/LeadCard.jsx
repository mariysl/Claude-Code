import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import { updateLead, getLead, sendManualSMS } from '../api';

const SERVICE_ICONS = {
  HVAC:         '❄️',
  Plumbing:     '🔧',
  Electrical:   '⚡',
  Landscaping:  '🌿',
  Roofing:      '🏠',
};

const STATUSES = ['new', 'contacted', 'booked', 'closed'];

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LeadCard({ lead, onUpdate }) {
  const [expanded, setExpanded]       = useState(false);
  const [notes, setNotes]             = useState(lead.notes || '');
  const [revenue, setRevenue]         = useState(lead.revenue || '');
  const [touchpoints, setTouchpoints] = useState(null);
  const [smsText, setSmsText]         = useState('');
  const [sending, setSending]         = useState(false);
  const [saving, setSaving]           = useState(false);

  async function loadTouchpoints() {
    if (touchpoints) return;
    const data = await getLead(lead.id);
    setTouchpoints(data.touchpoints);
  }

  async function handleExpand() {
    if (!expanded) await loadTouchpoints();
    setExpanded(v => !v);
  }

  async function handleStatusChange(newStatus) {
    const updated = await updateLead(lead.id, { status: newStatus });
    onUpdate(updated);
  }

  async function handleSaveNotes() {
    setSaving(true);
    const updated = await updateLead(lead.id, { notes, revenue: revenue ? parseFloat(revenue) : null });
    setSaving(false);
    onUpdate(updated);
  }

  async function handleSendSMS() {
    if (!smsText.trim()) return;
    setSending(true);
    try {
      await sendManualSMS(lead.id, smsText.trim());
      setSmsText('');
      const data = await getLead(lead.id);
      setTouchpoints(data.touchpoints);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header — always visible */}
      <button
        onClick={handleExpand}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{SERVICE_ICONS[lead.service_type] || '📋'}</span>
            <div className="min-w-0">
              <p className="font-semibold text-navy truncate">{lead.name}</p>
              <p className="text-sm text-gray-500">{lead.service_type}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <StatusBadge value={lead.urgency} type="urgency" />
            <span className="text-xs text-gray-400">{timeAgo(lead.created_at)}</span>
          </div>
        </div>

        {/* Phone — tap to call */}
        <a
          href={`tel:${lead.phone}`}
          onClick={e => e.stopPropagation()}
          className="mt-2 flex items-center gap-1.5 text-sm text-orange font-medium hover:text-orange-dark"
        >
          📞 {lead.phone}
        </a>
      </button>

      {/* Status change row */}
      <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
        {STATUSES.filter(s => s !== lead.status).map(s => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className="px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors capitalize"
          >
            → {s}
          </button>
        ))}
        {lead.google_review_sent === 1 && (
          <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
            ⭐ Review sent
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Add notes about this job..."
              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-orange"
            />
          </div>

          {/* Revenue (closed only) */}
          {lead.status === 'closed' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Revenue ($)</label>
              <input
                type="number"
                value={revenue}
                onChange={e => setRevenue(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-orange"
              />
            </div>
          )}

          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="w-full py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Send SMS */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Send SMS</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-orange"
                onKeyDown={e => e.key === 'Enter' && handleSendSMS()}
              />
              <button
                onClick={handleSendSMS}
                disabled={sending || !smsText.trim()}
                className="px-4 py-2 bg-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-dark transition-colors disabled:opacity-50"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Touchpoint timeline */}
          {touchpoints && touchpoints.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">History</label>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                {touchpoints.map(tp => (
                  <div key={tp.id} className="flex gap-2 text-xs">
                    <span className="text-gray-400 flex-shrink-0 w-16">
                      {new Date(tp.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`flex-shrink-0 font-medium ${tp.type === 'sms_sent' ? 'text-blue-600' : 'text-gray-500'}`}>
                      {tp.type === 'sms_sent' ? '📱 SMS' : tp.type === 'status_change' ? '🔄 Status' : '📝 Note'}
                    </span>
                    <span className="text-gray-600 truncate">{tp.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
