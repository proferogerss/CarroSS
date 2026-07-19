const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoId, permisoCredito, soloAdmin, soloAdminOVendedor } = require('../middleware/permisos');

const creditoController = require('../controllers/creditoController');
const pagoController = require('../controllers/pagoController');
const prestamoController = require('../controllers/prestamoController');
const servicioController = require('../controllers/servicioController');
const eventoController = require('../controllers/eventoController');
const amortizacionController = require('../controllers/amortizacionController');
const semanaController = require('../controllers/semanaController');

const router = express.Router();
router.use(requireAuth);

const idParam = resolverCreditoId('id');
const creditoIdParam = resolverCreditoId('creditoId');
const lectura = permisoCredito('lectura');
const escritura = permisoCredito('escritura');

// Créditos (CRUD principal)
router.get('/', creditoController.listar);
router.post('/', soloAdminOVendedor, creditoController.crear);
router.get('/:id', idParam, lectura, creditoController.obtener);
router.put('/:id', idParam, escritura, creditoController.actualizar);
router.delete('/:id', soloAdmin, creditoController.eliminar);

// Pagos (enganche, licencia, gastos iniciales...)
router.get('/:creditoId/pagos', creditoIdParam, lectura, pagoController.listar);
router.post('/:creditoId/pagos', creditoIdParam, escritura, pagoController.crear);

// Préstamos / adelantos
router.get('/:creditoId/prestamos', creditoIdParam, lectura, prestamoController.listar);
router.post('/:creditoId/prestamos', creditoIdParam, escritura, prestamoController.crear);

// Servicios / mantenimiento
router.get('/:creditoId/servicios', creditoIdParam, lectura, servicioController.listar);
router.post('/:creditoId/servicios', creditoIdParam, escritura, servicioController.crear);

// Eventos del crédito (pago extra a capital / seguro financiado)
router.get('/:creditoId/eventos', creditoIdParam, lectura, eventoController.listar);
router.post('/:creditoId/eventos', creditoIdParam, escritura, eventoController.crear);

// Amortización
router.get('/:creditoId/amortizacion', creditoIdParam, lectura, amortizacionController.tablaAmortizacion);
router.get('/:creditoId/amortizacion/export', creditoIdParam, lectura, amortizacionController.exportarExcel);
router.post('/:creditoId/simular', creditoIdParam, lectura, amortizacionController.simular);
router.get('/:creditoId/mensualidades', creditoIdParam, lectura, amortizacionController.listarMensualidades);
router.put('/:creditoId/mensualidades/:mes', creditoIdParam, escritura, amortizacionController.actualizarMensualidad);

// Pagos semanales
router.get('/:creditoId/semanas', creditoIdParam, lectura, semanaController.listar);
router.post('/:creditoId/semanas/generar', creditoIdParam, escritura, semanaController.generar);
router.delete('/:creditoId/semanas', creditoIdParam, escritura, semanaController.eliminarCalendario);
router.post('/:creditoId/semanas/recalcular/:periodo', creditoIdParam, escritura, semanaController.recalcular);

module.exports = router;
