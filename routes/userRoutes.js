const express = require('express');
const router = express.Router();
const { addUser, getUsers, deleteUser,updateUser, updateDialCode, restoreUser, getDeletedUsers, getAccessTokenByUserId } = require('../controllers/userController');

router.post('/', addUser);         // POST /api/users
router.get('/', getUsers);         // GET /api/users
router.delete('/:userId', deleteUser);
router.put('/:id', updateUser);
router.put('/updateDialCode', updateDialCode);
router.put(
  '/restore/:id',
  (req, res, next) => {
    // Skip body parsing
    req.headers['content-type'] = 'application/x-www-form-urlencoded';
    next();
  },
  restoreUser
);

router.get('/deleted', getDeletedUsers); // 👈 Add this
router.get('/access-token', getAccessTokenByUserId);

module.exports = router;