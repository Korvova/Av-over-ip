// Версия приложения и самообновление из git (кнопка «Обновить» в Настройке ПУ)
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..'); // корень репозитория
const UPDATE_LOG = path.join(ROOT, 'update.log');

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, windowsHide: true, timeout: 30000 })
    .toString()
    .trim();
}

/**
 * Версия кода, который реально выполняется: снимается один раз при старте процесса.
 * После обновления файлы в папке уже новые, а в памяти живёт прежний код — без этого
 * снимка платформа показывала бы свежую версию, ведя себя по-старому.
 */
const RUNNING = (() => {
  try {
    return { commit: git('rev-parse --short HEAD'), build: Number(git('rev-list --count HEAD')) };
  } catch {
    return { commit: '', build: 0 };
  }
})();

/** Текущая версия: номер сборки = число коммитов, короткий хэш, дата коммита */
function versionInfo() {
  try {
    const commit = git('rev-parse --short HEAD');
    return {
      build: Number(git('rev-list --count HEAD')),
      commit,
      date: git('log -1 --format=%ci'),
      branch: git('rev-parse --abbrev-ref HEAD'),
      // файлы обновлены, но процесс всё ещё выполняет прежний код
      needsRestart: Boolean(RUNNING.commit) && RUNNING.commit !== commit,
      runningCommit: RUNNING.commit,
      runningBuild: RUNNING.build,
    };
  } catch (e) {
    return { build: 0, commit: 'нет git', date: '', branch: '', needsRestart: false };
  }
}

/** Проверка обновлений: сколько коммитов отстаём от origin/main */
function checkUpdates() {
  git('fetch origin main');
  const behind = Number(git('rev-list --count HEAD..origin/main'));
  const remoteCommit = git('rev-parse --short origin/main');
  return { ...versionInfo(), behind, remoteCommit };
}

let updating = false;
let updateFailed = false;   // обновление сорвалось — код в памяти мог остаться прежним

/**
 * Запустить самообновление: git reset на origin/main, npm ci, сборка фронта,
 * миграции БД, затем выход из процесса — менеджер (systemd/NSSM) перезапустит
 * приложение уже новой версией.
 * Защита: не обновляемся при незакоммиченных изменениях (машина разработчика).
 */
function runUpdate() {
  updateFailed = false;
  if (updating) throw new Error('Обновление уже идёт');
  const dirty = git('status --porcelain');
  if (dirty) {
    throw new Error('В рабочей копии есть незакоммиченные изменения — обновление отменено (машина разработчика?)');
  }
  updating = true;

  const isWin = process.platform === 'win32';
  const script = path.join(ROOT, 'deploy', isWin ? 'update.ps1' : 'update.sh');
  const child = isWin
    ? spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { cwd: ROOT, windowsHide: true })
    : spawn('bash', [script], { cwd: ROOT });

  const log = fs.createWriteStream(UPDATE_LOG);
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.on('close', (code) => {
    fs.appendFileSync(UPDATE_LOG, `\n[update] завершено с кодом ${code}\n`);
    if (code === 0) {
      // выходим — systemd/NSSM поднимет процесс уже с новым кодом
      console.log('Обновление применено, перезапуск…');
      setTimeout(() => process.exit(0), 500);
    } else {
      // важно: файлы могли частично обновиться, а процесс продолжает работать
      // на прежнем коде — сообщаем об этом в интерфейс, а не молчим
      updating = false;
      updateFailed = true;
    }
  });
  return { started: true };
}

function updateStatus() {
  let log = '';
  try { log = fs.readFileSync(UPDATE_LOG, 'utf8').slice(-4000); } catch { /* нет лога */ }
  return { updating, failed: updateFailed, log };
}

module.exports = { versionInfo, checkUpdates, runUpdate, updateStatus };
