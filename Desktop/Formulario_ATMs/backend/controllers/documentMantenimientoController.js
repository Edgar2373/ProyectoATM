const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const ImageModule = require("docxtemplater-image-module-free");
const sizeOf = require("image-size");
const db = require("../database/db_connect");
const { enviarNotificacionDocx } = require("./mailController");

const imageBoxes = {
  firma_m: [150, 150],
  foto_frecuencia_m: [250, 150],
  foto_nivel_carga_m: [250, 150],
  foto_estado_baterias_m: [250, 150],
};

const generarInformeMantenimiento = async (req, res) => {
  try {
    console.log("📋 Iniciando generación de informe Mantenimiento Preventivo...");
    console.log("👤 Usuario ID:", req.user?.id);
    console.log("📊 Datos recibidos:", Object.keys(req.body).length, "campos");
    console.log(
      "📸 Imágenes recibidas:",
      Object.keys(req.savedImages || {}).length,
    );

    const templatePath = path.resolve(
      __dirname,
      "../templates/PLANTILLA_MOP_MANTENIMIENTO.docx",
    );
    console.log("📂 Ruta plantilla:", templatePath);
    console.log("✓ ¿Existe?:", fs.existsSync(templatePath));

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Plantilla no encontrada en: ${templatePath}`);
    }

    const content = await fsPromises.readFile(templatePath);
    console.log(`✓ Plantilla cargada: ${content.length} bytes`);

    const ImageOpts = {
      centered: false,
      getImage: (tagValue) => {
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
        try {
          const dimensions = sizeOf(img);
          const originalWidth = dimensions?.width;
          const originalHeight = dimensions?.height;

          if (!originalWidth || !originalHeight) {
            return [250, 150];
          }

          const [maxWidth, maxHeight] = imageBoxes[tagName] || [250, 150];
          const scale = Math.min(
            maxWidth / originalWidth,
            maxHeight / originalHeight,
            1,
          );

          const finalWidth = Math.round(originalWidth * scale);
          const finalHeight = Math.round(originalHeight * scale);
          console.log(`Tamaño proporcional para ${tagName}:`, [finalWidth, finalHeight]);

          return [finalWidth, finalHeight];
        } catch (err) {
          console.error(`Error calculando tamaño para ${tagName}:`, err.message);
          return imageBoxes[tagName] || [250, 150];
        }
      },
    };

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(ImageOpts)],
      nullGetter: function(part) {
        if (!part.module) return '';
        if (part.module === 'rawxml') return '';
        return '';
      },
    });

    // Código MOP incremental
    const anioCorto = String(new Date().getFullYear()).slice(-2);
    const [rows] = await db.query('SELECT MAX(id) as ultimoId FROM mops_mantenimiento');
    const siguienteNumero = (rows[0].ultimoId || 0) + 1;
    const codigoMop = `MOPM.${String(siguienteNumero).padStart(4, '0')}.${anioCorto}`;
    console.log(`🔢 Código MOP Mantenimiento generado: ${codigoMop}`);

    const check = (value) => (value === 'on' || value === true) ? '☑' : '☐';

    doc.render({
      codigo_mop_m: codigoMop,
      titulo_mop_m: req.body.titulo_mop_m || '',
      nombre_lugar_m: req.body.nombre_lugar_m || '',
      num_ticket_m: req.body.num_ticket_m || '',
      fecha_mop_m: req.body.fecha_mop_m || '',
      duracion_mop_m: req.body.duracion_mop_m || '',
      num_ot_m: req.body.num_ot_m || '',
      material_check1: check(req.body.material_check1),
      material_check2: check(req.body.material_check2),
      material_check3: check(req.body.material_check3),
      material_check4: check(req.body.material_check4),
      material_check5: check(req.body.material_check5),
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
      paso18_check: check(req.body.paso18_check),
      paso19_check: check(req.body.paso19_check),
      paso20_check: check(req.body.paso20_check),
      paso21_check: check(req.body.paso21_check),
      valor_entradaln_m: req.body.valor_entradaln_m || '',
      valor_salidaln_m: req.body.valor_salidaln_m || '',
      valor_entradalt_m: req.body.valor_entradalt_m || '',
      valor_salidalt_m: req.body.valor_salidalt_m || '',
      valor_entradant_m: req.body.valor_entradant_m || '',
      valor_salidant_m: req.body.valor_salidant_m || '',
      foto_frecuencia_m: req.savedImages?.foto_frecuencia_m || '',
      foto_nivel_carga_m: req.savedImages?.foto_nivel_carga_m || '',
      foto_estado_baterias_m: req.savedImages?.foto_estado_baterias_m || '',
      descripcion_frecuencia_m: req.body.descripcion_frecuencia_m || '',
      descripcion_nivel_carga_m: req.body.descripcion_nivel_carga_m || '',
      descripcion_estado_baterias_m: req.body.descripcion_estado_baterias_m || '',
      voltaje_entrada_m: req.body.voltaje_entrada_m || '',
      frecuencia_entrada_m: req.body.frecuencia_entrada_m || '',
      voltaje_salida_m: req.body.voltaje_salida_m || '',
      frecuencia_salida_m: req.body.frecuencia_salida_m || '',
      corriente_carga_m: req.body.corriente_carga_m || '',
      nivel_carga_m: req.body.nivel_carga_m || '',
      voltaje_baterias_m: req.body.voltaje_baterias_m || '',
      mop_recomendaciones_m: req.body.mop_recomendaciones_m || '',
      mop_observaciones_m: req.body.mop_observaciones_m || '',
      fecha_visita_m: req.body.fecha_visita_m || '',
      nombre_tecnico_m: req.body.nombre_tecnico_m || '',
      dni_tecnico_m: req.body.dni_tecnico_m || '',
      hora_inicio_m: req.body.hora_inicio_m || '',
      hora_termino_m: req.body.hora_termino_m || '',
      tipo_servicio_m: req.body.tipo_servicio_m || '',
      firma_m: req.savedImages?.firma_m || '',
      nombre_revisador_m: req.body.nombre_revisador_m || '',
      nombre_aprobador_m: req.body.nombre_aprobador_m || '',
      fecha_revisado_mop_m: req.body.fecha_revisado_mop_m || '',
      fecha_aprobado_mop_m: req.body.fecha_aprobado_mop_m || '',
    });

    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const tituloMop = (req.body.titulo_mop_m || 'Sin_titulo').replace(/\s+/g, '_').replace(/[^\w\-_áéíóúñüÁÉÍÓÚÑÜ]/g, '');
    const fechaMop = (req.body.fecha_mop_m || '').replace(/-/g, '-');
    const nombreArchivo = `${tituloMop}_${fechaMop}_MOP_Mantenimiento_Preventivo.docx`;
    const usuarioId = req.user.id;

    const [result] = await db.query(
      "INSERT INTO mops_mantenimiento (usuario_id, nombre_archivo, archivo) VALUES (?, ?, ?)",
      [usuarioId, nombreArchivo, buf],
    );

    console.log(
      `✅ MOP Mantenimiento guardado en BD - ID: ${result.insertId}, Usuario: ${req.user.id}`,
    );

    enviarNotificacionDocx(nombreArchivo, req.user.id).catch(err =>
      console.error('Email no enviado:', err.message)
    );

    res.json({
      message: "Informe de Mantenimiento Preventivo guardado exitosamente",
      nombreArchivo,
      informeId: result.insertId,
    });
  } catch (error) {
    console.error("Error generando el documento:", error);
    res.status(500).json({
      error: "Error interno al procesar el documento",
      details: error.message,
    });
  }
};

module.exports = { generarInformeMantenimiento };