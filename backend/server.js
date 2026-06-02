require("dotenv").config();
const helmet = require("helmet");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { generarInforme } = require("./controllers/documentController"); // Importar el controlador
const { crearInforme } = require("./controllers/informeController");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { authMiddleware, requireRol } = require("./middleware/authMiddleware");

const app = express();

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING - Protección contra ataques DoS y spam
// ═══════════════════════════════════════════════════════════════

// Límite general: 100 requests por 15 minutos por IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: { error: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite estricto para login: 5 intentos por 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Demasiados intentos de login. Espera 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite para crear informes: 20 por hora (evita spam de documentos)
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: { error: "Has creado muchos informes. Espera 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const PORT = 3000;
const bcrypt = require("bcrypt");

async function generarHash(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
}
const corsOptions = {
  origin: "https://api.gererlenergie.com",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// CORS debe ir ANTES del rate limiter para que los preflight requests funcionen
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Aplicar límite general a todas las rutas (después de CORS)
app.use(generalLimiter);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
//middleware morgan
app.use(morgan("dev"));


//middleware para parsear JSON
app.use(express.json());
// iddleware para parsear cookies
app.use(cookieParser());

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN MULTER - Solo permite imágenes, máximo 10MB
// ═══════════════════════════════════════════════════════════════
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
    files: 50, // Máximo 50 archivos por request
  },
  fileFilter: (req, file, cb) => {
    // Verificar MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          `Tipo de archivo no permitido: ${file.mimetype}. Solo imágenes.`,
        ),
        false,
      );
    }

    // Verificar extensión del archivo
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(
          `Extensión no permitida: ${ext}. Solo: ${ALLOWED_EXTENSIONS.join(", ")}`,
        ),
        false,
      );
    }

    cb(null, true);
  },
}); // Configuracion de multer para subir archivos

const saveImage = async (file) => {
  try {
    // Generar nombre único con timestamp + extensión original
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const newPath = path.join(uploadsDir, uniqueName);

    // Usar promises para operaciones async
    const fsPromises = fs.promises;
    await fsPromises.copyFile(file.path, newPath);
    await fsPromises.unlink(file.path); // Eliminar archivo temporal
    return newPath;
  } catch (err) {
    console.error("Error al procesar imagen:", err.message);
    // Si falla, devolver la ruta temporal
    return file.path;
  }
};

// Endpoint de login (con rate limit estricto)
const { loginUsuario } = require("./controllers/authContoller");
app.post("/api/login", loginLimiter, loginUsuario);

// Endpoint de logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  res.json({ message: "Sesión cerrada exitosamente" });
});

// Endpoints de informes
const {
  listarInformes,
  descargarInforme,
  buscarInforme,
  eliminarInforme,
} = require("./controllers/informeController");
app.get("/api/informes", authMiddleware, requireRol("admin"), listarInformes);
app.get(
  "/api/informes/:id/download",
  authMiddleware,
  requireRol("admin"),
  descargarInforme,
);
app.post(
  "/api/informes/traer",
  authMiddleware,
  requireRol("admin"),
  buscarInforme,
);
app.delete(
  "/api/informes/:id",
  authMiddleware,
  requireRol("admin"),
  eliminarInforme,
);

// ================================
// ENDPOINTS MOPS PROGRAMACIÓN
// ================================
app.get("/api/mops-programacion", authMiddleware, requireRol("admin"), async (req, res) => {
  try {
    const db = require("./database/db_connect");
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;

    const [countResult] = await db.query("SELECT COUNT(*) as total FROM mops_programacion");
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const [mops] = await db.query(`
      SELECT m.id, m.nombre_archivo, m.created_at, u.nombre as usuario_nombre, u.email as usuario_email
      FROM mops_programacion m
      INNER JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({ total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1, informes: mops });
  } catch (error) {
    console.error("Error listando MOPs Programación:", error);
    res.status(500).json({ error: "Error al listar MOPs", details: error.message });
  }
});

app.post("/api/mops-programacion/buscar", authMiddleware, requireRol("admin"), async (req, res) => {
  try {
    const db = require("./database/db_connect");
    const rawQuery = String(req.body?.q || req.query.q || '').trim();
    if (!rawQuery) return res.status(400).json({ error: "Se requiere término de búsqueda" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const searchTerm = `%${rawQuery}%`;

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM mops_programacion m INNER JOIN usuarios u ON m.usuario_id = u.id WHERE m.nombre_archivo LIKE ? OR u.nombre LIKE ?",
      [searchTerm, searchTerm]
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const [mops] = await db.query(`
      SELECT m.id, m.nombre_archivo, m.created_at, u.nombre as usuario_nombre, u.email as usuario_email
      FROM mops_programacion m
      INNER JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.nombre_archivo LIKE ? OR u.nombre LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [searchTerm, searchTerm, limit, offset]);

    res.json({ total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1, informes: mops });
  } catch (error) {
    console.error("Error buscando MOPs Programación:", error);
    res.status(500).json({ error: "Error al buscar", details: error.message });
  }
});

app.delete("/api/mops-programacion/:id", authMiddleware, requireRol("admin"), async (req, res) => {
  try {
    const db = require("./database/db_connect");
    const [result] = await db.query("DELETE FROM mops_programacion WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "MOP no encontrado" });
    res.json({ message: "MOP eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando MOP Programación:", error);
    res.status(500).json({ error: "Error al eliminar", details: error.message });
  }
});

// ================================
// ENDPOINTS MOPS RENOVACIÓN
// ================================
app.get("/api/mops-renovacion", authMiddleware, requireRol("admin"), async (req, res) => {
  try {
    const db = require("./database/db_connect");
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;

    const [countResult] = await db.query("SELECT COUNT(*) as total FROM mops_renovacion");
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const [mops] = await db.query(`
      SELECT m.id, m.nombre_archivo, m.created_at, u.nombre as usuario_nombre, u.email as usuario_email
      FROM mops_renovacion m
      INNER JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({ total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1, informes: mops });
  } catch (error) {
    console.error("Error listando MOPs Renovación:", error);
    res.status(500).json({ error: "Error al listar MOPs", details: error.message });
  }
});

app.post("/api/mops-renovacion/buscar", authMiddleware, requireRol("admin"), async (req, res) => {
  try {
    const db = require("./database/db_connect");
    const rawQuery = String(req.body?.q || req.query.q || '').trim();
    if (!rawQuery) return res.status(400).json({ error: "Se requiere término de búsqueda" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
    const offset = (page - 1) * limit;
    const searchTerm = `%${rawQuery}%`;

    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM mops_renovacion m INNER JOIN usuarios u ON m.usuario_id = u.id WHERE m.nombre_archivo LIKE ? OR u.nombre LIKE ?",
      [searchTerm, searchTerm]
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const [mops] = await db.query(`
      SELECT m.id, m.nombre_archivo, m.created_at, u.nombre as usuario_nombre, u.email as usuario_email
      FROM mops_renovacion m
      INNER JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.nombre_archivo LIKE ? OR u.nombre LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [searchTerm, searchTerm, limit, offset]);

    res.json({ total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1, informes: mops });
  } catch (error) {
    console.error("Error buscando MOPs Renovación:", error);
    res.status(500).json({ error: "Error al buscar", details: error.message });
  }
});

app.delete("/api/mops-renovacion/:id", authMiddleware, requireRol("admin"), async (req, res) => {
  try {
    const db = require("./database/db_connect");
    const [result] = await db.query("DELETE FROM mops_renovacion WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "MOP no encontrado" });
    res.json({ message: "MOP eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando MOP Renovación:", error);
    res.status(500).json({ error: "Error al eliminar", details: error.message });
  }
});

// Endpoint generar informe de programación
const {
  generarInformeProgramacion,
} = require("./controllers/documentProgramacionController");
app.post(
  "/api/informes/crearProgramacion",
  authMiddleware, // Middleware de autenticación
  createLimiter, // Rate limit: 20 por hora
  upload.fields([{ name: "firma", maxCount: 1 }]), // Procesar archivo firma
  async (req, res) => {
    try {
      // Convertir req.files a req.savedImages
      req.savedImages = {};

      if (req.files) {
        for (const [fieldName, fileArray] of Object.entries(req.files)) {
          if (fileArray && fileArray.length > 0) {
            req.savedImages[fieldName] = fileArray[0].path;
            console.log(
              `✓ Archivo guardado: ${fieldName} -> ${fileArray[0].path}`,
            );
          }
        }
      }

      // Llamar a la función del controlador para generar el Word/PDF
      generarInformeProgramacion(req, res);
    } catch (err) {
      console.error("Error procesando solicitud:", err.message);
      return res
        .status(500)
        .json({ error: "Error al procesar solicitud", details: err.message });
    }
  },
);

// Endpoint descargar MOP Programación
app.get(
  "/api/mops-programacion/descargar/:informeId",
  authMiddleware,
  async (req, res) => {
    try {
      const db = require("./database/db_connect");
      const { informeId } = req.params;
      const userId = req.user.id;

      // Admin puede descargar cualquiera, técnico solo los suyos
      let query = "SELECT nombre_archivo, archivo FROM mops_programacion WHERE id = ?";
      const params = [informeId];
      
      if (req.user.rol !== 'admin') {
        query += " AND usuario_id = ?";
        params.push(userId);
      }

      const [rows] = await db.query(query, params);

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Archivo no encontrado o no tienes acceso" });
      }

      const { nombre_archivo, archivo } = rows[0];

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nombre_archivo}"`,
      );
      res.send(archivo);
    } catch (error) {
      console.error("Error descargando MOP Programación:", error);
      res
        .status(500)
        .json({ error: "Error al descargar archivo", details: error.message });
    }
  },
);
//Endpoint generar informe de renovación
const {
  generarInformeRenovacion,
} = require("./controllers/documentRenovacionController");
app.post(
  "/api/informes/crearRenovacion",
  authMiddleware, // Middleware de autenticación
  createLimiter, // Rate limit: 20 por hora
  upload.fields([{ name: "firma_r", maxCount: 1 }]), // Procesar archivo firma_r
  async (req, res) => {
    try {
      // Convertir req.files a req.savedImages
      req.savedImages = {};

      if (req.files) {
        for (const [fieldName, fileArray] of Object.entries(req.files)) {
          if (fileArray && fileArray.length > 0) {
            req.savedImages[fieldName] = fileArray[0].path;
            console.log(
              `✓ Archivo guardado: ${fieldName} -> ${fileArray[0].path}`,
            );
          }
        }
      }

      // Llamar a la función del controlador para generar el Word/PDF
      generarInformeRenovacion(req, res);
    } catch (err) {
      console.error("Error procesando solicitud:", err.message);
      return res
        .status(500)
        .json({ error: "Error al procesar solicitud", details: err.message });
    }
  },
);

// Endpoint descargar MOP Renovación
app.get(
  "/api/mops-renovacion/descargar/:informeId",
  authMiddleware,
  async (req, res) => {
    try {
      const db = require("./database/db_connect");
      const { informeId } = req.params;
      const userId = req.user.id;

      // Admin puede descargar cualquiera, técnico solo los suyos
      let query = "SELECT nombre_archivo, archivo FROM mops_renovacion WHERE id = ?";
      const params = [informeId];
      
      if (req.user.rol !== 'admin') {
        query += " AND usuario_id = ?";
        params.push(userId);
      }

      const [rows] = await db.query(query, params);

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Archivo no encontrado o no tienes acceso" });
      }

      const { nombre_archivo, archivo } = rows[0];

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nombre_archivo}"`,
      );
      res.send(archivo);
    } catch (error) {
      console.error("Error descargando MOP Renovación:", error);
      res
        .status(500)
        .json({ error: "Error al descargar archivo", details: error.message });
    }
  },
);
// Endpoint para generar el informe - ABIERTO PARA TODOS LOS AUTENTICADOS (técnico y admin)
app.post(
  "/api/informes/crear",
  authMiddleware, // Solo requiere estar autenticado, SIN restricción de rol
  createLimiter, // Rate limit: 20 por hora
  upload.fields([
    // Identificación de equipos
    { name: "fotoups", maxCount: 1 },
    { name: "fototransformador", maxCount: 1 },
    { name: "fototarjetared", maxCount: 1 },
    // Condiciones iniciales
    { name: "foto_condicion1", maxCount: 1 },
    { name: "foto_condicion2", maxCount: 1 },
    { name: "foto_condicion3", maxCount: 1 },
    // Desconexión y retiro
    { name: "foto_desconexion_y_retiro1", maxCount: 1 },
    { name: "foto_desconexion_y_retiro2", maxCount: 1 },
    { name: "foto_desconexion_y_retiro3", maxCount: 1 },
    // Instalación y conexión
    { name: "foto_instalacion_conexion1", maxCount: 1 },
    { name: "foto_instalacion_conexion2", maxCount: 1 },
    { name: "foto_instalacion_conexion3", maxCount: 1 },
    // Tensiones de entrada
    { name: "foto_tension_entrada1", maxCount: 1 },
    { name: "foto_tension_entrada2", maxCount: 1 },
    { name: "foto_tension_entrada3", maxCount: 1 },
    // Tensiones de salida
    { name: "foto_tension_salida1", maxCount: 1 },
    { name: "foto_tension_salida2", maxCount: 1 },
    { name: "foto_tension_salida3", maxCount: 1 },
    // Tensiones de salida UPS
    { name: "foto_tension_salidaups1", maxCount: 1 },
    { name: "foto_tension_salidaups2", maxCount: 1 },
    { name: "foto_tension_salidaups3", maxCount: 1 },
    // Estado del UPS
    { name: "foto_conmutador", maxCount: 1 },
    { name: "foto_conmutador_estado", maxCount: 1 },
    { name: "foto_conmutador_alarmas", maxCount: 1 },
    // Parámetros del display UPS
    { name: "foto_tensiones_ups_display", maxCount: 1 },
    { name: "foto_cargas_ups", maxCount: 1 },
    { name: "foto_bateria_ups", maxCount: 1 },
    // Parámetros internos
    { name: "foto_temperatura", maxCount: 1 },
    { name: "foto_busdc", maxCount: 1 },
    { name: "foto_carga", maxCount: 1 },
    // Conexión de cable de red
    { name: "foto_conexion_cable_red1", maxCount: 1 },
    { name: "foto_conexion_cable_red2", maxCount: 1 },
    { name: "foto_conexion_cable_red3", maxCount: 1 },
    // Validación ATM operativo
    { name: "foto_conmutador_manual", maxCount: 1 },
    { name: "foto_atm_funcional", maxCount: 1 },
    { name: "foto_atm_completo", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Convertir req.files a req.savedImages
      req.savedImages = {};

      if (req.files) {
        for (const [fieldName, fileArray] of Object.entries(req.files)) {
          if (fileArray && fileArray.length > 0) {
            req.savedImages[fieldName] = fileArray[0].path;
            console.log(
              `✓ Archivo guardado: ${fieldName} -> ${fileArray[0].path}`,
            );
          }
        }
      }

      // Llamar a la función del controlador para generar el Word/PDF
      generarInforme(req, res);
    } catch (err) {
      console.error("Error procesando solicitud:", err.message);
      return res
        .status(500)
        .json({ error: "Error al procesar solicitud", details: err.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE DE MANEJO DE ERRORES (debe ir al final)
// ═══════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  // Error de Multer (archivo inválido, tamaño excedido, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Archivo demasiado grande. Máximo 10MB." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "Demasiados archivos. Máximo 50." });
    }
    return res.status(400).json({ error: `Error de archivo: ${err.message}` });
  }

  // Error personalizado de fileFilter
  if (err.message && err.message.includes("no permitido")) {
    return res.status(400).json({ error: err.message });
  }

  // Error genérico
  console.error("Error no manejado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, "0.0.0.0");