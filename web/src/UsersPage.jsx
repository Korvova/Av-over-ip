import React, { useEffect, useState } from 'react';
import { api } from './api.js';

/** Страница «Пользователи» (ТЗ разд. VI): пароли + все пользовательские пресеты */
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [presets, setPresets] = useState([]);
  const [pass, setPass] = useState({}); // userId -> новый пароль
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const [u, p] = await Promise.all([api('/api/users'), api('/api/users/all-presets')]);
      setUsers(u);
      setPresets(p);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function setPassword(u) {
    setError('');
    setNotice('');
    try {
      await api(`/api/users/${u.id}/password`, { method: 'POST', body: { password: pass[u.id] } });
      setNotice(`Пароль для «${u.displayName}» установлен`);
      setPass({ ...pass, [u.id]: '' });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-ok">{notice}</div>}

      <h3 className="tbl-title">Пользователи и входные пароли</h3>
      <div className="tbl-wrap" style={{ maxWidth: 640 }}>
        <table className="tbl">
          <thead>
            <tr><th>Пользователь</th><th>Логин</th><th>Уровень</th><th>Новый пароль</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td className="mono">{u.login}</td>
                <td>{u.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}</td>
                <td>
                  <input
                    className="inline-input"
                    type="password"
                    value={pass[u.id] || ''}
                    onChange={(e) => setPass({ ...pass, [u.id]: e.target.value })}
                    placeholder="мин. 4 символа"
                  />
                </td>
                <td>
                  <button className="btn btn-small" disabled={(pass[u.id] || '').length < 4}
                    onClick={() => setPassword(u)}>
                    Установить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="tbl-title">Пользовательские пресеты</h3>
      <div className="tbl-wrap" style={{ maxWidth: 640 }}>
        <table className="tbl">
          <thead>
            <tr><th>Пользователь</th><th>Пресет</th><th>Маршрутов</th></tr>
          </thead>
          <tbody>
            {presets.length === 0 && <tr><td colSpan={3} className="empty">Пресетов нет</td></tr>}
            {presets.map((p) => (
              <tr key={p.id}>
                <td>{p.user.displayName}</td>
                <td>{p.name}</td>
                <td>{(p.routes || []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
