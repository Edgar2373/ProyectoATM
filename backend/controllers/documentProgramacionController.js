const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const { execFileSync } = require('child_process')
const ImageModule = require('docxtemplater-image-module-free')
const sizeOf = require('image-size')
const db = require('../database/db_connect')
const { enviarNotificacionDocx } = require('./mailController')

const imageSizes = {
  firma: [150, 150]
}

// Función helper para convertir checkbox a símbolo Unicode asd
const check = (value) => (value === 'on' || value === true) ? '☑' : '☐'

const generarInformeProgramacion = async (req, res) => {
  try {
    console.log('📋 Iniciando generación de informe...')
    console.log('👤 Usuario ID:', req.user?.id)
    console.log('📊 Datos recibidos:', Object.keys(req.body).length, 'campos')
    console.log(
      '📸 Imágenes recibidas:',
      Object.keys(req.savedImages || {}).length
    )

    // 1. Cargar el contenido de tu plantilla
    const templatePath = path.resolve(
      __dirname,
      '../templates/PLANTILLA_MOP_PROGRAMACIÓN.docx'
    )
    console.log('📂 Ruta plantilla:', templatePath)
    console.log('✓ ¿Existe?:', fs.existsSync(templatePath))
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Plantilla no encontrada en: ${templatePath}`)
    }
    
    console.log('📖 Leyendo plantilla...') 
    // Usar async para lectura
    const content = await fsPromises.readFile(templatePath)
    console.log(`✓ Plantilla cargada: ${content.length} bytes`)

    const ImageOpts = {
      centered: false,
      getImage: tagValue => {
        // tagValue puede ser ruta absoluta o relativa
        if (!tagValue) return null
        try {
          const absolutePath = path.resolve(__dirname, '..', tagValue)
          console.log('Intentando leer imagen desde:', absolutePath)
          return fs.readFileSync(absolutePath)
        } catch (err) {
          console.error(`Error leyendo imagen: ${tagValue}`, err.message)
          return null
        }
      },
      getSize: (img, tagValue, tagName) => {
        // Usar tamaño específico según el tipo de imagen
        if (imageSizes[tagName]) {
          console.log(`Tamaño para ${tagName}:`, imageSizes[tagName])
          return imageSizes[tagName]
        }
        // Fallback si no existe configuración
        return [250, 150]
      }
    }

    // 2. Configurar PizZip y Docxtemplater
    console.log('⚙️ Configurando PizZip...')
    const zip = new PizZip(content)
    console.log('✓ PizZip listo')
    
    console.log('⚙️ Configurando Docxtemplater...')
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(ImageOpts)],
      // IMPORTANTE: Manejar valores undefined/null para que no aparezca "undefined" en el documento
      nullGetter: function(part) {
        // Para tags que no tienen valor, devolver string vacío en vez de "undefined"
        if (!part.module) {
          return ''
        }
        if (part.module === 'rawxml') {
          return ''
        }
        return ''
      }
    })
    console.log('✓ DocxTemplater configurado')
    
    // MOP incremental - Generar código basado en el último ID de mops_programacion
    const anioCorto = String(new Date().getFullYear()).slice(-2) // 2026 → "26"
    const [rows] = await db.query('SELECT MAX(id) as ultimoId FROM mops_programacion')
    const siguienteNumero = (rows[0].ultimoId || 0) + 1
    const codigoMop = `MOPP.${String(siguienteNumero).padStart(4, '0')}.${anioCorto}`
    console.log(`🔢 Código MOP Programación generado: ${codigoMop}`)

    // 3. Mapear los datos del JSON (req.body) y las fotos (req.file) a las etiquetas del Word
    // Aquí usamos los nombres exactos que pusimos en la plantilla
    console.log('🔄 Preparando datos para renderizar...')
    const renderData = {
      titulo_procedimiento_programacion: req.body.titulo_procedimiento_programacion || '',
      codigo_mop: codigoMop,  // Usar el código incremental generado
      nombre_lugar: req.body.nombre_lugar || '',
      num_ticket: req.body.num_ticket || '',
      fecha_mop: req.body.fecha_mop || '',
      duracion_mop: req.body.duracion_mop || '',
      material_check1: check(req.body.material_check1),
      material_check2: check(req.body.material_check2),
      material_check3: check(req.body.material_check3),
      material_check4: check(req.body.material_check4),
      paso1_check: check(req.body.paso1_check),
      paso2_check: check(req.body.paso2_check),
      paso3_check: check(req.body.paso3_check),
      paso4_check: check(req.body.paso4_check),
      paso5_check: check(req.body.paso5_check),
      paso6_check: check(req.body.paso6_check),
      paso7_check: check(req.body.paso7_check),
      paso8_check: check(req.body.paso8_check),
      paso9_check: check(req.body.paso9_check),
      paso10_check: check(req.body.paso10_check),
      paso11_check: check(req.body.paso11_check),
      paso12_check: check(req.body.paso12_check),
      paso13_check: check(req.body.paso13_check),
      paso14_check: check(req.body.paso14_check),
      paso15_check: check(req.body.paso15_check),
      paso16_check: check(req.body.paso16_check),
      paso17_check: check(req.body.paso17_check),
      paso18_check: check(req.body.paso18_check),
      paso19_check: check(req.body.paso19_check),
      paso20_check: check(req.body.paso20_check),
      paso21_check: check(req.body.paso21_check),
      valor_entradaln: req.body.valor_entradaln || '',
      valor_salidaln: req.body.valor_salidaln || '',
      valor_entradalt: req.body.valor_entradalt || '',
      valor_salidalt: req.body.valor_salidalt || '',
      valor_entradant: req.body.valor_entradant || '',
      valor_salidant: req.body.valor_salidant || '',
      ups_valor_entradaln: req.body.ups_valor_entradaln || '',
      ups_valor_salidaln: req.body.ups_valor_salidaln || '',
      ups_valor_entradalt: req.body.ups_valor_entradalt || '',
      ups_valor_salidalt: req.body.ups_valor_salidalt || '',
      ups_valor_entradant: req.body.ups_valor_entradant || '',
      ups_valor_salidant: req.body.ups_valor_salidant || '',
      mop_recomendaciones: req.body.mop_recomendaciones || '',
      mop_observaciones: req.body.mop_observaciones || '',
      fecha_visita: req.body.fecha_visita || '',
      nombre_tecnico: req.body.nombre_tecnico || '',
      dni_tecnico: req.body.dni_tecnico || '',
      hora_inicio: req.body.hora_inicio || '',
      hora_termino: req.body.hora_termino || '',
      tipo_servicio: req.body.tipo_servicio || '',
      firma: req.savedImages?.firma || '',
      nombre_revisador: req.body.nombre_revisador || '',
      nombre_aprobador: req.body.nombre_aprobador || '',
      fecha_revisado_mop: req.body.fecha_revisado_mop || '',
      fecha_aprobado_mop: req.body.fecha_aprobado_mop || ''
    }

    console.log('📋 Datos listos. Renderizando documento...')
    doc.render(renderData)
    console.log('✓ Documento renderizado exitosamente')

    // 4. Generar el archivo resultante
    console.log('💾 Generando buffer del documento...')
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })
    console.log(`✓ Buffer generado: ${buf.length} bytes`)

    // 5. Guardar en la base de datos
    const nombreArchivo = `${codigoMop}_Programación.docx`
    const usuarioId = req.user.id // Del authMiddleware
    
    console.log('💾 Guardando en base de datos...')
    console.log(`   - Usuario ID: ${usuarioId}`)
    console.log(`   - Código MOP: ${codigoMop}`)
    console.log(`   - Archivo: ${nombreArchivo}`)
    console.log(`   - Tamaño: ${buf.length} bytes`)
    
    const [result] = await db.query(
      'INSERT INTO mops_programacion (usuario_id, nombre_archivo, archivo) VALUES (?, ?, ?)',
      [usuarioId, nombreArchivo, buf]
    )

    console.log(
      `✅ MOP Programación guardado en BD - ID: ${result.insertId}, Usuario: ${req.user.id}`
    )

    // Enviar notificación de email en background (no bloquea el proceso)
    enviarNotificacionDocx(nombreArchivo, req.user.id).catch(err =>
      console.error('Email no enviado:', err.message)
    )


    // 6. Responder con JSON (siempre)
    res.json({
      message: 'Informe guardado exitosamente',
      nombreArchivo,
      informeId: result.insertId
    })
  } catch (error) {
    console.error('❌ ERROR GRAVE generando el documento')
    console.error('   Tipo:', error.constructor.name)
    console.error('   Mensaje:', error.message)
    console.error('   Stack:', error.stack)
    
    // Limpiar archivos en caso de error - YA NO NECESARIO
    /*
    Object.values(req.savedImages || {}).forEach(imagePath => {
      try {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
      } catch (err) {
        console.error('Error limpiando archivo temporal:', err.message)
      }
    })
    */
    
    res.status(500).json({
      error: 'Error interno al procesar el documento',
      details: error.message,
      type: error.constructor.name
    })
  }
}

module.exports = { generarInformeProgramacion }
