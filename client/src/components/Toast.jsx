import { useEffect, useState } from 'react';
import { I } from './Icons.jsx';

// Global toast rendered at the app root. Any component can call toast().
let show = () => {};

export function ToastHost() {
  const [msg, setMsg] = useState(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    let timer;
    show = (m, isOk = true) => {
      setMsg(m);
      setOk(isOk);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 3200);
    };
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast ${msg ? 'show' : ''}`}>
      {msg && (
        <>
          <span style={{ color: ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)' }}>
            {ok ? I.check({ width: 18, height: 18 }) : I.close({ width: 18, height: 18 })}
          </span>
          <span>{msg}</span>
        </>
      )}
    </div>
  );
}

export function toast(msg, ok = true) {
  show(msg, ok);
}
