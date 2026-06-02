const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Gmail
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const enviarNotificacionDocx = async (nombreArchivo, usuarioId) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_DESTINO,
      subject: `Nuevo Informe generado: ${nombreArchivo}`,
      text: `Se ha generado un nuevo Informe.\n\nNombre: ${nombreArchivo}\nUsuario ID: ${usuarioId}`
    });
    console.log(' Notificación enviada por email');
  } catch (error) {
    console.error(' Error enviando email :', error.message);
  }
};

module.exports = { enviarNotificacionDocx };