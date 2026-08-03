'use strict';

/* ------------------------------- state & utils ---------------------------- */

const state = {
  token: localStorage.getItem('wura_token') || '',
  view: 'overview',
  statusFilter: 'all',
  bookings: [],
  rooms: [],
  editingRoomId: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg, ok = true) {
  const el = $('#toast');
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${ok ? '#4ade80' : '#f87171'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/></svg><span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ---------------------------------- auth ---------------------------------- */

function logout() {
  state.token = '';
  localStorage.removeItem('wura_token');
  showLogin();
}

function showLogin() {
  $('#loginView').style.display = 'grid';
  $('#dashView').style.display = 'none';
}

function showDash(user) {
  $('#loginView').style.display = 'none';
  $('#dashView').style.display = 'grid';
  $('#sideUserName').textContent = user?.username || 'admin';
  $('#overviewGreet').textContent = user?.username || 'team';
  $('#overviewDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  switchView('overview');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  $('#loginErr').classList.remove('show');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: $('#loginUser').value.trim(), password: $('#loginPass').value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    state.token = data.token;
    localStorage.setItem('wura_token', data.token);
    showDash(data.user);
    toast(`Welcome back, ${data.user.username}`);
  } catch (err) {
    $('#loginErr').textContent = err.message;
    $('#loginErr').classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

$('#logoutBtn').addEventListener('click', logout);

/* ---------------------------------- views --------------------------------- */

function switchView(view) {
  state.view = view;
  $$('.side-item[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  ['overview', 'bookings', 'front-desk', 'rooms'].forEach((v) => {
    $('#view-' + v).style.display = v === view ? '' : 'none';
  });
  if (view === 'overview') loadOverview();
  if (view === 'front-desk') loadFrontDesk();
  if (view === 'bookings') loadBookings();
  if (view === 'rooms') loadRooms();
}
$$('.side-item[data-view]').forEach((b) => (b.onclick = () => switchView(b.dataset.view)));
$('#refreshBtn').onclick = () => loadOverview();
$('#fdRefreshBtn').onclick = () => loadFrontDesk();

/* -------------------------------- overview -------------------------------- */

async function loadOverview() {
  const grid = $('#statGrid');
  grid.innerHTML = `<div class="stat-card"><div class="label">Loading…</div><div class="value">—</div></div>`;
  try {
    const { stats, recent } = await api('/api/admin/overview');
    const pctClass = stats.occupancy30 >= 80 ? 'up' : stats.occupancy30 >= 50 ? 'warn' : '';
    grid.innerHTML = `
      <div class="stat-card"><div class="icon">${ICON.arrivals}</div><div class="label">Arrivals today</div>
        <div class="value">${stats.arrivals}</div><div class="delta ${stats.arrivals ? 'warn' : ''}">${stats.arrivals ? 'Check-ins expected' : 'No arrivals scheduled'}</div></div>
      <div class="stat-card"><div class="icon">${ICON.departures}</div><div class="label">Departures today</div>
        <div class="value">${stats.departures}</div><div class="delta">${stats.departures ? 'Housekeeping alerted' : 'All quiet'}</div></div>
      <div class="stat-card"><div class="icon">${ICON.occupancy}</div><div class="label">Occupancy · 30 days</div>
        <div class="value">${stats.occupancy30}<small>%</small></div><div class="delta ${pctClass}">${stats.activeRooms} active rooms</div></div>
      <div class="stat-card"><div class="icon">${ICON.revenue}</div><div class="label">Revenue · this month</div>
        <div class="value">${money(stats.revenueMonth)}</div><div class="delta up">${money(stats.revenueTotal)} all-time</div></div>
      <div class="stat-card"><div class="icon">${ICON.bookings}</div><div class="label">Bookings</div>
        <div class="value">${stats.totalBookings}</div><div class="delta">${stats.byStatus.confirmed} confirmed · ${stats.byStatus.checked_in} in-house</div></div>`;

    // occupancy chart
    const chart = $('#occChart');
    chart.innerHTML = stats.occupancy.map((o) => {
      const hot = o.pct >= 90;
      return `<div class="occ-bar ${hot ? 'hot' : ''}" style="height:${Math.max(3, o.pct)}%" title="${o.day} · ${o.pct}%"></div>`;
    }).join('');
    const labels = $('#occLabels');
    labels.innerHTML = stats.occupancy
      .map((o, i) => (i % 5 === 0 ? `<span>${new Date(`${o.day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : '<span></span>'))
      .join('');

    // recent table
    const tbody = $('#recentTable tbody');
    tbody.innerHTML = recent.map((b) => `
      <tr>
        <td><span class="mono">${esc(b.ref)}</span></td>
        <td><span class="strong">${esc(b.guest_name)}</span><br/><span class="muted">${esc(b.guest_email)}</span></td>
        <td>${esc(b.room_name)}</td>
        <td>${fmtDate(b.check_in)} → ${fmtDate(b.check_out)}</td>
        <td>${money(b.total)}</td>
        <td><span class="pill ${esc(b.status)}">${esc(b.status.replace('_', ' '))}</span></td>
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--dim)">No bookings yet</td></tr>`;
  } catch (err) {
    grid.innerHTML = `<div class="stat-card"><div class="label">Error</div><div class="value">—</div><div class="delta down">${err.message}</div></div>`;
  }
}

/* ----------------------------- front desk ------------------------------- */

async function loadFrontDesk() {
  const content = $('#fdContent');
  content.innerHTML = `<div class="spinner" style="margin:60px auto"></div>`;
  try {
    const { arrivals, departures, today } = await api('/api/admin/front-desk');
    $('#fdDate').textContent = new Date(`${today}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const arrHtml = arrivals.length
      ? arrivals.map((b) => guestCard(b, 'arrival')).join('')
      : `<div class="fd-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
          <span>No arrivals scheduled today</span>
        </div>`;
    const depHtml = departures.length
      ? departures.map((b) => guestCard(b, 'departure')).join('')
      : `<div class="fd-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
          <span>No departures scheduled today</span>
        </div>`;

    content.innerHTML = `
      <div class="fd-columns">
        <div class="fd-column">
          <div class="fd-heading">
            <span class="fd-head-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17 3 13h18l-2 4M7 13l-1-4h4l-1 4"/></svg>
            </span>
            <span>Arrivals <span class="fd-count">${arrivals.length}</span></span>
          </div>
          <div class="fd-cards">${arrHtml}</div>
        </div>
        <div class="fd-column">
          <div class="fd-heading">
            <span class="fd-head-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17 3 13h18l-2 4M17 13l1-4h-4l1 4"/></svg>
            </span>
            <span>Departures <span class="fd-count">${departures.length}</span></span>
          </div>
          <div class="fd-cards">${depHtml}</div>
        </div>
      </div>`;

    // Bind card action buttons
    $$('.fd-card').forEach((card) => {
      const btn = card.querySelector('.fd-action');
      if (!btn) return;
      btn.onclick = async () => {
        const id = Number(card.dataset.id);
        const action = card.dataset.action;
        const label = action === 'checked_in' ? 'Check in' : 'Check out';
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="margin:0;width:18px;height:18px;border-width:2px"></span>';
        try {
          await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: action }) });
          // Success animation: flash the card green, then fade it out
          card.classList.add('fd-success');
          toast(`${label} — ${card.querySelector('.fd-name').textContent}`);
          setTimeout(() => {
            card.style.transition = 'opacity 0.5s var(--ease), transform 0.5s var(--ease)';
            card.style.opacity = '0';
            card.style.transform = 'translateX(30px)';
            setTimeout(() => {
              card.remove();
              // Update the count badges
              const col = card.closest('.fd-column');
              const count = col.querySelector('.fd-count');
              if (count) count.textContent = String(Math.max(0, Number(count.textContent) - 1));
              // Show empty state if no cards left
              const cards = col.querySelector('.fd-cards');
              if (!cards.querySelector('.fd-card')) {
                cards.innerHTML = `<div class="fd-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
                  <span>All clear</span>
                </div>`;
              }
            }, 600);
          }, 400);
        } catch (err) {
          toast(err.message, false);
          btn.disabled = false;
          btn.textContent = label;
        }
      };
    });
  } catch (err) {
    content.innerHTML = `<div class="fd-empty"><span>${err.message}</span></div>`;
  }
}

function guestCard(b, type) {
  const isArrival = type === 'arrival';
  const action = isArrival ? 'checked_in' : 'checked_out';
  const label = isArrival ? 'Check in' : 'Check out';
  const statusLabel = isArrival ? 'Arriving today' : 'Departing today';
  return `<div class="fd-card" data-id="${b.id}" data-action="${action}">
    <div class="fd-card-art">
      <img src="${b.room_art}" alt="${esc(b.room_name)}" />
      <span class="fd-room-badge">${esc(b.room_type)}</span>
    </div>
    <div class="fd-card-body">
      <div class="fd-card-row">
        <div class="fd-guest-info">
          <div class="fd-avatar">${esc(b.guest_name.charAt(0).toUpperCase())}</div>
          <div>
            <div class="fd-name">${esc(b.guest_name)}</div>
            <div class="fd-email">${esc(b.guest_email)}</div>
          </div>
        </div>
        <span class="pill ${esc(b.status)}">${statusLabel}</span>
      </div>
      <div class="fd-card-row">
        <div class="fd-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ${esc(b.room_name)}
        </div>
        <div class="fd-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M17.8 19a5.5 5.5 0 0 0-2.6-4.6"/></svg>
          ${b.guests} guest${b.guests > 1 ? 's' : ''}
        </div>
        <div class="fd-detail mono">${esc(b.ref)}</div>
      </div>
      <div class="fd-card-notes">${b.notes ? esc(b.notes) : ''}</div>
    </div>
    <div class="fd-card-foot">
      <button class="btn btn-gold fd-action">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>
        ${label}
      </button>
      <div class="fd-price">${money(b.total)}</div>
    </div>
  </div>`;
}

/* -------------------------------- bookings -------------------------------- */

const STATUSES = ['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const STATUS_LABELS = { all: 'All', confirmed: 'Confirmed', checked_in: 'In-house', checked_out: 'Checked out', cancelled: 'Cancelled' };

function renderStatusChips() {
  const chips = $('#statusChips');
  chips.innerHTML = STATUSES.map((s) =>
    `<button class="chip ${state.statusFilter === s ? 'active' : ''}" data-status="${s}">${STATUS_LABELS[s]}</button>`
  ).join('');
  $$('.chip', chips).forEach((c) => {
    c.onclick = () => { state.statusFilter = c.dataset.status; loadBookings(); };
  });
}

async function loadBookings() {
  renderStatusChips();
  const tbody = $('#bookingsTable tbody');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center"><div class="spinner" style="margin:26px auto"></div></td></tr>`;
  try {
    const qs = state.statusFilter === 'all' ? '' : `?status=${state.statusFilter}`;
    const { bookings } = await api(`/api/admin/bookings${qs}`);
    state.bookings = bookings;
    tbody.innerHTML = bookings.map((b) => `
      <tr data-id="${b.id}">
        <td><span class="mono">${esc(b.ref)}</span></td>
        <td><span class="strong">${esc(b.guest_name)}</span><br/><span class="muted">${esc(b.guest_email)}</span></td>
        <td>${esc(b.room_name)}<br/><span class="muted">${esc(b.room_type)}</span></td>
        <td>${fmtDate(b.check_in)}</td>
        <td>${fmtDate(b.check_out)}</td>
        <td>${b.guests}</td>
        <td>${money(b.total)}</td>
        <td><span class="pill ${esc(b.status)}">${esc(b.status.replace('_', ' '))}</span></td>
        <td>
          <div class="row-actions">
            ${b.status === 'confirmed' ? `<button class="icon-btn" data-act="checked_in" title="Check in">${ICON.arrivals}</button>` : ''}
            ${b.status === 'checked_in' ? `<button class="icon-btn" data-act="checked_out" title="Check out">${ICON.checkout}</button>` : ''}
            ${b.status === 'confirmed' || b.status === 'checked_in'
              ? `<button class="icon-btn danger" data-act="cancelled" title="Cancel booking">${ICON.trash}</button>` : ''}
          </div>
        </td>
      </tr>`).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--dim)">No bookings${state.statusFilter !== 'all' ? ` with status “${STATUS_LABELS[state.statusFilter]}”` : ''}</td></tr>`;

    $$('#bookingsTable tbody [data-act]').forEach((btn) => {
      btn.onclick = async () => {
        const id = Number(btn.closest('tr').dataset.id);
        const action = btn.dataset.act;
        const label = { checked_in: 'Check in', checked_out: 'Check out', cancelled: 'Cancel' }[action];
        if (!confirm(`${label} this booking?`)) return;
        try {
          await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status: action }) });
          toast(`${label} — booking updated`);
          loadBookings();
          if (state.view === 'overview') loadOverview();
        } catch (err) { toast(err.message, false); }
      };
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--red)">${err.message}</td></tr>`;
  }
}

/* ---------------------------------- rooms --------------------------------- */

async function loadRooms() {
  const tbody = $('#roomsTable tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center"><div class="spinner" style="margin:26px auto"></div></td></tr>`;
  try {
    const { rooms } = await api('/api/admin/rooms');
    state.rooms = rooms;
    tbody.innerHTML = rooms.map((r) => `
      <tr data-id="${r.id}">
        <td><img src="${r.art}" alt="" style="width:54px;height:40px;object-fit:cover;border-radius:7px;display:inline-block;vertical-align:middle;margin-right:10px"/>${esc(r.name)}</td>
        <td>${esc(r.type)}</td>
        <td>${r.capacity} guests</td>
        <td>${r.size_sqm} m²</td>
        <td class="strong">${money(r.price)}<span class="muted"> / night</span></td>
        <td><span class="pill ${r.status === 'active' ? 'checked_in' : 'cancelled'}">${r.status}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-act="edit" title="Edit room">${ICON.edit}</button>
            <button class="icon-btn ${r.status === 'active' ? '' : 'danger'}" data-act="toggle" title="${r.status === 'active' ? 'Set to maintenance' : 'Set active'}">${ICON.toggle}</button>
            <button class="icon-btn danger" data-act="delete" title="Delete room">${ICON.trash}</button>
          </div>
        </td>
      </tr>`).join('');

    $$('#roomsTable tbody [data-act]').forEach((btn) => {
      btn.onclick = async () => {
        const id = Number(btn.closest('tr').dataset.id);
        const act = btn.dataset.act;
        const room = state.rooms.find((r) => r.id === id);
        if (act === 'edit') openRoomModal(room);
        else if (act === 'toggle') {
          const next = room.status === 'active' ? 'maintenance' : 'active';
          try {
            await api(`/api/admin/rooms/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
            toast(`Room set to ${next}`);
            loadRooms();
          } catch (err) { toast(err.message, false); }
        } else if (act === 'delete') {
          if (!confirm(`Delete “${room.name}”? This cannot be undone.`)) return;
          try {
            await api(`/api/admin/rooms/${id}`, { method: 'DELETE' });
            toast('Room deleted');
            loadRooms();
          } catch (err) { toast(err.message, false); }
        }
      };
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--red)">${err.message}</td></tr>`;
  }
}

/* ------------------------------- room modal ------------------------------- */

const rm = $('#roomModal');

function openRoomModal(room) {
  state.editingRoomId = room ? room.id : null;
  $('#rmTitle').textContent = room ? 'Edit room' : 'Add a room';
  $('#rName').value = room ? room.name : '';
  $('#rType').value = room ? room.type : 'Standard';
  $('#rStatus').value = room ? room.status : 'active';
  $('#rPrice').value = room ? room.price : 199;
  $('#rCapacity').value = room ? room.capacity : 2;
  $('#rSize').value = room ? room.size_sqm : 32;
  $('#rAmenities').value = room ? room.amenities.join(', ') : 'King bed, Free Wi-Fi';
  $('#rDesc').value = room ? room.description : '';
  rm.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeRoomModal() {
  rm.classList.remove('open');
  document.body.style.overflow = '';
}
$$('[data-close]', rm).forEach((b) => (b.onclick = closeRoomModal));
rm.addEventListener('click', (e) => { if (e.target === rm) closeRoomModal(); });

$('#addRoomBtn').onclick = () => openRoomModal(null);

$('#saveRoomBtn').onclick = async () => {
  const payload = {
    name: $('#rName').value.trim(),
    type: $('#rType').value,
    status: $('#rStatus').value,
    price: Number($('#rPrice').value),
    capacity: Number($('#rCapacity').value),
    size_sqm: Number($('#rSize').value),
    amenities: $('#rAmenities').value.split(',').map((s) => s.trim()).filter(Boolean),
    description: $('#rDesc').value.trim(),
  };
  if (!payload.name || !payload.description || !(payload.price > 0) || !(payload.capacity > 0)) {
    return toast('Name, description, price and capacity are required.', false);
  }
  const btn = $('#saveRoomBtn');
  btn.disabled = true;
  try {
    if (state.editingRoomId) {
      await api(`/api/admin/rooms/${state.editingRoomId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Room updated');
    } else {
      await api('/api/admin/rooms', { method: 'POST', body: JSON.stringify(payload) });
      toast('Room added');
    }
    closeRoomModal();
    loadRooms();
  } catch (err) {
    toast(err.message, false);
  } finally {
    btn.disabled = false;
  }
};

/* ---------------------------------- icons --------------------------------- */

const ICON = {
  arrivals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17 3 13h18l-2 4M7 13l-1-4h4l-1 4"/></svg>',
  departures: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17 3 13h18l-2 4M17 13l1-4h-4l1 4"/></svg>',
  occupancy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/></svg>',
  revenue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  bookings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  checkout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  toggle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="2.6" fill="currentColor" stroke="none"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
};

/* ----------------------------------- init --------------------------------- */

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRoomModal(); });

(async () => {
  if (!state.token) return showLogin();
  try {
    const { user } = await api('/api/admin/me');
    showDash(user);
  } catch {
    showLogin();
  }
})();
