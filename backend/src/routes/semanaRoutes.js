const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const semanaController = require('../controllers/semanaController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('pagos_semanales');
const escritura = permisoCredito('escritura');

router.put('/:id', resolver, escritura, semanaController.actualizar);

module.exports = router;
