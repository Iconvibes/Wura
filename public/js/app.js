'use strict';

/* ------------------------------- state & utils ---------------------------- */

const state = {
  rooms: [],          // all active rooms (unfiltered)
  visible: [],        // currently displayed rooms
  filter: 'all',      // room type filter
  dates: { checkIn: '', checkOut: '' },
  guests: 2,
  nights: 1,
  selection: null,    // selected room during booking flow
  step: 1,
  booking: null,
  search: '',         // search query
  sort: 'name',       // name | price | capacity
  sortDir: 'asc',     // asc | desc
  page: 1,
  limit: 6,
  totalPages: 1,
  totalRooms: 0,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `\u20a6${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function nightsBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/></svg><span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* --------------------------------- icons ---------------------------------- */

const ICONS = {
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M17.8 19a5.5 5.5 0 0 0-2.6-4.6"/></svg>',
  size: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};

/* ------------------------------ room rendering ---------------------------- */

function roomArtFor(i, type) {
  // Deterministic room art generator (mirrors the server-side SVG style).
  const palettes = [
    ['#1c2747', '#0a0f20'], ['#2a2140', '#0d0a1a'], ['#14333c', '#07141a'],
    ['#33291a', '#140f06'], ['#1f3a33', '#0a1512'],
  ];
  const p = palettes[i % palettes.length];
  const G = '#d4af37';
  const stars = Array.from({ length: 14 }, (_, k) => {
    const x = 30 + ((k * 137.5) % 740);
    const y = 20 + ((k * 61.8) % 240);
    const r = 0.6 + ((k * 7) % 10) / 9;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(255,255,255,${(0.14 + (k % 4) * 0.12).toFixed(2)}"/>`;
  }).join('');
  const art = `
    <rect x="250" y="240" width="300" height="150" rx="10" fill="none" stroke="${G}" stroke-width="2"/>
    <rect x="272" y="262" width="256" height="40" rx="6" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.4"/>
    <rect x="272" y="262" width="120" height="40" rx="6" fill="rgba(212,175,55,0.16)"/>
    <path d="M250 390 L550 390 L570 430 L230 430 Z" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.6"/>
    <ellipse cx="400" cy="468" rx="150" ry="22" fill="rgba(212,175,55,0.08)"/>
    <line x1="250" y1="250" x2="250" y2="390" stroke="${G}" stroke-width="2"/>
    <line x1="550" y1="250" x2="550" y2="390" stroke="${G}" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>
    <rect width="800" height="560" fill="url(#g)"/>${stars}${art}
    <rect x="0" y="0" width="800" height="560" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderRooms() {
  const grid = $('#roomsGrid');
  let list = state.rooms;
  if (state.filter !== 'all') list = list.filter((r) => r.type === state.filter);

  const haveDates = !!(state.dates.checkIn && state.dates.checkOut);
  if (haveDates) {
    list = list.filter((r) => r.capacity >= state.guests);
  }

  state.visible = list;
  $('#resultCount').innerHTML = haveDates
    ? `<b>${state.totalRooms}</b> of <b>${state.totalRooms}</b> rooms available ${fmtDate(state.dates.checkIn)} – ${fmtDate(state.dates.checkOut)}`
    : `<b>${state.totalRooms}</b> rooms &amp; suites`;

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="big">Nothing matches — yet.</div>
      <p>Try different dates, or more guests, or browse all rooms without a filter.</p>
      <p style="margin-top:18px"><button class="btn btn-ghost btn-sm" id="clearFilters">Show all rooms</button></p>
    </div>`;
    const clear = $('#clearFilters');
    if (clear) clear.onclick = () => { state.dates = { checkIn: '', checkOut: '' }; state.search = ''; state.page = 1; loadRooms(); };
    return;
  }

  grid.innerHTML = list.map((r, idx) => {
    const art = r.art || roomArtFor(idx, r.type);
    const unavailable = haveDates && !availableIn(list, r);
    return `
    <article class="room-card ${unavailable ? 'room-unavailable' : ''} reveal visible">
      <div class="room-card-img" data-room="${r.id}">
        <img src="${art}" alt="${r.name}" loading="lazy"/>
        <span class="room-type-badge">${r.type}</span>
      </div>
      <div class="room-card-body">
        <h3 class="room-card-title">${r.name}</h3>
        <p class="room-card-desc">${r.description}</p>
        <div class="room-meta">
          <span>${ICONS.users} Up to ${r.capacity} guests</span>
          <span>${ICONS.size} ${r.size_sqm} m²</span>
          <span>${ICONS.check} Free cancellation</span>
        </div>
        <div class="room-card-foot">
          <div class="price"><span class="amt">${money(r.price)}</span> <span class="per">/ night</span></div>
          <button class="btn btn-gold btn-sm book-cta" data-room="${r.id}">${unavailable ? 'Sold out' : 'Book now'}</button>
        </div>
      </div>
    </article>`;
  }).join('');

  // Append pagination
  if (state.totalPages > 1) {
    const pDiv = document.createElement('div');
    pDiv.className = 'pagination';
    pDiv.setAttribute('data-paginate', '');
    pDiv.innerHTML = paginationHTML();
    grid.appendChild(pDiv);
    bindPagination();
  }

  $$('.book-cta', grid).forEach((btn) => {
    btn.onclick = () => openBooking(Number(btn.dataset.room));
  });
  $$('.room-card-img', grid).forEach((img) => {
    img.onclick = () => openBooking(Number(img.dataset.room));
  });
}

function paginationHTML() {
  const { page, totalPages } = state;
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  let pages = '';
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  return `<div class="pagination-inner">
    <button class="page-btn prev" data-page="${prev}" ${page <= 1 ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    </button>
    ${pages}
    <button class="page-btn next" data-page="${next}" ${page >= totalPages ? 'disabled' : ''}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>
  </div>`;
}

function bindPagination() {
  $$('.page-btn').forEach((btn) => {
    btn.onclick = () => {
      const p = Number(btn.dataset.page);
      if (p && p !== state.page) {
        state.page = p;
        loadRooms();
        $('#rooms').scrollIntoView({ behavior: 'smooth' });
      }
    };
  });
}

function availableIn(list, r) {
  // The API already returns only available rooms when dates are set, so a room
  // present in `list` that we later filtered by guests is considered available.
  return list.some((x) => x.id === r.id);
}

function renderChips() {
  const types = ['all', ...new Set(state.rooms.map((r) => r.type))];
  const labels = { all: 'All rooms' };
  const chips = $('#typeChips');
  chips.innerHTML = types.map((t) =>
    `<button class="chip ${state.filter === t ? 'active' : ''}" data-type="${t}">${labels[t] || t}</button>`
  ).join('');
  $$('.chip', chips).forEach((c) => {
    c.onclick = () => { state.filter = c.dataset.type; renderChips(); renderRooms(); };
  });
}

/* ----------------------------- availability fetch -------------------------- */

async function loadRooms() {
  try {
    const params = new URLSearchParams();
    if (state.dates.checkIn && state.dates.checkOut) {
      params.set('checkIn', state.dates.checkIn);
      params.set('checkOut', state.dates.checkOut);
      params.set('guests', state.guests);
    }
    if (state.search) params.set('search', state.search);
    params.set('sort', state.sort);
    params.set('dir', state.sortDir);
    params.set('page', state.page);
    params.set('limit', state.limit);
    const qs = params.toString();
    const data = await api(`/api/rooms${qs ? `?${qs}` : ''}`);
    state.rooms = data.rooms;
    state.totalRooms = data.pagination.total;
    state.totalPages = data.pagination.totalPages;
    renderChips();
    renderRooms();

    // Update the toolbar controls to reflect current state.
    const searchInput = $('#roomSearch');
    if (searchInput) searchInput.value = state.search;
    const sortSelect = $('#roomSort');
    if (sortSelect) sortSelect.value = state.sort + '-' + state.sortDir;
  } catch (err) {
    $('#roomsGrid').innerHTML = `<div class="empty-state"><div class="big">Couldn't load rooms</div><p>${err.message}</p></div>`;
  }
}

/* ----------------------------- search & sort ----------------------------- */

$('#roomSearch').addEventListener('input', (e) => {
  clearTimeout(window._searchTimer);
  window._searchTimer = setTimeout(() => {
    state.search = e.target.value.trim();
    state.page = 1;
    loadRooms();
  }, 300);
});

$('#roomSort').addEventListener('change', (e) => {
  const [sort, dir] = e.target.value.split('-');
  state.sort = sort;
  state.sortDir = dir;
  state.page = 1;
  loadRooms();
});

/* ------------------------------ booking widget ---------------------------- */

function setWidgetDates() {
  const today = new Date();
  const ci = isoDate(today);
  const co = addDays(ci, 2);
  $('#wCheckIn').value = ci;
  $('#wCheckIn').min = ci;
  $('#wCheckOut').value = co;
  $('#wCheckOut').min = addDays(ci, 1);
  state.dates = { checkIn: ci, checkOut: co };
}

$('#bookingWidget').addEventListener('submit', async (e) => {
  e.preventDefault();
  const checkIn = $('#wCheckIn').value;
  const checkOut = $('#wCheckOut').value;
  if (!checkIn || !checkOut) return toast('Please choose your dates.');
  if (checkOut <= checkIn) {
    $('#wCheckOut').min = addDays(checkIn, 1);
    return toast('Check-out must be after check-in.');
  }
  state.dates = { checkIn, checkOut };
  state.guests = Number($('#wGuests').value);
  $('#rooms').scrollIntoView({ behavior: 'smooth' });
  toast(`Checking availability for ${nightsBetween(checkIn, checkOut)} night${nightsBetween(checkIn, checkOut) > 1 ? 's' : ''}…`);
  await loadRooms();
});

$('#wCheckIn').addEventListener('change', () => {
  const ci = $('#wCheckIn').value;
  $('#wCheckOut').min = addDays(ci, 1);
  if ($('#wCheckOut').value && $('#wCheckOut').value <= ci) $('#wCheckOut').value = addDays(ci, 1);
});
$('#wCheckOut').addEventListener('change', () => {
  const ci = $('#wCheckIn').value;
  if ($('#wCheckOut').value && ci && $('#wCheckOut').value <= ci) $('#wCheckOut').value = addDays(ci, 1);
});

/* ------------------------------ booking modal ----------------------------- */

const bm = $('#bookingModal');
const bmBody = $('#bmBody');
const bmFoot = $('#bmFoot');

function openModal() {
  bm.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  bm.classList.remove('open');
  document.body.style.overflow = '';
}
$$('[data-close]', bm).forEach((b) => (b.onclick = closeModal));
bm.addEventListener('click', (e) => { if (e.target === bm) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeFindModal(); } });

function openBooking(roomId) {
  const room = state.rooms.find((r) => r.id === roomId) ||
    state.visible.find((r) => r.id === roomId);
  if (!room) return toast('Room not found.');
  state.selection = room;
  state.step = 1;
  if (!state.dates.checkIn || !state.dates.checkOut) setWidgetDates();
  state.nights = nightsBetween(state.dates.checkIn, state.dates.checkOut) || 1;
  openModal();
  renderStep();
}

function stepHead() {
  return `<div class="steps">
    ${[1, 2, 3].map((s) => `<div class="step-dot ${s <= state.step ? 'done' : ''}"></div>`).join('')}
  </div>`;
}

function renderStep() {
  const s = state.step;
  if (s === 1) renderStepDates();
  else if (s === 2) renderStepRoom();
  else if (s === 3) renderStepGuest();
  else if (s === 4) renderSuccess();
}

function renderStepDates() {
  const d = state.dates;
  bmBody.innerHTML = `
    ${stepHead()}
    <h4 style="color:var(--cream);font-family:var(--serif);font-size:20px;margin-bottom:18px">When would you like to stay?</h4>
    <div class="form-grid">
      <div class="form-field"><label>Check-in</label><input type="date" id="sCheckIn" value="${d.checkIn}" min="${isoDate(new Date())}"/></div>
      <div class="form-field"><label>Check-out</label><input type="date" id="sCheckOut" value="${d.checkOut}" min="${addDays(d.checkIn, 1)}"/></div>
      <div class="form-field full"><label>Guests</label>
        <select id="sGuests">${[1, 2, 3, 4, 5, 6].map((g) => `<option value="${g}" ${g === state.guests ? 'selected' : ''}>${g} ${g === 1 ? 'guest' : 'guests'}</option>`).join('')}</select>
      </div>
    </div>
    <div style="margin-top:18px;padding:14px 16px;background:var(--gold-soft);border:1px solid var(--line-gold);border-radius:10px;font-size:13px;color:var(--muted)">
      ${ICONS.calendar} <b style="color:var(--cream)">${fmtDate(d.checkIn)}</b> → <b style="color:var(--cream)">${fmtDate(d.checkOut)}</b> · ${state.nights} night${state.nights > 1 ? 's' : ''}
    </div>`;
  bmFoot.innerHTML = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-gold" id="next1">Continue</button>`;
  $('#next1').onclick = () => {
    const ci = $('#sCheckIn').value, co = $('#sCheckOut').value, g = Number($('#sGuests').value);
    if (!ci || !co) return toast('Please choose both dates.');
    if (co <= ci) return toast('Check-out must be after check-in.');
    state.dates = { checkIn: ci, checkOut: co };
    state.guests = g;
    state.nights = nightsBetween(ci, co);
    state.step = 2;
    renderStep();
  };
}

function renderStepRoom() {
  bmBody.innerHTML = `${stepHead()}
    <h4 style="color:var(--cream);font-family:var(--serif);font-size:20px;margin-bottom:6px">Choose your room</h4>
    <p style="color:var(--muted);font-size:13px;margin-bottom:18px">${fmtDate(state.dates.checkIn)} → ${fmtDate(state.dates.checkOut)} · ${state.nights} night${state.nights > 1 ? 's' : ''} · ${state.guests} guest${state.guests > 1 ? 's' : ''}</p>
    <div id="roomPicker"><div class="spinner"></div></div>`;
  bmFoot.innerHTML = `<button class="btn btn-ghost" onclick="backToStep(1)">Back</button>
    <button class="btn btn-gold" id="next2" disabled>Continue</button>`;

  const picker = $('#roomPicker');
  api(`/api/rooms?checkIn=${state.dates.checkIn}&checkOut=${state.dates.checkOut}&guests=${state.guests}`)
    .then(({ rooms }) => {
      if (!rooms.length) {
        picker.innerHTML = `<div class="empty-state" style="padding:30px 16px"><div class="big">Sold out</div><p>No rooms match those dates. Try shifting your stay.</p></div>`;
        $('#next2').disabled = true;
        return;
      }
      state.stepRooms = rooms;
      picker.innerHTML = rooms.map((r) => `
        <div class="bp-row" data-room="${r.id}">
          <img src="${r.art}" alt="${r.name}"/>
          <div class="bp-info">
            <div class="bp-name">${r.name}</div>
            <div class="bp-meta">${r.type} · up to ${r.capacity} guests · ${r.size_sqm} m²</div>
          </div>
          <div class="bp-price">${money(r.price)} <span style="font-family:var(--sans);font-size:11px;color:var(--dim)">/nt</span></div>
        </div>`).join('');
      $$('.bp-row', picker).forEach((row) => {
        row.onclick = () => {
          $$('.bp-row', picker).forEach((x) => x.classList.remove('selected'));
          row.classList.add('selected');
          state.selection = state.stepRooms.find((r) => r.id === Number(row.dataset.room));
          $('#next2').disabled = false;
        };
      });
    })
    .catch((err) => {
      picker.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    });

  $('#next2').onclick = () => { state.step = 3; renderStep(); };
}

function renderStepGuest() {
  const r = state.selection;
  const total = r.price * state.nights;
  bmBody.innerHTML = `${stepHead()}
    <h4 style="color:var(--cream);font-family:var(--serif);font-size:20px;margin-bottom:18px">Your details</h4>
    <div class="form-grid">
      <div class="form-field full"><label>Full name</label><input type="text" id="gName" placeholder="e.g. Amara Okafor" autocomplete="name"/>
        <span class="err" id="errName"></span></div>
      <div class="form-field full"><label>Email</label><input type="email" id="gEmail" placeholder="you@example.com" autocomplete="email"/>
        <span class="err" id="errEmail"></span></div>
      <div class="form-field full"><label>Phone <span style="opacity:.5;text-transform:none">(optional)</span></label><input type="tel" id="gPhone" placeholder="+1 555 000 0000"/></div>
      <div class="form-field full"><label>Special requests <span style="opacity:.5;text-transform:none">(optional)</span></label><textarea id="gNotes" rows="2" placeholder="Late arrival, airport pickup, anniversary…"></textarea></div>
    </div>
    <div class="summary" style="margin-top:18px">
      <div class="row"><span>${r.name}</span><b>${money(r.price)} × ${state.nights} night${state.nights > 1 ? 's' : ''}</b></div>
      <div class="row"><span>Dates</span><b>${fmtDate(state.dates.checkIn)} → ${fmtDate(state.dates.checkOut)}</b></div>
      <div class="row"><span>Guests</span><b>${state.guests}</b></div>
      <div class="row total"><span>Total</span><b>${money(total)}</b></div>
    </div>`;
  bmFoot.innerHTML = `<button class="btn btn-ghost" onclick="backToStep(2)">Back</button>
    <button class="btn btn-gold" id="confirmBtn">Confirm booking</button>`;

  $('#confirmBtn').onclick = async () => {
    const name = $('#gName').value.trim();
    const email = $('#gEmail').value.trim();
    const phone = $('#gPhone').value.trim();
    const notes = $('#gNotes').value.trim();
    let ok = true;
    if (name.length < 2) { $('#gName').classList.add('invalid'); $('#errName').textContent = 'Please enter your full name.'; ok = false; }
    else { $('#gName').classList.remove('invalid'); $('#errName').textContent = ''; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('#gEmail').classList.add('invalid'); $('#errEmail').textContent = 'Please enter a valid email.'; ok = false; }
    else { $('#gEmail').classList.remove('invalid'); $('#errEmail').textContent = ''; }
    if (!ok) return;

    const btn = $('#confirmBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="margin:0;width:18px;height:18px;border-width:2px"></span> Confirming…';
    try {
      const { booking } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          room_id: r.id, guest_name: name, guest_email: email, guest_phone: phone,
          check_in: state.dates.checkIn, check_out: state.dates.checkOut,
          guests: state.guests, notes,
        }),
      });
      state.booking = booking;
      state.step = 4;
      renderStep();
      loadRooms(); // refresh availability behind the modal
    } catch (err) {
      toast(err.message);
      btn.disabled = false;
      btn.textContent = 'Confirm booking';
    }
  };
}

function renderSuccess() {
  const b = state.booking;
  bmBody.innerHTML = `
    <div class="success-wrap">
      <div class="success-ring">${ICONS.check}</div>
      <h4 style="color:var(--cream);font-family:var(--serif);font-size:24px;margin-bottom:8px">You're booked, ${b.guest_name.split(' ')[0]}!</h4>
      <p style="color:var(--muted);font-size:14px;margin-bottom:6px">A confirmation has been sent to <b style="color:var(--cream)">${b.guest_email}</b></p>
      <div class="ref-code">${b.ref}</div>
      <div class="summary" style="text-align:left">
        <div class="row"><span>Room</span><b>${b.room_name || ''} ${b.room_type ? '· ' + b.room_type : ''}</b></div>
        <div class="row"><span>Dates</span><b>${fmtDate(b.check_in)} → ${fmtDate(b.check_out)}</b></div>
        <div class="row"><span>Guests</span><b>${b.guests}</b></div>
        <div class="row total"><span>Total</span><b>${money(b.total)}</b></div>
      </div>
      <p style="margin-top:16px;font-size:12px;color:var(--dim)">Keep your reference — you'll need it at check-in. Free cancellation up to 48h before arrival.</p>
    </div>`;
  bmFoot.innerHTML = `<button class="btn btn-gold btn-block" onclick="closeModal()">Done</button>`;
}

function backToStep(s) { state.step = s; renderStep(); }

/* ------------------------------ find a booking ---------------------------- */

const fm = $('#findModal');
const fmBody = $('#fmBody');

function closeFindModal() { fm.classList.remove('open'); document.body.style.overflow = ''; }
$('#findBookingLink').onclick = (e) => {
  e.preventDefault();
  fmBody.innerHTML = `
    <h4 style="color:var(--cream);font-family:var(--serif);font-size:20px;margin-bottom:6px">Look up your stay</h4>
    <p style="color:var(--muted);font-size:13px;margin-bottom:18px">Enter the reference from your confirmation email.</p>
    <div class="form-field full"><label>Booking reference</label>
      <input type="text" id="refInput" placeholder="e.g. WU1A2B3C" style="text-transform:uppercase;letter-spacing:2px"/>
    </div>
    <div id="refResult"></div>`;
  fm.classList.add('open');
  document.body.style.overflow = 'hidden';
  const input = $('#refInput');
  input.focus();
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    if (input.value.trim().length < 6) { $('#refResult').innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const { booking } = await api(`/api/bookings/${encodeURIComponent(input.value.trim())}`);
        const statusCls = booking.status;
        $('#refResult').innerHTML = `
          <div class="summary" style="margin-top:16px">
            <div class="row"><span>Reference</span><b class="mono" style="color:var(--gold)">${booking.ref}</b></div>
            <div class="row"><span>Room</span><b>${booking.room_name} · ${booking.room_type}</b></div>
            <div class="row"><span>Guest</span><b>${booking.guest_name}</b></div>
            <div class="row"><span>Dates</span><b>${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)}</b></div>
            <div class="row"><span>Guests</span><b>${booking.guests}</b></div>
            <div class="row"><span>Total</span><b>${money(booking.total)}</b></div>
            <div class="row"><span>Status</span><span class="pill ${statusCls}">${statusCls.replace('_', ' ')}</span></div>
          </div>`;
      } catch (err) {
        $('#refResult').innerHTML = `<p style="color:var(--red);font-size:13px;margin-top:14px">${err.message}</p>`;
      }
    }, 350);
  });
};
fm.addEventListener('click', (e) => { if (e.target === fm) closeFindModal(); });

/* --------------------------------- nav & fx ------------------------------- */

const nav = $('#nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });

const navToggle = $('#navToggle');
const navLinks = $('#navLinks');
navToggle.onclick = () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
};
$$('#navLinks a').forEach((a) => a.addEventListener('click', () => navLinks.classList.remove('open')));

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$('.reveal').forEach((el) => io.observe(el));

// hero art + gallery art (client-side SVG, no external images)
function heroArt() {
  $('#heroArtCard').innerHTML = `<img src="${roomArtFor(3, 'Suite')}" alt="The Skyline Suite at dusk"/>`;
}
function galleryArt() {
  $$('.gal-item img').forEach((img) => {
    const idx = Number(img.dataset.art);
    img.src = roomArtFor(idx * 2 + 1, 'Suite');
  });
}
heroArt();
galleryArt();

/* ----------------------------------- init --------------------------------- */
setWidgetDates();
loadRooms();
