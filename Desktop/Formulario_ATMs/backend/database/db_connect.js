const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 0
});

// Probar conexión
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Conexión a la base de datos establecida");
    connection.release();
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error);
  }
})();

module.exports = pool;