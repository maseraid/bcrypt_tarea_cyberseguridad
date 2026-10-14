// Servidor de login simple: solo Node (http nativo), PostgreSQL (pg) y bcrypt
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

// ---------- Base de datos ----------
// La tabla se crea ejecutando db/database.sql en pgAdmin
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function buscarUsuario(usuario) {
  const { rows } = await pool.query(
    'SELECT id, usuario, clave FROM usuarios WHERE usuario = $1',
    [usuario]
  );
  return rows[0];
}

async function insertarUsuario(usuario, hash) {
  await pool.query('INSERT INTO usuarios (usuario, clave) VALUES ($1, $2)', [usuario, hash]);
}

// ---------- Utilidades ----------
function enviarJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let cuerpo = '';
    req.on('data', (chunk) => {
      cuerpo += chunk;
      if (cuerpo.length > 1e5) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(cuerpo || '{}'));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function validar({ usuario, clave }) {
  if (typeof usuario !== 'string' || typeof clave !== 'string') return 'Datos incompletos';
  if (usuario.trim().length < 3) return 'El usuario debe tener al menos 3 caracteres';
  if (usuario.trim().length > 50) return 'El usuario no puede superar 50 caracteres';
  if (clave.length < 6) return 'La clave debe tener al menos 6 caracteres';
  if (Buffer.byteLength(clave) > 72) return 'La clave no puede superar 72 bytes (límite de bcrypt)';
  return null;
}

// ---------- Manejadores ----------
async function registrar(req, res) {
  const datos = await leerCuerpo(req);
  const error = validar(datos);
  if (error) return enviarJSON(res, 400, { ok: false, mensaje: error });

  const usuario = datos.usuario.trim();
  if (await buscarUsuario(usuario)) {
    return enviarJSON(res, 409, { ok: false, mensaje: 'El usuario ya existe' });
  }

  // Solo la clave se guarda hasheada con bcrypt (incluye la sal en el propio hash)
  const hash = await bcrypt.hash(datos.clave, SALT_ROUNDS);
  try {
    await insertarUsuario(usuario, hash);
  } catch (err) {
    // 23505 = violación de UNIQUE (dos registros simultáneos con el mismo usuario)
    if (err.code === '23505') {
      return enviarJSON(res, 409, { ok: false, mensaje: 'El usuario ya existe' });
    }
    throw err;
  }
  enviarJSON(res, 201, { ok: true, mensaje: 'Usuario registrado correctamente' });
}

async function loguear(req, res) {
  const datos = await leerCuerpo(req);
  if (typeof datos.usuario !== 'string' || typeof datos.clave !== 'string') {
    return enviarJSON(res, 400, { ok: false, mensaje: 'Datos incompletos' });
  }

  const fila = await buscarUsuario(datos.usuario.trim());
  const valida = fila ? await bcrypt.compare(datos.clave, fila.clave) : false;

  if (!valida) {
    // Mensaje genérico para no revelar si el usuario existe
    return enviarJSON(res, 401, { ok: false, mensaje: 'Usuario o clave incorrectos' });
  }
  enviarJSON(res, 200, { ok: true, mensaje: `Bienvenido, ${fila.usuario}`, usuario: fila.usuario });
}

// ---------- Servidor ----------
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (req.method === 'POST' && req.url === '/api/registro') return await registrar(req, res);
    if (req.method === 'POST' && req.url === '/api/login') return await loguear(req, res);

    enviarJSON(res, 404, { ok: false, mensaje: 'Ruta no encontrada' });
  } catch (err) {
    console.error(err);
    // Los errores de la base de datos no se muestran al cliente
    const esErrorCliente = err.message === 'JSON inválido' || err.message === 'Cuerpo demasiado grande';
    enviarJSON(res, esErrorCliente ? 400 : 500, {
      ok: false,
      mensaje: esErrorCliente ? err.message : 'Error interno del servidor',
    });
  }
});

// Comprueba la conexión a PostgreSQL antes de aceptar peticiones
pool.query('SELECT 1')
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Conectado a PostgreSQL (${process.env.PGDATABASE}@${process.env.PGHOST})`);
      console.log(`Servidor listo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo conectar a PostgreSQL:', err.message || err.code);
    console.error('Revisa los datos de conexión en el archivo .env');
    process.exit(1);
  });
