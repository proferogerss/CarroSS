-- CarroSS - Roles administrables y matriz de permisos por pantalla (mismo patrón que Bitácora SS)
-- Ejecutar: psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/005_permisos.sql

CREATE TABLE IF NOT EXISTS roles (
    clave VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    es_sistema BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO roles (clave, nombre, es_sistema) VALUES
    ('admin', 'Administrador', TRUE),
    ('vendedor', 'Vendedor', TRUE),
    ('comprador', 'Comprador', TRUE)
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS pantallas (
    clave VARCHAR(40) PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

INSERT INTO pantallas (clave, nombre, orden) VALUES
    ('dashboard', 'Dashboard', 1),
    ('movimientos', 'Pagos y préstamos', 2),
    ('amortizacion', 'Amortización', 3),
    ('servicios', 'Servicios', 4),
    ('credito', 'Datos del crédito', 5),
    ('usuarios', 'Usuarios', 6)
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS permisos_rol (
    rol_clave VARCHAR(40) NOT NULL REFERENCES roles(clave) ON DELETE CASCADE,
    pantalla_clave VARCHAR(40) NOT NULL REFERENCES pantallas(clave) ON DELETE CASCADE,
    puede_ver BOOLEAN NOT NULL DEFAULT FALSE,
    puede_crear BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (rol_clave, pantalla_clave)
);

-- Valores por default = lo que ya se comportaba fijo en el código antes de esta migración
INSERT INTO permisos_rol (rol_clave, pantalla_clave, puede_ver, puede_crear, puede_editar) VALUES
    ('admin','dashboard',TRUE,TRUE,TRUE),
    ('admin','movimientos',TRUE,TRUE,TRUE),
    ('admin','amortizacion',TRUE,TRUE,TRUE),
    ('admin','servicios',TRUE,TRUE,TRUE),
    ('admin','credito',TRUE,TRUE,TRUE),
    ('admin','usuarios',TRUE,TRUE,TRUE),

    ('vendedor','dashboard',TRUE,FALSE,FALSE),
    ('vendedor','movimientos',TRUE,TRUE,TRUE),
    ('vendedor','amortizacion',TRUE,TRUE,TRUE),
    ('vendedor','servicios',TRUE,TRUE,TRUE),
    ('vendedor','credito',TRUE,TRUE,TRUE),
    ('vendedor','usuarios',FALSE,FALSE,FALSE),

    ('comprador','dashboard',TRUE,FALSE,FALSE),
    ('comprador','movimientos',FALSE,FALSE,FALSE),
    ('comprador','amortizacion',TRUE,FALSE,FALSE),
    ('comprador','servicios',TRUE,FALSE,FALSE),
    ('comprador','credito',FALSE,FALSE,FALSE),
    ('comprador','usuarios',FALSE,FALSE,FALSE)
ON CONFLICT (rol_clave, pantalla_clave) DO NOTHING;

-- El rol de cada usuario ahora referencia la tabla roles (antes era un CHECK fijo)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_fkey;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_fkey FOREIGN KEY (rol) REFERENCES roles(clave);
