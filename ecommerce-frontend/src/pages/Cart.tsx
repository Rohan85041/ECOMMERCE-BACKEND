import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart: React.FC = () => {
  const { items, totalAmount, totalItems, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    if (items.length > 0) {
      navigate('/checkout');
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1>Shopping Cart</h1>
      
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Your cart is empty.</p>
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
      ) : (
        <div>
          <div className="cart-items">
            {items.map(item => (
              <div key={item.product._id} style={{ 
                border: '1px solid #ddd', 
                padding: '20px', 
                margin: '10px 0',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3>{item.product.name}</h3>
                  <p>Price: ₹{item.product.price}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                      style={{ padding: '5px 10px', cursor: 'pointer' }}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>Quantity: {item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                      style={{ padding: '5px 10px', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p><strong>₹{item.product.price * item.quantity}</strong></p>
                  <button
                    onClick={() => removeItem(item.product._id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ 
            borderTop: '2px solid #ddd', 
            paddingTop: '20px', 
            marginTop: '20px',
            textAlign: 'right'
          }}>
            <h3>Total Items: {totalItems}</h3>
            <h2>Total Amount: ₹{totalAmount}</h2>
            <button
              onClick={handleProceedToCheckout}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '18px',
                marginTop: '10px'
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
