-- CarroSS - Agrega el día de pago mensual al crédito (1 o 15)
-- Ejecutar: psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/002_dia_pago.sql

ALTER TABLE creditos
  ADD COLUMN IF NOT EXISTS dia_pago INT NOT NULL DEFAULT 1 CHECK (dia_pago IN (1, 15));
