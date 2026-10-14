-- =====================================================
--  Tabla de usuarios para el login con bcrypt
--
--  Pasos en pgAdmin:
--    1. Clic derecho en "Databases" > Create > Database...
--       Nombre: login_db  (o el que pongas en PGDATABASE del .env)
--    2. Selecciona la base login_db > Tools > Query Tool
--    3. Abre este archivo (icono de carpeta) y ejecútalo (F5)
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario  VARCHAR(50)  NOT NULL UNIQUE,
    clave    VARCHAR(60)  NOT NULL   -- hash bcrypt: siempre 60 caracteres
);
