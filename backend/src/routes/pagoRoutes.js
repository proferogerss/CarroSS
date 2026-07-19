const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const pagoController = require('../controllers/pagoController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('pagos');
const escritura = permisoCredito('escritura');

router.put('/:id', resolver, escritura, pagoController.actualizar);
router.delete('/:id', resolver, escritura, pagoController.eliminar);

module.exports = router;
