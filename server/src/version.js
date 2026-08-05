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

/** Текущая версия: номер сборки = число коммитов, короткий хэш, дата коммита */
function versionInfo() {
  try {
    return {
      build: Number(git('rev-list --count HEAD')),
      commit: git('rev-parse --short HEAD'),
      date: git('log -1 --format=%ci'),
      branch: git('rev-parse --abbrev-ref HEAD'),
    };
  } catch (e) {
    return { build: 0, commit: 'нет git', date: '', branch: '' };
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

/**
 * Запустить самообновление: git reset на origin/main, npm ci, сборка фронта,
 * миграции БД, затем выход из процесса — менеджер (systemd/NSSM) перезапустит
 * приложение уже новой версией.
 * Защита: не обновляемся при незакоммиченных изменениях (машина разработчика).
 */
function runUpdate() {
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
      updating = false;
    }
  });
  return { started: true };
}

function updateStatus() {
  let log = '';
  try { log = fs.readFileSync(UPDATE_LOG, 'utf8').slice(-4000); } catch { /* нет лога */ }
  return { updating, log };
}

module.exports = { versionInfo, checkUpdates, runUpdate, updateStatus };
