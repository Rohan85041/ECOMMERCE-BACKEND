const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendOrderConfirmation(userEmail, orderDetails) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Order Confirmation #${orderDetails.orderId}`,
        html: this.generateOrderConfirmationHTML(orderDetails)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Order confirmation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send confirmation email');
    }
  }

  generateOrderConfirmationHTML(orderDetails) {
    const { orderId, items, totalAmount, shippingAddress } = orderDetails;
    
    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f2f2f2; }
          .total { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          <div class="content">
            <h2>Thank you for your order!</h2>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h3>Order Items:</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                <tr class="total">
                  <td colspan="2">Total Amount:</td>
                  <td style="text-align: right;">₹${totalAmount}</td>
                </tr>
              </tbody>
            </table>
            
            <h3>Shipping Address:</h3>
            <p>
              ${shippingAddress.street}<br>
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br>
              ${shippingAddress.country}
            </p>
            
            <p>We'll send you shipping details once your order is processed.</p>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
