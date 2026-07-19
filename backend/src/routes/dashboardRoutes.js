const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoId, permisoCredito } = require('../middleware/permisos');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();
router.use(requireAuth);

router.get('/:creditoId', resolverCreditoId('creditoId'), permisoCredito('lectura'), dashboardController.resumen);

module.exports = router;
