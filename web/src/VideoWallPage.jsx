import React, { useEffect, useState } from 'react';
import { api, getToken } from './api.js';
import { useWs } from './useWs.js';

/** Страница «Видео-стена» (ТЗ разд. V, рис.3) */
export default function VideoWallPage({ isAdmin }) {
  const [tab, setTab] = useState('list'); // list | sources
  const [walls, setWalls] = useState([]);
  const [devices, setDevices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [bezelWall, setBezelWall] = useState(null); // стена для окна «Компенсация рамок»
  const [firstVisit, setFirstVisit] = useState(true);

  async function load() {
    try {
      const [w, d, r] = await Promise.all([
        api('/api/walls'),
        api('/api/devices'),
        api('/api/routing'),
      ]);
      setWalls(w);
      setDevices(d);
      setRoutes(r);
      return w;
    } catch (e) {
      setError(e.message);
      return [];
    }
  }
  useEffect(() => {
    load().then((w) => {
      // ТЗ: при первом входе на страницу — всплывающее окно создания видеостены
      if (firstVisit && w.length === 0 && isAdmin) setShowCreate(true);
      setFirstVisit(false);
    });
  }, []);
  useWs((type) => {
    if (type === 'walls' || type === 'devices' || type === 'routing') load();
  });

  const encoders = devices.filter((d) => d.type === 'ENCODER' && d.inSystem);
  const decoders = devices.filter((d) => d.type === 'DECODER' && d.inSystem);

  async function run(fn, okMsg) {
    setError('');
    setNotice('');
    try {
      await fn();
      if (okMsg) setNotice(okMsg);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="tabs">
        <button className={'tab' + (tab === 'list' ? ' active' : '')} onClick={() => setTab('list')}>
          Список видеостен
        </button>
        <button className={'tab' + (tab === 'sources' ? ' active' : '')} onClick={() => setTab('sources')}>
          Источники для видеостен
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-ok">{notice}</div>}

      {tab === 'list' ? (
        <WallList
          walls={walls} encoders={encoders} decoders={decoders} isAdmin={isAdmin}
          onCreate={() => setShowCreate(true)}
          onBezel={(w) => setBezelWall(w)}
          run={run}
        />
      ) : (
        <WallSources walls={walls} encoders={encoders} decoders={decoders} routes={routes} run={run} />
      )}

      {showCreate && (
        <CreateWallDialog
          walls={walls}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
      {bezelWall && (
        <BezelDialog wall={bezelWall} onClose={() => setBezelWall(null)} run={run} />
      )}
    </div>
  );
}

/* ---------- Вкладка «Список видеостен» ---------- */
function WallList({ walls, encoders, decoders, isAdmin, onCreate, onBezel, run }) {
  const [selected, setSelected] = useState(null);
  const wall = walls.find((w) => w.id === selected) || walls[0];
  const [presetName, setPresetName] = useState('');
  const [presetEnc, setPresetEnc] = useState('');

  return (
    <>
      <h3 className="tbl-title">Список видеостен (максимум 9)</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>ID</th><th>Имя видеостены</th><th>Строки</th><th>Столбцы</th><th>Мониторинг</th>{isAdmin && <th></th>}</tr>
          </thead>
          <tbody>
            {walls.length === 0 && <tr><td colSpan={6} className="empty">Видеостены не созданы</td></tr>}
            {walls.map((w) => (
              <tr key={w.id}
                className={wall && wall.id === w.id ? 'row-selected' : ''}
                onClick={() => setSelected(w.id)}>
                <td>{w.wallId}</td>
                <td>{w.name}</td>
                <td>{w.rows}</td>
                <td>{w.cols}</td>
                <td>
                  {isAdmin ? (
                    <button className="btn btn-tiny"
                      onClick={(e) => { e.stopPropagation();
                        run(() => api(`/api/walls/${w.id}`, { method: 'PATCH', body: { monitoring: !w.monitoring } })); }}>
                      {w.monitoring ? 'Вкл.' : 'Выкл.'}
                    </button>
                  ) : (w.monitoring ? 'Вкл.' : 'Выкл.')}
                </td>
                {isAdmin && (
                  <td>
                    <button className="btn btn-small btn-danger"
                      onClick={(e) => { e.stopPropagation();
                        if (window.confirm(`Удалить видеостену «${w.name}»?`))
                          run(() => api(`/api/walls/${w.id}`, { method: 'DELETE' })); }}>
                      Удалить
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <div className="devices-actions">
          <button className="btn btn-primary" onClick={onCreate}>Добавить видеостену</button>
          {wall && <button className="btn" onClick={() => onBezel(wall)}>Компенсация рамок</button>}
        </div>
      )}

      {wall && (
        <>
          <h3 className="tbl-title">Привязка декодеров: {wall.name} ({wall.rows}×{wall.cols})</h3>
          <div className="wall-grid" style={{ gridTemplateColumns: `repeat(${wall.cols}, 1fr)` }}>
            {[...wall.panels].sort((a, b) => a.row - b.row || a.col - b.col).map((p) => (
              <div key={p.id} className="wall-panel-cfg">
                <div className="panel-pos">R{p.row + 1}C{p.col + 1}</div>
                {isAdmin ? (
                  <select
                    value={p.decoderId ?? ''}
                    onChange={(e) => run(() => api(`/api/walls/${wall.id}/panel`, {
                      method: 'POST',
                      body: { row: p.row, col: p.col, decoderId: e.target.value === '' ? null : Number(e.target.value) },
                    }))}
                  >
                    <option value="">— нет —</option>
                    {decoders.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                ) : (
                  <div>{decoders.find((d) => d.id === p.decoderId)?.name || '—'}</div>
                )}
              </div>
            ))}
          </div>

          <h3 className="tbl-title">Пресеты видеостен</h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Имя видеостены</th><th>Имя пресета</th><th>Класс</th><th>Источник</th><th></th></tr>
              </thead>
              <tbody>
                {walls.flatMap((w) => w.presets.map((pr) => (
                  <tr key={pr.id}>
                    <td>{w.name}</td>
                    <td>{pr.name}</td>
                    <td>{pr.class}</td>
                    <td>{encoders.find((e) => e.id === pr.layout?.encoderId)?.name || '—'}</td>
                    <td>
                      <button className="btn btn-tiny"
                        onClick={() => run(() => api(`/api/walls/presets/${pr.id}/apply`, { method: 'POST' }), 'Пресет применён')}>
                        Вызвать
                      </button>{' '}
                      <button className="btn btn-tiny"
                        onClick={() => run(() => api(`/api/walls/presets/${pr.id}`, { method: 'DELETE' }))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                )))}
                {walls.every((w) => w.presets.length === 0) && (
                  <tr><td colSpan={5} className="empty">Пресетов нет</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="devices-actions">
            <input className="inline-input" placeholder="Имя пресета"
              value={presetName} onChange={(e) => setPresetName(e.target.value)} />
            <select className="inline-input" value={presetEnc} onChange={(e) => setPresetEnc(e.target.value)}>
              <option value="">Источник…</option>
              {encoders.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button className="btn btn-primary" disabled={!presetName || !presetEnc}
              onClick={() => run(() => api(`/api/walls/${wall.id}/presets`, {
                method: 'POST',
                body: { name: presetName, class: 'A', encoderId: Number(presetEnc) },
              }), 'Пресет сохранён')}>
              Сохранить пресет
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- Вкладка «Источники для видеостен» (рис.3) ---------- */
function WallSources({ walls, encoders, decoders, routes, run }) {
  const [dragEnc, setDragEnc] = useState(null);
  const [overWall, setOverWall] = useState(null);
  const [overPanel, setOverPanel] = useState(null); // id панели под курсором
  const [menu, setMenu] = useState(null); // {x, y, wallId, row, col} — правый клик по панели
  const token = getToken();

  const snap = (encId) => `/api/preview/${encId}/snapshot?token=${token}&t=${Math.floor(Date.now() / 5000)}`;

  /** Какой энкодер подан на декодер панели (маршрут video) */
  function panelEncoder(p) {
    if (p.decoderId == null) return null;
    const r = routes.find((r) => r.signal === 'video' && r.decoderId === p.decoderId);
    if (!r || r.encoderId == null) return null;
    return encoders.find((e) => e.id === r.encoderId) || null;
  }

  return (
    <div className="sources-layout">
      <div className="sources-col">
        <h3 className="tbl-title">Источники</h3>
        {encoders.map((e) => (
          <div
            key={e.id}
            className="source-card"
            draggable
            onDragStart={() => setDragEnc(e.id)}
            onDragEnd={() => { setDragEnc(null); setOverWall(null); setOverPanel(null); }}
          >
            <img src={snap(e.id)} alt="" />
            <div className="source-name">{e.name}</div>
          </div>
        ))}
        {encoders.length === 0 && <p className="hint">Нет энкодеров в системе.</p>}
        <p className="hint">
          Перетащите источник в окно видеостены — картинка растянется на всю стену,
          каждая панель покажет свою часть (рис.3 ТЗ). Правый клик по панели —
          подать источник целиком только на неё или убрать.
        </p>
      </div>

      <div className="walls-col">
        <h3 className="tbl-title">Видеостены</h3>
        {walls.map((w) => (
          <div key={w.id} className="wall-drop">
            <div
              className={'wall-drop-name' + (overWall === w.id ? ' over' : '')}
              onDragOver={(e) => { e.preventDefault(); setOverWall(w.id); }}
              onDragLeave={() => setOverWall(null)}
              onDrop={() => {
                if (dragEnc != null) {
                  run(() => api(`/api/walls/${w.id}/apply`, { method: 'POST', body: { encoderId: dragEnc } }),
                    `Источник растянут на всю стену «${w.name}»`);
                }
                setOverWall(null);
              }}
            >
              {w.name} ({w.rows}×{w.cols}) — сюда: на всю стену
            </div>
            <div className="wall-grid" style={{ gridTemplateColumns: `repeat(${w.cols}, 1fr)` }}>
              {[...w.panels].sort((a, b) => a.row - b.row || a.col - b.col).map((p) => {
                const enc = panelEncoder(p);
                const dec = decoders.find((d) => d.id === p.decoderId);
                const isSpan = enc && w.spanEncoderId === enc.id;
                const style = {};
                if (enc && isSpan) {
                  // панель показывает свой вырез из общего кадра
                  style.backgroundImage = `url(${snap(enc.id)})`;
                  style.backgroundSize = `${w.cols * 100}% ${w.rows * 100}%`;
                  style.backgroundPosition = `${w.cols > 1 ? (p.col / (w.cols - 1)) * 100 : 0}% ${w.rows > 1 ? (p.row / (w.rows - 1)) * 100 : 0}%`;
                } else if (enc) {
                  style.backgroundImage = `url(${snap(enc.id)})`;
                  style.backgroundSize = 'cover';
                  style.backgroundPosition = 'center';
                }
                return (
                  <div
                    key={p.id}
                    className={
                      'wall-cell' +
                      (p.decoderId ? '' : ' unbound') +
                      (overPanel === p.id ? ' over' : '')
                    }
                    style={style}
                    onDragOver={(e) => {
                      if (p.decoderId != null && dragEnc != null) {
                        e.preventDefault();
                        e.stopPropagation();
                        setOverPanel(p.id);
                      }
                    }}
                    onDragLeave={() => setOverPanel(null)}
                    onDrop={(e) => {
                      e.stopPropagation();
                      // ТЗ, рис.3: перетаскивание в окно стены = источник на ВСЮ стену
                      if (dragEnc != null) {
                        run(() => api(`/api/walls/${w.id}/apply`, {
                          method: 'POST',
                          body: { encoderId: dragEnc },
                        }), `Источник растянут на стену «${w.name}»`);
                      }
                      setOverPanel(null);
                    }}
                    onContextMenu={(e) => {
                      if (p.decoderId == null) return;
                      e.preventDefault();
                      setMenu({ x: e.clientX, y: e.clientY, wallId: w.id, row: p.row, col: p.col });
                    }}
                  >
                    {enc && (
                      <span className="wall-cell-badge">
                        {enc.name}{isSpan ? ' (стена)' : ''}
                      </span>
                    )}
                    <span className="wall-cell-dec">{dec ? dec.name : 'нет декодера'}</span>
                    {enc && (
                      <button
                        className="wall-cell-x"
                        title="Убрать источник с панели"
                        onClick={() => run(() => api(`/api/walls/${w.id}/panel-source`, {
                          method: 'POST',
                          body: { row: p.row, col: p.col, encoderId: null },
                        }), 'Источник убран с панели')}
                      >✕</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {walls.length === 0 && <p className="hint">Создайте видеостену на вкладке «Список видеостен».</p>}
      </div>

      {menu && (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onMouseLeave={() => setMenu(null)}>
          <div className="ctx-title">Целиком на эту панель:</div>
          {encoders.map((e) => (
            <div key={e.id} className="ctx-item"
              onClick={() => {
                run(() => api(`/api/walls/${menu.wallId}/panel-source`, {
                  method: 'POST',
                  body: { row: menu.row, col: menu.col, encoderId: e.id },
                }), `${e.name} — целиком на панель`);
                setMenu(null);
              }}>
              {e.name}
            </div>
          ))}
          <div className="ctx-item ctx-off"
            onClick={() => {
              run(() => api(`/api/walls/${menu.wallId}/panel-source`, {
                method: 'POST',
                body: { row: menu.row, col: menu.col, encoderId: null },
              }), 'Источник убран с панели');
              setMenu(null);
            }}>
            Убрать источник
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Окно «Создание новой видеостены» (ТЗ) ---------- */
function CreateWallDialog({ walls, onClose, onCreated }) {
  const usedIds = walls.map((w) => w.wallId);
  const freeIds = Array.from({ length: 9 }, (_, i) => i + 1).filter((n) => !usedIds.includes(n));
  const [wallId, setWallId] = useState(freeIds[0] || 1);
  const [name, setName] = useState('');
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [error, setError] = useState('');

  const limits = [1, 2, 3, 4, 5, 6, 7, 8]; // «выбор, ограниченный системой»

  async function create() {
    setError('');
    try {
      await api('/api/walls', { method: 'POST', body: { wallId, name, rows, cols } });
      onCreated();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Создание новой видеостены</h2>
        <label>ID видеостены
          <select value={wallId} onChange={(e) => setWallId(Number(e.target.value))}>
            {freeIds.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Имя видеостены
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Переговорная 1" autoFocus />
        </label>
        <label>Кол-во столбцов
          <select value={cols} onChange={(e) => setCols(Number(e.target.value))}>
            {limits.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Кол-во строк
          <select value={rows} onChange={(e) => setRows(Number(e.target.value))}>
            {limits.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Закрыть</button>
          <button className="btn btn-primary" disabled={!name || freeIds.length === 0} onClick={create}>Далее</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Окно «Компенсация рамок» (ТЗ) ---------- */
function BezelDialog({ wall, onClose, run }) {
  const b = wall.bezel || {};
  const [ow, setOw] = useState(b.ow ?? 600);
  const [vw, setVw] = useState(b.vw ?? 596);
  const [oh, setOh] = useState(b.oh ?? 340);
  const [vh, setVh] = useState(b.vh ?? 336);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Компенсация рамок — {wall.name}</h2>
        <p className="hint">
          Размеры панели в мм: внешние (с рамкой) и видимые (экран).
          Компенсация рассчитывается автоматически при подаче источника на стену.
        </p>
        <div className="range-row"><span>Внешняя ширина (OW)</span>
          <input type="number" value={ow} onChange={(e) => setOw(Number(e.target.value))} /><span>мм</span><span /></div>
        <div className="range-row"><span>Видимая ширина (VW)</span>
          <input type="number" value={vw} onChange={(e) => setVw(Number(e.target.value))} /><span>мм</span><span /></div>
        <div className="range-row"><span>Внешняя высота (OH)</span>
          <input type="number" value={oh} onChange={(e) => setOh(Number(e.target.value))} /><span>мм</span><span /></div>
        <div className="range-row"><span>Видимая высота (VH)</span>
          <input type="number" value={vh} onChange={(e) => setVh(Number(e.target.value))} /><span>мм</span><span /></div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Закрыть</button>
          <button className="btn btn-primary"
            onClick={() => { run(() => api(`/api/walls/${wall.id}`, {
              method: 'PATCH', body: { bezel: { ow, vw, oh, vh } },
            }), 'Компенсация рамок сохранена'); onClose(); }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
