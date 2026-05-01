const express = require('express');
const router = express.Router();
const {
    registerBank, loginBank,  getProfile, changePassword, updateBankAcronym, GoogleLogin, RegisterGoogleBank, updateProfile, deleteUserCompletely, verifyBankPassword, deleteBankProfileCompletely
} = require('../controllers/bankController');

router.get('/profile', getProfile);
router.post('/register', registerBank);
router.post('/login', loginBank);
router.post('/google-login', GoogleLogin);
router.post('/google-register', RegisterGoogleBank);
router.post('/change-password', changePassword);
router.put('/update-acronym', updateBankAcronym);
router.put('/update-profile', updateProfile);
router.delete('/delete-user/:userId', deleteUserCompletely);
router.post('/verify-password', verifyBankPassword);
router.delete('/delete-account', deleteBankProfileCompletely);

module.exports = router;