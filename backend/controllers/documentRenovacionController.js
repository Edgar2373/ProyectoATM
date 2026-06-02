const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const { execFileSync } = require("child_process");
const ImageModule = require("docxtemplater-image-module-free");
const sizeOf = require("image-size");
const db = require("../database/db_connect");
const { enviarNotificacionDocx } = require("./mailController");

const imageSizes = {
  firma_r: [150, 150],
};

const generarInformeRenovacion = async (req, res) => {
  try {
    console.log("📋 Iniciando generación de informe...");
    console.log("👤 Usuario ID:", req.user?.id);
    console.log("📊 Datos recibidos:", Object.keys(req.body).length, "campos");
    console.log(
      "📸 Imágenes recibidas:",
      Object.keys(req.savedImages || {}).length,
    );

    // 1. Cargar el contenido de tu plantilla
    const templatePath = path.resolve(
      __dirname,
      "../templates/PLANTILLA_MOP_RENOVACIÓN.docx",
    );
    // Usar async para lectura
    const content = await fsPromises.readFile(templatePath);

    const ImageOpts = {
      centered: false,
      getImage: (tagValue) => {
        // tagValue es la ruta del archivo de imagen
        if (!tagValue) return null;
        try {
          const absolutePath = path.resolve(__dirname, '..', tagValue);
          console.log('Intentando leer imagen desde:', absolutePath);
          return fs.readFileSync(absolutePath);
        } catch (err) {
          console.error(`Error leyendo imagen: ${tagValue}`, err.message);
          return null;
        }
      },
      getSize: (img, tagValue, tagName) => {
        // Usar tamaño específico según el tipo de imagen
        if (imageSizes[tagName]) {
          console.log(`Tamaño para ${tagName}:`, imageSizes[tagName]);
          return imageSizes[tagName];
        }
        // Fallback si no existe configuración
        return [250, 150];
      },
    };

    // 2. Configurar PizZip y Docxtemplater
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(ImageOpts)],
      // Manejar valores undefined/null para que no aparezca "undefined" en el documento
      nullGetter: function(part) {
        if (!part.module) return ''
        if (part.module === 'rawxml') return ''
        return ''
      }
    });
    // MOP incremental - Generar código basado en el último ID de mops_renovacion
    const anioCorto = String(new Date().getFullYear()).slice(-2) // 2026 → "26"
    const [rows] = await db.query('SELECT MAX(id) as ultimoId FROM mops_renovacion')
    const siguienteNumero = (rows[0].ultimoId || 0) + 1
    const codigoMop = `MOPR.${String(siguienteNumero).padStart(4, '0')}.${anioCorto}`
    console.log(`🔢 Código MOP Renovación generado: ${codigoMop}`)
    
    // Función helper para convertir checkbox a símbolo Unicode
    const check = (value) => (value === 'on' || value === true) ? '☑' : '☐'
    
    // 3. Mapear los datos del JSON (req.body) y las fotos (req.file) a las etiquetas del Word
    // Aquí usamos los nombres exactos que pusimos en la plantilla
    doc.render({
      codigo_mop_r: codigoMop,
      titulo_mop_r: req.body.titulo_mop_r,
      fecha_mop_r: req.body.fecha_mop_r,
      duracion_mop_r: req.body.duracion_mop_r,
      marca_ups_r: req.body.marca_ups_r,
      material_check1_r: check(req.body.material_check1_r),
      material_check2_r: check(req.body.material_check2_r),
      material_check3_r: check(req.body.material_check3_r),
      material_check4_r: check(req.body.material_check4_r),
      paso1_check_r: check(req.body.paso1_check_r),
      paso2_check_r: check(req.body.paso2_check_r),
      paso3_check_r: check(req.body.paso3_check_r),
      paso4_check_r: check(req.body.paso4_check_r),
      paso5_check_r: check(req.body.paso5_check_r),
      paso6_check_r: check(req.body.paso6_check_r),
      paso7_check_r: check(req.body.paso7_check_r),
      paso8_check_r: check(req.body.paso8_check_r),
      paso9_check_r: check(req.body.paso9_check_r),
      paso10_check_r: check(req.body.paso10_check_r),
      paso11_check_r: check(req.body.paso11_check_r),
      paso12_check_r: check(req.body.paso12_check_r),
      paso13_check_r: check(req.body.paso13_check_r),
      paso14_check_r: check(req.body.paso14_check_r),
      paso15_check_r: check(req.body.paso15_check_r),
      paso16_check_r: check(req.body.paso16_check_r),
      paso17_check_r: check(req.body.paso17_check_r),
      paso18_check_r: check(req.body.paso18_check_r),
      paso19_check_r: check(req.body.paso19_check_r),
      paso20_check_r: check(req.body.paso20_check_r),
      paso21_check_r: check(req.body.paso21_check_r),
      valor_entradaln_r: req.body.valor_entradaln_r,
      valor_entradalt_r: req.body.valor_entradalt_r,
      valor_entradant_r: req.body.valor_entradant_r,
      valor_salidaln_r: req.body.valor_salidaln_r,
      valor_salidalt_r: req.body.valor_salidalt_r,
      valor_salidant_r: req.body.valor_salidant_r,
      ups_valor_entradaln_r: req.body.ups_valor_entradaln_r,
      ups_valor_salidaln_r: req.body.ups_valor_salidaln_r,
      ups_valor_entradalt_r: req.body.ups_valor_entradalt_r,
      ups_valor_salidalt_r: req.body.ups_valor_salidalt_r,
      ups_valor_entradant_r: req.body.ups_valor_entradant_r,
      ups_valor_salidant_r: req.body.ups_valor_salidant_r,
      mop_recomendaciones_r: req.body.mop_recomendaciones_r,
      mop_observaciones_r: req.body.mop_observaciones_r,
      fecha_visita_r: req.body.fecha_visita_r,
      nombre_tecnico_r: req.body.nombre_tecnico_r,
      dni_tecnico_r: req.body.dni_tecnico_r,
      hora_inicio_r: req.body.hora_inicio_r,
      hora_termino_r: req.body.hora_termino_r,
      tipo_servicio_r: req.body.tipo_servicio_r,
      firma_r: req.savedImages?.firma_r || '',
      fecha_revisado_mop_r: req.body.fecha_revisado_mop_r,
      fecha_aprobado_mop_r: req.body.fecha_aprobado_mop_r,
    });

    // 4. Generar el archivo resultante
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // 5. Guardar en la base de datos
    const nombreArchivo = `${codigoMop}_Renovacion.docx`;
    const usuarioId = req.user.id; // Del authMiddleware

    const [result] = await db.query(
      "INSERT INTO mops_renovacion (usuario_id, nombre_archivo, archivo) VALUES (?, ?, ?)",
      [usuarioId, nombreArchivo, buf],
    );

    console.log(
      `✅ MOP Renovación guardado en BD - ID: ${result.insertId}, Usuario: ${req.user.id}`,
    );

    // Enviar notificación de email en background (no bloquea el proceso)
    enviarNotificacionDocx(nombreArchivo, req.user.id).catch(err =>
      console.error('Email no enviado:', err.message)
    )

    // Limpiar archivos temporales de uploads (async) - YA NO NECESARIO
    /*
    console.log('🧹 Limpiando archivos temporales...')
    const deletePromises = Object.entries(req.savedImages || {}).map(
      async ([fieldName, imagePath]) => {
        try {
          await fsPromises.unlink(imagePath)
          console.log(`   ✓ Eliminado: ${fieldName}`)
        } catch (err) {
          console.error(`   ⚠️  No se pudo eliminar ${fieldName}:`, err.message)
        }
      }
    )
    await Promise.all(deletePromises)
    console.log('✅ Limpieza completada')
    */

    // 6. Responder con JSON (siempre)
    res.json({
      message: "Informe guardado exitosamente",
      nombreArchivo,
      informeId: result.insertId,
    });
  } catch (error) {
    console.error("Error generando el documento:", error);
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
      error: "Error interno al procesar el documento",
      details: error.message,
    });
  }
};

module.exports = { generarInformeRenovacion };
