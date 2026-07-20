const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolverCreditoDesdeTabla, permisoCredito, soloAdminOVendedor } = require('../middleware/permisos');
const comprobanteController = require('../controllers/comprobanteController');

const router = express.Router();
router.use(requireAuth);

// Deriva req.creditoId a partir del comprobante (para las rutas que no
// cuelgan de /api/creditos/:creditoId/... sino de /api/comprobantes/:id/...).
const creditoDesdeComprobante = resolverCreditoDesdeTabla('comprobantes_pago', 'id');

// Bandeja de pendientes — admin/vendedor
router.get('/pendientes', soloAdminOVendedor, comprobanteController.pendientes);

// Aprobar / rechazar — admin/vendedor, valida dueño del crédito
router.put('/:id/aprobar', creditoDesdeComprobante, permisoCredito('editar', 'comprobantes'), comprobanteController.aprobar);
router.put('/:id/rechazar', creditoDesdeComprobante, permisoCredito('editar', 'comprobantes'), comprobanteController.rechazar);

// Ver la imagen — cualquier rol autorizado sobre ese crédito (valida dueño internamente)
router.get('/:id/imagen', comprobanteController.verImagen);

module.exports = router;
