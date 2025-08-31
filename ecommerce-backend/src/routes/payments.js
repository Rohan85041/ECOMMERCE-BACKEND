const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const emailService = require('../services/emailService');

const router = express.Router();

// Create payment order
router.post('/create-order', auth, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shippingAddress } = req.body;

    // Validate and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
    }

    // Create order in database
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    // Create Razorpay order
    const razorpayOrder = await paymentService.createOrder(
      totalAmount,
      'INR',
      `order_${order._id}`
    );

    // Update order with Razorpay order ID
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Verify payment
router.post('/verify', auth, [
  body('razorpayOrderId').notEmpty().withMessage('Razorpay Order ID is required'),
  body('razorpayPaymentId').notEmpty().withMessage('Razorpay Payment ID is required'),
  body('razorpaySignature').notEmpty().withMessage('Razorpay Signature is required'),
  body('orderId').notEmpty().withMessage('Order ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Verify payment signature
    const isValidPayment = paymentService.verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidPayment) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find and update order
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized access to order' });
    }

    // Update order status
    order.paymentStatus = 'paid';
    order.paymentId = razorpayPaymentId;
    order.status = 'processing';
    await order.save();

    // Update product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Send confirmation email
    try {
      await emailService.sendOrderConfirmation(order.user.email, {
        orderId: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the payment verification if email fails
    }

    res.json({
      message: 'Payment verified successfully',
      orderId: order._id,
      status: order.status
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Webhook handler for Razorpay
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Skip signature verification in development if webhook secret is not properly configured
    if (!webhookSecret || webhookSecret === 'your_razorpay_webhook_secret') {
      console.warn('Webhook secret not configured - skipping signature verification (development mode)');
    } else {
      // Verify webhook signature in production
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(400).send('Invalid signature');
      }
    }

    const event = JSON.parse(req.body);
    console.log('Webhook event:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        // Handle successful payment
        const paymentEntity = event.payload.payment.entity;
        console.log('Payment captured:', paymentEntity.id);
        break;
      
      case 'payment.failed':
        // Handle failed payment
        const failedPayment = event.payload.payment.entity;
        console.log('Payment failed:', failedPayment.id);
        
        // Update order status to failed
        const order = await Order.findOne({ razorpayOrderId: failedPayment.order_id });
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
        }
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

module.exports = router;
