import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

export default function GuestMessaging() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/messages/guest');
      setThreads(data.threads || []);
    } catch (e) { toast(e.message, false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openThread = async (thread) => {
    setSelected(thread);
    if (thread.unread_staff > 0) {
      try { await api('/api/admin/messages/guest/' + thread.id + '/read', { method: 'POST' }); load(); } catch {}
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api('/api/admin/messages/guest/' + selected.id, { method: 'POST', body: JSON.stringify({ text: reply.trim() }) });
      toast('Reply sent');
      setReply('');
      // Reload thread
      const updated = threads.find((t) => t.id === selected.id);
      if (updated) {
        updated.messages.push({ sender: 'staff', sender_name: 'You', text: reply.trim(), created_at: new Date().toISOString() });
        setSelected({ ...updated });
      }
      load();
    } catch (e) { toast(e.message, false); }
    finally { setSending(false); }
  };

  const setStatus = async (thread, status) => {
    try {
      await api('/api/admin/messages/guest/' + thread.id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
      toast('Thread marked as ' + status);
      load();
    } catch (e) { toast(e.message, false); }
  };

  return (
    <div className="max-w-6xl flex gap-6" style={{ minHeight: '70vh' }}>
      {/* Thread list */}
      <div className="w-80 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-serif text-[22px] text-cream">Guest Messages</h1>
          <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })}</button>
        </div>
        {loading ? <div className="py-10"><div className="spinner" /></div> : threads.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-[14px] text-muted">No guest messages yet</div>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <button key={t.id} onClick={() => openThread(t)}
                className={'w-full text-left card p-3 transition-all ' + (selected?.id === t.id ? 'ring-1 ring-gold-500/50' : '') + (t.unread_staff > 0 ? ' border-gold-500/30' : '')}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13px] text-cream">{t.guest_name}</span>
                  {t.unread_staff > 0 && <span className="w-2 h-2 rounded-full bg-gold-400" />}
                </div>
                <div className="text-[11px] text-dim mt-0.5">{t.room_number ? 'Room ' + t.room_number + ' \u00b7 ' : ''}{t.room_name}</div>
                {t.last_message && (
                  <div className="text-[12px] text-muted mt-1 truncate">{t.last_message.text}</div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={'text-[10px] px-1.5 py-0.5 rounded-full border ' + (t.status === 'open' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : t.status === 'resolved' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-white/5 text-dim border-white/10')}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-dim">{t.message_count} message{t.message_count !== 1 ? 's' : ''}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread detail */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
              <div>
                <div className="font-serif text-[18px] text-cream">{selected.guest_name}</div>
                <div className="text-[12px] text-dim">{selected.guest_email} \u00b7 Room {selected.room_number || '?'} \u00b7 {selected.room_name}</div>
              </div>
              <div className="flex gap-2">
                {selected.status !== 'resolved' && (
                  <button className="btn btn-ghost btn-xs" onClick={() => setStatus(selected, 'resolved')}>
                    {Icon({ name: 'check', size: 13 })} Resolve
                  </button>
                )}
                {selected.status !== 'archived' && (
                  <button className="btn btn-ghost btn-xs" onClick={() => setStatus(selected, 'archived')}>
                    {Icon({ name: 'trash', size: 13 })} Archive
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[50vh]">
              {(selected.messages || []).map((m, i) => (
                <div key={i} className={'flex ' + (m.sender === 'staff' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[75%] p-3 rounded-xl ' + (m.sender === 'staff' ? 'bg-gold-500/15 border border-gold-500/25' : 'bg-white/5 border border-white/10')}>
                    <div className="text-[11px] text-dim mb-1">{m.sender_name || m.sender} \u00b7 {new Date(m.created_at).toLocaleTimeString()}</div>
                    <div className="text-[13px] text-cream whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply */}
            {selected.status === 'open' && (
              <div className="flex gap-2 pt-4 border-t border-white/5">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Type your reply..."
                  className="flex-1 rounded-xl text-[13px]" style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '10px 14px', resize: 'none' }} />
                <button className="btn btn-gold self-end" disabled={sending || !reply.trim()} onClick={sendReply}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-12 text-center h-full flex items-center justify-center">
            <div>
              <div className="font-serif text-[18px] text-cream">Select a conversation</div>
              <p className="text-[13px] text-muted mt-2">Choose a guest thread from the list to view messages and reply.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
