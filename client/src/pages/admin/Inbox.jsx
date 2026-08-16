import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

// Lets AdminLayout refresh its Inbox badge after read/unread/delete mutations.
const notifyBadge = () => window.dispatchEvent(new Event('wura-inbox-changed'));

function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function MessageRow({ m, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-colors ${
        active ? 'bg-gold-500/10' : m.read ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.05]'
      }`}
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
  );
}

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(false); // mobile: list ↔ detail

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/messages');
      setMessages(data.messages || []);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = messages.find((m) => m.id === selectedId) || null;

  const setRead = async (m, read) => {
    // Optimistic update, rolled back on failure.
    const prev = messages;
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read } : x)));
    try {
      const data = await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', body: JSON.stringify({ read }) });
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read: data.message.read } : x)));
      notifyBadge();
    } catch (e) {
      setMessages(prev);
      toast(e.message, false);
    }
  };

  const openMessage = (m) => {
    setSelectedId(m.id);
    setViewing(true);
    if (!m.read) setRead(m, true);
  };

  const remove = async (m) => {
    if (!window.confirm(`Delete the message from ${m.name}?`)) return;
    try {
      await api(`/api/admin/messages/${m.id}`, { method: 'DELETE' });
      setMessages((list) => list.filter((x) => x.id !== m.id));
      if (selectedId === m.id) { setSelectedId(null); setViewing(false); }
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
      notifyBadge();
      toast('All messages marked as read');
    } catch (e) {
      toast(e.message, false);
    }
  };

  const unread = messages.filter((m) => !m.read).length;

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
          <div className={`${viewing ? 'hidden md:block' : 'block'} border-r border-white/5 md:max-h-[70vh] overflow-y-auto`}>
            {messages.map((m) => (
              <MessageRow key={m.id} m={m} active={selectedId === m.id} onClick={() => openMessage(m)} />
            ))}
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
