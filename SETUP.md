# Setup Instructions

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd <repo-name>
```

### 2. Backend Setup
```bash
cd ecommerce-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your actual credentials:
# - MongoDB URI
# - JWT Secret
# - Razorpay Keys
# - Email credentials

# Seed the database
npm run seed

# Start the server
npm start
```

### 3. Frontend Setup
```bash
cd ../ecommerce-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your actual credentials:
# - API URL (if different)
# - Razorpay public key

# Start the development server
npm start
```

### 4. Access the Application
- Frontend: http://localhost:3001
- Backend API: http://localhost:5000/api
- Admin Login: admin@example.com / admin123

## 🔒 Security Note
Never commit your actual `.env` files to GitHub. They contain sensitive information like:
- Database passwords
- API keys
- Email credentials

## 📦 Deployment
- Backend: Deploy to Render, Railway, or Heroku
- Frontend: Deploy to Vercel, Netlify, or GitHub Pages
- Database: MongoDB Atlas (already configured)

## 🆘 Need Help?
Check the main README.md for detailed documentation.
