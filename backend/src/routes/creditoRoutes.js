const express = require('express');
const { requireAuth } = require('../middleware/auth');

const creditoController = require('../controllers/creditoController');
const pagoController = require('../controllers/pagoController');
const prestamoController = require('../controllers/prestamoController');
const servicioController = require('../controllers/servicioController');
const eventoController = require('../controllers/eventoController');
const amortizacionController = require('../controllers/amortizacionController');

const router = express.Router();
router.use(requireAuth);

// Créditos (CRUD principal)
router.get('/', creditoController.listar);
router.post('/', creditoController.crear);
router.get('/:id', creditoController.obtener);
router.put('/:id', creditoController.actualizar);
router.delete('/:id', creditoController.eliminar);

// Pagos (enganche, licencia, gastos iniciales...)
router.get('/:creditoId/pagos', pagoController.listar);
router.post('/:creditoId/pagos', pagoController.crear);

// Préstamos / adelantos
router.get('/:creditoId/prestamos', prestamoController.listar);
router.post('/:creditoId/prestamos', prestamoController.crear);

// Servicios / mantenimiento
router.get('/:creditoId/servicios', servicioController.listar);
router.post('/:creditoId/servicios', servicioController.crear);

// Eventos del crédito (pago extra a capital / seguro financiado)
router.get('/:creditoId/eventos', eventoController.listar);
router.post('/:creditoId/eventos', eventoController.crear);

// Amortización
router.get('/:creditoId/amortizacion', amortizacionController.tablaAmortizacion);
router.get('/:creditoId/amortizacion/export', amortizacionController.exportarExcel);
router.post('/:creditoId/simular', amortizacionController.simular);
router.get('/:creditoId/mensualidades', amortizacionController.listarMensualidades);
router.put('/:creditoId/mensualidades/:mes', amortizacionController.actualizarMensualidad);

module.exports = router;
