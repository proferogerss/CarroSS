const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const prestamoController = require('../controllers/prestamoController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('prestamos');
const editar = permisoCredito('editar', 'movimientos');

router.put('/:id', resolver, editar, prestamoController.actualizar);
router.delete('/:id', resolver, editar, prestamoController.eliminar);

module.exports = router;
