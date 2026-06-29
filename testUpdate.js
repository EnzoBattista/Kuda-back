const { Usuario } = require('./db');
(async () => {
  try {
    const u = await Usuario.findByPk('clientesuspendido@test.com');
    if (u) {
      u.email = 'clientesuspendido@test.com_deleted_1';
      await u.save();
      console.log('Update OK');
    } else {
      console.log('Not found');
    }
  } catch (e) {
    console.error(e.message);
  }
  process.exit();
})();
