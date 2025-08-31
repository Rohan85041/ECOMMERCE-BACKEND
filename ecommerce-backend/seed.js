require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const User = require('./src/models/User');

const sampleProducts = [
  {
    name: "Wireless Bluetooth Headphones",
    description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    price: 2999,
    category: "electronics",
    stock: 50,
    featured: true,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop"
  },
  {
    name: "Smart Fitness Watch",
    description: "Track your health and fitness with this advanced smartwatch featuring heart rate monitoring.",
    price: 5999,
    category: "electronics",
    stock: 30,
    featured: true,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop"
  },
  {
    name: "Cotton Casual T-Shirt",
    description: "Comfortable 100% cotton t-shirt perfect for casual wear.",
    price: 799,
    category: "clothing",
    stock: 100,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop"
  },
  {
    name: "Programming for Beginners",
    description: "Complete guide to learning programming from scratch with practical examples.",
    price: 1299,
    category: "books",
    stock: 25,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
  },
  {
    name: "Ergonomic Office Chair",
    description: "Comfortable office chair with lumbar support for long working hours.",
    price: 8999,
    category: "home",
    stock: 15,
    featured: true,
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=300&fit=crop"
  },
  {
    name: "Yoga Mat Premium",
    description: "Non-slip yoga mat perfect for home workouts and meditation.",
    price: 1599,
    category: "sports",
    stock: 40,
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=300&fit=crop"
  },
  {
    name: "Natural Face Moisturizer",
    description: "Organic face moisturizer with SPF protection for daily skincare.",
    price: 899,
    category: "beauty",
    stock: 60,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop"
  },
  {
    name: "Smartphone Case",
    description: "Durable protective case for smartphones with shock absorption.",
    price: 599,
    category: "electronics",
    stock: 80,
    image: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=300&h=300&fit=crop"
  }
];

const sampleAdmin = {
  name: "Admin User",
  email: "admin@ecommerce.com",
  password: "admin123",
  role: "admin",
  isVerified: true
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = new User(sampleAdmin);
    await admin.save();
    console.log('Created admin user');

    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log('Inserted sample products');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nAdmin credentials:');
    console.log('Email: admin@ecommerce.com');
    console.log('Password: admin123');
    console.log('\nSample products created:', sampleProducts.length);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase();
