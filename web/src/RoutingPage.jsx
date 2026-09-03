import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { useWs } from './useWs.js';

const TABS = [
  { id: 'video', title: 'Видео' },
  { id: 'audio', title: 'Аудио' },
  { id: 'usb', title: 'USB' },
];

/** Страница «Коммутация» (ТЗ разд. IV, рис.2): классическое коммутационное поле.
 *  Включённая видеостена занимает свои декодеры: они уходят из строк матрицы,
 *  а сама стена появляется строкой-потребителем — источник выбирается для неё целиком. */
export default function RoutingPage() {
  const [tab, setTab] = useState('video');
  const [devices, setDevices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [walls, setWalls] = useState([]);
  const [hover, setHover] = useState(null); // {encId, decId}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [d, r, w] = await Promise.all([api('/api/devices'), api('/api/routing'), api('/api/walls')]);
      setDevices(d);
      setRoutes(r);
      setWalls(w);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);
  useWs((type) => {
    if (type === 'devices' || type === 'routing' || type === 'walls') load();
  });

  const encoders = devices.filter((d) => d.type === 'ENCODER' && d.inSystem);
  const decoders = devices.filter((d) => d.type === 'DECODER' && d.inSystem);

  // видеостены забирают декодеры только в матрице видео
  const activeWalls = tab === 'video' ? walls.filter((w) => w.active) : [];
  const busyIds = new Set(activeWalls.flatMap((w) => w.panels.map((p) => p.decoderId).filter((x) => x != null)));
  const freeDecoders = decoders.filter((d) => !busyIds.has(d.id));
  const wallDecoders = (w) => decoders.filter((d) => w.panels.some((p) => p.decoderId === d.id));

  const isActive = (encId, decId) =>
    routes.some((r) => r.signal === tab && r.decoderId === decId && r.encoderId === encId);

  async function act(fn) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const toggle = (enc, dec) => act(() => api('/api/routing', {
    method: 'POST',
    body: {
      signal: tab,
      decoderId: dec.id,
      // клик по активной точке — разорвать соединение
      encoderId: isActive(enc.id, dec.id) ? null : enc.id,
    },
  }));

  const toAll = (enc) => act(() => api('/api/routing/all-decoders', {
    method: 'POST',
    body: { signal: tab, encoderId: enc.id },
  }));

  // источник на всю стену; клик по активной точке — убрать источник со стены
  const wallSource = (w, enc) => act(() => api(`/api/walls/${w.id}/apply`, {
    method: 'POST',
    body: { encoderId: w.spanEncoderId === enc.id ? null : enc.id },
  }));

  const wallKey = (w) => `wall-${w.id}`;

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
      {activeWalls.map((w) => (
        <p key={w.id} className="hint">
          Декодеры {wallDecoders(w).map((d) => d.name).join(', ') || '—'} заняты видеостеной «{w.name}» —
          источник выбирается для стены целиком (строка «Видеостена» ниже).
          Вернуть их в матрицу: страница «Видео-стена» → «Выключить».
        </p>
      ))}

      {encoders.length === 0 || (freeDecoders.length === 0 && activeWalls.length === 0) ? (
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
              {freeDecoders.map((d) => (
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
              {activeWalls.map((w) => (
                <tr key={wallKey(w)} className="wall-row">
                  <th className={'dec-head wall-head' + (hover?.decId === wallKey(w) ? ' hl' : '')}>
                    <div className="enc-id">ВИДЕОСТЕНА {w.wallId}</div>
                    <div className="enc-name">{w.name} ({w.rows}×{w.cols})</div>
                    <div className="wall-decs">{wallDecoders(w).map((d) => d.name).join(', ')}</div>
                  </th>
                  {encoders.map((e) => {
                    const active = w.spanEncoderId === e.id;
                    const crossed = hover && (hover.encId === e.id || hover.decId === wallKey(w));
                    return (
                      <td
                        key={e.id}
                        className={'cell' + (crossed ? ' hl' : '')}
                        onMouseEnter={() => setHover({ encId: e.id, decId: wallKey(w) })}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => !busy && wallSource(w, e)}
                        title={`${e.name} → на всю стену «${w.name}»`}
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
