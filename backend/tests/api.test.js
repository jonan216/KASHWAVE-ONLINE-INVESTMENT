/**
 * KashWave Backend Test Suite
 * Uses Jest + Supertest for API endpoint validation.
 */

const request = require('supertest');
const app = require('../src/app');

describe('KashWave API Health', () => {
  it('GET /api/health should return 200 with platform info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.platform).toBeDefined();
  });
});

describe('Auth — Registration', () => {
  it('POST /api/auth/register should create a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      full_name:  'Test Investor',
      email:      `test_${Date.now()}@kashwave.test`,
      password:   'SecurePass123!',
      phone_number: '0700000000'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/auth/register should reject duplicate email', async () => {
    const email = `dupe_${Date.now()}@kashwave.test`;
    await request(app).post('/api/auth/register').send({ full_name: 'Dupe1', email, password: 'Pass123!', phone_number: '0700000001' });
    const res = await request(app).post('/api/auth/register').send({ full_name: 'Dupe2', email, password: 'Pass123!', phone_number: '0700000002' });
    expect(res.statusCode).toBe(409);
  });
});

describe('Auth — Login', () => {
  it('POST /api/auth/login should return tokens for admin', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@kashwave.com',
      password: 'admin123'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.accessToken).toBeDefined();
  });

  it('POST /api/auth/login should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@kashwave.com',
      password: 'WRONG_PASSWORD'
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('ROI Engine', () => {
  const { calculateExpectedReturn } = require('../src/services/roiEngine');

  it('calculateExpectedReturn — daily: 5% × 60 days on 100,000 = 300,000', () => {
    const result = calculateExpectedReturn(100000, { profit_percentage: 5, calculation_type: 'daily', duration: 60 });
    expect(result).toBe(300000);
  });

  it('calculateExpectedReturn — fixed_maturity: 10% flat', () => {
    const result = calculateExpectedReturn(50000, { profit_percentage: 10, calculation_type: 'fixed_maturity', duration: 30 });
    expect(result).toBe(5000);
  });
});

describe('Investment Plans', () => {
  it('GET /api/investments/plans should return active plans', async () => {
    const res = await request(app).get('/api/investments/plans');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
