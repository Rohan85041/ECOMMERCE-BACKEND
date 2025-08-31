import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../services/productService';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem, isInCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
  };

  return (
    <div className="product-card">
      <Link to={`/product/${product._id}`}>
        <div className="product-image">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-price">₹{product.price}</p>
          <p className="product-category">{product.category}</p>
          {product.stock <= 0 && (
            <span className="out-of-stock">Out of Stock</span>
          )}
        </div>
      </Link>
      <div className="product-actions">
        <button
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className={`btn ${isInCart(product._id) ? 'btn-secondary' : 'btn-primary'}`}
        >
          {product.stock <= 0 ? 'Out of Stock' : isInCart(product._id) ? 'In Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
