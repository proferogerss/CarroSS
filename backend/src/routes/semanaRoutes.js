const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const semanaController = require('../controllers/semanaController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('pagos_semanales');
const editar = permisoCredito('editar', 'amortizacion');

router.put('/:id', resolver, editar, semanaController.actualizar);

module.exports = router;
