import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api';

export default function Settings() {
  const [form, setForm]       = useState({
    business_name: '',
    owner_phone: '',
    google_review_url: '',
    callback_eta: 'within 2 hours',
    review_count: 0,
  });
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(data => {
      setForm({
        business_name:     data.business_name     || '',
        owner_phone:       data.owner_phone       || '',
        google_review_url: data.google_review_url || '',
        callback_eta:      data.callback_eta      || 'within 2 hours',
        review_count:      data.review_count      || 0,
      });
      setLoading(false);
    });
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateSettings(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Determine backend URL for embed snippet
  const backendUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-black text-navy mb-6">Settings</h2>

      <form onSubmit={handleSave} className="space-y-5">

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-bold text-navy text-sm uppercase tracking-wider">Business Info</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name</label>
            <input
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              placeholder="Richmond HVAC Pro"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange"
            />
            <p className="text-xs text-gray-400 mt-1">Appears in all automated SMS messages.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Phone Number</label>
            <input
              name="owner_phone"
              value={form.owner_phone}
              onChange={handleChange}
              placeholder="+18045550100"
              type="tel"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Callback ETA (in SMS)</label>
            <input
              name="callback_eta"
              value={form.callback_eta}
              onChange={handleChange}
              placeholder="within 2 hours"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange"
            />
            <p className="text-xs text-gray-400 mt-1">{"Used in: \"We'll call you [ETA].\""}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-bold text-navy text-sm uppercase tracking-wider">Google Reviews</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Google Review Link</label>
            <input
              name="google_review_url"
              value={form.google_review_url}
              onChange={handleChange}
              placeholder="https://g.page/r/YOUR_PLACE_ID/review"
              type="url"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange"
            />
            <p className="text-xs text-gray-400 mt-1">
              Sent automatically when a job is marked Closed.{' '}
              <a href="https://support.google.com/business/answer/7035772" target="_blank" rel="noreferrer" className="text-orange underline">
                How to find your link →
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Google Reviews (manual)</label>
            <input
              name="review_count"
              value={form.review_count}
              onChange={handleChange}
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange"
            />
            <p className="text-xs text-gray-400 mt-1">Update this whenever your Google review count goes up.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-orange text-white rounded-xl font-bold text-base hover:bg-orange-dark transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </form>

      {/* Widget Embed Code */}
      <div className="mt-8 bg-navy rounded-xl p-5">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-2">Widget Embed Code</h3>
        <p className="text-white/60 text-xs mb-3">Add this to any page on your business website:</p>
        <div className="bg-black/30 rounded-lg p-3 overflow-x-auto">
          <pre className="text-green-400 text-xs whitespace-pre-wrap break-all">{`<script
  src="${backendUrl}/widget/widget.js"
  data-api-url="${backendUrl}"
  data-business-name="${form.business_name || 'My Business'}"
  data-label="Get a Free Quote"
  defer
></script>`}</pre>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(
              `<script\n  src="${backendUrl}/widget/widget.js"\n  data-api-url="${backendUrl}"\n  data-business-name="${form.business_name || 'My Business'}"\n  data-label="Get a Free Quote"\n  defer\n></script>`
            );
          }}
          className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Copy Code
        </button>
      </div>
    </div>
  );
}
