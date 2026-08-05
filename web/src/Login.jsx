import React, { useState } from 'react';
import { api, setToken } from './api.js';

/** Страница входа (ТЗ п. II.1): логин определяет уровень полномочий */
export default function Login({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { login, password } });
      setToken(data.token);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <img className="login-logo" src="/rms-logo.png" alt="RMS" />
      <form className="login-card" onSubmit={submit}>
        <h1>Платформа управления</h1>
        <p className="login-sub">Russian Multimedia Systems · AV-over-IP</p>
        <label>
          Логин
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" disabled={busy || !login}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
