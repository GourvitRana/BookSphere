/* ==========================================================================
   BookSphere — customer dashboard controller
   Requires js/shared.js (authRequest, getMe, escapeHtml, formatPrice,
   categoryHue, toast) and the customer-dashboard.html markup.
   Sections:
   1. State & DOM references
   2. Role guard / session
   3. Rendering (stats, cards, details)
   4. Search & filter
   5. Modal management
   6. Nav & logout
   7. Initialization
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1. State & DOM references
   -------------------------------------------------------------------------- */
const state = {
  books: [],
  query: '',
  lastFocused: null,
  user: null,
};

const els = {
  grid: document.getElementById('booksGrid'),
  loading: document.getElementById('loadingState'),
  error: document.getElementById('errorState'),
  empty: document.getElementById('emptyState'),
  retryBtn: document.getElementById('retryBtn'),

  statAvailable: document.getElementById('statAvailable'),
  statBooks: document.getElementById('statBooks'),

  customerName: document.getElementById('customerName'),
  userName: document.getElementById('userName'),

  search: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  resultCount: document.getElementById('resultCount'),

  detailsModal: document.getElementById('detailsModal'),
  detailsContent: document.getElementById('detailsContent'),
};

/* --------------------------------------------------------------------------
   2. Role guard / session
   -------------------------------------------------------------------------- */
async function guard() {
  const me = await getMe();
  if (!me) {
    location.href = 'login.html';
    return null;
  }
  if (me.role === 'LIBRARIAN') {
    location.href = 'librarian-dashboard.html';
    return null;
  }
  state.user = me;
  const name = me.name || me.email || 'Reader';
  els.userName.textContent = name;
  els.customerName.textContent = name.split(' ')[0] || name;
  return me;
}

/* --------------------------------------------------------------------------
   3. Rendering
   -------------------------------------------------------------------------- */
function renderStatistics() {
  const availableBooks = state.books.filter((book) => Number(book.quantity) > 0).length;
  const totalBooks = state.books.length;

  els.statAvailable.textContent = availableBooks;
  els.statBooks.textContent = totalBooks;
}

function filteredBooks() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.books;
  return state.books.filter((book) => {
    const haystack = [book.title, book.author, book.category].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

function renderCollection() {
  const list = filteredBooks();

  if (list.length === 0 && state.books.length > 0) {
    els.grid.innerHTML = `
      <div class="state-panel state-panel--center">
        <div class="state-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        </div>
        <h3>No matches for &ldquo;${escapeHtml(state.query)}&rdquo;</h3>
        <p class="state-note">Try a different title, author, or category.</p>
        <button type="button" class="btn btn-ghost" id="resetSearchBtn">Clear search</button>
      </div>`;
    document.getElementById('resetSearchBtn').addEventListener('click', clearSearch);
  } else {
    els.grid.innerHTML = list.map(bookCard).join('');
  }

  const count = list.length;
  const total = state.books.length;
  els.resultCount.textContent = state.query
    ? `${count} of ${total} book${total === 1 ? '' : 's'}`
    : `${total} book${total === 1 ? '' : 's'}`;

  els.searchClear.hidden = !state.query;
  toggleStatePanels();
}

function bookCard(book) {
  const hue = categoryHue(book.category);
  const available = Number(book.quantity) > 0;

  return `
    <article class="book-card cust-card animate-in" style="--cat-hue:${hue};--delay:0ms"
             data-id="${book.id}" tabindex="0"
             role="button" aria-label="View details for ${escapeHtml(book.title)}">
      <div class="book-spine" aria-hidden="true"></div>
      <div class="book-card-body">
        <div class="book-card-top">
          <span class="badge">${escapeHtml(book.category)}</span>
          <span class="book-id">#${book.id}</span>
        </div>
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">by ${escapeHtml(book.author)}</p>
        <div class="book-meta">
          <span class="book-price">${formatPrice(book.price)}</span>
          <span class="book-qty ${available ? '' : 'book-qty--none'}">
            ${available ? `${book.quantity} ${book.quantity === 1 ? 'copy' : 'copies'}` : 'Out of stock'}
          </span>
        </div>
        <div class="book-actions book-actions--customer">
          <span class="avail-status ${available ? 'avail-status--in' : 'avail-status--out'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              ${available ? '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>' : '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'}
            </svg>
            ${available ? 'Available' : 'Out of stock'}
          </span>
          <button type="button" class="btn btn-sm btn-primary" data-action="details" data-id="${book.id}"
                  aria-label="View details for ${escapeHtml(book.title)}">
            View Details
          </button>
        </div>
      </div>
    </article>`;
}

function renderDetails(book) {
  const hue = categoryHue(book.category);
  const available = Number(book.quantity) > 0;

  els.detailsContent.innerHTML = `
    <div class="detail-block">
      <div class="detail-cover" style="--cat-hue:${hue}">
        <span class="badge">${escapeHtml(book.category)}</span>
      </div>
      <div>
        <h3 class="detail-title">${escapeHtml(book.title)}</h3>
        <p class="detail-sub">by ${escapeHtml(book.author)}</p>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><span>Book ID</span><strong class="dim">#${book.id}</strong></div>
        <div class="detail-cell"><span>Price</span><strong>${formatPrice(book.price)}</strong></div>
        <div class="detail-cell"><span>Copies</span><strong class="${available ? '' : 'dim'}">${book.quantity}</strong></div>
        <div class="detail-cell"><span>Status</span><strong>${available ? 'Available' : 'Out of stock'}</strong></div>
      </div>
      <div class="detail-foot">
        <span class="coming-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          Borrowing coming soon
        </span>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   4. Search & filter
   -------------------------------------------------------------------------- */
function handleSearch() {
  state.query = els.search.value;
  renderCollection();
}

function clearSearch() {
  state.query = '';
  els.search.value = '';
  renderCollection();
  els.search.focus();
}

/* --------------------------------------------------------------------------
   5. Modal management
   -------------------------------------------------------------------------- */
function openModal(modal) {
  state.lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const panel = modal.querySelector('.modal-panel');
  const focusTarget = panel.querySelector('button:not([data-close])') || panel.querySelector('button');
  if (focusTarget) focusTarget.focus();
}

function closeModal(modal) {
  modal.hidden = true;
  if (document.querySelectorAll('.modal:not([hidden])').length === 0) {
    document.body.style.overflow = '';
  }
  if (state.lastFocused && state.lastFocused.isConnected) state.lastFocused.focus();
}

document.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', () => closeModal(el.closest('.modal')));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal:not([hidden])').forEach((modal) => closeModal(modal));
  }
});

/* --------------------------------------------------------------------------
   6. Nav & logout
   -------------------------------------------------------------------------- */
function wireNav() {
  document.querySelectorAll('[data-scroll]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.getElementById(link.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function wireLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
      await authRequest('/auth/logout', { method: 'POST' });
    } catch (_) { /* proceed to login page regardless */ }
    location.href = 'login.html';
  });
}

/* --------------------------------------------------------------------------
   7. Initialization
   -------------------------------------------------------------------------- */
function toggleStatePanels() {
  const hasBooks = state.books.length > 0;
  els.empty.hidden = hasBooks;
  els.grid.hidden = !hasBooks;
  els.error.hidden = true;
  els.loading.hidden = true;
}

async function reloadBooks() {
  try {
    const books = await authRequest('/books');
    state.books = Array.isArray(books) ? books : [];
    renderStatistics();
    renderCollection();
  } catch (err) {
    els.grid.hidden = true;
    els.empty.hidden = true;
    els.loading.hidden = true;
    els.error.hidden = false;
  }
}

function wireEvents() {
  els.retryBtn.addEventListener('click', loadInitial);
  els.search.addEventListener('input', handleSearch);
  els.searchClear.addEventListener('click', clearSearch);

  els.grid.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn && actionBtn.dataset.action === 'details') {
      event.stopPropagation();
      const book = state.books.find((b) => String(b.id) === actionBtn.dataset.id);
      if (book) {
        renderDetails(book);
        openModal(els.detailsModal);
      }
      return;
    }

    const card = event.target.closest('.book-card');
    if (card) {
      const book = state.books.find((b) => String(b.id) === card.dataset.id);
      if (book) {
        renderDetails(book);
        openModal(els.detailsModal);
      }
    }
  });

  els.grid.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.book-card');
    if (!card || event.target !== card) return;
    event.preventDefault();
    const book = state.books.find((b) => String(b.id) === card.dataset.id);
    if (book) {
      renderDetails(book);
      openModal(els.detailsModal);
    }
  });
}

async function loadInitial() {
  els.loading.hidden = false;
  els.error.hidden = true;
  els.empty.hidden = true;
  els.grid.hidden = true;

  try {
    const books = await authRequest('/books');
    state.books = Array.isArray(books) ? books : [];
    renderStatistics();
    renderCollection();
  } catch (err) {
    els.loading.hidden = true;
    els.error.hidden = false;
  }
}

async function main() {
  const me = await guard();
  if (!me) return;

  wireNav();
  wireLogout();
  wireEvents();
  await loadInitial();
}

main();