'use strict';

/* --------------------------------------------------------------------------
    State & DOM references
    -------------------------------------------------------------------------- */
const state = {
  books: [],
  borrowings: [],
  members: [],
  query: '',
  borrowQuery: '',
  memberQuery: '',
  borrowFilter: 'all',
  editingId: null,
  pendingDeleteId: null,
  pendingReturnId: null,
  pendingDeleteBorrowingId: null,
  pendingMember: null,
  pendingMemberTargetActive: false,
  pendingMemberDeleteId: null,
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

  statTotalBorrowings: document.getElementById('statTotalBorrowings'),
  statActiveBorrowings: document.getElementById('statActiveBorrowings'),
  statReturnedBorrowings: document.getElementById('statReturnedBorrowings'),
  statOverdueBorrowings: document.getElementById('statOverdueBorrowings'),
  borrowingsBody: document.getElementById('borrowingsBody'),
  borrowingsTable: document.getElementById('borrowingsTable'),
  borrowingsLoading: document.getElementById('borrowingsLoading'),
  borrowingsError: document.getElementById('borrowingsError'),
  borrowingsEmpty: document.getElementById('borrowingsEmpty'),
  borrowingsResultCount: document.getElementById('borrowingsResultCount'),
  borrowingsSearchInput: document.getElementById('borrowingsSearchInput'),
  borrowingsSearchClear: document.getElementById('borrowingsSearchClear'),
  borrowingsFilter: document.getElementById('borrowingsFilter'),
  borrowingsRetry: document.getElementById('borrowingsRetry'),

  statTotalMembers: document.getElementById('statTotalMembers'),
  statActiveMembers: document.getElementById('statActiveMembers'),
  statMembersTotalBorrowings: document.getElementById('statMembersTotalBorrowings'),
  statMembersActiveBorrowings: document.getElementById('statMembersActiveBorrowings'),
  membersBody: document.getElementById('membersBody'),
  membersTable: document.getElementById('membersTable'),
  membersLoading: document.getElementById('membersLoading'),
  membersError: document.getElementById('membersError'),
  membersEmpty: document.getElementById('membersEmpty'),
  membersResultCount: document.getElementById('membersResultCount'),
  membersSearchInput: document.getElementById('membersSearchInput'),
  membersSearchClear: document.getElementById('membersSearchClear'),
  membersRetry: document.getElementById('membersRetry'),

  memberModal: document.getElementById('memberModal'),
  memberModalBody: document.getElementById('memberModalBody'),
  memberToggleBtn: document.getElementById('memberToggleBtn'),
  memberConfirmModal: document.getElementById('memberConfirmModal'),
  memberConfirmBody: document.getElementById('memberConfirmBody'),
  memberConfirmBtn: document.getElementById('memberConfirmBtn'),

  memberDeleteModal: document.getElementById('memberDeleteModal'),
  memberDeleteBody: document.getElementById('memberDeleteBody'),
  memberDeleteConfirmBtn: document.getElementById('memberDeleteConfirmBtn'),

  deleteBookMeta: document.getElementById('deleteBookMeta'),

  borrowDeleteModal: document.getElementById('borrowDeleteModal'),
  borrowDeleteBody: document.getElementById('borrowDeleteBody'),
  borrowConfirmBtn: document.getElementById('borrowConfirmBtn'),

  returnConfirmModal: document.getElementById('returnConfirmModal'),
  returnConfirmBookTitle: document.getElementById('returnConfirmBookTitle'),
  returnConfirmBorrowingId: document.getElementById('returnConfirmBorrowingId'),
  returnConfirmDueDate: document.getElementById('returnConfirmDueDate'),
  returnConfirmStatus: document.getElementById('returnConfirmStatus'),
  returnConfirmBtn: document.getElementById('returnConfirmBtn'),
};

/* --------------------------------------------------------------------------
    Role guard / session
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
    Greeting & date
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
    Render statistics (books)
    -------------------------------------------------------------------------- */
function renderStatistics() {
  const totalBooks = state.books.length;
  const totalCopies = state.books.reduce((sum, book) => sum + (Number(book.quantity) || 0), 0);
  const categories = new Set(state.books.map((book) => String(book.category || '').trim().toLowerCase())).size;

  els.statBooks.textContent = totalBooks;
  els.statCopies.textContent = totalCopies;
  els.statCategories.textContent = categories;
}

/* --------------------------------------------------------------------------
    Borrowing helpers
    -------------------------------------------------------------------------- */
function isOverdue(borrowing) {
  if (borrowing.status !== 'ACTIVE') return false;
  const dueDate = new Date(borrowing.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function getBorrowingStatus(borrowing) {
  if (borrowing.status === 'RETURNED') return 'Returned';
  if (isOverdue(borrowing)) return 'Overdue';
  return 'Active';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function getOverdueClass(borrowing) {
  return isOverdue(borrowing) ? ' overdue' : '';
}

/* --------------------------------------------------------------------------
    Render borrowings statistics & table
    -------------------------------------------------------------------------- */
function renderBorrowingStatistics() {
  const total = state.borrowings.length;
  const active = state.borrowings.filter((b) => b.status === 'ACTIVE').length;
  const returned = state.borrowings.filter((b) => b.status === 'RETURNED').length;
  const overdue = state.borrowings.filter((b) => isOverdue(b)).length;

  els.statTotalBorrowings.textContent = total;
  els.statActiveBorrowings.textContent = active;
  els.statReturnedBorrowings.textContent = returned;
  els.statOverdueBorrowings.textContent = overdue;
}

function filteredBorrowings() {
  const q = state.borrowQuery.trim().toLowerCase();
  const filter = state.borrowFilter;

  return state.borrowings.filter((b) => {
    if (filter !== 'all' && getBorrowingStatus(b).toLowerCase() !== filter) return false;
    if (q) {
      const haystack = `${b.bookTitle} ${b.bookAuthor} ${b.id} ${b.userName}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function renderBorrowings() {
  const list = filteredBorrowings();

  if (list.length === 0 && state.borrowings.length > 0) {
    els.borrowingsBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="state-panel state-panel--center">
            <h3>No matches for &ldquo;${escapeHtml(state.borrowQuery)}&rdquo;</h3>
            <p class="state-note">Try a different search or filter.</p>
          </div>
        </td>
      </tr>`;
  } else {
    els.borrowingsBody.innerHTML = list.map(borrowingRow).join('');
  }

  const count = list.length;
  const total = state.borrowings.length;
  els.borrowingsResultCount.textContent = state.borrowQuery || state.borrowFilter !== 'all'
    ? `${count} of ${total} borrowing${total === 1 ? '' : 's'}`
    : `${total} borrowing${total === 1 ? '' : 's'}`;

  els.borrowingsSearchClear.hidden = !state.borrowQuery;
  toggleBorrowingsPanels();
}

function borrowingRow(borrowing) {
  const statusLabel = getBorrowingStatus(borrowing);
  const statusClass = `status-${borrowing.status.toLowerCase()}${getOverdueClass(borrowing)}`;
  const overdueBadge = isOverdue(borrowing)
    ? '<span class="overdue-badge">Overdue</span>'
    : '';

  return `
    <tr class="${getOverdueClass(borrowing)}">
      <td>#${borrowing.id}</td>
      <td>${escapeHtml(borrowing.userName || borrowing.userEmail || '—')}</td>
      <td>${escapeHtml(borrowing.bookTitle)}</td>
      <td>${escapeHtml(borrowing.bookAuthor)}</td>
      <td>${formatDate(borrowing.borrowDate)}</td>
      <td>${formatDate(borrowing.dueDate)}${overdueBadge}</td>
      <td>${borrowing.returnDate ? formatDate(borrowing.returnDate) : '—'}</td>
      <td><span class="borrow-status ${statusClass}">${statusLabel}</span></td>
      <td class="borrow-actions">
        ${borrowing.status === 'ACTIVE' || borrowing.status === 'OVERDUE'
          ? `<button type="button" class="btn btn-sm btn-danger" data-return="${borrowing.id}">Return</button>`
          : ''}
        <button type="button" class="icon-btn icon-btn--delete" title="Delete" data-borrow-delete="${borrowing.id}" aria-label="Delete borrowing #${borrowing.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </td>
    </tr>`;
}

/* --------------------------------------------------------------------------
    Render members statistics & table
    -------------------------------------------------------------------------- */
function renderMembersStatistics() {
  const total = state.members.length;
  const customers = state.members.filter((m) => m.role === 'CUSTOMER');
  const activeMembers = customers.filter((m) => m.currentBorrowings > 0);
  const totalBorrowings = state.members.reduce((sum, m) => sum + (Number(m.totalBorrowings) || 0), 0);
  const activeBorrowings = state.members.reduce((sum, m) => sum + (Number(m.currentBorrowings) || 0), 0);

  els.statTotalMembers.textContent = total;
  els.statActiveMembers.textContent = activeMembers.length;
  els.statMembersTotalBorrowings.textContent = totalBorrowings;
  els.statMembersActiveBorrowings.textContent = activeBorrowings;
}

function filteredMembers() {
  const q = state.memberQuery.trim().toLowerCase();
  return state.members.filter((m) => {
    if (q) {
      const haystack = `${m.name} ${m.email}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function renderMembers() {
  const list = filteredMembers();

  if (list.length === 0 && state.members.length > 0) {
    els.membersBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="state-panel state-panel--center">
            <h3>No matches for &ldquo;${escapeHtml(state.memberQuery)}&rdquo;</h3>
            <p class="state-note">Try a different search.</p>
          </div>
        </td>
      </tr>`;
  } else {
    els.membersBody.innerHTML = list.map(memberRow).join('');
  }

  const count = list.length;
  const total = state.members.length;
  els.membersResultCount.textContent = state.memberQuery
    ? `${count} of ${total} member${total === 1 ? '' : 's'}`
    : `${total} member${total === 1 ? '' : 's'}`;

  els.membersSearchClear.hidden = !state.memberQuery;
  toggleMembersPanels();
}

function memberRow(m) {
  const active = (m.active !== false);
  let statusClass = 'status-returned';
  let statusLabel = 'Inactive';
  if (!active) {
    statusClass = 'status-deactivated';
    statusLabel = 'Deactivated';
  } else if ((m.currentBorrowings || 0) > 0) {
    statusClass = 'status-active';
    statusLabel = 'Active';
  }

  return `
    <tr>
      <td>#${m.id}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.role || '—')}</td>
      <td>${m.currentBorrowings || 0}</td>
      <td>${m.totalBorrowings || 0}</td>
      <td><span class="borrow-status ${statusClass}">${statusLabel}</span></td>
      <td class="member-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-member-action="view" data-id="${m.id}">Details</button>
        <button type="button" class="btn btn-ghost btn-sm ${active ? 'btn-danger-ghost' : 'btn-success-ghost'}" data-member-action="toggle" data-id="${m.id}">${active ? 'Deactivate' : 'Activate'}</button>
        <button type="button" class="btn btn-danger btn-sm" data-member-action="delete" data-id="${m.id}" title="Permanently delete member" aria-label="Delete ${escapeHtml(m.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          Delete
        </button>
      </td>
    </tr>`;
}

/* --------------------------------------------------------------------------
    Search & filter
    -------------------------------------------------------------------------- */
function handleBookSearch() {
  state.query = els.search.value;
  renderCollection();
}

function clearBookSearch() {
  state.query = '';
  els.search.value = '';
  renderCollection();
  els.search.focus();
}

function handleBorrowingSearch() {
  state.borrowQuery = els.borrowingsSearchInput.value;
  renderBorrowings();
}

function clearBorrowingSearch() {
  state.borrowQuery = '';
  els.borrowingsSearchInput.value = '';
  renderBorrowings();
  els.borrowingsSearchInput.focus();
}

function handleBorrowingFilter() {
  state.borrowFilter = els.borrowingsFilter.value;
  renderBorrowings();
}

function handleMemberSearch() {
  state.memberQuery = els.membersSearchInput.value;
  renderMembers();
}

function clearMemberSearch() {
  state.memberQuery = '';
  els.membersSearchInput.value = '';
  renderMembers();
  els.membersSearchInput.focus();
}

/* --------------------------------------------------------------------------
    Modal management
    -------------------------------------------------------------------------- */
function openModal(modal) {
  state.lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const panel = modal.querySelector('.modal-panel');
  const focusTarget = panel.querySelector('input, textarea, select, button:not([data-close])')
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
    Return confirmation modal
    -------------------------------------------------------------------------- */
function openReturnConfirm(borrowing) {
  state.pendingReturnId = borrowing.id;
  els.returnConfirmBookTitle.textContent = borrowing.bookTitle;
  els.returnConfirmBorrowingId.textContent = `#${borrowing.id}`;
  els.returnConfirmDueDate.textContent = formatDate(borrowing.dueDate);
  els.returnConfirmStatus.textContent = getBorrowingStatus(borrowing);
  openModal(els.returnConfirmModal);
}

async function handleReturnConfirm() {
  const id = state.pendingReturnId;
  if (id === null) return;

  els.returnConfirmBtn.disabled = true;
  els.returnConfirmBtn.querySelector('.btn-label').textContent = 'Returning\u2026';

  try {
    await authRequest(`/borrowings/${id}/return`, { method: 'PUT' });
    closeModal(els.returnConfirmModal);
    toast('Book returned', 'The borrowing has been marked as returned.', 'success');
    await Promise.all([loadBorrowings(), reloadBooks()]);
  } catch (err) {
    toast('Return failed', err.message === 'network'
      ? "Can't reach the server. Make sure the backend is running."
      : err.message, 'error');
  } finally {
    state.pendingReturnId = null;
    els.returnConfirmBtn.disabled = false;
    els.returnConfirmBtn.querySelector('.btn-label').textContent = 'Return Book';
  }
}

/* --------------------------------------------------------------------------
    Book CRUD form handling
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
  els.bookFormSubmit.querySelector('.btn-label').textContent = submitting ? 'Saving\u2026' : state.editingId ? 'Save changes' : 'Add to library';
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
  if (validationError) { showFormError(validationError); return; }

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
    Delete flow
    -------------------------------------------------------------------------- */
function requestErrorMessage(err) {
  if (err && err.status === 401) return 'Your session has expired. Please log in again.';
  if (err && (err.status === 0 || err.message === 'network')) return 'Unable to reach the server.';
  if (err && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

function openDeleteConfirm(book) {
  state.pendingDeleteId = book.id;
  els.deleteBookMeta.innerHTML = `
    <p class="delete-book-title">${escapeHtml(book.title)}</p>
    <p class="delete-book-sub">${escapeHtml(book.author || 'Unknown author')} &middot; ${escapeHtml(book.category || 'Uncategorized')}</p>
    <p class="delete-book-sub">${book.quantity} copies available</p>`;
  els.deleteMessage.textContent = 'This action cannot be undone.';
  els.confirmDeleteBtn.disabled = false;
  els.confirmDeleteBtn.textContent = 'Delete book';
  openModal(els.deleteModal);
}

async function handleDeleteConfirm() {
  const id = state.pendingDeleteId;
  if (id === null) return;

  els.confirmDeleteBtn.disabled = true;
  els.confirmDeleteBtn.textContent = 'Deleting\u2026';

  try {
    await authRequest(`/books/${id}`, { method: 'DELETE' });
    closeModal(els.deleteModal);
    toast('Book deleted', 'Book deleted successfully.', 'success');
    await reloadBooks();
  } catch (err) {
    els.deleteMessage.textContent = requestErrorMessage(err);
    els.confirmDeleteBtn.disabled = false;
    els.confirmDeleteBtn.textContent = 'Delete book';
  } finally {
    if (!els.deleteModal.hidden) {
      state.pendingDeleteId = null;
    }
  }
}

/* --------------------------------------------------------------------------
    Borrowing delete flow
    -------------------------------------------------------------------------- */
function openBorrowDeleteConfirm(id) {
  const borrowing = state.borrowings.find((b) => b.id === id);
  if (!borrowing) return;
  state.pendingDeleteBorrowingId = id;

  const isActive = borrowing.status === 'ACTIVE' || borrowing.status === 'OVERDUE';
  els.borrowDeleteBody.innerHTML = `
    <p><strong>Borrowing #${borrowing.id}</strong></p>
    <p class="delete-book-sub">Member: ${escapeHtml(borrowing.userName || borrowing.userEmail || '—')}</p>
    <p class="delete-book-sub">Book: ${escapeHtml(borrowing.bookTitle)}</p>
    <p class="delete-book-sub">Status: ${getBorrowingStatus(borrowing)}</p>
    ${isActive
      ? '<p class="state-note state-warning">Deleting an active borrowing will restore one available copy of this book.</p>'
      : '<p class="state-note">Are you sure you want to permanently delete this borrowing record?</p>'}`;
  els.borrowConfirmBtn.disabled = false;
  els.borrowConfirmBtn.textContent = 'Delete Borrowing';
  openModal(els.borrowDeleteModal);
}

async function confirmBorrowDelete() {
  const id = state.pendingDeleteBorrowingId;
  if (id === null) return;

  const borrowing = state.borrowings.find((b) => b.id === id);
  const isActive = borrowing && (borrowing.status === 'ACTIVE' || borrowing.status === 'OVERDUE');

  els.borrowConfirmBtn.disabled = true;
  els.borrowConfirmBtn.textContent = 'Deleting\u2026';

  try {
    await authRequest(`/borrowings/${id}`, { method: 'DELETE' });
    closeModal(els.borrowDeleteModal);
    toast('Borrowing deleted',
      isActive ? 'Borrowing deleted and book copy restored.' : 'Borrowing record deleted successfully.',
      'success');
    await Promise.all([loadBorrowings(), reloadBooks(), loadMembers()]);
  } catch (err) {
    els.borrowDeleteBody.innerHTML = `<p class="state-error">${escapeHtml(requestErrorMessage(err))}</p>`;
    els.borrowConfirmBtn.disabled = false;
    els.borrowConfirmBtn.textContent = 'Delete Borrowing';
  } finally {
    if (!els.borrowDeleteModal.hidden) {
      state.pendingDeleteBorrowingId = null;
    }
  }
}

/* --------------------------------------------------------------------------
    Member details & deactivate/activate flow
    -------------------------------------------------------------------------- */
function openMemberDetails(m) {
  state.pendingMember = m;
  renderMemberModalBody(m);
  const active = (m.active !== false);
  els.memberToggleBtn.textContent = active ? 'Deactivate' : 'Activate';
  els.memberToggleBtn.className = `btn ${active ? 'btn-danger' : 'btn-primary'}`;
  els.memberToggleBtn.disabled = false;
  openModal(els.memberModal);
}

function renderMemberModalBody(m) {
  const active = (m.active !== false);
  const current = m.currentBorrowings || 0;
  const total = m.totalBorrowings || 0;
  els.memberModalBody.innerHTML = `
    <dl class="member-detail">
      <dt>Member ID</dt><dd>#${m.id}</dd>
      <dt>Name</dt><dd>${escapeHtml(m.name)}</dd>
      <dt>Email</dt><dd>${escapeHtml(m.email)}</dd>
      <dt>Role</dt><dd>${escapeHtml(m.role || '—')}</dd>
      <dt>Status</dt><dd>${active ? 'Active' : 'Deactivated'}</dd>
      <dt>Current Borrowings</dt><dd>${current}</dd>
      <dt>Total Borrowings</dt><dd>${total}</dd>
    </dl>
    ${active ? '' : '<p class="state-note">This member is deactivated and cannot borrow books.</p>'}
    ${current > 0 ? `<p class="state-note">${current} book${current === 1 ? '' : 's'} currently borrowed.</p>` : ''}`;
}

function openMemberConfirm(m, targetActive) {
  state.pendingMember = m;
  state.pendingMemberTargetActive = targetActive;
  const verb = targetActive ? 'Activate' : 'Deactivate';
  els.memberConfirmModal.querySelector('h2').textContent = `${verb} member?`;
  els.memberConfirmBody.innerHTML = `
    <p>Are you sure you want to ${verb.toLowerCase()} <strong>${escapeHtml(m.name)}</strong>?</p>
    ${targetActive
      ? '<p class="state-note">They will be able to borrow books again.</p>'
      : '<p class="state-note">They will no longer be able to borrow books, but their borrowing history is preserved.</p>'}`;
  els.memberConfirmBtn.textContent = `${verb} member`;
  els.memberConfirmBtn.disabled = false;
  openModal(els.memberConfirmModal);
}

async function handleMemberToggle() {
  const m = state.pendingMember;
  if (!m) return;
  const targetActive = state.pendingMemberTargetActive;
  const verb = targetActive ? 'Activate' : 'Deactivate';
  els.memberConfirmBtn.disabled = true;
  els.memberConfirmBtn.textContent = 'Working…';

  try {
    const result = await authRequest(`/users/${m.id}/${targetActive ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
    // Backend may return JSON UserResponseDTO or plain-text; handle both.
    let updated;
    let successMsg;
    if (result && typeof result === 'object' && result.id) {
      updated = result;
      successMsg = `${updated.name} was ${targetActive ? 'activated' : 'deactivated'}.`;
    } else if (typeof result === 'string' && result.trim()) {
      updated = { ...m, active: targetActive };
      successMsg = result.trim();
    } else {
      updated = result || { ...m, active: targetActive };
      successMsg = `${m.name} was ${targetActive ? 'activated' : 'deactivated'}.`;
    }
    closeModal(els.memberConfirmModal);
    state.pendingMember = updated;
    toast(targetActive ? 'Member activated' : 'Member deactivated', successMsg, 'success');
    await loadMembers();
    const refreshed = state.members.find((x) => String(x.id) === String(m.id)) || updated;
    if (!els.memberModal.hidden && refreshed) {
      state.pendingMember = refreshed;
      renderMemberModalBody(refreshed);
      const isActive = refreshed.active !== false;
      els.memberToggleBtn.textContent = isActive ? 'Deactivate' : 'Activate';
      els.memberToggleBtn.className = `btn ${isActive ? 'btn-danger' : 'btn-primary'}`;
    }
  } catch (err) {
    const msg = requestErrorMessage(err);
    els.memberConfirmBody.innerHTML = `<p class="state-error">${escapeHtml(msg)}</p>`;
    els.memberConfirmBtn.disabled = false;
    els.memberConfirmBtn.textContent = `${verb} member`;
  }
}

/* --------------------------------------------------------------------------
    Member permanent delete flow
    -------------------------------------------------------------------------- */
function openMemberDeleteConfirm(m) {
  state.pendingMemberDeleteId = m.id;
  state.pendingMember = m;
  els.memberDeleteBody.innerHTML = `
    <p><strong>${escapeHtml(m.name)}</strong></p>
    <p class="delete-book-sub">${escapeHtml(m.email)}</p>
    <p class="delete-book-sub">${escapeHtml(m.role || 'CUSTOMER')}</p>
    <p class="state-note">This permanently deletes this member account.</p>
    <p class="state-note">If this member has borrowing history or active borrowings, deletion will be blocked.</p>`;
  els.memberDeleteConfirmBtn.disabled = false;
  els.memberDeleteConfirmBtn.textContent = 'Delete member';
  openModal(els.memberDeleteModal);
}

async function confirmMemberDelete() {
  const id = state.pendingMemberDeleteId;
  if (id === null) return;
  const m = state.members.find((x) => String(x.id) === String(id)) || state.pendingMember;
  els.memberDeleteConfirmBtn.disabled = true;
  els.memberDeleteConfirmBtn.textContent = 'Deleting\u2026';
  try {
    const result = await authRequest(`/users/${id}`, { method: 'DELETE' });
    closeModal(els.memberDeleteModal);
    const msg = typeof result === 'string' && result.trim() ? result.trim() : 'Member deleted successfully.';
    toast('Member deleted', msg, 'success');
    // Remove from local state immediately, then reload for consistency
    state.members = state.members.filter((x) => String(x.id) !== String(id));
    renderMembersStatistics();
    renderMembers();
    // Refresh from server to ensure counts consistent
    await loadMembers();
  } catch (err) {
    els.memberDeleteBody.innerHTML = `<p class="state-error">${escapeHtml(requestErrorMessage(err))}</p>`;
    els.memberDeleteConfirmBtn.disabled = false;
    els.memberDeleteConfirmBtn.textContent = 'Delete member';
  } finally {
    if (!els.memberDeleteModal.hidden) {
      // keep pending id so retry works; clear only on success / close
    } else {
      state.pendingMemberDeleteId = null;
    }
  }
}

/* --------------------------------------------------------------------------
    Book card rendering (existing)
    -------------------------------------------------------------------------- */
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
    document.getElementById('resetSearchBtn').addEventListener('click', clearBookSearch);
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

function filteredBooks() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.books;
  return state.books.filter((book) => {
    const haystack = [book.title, book.author, book.category].join(' ').toLowerCase();
    return haystack.includes(q);
  });
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
                   title="Delete" aria-label="Delete ${escapeHtml(book.title)}">
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
    Sidebar & section switching
    -------------------------------------------------------------------------- */
function showSection(sectionName) {
  const sections = ['overview', 'collection', 'borrowings', 'members'];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === sectionName) {
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    }
  });

  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.section === sectionName);
  });

  history.replaceState(null, '', '#' + sectionName);
}

/* --------------------------------------------------------------------------
    Sidebar & logout
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

  document.querySelectorAll('[data-section]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      closeSidebar();
      showSection(link.dataset.section);
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
    Toggle state panels
    -------------------------------------------------------------------------- */
function toggleStatePanels() {
  const hasBooks = state.books.length > 0;
  els.empty.hidden = hasBooks;
  els.grid.hidden = !hasBooks;
  els.error.hidden = true;
  els.loading.hidden = true;
}

function toggleBorrowingsPanels() {
  const hasBorrowings = state.borrowings.length > 0;
  els.borrowingsTable.hidden = !hasBorrowings;
  els.borrowingsEmpty.hidden = hasBorrowings;
  els.borrowingsError.hidden = true;
  els.borrowingsLoading.hidden = true;
}

function toggleMembersPanels() {
  const hasMembers = state.members.length > 0;
  els.membersTable.hidden = !hasMembers;
  els.membersEmpty.hidden = hasMembers;
  els.membersError.hidden = true;
  els.membersLoading.hidden = true;
}

/* --------------------------------------------------------------------------
    Data loading
    -------------------------------------------------------------------------- */
async function loadBorrowings() {
  els.borrowingsLoading.hidden = false;
  els.borrowingsTable.hidden = true;
  els.borrowingsError.hidden = true;
  els.borrowingsEmpty.hidden = true;

  try {
    const data = await authRequest('/borrowings');
    state.borrowings = Array.isArray(data) ? data : [];
    renderBorrowingStatistics();
    renderBorrowings();
  } catch (err) {
    els.borrowingsLoading.hidden = true;
    els.borrowingsTable.hidden = true;
    els.borrowingsError.hidden = false;
  }
}

async function loadMembers() {
  els.membersLoading.hidden = false;
  els.membersTable.hidden = true;
  els.membersError.hidden = true;
  els.membersEmpty.hidden = true;

  try {
    const data = await authRequest('/users');
    state.members = Array.isArray(data) ? data : [];
    renderMembersStatistics();
    renderMembers();
  } catch (err) {
    els.membersLoading.hidden = true;
    els.membersTable.hidden = true;
    els.membersError.hidden = false;
  }
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

async function loadInitial() {
  els.loading.hidden = false;
  els.error.hidden = true;
  els.empty.hidden = true;
  els.grid.hidden = true;

  const hash = location.hash.replace('#', '') || 'overview';
  const sectionMap = { books: 'collection', overview: 'overview', borrowings: 'borrowings', members: 'members' };
  const initialSection = sectionMap[hash] || 'overview';

  try {
    const books = await authRequest('/books');
    state.books = Array.isArray(books) ? books : [];
    renderStatistics();
    renderCollection();
    await loadBorrowings();
    await loadMembers();
  } catch (err) {
    els.loading.hidden = true;
    els.error.hidden = false;
  }

  showSection(initialSection);
}

/* --------------------------------------------------------------------------
    Event wiring
    -------------------------------------------------------------------------- */
function wireEvents() {
  els.addBookBtn.addEventListener('click', () => openBookForm(null));
  els.emptyAddBtn.addEventListener('click', () => openBookForm(null));
  els.retryBtn.addEventListener('click', loadInitial);
  els.search.addEventListener('input', handleBookSearch);
  els.searchClear.addEventListener('click', clearBookSearch);

  els.borrowingsSearchInput.addEventListener('input', handleBorrowingSearch);
  els.borrowingsSearchClear.addEventListener('click', clearBorrowingSearch);
  els.borrowingsFilter.addEventListener('change', handleBorrowingFilter);
  els.borrowingsRetry.addEventListener('click', loadBorrowings);

  els.membersSearchInput.addEventListener('input', handleMemberSearch);
  els.membersSearchClear.addEventListener('click', clearMemberSearch);
  els.membersRetry.addEventListener('click', loadMembers);

  els.bookForm.addEventListener('submit', handleBookSubmit);
  els.confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
  els.returnConfirmBtn.addEventListener('click', handleReturnConfirm);

  els.membersBody.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-member-action]');
    if (!btn) return;
    event.stopPropagation();
    const id = Number(btn.dataset.id);
    const m = state.members.find((x) => x.id === id);
    if (!m) return;
    if (btn.dataset.memberAction === 'view') openMemberDetails(m);
    if (btn.dataset.memberAction === 'toggle') openMemberConfirm(m, m.active === false);
    if (btn.dataset.memberAction === 'delete') openMemberDeleteConfirm(m);
  });

  els.memberToggleBtn.addEventListener('click', () => {
    const m = state.pendingMember;
    if (!m) return;
    openMemberConfirm(m, m.active === false);
  });

  els.memberConfirmBtn.addEventListener('click', handleMemberToggle);
  if (els.memberDeleteConfirmBtn) els.memberDeleteConfirmBtn.addEventListener('click', confirmMemberDelete);

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

  els.borrowingsBody.addEventListener('click', (event) => {
    const returnBtn = event.target.closest('[data-return]');
    if (returnBtn) {
      event.stopPropagation();
      const id = Number(returnBtn.dataset.return);
      const borrowing = state.borrowings.find((b) => b.id === id);
      if (borrowing) openReturnConfirm(borrowing);
      return;
    }

    const deleteBtn = event.target.closest('[data-borrow-delete]');
    if (deleteBtn) {
      event.stopPropagation();
      openBorrowDeleteConfirm(Number(deleteBtn.dataset.borrowDelete));
    }
  });

  els.borrowConfirmBtn.addEventListener('click', confirmBorrowDelete);

  els.borrowingsBody.addEventListener('click', () => { /* prevent row click from triggering modal */ });
}

/* --------------------------------------------------------------------------
    Initialization
    -------------------------------------------------------------------------- */
async function main() {
  const me = await guard();
  if (!me) return;

  renderGreeting();
  wireSidebar();
  wireLogout();
  wireEvents();
  initThemeToggle(document.getElementById('themeToggle'));
  await loadInitial();
}

main();