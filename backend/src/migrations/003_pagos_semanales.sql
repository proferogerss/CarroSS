-- CarroSS - Calendario de pagos semanales + trazabilidad del origen de eventos
-- Ejecutar: psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/003_pagos_semanales.sql

ALTER TABLE creditos
  ADD COLUMN IF NOT EXISTS fecha_inicio_semanal DATE;

-- Distingue eventos creados a mano de los generados automáticamente por el
-- recálculo semanal, para poder recalcularlos sin duplicar ni pisar eventos manuales.
ALTER TABLE eventos_credito
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (origen IN ('manual', 'recalculo_semanal'));

CREATE TABLE IF NOT EXISTS pagos_semanales (
    id SERIAL PRIMARY KEY,
    credito_id INT NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
    numero_semana INT NOT NULL,
    periodo INT NOT NULL,              -- mes de la tabla de amortización al que pertenece (1-indexado)
    fecha_programada DATE NOT NULL,
    monto_programado NUMERIC(12,2) NOT NULL,
    monto_pagado NUMERIC(12,2),
    pagado BOOLEAN NOT NULL DEFAULT FALSE,
    observaciones VARCHAR(255),
    created_by INT REFERENCES usuarios(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(credito_id, numero_semana)
);

CREATE INDEX IF NOT EXISTS idx_semanas_credito ON pagos_semanales(credito_id);
CREATE INDEX IF NOT EXISTS idx_semanas_periodo ON pagos_semanales(credito_id, periodo);
