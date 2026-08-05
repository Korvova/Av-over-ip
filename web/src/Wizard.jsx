import React, { useState } from 'react';
import { api } from './api.js';

/**
 * Мастер первого запуска (ТЗ п. II.3).
 * Шаги: password → welcome → mode → [staticIp → ranges] → discover → done
 * «Закрыть» на любом шаге -> onClose('settings') (страница «Настройка ПУ», вкладка конфигураций).
 */
export default function Wizard({ onFinish, onClose, initialStep = 'password' }) {
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // смена пароля
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');

  // режим настройки видео LAN
  const [mode, setMode] = useState('');
  const [modeWarn, setModeWarn] = useState(false);

  // статические адреса
  const [puIp, setPuIp] = useState('');
  const [puMask, setPuMask] = useState('255.255.0.0');
  const [puGw, setPuGw] = useState('');
  const [encFrom, setEncFrom] = useState('169.254.12.1');
  const [encTo, setEncTo] = useState('169.254.12.255');
  const [decFrom, setDecFrom] = useState('169.254.22.1');
  const [decTo, setDecTo] = useState('169.254.22.255');

  // результат поиска
  const [found, setFound] = useState(null);

  async function changePassword() {
    if (pass1 !== pass2) return setError('Пароли не совпадают');
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/password', { method: 'POST', body: { password: pass1 } });
      setStep('welcome');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveModeAndNext() {
    if (!mode) return setModeWarn(true);
    setBusy(true);
    setError('');
    try {
      await api('/api/platform/videoLanMode', { method: 'PUT', body: { value: mode } });
      setStep(mode === 'static' ? 'staticIp' : 'discover');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveStaticIp() {
    setBusy(true);
    setError('');
    try {
      await api('/api/platform/videoLanIp', {
        method: 'PUT',
        body: { value: { ip: puIp, netmask: puMask, gateway: puGw } },
      });
      setStep('ranges');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRangesAndDiscover() {
    setBusy(true);
    setError('');
    try {
      await api('/api/platform/deviceIpRanges', {
        method: 'PUT',
        body: { value: { encoders: { from: encFrom, to: encTo }, decoders: { from: decFrom, to: decTo } } },
      });
      setStep('discover');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function runDiscover() {
    setBusy(true);
    setError('');
    try {
      const r = await api('/api/devices/discover', { method: 'POST' });
      setFound(r);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish(addAll) {
    setBusy(true);
    setError('');
    try {
      if (addAll) await api('/api/devices/add-all', { method: 'POST' });
      await api('/api/platform/firstRun', { method: 'PUT', body: { value: false } });
      onFinish();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function closeWizard() {
    try {
      await api('/api/platform/firstRun', { method: 'PUT', body: { value: false } });
    } catch { /* не критично */ }
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal wizard">
        {step === 'password' && (
          <>
            <h2>Смена пароля администратора</h2>
            <p>Рекомендуем изменить пароль по умолчанию.</p>
            <label>Новый пароль
              <input type="password" value={pass1} onChange={(e) => setPass1(e.target.value)} autoFocus />
            </label>
            <label>Повторите пароль
              <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
            </label>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={() => { setError(''); setStep('welcome'); }}>Не менять</button>
              <button className="btn btn-primary" disabled={busy || pass1.length < 4} onClick={changePassword}>
                Сохранить
              </button>
            </div>
          </>
        )}

        {step === 'welcome' && (
          <>
            <h2>Проводник настройки</h2>
            <p>
              Добро пожаловать в проводник настройки платформы управления RMS AV-over-IP.
              Проводник поможет Вам быстро настроить систему. Вы можете закрыть это окно и
              загрузить готовую конфигурацию системы AV-over-IP, если у Вас есть сохранённый
              файл конфигурации. Для начала настройки системы нажмите «Далее».
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={closeWizard}>Закрыть</button>
              <button className="btn btn-primary" onClick={() => setStep('mode')}>Далее</button>
            </div>
          </>
        )}

        {step === 'mode' && (
          <>
            <h2>Вариант настройки портов видео LAN</h2>
            <p>Вам необходимо выбрать вариант настройки портов видео LAN на энкодерах и декодерах системы RMS AV-over-IP:</p>
            <label className="radio">
              <input type="radio" name="mode" checked={mode === 'auto'} onChange={() => { setMode('auto'); setModeWarn(false); }} />
              <span>
                <b>Режим автоматической настройки.</b> IP-адреса портов видео LAN для энкодеров
                и декодеров назначаются контроллером автоматически. В этом режиме работы в системе
                не требуется маршрутизатор для домена видео LAN.
              </span>
            </label>
            <label className="radio">
              <input type="radio" name="mode" checked={mode === 'dhcp'} onChange={() => { setMode('dhcp'); setModeWarn(false); }} />
              <span>
                <b>Режим DHCP.</b> IP-адреса портов видео LAN для контроллера, энкодеров и декодеров
                назначаются внешним маршрутизатором автоматически. Режим предназначен для работы в сети
                (домен видео LAN), управляемой маршрутизатором с DHCP-сервером. Рекомендуется
                устанавливать маску подсети маршрутизатора 255.255.0.0.
              </span>
            </label>
            <label className="radio">
              <input type="radio" name="mode" checked={mode === 'static'} onChange={() => { setMode('static'); setModeWarn(false); }} />
              <span>
                <b>Режим статических IP адресов.</b> IP-адреса портов видео LAN для контроллера,
                энкодеров и декодеров назначаются вручную. Для установки адресов вручную контроллер,
                энкодеры и декодеры должны иметь адреса одной подсети. Рекомендуется устанавливать
                маску подсети 255.255.0.0.
              </span>
            </label>
            {modeWarn && <div className="form-error">Выберите режим конфигурации системы</div>}
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeWizard}>Закрыть</button>
              <button className="btn btn-primary" disabled={busy} onClick={saveModeAndNext}>Далее</button>
            </div>
          </>
        )}

        {step === 'staticIp' && (
          <>
            <h2>IP-адрес контроллера управления</h2>
            <p>Установите IP-адрес контроллера управления:</p>
            <label>IP-адрес
              <input value={puIp} onChange={(e) => setPuIp(e.target.value)} placeholder="169.254.1.1" autoFocus />
            </label>
            <label>Маска подсети
              <input value={puMask} onChange={(e) => setPuMask(e.target.value)} />
            </label>
            <label>Шлюз
              <input value={puGw} onChange={(e) => setPuGw(e.target.value)} placeholder="169.254.0.1" />
            </label>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeWizard}>Закрыть</button>
              <button className="btn btn-primary" disabled={busy || !puIp} onClick={saveStaticIp}>Далее</button>
            </div>
          </>
        )}

        {step === 'ranges' && (
          <>
            <h2>Диапазоны адресов энкодеров и декодеров</h2>
            <p>Установите диапазон адресных пространств для энкодеров и декодеров:</p>
            <div className="range-row">
              <span>Энкодеры</span>
              <input value={encFrom} onChange={(e) => setEncFrom(e.target.value)} />
              <span>—</span>
              <input value={encTo} onChange={(e) => setEncTo(e.target.value)} />
            </div>
            <div className="range-row">
              <span>Декодеры</span>
              <input value={decFrom} onChange={(e) => setDecFrom(e.target.value)} />
              <span>—</span>
              <input value={decTo} onChange={(e) => setDecTo(e.target.value)} />
            </div>
            <p className="hint">
              Для более простого управления системой рекомендуется установить адреса энкодеров
              и декодеров в разных сегментах сети. Например: энкодеры от 169.254.12.1 до 169.254.12.255,
              декодеры от 169.254.22.1 до 169.254.22.255.
            </p>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeWizard}>Закрыть</button>
              <button className="btn btn-primary" disabled={busy} onClick={saveRangesAndDiscover}>Далее</button>
            </div>
          </>
        )}

        {step === 'discover' && (
          <>
            <h2>Поиск устройств</h2>
            <p>
              Платформа выполнит поиск всех энкодеров и декодеров, присвоит им
              идентификационные номера (ID) и IP-адреса сети видео LAN.
            </p>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={closeWizard}>Закрыть</button>
              <button className="btn btn-primary" disabled={busy} onClick={runDiscover}>
                {busy ? 'Поиск…' : 'Начать поиск'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <h2>Поиск завершён</h2>
            <p>
              Найдено устройств: <b>{found ? found.found : 0}</b>
              {found && found.added !== found.found ? ` (новых: ${found.added})` : ''}.
              Добавить все найденные энкодеры и декодеры в систему автоматически или оставить
              в списке найденных устройств для последующего ручного внесения?
            </p>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn" disabled={busy} onClick={() => finish(false)}>Оставить в списке</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => finish(true)}>
                Добавить все в систему
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
