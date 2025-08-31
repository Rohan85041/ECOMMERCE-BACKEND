import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          <Link to="/" className="nav-brand">
            ECommerce
          </Link>
          
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/products" className="nav-link">Products</Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/cart" className="nav-link cart-link">
                  Cart
                  {totalItems > 0 && (
                    <span className="cart-badge">{totalItems}</span>
                  )}
                </Link>
                <Link to="/profile" className="nav-link">Profile</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="nav-link">Admin</Link>
                )}
                <button onClick={handleLogout} className="nav-link logout-btn">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/cart" className="nav-link cart-link">
                  Cart
                  {totalItems > 0 && (
                    <span className="cart-badge">{totalItems}</span>
                  )}
                </Link>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
