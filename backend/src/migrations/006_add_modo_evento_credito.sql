-- Agrega el modo de aplicación de un pago_extra:
--   'plazo'       -> mantiene la mensualidad base y acorta el plazo (comportamiento actual)
--   'mensualidad' -> mantiene el plazo y reduce la mensualidad de los meses restantes
-- Solo aplica cuando tipo = 'pago_extra'. Para tipo = 'seguro' se ignora.

ALTER TABLE eventos_credito
  ADD COLUMN IF NOT EXISTS modo VARCHAR(20) NOT NULL DEFAULT 'plazo';

ALTER TABLE eventos_credito
  ADD CONSTRAINT eventos_credito_modo_check CHECK (modo IN ('plazo', 'mensualidad'));

COMMENT ON COLUMN eventos_credito.modo IS
  'Solo aplica a tipo=pago_extra: plazo (mantiene mensualidad, acorta plazo) o mensualidad (mantiene plazo, reduce mensualidad restante).';
