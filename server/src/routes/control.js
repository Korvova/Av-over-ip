// Управление устройствами — отдельные роуты, вся работа с железом через драйвер
const express = require('express');
const prisma = require('../db');
const driver = require('../drivers');
const { requireAdmin } = require('../auth');

const router = express.Router();

async function getDevice(req, res) {
  const device = await prisma.device.findUnique({ where: { id: Number(req.params.id) } });
  if (!device) res.status(404).json({ error: 'Устройство не найдено' });
  return device;
}

// GET /api/control/:id/params — прочитать текущие настройки прямо с устройства
// и запомнить их: интерфейс показывает реальное состояние, а не пустые поля
router.get('/:id/params', requireAdmin, async (req, res) => {
  const device = await getDevice(req, res);
  if (!device) return;
  try {
    const live = await driver.readParams(device);
    await prisma.device.update({
      where: { id: device.id },
      data: { settings: { ...device.settings, ...live.settings } },
    });
    res.json(live);
  } catch (e) {
    res.status(502).json({ error: 'Не удалось прочитать настройки: ' + String(e.message || e) });
  }
});

// POST /api/control/:id/param { key, value } — применить параметр (LED, EDID, IO, реле...)
router.post('/:id/param', requireAdmin, async (req, res) => {
  const device = await getDevice(req, res);
  if (!device) return;
  const { key, value } = req.body || {};
  try {
    const result = await driver.setParam(device, key, value);
    // фиксируем применённую настройку в БД
    await prisma.device.update({
      where: { id: device.id },
      data: { settings: { ...device.settings, [key]: value } },
    });
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// POST /api/control/:id/network { ip, netmask, gateway, dhcp }
router.post('/:id/network', requireAdmin, async (req, res) => {
  const device = await getDevice(req, res);
  if (!device) return;
  try {
    await driver.setNetwork(device, req.body || {});
    const updated = await prisma.device.update({
      where: { id: device.id },
      data: {
        ip: req.body.ip ?? device.ip,
        netmask: req.body.netmask ?? device.netmask,
        gateway: req.body.gateway ?? device.gateway,
        dhcp: req.body.dhcp ?? device.dhcp,
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// POST /api/control/:id/reboot — принудительная перезагрузка
router.post('/:id/reboot', requireAdmin, async (req, res) => {
  const device = await getDevice(req, res);
  if (!device) return;
  try {
    res.json(await driver.reboot(device));
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// POST /api/control/:id/factory-reset — заводские настройки
router.post('/:id/factory-reset', requireAdmin, async (req, res) => {
  const device = await getDevice(req, res);
  if (!device) return;
  try {
    res.json(await driver.factoryReset(device));
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

module.exports = router;
