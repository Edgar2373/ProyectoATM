const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido" });
  }
}

// Verificación de rol requerido
const requireRol = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }

    if (!req.user.rol || !roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        message: "Acceso denegado. No tienes permisos suficientes." 
      });
    }

    next();
  }
}

module.exports = { authMiddleware, requireRol };