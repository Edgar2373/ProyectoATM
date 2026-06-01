const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const db = require('../database/db_connect')

async function loginUsuario(req, res) {
  try {
    console.log(' Login request recibido:', req.body)
    const { username, password } = req.body

    if (!username || !password) {
      console.log('❌ Faltan credenciales')
      return res.status(400).json({ message: 'Usuario y contraseña requeridos' })
    }
    
    // Buscar usuario en la BD
    console.log(' Buscando usuario:', username)
    const [rows] = await db.query('SELECT * FROM usuarios WHERE nombre = ?', [username])
    const user = rows[0]

    if (!user) {
      console.log('❌ Usuario no encontrado')
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    console.log('✅ Usuario encontrado:', user.nombre)
    
    // Comparar contraseña (la columna en BD es 'password')
    const passwordValida = await bcrypt.compare(password, user.password)

    if (!passwordValida) {
      console.log('❌ Contraseña incorrecta')
      return res.status(401).json({ message: 'Contraseña incorrecta' })
    }

    console.log('✅ Contraseña válida, generando token...')
    
    // Generar token
    const token = jwt.sign(
      { id: user.id, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )

    // Enviar cookie con token
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 43200000
})

    console.log('✅ Login exitoso para:', user.nombre)
    
    // Enviar respuesta UNA SOLA VEZ
    res.json({ message: 'Login exitoso', token, user: { id: user.id, nombre: user.nombre, rol: user.rol } })
  } catch (error) {
    console.error('❌ Error en login:', error)
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = { loginUsuario }