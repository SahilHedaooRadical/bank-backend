const express = require('express');
const router = express.Router();
const { processReturn, getReturnsByUser } = require('../controllers/returnController');

router.post('/:userId', processReturn);

module.exports = router;
