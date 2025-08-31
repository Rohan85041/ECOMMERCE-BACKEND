import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Product, productService } from '../services/productService';
import ProductCard from '../components/ProductCard';
import './Home.css';

const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await productService.getProducts({ limit: 8 });
        setFeaturedProducts(response.products.filter(p => p.featured));
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Welcome to ECommerce</h1>
            <p>Discover amazing products at great prices</p>
            <Link to="/products" className="btn btn-primary">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      <section className="featured-products">
        <div className="container">
          <h2>Featured Products</h2>
          {isLoading ? (
            <div className="loading">Loading featured products...</div>
          ) : (
            <div className="grid grid-cols-4">
              {featuredProducts.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
          {!isLoading && featuredProducts.length === 0 && (
            <p className="text-center">No featured products available.</p>
          )}
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="grid grid-cols-3">
            <div className="feature-card">
              <h3>🚚 Free Shipping</h3>
              <p>Free shipping on orders over ₹1000</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Secure Payment</h3>
              <p>Your payment information is safe with us</p>
            </div>
            <div className="feature-card">
              <h3>↩️ Easy Returns</h3>
              <p>30-day return policy for your peace of mind</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
