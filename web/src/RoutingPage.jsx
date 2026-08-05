import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { useWs } from './useWs.js';

const TABS = [
  { id: 'video', title: 'Видео' },
  { id: 'audio', title: 'Аудио' },
  { id: 'usb', title: 'USB' },
];

/** Страница «Коммутация» (ТЗ разд. IV, рис.2): классическое коммутационное поле */
export default function RoutingPage() {
  const [tab, setTab] = useState('video');
  const [devices, setDevices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [hover, setHover] = useState(null); // {encId, decId}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [d, r] = await Promise.all([api('/api/devices'), api('/api/routing')]);
      setDevices(d);
      setRoutes(r);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);
  useWs((type) => {
    if (type === 'devices' || type === 'routing') load();
  });

  const encoders = devices.filter((d) => d.type === 'ENCODER' && d.inSystem);
  const decoders = devices.filter((d) => d.type === 'DECODER' && d.inSystem);

  const isActive = (encId, decId) =>
    routes.some((r) => r.signal === tab && r.decoderId === decId && r.encoderId === encId);

  async function toggle(enc, dec) {
    setBusy(true);
    setError('');
    try {
      await api('/api/routing', {
        method: 'POST',
        body: {
          signal: tab,
          decoderId: dec.id,
          // клик по активной точке — разорвать соединение
          encoderId: isActive(enc.id, dec.id) ? null : enc.id,
        },
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toAll(enc) {
    setBusy(true);
    setError('');
    try {
      await api('/api/routing/all-decoders', {
        method: 'POST',
        body: { signal: tab, encoderId: enc.id },
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.title}
          </button>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}
      {tab === 'usb' && <p className="hint">USB — коммутация только точка-точка (ТЗ).</p>}

      {encoders.length === 0 || decoders.length === 0 ? (
        <p className="hint">Добавьте энкодеры и декодеры на странице «Элементы системы».</p>
      ) : (
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th className="corner">
                  <span className="corner-enc">Энкодеры →</span>
                  <span className="corner-dec">Декодеры ↓</span>
                </th>
                {encoders.map((e) => (
                  <th key={e.id} className={'enc-head' + (hover?.encId === e.id ? ' hl' : '')}>
                    <div className="enc-id">TX {String(e.deviceId).padStart(2, '0')}</div>
                    <div className="enc-name">{e.name}</div>
                    {tab !== 'usb' && (
                      <button className="btn btn-tiny" disabled={busy} onClick={() => toAll(e)}>
                        На все декодеры
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decoders.map((d) => (
                <tr key={d.id}>
                  <th className={'dec-head' + (hover?.decId === d.id ? ' hl' : '')}>
                    <div className="enc-id">RX {String(d.deviceId).padStart(2, '0')}</div>
                    <div className="enc-name">{d.name}</div>
                  </th>
                  {encoders.map((e) => {
                    const active = isActive(e.id, d.id);
                    const crossed = hover && (hover.encId === e.id || hover.decId === d.id);
                    return (
                      <td
                        key={e.id}
                        className={'cell' + (crossed ? ' hl' : '')}
                        onMouseEnter={() => setHover({ encId: e.id, decId: d.id })}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => !busy && toggle(e, d)}
                        title={`${e.name} → ${d.name}`}
                      >
                        <span className={'point' + (active ? ' on' : '')} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
