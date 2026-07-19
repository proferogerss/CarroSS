const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const servicioController = require('../controllers/servicioController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('servicios');
const escritura = permisoCredito('escritura');

router.put('/:id', resolver, escritura, servicioController.actualizar);
router.delete('/:id', resolver, escritura, servicioController.eliminar);

module.exports = router;
