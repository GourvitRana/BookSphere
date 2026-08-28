/* ==========================================================================
   BookSphere — login & registration page controller
   Requires js/shared.js to be loaded first (authRequest, getMe, roleDashboard).
   ========================================================================== */

'use strict';

const page = document.body.dataset.page;

function showError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function setSubmitting(btn, busy, label) {
  if (!btn) return;
  const labelEl = btn.querySelector('.btn-label');
  btn.disabled = busy;
  if (labelEl) labelEl.textContent = busy ? label : '';
}

/* --------------------------------------------------------------------------
   Login page
   -------------------------------------------------------------------------- */
function wireLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const banner = document.getElementById('loginBanner');
  const params = new URLSearchParams(location.search);
  if (params.get('registered')) {
    banner.textContent = 'Account created! Please sign in with your new credentials.';
    banner.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError('loginError');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email) return showError('loginError', 'Please enter your email address.');
    if (!password) return showError('loginError', 'Please enter your password.');

    const submitBtn = document.getElementById('loginSubmit');
    setSubmitting(submitBtn, true, 'Signing in…');

    try {
      const data = await authRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      location.href = roleDashboard(data.role);
    } catch (err) {
      setSubmitting(submitBtn, false, 'Sign in');
      showError('loginError', err.message === 'network'
        ? "Can't reach the server. Make sure the backend is running."
        : err.message);
    }
  });
}

/* --------------------------------------------------------------------------
   Registration page
   -------------------------------------------------------------------------- */
function validateRegistration() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if (!name) return 'Name is required.';
  if (!email) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

function wireRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError('registerError');

    const validationError = validateRegistration();
    if (validationError) return showError('registerError', validationError);

    const payload = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value,
    };

    const submitBtn = document.getElementById('registerSubmit');
    setSubmitting(submitBtn, true, 'Creating account…');

    try {
      await authRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      location.href = 'login.html?registered=1';
    } catch (err) {
      setSubmitting(submitBtn, false, 'Create account');
      showError('registerError', err.message === 'network'
        ? "Can't reach the server. Make sure the backend is running."
        : err.message);
    }
  });
}

/* --------------------------------------------------------------------------
   Entry point
   -------------------------------------------------------------------------- */
async function main() {
  if (page === 'login' || page === 'register') {
    const me = await getMe();
    if (me) {
      location.href = roleDashboard(me.role);
      return;
    }
    if (page === 'login') wireLogin();
    if (page === 'register') wireRegister();
  }
}

main();