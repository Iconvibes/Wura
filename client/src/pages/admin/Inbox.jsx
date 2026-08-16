import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh.jsx';

// Lets AdminLayout refresh its Inbox badge after read/unread/delete mutations.
const notifyBadge = () => window.dispatchEvent(new Event('wura-inbox-changed'));

// Swipe-to-delete geometry: the row slides left by SWIPE_OPEN to reveal the
// delete button (same width), and a swipe past SWIPE_TRIGGER settles open.
const SWIPE_OPEN = 72;
const SWIPE_TRIGGER = 40;

// Pagination: the list loads one page and appends via 'Load more'.
const PAGE_SIZE = 25;

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function MessageRow({ m, active, onClick, open, onOpenSwipe, onCloseSwipe, onDelete }) {
  const [swipe, setSwipe] = useState(0);
  const [dragging, setDragging] = useState(false);
  const swipeRef = useRef(0);
  const startX = useRef(null);
  const moved = useRef(false);
  const suppressClick = useRef(false);

  const setSwipeBoth = (px) => {
    swipeRef.current = px;
    setSwipe(px);
  };

  // Another row opened (or the list scrolled) — snap this one shut.
  useEffect(() => {
    if (!open && swipeRef.current !== 0) setSwipeBoth(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    moved.current = false;
  };

  const handleTouchMove = (e) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 10) moved.current = true;
    const base = open ? -SWIPE_OPEN : 0;
    const next = Math.max(-SWIPE_OPEN - 16, Math.min(0, base + dx));
    setSwipeBoth(next);
    if (!dragging) setDragging(true);
  };

  const handleTouchEnd = () => {
    startX.current = null;
    setDragging(false);
    if (moved.current) {
      // A swipe is a gesture, not a tap — swallow the click that follows.
      suppressClick.current = true;
      if (swipeRef.current < -SWIPE_TRIGGER) {
        setSwipeBoth(-SWIPE_OPEN);
        onOpenSwipe(m.id);
      } else {
        setSwipeBoth(0);
        if (open) onCloseSwipe();
      }
    }
  };

  const handleClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (open) { setSwipeBoth(0); onCloseSwipe(); return; }
    onClick();
  };

  return (
    <div className={`relative overflow-hidden border-b border-white/5 ${active ? 'bg-gold-500/10' : ''}`}>
      {/* Revealed by the swipe — a real button so it stays keyboard-accessible. */}
      <span className="absolute inset-y-0 right-0 w-[72px]">
        <button
          type="button"
          aria-label={`Delete message from ${m.name}`}
          onClick={onDelete}
          className="absolute inset-0 grid place-items-center text-white bg-red-600/90 active:bg-red-600"
        >
          {Icon({ name: 'trash', size: 18 })}
        </button>
      </span>

      <button
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full text-left px-4 py-3.5 touch-pan-y transition-colors ${
          active ? '' : m.read ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.05]'
        }`}
        style={{
          transform: `translateX(${open ? -SWIPE_OPEN : swipe}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full flex-none ${m.read ? 'bg-white/15' : 'bg-gold-400'}`} />
          <span className={`flex-1 truncate text-[13.5px] ${m.read ? 'text-muted' : 'text-cream font-bold'}`}>
            {m.name}
          </span>
          <span className="text-[11px] text-dim flex-none">{fmtWhen(m.sent_at || m.created_at)}</span>
        </div>
        <div className={`truncate mt-0.5 pl-[18px] text-[12.5px] ${m.read ? 'text-dim' : 'text-gold-300/90'}`}>
          {m.subject}
        </div>
      </button>
    </div>
  );
}

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  // Global unread count from the server — with pagination the visible window
  // can't compute it, and the header/badge must stay accurate across pages.
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [viewing, setViewing] = useState(false); // mobile: list ↔ detail
  const [swipedId, setSwipedId] = useState(null); // single swipe-open row
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // First page, newest first. Also used by pull-to-refresh, which restarts
  // from the top so the freshest messages are always visible.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/api/admin/messages?limit=${PAGE_SIZE}&offset=0`);
      setMessages(data.messages || []);
      setTotal(data.total ?? (data.messages || []).length);
      setUnread(data.unread ?? 0);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api(`/api/admin/messages?limit=${PAGE_SIZE}&offset=${messages.length}`);
      setMessages((list) => [...list, ...(data.messages || [])]);
      setTotal((prev) => data.total ?? prev);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, messages.length]);

  useEffect(() => { load(); }, [load]);

  const { containerRef: listRef, pull, refreshing } = usePullToRefresh({
    enabled: isMobile && !loading && messages.length > 0,
    onRefresh: load,
  });

  const selected = messages.find((m) => m.id === selectedId) || null;

  const setRead = async (m, read) => {
    // Optimistic update, rolled back on failure.
    const prev = messages;
    const prevUnread = unread;
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read } : x)));
    setUnread((u) => Math.max(0, u + (read ? -1 : 1)));
    try {
      const data = await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: JSON.stringify({ read }) });
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read: data.message.read } : x)));
      notifyBadge();
    } catch (e) {
      setMessages(prev);
      setUnread(prevUnread);
      toast(e.message, false);
    }
  };

  const openMessage = (m) => {
    setSelectedId(m.id);
    setViewing(true);
    setSwipedId(null);
    if (!m.read) setRead(m, true);
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete the message from ${m.name}?`)) return;
    try {
      await api(`/api/admin/messages/${m.id}`, { method: 'DELETE' });
      setMessages((list) => list.filter((x) => x.id !== m.id));
      setTotal((t) => Math.max(0, t - 1));
      if (!m.read) setUnread((u) => Math.max(0, u - 1));
      if (selectedId === m.id) { setSelectedId(null); setViewing(false); }
      if (swipedId === m.id) setSwipedId(null);
      notifyBadge();
      toast('Message deleted');
    } catch (e) {
      toast(e.message, false);
    }
  };

  const markAllRead = async () => {
    try {
      await api('/api/admin/messages/read-all', { method: 'POST' });
      setMessages((list) => list.map((x) => ({ ...x, read: true })));
      setUnread(0);
      notifyBadge();
      toast('All messages marked as read');
    } catch (e) {
      toast(e.message, false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Inbox</h1>
          <p className="text-[13px] text-muted mt-0.5">
            {unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''} from the contact form` : 'All enquiries read — you’re all caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={unread === 0}>
            {Icon({ name: 'check', size: 15 })} Mark all read
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : messages.length === 0 ? (
        <div className="card border-dashed p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full grid place-items-center text-dim bg-white/5 border border-white/10 mb-3">
            {Icon({ name: 'mail', size: 22 })}
          </div>
          <p className="text-[13.5px] text-muted">No enquiries yet — messages sent through the contact form will land here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden md:grid md:grid-cols-[360px_1fr] md:min-h-[560px]">
          {/* list — natural height + page scroll on phones; fixed-height pane
              with its own scroll once the two-column layout kicks in at md */}
          <div
            ref={listRef}
            onScroll={() => setSwipedId(null)}
            className={`${viewing ? 'hidden md:block' : 'block'} border-r border-white/5 md:max-h-[70vh] overflow-y-auto`}
          >
            {/* pull-to-refresh indicator (mobile) */}
            {(pull > 0 || refreshing) && (
              <div
                className="flex items-center justify-center gap-2 overflow-hidden pointer-events-none"
                style={{ height: refreshing ? 42 : pull }}
              >
                {refreshing ? (
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-gold-500/25 border-t-gold-500 animate-spin" />
                ) : (
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-gold-500/25 border-t-gold-500" />
                )}
                <span className="text-[11px] text-dim whitespace-nowrap">
                  {refreshing ? 'Refreshing…' : pull >= 60 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </div>
            )}
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                m={m}
                active={selectedId === m.id}
                onClick={() => openMessage(m)}
                open={swipedId === m.id}
                onOpenSwipe={setSwipedId}
                onCloseSwipe={() => setSwipedId(null)}
                onDelete={() => remove(m)}
              />
            ))}
            {/* Load more — only while the server still has older messages. */}
            {messages.length < total && (
              <div className="p-3 border-t border-white/5">
                <button
                  className="w-full py-2.5 text-[12.5px] font-semibold tracking-wide text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors disabled:opacity-50"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, total - messages.length)} more`}
                </button>
              </div>
            )}
          </div>

          {/* detail */}
          <div className={`${viewing ? 'block' : 'hidden md:block'} p-6 md:p-8`}>
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full grid place-items-center font-bold text-navy-950 bg-gradient-to-br from-gold-400 to-gold-600 text-[15px] flex-none">
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-cream text-[15px]">{selected.name}</div>
                      <a href={`mailto:${selected.email}`} className="text-[12.5px] text-gold-400 hover:underline">
                        {selected.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      title={selected.read ? 'Mark as unread' : 'Mark as read'}
                      onClick={() => setRead(selected, !selected.read)}
                    >
                      {Icon({ name: selected.read ? 'mail' : 'check', size: 14 })}
                      <span className="hidden sm:inline">{selected.read ? 'Unread' : 'Read'}</span>
                    </button>
                    <button className="btn btn-ghost btn-sm !text-red-400/90 hover:!bg-red-500/10" title="Delete" onClick={() => remove(selected)}>
                      {Icon({ name: 'trash', size: 14 })}
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5">
                  <div className="text-[12px] tracking-wide text-dim">
                    {fmtWhen(selected.sent_at || selected.created_at)}
                    {' · '}
                    <span className={selected.read ? 'text-muted' : 'text-gold-400 font-semibold'}>
                      {selected.read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <h2 className="font-serif text-[20px] text-gold-300 mt-2 break-words">{selected.subject}</h2>
                  <p className="text-[14.5px] leading-7 text-cream/90 mt-4 whitespace-pre-wrap break-words">{selected.message}</p>
                </div>

                <div className="mt-8 pt-5 border-t border-white/5 flex flex-wrap gap-3">
                  <a className="btn btn-gold btn-sm" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}>
                    {Icon({ name: 'mail', size: 14 })} Reply
                  </a>
                  <button className="btn btn-ghost btn-sm md:hidden" onClick={() => setViewing(false)}>
                    {Icon({ name: 'prev', size: 14 })} Back to list
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full min-h-[480px] grid place-items-center text-center">
                <div>
                  <div className="mx-auto w-14 h-14 rounded-full grid place-items-center text-gold-500 bg-gold-500/10 border border-gold-500/25 mb-4">
                    {Icon({ name: 'mail', size: 26 })}
                  </div>
                  <p className="text-[13.5px] text-muted">Select a message to read it</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
