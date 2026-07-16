const fs = require('fs')
const path = require('path')
const { generarInforme } = require('./documentController')

const requiredFields = [
  'nombre_actividad',
  'fecha_ejecucion',
  'nombre_lugar',
  'nombre_direccion',

  'nombre_del_elaborador',
  'fecha_elaboracion',
  'fecha_revisado',
  'fecha_aprobado',
  'codigo_informe_tecnico',
  'fecha_informe_tecnico',
  'descripcion_antecedente',
  'num_serie_ups',
  'num_serie_transformador',
  'num_serie_tarjetared',
  'num_mac_tarjetared',
  //fotos
  'fotoups',
  'fototransformador',
  'fototarjetared',

  'condicion_inicial_site',
  'descripcion_condicion1',
  'descripcion_condicion2',
  'descripcion_condicion3',
  //fotos
  'foto_condicion1',
  'foto_condicion2',
  'foto_condicion3',

  'descripcion_desconexion_y_retiro1',
  'descripcion_desconexion_y_retiro2',
  'descripcion_desconexion_y_retiro3',
  //fotos
  'foto_desconexion_y_retiro1',
  'foto_desconexion_y_retiro2',
  'foto_desconexion_y_retiro3',

  'descripcion_instalacion_conexion1',
  'descripcion_instalacion_conexion2',
  'descripcion_instalacion_conexion3',
  //fotos
  'foto_instalacion_conexion1',
  'foto_instalacion_conexion2',
  'foto_instalacion_conexion3',

  'descripcion_tension_entrada1',
  'descripcion_tension_entrada2',
  'descripcion_tension_entrada3',
  //fotos
  'foto_tension_entrada1',
  'foto_tension_entrada2',
  'foto_tension_entrada3',

  'descripcion_tension_salida1',
  'descripcion_tension_salida2',
  'descripcion_tension_salida3',
  //fotos
  'foto_tension_salida1',
  'foto_tension_salida2',
  'foto_tension_salida3',

  'descripcion_tension_salidaups1',
  'descripcion_tension_salidaups2',
  'descripcion_tension_salidaups3',
  //fotos
  'foto_tension_salidaups1',
  'foto_tension_salidaups2',
  'foto_tension_salidaups3',

  'estado_ups_detalles',
  //fotos
  'foto_conmutador',
  'foto_conmutador_estado',
  'foto_conmutador_alarmas',

  'descripcion_tensiones_ups_display',
  'descripcion_cargas',
  'descripcion_bateria',
  'descripcion_temperatura',
  'descripcion_busdc',
  'descripcion_carga',
  //fotos
  'foto_tensiones_ups_display',
  'foto_cargas_ups',
  'foto_bateria_ups',
  'foto_temperatura',
  'foto_busdc',
  'foto_carga',

  'foto_conexion_cable_red1',
  'foto_conexion_cable_red2',
  'foto_conexion_cable_red3',

  //fotos de validacion de ATM
  'foto_conmutador_manual',
  'foto_atm_funcional',
  'foto_atm_completo',

  'descripcion_conclusiones',
  'descripcion_observacion',
  'descripcion_recomendaciones'
]

const crearInforme = (req, res) => {
  // Validar body
  /*if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Request body JSON esperado' });
  }

  const missing = requiredFields.filter((f) => {
    const v = req.body[f];
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  });

  if (missing.length) {
    return res.status(400).json({ error: 'Faltan campos requeridos', missing });
  }

  // Asegurar carpeta output exista
  const outputDir = path.resolve(__dirname, '../output');
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  } catch (err) {
    console.error('No se pudo crear la carpeta output:', err);
    return res.status(500).json({ error: 'Error creando carpeta temporal' });
  }*/

  // Pasar al generador de documentos (que espera req/res)
  return generarInforme(req, res)
}

// Listar informes: admin ve todos, técnico solo los suyos (CON PAGINACIÓN)
const listarInformes = async (req, res) => {
  try {
    const db = require('../database/db_connect')
    
    // Parámetros de paginación
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15))
    const offset = (page - 1) * limit

    // Query base para contar el total
    let countQuery = `SELECT COUNT(*) as total FROM informes i`
    let dataQuery = `
      SELECT 
        i.id,
        i.nombre_archivo,
        i.created_at,
        u.nombre as usuario_nombre,
        u.email as usuario_email
      FROM informes i
      INNER JOIN usuarios u ON i.usuario_id = u.id
    `
    
    const params = []

    // Si NO es admin, filtrar por usuario
    if (req.user.rol !== 'admin') {
      countQuery += ` WHERE i.usuario_id = ?`
      dataQuery += ` WHERE i.usuario_id = ?`
      params.push(req.user.id)
    }

    dataQuery += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`

    // Ejecutar consultas
    const [countResult] = await db.query(countQuery, req.user.rol !== 'admin' ? [req.user.id] : [])
    const total = countResult[0].total
    const totalPages = Math.ceil(total / limit)

    // Aqui se hace la consulta de los 15 informes
    const [informes] = await db.query(dataQuery, [...params, limit, offset])

    res.json({
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      informes
    })
  } catch (error) {
    console.error('Error listando informes:', error)
    res
      .status(500)
      .json({ error: 'Error al listar informes', details: error.message })
  }
}

// Descargar un informe específico: admin descarga cualquiera, técnico solo los suyos
const descargarInforme = async (req, res) => {
  try {
    const db = require('../database/db_connect')
    const informeId = req.params.id

    let query = 'SELECT nombre_archivo, archivo FROM informes WHERE id = ?';
    const params = [informeId];

    // Si NO es admin, solo puede descargar los suyos
    if (req.user.rol !== 'admin') {
      query += ' AND usuario_id = ?';
      params.push(req.user.id);
    }

    const [rows] = await db.query(query, params)

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Informe no encontrado o no tienes acceso' })
    }

    const informe = rows[0]

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${informe.nombre_archivo}"`
    )   
    res.send(informe.archivo)
  } catch (error) {
    console.error('Error descargando informe:', error)
    res
      .status(500)
      .json({ error: 'Error al descargar informe', details: error.message })
  }
}

// Eliminar un informe: admin elimina cualquiera, técnico solo los suyos
const eliminarInforme = async (req, res) => {
  try {
    const db = require('../database/db_connect')
    const informeId = req.params.id

    let query = 'DELETE FROM informes WHERE id = ?';
    const params = [informeId];

    // Si NO es admin, solo puede eliminar los suyos
    if (req.user.rol !== 'admin') {
      query += ' AND usuario_id = ?';
      params.push(req.user.id);
    }

    const [result] = await db.query(query, params)

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: 'Informe no encontrado o no tienes acceso' })
    }

    res.json({ message: 'Informe eliminado exitosamente' })
  } catch (error) {
    console.error('Error eliminando informe:', error)
    res
      .status(500)
      .json({ error: 'Error al eliminar informe', details: error.message })
  }
}

// Buscar informes: admin busca en todos, técnico solo en los suyos (CON PAGINACIÓN)
const buscarInforme = async (req, res) => {
  try {
    const db = require('../database/db_connect')
    const rawQuery = String(req.body?.q || req.body?.search || req.query.q || req.query.search || '').trim()

    if (!rawQuery) {
      return res.status(400).json({ error: 'Falta el parametro de busqueda' })
    }

    // Parámetros de paginación
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15))
    const offset = (page - 1) * limit

    // Sanitizar input: solo permitir caracteres alfanuméricos, espacios, guiones y guiones bajos
    const sanitizedQuery = rawQuery.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]/g, '')
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return res.status(400).json({ error: 'Búsqueda inválida. Usa al menos 2 caracteres alfanuméricos.' })
    }

    // Limitar cantidad de tokens para evitar queries muy complejas
    const tokens = sanitizedQuery.split(/\s+/).slice(0, 5) // Máximo 5 palabras
    const conditions = tokens.map(() => 'nombre_archivo LIKE ?').join(' OR ')
    const values = tokens.map(token => `%${token}%`)

    let whereClause = conditions
    
    // Si NO es admin, solo busca en sus informes
    if (req.user.rol !== 'admin') {
      whereClause = `(${conditions}) AND usuario_id = ?`
      values.push(req.user.id)
    }

    // Query para contar total
    const countQuery = `SELECT COUNT(*) as total FROM informes WHERE ${whereClause}`
    const [countResult] = await db.query(countQuery, values)
    const total = countResult[0].total
    const totalPages = Math.ceil(total / limit)

    // Query para obtener datos paginados
    const dataQuery = `
      SELECT id, nombre_archivo, created_at
      FROM informes
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const [informes] = await db.query(dataQuery, [...values, limit, offset])

    return res.json({
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      informes
    })
  } catch (error) {
    console.error('error buscando el informe', error)
    return res
      .status(500)
      .json({ error: 'Error al buscar el informe', details: error.message })
  }
}

module.exports = {
  crearInforme,
  listarInformes,
  descargarInforme,
  eliminarInforme,
  buscarInforme
}
