const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const { execFileSync } = require('child_process');
const ImageModule = require("docxtemplater-image-module-free");
const sizeOf = require('image-size');
const db = require('../database/db_connect');
const {enviarNotificacionDocx} = require('./mailController')

// Configurar tamaños específicos para cada tipo de imagen
const imageSizes = {
    fotoups: [150, 200],
    fototransformador: [150, 200],
    fototarjetared: [150, 200],
    
    //condiciones iniciales
    foto_condicion1: [150, 200],
    foto_condicion2: [150, 200],
    foto_condicion3: [150, 200],

    //desconexion y retiro
    foto_desconexion_y_retiro1: [150, 250],
    foto_desconexion_y_retiro2: [150, 250],
    foto_desconexion_y_retiro3: [150, 250],

    //instalacion y conexion
    foto_instalacion_conexion1: [150, 250],
    foto_instalacion_conexion2: [150, 250],
    foto_instalacion_conexion3: [150, 250],

    //tension de entrada
    foto_tension_entrada1: [150, 250],
    foto_tension_entrada2: [150, 250],
    foto_tension_entrada3: [150, 250],

    //tension de salida
    foto_tension_salida1: [150, 250],
    foto_tension_salida2: [150, 250],
    foto_tension_salida3: [150, 250],

    //tension de salida ups    
    foto_tension_salidaups1: [150, 250],
    foto_tension_salidaups2: [150, 250],
    foto_tension_salidaups3: [150, 250],

    //estado de ups
    foto_conmutador: [150, 150],
    foto_conmutador_estado: [150, 150],
    foto_conmutador_alarmas: [150, 150],

    //tensiones de ups display, cargas y bateria
    foto_tensiones_ups_display: [150, 150],
    foto_cargas_ups: [150, 150],
    foto_bateria_ups: [150, 150],

    //temperatura, busdc y carga
    foto_temperatura: [150, 150],
    foto_busdc: [150, 150],
    foto_carga: [150, 150],

    //conexion de cable de red y validacion por monitoreo
    foto_conexion_cable_red1: [150, 250],
    foto_conexion_cable_red2: [150, 250],
    foto_conexion_cable_red3: [150, 250],

    //validacion de ATM operativo en posicion UPS
    foto_conmutador_manual: [150, 150],
    foto_atm_funcional: [150, 150],
    foto_atm_completo: [150, 150],
};

const generarInforme = async (req, res) => {
    try {
        console.log('📋 Iniciando generación de informe...');
        console.log('👤 Usuario ID:', req.user?.id);
        console.log('📊 Datos recibidos:', Object.keys(req.body).length, 'campos');
        console.log('📸 Imágenes recibidas:', Object.keys(req.savedImages || {}).length);
        
        // 1. Cargar el contenido de tu plantilla 
        const templatePath = path.resolve(__dirname, "../templates/PLANTILLA.docx");
        console.log('📂 Plantilla ruta:', templatePath);
        
        // Usar async para lectura
        const content = await fsPromises.readFile(templatePath);

        const ImageOpts = {
            centered: false,
            getImage: (tagValue) => {
                // tagValue es la ruta de la imagen, leer el archivo
                if (!tagValue) return null;
                try {
                    // Convertir ruta relativa a absoluta
                    const absolutePath = path.resolve(__dirname, '..', tagValue);
                    console.log('Intentando leer imagen:', absolutePath);
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
            }
        }

        // 2. Configurar PizZip y Docxtemplater
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            modules: [new ImageModule(ImageOpts)]
        });

        // Código de informe técnico incremental
        const anioCorto = String(new Date().getFullYear()).slice(-2); // 2026 → "26"
        const [rows] = await db.query('SELECT MAX(id) as ultimoId FROM informes');
        const siguienteNumero = (rows[0].ultimoId || 0) + 1;
        const codigoInformeTecnico = `IT.${String(siguienteNumero).padStart(4, '0')}.${anioCorto}`;
        console.log(`🔢 Código IT generado: ${codigoInformeTecnico}`);

        // 3. Mapear los datos del JSON (req.body) y las fotos (req.file) a las etiquetas del Word 
        // Aquí usamos los nombres exactos que pusimos en la plantilla
        
        doc.render({
            nombre_actividad: req.body.nombre_actividad || '',
            fecha_ejecucion: req.body.fecha_ejecucion,
            nombre_lugar: req.body.nombre_lugar,
            nombre_direccion: req.body.nombre_direccion,
            //fotos - Usar las rutas guardadas en lugar de los objetos de Multer
            fotoups: req.savedImages?.fotoups || '',
            fototransformador: req.savedImages?.fototransformador || '', 
            fototarjetared: req.savedImages?.fototarjetared || '',

            num_serie_ups: req.body.num_serie_ups,
            num_serie_transformador: req.body.num_serie_transformador,
            num_serie_tarjetared: req.body.num_serie_tarjetared,
            num_mac_tarjetared: req.body.num_mac_tarjetared,

            nombre_del_elaborador: req.body.nombre_del_elaborador,
            fecha_elaboracion: req.body.fecha_elaboracion,
            fecha_revisado: req.body.fecha_revisado,
            fecha_aprobado: req.body.fecha_aprobado,
            codigo_informe_tecnico: codigoInformeTecnico,  // Usar código incremental
            descripcion_antecedente: req.body.descripcion_antecedente,
            num_serie_ups: req.body.num_serie_ups,
            num_serie_transformador: req.body.num_serie_transformador,
            num_serie_tarjetared: req.body.num_serie_tarjetared,
            num_mac_tarjetared: req.body.num_mac_tarjetared,

            condicion_inicial_site: req.body.condicion_inicial_site,
            descripcion_condicion1: req.body.descripcion_condicion1,
            descripcion_condicion2: req.body.descripcion_condicion2,
            descripcion_condicion3: req.body.descripcion_condicion3,
            //fotos
            foto_condicion1: req.savedImages?.foto_condicion1 || '',
            foto_condicion2: req.savedImages?.foto_condicion2 || '',
            foto_condicion3: req.savedImages?.foto_condicion3 || '',

            descripcion_desconexion_y_retiro1: req.body.descripcion_desconexion_y_retiro1,
            descripcion_desconexion_y_retiro2: req.body.descripcion_desconexion_y_retiro2,
            descripcion_desconexion_y_retiro3: req.body.descripcion_desconexion_y_retiro3,
            //fotos
            foto_desconexion_y_retiro1: req.savedImages?.foto_desconexion_y_retiro1 || '',
            foto_desconexion_y_retiro2: req.savedImages?.foto_desconexion_y_retiro2 || '',
            foto_desconexion_y_retiro3: req.savedImages?.foto_desconexion_y_retiro3 || '',

            descripcion_instalacion_conexion1: req.body.descripcion_instalacion_conexion1,
            descripcion_instalacion_conexion2: req.body.descripcion_instalacion_conexion2,
            descripcion_instalacion_conexion3: req.body.descripcion_instalacion_conexion3,
            //fotos
            foto_instalacion_conexion1: req.savedImages?.foto_instalacion_conexion1 || '',
            foto_instalacion_conexion2: req.savedImages?.foto_instalacion_conexion2 || '',
            foto_instalacion_conexion3: req.savedImages?.foto_instalacion_conexion3 || '',

            descripcion_tension_entrada1: req.body.descripcion_tension_entrada1,
            descripcion_tension_entrada2: req.body.descripcion_tension_entrada2,
            descripcion_tension_entrada3: req.body.descripcion_tension_entrada3,
            //fotos
            foto_tension_entrada1: req.savedImages?.foto_tension_entrada1 || '',
            foto_tension_entrada2: req.savedImages?.foto_tension_entrada2 || '',
            foto_tension_entrada3: req.savedImages?.foto_tension_entrada3 || '',

            descripcion_tension_salida1: req.body.descripcion_tension_salida1,
            descripcion_tension_salida2: req.body.descripcion_tension_salida2,
            descripcion_tension_salida3: req.body.descripcion_tension_salida3,
            //fotos
            foto_tension_salida1: req.savedImages?.foto_tension_salida1 || '',
            foto_tension_salida2: req.savedImages?.foto_tension_salida2 || '',
            foto_tension_salida3: req.savedImages?.foto_tension_salida3 || '',

            descripcion_tension_salidaups1: req.body.descripcion_tension_salidaups1,
            descripcion_tension_salidaups2: req.body.descripcion_tension_salidaups2,
            descripcion_tension_salidaups3: req.body.descripcion_tension_salidaups3,
            //fotos
            foto_tension_salidaups1: req.savedImages?.foto_tension_salidaups1 || '',
            foto_tension_salidaups2: req.savedImages?.foto_tension_salidaups2 || '',
            foto_tension_salidaups3: req.savedImages?.foto_tension_salidaups3 || '',

            estado_ups_detalles: req.body.estado_ups_detalles,
            //fotos
            foto_conmutador: req.savedImages?.foto_conmutador || '',
            foto_conmutador_estado: req.savedImages?.foto_conmutador_estado || '',
            foto_conmutador_alarmas: req.savedImages?.foto_conmutador_alarmas || '',

            descripcion_tensiones_ups_display: req.body.descripcion_tensiones_ups_display,
            descripcion_cargas: req.body.descripcion_cargas,
            descripcion_bateria: req.body.descripcion_bateria,
            //fotos
            foto_tensiones_ups_display: req.savedImages?.foto_tensiones_ups_display || '',
            foto_cargas_ups: req.savedImages?.foto_cargas_ups || '',
            foto_bateria_ups: req.savedImages?.foto_bateria_ups || '',

            descripcion_temperatura: req.body.descripcion_temperatura,
            descripcion_busdc: req.body.descripcion_busdc,
            descripcion_carga: req.body.descripcion_carga,
            //fotos
            foto_temperatura: req.savedImages?.foto_temperatura || '',
            foto_busdc: req.savedImages?.foto_busdc || '',
            foto_carga: req.savedImages?.foto_carga || '',

            //fotos conexion de cable de erd y validacion por monitoreo
            foto_conexion_cable_red1: req.savedImages?.foto_conexion_cable_red1 || '',
            foto_conexion_cable_red2: req.savedImages?.foto_conexion_cable_red2 || '',
            foto_conexion_cable_red3: req.savedImages?.foto_conexion_cable_red3 || '',

            //fotos validacion de ATM operativo en posicion UPS
            foto_conmutador_manual: req.savedImages?.foto_conmutador_manual || '',
            foto_atm_funcional: req.savedImages?.foto_atm_funcional || '',
            foto_atm_completo: req.savedImages?.foto_atm_completo || '',

            descripcion_conclusiones: req.body.descripcion_conclusiones,
            descripcion_observacion: req.body.descripcion_observacion,
            descripcion_recomendaciones: req.body.descripcion_recomendaciones,

        });

        // 4. Generar el archivo resultante
        const buf = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        // 5. Guardar en la base de datos
        const nombreArchivo = `INFORME_${codigoInformeTecnico}_${req.body.nombre_lugar || 'SinLugar'}.docx`;
        const usuarioId = req.user.id; // Del authMiddleware

        console.log(`   - Código IT: ${codigoInformeTecnico}`);
        console.log(`   - Archivo: ${nombreArchivo}`);

        const [result] = await db.query(
            'INSERT INTO informes (usuario_id, nombre_archivo, archivo) VALUES (?, ?, ?)',
            [usuarioId, nombreArchivo, buf]
        );

        console.log(`✅ Informe guardado en BD - ID: ${result.insertId}, Usuario: ${req.user.id}`);
        
        // Enviar notificación de email en background (no bloquea el proceso)
        enviarNotificacionDocx(nombreArchivo, req.user.id).catch(err => 
          console.error('Email no enviado:', err.message)
        );

        // Limpiar archivos temporales de uploads (async)
        console.log('🧹 Limpiando archivos temporales...');
        const deletePromises = Object.entries(req.savedImages || {}).map(async ([fieldName, imagePath]) => {
            try {
                await fsPromises.unlink(imagePath);
                console.log(`   ✓ Eliminado: ${fieldName}`);
            } catch (err) {
                console.error(`   ⚠️  No se pudo eliminar ${fieldName}:`, err.message);
            }
        });
        await Promise.all(deletePromises);
        console.log('✅ Limpieza completada');

        // 6. Responder segun rol: admin descarga, tecnico solo confirma guardado
        if (req.user?.rol === 'admin') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.send(buf);
        } else {
            res.json({
                message: 'Informe guardado',
                nombreArchivo,
                informeId: result.insertId
            });
        }

    } catch (error) {
        console.error("Error generando el documento:", error);
        // Limpiar archivos en caso de error
        Object.values(req.savedImages || {}).forEach(imagePath => {
            try {
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            } catch (err) {
                console.error('Error limpiando archivo temporal:', err.message);
            }
        });
        res.status(500).json({ error: "Error interno al procesar el documento", details: error.message });
    }
};



module.exports = { generarInforme };