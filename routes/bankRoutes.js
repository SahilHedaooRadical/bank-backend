const express = require('express');
const router = express.Router();
const { registerBank, loginBank,  getProfile, changePassword, updateBankAcronym } = require('../controllers/bankController');

router.get('/profile', getProfile); // GET /api/banks/profile
router.post('/register', registerBank);
router.post('/login', loginBank);
router.post('/change-password', changePassword);
router.put('/update-acronym',updateBankAcronym);

module.exports = router;
