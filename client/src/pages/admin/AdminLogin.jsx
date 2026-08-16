import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { toast } from '../../components/Toast.jsx';
import { ADMIN_PATH } from '../../lib/adminPath.js';

export default function AdminLogin() {
  const nav = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="login-wrap">
      <div className="w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950 text-2xl mx-auto shadow-[0_0_40px_rgba(212,175,55,0.45)]">W</div>
          <h1 className="font-serif text-[26px] text-cream mt-4">Staff Portal</h1>
          <p className="text-[13px] text-muted mt-1">Wura Grand Hotel · Authorized staff only</p>
        </div>

        {!codeVerified ? (
          <form className="card p-7" onSubmit={verifyCode}>
            <div className="form-field mb-4">
              <label>Staff access code</label>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="••••••••"
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
          </form>
        ) : (
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
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />
            </div>
            <div className="form-field mb-2">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-red-soft text-[13px] mt-3">{error}</p>}
            <button className="btn btn-gold btn-block mt-5" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
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
