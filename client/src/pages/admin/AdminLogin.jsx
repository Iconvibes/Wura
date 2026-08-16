import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.jsx';
import { toast } from '../../components/Toast.jsx';
import { ADMIN_PATH } from '../../lib/adminPath.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.jsx';

export default function AdminLogin() {
  // No preload arg → the stale home-hero <link rel=preload> is removed and the
  // tab shows a proper staff title (server also strips it on direct loads).
  usePageMeta('Staff Login — Wura Grand Hotel', 'Authorized staff access to the Wura Grand Hotel staff portal.');
  const nav = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [resetSecret, setResetSecret] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');

  const verifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/verify-code', {
        method: 'POST',
        body: JSON.stringify({ access_code: accessCode.trim() }),
      });
      setCodeVerified(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          access_code: accessCode.trim(),
        }),
      });
      localStorage.setItem('wura_token', data.token);
      toast(`Welcome back, ${data.user.username}`);
      nav(ADMIN_PATH);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Lockout recovery — rotates the access code with the deploy-level secret
  // (ADMIN_RESET_SECRET) so staff aren't locked out if the code is forgotten.
  const recover = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetSecret.trim() || !newCode.trim() || !confirmCode.trim()) {
      setError('Fill in all three fields.');
      return;
    }
    if (newCode.length < 6 || newCode.length > 64) {
      setError('The new code must be between 6 and 64 characters.');
      return;
    }
    if (newCode !== confirmCode) {
      setError('The new code and its confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/admin/recover-access-code', {
        method: 'POST',
        body: JSON.stringify({ reset_secret: resetSecret.trim(), code: newCode.trim() }),
      });
      toast('Access code reset — sign in with the new code');
      setRecovering(false);
      setResetSecret('');
      setNewCode('');
      setConfirmCode('');
      setAccessCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950 text-2xl mx-auto shadow-[0_0_40px_rgba(212,175,55,0.45)]">W</div>
          <h1 className="font-serif text-[26px] text-cream mt-4">Staff Portal</h1>
          <p className="text-[13px] text-muted mt-1">Wura Grand Hotel · Authorized staff only</p>
        </div>

        {!codeVerified && !recovering ? (
          <form className="card p-7" onSubmit={verifyCode}>
            <div className="form-field mb-4">
              <label htmlFor="al-code">Staff access code</label>
              <input
                id="al-code"
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
                autoFocus
              />
            </div>
            <p className="text-[12.5px] text-dim leading-relaxed mb-5">
              This area is reserved for hotel staff. Enter the staff access code to continue.
            </p>
            {error && <p className="text-red-soft text-[13px] mt-3">{error}</p>}
            <button className="btn btn-gold btn-block mt-5" disabled={busy || !accessCode.trim()}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-[12.5px] text-dim hover:text-gold-400 transition-colors"
                onClick={() => { setRecovering(true); setError(''); }}
              >
                Forgot the access code?
              </button>
            </div>
          </form>
        ) : codeVerified ? (
          <form className="card p-7" onSubmit={submit}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12.5px] text-green-soft flex items-center gap-1.5">
                ✓ Access code accepted
              </span>
              <button
                type="button"
                className="text-[12px] text-dim hover:text-gold-400 transition-colors"
                onClick={() => setCodeVerified(false)}
              >
                Change
              </button>
            </div>
            <div className="form-field mb-2">
              <label htmlFor="al-user">Username</label>
              <input id="al-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />
            </div>
            <div className="form-field mb-2">
              <label htmlFor="al-pass">Password</label>
              <input id="al-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-red-soft text-[13px] mt-3">{error}</p>}
            <button className="btn btn-gold btn-block mt-5" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="card p-7" onSubmit={recover}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-[17px] text-cream">Recover access</h2>
              <button
                type="button"
                className="text-[12px] text-dim hover:text-gold-400 transition-colors"
                onClick={() => { setRecovering(false); setError(''); }}
              >
                Back to sign in
              </button>
            </div>
            <p className="text-[12.5px] text-dim leading-relaxed mb-5">
              Enter the recovery secret configured for this server to set a new
              staff access code — you won't need the current one.
            </p>
            <div className="form-field mb-3">
              <label htmlFor="al-secret">Recovery secret</label>
              <input
                id="al-secret"
                type="password"
                autoComplete="off"
                value={resetSecret}
                onChange={(e) => setResetSecret(e.target.value)}
                placeholder="••••••••••••••••"
                autoFocus
              />
            </div>
            <div className="form-field mb-3">
              <label htmlFor="al-newcode">New access code</label>
              <input
                id="al-newcode"
                type="password"
                autoComplete="new-password"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="6–64 characters"
              />
            </div>
            <div className="form-field mb-3">
              <label htmlFor="al-newcode2">Confirm new access code</label>
              <input
                id="al-newcode2"
                type="password"
                autoComplete="new-password"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Repeat the new code"
              />
            </div>
            {error && <p className="text-red-soft text-[13px] mt-3">{error}</p>}
            <button className="btn btn-gold btn-block mt-5" disabled={busy}>
              {busy ? 'Recovering…' : 'Set new access code'}
            </button>
          </form>
        )}

        {/* Private footer — the Staff link lives only here (never on the public
            site), favicon-branded as a quiet staff entry point. */}
        <div className="mt-6 text-center space-y-2">
          <Link
            to={ADMIN_PATH}
            className="inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-gold-400 transition-colors"
          >
            <img
              src="/favicon.svg"
              alt=""
              aria-hidden="true"
              className="w-4 h-4 rounded-[4px] ring-1 ring-white/10"
            />
            Staff
          </Link>
          <a href="/" className="block text-[12.5px] text-dim hover:text-gold-400 transition-colors">
            ← Back to the hotel
          </a>
        </div>
      </div>
    </div>
  );
}
