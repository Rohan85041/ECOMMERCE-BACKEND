const express = require('express');
const { query, validationResult, body } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');

const router = express.Router();

// Create new order
router.post('/create', auth, [
  body('orderItems').isArray({ min: 1 }).withMessage('Order items required'),
  body('orderItems.*.product').isMongoId().withMessage('Valid product ID required'),
  body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity required'),
  body('shippingInfo.address').trim().notEmpty().withMessage('Address required'),
  body('shippingInfo.city').trim().notEmpty().withMessage('City required'),
  body('shippingInfo.pinCode').trim().notEmpty().withMessage('Pin code required'),
  body('shippingInfo.phoneNo').trim().notEmpty().withMessage('Phone number required'),
  body('totalPrice').isNumeric({ gt: 0 }).withMessage('Valid total price required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderItems, shippingInfo, totalPrice } = req.body;

    // Verify product prices and stock
    let calculatedTotal = 0;
    const verifiedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      
      calculatedTotal += product.price * item.quantity;
      verifiedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
    }

    // Verify total price
    if (Math.abs(calculatedTotal - totalPrice) > 0.01) {
      return res.status(400).json({ message: 'Price mismatch detected' });
    }

    // Create Razorpay order
    const razorpayOrder = await paymentService.createOrder(
      totalPrice,
      'INR',
      `order_${Date.now()}`
    );

    // Create order in database
    const order = new Order({
      user: req.user._id,
      items: verifiedItems,
      shippingInfo,
      totalPrice,
      paymentInfo: {
        razorpayOrderId: razorpayOrder.id
      }
    });

    await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order,
      razorpayOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Verify payment and update order
router.post('/verify-payment', auth, [
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature required'),
  body('orderId').isMongoId().withMessage('Valid order ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Verify payment signature
    const isValidSignature = paymentService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find and update order
    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update order status
    order.paymentStatus = 'paid';
    order.status = 'processing';
    order.paidAt = new Date();
    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.paymentInfo.razorpaySignature = razorpay_signature;

    await order.save();

    // Update product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Send confirmation email
    try {
      await emailService.sendOrderConfirmation(order.user.email, order);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the order if email fails
    }

    res.json({
      message: 'Payment verified successfully',
      order
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Get user's orders
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .populate('items.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments({ user: req.user._id })
    ]);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name image description')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// Get all orders (Admin only)
router.get('/admin/all', adminAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .populate('items.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalOrders: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Update order status (Admin only)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;

    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// Cancel order
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ 
        message: `Cannot cancel order with status: ${order.status}` 
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Restore product stock if payment was successful
    if (order.paymentStatus === 'paid') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    res.status(500).json({ message: 'Failed to cancel order' });
  }
});

module.exports = router;
