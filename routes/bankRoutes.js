const express = require('express');
const router = express.Router();
const {
    registerBank, loginBank,  getProfile, changePassword, updateBankAcronym, GoogleLogin, 
    RegisterGoogleBank
} = require('../controllers/bankController');

router.get('/profile', getProfile);
router.post('/register', registerBank);
router.post('/login', loginBank);
router.post('/google-login', GoogleLogin);
router.post('/google-register', RegisterGoogleBank);
router.post('/change-password', changePassword);
router.put('/update-acronym',updateBankAcronym);

module.exports = router;