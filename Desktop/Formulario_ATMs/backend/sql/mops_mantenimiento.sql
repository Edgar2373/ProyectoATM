-- SQL para crear la tabla mops_mantenimiento
-- Ejecutar en la base de datos formulario_atms

CREATE TABLE IF NOT EXISTS mops_mantenimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  archivo LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
