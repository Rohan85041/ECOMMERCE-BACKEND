const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

describe('API Health Check', () => {
  test('GET /api/status should return server status', async () => {
    const response = await request(app)
      .get('/api/status')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('Authentication', () => {
  beforeEach(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
  });

  test('POST /api/auth/register should create new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('email', userData.email);
    expect(response.body.user).not.toHaveProperty('password');
  });

  test('POST /api/auth/login should authenticate user', async () => {
    // First register a user
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('email', userData.email);
  });

  test('POST /api/auth/login should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body).toHaveProperty('message', 'Invalid email or password');
  });
});

// Cleanup after tests
afterAll(async () => {
  await mongoose.connection.close();
});
