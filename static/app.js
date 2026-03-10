/* ── Example presets ──────────────────────────────────────────────────── */
const EXAMPLES = {
  plan_launch: `Plan a product launch for our new B2B SaaS analytics tool launching in 60 days. We need:
- A full action plan with tasks, owners, and priorities
- A launch week meeting agenda
- Draft announcement emails to prospects and existing customers
- A social media campaign for LinkedIn and Twitter`,

  sales_email: `Create a sales email campaign to reach out to potential enterprise clients for our cloud security product.
- Draft a cold outreach email (persuasive tone)
- Draft a follow-up email for non-responders (friendly tone)
- Draft a meeting request email (formal tone)
Target audience: CTOs and CISOs at companies with 500+ employees`,

  roi_analysis: `Calculate the ROI for a proposed marketing campaign:
- Investment: $75,000
- Projected revenue generated: $280,000
- Campaign duration: 6 months
- Customer acquisition cost: $250 per customer
- Average customer lifetime value: $3,200

Also calculate our break-even point if fixed costs are $45,000 and each unit sells for $120 with $35 variable cost.`,

  onboarding: `Create a complete new employee onboarding process for a sales representative joining our team:
- Day 1 checklist (HR, IT setup, introductions)
- Week 1 training SOP (product knowledge, CRM setup, sales process)
- 30-day action plan with milestones
- Draft a welcome email from the hiring manager`,

  meeting: `Set up a weekly marketing team standup meeting:
- 45-minute agenda for a team of 6
- Cover: campaign updates, metrics review, blockers, upcoming launches
- Create a report template for weekly marketing metrics
- Draft a recurring meeting invite email`,

  social: `Create a social media campaign to announce our company's Series A funding of $12M.
Generate posts for LinkedIn, Twitter/X, and Instagram with appropriate tone and hashtags for each platform.`,

  sop: `Write a standard operating procedure for our customer support team to handle refund requests.
The process should cover: receiving the request, verification, approval workflow, processing, and follow-up communication.
Include a checklist and draft the email templates for approved and denied refunds.`
};

/* ── State ────────────────────────────────────────────────────────────── */
let isRunning = false;
let toolProgressMap = {}; // tool_name -> element

/* ── Setup ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('processInput');
  const charCount = document.getElementById('charCount');

  input.addEventListener('input', () => {
    const len = input.value.length;
    charCount.textContent = `${len} / 2000`;
    if (len > 2000) input.value = input.value.slice(0, 2000);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAutomation();
  });
});

function setExample(key) {
  // Update active nav button
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  if (!key) {
    document.getElementById('processInput').value = '';
    document.getElementById('charCount').textContent = '0 / 2000';
    return;
  }

  const text = EXAMPLES[key] || '';
  const input = document.getElementById('processInput');
  input.value = text;
  document.getElementById('charCount').textContent = `${text.length} / 2000`;
  input.focus();
}

/* ── Main automation function ─────────────────────────────────────────── */
async function runAutomation() {
  if (isRunning) return;

  const input = document.getElementById('processInput');
  const message = input.value.trim();
  if (!message) {
    input.focus();
    return;
  }

  isRunning = true;
  toolProgressMap = {};

  // Reset UI
  const outputSection = document.getElementById('outputSection');
  const statusBar = document.getElementById('statusBar');
  const statusText = document.getElementById('statusText');
  const responseText = document.getElementById('responseText');
  const artifactsGrid = document.getElementById('artifactsGrid');
  const runBtn = document.getElementById('runBtn');

  outputSection.style.display = 'block';
  statusBar.className = 'status-bar';
  statusText.textContent = 'Connecting to Claude...';
  responseText.style.display = 'none';
  responseText.innerHTML = '';
  artifactsGrid.innerHTML = '';
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="tool-spinner"></span> Running...';

  // Insert tool progress container before artifacts
  const progressContainer = document.createElement('div');
  progressContainer.className = 'tool-progress';
  progressContainer.id = 'toolProgress';
  artifactsGrid.before(progressContainer);

  try {
    const response = await fetch('/automate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      let currentEvent = null;
      let currentData = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6).trim();
          if (currentEvent && currentData) {
            handleSSEEvent(currentEvent, currentData, statusText, statusBar, responseText);
            currentEvent = null;
            currentData = null;
          }
        }
      }
    }
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusText.textContent = `Error: ${err.message}`;
  } finally {
    isRunning = false;
    runBtn.disabled = false;
    runBtn.innerHTML = '<span class="run-icon">▶</span> Automate';
  }
}

function handleSSEEvent(event, dataStr, statusText, statusBar, responseText) {
  let data;
  try { data = JSON.parse(dataStr); } catch { return; }

  const progressContainer = document.getElementById('toolProgress');

  switch (event) {
    case 'start':
      statusText.textContent = data.message;
      break;

    case 'text_delta':
      responseText.style.display = 'block';
      responseText.textContent += data.text;
      break;

    case 'tool_start': {
      statusText.textContent = data.message;
      // Add progress item
      const item = document.createElement('div');
      item.className = 'tool-progress-item';
      item.id = `progress-${data.tool}`;
      item.innerHTML = `<div class="tool-spinner"></div><span>${data.message}</span>`;
      progressContainer.appendChild(item);
      toolProgressMap[data.tool] = item;
      break;
    }

    case 'tool_executing': {
      const item = toolProgressMap[data.tool];
      if (item) {
        const span = item.querySelector('span');
        if (span) span.textContent = data.message;
      }
      statusText.textContent = data.message;
      break;
    }

    case 'tool_done': {
      const item = toolProgressMap[data.tool];
      if (item) {
        item.innerHTML = `<span class="tool-check">✓</span><span style="color:var(--text-dim)">${data.message}</span>`;
      }
      statusText.textContent = data.message;
      break;
    }

    case 'artifact':
      renderArtifact(data.data, data.tool);
      break;

    case 'complete':
      statusBar.className = 'status-bar done';
      statusText.textContent = data.artifacts_count > 0
        ? `Done — ${data.artifacts_count} artifact${data.artifacts_count !== 1 ? 's' : ''} created`
        : 'Done';
      break;
  }
}

/* ── Artifact rendering ───────────────────────────────────────────────── */
function renderArtifact(data, toolName) {
  const grid = document.getElementById('artifactsGrid');
  let el;

  switch (data.type) {
    case 'email':       el = renderEmail(data); break;
    case 'report':      el = renderReport(data); break;
    case 'spreadsheet': el = renderSpreadsheet(data); break;
    case 'analysis':    el = renderAnalysis(data); break;
    case 'action_plan': el = renderActionPlan(data); break;
    case 'social_posts':el = renderSocialPosts(data); break;
    case 'meeting_agenda': el = renderMeetingAgenda(data); break;
    case 'calculation': el = renderCalculation(data); break;
    case 'checklist':   el = renderChecklist(data); break;
    case 'extracted_info': el = renderExtractedInfo(data); break;
    default: return;
  }

  grid.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Email ────────────────────────────────────────────────────────────── */
function renderEmail(d) {
  const wrap = artifact('email', '✉️', `Email to ${esc(d.to)}`);
  const body = wrap.querySelector('.artifact-body');

  body.innerHTML = `
    <div class="email-meta">
      <div class="email-field"><span class="email-field-label">To:</span><span class="email-field-value">${esc(d.to)}</span></div>
      <div class="email-field"><span class="email-field-label">Subject:</span><span class="email-field-value">${esc(d.subject)}</span></div>
      <div class="email-field"><span class="email-field-label">Tone:</span><span class="tone-badge tone-${esc(d.tone)}">${esc(d.tone)}</span></div>
    </div>
    <div class="email-body-text">${esc(d.body)}</div>
  `;
  addCopyBtn(wrap, d.body, 'Email body copied!');
  return wrap;
}

/* ── Report ───────────────────────────────────────────────────────────── */
function renderReport(d) {
  const wrap = artifact('report', '📄', esc(d.title));
  const body = wrap.querySelector('.artifact-body');

  const sectionsHtml = d.sections.map(s => `
    <div class="report-section">
      <div class="report-section-heading">${esc(s.heading)}</div>
      <div class="report-section-content">${esc(s.content)}</div>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="report-summary">${esc(d.summary)}</div>
    ${sectionsHtml}
  `;

  const fullText = `# ${d.title}\n\n## Summary\n${d.summary}\n\n` +
    d.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n');
  addCopyBtn(wrap, fullText, 'Report copied!');
  return wrap;
}

/* ── Spreadsheet ──────────────────────────────────────────────────────── */
function renderSpreadsheet(d) {
  const wrap = artifact('spreadsheet', '📊', `${esc(d.filename)}.csv`);
  const body = wrap.querySelector('.artifact-body');

  const headerHtml = d.headers.map(h => `<th>${esc(String(h))}</th>`).join('');
  const rowsHtml = d.rows.map(row =>
    `<tr>${row.map(cell => `<td>${esc(String(cell))}</td>`).join('')}</tr>`
  ).join('');

  body.innerHTML = `
    <div class="spreadsheet-desc">${esc(d.description)}</div>
    <div class="spreadsheet-table-wrap">
      <table class="spreadsheet-table">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <button class="csv-download" onclick="downloadCSV(this)">⬇ Download CSV</button>
  `;

  // Store CSV for download
  body.querySelector('.csv-download')._csv = d.csv_content;
  body.querySelector('.csv-download')._filename = d.filename;
  return wrap;
}

function downloadCSV(btn) {
  const csv = btn._csv;
  const filename = btn._filename + '.csv';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Analysis ─────────────────────────────────────────────────────────── */
function renderAnalysis(d) {
  const wrap = artifact('analysis', '📈', `Analysis: ${esc(d.description)}`);
  const body = wrap.querySelector('.artifact-body');

  let statsHtml = '';
  if (d.statistics && Object.keys(d.statistics).length) {
    const s = d.statistics;
    statsHtml = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${s.count}</div><div class="stat-label">Count</div></div>
        <div class="stat-card"><div class="stat-value">${s.mean}</div><div class="stat-label">Mean</div></div>
        <div class="stat-card"><div class="stat-value">${s.median}</div><div class="stat-label">Median</div></div>
        <div class="stat-card"><div class="stat-value">${s.std_dev}</div><div class="stat-label">Std Dev</div></div>
      </div>
    `;
  }

  let catsHtml = '';
  if (d.categories) {
    const maxVal = Math.max(...d.categories.map(c => c.value));
    catsHtml = `<div class="category-bars">` +
      d.categories.map(c => `
        <div class="category-row">
          <div class="category-label-row">
            <span>${esc(c.name)}</span>
            <span>${c.value} (${c.percentage}%)</span>
          </div>
          <div class="category-bar-bg">
            <div class="category-bar-fill" style="width:${(c.value/maxVal*100).toFixed(1)}%"></div>
          </div>
        </div>
      `).join('') +
    `</div>`;
  }

  let insightsHtml = '';
  if (d.insights && d.insights.length) {
    insightsHtml = `<div class="analysis-insights">` +
      d.insights.map(i => `<div class="insight-item">${esc(i)}</div>`).join('') +
    `</div>`;
  }

  body.innerHTML = statsHtml + catsHtml + insightsHtml;
  return wrap;
}

/* ── Action Plan ──────────────────────────────────────────────────────── */
function renderActionPlan(d) {
  const wrap = artifact('action-plan', '🎯', esc(d.project_name));
  const body = wrap.querySelector('.artifact-body');

  const tasksHtml = d.tasks.map(t => {
    const statusClass = 'status-' + (t.status || 'not started').replace(/\s+/g, '-');
    const priorityClass = 'priority-' + (t.priority || 'medium');
    return `
      <tr>
        <td>${esc(t.task)}</td>
        <td>${t.owner ? esc(t.owner) : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${t.deadline ? esc(t.deadline) : '<span style="color:var(--text-muted)">TBD</span>'}</td>
        <td><span class="priority-badge ${priorityClass}">${esc(t.priority || 'medium')}</span></td>
        <td><span class="status-pill ${statusClass}">${esc(t.status || 'not started')}</span></td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <div class="plan-meta">
      <span class="plan-badge">📋 ${esc(d.objective)}</span>
      <span class="plan-badge">⏱ ${esc(d.timeline)}</span>
    </div>
    <div class="tasks-table-wrap">
      <table class="tasks-table">
        <thead><tr><th>Task</th><th>Owner</th><th>Deadline</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>${tasksHtml}</tbody>
      </table>
    </div>
  `;
  return wrap;
}

/* ── Social Posts ─────────────────────────────────────────────────────── */
function renderSocialPosts(d) {
  const wrap = artifact('social', '📱', `Social: ${esc(d.topic.slice(0, 40))}...`);
  const body = wrap.querySelector('.artifact-body');

  const platformIcons = { LinkedIn: '💼', 'Twitter/X': '🐦', Instagram: '📸', Facebook: '👥' };

  const postsHtml = d.posts.map(p => {
    const icon = platformIcons[p.platform] || '📢';
    const hashtagsHtml = p.hashtags
      ? p.hashtags.map(h => `<span class="hashtag">#${esc(h.replace(/^#/, ''))}</span>`).join('')
      : '';
    return `
      <div class="social-post">
        <div class="social-platform">${icon} ${esc(p.platform)}</div>
        <div class="social-content">${esc(p.content)}</div>
        ${hashtagsHtml ? `<div class="social-hashtags">${hashtagsHtml}</div>` : ''}
      </div>
    `;
  }).join('');

  body.innerHTML = `<div class="social-posts">${postsHtml}</div>`;

  const allText = d.posts.map(p => `[${p.platform}]\n${p.content}${p.hashtags ? '\n' + p.hashtags.map(h => '#' + h.replace(/^#/,'')).join(' ') : ''}`).join('\n\n');
  addCopyBtn(wrap, allText, 'Posts copied!');
  return wrap;
}

/* ── Meeting Agenda ───────────────────────────────────────────────────── */
function renderMeetingAgenda(d) {
  const wrap = artifact('meeting', '📅', esc(d.meeting_title));
  const body = wrap.querySelector('.artifact-body');

  const objectivesHtml = d.objectives.map(o => `<div class="objective-item">${esc(o)}</div>`).join('');

  let runningTime = 0;
  const agendaHtml = d.agenda_items.map(item => {
    const startMin = runningTime;
    runningTime += item.duration_minutes;
    const timeStr = `${item.duration_minutes}m`;
    return `
      <div class="agenda-item">
        <div class="agenda-time">${timeStr}</div>
        <div class="agenda-content">
          <div class="agenda-item-title">${esc(item.item)}</div>
          ${item.owner ? `<div class="agenda-item-owner">Lead: ${esc(item.owner)}</div>` : ''}
          ${item.notes ? `<div class="step-details">${esc(item.notes)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="meeting-meta">
      <div class="meeting-meta-item"><strong>When:</strong> ${esc(d.date_time || 'TBD')}</div>
      <div class="meeting-meta-item"><strong>Duration:</strong> ${d.duration_minutes} min</div>
      ${d.attendees && d.attendees.length ? `<div class="meeting-meta-item"><strong>Attendees:</strong> ${d.attendees.length}</div>` : ''}
    </div>
    <div class="objectives-list">
      <div class="objectives-list-title">Objectives</div>
      ${objectivesHtml}
    </div>
    <div class="agenda-items">${agendaHtml}</div>
  `;
  return wrap;
}

/* ── Calculation ──────────────────────────────────────────────────────── */
function renderCalculation(d) {
  const wrap = artifact('calculation', '🧮', esc(d.calculation_type));
  const body = wrap.querySelector('.artifact-body');

  const resultFormatted = typeof d.result === 'number'
    ? (Math.abs(d.result) >= 1000 ? d.result.toLocaleString() : d.result.toFixed(2))
    : d.result;

  const breakdownHtml = d.breakdown.map((line, i) => {
    const parts = line.split(':');
    const label = parts[0];
    const val = parts.slice(1).join(':').trim();
    return `
      <div class="calc-line">
        <span>${esc(label)}</span>
        <span>${esc(val)}</span>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="calc-result">
      <div class="calc-result-value">${esc(String(resultFormatted))}</div>
      <div class="calc-result-label">${esc(d.calculation_type)}</div>
    </div>
    <div class="calc-formula">${esc(d.formula)}</div>
    <div class="calc-breakdown">${breakdownHtml}</div>
  `;
  return wrap;
}

/* ── Checklist ────────────────────────────────────────────────────────── */
function renderChecklist(d) {
  const wrap = artifact('checklist', '✅', esc(d.title));
  const body = wrap.querySelector('.artifact-body');

  const stepsHtml = d.steps.map(s => `
    <div class="checklist-step">
      <div class="step-number">${s.step_number}</div>
      <div>
        <div class="step-action">${esc(s.action)}</div>
        ${s.details ? `<div class="step-details">${esc(s.details)}</div>` : ''}
        ${s.responsible ? `<div class="step-responsible">👤 ${esc(s.responsible)}</div>` : ''}
      </div>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="checklist-purpose">${esc(d.purpose)}</div>
    <div class="checklist-steps">${stepsHtml}</div>
    ${d.notes ? `<div class="checklist-notes"><strong>Notes:</strong> ${esc(d.notes)}</div>` : ''}
  `;
  return wrap;
}

/* ── Extracted Info ───────────────────────────────────────────────────── */
function renderExtractedInfo(d) {
  const wrap = artifact('extraction', '🔍', `Extracted: ${esc(d.extraction_type)}`);
  const body = wrap.querySelector('.artifact-body');

  const itemsHtml = d.items.map(item => `
    <div class="extracted-item">
      <div class="extracted-category">${esc(item.category)}</div>
      <div class="extracted-value">${esc(item.value)}</div>
      ${item.context ? `<div class="extracted-context">${esc(item.context)}</div>` : ''}
    </div>
  `).join('');

  body.innerHTML = `<div class="extracted-items">${itemsHtml}</div>`;
  return wrap;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function artifact(type, icon, title) {
  const div = document.createElement('div');
  div.className = 'artifact';
  div.innerHTML = `
    <div class="artifact-header">
      <div class="artifact-title">
        <div class="artifact-icon ${type}">${icon}</div>
        <span>${title}</span>
      </div>
    </div>
    <div class="artifact-body"></div>
  `;
  return div;
}

function addCopyBtn(wrap, text, successMsg) {
  const header = wrap.querySelector('.artifact-header');
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = 'Copy';
  btn.onclick = () => {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓ Copied';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
  };
  header.appendChild(btn);
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
