/* ==========================================================================
   BookSphere — customer dashboard controller
   Requires js/shared.js (authRequest, getMe, escapeHtml, formatPrice,
   categoryHue, toast) and the customer-dashboard.html markup.
   Sections:
   1. State & DOM references
   2. Role guard / session
   3. Rendering (stats, cards, details, borrowings)
   4. Search & filter
   5. Modal management
   6. Borrow / Return flows
   7. Nav & logout
   8. Initialization
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1. State & DOM references
   -------------------------------------------------------------------------- */
const state = {
  books: [],
  borrowings: [],
  query: '',
  lastFocused: null,
  user: null,
  pendingBorrowBookId: null,
  pendingReturnBorrowingId: null,
  isSubmittingBorrow: false,
  isSubmittingReturn: false,
};

const els = {
  grid: document.getElementById('booksGrid'),
  loading: document.getElementById('loadingState'),
  error: document.getElementById('errorState'),
  empty: document.getElementById('emptyState'),
  retryBtn: document.getElementById('retryBtn'),

  statAvailable: document.getElementById('statAvailable'),
  statBooks: document.getElementById('statBooks'),
  statActiveBorrowings: document.getElementById('statActiveBorrowings'),

  customerName: document.getElementById('customerName'),
  userName: document.getElementById('userName'),

  search: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  resultCount: document.getElementById('resultCount'),

  detailsModal: document.getElementById('detailsModal'),
  detailsContent: document.getElementById('detailsContent'),
  detailsFooter: document.getElementById('detailsFooter'),

  borrowConfirmModal: document.getElementById('borrowConfirmModal'),
  borrowConfirmTitleText: document.getElementById('borrowConfirmTitleText'),
  borrowConfirmAuthorText: document.getElementById('borrowConfirmAuthorText'),
  borrowConfirmQuantityText: document.getElementById('borrowConfirmQuantityText'),
  borrowConfirmBtn: document.getElementById('borrowConfirmBtn'),

  returnConfirmModal: document.getElementById('returnConfirmModal'),
  returnConfirmBookTitle: document.getElementById('returnConfirmBookTitle'),
  returnConfirmBtn: document.getElementById('returnConfirmBtn'),

  borrowingsTable: document.getElementById('borrowingsTable'),
  borrowingsBody: document.getElementById('borrowingsBody'),
  borrowingsLoading: document.getElementById('borrowingsLoading'),
  borrowingsError: document.getElementById('borrowingsError'),
  borrowingsErrorMsg: document.getElementById('borrowingsErrorMsg'),
  borrowingsRetry: document.getElementById('borrowingsRetry'),
  borrowingsEmpty: document.getElementById('borrowingsEmpty'),
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
  const activeBorrowings = state.borrowings.filter((b) => b.status === 'ACTIVE').length;

  els.statAvailable.textContent = availableBooks;
  els.statBooks.textContent = totalBooks;
  if (els.statActiveBorrowings) {
    els.statActiveBorrowings.textContent = activeBorrowings;
  }
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
  const hasActiveBorrowing = state.borrowings.some(
    (b) => b.bookId === book.id && b.status === 'ACTIVE'
  );

  const showBorrowBtn = available && !hasActiveBorrowing;

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
          ${showBorrowBtn ? `
            <button type="button" class="btn btn-sm btn-primary" data-action="borrow" data-id="${book.id}"
                    aria-label="Borrow ${escapeHtml(book.title)}">
              Borrow Book
            </button>
          ` : hasActiveBorrowing ? `
            <span class="coming-pill" style="background: var(--surface); border: 1px solid var(--border);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              Already borrowed
            </span>
          ` : `
            <button type="button" class="btn btn-sm btn-primary" disabled aria-disabled="true">
              Out of Stock
            </button>
          `}
        </div>
      </div>
    </article>`;
}

function renderDetails(book) {
  const hue = categoryHue(book.category);
  const available = Number(book.quantity) > 0;
  const activeBorrowing = state.borrowings.find(
    (b) => b.bookId === book.id && b.status === 'ACTIVE'
  );
  const hasActiveBorrowing = !!activeBorrowing;

  const detailsHtml = `
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
        <div class="detail-cell"><span>Available copies</span><strong class="${available ? '' : 'dim'}">${book.quantity}</strong></div>
        <div class="detail-cell"><span>Status</span><strong>${available ? 'Available' : 'Out of stock'}</strong></div>
      </div>`;

  els.detailsContent.innerHTML = detailsHtml;

  // Render footer with action button
  let footerHtml = '';
  if (available && !hasActiveBorrowing) {
    footerHtml = `
      <button type="button" class="btn btn-primary" data-action="borrow" data-id="${book.id}">
        Borrow Book
      </button>`;
  } else if (hasActiveBorrowing) {
    footerHtml = `
      <span class="coming-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
        </svg>
        You have this book borrowed (Due: ${formatDate(activeBorrowing.dueDate)})
      </span>`;
  } else {
    footerHtml = `
      <span class="coming-pill" style="background: rgba(239, 109, 109, 0.1); border-color: rgba(239, 109, 109, 0.3); color: var(--danger-strong);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        Out of stock
      </span>`;
  }
  els.detailsFooter.innerHTML = footerHtml;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatBorrowingStatus(status) {
  const statusMap = {
    'ACTIVE': { label: 'Active', class: 'status-active' },
    'RETURNED': { label: 'Returned', class: 'status-returned' },
    'OVERDUE': { label: 'Overdue', class: 'status-overdue' },
  };
  const s = statusMap[status] || { label: status, class: '' };
  return `<span class="borrow-status ${s.class}">${s.label}</span>`;
}

function renderBorrowings() {
  const activeBorrowings = state.borrowings.filter((b) => b.status === 'ACTIVE');
  const returnedBorrowings = state.borrowings.filter((b) => b.status === 'RETURNED' || b.status === 'OVERDUE');
  const allBorrowings = [...activeBorrowings, ...returnedBorrowings];

  if (allBorrowings.length === 0) {
    els.borrowingsTable.hidden = true;
    els.borrowingsEmpty.hidden = false;
    els.borrowingsLoading.hidden = true;
    return;
  }

  els.borrowingsEmpty.hidden = true;
  els.borrowingsLoading.hidden = true;
  els.borrowingsTable.hidden = false;

  els.borrowingsBody.innerHTML = allBorrowings.map((borrowing) => {
    const isActive = borrowing.status === 'ACTIVE';
    const isOverdue = borrowing.status === 'OVERDUE';

    return `
      <tr data-id="${borrowing.id}">
        <td>
          <div class="borrow-book-info">
            <span class="borrow-book-title">${escapeHtml(borrowing.bookTitle)}</span>
            <span class="borrow-book-id">#${borrowing.bookId}</span>
          </div>
        </td>
        <td>${escapeHtml(borrowing.bookAuthor)}</td>
        <td>${formatDate(borrowing.borrowedAt)}</td>
        <td>${formatDate(borrowing.dueDate)}</td>
        <td>${formatBorrowingStatus(borrowing.status)}</td>
        <td>
          ${isActive ? `
            <button type="button" class="btn btn-sm btn-danger" data-action="return" data-id="${borrowing.id}"
                    aria-label="Return ${escapeHtml(borrowing.bookTitle)}">
              Return Book
            </button>
          ` : `
            <span class="status-text">Returned</span>
          `}
        </td>
      </tr>`;
  }).join('');
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
   6. Borrow / Return flows
   -------------------------------------------------------------------------- */
function openBorrowConfirm(book) {
  state.pendingBorrowBookId = book.id;
  els.borrowConfirmTitleText.textContent = book.title;
  els.borrowConfirmAuthorText.textContent = book.author;
  els.borrowConfirmQuantityText.textContent = `${book.quantity} ${book.quantity === 1 ? 'copy' : 'copies'}`;
  openModal(els.borrowConfirmModal);
}

async function confirmBorrow() {
  if (state.isSubmittingBorrow || state.pendingBorrowBookId === null) return;

  const bookId = state.pendingBorrowBookId;
  state.isSubmittingBorrow = true;
  const btnLabel = els.borrowConfirmBtn.querySelector('.btn-label');
  const originalLabel = btnLabel.textContent;
  btnLabel.textContent = 'Borrowing...';
  els.borrowConfirmBtn.disabled = true;

  try {
    const response = await authRequest('/borrowings', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    });
    toast('Success', 'Book borrowed successfully.', 'success');
    closeModal(els.borrowConfirmModal);
    state.pendingBorrowBookId = null;
    await refreshCustomerData();
  } catch (err) {
    handleApiError(err, 'borrow');
  } finally {
    state.isSubmittingBorrow = false;
    btnLabel.textContent = originalLabel;
    els.borrowConfirmBtn.disabled = false;
  }
}

function openReturnConfirm(borrowing) {
  state.pendingReturnBorrowingId = borrowing.id;
  els.returnConfirmBookTitle.textContent = `${borrowing.bookTitle} by ${borrowing.bookAuthor}`;
  openModal(els.returnConfirmModal);
}

async function confirmReturn() {
  if (state.isSubmittingReturn || state.pendingReturnBorrowingId === null) return;

  const borrowingId = state.pendingReturnBorrowingId;
  state.isSubmittingReturn = true;
  const btnLabel = els.returnConfirmBtn.querySelector('.btn-label');
  const originalLabel = btnLabel.textContent;
  btnLabel.textContent = 'Returning...';
  els.returnConfirmBtn.disabled = true;

  try {
    await authRequest(`/borrowings/${borrowingId}/return`, {
      method: 'PUT',
    });
    toast('Success', 'Book returned successfully.', 'success');
    closeModal(els.returnConfirmModal);
    state.pendingReturnBorrowingId = null;
    await refreshCustomerData();
  } catch (err) {
    handleApiError(err, 'return');
  } finally {
    state.isSubmittingReturn = false;
    btnLabel.textContent = originalLabel;
    els.returnConfirmBtn.disabled = false;
  }
}

function handleApiError(err, action) {
  if (err.message === 'network') {
    toast('Error', "Can't reach the server. Make sure the backend is running.", 'error');
    return;
  }

  const msg = err.message || 'Something went wrong.';

  // Map common backend error messages
  if (msg.includes('already borrowed') || msg.includes('already borrowed')) {
    toast('Cannot borrow', 'You have already borrowed this book.', 'error');
  } else if (msg.includes('not available') || msg.includes('available')) {
    toast('Cannot borrow', 'Book is not available for borrowing.', 'error');
  } else if (msg.includes('already returned')) {
    toast('Cannot return', 'This book has already been returned.', 'error');
  } else if (msg.includes('Access denied') || msg.includes('only return your own')) {
    toast('Access denied', 'You can only return your own borrowings.', 'error');
  } else if (msg.includes('Not authenticated') || msg.includes('401')) {
    toast('Session expired', 'Please log in again.', 'error');
    setTimeout(() => location.href = 'login.html', 1500);
  } else {
    toast(`Error`, msg, 'error');
  }
}

/* --------------------------------------------------------------------------
   7. Nav & logout
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
   8. Data loading
   -------------------------------------------------------------------------- */
async function loadMyBorrowings() {
  els.borrowingsLoading.hidden = false;
  els.borrowingsError.hidden = true;
  els.borrowingsTable.hidden = true;
  els.borrowingsEmpty.hidden = true;

  try {
    const data = await authRequest('/borrowings/me');
    state.borrowings = Array.isArray(data) ? data : [];
    renderStatistics();
    renderBorrowings();
  } catch (err) {
    els.borrowingsLoading.hidden = true;
    els.borrowingsError.hidden = false;
    els.borrowingsErrorMsg.textContent = err.message === 'network'
      ? "Can't reach the server. Make sure the backend is running."
      : err.message;
  }
}

async function loadBooks() {
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

async function refreshCustomerData() {
  await Promise.all([loadBooks(), loadMyBorrowings()]);
}

/* --------------------------------------------------------------------------
   9. Event wiring
   -------------------------------------------------------------------------- */
function wireEvents() {
  els.retryBtn.addEventListener('click', loadBooks);
  els.borrowingsRetry.addEventListener('click', loadMyBorrowings);
  els.search.addEventListener('input', handleSearch);
  els.searchClear.addEventListener('click', clearSearch);

  // Book card / grid interactions
  els.grid.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn) {
      event.stopPropagation();
      const book = state.books.find((b) => String(b.id) === actionBtn.dataset.id);
      if (!book) return;
      if (actionBtn.dataset.action === 'details') {
        renderDetails(book);
        openModal(els.detailsModal);
      } else if (actionBtn.dataset.action === 'borrow') {
        openBorrowConfirm(book);
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

  // Details modal footer actions
  els.detailsFooter.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn) {
      const book = state.books.find((b) => String(b.id) === actionBtn.dataset.id);
      if (!book) return;
      if (actionBtn.dataset.action === 'borrow') {
        openBorrowConfirm(book);
      }
    }
  });

  // Borrow confirm modal
  els.borrowConfirmBtn.addEventListener('click', confirmBorrow);

  // Return confirm modal
  els.returnConfirmBtn.addEventListener('click', confirmReturn);

  // Borrowings table actions
  els.borrowingsBody.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn) {
      const row = actionBtn.closest('tr');
      if (!row) return;
      const borrowingId = Number(row.dataset.id);
      const borrowing = state.borrowings.find((b) => b.id === borrowingId);
      if (!borrowing) return;
      if (actionBtn.dataset.action === 'return') {
        openReturnConfirm(borrowing);
      }
    }
  });
}

/* --------------------------------------------------------------------------
   10. Initialization
   -------------------------------------------------------------------------- */
function toggleStatePanels() {
  const hasBooks = state.books.length > 0;
  els.empty.hidden = hasBooks;
  els.grid.hidden = !hasBooks;
  els.error.hidden = true;
  els.loading.hidden = true;
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
    await loadMyBorrowings();
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