import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { useWs } from './useWs.js';
import DeviceSettings from './DeviceSettings.jsx';

/** «Активность» из аптайма: 02д:07ч:12м (ТЗ) */
function fmtUptime(sec) {
  if (!sec) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d)}д:${p(h)}ч:${p(m)}м`;
}

/** Страница «Элементы системы» (ТЗ разд. III) */
export default function DevicesPage({ isAdmin, onOpenWizard }) {
  const [tab, setTab] = useState('ENCODER'); // ENCODER | DECODER
  const [devices, setDevices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [checked, setChecked] = useState({}); // id -> bool (галки в нижнем списке)
  const [openId, setOpenId] = useState(null); // устройство с открытыми настройками
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [manualIp, setManualIp] = useState(''); // ручное добавление по IP
  const [searching, setSearching] = useState(false); // идёт поиск устройств по сети
  const [mcast, setMcast] = useState(null);          // режим вещания устройств

  async function load() {
    try {
      const [d, r] = await Promise.all([api('/api/devices'), api('/api/routing')]);
      setDevices(d);
      setRoutes(r);
    } catch (e) {
      setError(e.message);
    }
  }

  const enableMulticast = () => {
    if (!window.confirm('Включить многоадресный режим на всех устройствах? Без него один источник можно вывести только на один экран. Устройства перезагрузятся, это займёт около минуты.')) return;
    return run(async () => {
      const r = await api('/api/devices/multicast', { method: 'POST' });
      if (r.errors && r.errors.length) setError(r.errors.join('; '));
      setMcast(null);
      setTimeout(loadMulticast, 60000); // после перезагрузки устройств
    });
  };
  // проверяем режим вещания: без многоадресного один энкодер обслуживает лишь один экран
  async function loadMulticast() {
    if (!isAdmin) return;
    try { setMcast(await api('/api/devices/multicast')); } catch { /* не критично */ }
  }
  useEffect(() => { load().then(loadMulticast); }, []);
  useWs((type) => {
    if (type === 'devices' || type === 'routing') load();
  });

  const inSystem = devices.filter((d) => d.type === tab && d.inSystem);
  const found = devices.filter((d) => d.type === tab && !d.inSystem);
  const encoders = devices.filter((d) => d.type === 'ENCODER' && d.inSystem);

  /** Получатели энкодера / источник декодера — по маршрутам video */
  function receiversOf(enc) {
    const names = routes
      .filter((r) => r.signal === 'video' && r.encoderId === enc.id)
      .map((r) => devices.find((d) => d.id === r.decoderId)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : 'нет';
  }
  function sourceOf(dec) {
    const r = routes.find((r) => r.signal === 'video' && r.decoderId === dec.id);
    if (!r || r.encoderId == null) return '—';
    return devices.find((d) => d.id === r.encoderId)?.name || '—';
  }

  function run(fn) {
    setBusy(true);
    setError('');
    return (async () => {
      try { await fn(); await load(); }
      catch (e) { setError(e.message); }
      finally { setBusy(false); }
    })();
  }

  const addByIp = () => run(async () => {
    const r = await api('/api/devices/add-by-ip', { method: 'POST', body: { ip: manualIp.trim() } });
    setManualIp('');
    if (!r.added && r.found) setError('Устройство уже есть в списке');
  });

  const addChecked = () => run(async () => {
    for (const id of Object.keys(checked).filter((k) => checked[k])) {
      await api(`/api/devices/${id}/add`, { method: 'POST' });
    }
    setChecked({});
  });

  const openDevice = devices.find((d) => d.id === openId);

  return (
    <div className="devices-page">
      <div className="tabs">
        <button className={'tab' + (tab === 'ENCODER' ? ' active' : '')} onClick={() => setTab('ENCODER')}>
          Энкодеры
        </button>
        <button className={'tab' + (tab === 'DECODER' ? ' active' : '')} onClick={() => setTab('DECODER')}>
          Декодеры
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {mcast && mcast.off > 0 && (
        <div className="help-note">
          <b>Один источник выводится только на один экран.</b> На {mcast.off} из {mcast.total} устройств
          выключен многоадресный режим — в нём энкодер отдаёт поток одному декодеру, и экраны
          перехватывают картинку друг у друга. Для работы «на все декодеры» и видеостен режим нужно включить.
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-primary btn-small" disabled={busy} onClick={enableMulticast}>
              Включить многоадресный режим
            </button>
            <span className="hint"> — устройства перезагрузятся, около минуты</span>
          </div>
        </div>
      )}

      <h3 className="tbl-title">В системе коммутации</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th><th>Имя</th><th>MAC-адрес</th><th>IP-адрес</th><th>Прошивка</th>
              <th>Статус</th><th>Активность</th>
              {tab === 'ENCODER' ? <><th>Линии</th><th>Получатели</th></> : <th>Источник</th>}
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {inSystem.length === 0 && (
              <tr><td colSpan={isAdmin ? 10 : 9} className="empty">Устройства не добавлены</td></tr>
            )}
            {inSystem.map((d) => (
              <tr key={d.id}>
                <td>{d.deviceId}</td>
                <td>{d.name}</td>
                <td className="mono">{d.mac}</td>
                <td className="mono">{d.ip}</td>
                <td>{d.firmware || '—'}</td>
                <td>
                  <span className={'dot ' + (d.online ? 'on' : 'off')} />
                  {d.online ? 'В сети' : 'Не в сети'}
                </td>
                <td className="mono">{fmtUptime(d.uptimeSec)}</td>
                {tab === 'ENCODER' ? (
                  <>
                    <td>{routes.filter((r) => r.signal === 'video' && r.encoderId === d.id).length}</td>
                    <td>{receiversOf(d)}</td>
                  </>
                ) : (
                  <td>{sourceOf(d)}</td>
                )}
                {isAdmin && (
                  <td>
                    <button className="btn btn-small" onClick={() => setOpenId(d.id)}>Настройки</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <>
          <h3 className="tbl-title">Найденные устройства</h3>
          <div className="tbl-wrap tbl-found">
            <table className="tbl">
              <thead>
                <tr><th>Добавить</th><th>ID</th><th>Имя</th><th>IP-адрес</th></tr>
              </thead>
              <tbody>
                {found.length === 0 && (
                  <tr><td colSpan={4} className="empty">Нет новых устройств</td></tr>
                )}
                {found.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!checked[d.id]}
                        onChange={(e) => setChecked({ ...checked, [d.id]: e.target.checked })}
                      />
                    </td>
                    <td>{d.deviceId}</td>
                    <td>{d.name}</td>
                    <td className="mono">{d.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="devices-actions">
            {Object.values(checked).some(Boolean) && (
              <button className="btn btn-primary" disabled={busy} onClick={addChecked}>
                Добавить отмеченные
              </button>
            )}
            <button className="btn" disabled={busy}
              onClick={() => {
                setSearching(true);
                run(() => api('/api/devices/discover', { method: 'POST' }))
                  .finally(() => setSearching(false));
              }}>
              {searching ? 'Идёт поиск…' : 'Поиск новых устройств'}
            </button>
            {searching && (
              <span className="hint">
                Опрашиваем сеть видео LAN — это занимает несколько секунд.
              </span>
            )}
            <button className="btn" disabled={busy} onClick={onOpenWizard}>
              Поиск устройств с помощью проводника
            </button>
            <button className="btn" disabled={busy || found.length === 0}
              onClick={() => run(() => api('/api/devices/add-all', { method: 'POST' }))}>
              Добавить все найденные устройства в систему
            </button>
          </div>

          <div className="devices-actions">
            <input
              className="inline-input"
              placeholder="IP-адрес устройства"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && manualIp) addByIp(); }}
            />
            <button className="btn" disabled={busy || !manualIp} onClick={addByIp}>
              Добавить по IP-адресу
            </button>
            <span className="hint">
              Если автопоиск не находит устройства, укажите адрес любого энкодера или декодера —
              остальные найдутся через него. IP видно на передней панели устройства:
              удерживать кнопку ▲ (CH SELECT) 5 секунд.
            </span>
          </div>
        </>
      )}

      {openDevice && (
        <DeviceSettings
          device={openDevice}
          encoders={encoders}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
