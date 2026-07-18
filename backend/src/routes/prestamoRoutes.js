const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prestamoController = require('../controllers/prestamoController');

const router = express.Router();
router.use(requireAuth);

router.put('/:id', prestamoController.actualizar);
router.delete('/:id', prestamoController.eliminar);

module.exports = router;
