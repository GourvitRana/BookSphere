/* ==========================================================================
   BookSphere — shared dashboard helpers
   Loaded before auth.js / librarian.js / customer.js on their pages.
   Provides API calls, session helpers, formatting and toast notifications.
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   API helper
   -------------------------------------------------------------------------- */
async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const text = await response.text();
    if (!text) return null;
    try {
      const data = JSON.parse(text);
      return data?.message ?? data;
    } catch (_) {
      return text;
    }
  }
  return await response.text();
}

async function authRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    const error = new Error('network');
    error.status = 0;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const raw = await response.text();
      if (raw) {
        if (isJson) {
          try {
            const data = JSON.parse(raw);
            if (data && typeof data.message === 'string' && data.message.length > 0) {
              message = data.message;
            } else if (raw.trim().length > 0) {
              message = raw.trim();
            }
          } catch (_) {
            if (raw.trim().length > 0) message = raw.trim();
          }
        } else if (raw.trim().length > 0) {
          message = raw.trim();
        }
      }
    } catch (_) { /* keep status-based message */ }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  // Success path: handle both JSON and plain-text without double-consuming body.
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  if (isJson) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }
  return text;
}

/* --------------------------------------------------------------------------
   Session helpers
   -------------------------------------------------------------------------- */
async function getMe() {
  try {
    const data = await authRequest('/auth/me');
    return data && data.email ? data : null;
  } catch (err) {
    return null;
  }
}

function roleDashboard(role) {
  return role === 'LIBRARIAN' ? 'librarian-dashboard.html' : 'customer-dashboard.html';
}

/* --------------------------------------------------------------------------
    Theme toggle
    -------------------------------------------------------------------------- */
function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function setTheme(theme) {
  try { localStorage.setItem('booksphere-theme', theme); } catch (_) {}
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function initThemeToggle(btn) {
  if (!btn) return;
  btn.addEventListener('click', toggleTheme);
  const updateIcon = () => { btn.setAttribute('aria-label', getTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); };
  updateIcon();
}

/* --------------------------------------------------------------------------
   Formatting helpers
   -------------------------------------------------------------------------- */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/* Stable hue derived from a category string so the same category keeps its color */
function categoryHue(category) {
  const str = String(category || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 360;
  }
  return hash;
}

/* --------------------------------------------------------------------------
   Toast notifications
   -------------------------------------------------------------------------- */
const TOAST_ICONS = {
  success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
  info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
};

function toast(title, message, type = 'info', duration = 4200) {
  const region = document.getElementById('toastRegion');
  if (!region) return;

  const node = document.createElement('div');
  node.className = `toast toast--${type}`;
  node.setAttribute('role', type === 'error' ? 'alert' : 'status');
  node.innerHTML = `
    ${TOAST_ICONS[type] || TOAST_ICONS.info}
    <div class="toast-body">
      <span class="toast-title">${escapeHtml(title)}</span>
      ${message ? `<span class="toast-msg">${escapeHtml(message)}</span>` : ''}
    </div>`;

  region.appendChild(node);

  const remove = () => {
    node.classList.add('toast--closing');
    node.addEventListener('animationend', () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 400);
  };

  const timer = setTimeout(remove, duration);
  node.addEventListener('click', () => { clearTimeout(timer); remove(); });
}