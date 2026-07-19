const express = require('express');
const { requireAuth } = require('../middleware/auth');
const permisosController = require('../controllers/permisosController');

const router = express.Router();
router.use(requireAuth);

// Cualquier usuario autenticado puede ver su propia matriz (para armar su menú)
router.get('/', permisosController.miMatriz);

module.exports = router;
