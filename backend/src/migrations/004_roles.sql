-- CarroSS - Roles de usuario (admin, vendedor, comprador) y asignación por crédito
-- Ejecutar: psql -h 127.0.0.1 -U appuser -d carro_ss -f backend/src/migrations/004_roles.sql

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'vendedor', 'comprador'));

ALTER TABLE creditos
  ADD COLUMN IF NOT EXISTS vendedor_id INT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS comprador_id INT REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_creditos_vendedor ON creditos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_creditos_comprador ON creditos(comprador_id);
