const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderHistory, getOrderById } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/history', protect, getOrderHistory);
router.get('/:id', protect, getOrderById);

module.exports = router;
