import React, { useEffect, useRef, useState } from 'react';
import { api, getToken } from './api.js';

/** Страница «Настройка платформы управления» (ТЗ разд. VIII):
 *  конфигурации, сеть видео LAN, резервирование Master/Slave, повторный мастер */
export default function SettingsPage({ onOpenWizard }) {
  const [settings, setSettings] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ms, setMs] = useState({ role: 'master', peer: '' });
  const [ver, setVer] = useState(null);
  const [upd, setUpd] = useState(null);     // результат проверки обновлений
  const [updating, setUpdating] = useState(false);
  const [updLog, setUpdLog] = useState(''); // журнал, если обновление сорвалось
  const fileRef = useRef(null);

  async function load() {
    try {
      const s = await api('/api/platform');
      setSettings(s);
      if (s.masterSlave) setMs(s.masterSlave);
      setVer(await api('/api/platform/version'));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function checkUpdates() {
    setError('');
    setNotice('');
    try {
      const r = await api('/api/platform/update/check');
      setUpd(r);
      setNotice(r.behind > 0
        ? `Доступно обновление: +${r.behind} коммит(ов), ${r.remoteCommit}`
        : 'Установлена последняя версия');
    } catch (e) {
      setError(e.message);
    }
  }

  async function doUpdate() {
    if (!window.confirm('Обновить платформу из GitHub и перезапустить? Это займёт несколько минут.')) return;
    setError('');
    setUpdating(true);
    try {
      await api('/api/platform/update', { method: 'POST' });
      setNotice('Обновление запущено. Платформа перезапустится — страница перезагрузится автоматически.');
      setUpdLog('');
      // ждём перезапуска сервера; если обновление сорвалось — показываем журнал
      const poll = setInterval(async () => {
        try {
          const st = await api('/api/platform/update/status');
          if (st.failed) {
            clearInterval(poll);
            setUpdating(false);
            setNotice('');
            setUpdLog((st.log || '').split('\n').slice(-15).join('\n'));
            return;
          }
          const v = await api('/api/platform/version');
          if (!ver || v.commit !== ver.commit) {
            clearInterval(poll);
            window.location.reload();
          }
        } catch { /* сервер ещё перезапускается */ }
      }, 5000);
    } catch (e) {
      setError(e.message);
      setUpdating(false);
    }
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

  function exportConfig() {
    // скачивание файла конфигурации
    const a = document.createElement('a');
    a.href = `/api/platform/config/export?token=${getToken()}`;
    a.download = 'av-over-ip-config.json';
    a.click();
    setNotice('Конфигурация выгружена');
  }

  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = () => run(async () => {
      const cfg = JSON.parse(reader.result);
      await api('/api/platform/config/import', { method: 'POST', body: cfg });
    }, 'Конфигурация загружена');
    reader.readAsText(file);
  }

  const MODES = { auto: 'Автоматическая настройка', dhcp: 'DHCP', static: 'Статические IP' };

  return (
    <div style={{ maxWidth: 640 }}>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-ok">{notice}</div>}

      <section className="settings-section">
        <h3>Версия и обновление</h3>
        <p>
          Версия: <b>{ver ? `сборка №${ver.build}` : '…'}</b>
          {ver && <span className="hint"> · коммит {ver.commit} · {ver.date ? ver.date.slice(0, 16) : ''}</span>}
        </p>
        {ver && ver.needsRestart && (
          <div className="help-note">
            Файлы платформы обновлены до сборки №{ver.build}, но запущена ещё
            сборка №{ver.runningBuild} — служба не перезапустилась. Выполните на сервере
            <b> sudo systemctl restart ekoder</b>, иначе платформа работает по-старому.
          </div>
        )}
        {updLog && (
          <>
            <div className="form-error">Обновление не завершилось. Последние строки журнала:</div>
            <pre className="upd-log">{updLog}</pre>
          </>
        )}
        <div className="devices-actions">
          <button className="btn" disabled={updating} onClick={checkUpdates}>Проверить обновления</button>
          <button
            className="btn btn-primary"
            disabled={updating || !upd || upd.behind === 0}
            onClick={doUpdate}
          >
            {updating ? 'Обновление…' : 'Обновить из GitHub'}
          </button>
        </div>
        <p className="hint">
          Обновление скачает последнюю версию из репозитория, пересоберёт интерфейс,
          применит миграции базы и перезапустит платформу.
        </p>
      </section>

      <section className="settings-section">
        <h3>Конфигурация системы</h3>
        <p className="hint">
          Сохранение и загрузка полной конфигурации системы AV-over-IP
          (устройства, коммутация, видеостены, настройки).
        </p>
        <div className="devices-actions">
          <button className="btn btn-primary" onClick={exportConfig}>Сохранить конфигурацию в файл</button>
          <button className="btn" onClick={() => fileRef.current.click()}>Загрузить из файла</button>
          <input ref={fileRef} type="file" accept=".json" hidden
            onChange={(e) => e.target.files[0] && importConfig(e.target.files[0])} />
        </div>
      </section>

      <section className="settings-section">
        <h3>Сеть видео LAN</h3>
        <p>
          Режим настройки: <b>{MODES[settings.videoLanMode] || 'не выбран'}</b>
          {settings.videoLanIp && <> · IP контроллера: <b className="mono">{settings.videoLanIp.ip}</b></>}
        </p>
        {settings.deviceIpRanges && (
          <p className="hint">
            Диапазоны: энкодеры {settings.deviceIpRanges.encoders.from}—{settings.deviceIpRanges.encoders.to},
            {' '}декодеры {settings.deviceIpRanges.decoders.from}—{settings.deviceIpRanges.decoders.to}
          </p>
        )}
        <button className="btn" onClick={onOpenWizard}>Запустить проводник настройки</button>
      </section>

      <section className="settings-section">
        <h3>Резервирование (Master / Slave)</h3>
        <p className="hint">
          Два сервера ПУ работают в паре: при отказе «Master» управление автоматически
          переходит на «Slave».
        </p>
        <label className="radio">
          <input type="radio" checked={ms.role === 'master'} onChange={() => setMs({ ...ms, role: 'master' })} />
          <span>Master (основной сервер)</span>
        </label>
        <label className="radio">
          <input type="radio" checked={ms.role === 'slave'} onChange={() => setMs({ ...ms, role: 'slave' })} />
          <span>Slave (резервный сервер)</span>
        </label>
        <label>IP-адрес парного сервера
          <input value={ms.peer} onChange={(e) => setMs({ ...ms, peer: e.target.value })}
            placeholder="192.168.1.2" />
        </label>
        <button className="btn btn-primary"
          onClick={() => run(() => api('/api/platform/masterSlave', {
            method: 'PUT', body: { value: ms },
          }), 'Настройки резервирования сохранены')}>
          Сохранить
        </button>
        <p className="hint">Синхронизация и автопереключение — в разработке.</p>
      </section>
    </div>
  );
}
