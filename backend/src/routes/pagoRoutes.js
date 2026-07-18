const express = require('express');
const { requireAuth } = require('../middleware/auth');
const pagoController = require('../controllers/pagoController');

const router = express.Router();
router.use(requireAuth);

router.put('/:id', pagoController.actualizar);
router.delete('/:id', pagoController.eliminar);

module.exports = router;
