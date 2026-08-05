import React, { useEffect, useRef, useState } from 'react';
import { api, getToken } from './api.js';
import { useWs } from './useWs.js';

/**
 * Страница «Интерфейс пользователя» (ТЗ разд. I, рис.1).
 * Просмотр: листы с карточками Источников/Потребителей, drag&drop коммутация,
 * контекстное меню по правому клику, кнопки пресетов.
 * Редактор (только Админ): листы, размещение карточек, подписи, раскладка per-пользователь.
 */
export default function UiPage({ auth }) {
  const isAdmin = auth.user.role === 'ADMIN';
  const [devices, setDevices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [pages, setPages] = useState([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [presets, setPresets] = useState([]);
  const [edit, setEdit] = useState(false);
  const [editUserId, setEditUserId] = useState(auth.user.id);
  const [users, setUsers] = useState([]);
  const [menu, setMenu] = useState(null); // {x, y, decoderId}
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const token = getToken();

  async function load() {
    try {
      const [d, r, p] = await Promise.all([
        api('/api/devices'),
        api('/api/routing'),
        api('/api/users/presets'),
      ]);
      setDevices(d);
      setRoutes(r);
      setPresets(p);
    } catch (e) {
      setError(e.message);
    }
  }
  async function loadLayout() {
    try {
      setPages(await api('/api/users/ui-layout'));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    loadLayout();
    if (isAdmin) api('/api/users').then(setUsers).catch(() => {});
  }, []);
  useWs((type) => {
    if (type === 'devices' || type === 'routing') load();
  });

  const encoders = devices.filter((d) => d.type === 'ENCODER' && d.inSystem);
  const decoders = devices.filter((d) => d.type === 'DECODER' && d.inSystem);
  const page = pages[pageIdx];

  function sourceOf(decId) {
    const r = routes.find((r) => r.signal === 'video' && r.decoderId === decId);
    if (!r || r.encoderId == null) return null;
    return devices.find((d) => d.id === r.encoderId) || null;
  }

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

  const routeVideo = (decoderId, encoderId) =>
    run(() => api('/api/routing', { method: 'POST', body: { signal: 'video', decoderId, encoderId } }));

  /* ---------- пресеты (Preset 1..4, рис.1) ---------- */
  async function applyPreset(preset) {
    await run(async () => {
      for (const r of preset.routes) {
        await api('/api/routing', { method: 'POST', body: r });
      }
    }, `Пресет «${preset.name}» применён`);
  }
  async function savePreset(n) {
    const name = `Пресет ${n}`;
    const existing = presets.find((p) => p.name === name);
    await run(async () => {
      if (existing) await api(`/api/users/presets/${existing.id}`, { method: 'DELETE' });
      const snapshot = routes
        .filter((r) => r.signal === 'video')
        .map((r) => ({ signal: 'video', decoderId: r.decoderId, encoderId: r.encoderId }));
      await api('/api/users/presets', { method: 'POST', body: { name, routes: snapshot } });
      setPresets(await api('/api/users/presets'));
    }, `Текущая коммутация сохранена в «${name}»`);
  }

  /* ---------- редактор раскладки ---------- */
  function mutatePages(fn) {
    const next = structuredClone(pages);
    fn(next);
    setPages(next);
  }
  async function saveLayout() {
    await run(() => api(`/api/users/ui-layout?userId=${editUserId}`, {
      method: 'PUT',
      body: { pages },
    }), 'Раскладка сохранена');
  }
  async function loadLayoutOf(userId) {
    setEditUserId(userId);
    // редактор всегда правит раскладку выбранного пользователя — подгружаем её от его имени нельзя,
    // поэтому раскладки других пользователей админ строит с чистого листа или копирует свою
    if (userId === auth.user.id) await loadLayout();
  }

  return (
    <div className="ui-page" onClick={() => setMenu(null)}>
      <div className="ui-toolbar">
        <div className="ui-tabs">
          {pages.map((p, i) => (
            <button key={i} className={'ui-tab' + (i === pageIdx ? ' active' : '')} onClick={() => setPageIdx(i)}>
              {p.title}
            </button>
          ))}
          {edit && (
            <button className="btn btn-tiny" onClick={() => mutatePages((ps) => {
              ps.push({ title: `Лист ${ps.length + 1}`, cards: [] });
              setPageIdx(ps.length - 1);
            })}>+ Лист</button>
          )}
        </div>
        <div className="ui-presets">
          {[1, 2, 3, 4].map((n) => {
            const p = presets.find((x) => x.name === `Пресет ${n}`);
            return (
              <button
                key={n}
                className={'preset-btn' + (p ? '' : ' empty')}
                title={p ? 'Клик — вызвать; правый клик — перезаписать текущей коммутацией' : 'Правый клик — сохранить текущую коммутацию'}
                onClick={() => p && applyPreset(p)}
                onContextMenu={(e) => { e.preventDefault(); savePreset(n); }}
              >
                Preset {n}
              </button>
            );
          })}
        </div>
        {isAdmin && (
          <div className="ui-editbar">
            {edit && (
              <>
                <select className="inline-input" value={editUserId}
                  onChange={(e) => loadLayoutOf(Number(e.target.value))}>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                </select>
                <button className="btn btn-small btn-primary" onClick={saveLayout}>Сохранить раскладку</button>
              </>
            )}
            <button className="btn btn-small" onClick={() => setEdit(!edit)}>
              {edit ? 'Готово' : 'Редактор'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-ok">{notice}</div>}

      {!page && (
        <p className="hint">
          {isAdmin
            ? 'Листов пока нет — включите «Редактор» и добавьте лист, затем карточки источников и потребителей.'
            : 'Интерфейс ещё не настроен Администратором.'}
        </p>
      )}

      {page && (
        <Canvas
          page={page}
          edit={edit}
          devices={devices}
          encoders={encoders}
          decoders={decoders}
          token={token}
          sourceOf={sourceOf}
          onRoute={routeVideo}
          onMenu={(x, y, decoderId) => setMenu({ x, y, decoderId })}
          onMutate={(fn) => mutatePages((ps) => fn(ps[pageIdx]))}
        />
      )}

      {menu && (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }}>
          {encoders.map((e) => (
            <div key={e.id} className="ctx-item"
              onClick={() => { routeVideo(menu.decoderId, e.id); setMenu(null); }}>
              {e.name}
            </div>
          ))}
          <div className="ctx-item ctx-off" onClick={() => { routeVideo(menu.decoderId, null); setMenu(null); }}>
            Отключить источник
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Холст с карточками ---------- */
function Canvas({ page, edit, devices, encoders, decoders, token, sourceOf, onRoute, onMenu, onMutate }) {
  const ref = useRef(null);
  const [dragCard, setDragCard] = useState(null);   // перемещение в редакторе
  const [resizeCard, setResizeCard] = useState(null); // изменение размера в редакторе
  const [dragSrc, setDragSrc] = useState(null);     // drag источника на потребителя (просмотр)
  const [overCard, setOverCard] = useState(null);
  const [addKind, setAddKind] = useState('source');
  const [addDev, setAddDev] = useState('');

  const CARD_MIN = 110;
  const CARD_MAX = 360;

  function cardDevice(c) {
    return devices.find((d) => d.id === c.deviceId);
  }

  /* перемещение карточки в редакторе */
  function onPointerDown(e, idx) {
    if (!edit) return;
    const rect = ref.current.getBoundingClientRect();
    const card = page.cards[idx];
    setDragCard({ idx, dx: e.clientX - rect.left - card.x, dy: e.clientY - rect.top - card.y });
  }
  /* начало изменения размера (уголок карточки) */
  function onResizeStart(e, idx) {
    e.stopPropagation();
    setResizeCard({ idx, startX: e.clientX, startW: page.cards[idx].w || 150 });
  }
  function onPointerMove(e) {
    if (resizeCard) {
      onMutate((p) => {
        const c = p.cards[resizeCard.idx];
        c.w = Math.max(CARD_MIN, Math.min(CARD_MAX, resizeCard.startW + e.clientX - resizeCard.startX));
      });
      return;
    }
    if (!dragCard) return;
    const rect = ref.current.getBoundingClientRect();
    onMutate((p) => {
      const c = p.cards[dragCard.idx];
      c.x = Math.max(0, Math.min(rect.width - (c.w || 150), e.clientX - rect.left - dragCard.dx));
      c.y = Math.max(0, Math.min(rect.height - 60, e.clientY - rect.top - dragCard.dy));
    });
  }

  return (
    <>
      {edit && (
        <div className="ui-addbar">
          <select className="inline-input" value={addKind} onChange={(e) => { setAddKind(e.target.value); setAddDev(''); }}>
            <option value="source">Источник</option>
            <option value="consumer">Потребитель</option>
          </select>
          <select className="inline-input" value={addDev} onChange={(e) => setAddDev(e.target.value)}>
            <option value="">Устройство…</option>
            {(addKind === 'source' ? encoders : decoders).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button className="btn btn-small" disabled={!addDev}
            onClick={() => onMutate((p) => p.cards.push({
              id: Date.now(),
              kind: addKind,
              deviceId: Number(addDev),
              label: '',
              x: 20 + (p.cards.length % 5) * 160,
              y: 20 + Math.floor(p.cards.length / 5) * 110,
            }))}>
            Добавить карточку
          </button>
          <input className="inline-input" placeholder="Название листа" value={page.title}
            onChange={(e) => onMutate((p) => { p.title = e.target.value; })} />
        </div>
      )}

      <div
        className={'ui-canvas' + (edit ? ' editing' : '')}
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerUp={() => { setDragCard(null); setResizeCard(null); }}
      >
        {page.cards.map((c, idx) => {
          const dev = cardDevice(c);
          if (!dev) return null;
          const isSource = c.kind === 'source';
          const src = !isSource ? sourceOf(dev.id) : null;
          return (
            <div
              key={c.id}
              className={
                'ui-card ' + (isSource ? 'card-source' : 'card-consumer') +
                (overCard === c.id ? ' drop-over' : '')
              }
              style={{ left: c.x, top: c.y, width: c.w || 150 }}
              draggable={!edit && isSource}
              onDragStart={() => setDragSrc(dev.id)}
              onDragEnd={() => { setDragSrc(null); setOverCard(null); }}
              onDragOver={(e) => {
                if (!isSource && dragSrc != null) { e.preventDefault(); setOverCard(c.id); }
              }}
              onDragLeave={() => setOverCard(null)}
              onDrop={() => {
                if (!isSource && dragSrc != null) onRoute(dev.id, dragSrc);
                setOverCard(null);
              }}
              onContextMenu={(e) => {
                if (!isSource && !edit) { e.preventDefault(); e.stopPropagation(); onMenu(e.clientX, e.clientY, dev.id); }
              }}
              onPointerDown={(e) => onPointerDown(e, idx)}
            >
              {isSource && <span className="card-tx">TX{dev.deviceId}</span>}
              <img
                className="card-img"
                style={{ height: Math.round((c.w || 150) * 0.48) }}
                src={`/api/preview/${dev.id}/snapshot?token=${token}`}
                alt=""
                draggable={false}
              />
              <div className="card-title">
                {isSource ? dev.name : (src ? `${src.name}: TX${src.deviceId}` : '— нет источника —')}
              </div>
              <div className="card-label">{c.label || (!isSource ? dev.name : '')}</div>
              {edit && (
                <>
                  <input
                    className="card-label-edit"
                    placeholder="Подпись"
                    value={c.label}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => onMutate((p) => { p.cards[idx].label = e.target.value; })}
                  />
                  <button className="card-del" onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onMutate((p) => p.cards.splice(idx, 1))}>✕</button>
                  <div
                    className="card-resize"
                    title="Потянуть, чтобы изменить размер"
                    onPointerDown={(e) => onResizeStart(e, idx)}
                  />
                </>
              )}
            </div>
          );
        })}
        {page.cards.length === 0 && (
          <p className="hint" style={{ padding: 20 }}>Лист пуст{edit ? ' — добавьте карточки выше.' : '.'}</p>
        )}
      </div>
    </>
  );
}
