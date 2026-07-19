const express = require('express');
const { requireAuth } = require('../middleware/auth');
const semanaController = require('../controllers/semanaController');

const router = express.Router();
router.use(requireAuth);

router.put('/:id', semanaController.actualizar);

module.exports = router;
