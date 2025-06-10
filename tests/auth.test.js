require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/server');

const User = require('../src/models/user');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /register', () => {
  it('✅ dovrebbe registrare un nuovo utente normale', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser1',
        password: 'testpass',
        email: 'test1@example.com',
        isDriver: false,
        driverLicense: 'CAad232'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/registrazione/i);
  });

  it('✅ dovrebbe registrare un autista con patente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testdriver1',
        password: 'testpass',
        email: 'driver@example.com',
        isDriver: true,
        driverLicense: 'DR12345'
      });

    expect(res.statusCode).toBe(201);
  });

  it('❌ rifiuta registrazione senza email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'noemail',
        password: 'testpass',
        isDriver: false
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('❌ rifiuta autista senza patente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'nodriverlicense',
        password: 'testpass',
        email: 'nodl@example.com',
        isDriver: true
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/patente/i);
  });

  it('❌ rifiuta registrazione con username esistente', async () => {
    await User.create({
      username: 'duplicate',
      email: 'dup@example.com',
      password: 'hash',
      isDriver: false
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'duplicate',
        password: 'testpass',
        email: 'new@example.com',
        isDriver: false
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/esistente/i);
  });
});

describe('POST /login', () => {
  beforeAll(async () => {
    const user = new User({
      username: 'loginuser',
      email: 'login@example.com',
      password: 'password123',
      isDriver: false
    });
    await user.save();
  });

  it('✅ login corretto restituisce token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');

    // Verifica validità token
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.username).toBe('loginuser');
  });

  it('❌ login con utente inesistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'any' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/credenziali/i);
  });

  it('❌ login con password errata', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'wrongpass' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/credenziali/i);
  });

  it('❌ login con account sospeso', async () => {
    const suspendedUser = await User.create({
      username: 'suspended',
      email: 'susp@example.com',
      password: 'testpass',
      isDriver: false,
      status: 'suspended'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'suspended', password: 'testpass' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/sospeso/i);
  });
});
