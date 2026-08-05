import React, { useState } from 'react';
import { IconUi, IconRouting, IconDevices, IconWall, IconUsers, IconSettings, IconHelp } from './icons.jsx';
import { setToken } from './api.js';
import Login from './Login.jsx';
import Wizard from './Wizard.jsx';
import DevicesPage from './DevicesPage.jsx';
import RoutingPage from './RoutingPage.jsx';
import VideoWallPage from './VideoWallPage.jsx';
import UiPage from './UiPage.jsx';
import UsersPage from './UsersPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import HelpPage from './HelpPage.jsx';

// Порядок вкладок по ТЗ, п. II.2 (сверху вниз)
const PAGES = [
  { id: 'ui',        title: 'Интерфейс пользователя', Icon: IconUi,       roles: ['ADMIN', 'USER'] },
  { id: 'routing',   title: 'Коммутация',             Icon: IconRouting,  roles: ['ADMIN', 'USER'] },
  { id: 'devices',   title: 'Элементы системы',       Icon: IconDevices,  roles: ['ADMIN'] },
  { id: 'videowall', title: 'Видео-стена',            Icon: IconWall,     roles: ['ADMIN', 'USER'] },
  { id: 'users',     title: 'Пользователи',           Icon: IconUsers,    roles: ['ADMIN'] },
  { id: 'settings',  title: 'Настройка платформы управления', Icon: IconSettings, roles: ['ADMIN'] },
];
const HELP = { id: 'help', title: 'Справка', Icon: IconHelp, roles: ['ADMIN', 'USER'] };

export default function App() {
  const [auth, setAuth] = useState(null); // { user, firstRun }
  const [wizardStep, setWizardStep] = useState(null); // 'password' | 'welcome' | null
  const [page, setPage] = useState('ui');

  function onLogin(data) {
    setAuth(data);
    if (data.firstRun && data.user.role === 'ADMIN') {
      setWizardStep('password'); // первый запуск — со смены пароля
    }
  }

  function logout() {
    setToken('');
    setAuth(null);
    setPage('ui');
  }

  if (!auth) return <Login onLogin={onLogin} />;

  const pages = PAGES.filter((p) => p.roles.includes(auth.user.role));
  const current = [...pages, HELP].find((p) => p.id === page) || pages[0];
  const isAdmin = auth.user.role === 'ADMIN';

  return (
    <div className="layout">
      <nav className="sidebar">
        {pages.map((p) => (
          <button
            key={p.id}
            className={'nav-btn' + (p.id === current.id ? ' active' : '')}
            title={p.title}
            onClick={() => setPage(p.id)}
          >
            <p.Icon />
          </button>
        ))}
        <button
          className={'nav-btn nav-help' + (current.id === 'help' ? ' active' : '')}
          title="Справка"
          onClick={() => setPage('help')}
        >
          <HELP.Icon />
        </button>
      </nav>
      <main className="content">
        <header className="page-header">
          <h1>{current.title}</h1>
          <div className="header-right">
            <span className="user-badge">{auth.user.displayName}</span>
            <button className="btn btn-small" onClick={logout}>Выйти</button>
          </div>
        </header>
        <div className="page-body">
          {current.id === 'ui' && <UiPage auth={auth} />}
          {current.id === 'routing' && <RoutingPage />}
          {current.id === 'devices' && (
            <DevicesPage isAdmin={isAdmin} onOpenWizard={() => setWizardStep('welcome')} />
          )}
          {current.id === 'videowall' && <VideoWallPage isAdmin={isAdmin} />}
          {current.id === 'users' && <UsersPage />}
          {current.id === 'settings' && <SettingsPage onOpenWizard={() => setWizardStep('welcome')} />}
          {current.id === 'help' && <HelpPage isAdmin={isAdmin} />}
        </div>
      </main>

      {wizardStep && (
        <Wizard
          initialStep={wizardStep}
          onFinish={() => { setWizardStep(null); setPage('devices'); }}
          onClose={() => { setWizardStep(null); setPage('settings'); }}
        />
      )}
    </div>
  );
}
