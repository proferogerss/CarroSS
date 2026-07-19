const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const servicioController = require('../controllers/servicioController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('servicios');
const editar = permisoCredito('editar', 'servicios');

router.put('/:id', resolver, editar, servicioController.actualizar);
router.delete('/:id', resolver, editar, servicioController.eliminar);

module.exports = router;
