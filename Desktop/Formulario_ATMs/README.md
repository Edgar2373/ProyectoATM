# 📋 Sistema de Informes Técnicos - UPS/ATM

Sistema completo de gestión de informes técnicos con autenticación JWT, generación de documentos Word y almacenamiento en base de datos.

## 🚀 Características

✅ **Autenticación JWT** - Login seguro con cookies httpOnly  
✅ **Generación de Informes** - Genera documentos Word (.docx) con plantilla personalizada  
✅ **Carga de Imágenes** - Soporta múltiples fotos por sección  
✅ **Base de Datos MySQL** - Almacena usuarios e informes generados  
✅ **Descarga Automática** - Los informes se descargan directamente al navegador  
✅ **Gestión de Informes** - Lista, descarga y elimina informes guardados  
✅ **Diseño Responsive** - Interfaz moderna con Tailwind CSS  

---

## 📁 Estructura del Proyecto

```
Formulario_ATMs/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Autenticación y login
│   │   ├── documentController.js   # Generación de Word
│   │   └── informeController.js    # CRUD de informes
│   ├── database/
│   │   ├── db_connect.js           # Conexión MySQL
│   │   └── createInformesTable.js  # Script de BD
│   ├── middleware/
│   │   └── authMiddleware.js       # Verificación JWT
│   ├── templates/
│   │   └── PLANTILLA.docx          # Plantilla Word
│   ├── uploads/                    # Carpeta de imágenes
│   ├── .env                        # Variables de entorno
│   ├── package.json
│   └── server.js                   # Servidor Express
│
└── frontend/
    ├── index.html                  # Página principal (redirección)
    ├── login.html                  # Pantalla de login
    ├── formulario_completo.html    # Formulario de informe
    └── mis_informes.html           # Lista de informes guardados
```

---

## 🛠️ Instalación

### 1. Requisitos Previos

- **Node.js** v16+ ([descargar](https://nodejs.org/))
- **MySQL** 8.0+ ([descargar](https://dev.mysql.com/downloads/))
- **Git** ([descargar](https://git-scm.com/))

### 2. Clonar el repositorio
### NOTA: Se tiene que vincular el correo de colaborador a la cuenta de git
```bash
git clone <tu-repositorio>
cd Formulario_ATMs
```

### 3. Configurar Backend
### Para descargar las dependencias
```bash
cd backend
npm install
```

### 4. Configurar Base de Datos
#### Crear base de datos

```sql
CREATE DATABASE formulario_atms;
USE formulario_atms;
```

#### Crear tabla de usuarios

```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'tecnico',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Crear tabla de informes

```sql
CREATE TABLE informes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  archivo LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

### 5. Configurar Variables de Entorno

Crear archivo `.env` en `backend/`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=formulario_atms
DB_PORT=3306
PORT=3000
JWT_SECRET=tu_secreto_super_seguro_cambialo_en_produccion
NODE_ENV=development
```

### 6. Iniciar el Servidor

```bash
node server.js
```

Deberías ver:
```
✅ Conexión a la base de datos establecida
🚀 Servidor funcionando en el puerto 3000
```

---

## 🎯 Uso del Sistema

### 1. Abrir la Aplicación

Abre `frontend/index.html` en tu navegador o usa Live Server:

```
http://localhost:5500/frontend/index.html
```

### 2. Iniciar Sesión

**Credenciales de prueba:**
- **Usuario:** `admin`
- **Password:** `admin123`

O:
- **Usuario:** `tecnico`
- **Password:** `tecnico123`

### 3. Crear un Informe

1. Después del login, serás redirigido al formulario
2. Completa todas las secciones requeridas:
   - Datos generales
   - Identificación de equipos
   - Condiciones iniciales
   - Desconexión y retiro
   - Instalación y conexión
   - Tensiones (entrada, salida, salida UPS)
   - Estado del UPS
   - Parámetros del display
   - Parámetros internos
   - Conexión de red
   - Validación ATM
   - Conclusiones
3. Sube las fotos requeridas (JPG, PNG)
4. Haz clic en **"Generar y Descargar Informe"**
5. El documento Word se descargará automáticamente

### 4. Ver Informes Guardados

1. Haz clic en **"Mis informes"** en el header
2. Verás la lista de todos tus informes
3. Puedes:
   - Descargar cualquier informe
   - Eliminar informes antiguos
   - Ver estadísticas (total, este mes, último)

---

## 🔑 API Endpoints

### Autenticación

#### POST `/api/login`
Login de usuario


**Response:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nombre": "admin",
    "rol": "admin"
  }
}
```

### Informes (requieren autenticación)

#### POST `/api/informes/crear`
Genera un nuevo informe

**Content-Type:** `multipart/form-data`

**Body:** Todos los campos del formulario + archivos de imagen

**Response:** Archivo .docx descargable

---

#### GET `/api/informes`
Lista todos los informes del usuario autenticado

**Response:**
```json
{
  "total": 5,
  "informes": [
    {
      "id": 1,
      "nombre_archivo": "INFORME_DOC-2026-001.docx",
      "created_at": "2026-02-24T10:30:00.000Z",
      "usuario_nombre": "admin",
      "usuario_email": "admin@ejemplo.com"
    }
  ]
}
```

---

#### GET `/api/informes/:id/download`
Descarga un informe específico

**Response:** Archivo .docx

---

#### DELETE `/api/informes/:id`
Elimina un informe

**Response:**
```json
{
  "message": "Informe eliminado exitosamente"
}
```

---

## 🔒 Seguridad

- ✅ **JWT con httpOnly cookies** - Protege contra XSS
- ✅ **bcrypt** - Hashing seguro de contraseñas
- ✅ **CORS configurado** - Solo acepta requests del frontend
- ✅ **Middleware de autenticación** - Protege rutas sensibles
- ✅ **Validación de archivos** - Solo acepta imágenes

---

## 📝 Campos del Formulario

El formulario incluye **83 campos** organizados en 14 secciones:

1. **Datos Generales** (18 campos)
2. **Identificación de Equipos** (6 campos + 3 fotos)
3. **Condiciones Iniciales** (4 campos + 3 fotos)
4. **Desconexión y Retiro** (3 campos + 3 fotos)
5. **Instalación y Conexión** (3 campos + 3 fotos)
6. **Tensiones de Entrada** (3 campos + 3 fotos)
7. **Tensiones de Salida** (3 campos + 3 fotos)
8. **Tensiones Salida UPS** (3 campos + 3 fotos)
9. **Estado del UPS** (1 campo + 3 fotos)
10. **Display UPS** (3 campos + 3 fotos)
11. **Parámetros Internos** (3 campos + 3 fotos)
12. **Cable de Red** (3 fotos)
13. **Validación ATM** (3 fotos)
14. **Conclusiones** (3 campos)

---

## 🐛 Solución de Problemas

### El servidor no inicia

**Error:** `ECONNREFUSED` o `ER_ACCESS_DENIED_ERROR`

**Solución:**
1. Verifica que MySQL esté corriendo
2. Revisa las credenciales en `.env`
3. Asegúrate de haber creado la base de datos

```bash
# Windows
net start MySQL

# Mac/Linux
sudo service mysql start
```

---

### Error al subir imágenes

**Error:** `ENOENT: no such file or directory, open 'C:\...\uploads\...'`

**Solución:**
La carpeta `uploads` se crea automáticamente. Si persiste:

```bash
cd backend
mkdir uploads
```

---

### Token expirado

**Error:** `401 Unauthorized` después de 1 hora

**Solución:**
El token JWT expira en 1 hora. Simplemente vuelve a iniciar sesión.

---

### La plantilla Word no se encuentra

**Error:** `ENOENT: no such file or directory, open '...PLANTILLA.docx'`

**Solución:**
Asegúrate de tener el archivo `PLANTILLA.docx` en `backend/templates/`

---

## 📦 Dependencias

### Backend

```json
{
  "express": "^4.18.2",
  "mysql2": "^3.6.0",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "cookie-parser": "^1.4.6",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "multer": "^1.4.5-lts.1",
  "pizzip": "^3.1.4",
  "docxtemplater": "^3.39.1",
  "docxtemplater-image-module-free": "^1.1.1",
  "image-size": "^1.0.2",
  "morgan": "^1.10.0"
}
```

---

## 🚀 Producción

### Configuración recomendada:

1. **Cambiar JWT_SECRET** en `.env`
2. **Usar HTTPS** (certificado SSL)
3. **Configurar NODE_ENV=production**
4. **Usar PM2** para el servidor:

```bash
npm install -g pm2
pm2 start server.js --name "formulario-atms"
pm2 save
pm2 startup
```

5. **Configurar Nginx** como reverse proxy
6. **Backups automáticos** de la base de datos


## ✅ Checklist de Implementación

- [x] Backend con Express
- [x] Base de datos MySQL
- [x] Autenticación JWT
- [x] Generación de Word
- [x] Carga de imágenes
- [x] Frontend con login
- [x] Formulario completo
- [x] Lista de informes
- [x] Descarga de documentos
- [x] Eliminación de informes
- [x] Protección de rutas
- [x] Documentación completa

---

**¡Sistema completo y funcional! 🎉**
