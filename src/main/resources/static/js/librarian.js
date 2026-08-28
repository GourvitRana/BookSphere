/* ==========================================================================
   BookSphere — librarian dashboard controller
   Requires js/shared.js (authRequest, getMe, escapeHtml, formatPrice,
   categoryHue, toast) and the librarian-dashboard.html markup.
   Sections:
   1. State & DOM references
   2. Role guard / session
   3. Greeting & date
   4. Rendering (stats, cards, details)
   5. Search & filter
   6. Modal management
   7. Form handling (add / edit)
   8. Delete flow
   9. Sidebar & logout
   10. Initialization
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   1. State & DOM references
   -------------------------------------------------------------------------- */
const state = {
  books: [],
  query: '',
  editingId: null,
  pendingDeleteId: null,
  lastFocused: null,
  user: null,
};

const els = {
  grid: document.getElementById('booksGrid'),
  loading: document.getElementById('loadingState'),
  error: document.getElementById('errorState'),
  empty: document.getElementById('emptyState'),
  retryBtn: document.getElementById('retryBtn'),
  emptyAddBtn: document.getElementById('emptyAddBtn'),

  statBooks: document.getElementById('statBooks'),
  statCopies: document.getElementById('statCopies'),
  statCategories: document.getElementById('statCategories'),
  statAvailable: document.getElementById('statAvailable'),

  greeting: document.getElementById('greeting'),
  todayDate: document.getElementById('todayDate'),
  userName: document.getElementById('userName'),

  search: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  resultCount: document.getElementById('resultCount'),

  addBookBtn: document.getElementById('addBookBtn'),

  bookModal: document.getElementById('bookModal'),
  bookModalTitle: document.getElementById('bookModalTitle'),
  bookForm: document.getElementById('bookForm'),
  bookFormSubmit: document.getElementById('bookFormSubmit'),
  formError: document.getElementById('formError'),
  fieldTitle: document.getElementById('fieldTitle'),
  fieldAuthor: document.getElementById('fieldAuthor'),
  fieldCategory: document.getElementById('fieldCategory'),
  fieldPrice: document.getElementById('fieldPrice'),
  fieldQuantity: document.getElementById('fieldQuantity'),

  detailsModal: document.getElementById('detailsModal'),
  detailsContent: document.getElementById('detailsContent'),

  deleteModal: document.getElementById('deleteModal'),
  deleteMessage: document.getElementById('deleteMessage'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
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
  if (me.role !== 'LIBRARIAN') {
    location.href = 'customer-dashboard.html';
    return null;
  }
  state.user = me;
  els.userName.textContent = me.name || me.email;
  return me;
}

/* --------------------------------------------------------------------------
   3. Greeting & date
   -------------------------------------------------------------------------- */
function renderGreeting() {
  const hour = new Date().getHours();
  let part = 'Good day';
  if (hour < 12) part = 'Good morning';
  else if (hour < 17) part = 'Good afternoon';
  else part = 'Good evening';

  const name = state.user ? (state.user.name || state.user.email || 'Librarian') : 'Librarian';
  els.greeting.textContent = `${part}, ${name}`;
  els.todayDate.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* --------------------------------------------------------------------------
   4. Rendering
   -------------------------------------------------------------------------- */
function renderStatistics() {
  const totalBooks = state.books.length;
  const totalCopies = state.books.reduce((sum, book) => sum + (Number(book.quantity) || 0), 0);
  const categories = new Set(state.books.map((book) => String(book.category || '').trim().toLowerCase())).size;
  const availableCopies = state.books.reduce((sum, book) => sum + (Number(book.quantity) || 0), 0);

  els.statBooks.textContent = totalBooks;
  els.statCopies.textContent = totalCopies;
  els.statCategories.textContent = categories;
  els.statAvailable.textContent = availableCopies;
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
  const outOfStock = Number(book.quantity) === 0;
  const qtyClass = outOfStock ? ' book-qty--none' : '';

  return `
    <article class="book-card animate-in" style="--cat-hue:${hue};--delay:0ms"
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
          <span class="book-qty${qtyClass}">
            ${outOfStock ? 'Out of stock' : `${book.quantity} ${book.quantity === 1 ? 'copy' : 'copies'}`}
          </span>
        </div>
        <div class="book-actions">
          <button type="button" class="card-btn card-btn--edit" data-action="edit" data-id="${book.id}"
                  aria-label="Edit ${escapeHtml(book.title)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
          </button>
          <button type="button" class="card-btn card-btn--delete" data-action="delete" data-id="${book.id}"
                  aria-label="Delete ${escapeHtml(book.title)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>
    </article>`;
}

function renderDetails(book) {
  const hue = categoryHue(book.category);
  const outOfStock = Number(book.quantity) === 0;

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
        <div class="detail-cell"><span>Copies</span><strong class="${outOfStock ? 'dim' : ''}">${book.quantity}</strong></div>
        <div class="detail-cell"><span>Status</span><strong>${outOfStock ? 'Out of stock' : 'Available'}</strong></div>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   5. Search & filter
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
   6. Modal management
   -------------------------------------------------------------------------- */
function openModal(modal) {
  state.lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const panel = modal.querySelector('.modal-panel');
  const focusTarget = panel.querySelector('input, textarea, select')
    || panel.querySelector('button:not([data-close])')
    || panel.querySelector('button');
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
   7. Form handling (add / edit)
   -------------------------------------------------------------------------- */
function openBookForm(book) {
  const editing = Boolean(book);
  state.editingId = editing ? book.id : null;

  els.bookModalTitle.textContent = editing ? 'Edit Book' : 'Add Book';
  els.bookFormSubmit.querySelector('.btn-label').textContent = editing ? 'Save changes' : 'Add to library';
  els.formError.hidden = true;
  els.bookForm.reset();

  if (editing) {
    els.fieldTitle.value = book.title;
    els.fieldAuthor.value = book.author;
    els.fieldCategory.value = book.category;
    els.fieldPrice.value = book.price;
    els.fieldQuantity.value = book.quantity;
  }

  openModal(els.bookModal);
}

function setFormSubmitting(submitting) {
  els.bookFormSubmit.disabled = submitting;
  els.bookFormSubmit.querySelector('.btn-label').textContent = submitting ? 'Saving…' : state.editingId ? 'Save changes' : 'Add to library';
}

function showFormError(message) {
  els.formError.textContent = message;
  els.formError.hidden = false;
}

function validateForm() {
  const title = els.fieldTitle.value.trim();
  const author = els.fieldAuthor.value.trim();
  const category = els.fieldCategory.value.trim();
  const price = Number(els.fieldPrice.value);
  const quantity = Number(els.fieldQuantity.value);

  if (!title) return 'Book title is required.';
  if (!author) return 'Author name is required.';
  if (!category) return 'Category is required.';
  if (!Number.isFinite(price) || price < 1) return 'Price must be greater than 0.';
  if (!Number.isFinite(quantity) || quantity < 0) return 'Quantity cannot be negative.';
  return null;
}

async function handleBookSubmit(event) {
  event.preventDefault();

  const validationError = validateForm();
  if (validationError) {
    showFormError(validationError);
    return;
  }

  const payload = {
    title: els.fieldTitle.value.trim(),
    author: els.fieldAuthor.value.trim(),
    category: els.fieldCategory.value.trim(),
    price: Number(els.fieldPrice.value),
    quantity: Number(els.fieldQuantity.value),
  };

  setFormSubmitting(true);
  els.formError.hidden = true;

  try {
    if (state.editingId) {
      await authRequest(`/books/${state.editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Book updated', `${payload.title} was saved.`, 'success');
    } else {
      await authRequest('/books', { method: 'POST', body: JSON.stringify(payload) });
      toast('Book added', `${payload.title} is now in your library.`, 'success');
    }
    closeModal(els.bookModal);
    await reloadBooks();
  } catch (err) {
    showFormError(err.message === 'network'
      ? "Can't reach the server. Make sure the backend is running."
      : `Couldn't ${state.editingId ? 'update' : 'add'} the book: ${err.message}`);
  } finally {
    setFormSubmitting(false);
  }
}

/* --------------------------------------------------------------------------
   8. Delete flow
   -------------------------------------------------------------------------- */
function openDeleteConfirm(book) {
  state.pendingDeleteId = book.id;
  els.deleteMessage.textContent = `"${book.title}" will be permanently removed from the library.`;
  openModal(els.deleteModal);
}

async function handleDeleteConfirm() {
  const id = state.pendingDeleteId;
  if (id === null) return;

  els.confirmDeleteBtn.disabled = true;
  els.confirmDeleteBtn.textContent = 'Deleting…';

  try {
    await authRequest(`/books/${id}`, { method: 'DELETE' });
    closeModal(els.deleteModal);
    toast('Book removed', 'The book was deleted from the library.', 'success');
    await reloadBooks();
  } catch (err) {
    toast('Delete failed', err.message === 'network'
      ? "Can't reach the server. Make sure the backend is running."
      : err.message, 'error');
  } finally {
    state.pendingDeleteId = null;
    els.confirmDeleteBtn.disabled = false;
    els.confirmDeleteBtn.textContent = 'Delete book';
  }
}

/* --------------------------------------------------------------------------
   9. Sidebar & logout
   -------------------------------------------------------------------------- */
function wireSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');
  const sidebarClose = document.getElementById('sidebarClose');

  const openSidebar = () => {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
  };
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  };

  if (menuToggle) menuToggle.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  document.querySelectorAll('[data-scroll]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      closeSidebar();
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
   10. Initialization
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
  els.addBookBtn.addEventListener('click', () => openBookForm(null));
  els.emptyAddBtn.addEventListener('click', () => openBookForm(null));
  els.retryBtn.addEventListener('click', loadInitial);
  els.search.addEventListener('input', handleSearch);
  els.searchClear.addEventListener('click', clearSearch);

  els.bookForm.addEventListener('submit', handleBookSubmit);
  els.confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);

  els.grid.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn) {
      event.stopPropagation();
      const book = state.books.find((b) => String(b.id) === actionBtn.dataset.id);
      if (!book) return;
      if (actionBtn.dataset.action === 'edit') openBookForm(book);
      if (actionBtn.dataset.action === 'delete') openDeleteConfirm(book);
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

  renderGreeting();
  wireSidebar();
  wireLogout();
  wireEvents();
  await loadInitial();
}

main();