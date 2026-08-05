// Начальные данные: 4 пользователя по ТЗ (п. II.1) + флаг первого запуска
const prisma = require('./db');

const DEFAULT_USERS = [
  { login: 'admin', password: 'admin', role: 'ADMIN', displayName: 'Администратор' },
  { login: 'user1', password: '1111', role: 'USER', displayName: 'Пользователь 1' },
  { login: 'user2', password: '2222', role: 'USER', displayName: 'Пользователь 2' },
  { login: 'user3', password: '3333', role: 'USER', displayName: 'Пользователь 3' },
];

async function seed() {
  for (const u of DEFAULT_USERS) {
    await prisma.user.upsert({
      where: { login: u.login },
      update: {},
      create: u,
    });
  }
  await prisma.platformSetting.upsert({
    where: { key: 'firstRun' },
    update: {},
    create: { key: 'firstRun', value: true },
  });
}

module.exports = { seed };
