const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const prestamoController = require('../controllers/prestamoController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('prestamos');
const escritura = permisoCredito('escritura');

router.put('/:id', resolver, escritura, prestamoController.actualizar);
router.delete('/:id', resolver, escritura, prestamoController.eliminar);

module.exports = router;
