-- CarroSS - Migración inicial
-- Ejecutar: psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/001_init.sql

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'admin',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creditos (
    id SERIAL PRIMARY KEY,
    comprador VARCHAR(150) NOT NULL,
    carro VARCHAR(150) NOT NULL,
    modelo VARCHAR(20),
    fecha_compra DATE NOT NULL,
    precio_auto NUMERIC(12,2) NOT NULL,
    enganche NUMERIC(12,2) NOT NULL DEFAULT 0,
    monto_financiar NUMERIC(12,2) NOT NULL,
    tasa_anual NUMERIC(6,4) NOT NULL,
    plazo_meses INT NOT NULL,
    iva_interes NUMERIC(5,4) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    credito_id INT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    observaciones VARCHAR(255),
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prestamos (
    id SERIAL PRIMARY KEY,
    credito_id INT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    observaciones VARCHAR(255),
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    credito_id INT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    kilometraje INT NOT NULL,
    precio NUMERIC(12,2) NOT NULL,
    duracion_km INT NOT NULL,
    siguiente_km INT NOT NULL,
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Eventos reales aplicados al calendario de amortización (pago extra a capital / seguro financiado)
CREATE TABLE IF NOT EXISTS eventos_credito (
    id SERIAL PRIMARY KEY,
    credito_id INT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pago_extra','seguro')),
    mes INT NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    observaciones VARCHAR(255),
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seguimiento de mensualidades realmente pagadas contra la tabla de amortización
CREATE TABLE IF NOT EXISTS pagos_mensualidad (
    id SERIAL PRIMARY KEY,
    credito_id INT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
    mes INT NOT NULL,
    fecha_pago DATE,
    monto_pagado NUMERIC(12,2),
    pagado BOOLEAN NOT NULL DEFAULT FALSE,
    observaciones VARCHAR(255),
    UNIQUE(credito_id, mes)
);

CREATE INDEX IF NOT EXISTS idx_pagos_credito ON pagos(credito_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_credito ON prestamos(credito_id);
CREATE INDEX IF NOT EXISTS idx_servicios_credito ON servicios(credito_id);
CREATE INDEX IF NOT EXISTS idx_eventos_credito ON eventos_credito(credito_id);
CREATE INDEX IF NOT EXISTS idx_mensualidad_credito ON pagos_mensualidad(credito_id);
