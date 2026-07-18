const express = require('express');
const { requireAuth } = require('../middleware/auth');
const eventoController = require('../controllers/eventoController');

const router = express.Router();
router.use(requireAuth);

router.delete('/:id', eventoController.eliminar);

module.exports = router;
