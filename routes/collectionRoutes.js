const express = require('express');
const router = express.Router();
const { addCollection, getCollectionsByUser,getTotalAmountByUser,getFilteredCollections,getUser, getCollections, getCollectionsByDateRange, getTopUsers, addBulkCollections, deleteCollection, restoreCollection, getPublicUserCollections } = require('../controllers/collectionController');
const { getSummaryByBank } = require('../controllers/collectionController');

router.post('/', addCollection); 
router.get('/user/:user_id', getCollectionsByUser); 
router.get('/total/user/:user_id', getTotalAmountByUser);
router.get('/user/:user_id/filter', getCollectionsByUser);
router.get('/summary', getSummaryByBank);
router.get('/user', getUser);
router.get('/get', getCollections);
router.get('/by-date', getCollectionsByDateRange);
router.get('/top-users', getTopUsers);
router.post('/bulk', addBulkCollections);
router.delete('/:collectionId', deleteCollection);
router.post('/:collectionId/restore', restoreCollection);// public route for user collection view
router.get('/public/:access_token', getPublicUserCollections);


module.exports = router;