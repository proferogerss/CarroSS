require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function main() {
  const nombre = process.env.ADMIN_NOMBRE;
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!nombre || !email || !password) {
    console.error('Debes definir ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_PASSWORD en .env antes de correr el seed.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const { rows: existentes } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);

  if (existentes[0]) {
    await pool.query('UPDATE usuarios SET nombre=$1, password_hash=$2, activo=TRUE WHERE email=$3', [nombre, hash, email]);
    console.log(`Usuario ${email} actualizado.`);
  } else {
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4)',
      [nombre, email, hash, 'admin']
    );
    console.log(`Usuario ${email} creado.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
