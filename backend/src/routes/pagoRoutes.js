const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const pagoController = require('../controllers/pagoController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('pagos');
const editar = permisoCredito('editar', 'movimientos');

router.put('/:id', resolver, editar, pagoController.actualizar);
router.delete('/:id', resolver, editar, pagoController.eliminar);

module.exports = router;
