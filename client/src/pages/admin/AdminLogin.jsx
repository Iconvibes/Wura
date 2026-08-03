import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { toast } from '../../components/Toast.jsx';

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      localStorage.setItem('wura_token', data.token);
      toast(`Welcome back, ${data.user.username}`);
      nav('/admin');
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
          <p className="text-[13px] text-muted mt-1">Wura Grand Hotel · admin / admin123</p>
        </div>
        <form className="card p-7" onSubmit={submit}>
          <div className="form-field mb-4">
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
          <a href="/" className="block text-center text-[12.5px] text-dim hover:text-gold-400 mt-4 transition-colors">
            ← Back to the hotel
          </a>
        </form>
      </div>
    </div>
  );
}
