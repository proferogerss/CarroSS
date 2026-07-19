const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { soloAdmin, soloAdminOVendedor } = require('../middleware/permisos');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();
router.use(requireAuth);

router.get('/', soloAdmin, usuarioController.listar);
router.get('/buscar', soloAdminOVendedor, usuarioController.buscarPorEmail);
router.post('/', soloAdminOVendedor, usuarioController.crear);
router.put('/:id', soloAdmin, usuarioController.actualizar);

module.exports = router;
