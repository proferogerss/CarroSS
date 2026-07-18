const express = require('express');
const { requireAuth } = require('../middleware/auth');
const servicioController = require('../controllers/servicioController');

const router = express.Router();
router.use(requireAuth);

router.put('/:id', servicioController.actualizar);
router.delete('/:id', servicioController.eliminar);

module.exports = router;
