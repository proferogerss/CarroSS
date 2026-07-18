const express = require('express');
const { requireAuth } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();
router.use(requireAuth);

router.get('/:creditoId', dashboardController.resumen);

module.exports = router;
