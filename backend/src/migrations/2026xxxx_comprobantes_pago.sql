-- Renombra este archivo con la fecha real antes de correrlo, ej: 20260719_comprobantes_pago.sql
-- Aplica con: psql -U <usuario> -d carro_ss -f 20260719_comprobantes_pago.sql

CREATE TABLE IF NOT EXISTS comprobantes_pago (
  id SERIAL PRIMARY KEY,
  credito_id INTEGER NOT NULL REFERENCES creditos(id) ON DELETE CASCADE,
  pago_semanal_id INTEGER NOT NULL REFERENCES pagos_semanales(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  imagen_path TEXT NOT NULL,
  monto_reportado NUMERIC(12,2),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  revisado_por INTEGER REFERENCES usuarios(id),
  revisado_at TIMESTAMP,
  observaciones TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comprobantes_credito ON comprobantes_pago(credito_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_semana ON comprobantes_pago(pago_semanal_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON comprobantes_pago(estado);

-- Permisos de pantalla para la nueva pantalla "comprobantes".
-- El admin no necesita fila: permisoCredito/permisoPantalla siempre lo dejan pasar.
-- Usa NOT EXISTS en vez de ON CONFLICT porque no sabemos si permisos_rol tiene
-- una unique constraint declarada sobre (rol_clave, pantalla_clave); si tu
-- tabla ya la tiene, puedes cambiar esto por un INSERT ... ON CONFLICT normal.

INSERT INTO permisos_rol (rol_clave, pantalla_clave, puede_ver, puede_crear, puede_editar)
SELECT 'comprador', 'comprobantes', true, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM permisos_rol WHERE rol_clave = 'comprador' AND pantalla_clave = 'comprobantes'
);

INSERT INTO permisos_rol (rol_clave, pantalla_clave, puede_ver, puede_crear, puede_editar)
SELECT 'vendedor', 'comprobantes', true, false, true
WHERE NOT EXISTS (
  SELECT 1 FROM permisos_rol WHERE rol_clave = 'vendedor' AND pantalla_clave = 'comprobantes'
);
