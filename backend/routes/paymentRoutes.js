const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPaymentAndCreateOrder } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Route to initiate Razorpay test order with backend calculated trusted pricing
router.post('/create-order', protect, createRazorpayOrder);

// Route to cryptographically verify Razorpay payment and create confirmed MongoDB order
router.post('/verify', protect, verifyPaymentAndCreateOrder);

module.exports = router;
