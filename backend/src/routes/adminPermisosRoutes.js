const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/permisos');
const permisosController = require('../controllers/permisosController');

const router = express.Router();
router.use(requireAuth, soloAdmin);

router.get('/roles', permisosController.listarRoles);
router.get('/permisos/:rolClave', permisosController.obtenerMatriz);
router.put('/permisos/:rolClave', permisosController.guardarMatriz);

module.exports = router;
