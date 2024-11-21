const db = require('./db');

(async () => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    console.log('Conexión exitosa:', rows);
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
  }
})();
