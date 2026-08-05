// Выбор драйвера устройств.
// DEVICE_DRIVER=mock   — эмулятор (разработка без железа)
// DEVICE_DRIVER=hdn900 — реальные устройства HDN-EA900 (Telnet, ASPEED)
const name = process.env.DEVICE_DRIVER || 'mock';

const driver = name === 'hdn900' ? require('./hdn900') : require('./mock');

module.exports = driver;
