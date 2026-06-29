const { conn, Usuario } = require('./db');

async function run() {
  try {
    const user = await Usuario.findOne({ where: { email: 'recepcion@test.com' }, raw: true });
    console.log("Usuario encontrado:", JSON.stringify(user, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await conn.close();
  }
}
run();
