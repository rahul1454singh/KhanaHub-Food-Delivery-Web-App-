const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { menuData } = require('../data/menuData');

// Initialize Razorpay instance lazily or on-demand
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing in environment configuration.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

/**
 * Calculate trusted order pricing based strictly on backend authoritative menu data.
 */
const calculateTrustedOrder = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('No items provided for order calculation');
  }

  let calculatedSubtotal = 0;
  const trustedItems = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      throw new Error(`Invalid quantity for item ID: ${item.id}`);
    }

    const trustedItem = menuData.find((m) => m.id === Number(item.id));
    if (!trustedItem) {
      throw new Error(`Invalid or unrecognised item ID: ${item.id}`);
    }

    calculatedSubtotal += trustedItem.price * qty;

    trustedItems.push({
      id: trustedItem.id.toString(),
      name: trustedItem.name,
      price: trustedItem.price,
      quantity: qty,
      image: trustedItem.image
    });
  }

  const trustedDeliveryCharge = 50;
  const trustedGrandTotal = calculatedSubtotal + trustedDeliveryCharge;

  return {
    trustedItems,
    calculatedSubtotal,
    trustedDeliveryCharge,
    trustedGrandTotal
  };
};

/**
 * Normalizes delivery details to match Order model schema.
 */
const normalizeDeliveryDetails = (details) => {
  if (!details) {
    throw new Error('Delivery details are required');
  }

  const fullName = details.fullName || details.name || '';
  const phoneCode = details.phoneCode ? `${details.phoneCode} ` : '';
  const contactNumber = details.contactNumber || (details.phoneNumber ? `${phoneCode}${details.phoneNumber}`.trim() : '');
  const email = details.email || '';
  const address = details.address || '';
  const city = details.city || '';

  if (!fullName.trim() || !contactNumber.trim() || !email.trim() || !address.trim() || !city.trim()) {
    throw new Error('All delivery fields (full name, contact number, email, address, and city) are required');
  }

  return {
    fullName: fullName.trim(),
    contactNumber: contactNumber.trim(),
    email: email.trim(),
    address: address.trim(),
    city: city.trim()
  };
};

/**
 * POST /api/payment/create-order
 * Generates a Razorpay Order based strictly on backend trusted prices.
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { items, deliveryDetails } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required to create payment order.' });
    }

    // 1. Compute trusted totals
    let pricing;
    try {
      pricing = calculateTrustedOrder(items);
    } catch (valErr) {
      return res.status(400).json({ message: valErr.message });
    }

    const { calculatedSubtotal, trustedDeliveryCharge, trustedGrandTotal } = pricing;

    // 2. Convert to paise (safe integer)
    const amountInPaise = Math.round(trustedGrandTotal * 100);

    // 3. Initialize Razorpay
    const razorpay = getRazorpayInstance();

    // 4. Create Razorpay order
    const receiptId = `kh_rcpt_${Date.now()}_${req.user.userId.toString().slice(-6)}`;
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        userId: req.user.userId.toString()
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      trustedGrandTotal,
      trustedSubtotal: calculatedSubtotal,
      trustedDeliveryCharge
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate Razorpay order'
    });
  }
};

/**
 * POST /api/payment/verify
 * Cryptographically verifies Razorpay signature, checks for duplicate processing,
 * and creates confirmed MongoDB Order upon valid signature.
 */
exports.verifyPaymentAndCreateOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      deliveryDetails
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment response parameters (order ID, payment ID, signature).'
      });
    }

    // 1. Verify HMAC SHA-256 Signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Payment configuration error on server.'
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload.toString())
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn('⚠️ Razorpay signature verification failed for payment:', razorpay_payment_id);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature.'
      });
    }

    // 2. Duplicate / Idempotency protection check
    const existingOrder = await Order.findOne({
      $or: [
        { razorpayPaymentId: razorpay_payment_id },
        { razorpayOrderId: razorpay_order_id }
      ]
    });

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        order: existingOrder,
        message: 'Order was already processed successfully.'
      });
    }

    // 3. Recalculate trusted totals and items
    let pricing;
    try {
      pricing = calculateTrustedOrder(items);
    } catch (valErr) {
      return res.status(400).json({ message: valErr.message });
    }

    // 4. Validate and format delivery details
    let normalizedDelivery;
    try {
      normalizedDelivery = normalizeDeliveryDetails(deliveryDetails);
    } catch (delErr) {
      return res.status(400).json({ message: delErr.message });
    }

    const { trustedItems, calculatedSubtotal, trustedDeliveryCharge, trustedGrandTotal } = pricing;

    // 5. Create confirmed MongoDB Order
    const order = new Order({
      user: req.user.userId,
      items: trustedItems,
      totalAmount: calculatedSubtotal,
      deliveryCharge: trustedDeliveryCharge,
      grandTotal: trustedGrandTotal,
      deliveryDetails: normalizedDelivery,
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: req.body.paymentMethod || 'razorpay',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    const savedOrder = await order.save();

    console.log(`✅ [Payment] Razorpay payment ${razorpay_payment_id} verified. Order ${savedOrder._id} created.`);

    return res.status(201).json({
      success: true,
      order: savedOrder,
      message: 'Payment verified and order placed successfully.'
    });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment and create order'
    });
  }
};

// processTestPayment has been completely removed to enforce the legitimate Razorpay Test Checkout flow.
