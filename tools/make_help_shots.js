// Генератор скриншотов для справочника: страницы ПУ + красные обводки-аннотации.
// Запуск: node make_help_shots.js  (нужны запущенные server:8080 и web:5173,
// и учётка testadmin/test123 в БД)
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'web', 'public', 'help');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Нарисовать красные рамки с номерами вокруг элементов [{selector, n, pad}] */
async function annotate(page, marks) {
  await page.evaluate((marks) => {
    document.querySelectorAll('.__annot').forEach((e) => e.remove());
    for (const m of marks) {
      const el = document.querySelector(m.selector);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const pad = m.pad ?? 6;
      const box = document.createElement('div');
      box.className = '__annot';
      Object.assign(box.style, {
        position: 'fixed',
        left: r.left - pad + 'px',
        top: r.top - pad + 'px',
        width: r.width + pad * 2 + 'px',
        height: r.height + pad * 2 + 'px',
        border: '3px solid #e11',
        borderRadius: '10px',
        zIndex: 99999,
        pointerEvents: 'none',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.6)',
      });
      if (m.n != null) {
        const badge = document.createElement('div');
        badge.textContent = m.n;
        Object.assign(badge.style, {
          position: 'absolute',
          left: '-14px',
          top: '-14px',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: '#e11',
          color: '#fff',
          font: '700 15px/26px Segoe UI, sans-serif',
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        });
        box.appendChild(badge);
      }
      document.body.appendChild(box);
    }
  }, marks);
}

async function clearAnnot(page) {
  await page.evaluate(() => document.querySelectorAll('.__annot').forEach((e) => e.remove()));
}

async function shot(page, name, marks = []) {
  if (marks.length) await annotate(page, marks);
  await wait(250);
  await page.screenshot({ path: path.join(OUT, name) });
  await clearAnnot(page);
  console.log('✓', name);
}

async function navTo(page, title) {
  await page.evaluate((t) => {
    [...document.querySelectorAll('.nav-btn')].find((b) => b.title === t)?.click();
  }, title);
  await wait(700);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    defaultViewport: { width: 1366, height: 850 },
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await wait(800);

  // ---------- 1. Вход ----------
  await shot(page, 'login.png', [
    { selector: '.login-card label:nth-of-type(1) input', n: 1 },
    { selector: '.login-card label:nth-of-type(2) input', n: 2 },
    { selector: '.login-card .btn', n: 3 },
  ]);

  // логинимся
  await page.evaluate(() => {
    const sv = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const ins = document.querySelectorAll('.login-card input');
    sv(ins[0], 'testadmin');
    sv(ins[1], 'test123');
    document.querySelector('.login-card').requestSubmit();
  });
  await wait(1200);

  // ---------- 2. Мастер: шаг выбора режима ----------
  await navTo(page, 'Настройка платформы управления');
  await page.evaluate(() => {
    [...document.querySelectorAll('.btn')].find((b) => b.textContent === 'Запустить проводник настройки')?.click();
  });
  await wait(500);
  await page.evaluate(() => {
    [...document.querySelectorAll('.modal button')].find((b) => b.textContent === 'Далее')?.click();
  });
  await wait(500);
  await shot(page, 'wizard_mode.png', [
    { selector: '.modal .radio:nth-of-type(1)', n: 1, pad: 2 },
    { selector: '.modal .radio:nth-of-type(3)', n: 3, pad: 2 },
  ]);
  await page.evaluate(() => {
    [...document.querySelectorAll('.modal button')].find((b) => b.textContent === 'Закрыть')?.click();
  });
  await wait(500);

  // ---------- 3. Настройка платформы ----------
  await navTo(page, 'Настройка платформы управления');
  await shot(page, 'settings.png', [
    { selector: '.settings-section:nth-of-type(1) .devices-actions', n: 1 },
    { selector: '.settings-section:nth-of-type(2) .btn', n: 2 },
    { selector: '.settings-section:nth-of-type(3)', n: 3, pad: 2 },
  ]);

  // ---------- 4. Элементы системы ----------
  await navTo(page, 'Элементы системы');
  await shot(page, 'devices.png', [
    { selector: '.tabs', n: 1, pad: 2 },
    { selector: '.tbl-wrap:not(.tbl-found)', n: 2, pad: 2 },
    { selector: '.tbl-wrap:not(.tbl-found) tbody .btn', n: 3 },
    { selector: '.tbl-found', n: 4, pad: 2 },
    { selector: '.devices-actions', n: 5, pad: 2 },
  ]);

  // панель настроек устройства
  await page.evaluate(() => {
    document.querySelector('.tbl-wrap:not(.tbl-found) tbody .btn')?.click();
  });
  await wait(600);
  await shot(page, 'device_settings.png');
  await page.evaluate(() => {
    [...document.querySelectorAll('.drawer-head .btn')].find((b) => b.textContent === 'Закрыть')?.click();
  });
  await wait(400);

  // ---------- 5. Коммутация ----------
  await navTo(page, 'Коммутация');
  await shot(page, 'routing.png', [
    { selector: '.matrix tbody tr:nth-child(1) .cell:nth-of-type(1)', n: 1, pad: 2 },
    { selector: '.enc-head .btn-tiny', n: 3 },
  ]);

  // ---------- 6. Видеостены ----------
  await navTo(page, 'Видео-стена');
  await shot(page, 'walls.png', [
    { selector: '.devices-actions', n: 1, pad: 2 },
    { selector: '.wall-grid', n: 2, pad: 2 },
  ]);
  await page.evaluate(() => {
    [...document.querySelectorAll('.tab')].find((t) => t.textContent === 'Источники для видеостен')?.click();
  });
  await wait(800);
  await shot(page, 'wall_sources.png', [
    { selector: '.source-card', n: 1 },
    { selector: '.wall-drop', n: 2, pad: 2 },
  ]);

  // ---------- 7. Интерфейс пользователя ----------
  // если у учётки нет раскладки — создаём демо-лист, чтобы скриншоты не были пустыми
  await page.evaluate(async () => {
    const t = sessionStorage.getItem('token');
    const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t };
    const pages = await (await fetch('/api/users/ui-layout', { headers: H })).json();
    if (Array.isArray(pages) && pages.length) return;
    const devs = await (await fetch('/api/devices', { headers: H })).json();
    const tx = devs.find((d) => d.type === 'ENCODER' && d.inSystem);
    const rx = devs.find((d) => d.type === 'DECODER' && d.inSystem);
    const cards = [];
    if (tx) cards.push({ id: 1, kind: 'source', deviceId: tx.id, label: '', x: 30, y: 30, w: 270 });
    if (rx) cards.push({ id: 2, kind: 'consumer', deviceId: rx.id, label: 'Главный экран', x: 340, y: 30, w: 200 });
    await fetch('/api/users/ui-layout', {
      method: 'PUT', headers: H,
      body: JSON.stringify({ pages: [{ title: 'Лист 1', cards }] }),
    });
  });
  await navTo(page, 'Интерфейс пользователя');
  await shot(page, 'ui_view.png', [
    { selector: '.ui-tabs', n: 1, pad: 2 },
    { selector: '.ui-presets', n: 2, pad: 2 },
    { selector: '.card-source', n: 3 },
    { selector: '.card-consumer', n: 4 },
  ]);

  // контекстное меню (если на листе есть потребитель)
  const hasConsumer = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.ui-card')].find((x) => x.classList.contains('card-consumer'));
    if (!c) return false;
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: r.left + 60, clientY: r.top + 40,
    }));
    return true;
  });
  if (hasConsumer) {
    await wait(400);
    await shot(page, 'ui_menu.png', [{ selector: '.ctx-menu', pad: 4 }]);
    await page.evaluate(() => document.body.click());
    await wait(300);
  } else {
    console.log('- ui_menu.png пропущен: нет карточки потребителя');
  }

  // редактор
  await page.evaluate(() => {
    [...document.querySelectorAll('.btn')].find((b) => b.textContent === 'Редактор')?.click();
  });
  await wait(500);
  await shot(page, 'ui_edit.png', [
    { selector: '.ui-tabs .btn-tiny', n: 1 },
    { selector: '.ui-addbar', n: 2, pad: 2 },
    { selector: '.ui-card', n: 3 },
    { selector: '.ui-editbar', n: 5, pad: 2 },
  ]);
  await page.evaluate(() => {
    [...document.querySelectorAll('.btn')].find((b) => b.textContent === 'Готово')?.click();
  });
  await wait(300);

  // ---------- 8. Пользователи ----------
  await navTo(page, 'Пользователи');
  await shot(page, 'users.png');

  await browser.close();
  console.log('Готово:', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
