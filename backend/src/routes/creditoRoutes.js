const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoId, permisoCredito, permisoPantalla, soloAdmin, soloAdminOVendedor } = require('../middleware/permisos');

const creditoController = require('../controllers/creditoController');
const pagoController = require('../controllers/pagoController');
const prestamoController = require('../controllers/prestamoController');
const servicioController = require('../controllers/servicioController');
const eventoController = require('../controllers/eventoController');
const amortizacionController = require('../controllers/amortizacionController');
const semanaController = require('../controllers/semanaController');
const comprobanteController = require('../controllers/comprobanteController');
const { upload } = require('../middleware/uploadComprobante');

const router = express.Router();
router.use(requireAuth);

const idParam = resolverCreditoId('id');
const creditoIdParam = resolverCreditoId('creditoId');

// Créditos (CRUD principal) — pantalla "credito"
router.get('/', creditoController.listar);
router.post('/', soloAdminOVendedor, permisoPantalla('crear', 'credito'), creditoController.crear);
router.get('/:id', idParam, permisoCredito('lectura', 'credito'), creditoController.obtener);
router.put('/:id', idParam, permisoCredito('editar', 'credito'), creditoController.actualizar);
router.delete('/:id', soloAdmin, creditoController.eliminar);

// Pagos (enganche, licencia, gastos iniciales...) — pantalla "movimientos"
router.get('/:creditoId/pagos', creditoIdParam, permisoCredito('lectura', 'movimientos'), pagoController.listar);
router.post('/:creditoId/pagos', creditoIdParam, permisoCredito('crear', 'movimientos'), pagoController.crear);

// Préstamos / adelantos — pantalla "movimientos"
router.get('/:creditoId/prestamos', creditoIdParam, permisoCredito('lectura', 'movimientos'), prestamoController.listar);
router.post('/:creditoId/prestamos', creditoIdParam, permisoCredito('crear', 'movimientos'), prestamoController.crear);

// Servicios / mantenimiento — pantalla "servicios"
router.get('/:creditoId/servicios', creditoIdParam, permisoCredito('lectura', 'servicios'), servicioController.listar);
router.post('/:creditoId/servicios', creditoIdParam, permisoCredito('crear', 'servicios'), servicioController.crear);

// Eventos del crédito (pago extra a capital / seguro financiado) — pantalla "amortizacion"
router.get('/:creditoId/eventos', creditoIdParam, permisoCredito('lectura', 'amortizacion'), eventoController.listar);
router.post('/:creditoId/eventos', creditoIdParam, permisoCredito('crear', 'amortizacion'), eventoController.crear);

// Amortización — pantalla "amortizacion"
router.get('/:creditoId/amortizacion', creditoIdParam, permisoCredito('lectura', 'amortizacion'), amortizacionController.tablaAmortizacion);
router.get('/:creditoId/amortizacion/export', creditoIdParam, permisoCredito('lectura', 'amortizacion'), amortizacionController.exportarExcel);
router.post('/:creditoId/simular', creditoIdParam, permisoCredito('lectura', 'amortizacion'), amortizacionController.simular);
router.get('/:creditoId/mensualidades', creditoIdParam, permisoCredito('lectura', 'amortizacion'), amortizacionController.listarMensualidades);
router.put('/:creditoId/mensualidades/:mes', creditoIdParam, permisoCredito('editar', 'amortizacion'), amortizacionController.actualizarMensualidad);

// Pagos semanales — pantalla "amortizacion"
router.get('/:creditoId/semanas', creditoIdParam, permisoCredito('lectura', 'amortizacion'), semanaController.listar);
router.post('/:creditoId/semanas/generar', creditoIdParam, permisoCredito('crear', 'amortizacion'), semanaController.generar);
router.delete('/:creditoId/semanas', creditoIdParam, permisoCredito('editar', 'amortizacion'), semanaController.eliminarCalendario);
router.post('/:creditoId/semanas/recalcular/:periodo', creditoIdParam, permisoCredito('editar', 'amortizacion'), semanaController.recalcular);
router.post('/:creditoId/semanas/recalcular/:periodo', creditoIdParam, permisoCredito('editar', 'amortizacion'), semanaController.recalcular);

// Comprobantes de pago — pantalla "comprobantes"
router.get('/:creditoId/comprobantes', creditoIdParam, permisoCredito('lectura', 'comprobantes'), comprobanteController.listar);
router.post('/:creditoId/comprobantes', creditoIdParam, permisoCredito('crear', 'comprobantes'), upload.single('imagen'), comprobanteController.subir);

module.exports = router;
