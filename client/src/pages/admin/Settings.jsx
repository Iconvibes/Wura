import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../api.jsx';
import { toast } from '../../components/Toast.jsx';
import { Icon } from '../../components/Icons.jsx';

const MIN_CODE = 6;
const MAX_CODE = 64;
const MIN_PASS = 8;
const MAX_PASS = 128;

export default function Settings() {
  // Session role comes from AdminLayout's <Outlet context>. Unknown (still
  // loading / direct render) defaults to the admin view for safety.
  const { user: session } = useOutletContext() || {};
  const isAdmin = session?.role !== 'staff';

  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passBusy, setPassBusy] = useState(false);

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
      // A rotated code must not leave the previous user's username visible on
      // a shared machine for the next staff member to see.
      localStorage.removeItem('wura_last_username');
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

  const submitPassword = async (e) => {
    e.preventDefault();
    setPassError('');

    if (!currentPass || !newPass || !confirmPass) {
      setPassError('Fill in all three fields.');
      return;
    }
    if (newPass.length < MIN_PASS || newPass.length > MAX_PASS) {
      setPassError(`The new password must be between ${MIN_PASS} and ${MAX_PASS} characters.`);
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('The new password and its confirmation do not match.');
      return;
    }

    setPassBusy(true);
    try {
      await api('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPass, new_password: newPass }),
      });
      toast('Password updated');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassBusy(false);
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
          <p className="text-[13px] text-muted mt-0.5">Account, access & security</p>
        </div>
      </div>

      {isAdmin && (
        <>
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

          <StaffAccounts />

          <p className="text-[12px] text-dim mt-4">
            Tip: pick a code that's easy for staff to type but hard to guess — a
            hotel name plus a year, e.g. <span className="font-mono text-gold-400">WURA-2026</span>. Login
            attempts are rate-limited, so a reasonably long code is safe.
          </p>
        </>
      )}

      <div className="card p-7 mt-8">
        <h2 className="font-serif text-[18px] text-cream">Change your sign-in password</h2>
        <p className="text-[13px] text-dim leading-relaxed mt-2 mb-6">
          Rotate the password for your own account. You'll need to know the
          current one — and from the next sign-in on, the old password stops
          working. The password is separate from the staff access code everyone
          shares.
        </p>

        <form className="space-y-4" onSubmit={submitPassword}>
          <div className="form-field">
            <label htmlFor="set-pass-current">Current password</label>
            <input
              id="set-pass-current"
              type="password"
              autoComplete="current-password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="••••••••••"
            />
          </div>
          <div className="form-field">
            <label htmlFor="set-pass-new">New password</label>
            <input
              id="set-pass-new"
              type="password"
              autoComplete="new-password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder={`${MIN_PASS}–${MAX_PASS} characters`}
            />
          </div>
          <div className="form-field">
            <label htmlFor="set-pass-confirm">Confirm new password</label>
            <input
              id="set-pass-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repeat the new password"
            />
          </div>

          {passError && <p className="text-red-soft text-[13px]">{passError}</p>}

          <button className="btn btn-gold" disabled={passBusy}>
            {Icon({ name: 'shield', size: 15 })}
            {passBusy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* --------------------------- staff accounts (admin) ----------------------- */

function StaffAccounts() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'staff' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api('/api/admin/users');
      setUsers(data.users || []);
    } catch (e) {
      toast(e.message, false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('Fill in a username and a password.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username: form.username.trim(), password: form.password, role: form.role }),
      });
      toast(`Account '${form.username.trim()}' created`);
      setForm({ username: '', password: '', role: 'staff' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete the account '${u.username}'? It can no longer sign in.`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      toast(`Account '${u.username}' deleted`);
      await load();
    } catch (e) {
      toast(e.message, false);
    }
  };

  const setRole = async (u, role) => {
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      toast(`'${u.username}' is now ${role === 'admin' ? 'an administrator' : 'front-desk staff'}`);
      await load();
    } catch (e) {
      toast(e.message, false);
    }
  };

  const resetPassword = async (u) => {
    const next = window.prompt(`New password for '${u.username}' (${MIN_PASS}–${MAX_PASS} characters):`);
    if (next === null) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ password: next }) });
      toast(`Password reset for '${u.username}'`);
    } catch (e) {
      toast(e.message, false);
    }
  };

  return (
    <div className="card p-7 mt-8">
      <h2 className="font-serif text-[18px] text-cream">Staff accounts</h2>
      <p className="text-[13px] text-dim leading-relaxed mt-2 mb-6">
        Each staff member signs in with their own username. Front-desk staff can
        check guests in/out and read the inbox; administrators can do everything,
        including manage accounts and rooms.
      </p>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-dim text-[11px] tracking-wide border-b border-white/10">
              <th className="py-2 pr-3 font-semibold">Username</th>
              <th className="py-2 pr-3 font-semibold">Role</th>
              <th className="py-2 pr-3 font-semibold hidden sm:table-cell">Created</th>
              <th className="py-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0">
                <td className="py-2.5 pr-3 font-semibold text-cream">{u.username}</td>
                <td className="py-2.5 pr-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-gold-400/15 text-gold-300' : 'bg-white/5 text-muted'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-dim hidden sm:table-cell">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  {u.role === 'admin' ? (
                    <button className="btn btn-ghost btn-xs" onClick={() => setRole(u, 'staff')}>
                      Make staff
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-xs" onClick={() => setRole(u, 'admin')}>
                      Make admin
                    </button>
                  )}
                  <button className="btn btn-ghost btn-xs ml-1" title="Reset password" onClick={() => resetPassword(u)}>
                    Reset password
                  </button>
                  <button className="btn btn-ghost btn-xs !text-red-400/90 hover:!bg-red-500/10 ml-1" title="Delete" onClick={() => remove(u)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="space-y-4 border-t border-white/5 pt-5" onSubmit={create}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-field">
            <label htmlFor="new-user-name">Username</label>
            <input
              id="new-user-name"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. maria"
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-user-pass">Password</label>
            <input
              id="new-user-pass"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={`${MIN_PASS}+ characters`}
              autoComplete="new-password"
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-user-role">Role</label>
            <select
              id="new-user-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="staff">Front-desk staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-soft text-[13px]">{error}</p>}

        <button className="btn btn-gold" disabled={busy}>
          {Icon({ name: 'user', size: 15 })}
          {busy ? 'Creating…' : 'Add staff account'}
        </button>
      </form>
    </div>
  );
}
