import React from 'react';

// Единый стиль: 24x24, stroke=currentColor, без заливки (стиль Feather/Lucide)
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Интерфейс пользователя — монитор с карточками */
export const IconUi = () => (
  <svg {...base}>
    <rect x="2" y="4" width="20" height="14" rx="2" />
    <rect x="5.5" y="7.5" width="5" height="3.5" rx="0.8" />
    <rect x="13.5" y="7.5" width="5" height="3.5" rx="0.8" />
    <rect x="5.5" y="13" width="5" height="1.8" rx="0.8" />
    <path d="M12 18v3M8 21h8" />
  </svg>
);

/** Коммутация — перекрещенные маршруты */
export const IconRouting = () => (
  <svg {...base}>
    <path d="M3 7h4l10 10h4" />
    <path d="M3 17h4l10-10h4" />
    <path d="M18 4l3 3-3 3" />
    <path d="M18 14l3 3-3 3" />
  </svg>
);

/** Элементы системы — стойка устройств */
export const IconDevices = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="7" rx="1.5" />
    <rect x="3" y="13" width="18" height="7" rx="1.5" />
    <circle cx="7" cy="7.5" r="0.4" fill="currentColor" />
    <circle cx="7" cy="16.5" r="0.4" fill="currentColor" />
    <path d="M14 7.5h4M14 16.5h4" />
  </svg>
);

/** Видео-стена — сетка 2x2 */
export const IconWall = () => (
  <svg {...base}>
    <rect x="3" y="4" width="8" height="7" rx="1" />
    <rect x="13" y="4" width="8" height="7" rx="1" />
    <rect x="3" y="13" width="8" height="7" rx="1" />
    <rect x="13" y="13" width="8" height="7" rx="1" />
  </svg>
);

/** Пользователи */
export const IconUsers = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M16 5.5a3.5 3.5 0 0 1 0 5" />
    <path d="M17.5 14.5c2.1.8 3.5 2.9 3.5 5.5" />
  </svg>
);

/** Справка — знак вопроса в круге */
export const IconHelp = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.8-2.8 2.2-2.8 4" />
    <circle cx="12" cy="17.3" r="0.5" fill="currentColor" />
  </svg>
);

/** Настройка платформы — шестерёнка */
export const IconSettings = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.82-.33 1.6 1.6 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1-1.51 1.6 1.6 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .33-1.82 1.6 1.6 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.51-1 1.6 1.6 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.82.33h.09a1.6 1.6 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 1 1.51h.09a1.6 1.6 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.82v.09a1.6 1.6 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.51 1z" />
  </svg>
);
