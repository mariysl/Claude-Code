(function () {
  // ─── Configuration ────────────────────────────────────────────────────────
  // Find the script tag that loaded this file to read data-* attributes.
  const scriptTag = document.currentScript ||
    document.querySelector('script[src*="widget.js"]');

  // IMPORTANT: Change this to your deployed backend URL before going live.
  // Example: 'https://rva-leads-api.railway.app'
  const API_URL = (scriptTag && scriptTag.getAttribute('data-api-url')) ||
    'http://localhost:3001';

  const BUSINESS_NAME = (scriptTag && scriptTag.getAttribute('data-business-name')) ||
    'us';

  const FAB_LABEL = (scriptTag && scriptTag.getAttribute('data-label')) ||
    'Get a Free Quote';

  // ─── Inject CSS ───────────────────────────────────────────────────────────
  const cssUrl = API_URL + '/widget/widget.css';
  if (!document.querySelector(`link[href="${cssUrl}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.appendChild(link);
  }

  // ─── Build DOM ────────────────────────────────────────────────────────────
  // Floating action button
  const fab = document.createElement('button');
  fab.className = 'rval-fab';
  fab.setAttribute('aria-label', FAB_LABEL);
  fab.innerHTML = '&#9993;'; // envelope icon
  document.body.appendChild(fab);

  let overlay = null;

  function openModal() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'rval-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Request a callback');

    overlay.innerHTML = `
      <div class="rval-card" id="rval-card">
        <button class="rval-close" id="rval-close" aria-label="Close">&times;</button>
        <div class="rval-logo">RVA Leads</div>
        <h2>Request a Callback</h2>
        <p>Fill this out and ${BUSINESS_NAME} will call you back fast.</p>
        <form id="rval-form" novalidate>
          <div class="rval-field">
            <label for="rval-name">Your Name</label>
            <input type="text" id="rval-name" name="name" placeholder="John Smith" autocomplete="name" />
          </div>
          <div class="rval-field">
            <label for="rval-phone">Phone Number</label>
            <input type="tel" id="rval-phone" name="phone" placeholder="(804) 555-1234" autocomplete="tel" />
          </div>
          <div class="rval-field">
            <label for="rval-service">Service Needed</label>
            <select id="rval-service" name="service_type">
              <option value="">Select a service...</option>
              <option value="HVAC">HVAC (Heating &amp; Cooling)</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Landscaping">Landscaping</option>
              <option value="Roofing">Roofing</option>
            </select>
          </div>
          <div class="rval-field">
            <label for="rval-urgency">How Soon Do You Need Help?</label>
            <select id="rval-urgency" name="urgency">
              <option value="">Select urgency...</option>
              <option value="Emergency">Emergency — ASAP</option>
              <option value="ASAP">Within 24 hours</option>
              <option value="Within a week">Within a week</option>
              <option value="Just planning">Just planning ahead</option>
            </select>
          </div>
          <button type="submit" class="rval-submit" id="rval-submit">${FAB_LABEL}</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('rval-name').focus();

    // Close handlers
    document.getElementById('rval-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', escListener);

    document.getElementById('rval-form').addEventListener('submit', handleSubmit);
  }

  function closeModal() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    document.removeEventListener('keydown', escListener);
  }

  function escListener(e) {
    if (e.key === 'Escape') closeModal();
  }

  // ─── Validation & Submission ───────────────────────────────────────────────
  function clearErrors() {
    document.querySelectorAll('.rval-error').forEach(el => el.classList.remove('rval-error'));
    document.querySelectorAll('.rval-error-msg').forEach(el => el.remove());
  }

  function showFieldError(fieldEl, msg) {
    fieldEl.classList.add('rval-error');
    const err = document.createElement('div');
    err.className = 'rval-error-msg';
    err.textContent = msg;
    fieldEl.parentNode.appendChild(err);
  }

  function normalizePhone(raw) {
    return raw.replace(/\D/g, '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();

    const name    = document.getElementById('rval-name').value.trim();
    const phone   = document.getElementById('rval-phone').value.trim();
    const service = document.getElementById('rval-service').value;
    const urgency = document.getElementById('rval-urgency').value;

    let valid = true;

    if (!name) {
      showFieldError(document.getElementById('rval-name'), 'Please enter your name.');
      valid = false;
    }
    const digits = normalizePhone(phone);
    if (!phone || (digits.length !== 10 && digits.length !== 11)) {
      showFieldError(document.getElementById('rval-phone'), 'Enter a valid 10-digit phone number.');
      valid = false;
    }
    if (!service) {
      showFieldError(document.getElementById('rval-service'), 'Please select a service.');
      valid = false;
    }
    if (!urgency) {
      showFieldError(document.getElementById('rval-urgency'), 'Please select urgency.');
      valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('rval-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="rval-spinner"></span> Sending...';

    try {
      const res = await fetch(API_URL + '/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, service_type: service, urgency }),
      });

      if (res.ok) {
        showSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        btn.disabled = false;
        btn.innerHTML = FAB_LABEL;
        const errMsg = data.error || 'Something went wrong. Please try again.';
        const form = document.getElementById('rval-form');
        const existing = form.querySelector('.rval-error-msg.rval-top');
        if (existing) existing.remove();
        const top = document.createElement('div');
        top.className = 'rval-error-msg rval-top';
        top.style.marginBottom = '12px';
        top.textContent = errMsg;
        form.prepend(top);
      }
    } catch (_) {
      btn.disabled = false;
      btn.innerHTML = FAB_LABEL;
      alert('Connection error — please check your internet and try again.');
    }
  }

  function showSuccess() {
    const card = document.getElementById('rval-card');
    card.innerHTML = `
      <div class="rval-success">
        <div class="rval-success-icon">&#10003;</div>
        <h3>We got it!</h3>
        <p>Check your phone — a confirmation text is on its way. We'll call you back shortly.</p>
      </div>
    `;
    setTimeout(closeModal, 5000);
  }

  fab.addEventListener('click', openModal);
})();
