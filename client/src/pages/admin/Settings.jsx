import { useState } from 'react';
import { api } from '../../api.jsx';
import { toast } from '../../components/Toast.jsx';
import { Icon } from '../../components/Icons.jsx';

const MIN_CODE = 6;
const MAX_CODE = 64;

export default function Settings() {
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentCode.trim() || !newCode.trim() || !confirmCode.trim()) {
      setError('Fill in all three fields.');
      return;
    }
    if (newCode.length < MIN_CODE || newCode.length > MAX_CODE) {
      setError(`The new code must be between ${MIN_CODE} and ${MAX_CODE} characters.`);
      return;
    }
    if (newCode !== confirmCode) {
      setError('The new code and its confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      await api('/api/admin/access-code', {
        method: 'POST',
        body: JSON.stringify({ current_code: currentCode.trim(), code: newCode.trim() }),
      });
      toast('Access code updated');
      setCurrentCode('');
      setNewCode('');
      setConfirmCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-full bg-gold-400/10 border border-gold-400/25 grid place-items-center text-gold-400">
          {Icon({ name: 'shield', size: 18 })}
        </div>
        <div>
          <h1 className="font-serif text-[26px] text-cream">Settings</h1>
          <p className="text-[13px] text-muted mt-0.5">Staff access code</p>
        </div>
      </div>

      <div className="card p-7">
        <h2 className="font-serif text-[18px] text-cream">Rotate the staff access code</h2>
        <p className="text-[13px] text-dim leading-relaxed mt-2 mb-6">
          Every staff member enters this code before signing in. Changing it takes
          effect immediately — the old code stops working, so share the new one
          with the team. The code is separate from each staff member's password.
        </p>

        <form className="space-y-4" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="set-current">Current access code</label>
            <input
              id="set-current"
              type="password"
              autoComplete="off"
              value={currentCode}
              onChange={(e) => setCurrentCode(e.target.value)}
              placeholder="••••••••••"
            />
          </div>
          <div className="form-field">
            <label htmlFor="set-new">New access code</label>
            <input
              id="set-new"
              type="password"
              autoComplete="new-password"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder={`${MIN_CODE}–${MAX_CODE} characters`}
            />
          </div>
          <div className="form-field">
            <label htmlFor="set-confirm">Confirm new access code</label>
            <input
              id="set-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              placeholder="Repeat the new code"
            />
          </div>

          {error && <p className="text-red-soft text-[13px]">{error}</p>}

          <button className="btn btn-gold" disabled={busy}>
            {Icon({ name: 'shield', size: 15 })}
            {busy ? 'Updating…' : 'Update access code'}
          </button>
        </form>
      </div>

      <p className="text-[12px] text-dim mt-4">
        Tip: pick a code that's easy for staff to type but hard to guess — a
        hotel name plus a year, e.g. <span className="font-mono text-gold-400">WURA-2026</span>. Login
        attempts are rate-limited, so a reasonably long code is safe.
      </p>
    </div>
  );
}
