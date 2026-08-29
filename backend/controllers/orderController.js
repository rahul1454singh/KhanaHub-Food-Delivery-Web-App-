const Order = require('../models/Order');
const { menuData } = require('../data/menuData');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { items, deliveryDetails } = req.body; // Intentionally ignoring frontend totals

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    let calculatedTotal = 0;
    const trustedItems = [];

    for (const item of items) {
      // Validate quantity
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return res.status(400).json({ message: `Invalid quantity for item ID: ${item.id}` });
      }

      // Find trusted item from backend data
      const trustedItem = menuData.find((m) => m.id === Number(item.id));
      
      if (!trustedItem) {
        return res.status(400).json({ message: `Invalid item ID: ${item.id}` });
      }

      calculatedTotal += trustedItem.price * item.quantity;

      // Construct item securely for database
      trustedItems.push({
        id: trustedItem.id.toString(),
        name: trustedItem.name,
        price: trustedItem.price,
        quantity: item.quantity,
        image: trustedItem.image
      });
    }

    const trustedDeliveryCharge = 50;
    const trustedGrandTotal = calculatedTotal + trustedDeliveryCharge;

    const order = new Order({
      user: req.user.userId,
      items: trustedItems,
      totalAmount: calculatedTotal,
      deliveryCharge: trustedDeliveryCharge,
      grandTotal: trustedGrandTotal,
      deliveryDetails
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// Get logged in user active orders
exports.getMyOrders = async (req, res) => {
  try {
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];
    const orders = await Order.find({ user: req.user.userId, orderStatus: { $in: activeStatuses } }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// Get logged in user past orders
exports.getOrderHistory = async (req, res) => {
  try {
    const pastStatuses = ['delivered', 'cancelled'];
    const orders = await Order.find({ user: req.user.userId, orderStatus: { $in: pastStatuses } }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ message: 'Failed to fetch order history' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership
    if (order.user.toString() !== req.user.userId) {
      return res.status(401).json({ message: 'Not authorized to view this order' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Fetch order by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
};
