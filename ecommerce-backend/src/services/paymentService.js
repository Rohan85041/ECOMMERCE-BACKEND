const Razorpay = require('razorpay');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(amount, currency = 'INR', receipt) {
    try {
      const options = {
        amount: amount * 100, // amount in smallest currency unit
        currency,
        receipt,
        payment_capture: 1
      };

      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay create order error:', error);
      throw new Error('Failed to create payment order');
    }
  }

  verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const sign = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest('hex');

      return razorpaySignature === expectedSign;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  async getPaymentDetails(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Get payment details error:', error);
      throw new Error('Failed to fetch payment details');
    }
  }
}

module.exports = new PaymentService();
