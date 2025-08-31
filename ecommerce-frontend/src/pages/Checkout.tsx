import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Checkout: React.FC = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    address: '',
    city: '',
    state: '',
    country: 'India',
    pinCode: '',
    phoneNo: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value
    });
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!user) {
      alert('Please login to continue');
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    // Validate shipping info
    if (!shippingInfo.address || !shippingInfo.city || !shippingInfo.pinCode || !shippingInfo.phoneNo) {
      alert('Please fill all shipping details');
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Razorpay SDK failed to load');
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderData = {
        orderItems: items.map(item => ({
          product: item.product._id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        })),
        shippingInfo,
        totalPrice: totalAmount
      };

      const { data } = await api.post('/api/orders/create', orderData);

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_9Qs0q8koc17rMN', // Use your test key
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency,
        name: 'E-Commerce Store',
        description: 'Payment for your order',
        order_id: data.razorpayOrder.id,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: data.order._id
            };

            await api.post('/api/orders/verify-payment', verifyData);
            
            alert('Payment successful! Order placed successfully.');
            clearCart();
            navigate('/profile'); // Navigate to orders page
          } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: shippingInfo.phoneNo
        },
        theme: {
          color: '#007bff'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>Your cart is empty</h2>
        <button 
          onClick={() => navigate('/products')}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1>Checkout</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        {/* Shipping Information */}
        <div>
          <h2>Shipping Information</h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={shippingInfo.address}
              onChange={handleInputChange}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={shippingInfo.city}
              onChange={handleInputChange}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="text"
              name="state"
              placeholder="State"
              value={shippingInfo.state}
              onChange={handleInputChange}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="text"
              name="pinCode"
              placeholder="Pin Code"
              value={shippingInfo.pinCode}
              onChange={handleInputChange}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
            <input
              type="tel"
              name="phoneNo"
              placeholder="Phone Number"
              value={shippingInfo.phoneNo}
              onChange={handleInputChange}
              style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              required
            />
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <h2>Order Summary</h2>
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            {items.map(item => (
              <div key={item.product._id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '10px 0',
                borderBottom: '1px solid #eee'
              }}>
                <span>{item.product.name} × {item.quantity}</span>
                <span>₹{item.product.price * item.quantity}</span>
              </div>
            ))}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '15px 0',
              borderTop: '2px solid #ddd',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              <span>Total:</span>
              <span>₹{totalAmount}</span>
            </div>
            
            <button
              onClick={handlePayment}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                width: '100%',
                marginTop: '20px'
              }}
            >
              {loading ? 'Processing...' : `Pay ₹${totalAmount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
