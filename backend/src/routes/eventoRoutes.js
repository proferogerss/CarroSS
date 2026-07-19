const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito } = require('../middleware/permisos');
const eventoController = require('../controllers/eventoController');

const router = express.Router();
router.use(requireAuth);

const resolver = resolverCreditoDesdeTabla('eventos_credito');
const editar = permisoCredito('editar', 'amortizacion');

router.delete('/:id', resolver, editar, eventoController.eliminar);

module.exports = router;
