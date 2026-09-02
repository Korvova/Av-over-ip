import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { encoderSections, decoderSections } from './deviceSchema.js';

/**
 * Панель настроек устройства (выпадающее меню из ТЗ, разд. III.2/III.3).
 * Каждое поле применяется сразу при изменении.
 */
export default function DeviceSettings({ device, encoders, onClose, onChanged }) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState(device.name);
  const [devId, setDevId] = useState(device.deviceId);
  const [net, setNet] = useState({
    mode: device.dhcp ? 'dhcp' : 'static', // 'auto' подставится при чтении с устройства
    dhcp: device.dhcp,
    ip: device.ip,
    netmask: device.netmask || '255.255.0.0',
    gateway: device.gateway || '',
  });

  const isEncoder = device.type === 'ENCODER';
  const sections = isEncoder ? encoderSections(encoders) : decoderSections(encoders);
  const [settings, setSettings] = useState(device.settings || {});
  const [reading, setReading] = useState(true);

  // читаем настройки прямо с устройства, чтобы в полях были реальные значения
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReading(true);
      try {
        const live = await api(`/api/control/${device.id}/params`);
        if (cancelled) return;
        setSettings((prev) => ({ ...prev, ...live.settings }));
        if (live.network) setNet((prev) => ({ ...prev, ...live.network }));
      } catch (e) {
        if (!cancelled) setError('Не удалось прочитать настройки с устройства: ' + e.message);
      } finally {
        if (!cancelled) setReading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [device.id]);

  async function attempt(fn, okMsg) {
    setError('');
    setNotice('');
    try {
      await fn();
      if (okMsg) setNotice(okMsg);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
  }

  function saveBase() {
    return attempt(async () => {
      await api(`/api/devices/${device.id}`, {
        method: 'PATCH',
        body: { name, deviceId: Number(devId) },
      });
    }, 'Имя и ID сохранены');
  }

  async function applyField(field, raw) {
    const value = field.options
      ? field.options.find((o) => String(o.v) === String(raw))?.v
      : raw;

    // всегда фиксируем выбор в settings — и локально, чтобы поле сразу показало выбранное
    setSettings((prev) => ({ ...prev, [field.key]: value }));
    const patchSettings = () =>
      api(`/api/devices/${device.id}`, {
        method: 'PATCH',
        body: { settings: { ...settings, [field.key]: value } },
      });

    if (field.apply === 'store' || (field.storeOnly && field.storeOnly(value))) {
      return attempt(patchSettings);
    }
    if (field.apply === 'param') {
      return attempt(async () => {
        await api(`/api/control/${device.id}/param`, {
          method: 'POST',
          body: { key: field.paramKey, value: field.map ? field.map(value) : value },
        });
      }, 'Команда отправлена');
    }
    if (field.apply === 'io') {
      // собираем составное значение из настроек порта
      const s = { ...settings, [field.key]: value };
      const port = field.port;
      return attempt(async () => {
        await patchSettings();
        await api(`/api/control/${device.id}/param`, {
          method: 'POST',
          body: {
            key: 'io',
            value: {
              level: s.ioLevel || '12v',
              port,
              mode: s[`io${port}mode`] || 'out',
              high: (s[`io${port}level`] || 'low') === 'high',
            },
          },
        });
      }, 'Команда отправлена');
    }
    if (field.apply === 'serial') {
      const s2 = { ...settings, [field.key]: value };
      return attempt(async () => {
        await patchSettings();
        await api(`/api/control/${device.id}/param`, {
          method: 'POST',
          body: {
            key: 'serial',
            value: {
              baudRate: s2.baudRate || 115200,
              dataBits: s2.dataBits || 8,
              parity: s2.parity || 'none',
              stopBits: s2.stopBits || 1,
              enabled: s2.rs232Relay !== false,
            },
          },
        });
      }, 'Параметры RS-232 сохранены (применятся после перезагрузки устройства)');
    }
    if (field.apply === 'routing') {
      return attempt(async () => {
        await patchSettings();
        await api('/api/routing', {
          method: 'POST',
          body: {
            signal: field.signal,
            decoderId: device.id,
            encoderId: value === 'follow' ? null : Number(value),
          },
        });
      }, 'Маршрут применён');
    }
  }

  function action(label, path, confirmText) {
    return (
      <button
        className="btn btn-danger"
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          attempt(async () => {
            await api(path, { method: 'POST' });
          }, `${label}: выполнено`);
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>{isEncoder ? 'Энкодер' : 'Декодер'}: {device.name}</h2>
          <button className="btn btn-small" onClick={onClose}>Закрыть</button>
        </div>

        {reading && <div className="hint">Читаем настройки с устройства…</div>}

        {error && <div className="form-error">{error}</div>}
        {notice && <div className="form-ok">{notice}</div>}

        {sections.map((sec) => (
          <section key={sec.title} className="settings-section">
            <h3>{sec.title}</h3>

            {sec.base && (
              <>
                <label>Имя устройства (до 16 символов)
                  <input
                    value={name}
                    maxLength={16}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={saveBase}
                  />
                </label>
                <label>ID устройства
                  <input
                    type="number"
                    value={devId}
                    onChange={(e) => setDevId(e.target.value)}
                    onBlur={saveBase}
                  />
                </label>
              </>
            )}

            {sec.network && (
              <>
                <label className="radio">
                  <input
                    type="radio"
                    checked={net.mode === 'auto'}
                    onChange={() => setNet({ ...net, mode: 'auto', dhcp: false })}
                  />
                  <span>Автоматический (169.254.x.x, без маршрутизатора)</span>
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    checked={net.mode === 'static'}
                    onChange={() => setNet({ ...net, mode: 'static', dhcp: false })}
                  />
                  <span>Статический IP</span>
                </label>
                <label className="radio">
                  <input
                    type="radio"
                    checked={net.mode === 'dhcp'}
                    onChange={() => setNet({ ...net, mode: 'dhcp', dhcp: true })}
                  />
                  <span>Динамический IP (DHCP)</span>
                </label>
                {net.mode === 'static' && (
                  <>
                    <label>IP-адрес
                      <input value={net.ip} onChange={(e) => setNet({ ...net, ip: e.target.value })} />
                    </label>
                    <label>Маска подсети
                      <input value={net.netmask} onChange={(e) => setNet({ ...net, netmask: e.target.value })} />
                    </label>
                    <label>Шлюз
                      <input value={net.gateway} onChange={(e) => setNet({ ...net, gateway: e.target.value })} />
                    </label>
                  </>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => attempt(async () => {
                    await api(`/api/control/${device.id}/network`, {
                      method: 'POST',
                      body: { ...net, dhcp: net.mode === 'dhcp', autoip: net.mode === 'auto' },
                    });
                  }, 'Сетевые настройки отправлены (устройство перезагрузится)')}
                >
                  Применить сеть
                </button>
              </>
            )}

            {(sec.fields || []).map((f) => (
              <label key={f.key}>
                {f.label}
                <select
                  value={String(settings[f.key] ?? '')}
                  onChange={(e) => applyField(f, e.target.value)}
                >
                  <option value="" disabled>—</option>
                  {f.options.map((o) => (
                    <option key={String(o.v)} value={String(o.v)}>{o.l}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        ))}

        <section className="settings-section">
          <h3>Сервисные действия</h3>
          <div className="actions-col">
            {action('Принудительная перезагрузка', `/api/control/${device.id}/reboot`,
              `Перезагрузить ${device.name}?`)}
            {action('Восстановление заводских настроек', `/api/control/${device.id}/factory-reset`,
              `Сбросить ${device.name} к заводским настройкам?`)}
            <button
              className="btn btn-danger"
              onClick={() => {
                if (!window.confirm(`Удалить ${device.name} из системы?`)) return;
                attempt(async () => {
                  await fetch(`/api/devices/${device.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` },
                  });
                  onClose();
                });
              }}
            >
              Удаление устройства из системы
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
