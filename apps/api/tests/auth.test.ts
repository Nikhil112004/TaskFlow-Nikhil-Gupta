import request from 'supertest';
import app from '../src/app';
import { query } from '../src/db/pool';

const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'password123';
let authToken: string;

afterAll(async () => {
  // Cleanup test user
  await query('DELETE FROM users WHERE email = $1', [testEmail]);
  // Give server time to close
  await new Promise((r) => setTimeout(r, 200));
});

describe('POST /auth/register', () => {
  it('registers a new user and returns a JWT', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Test Runner',
      email: testEmail,
      password: testPassword,
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.password).toBeUndefined();
    authToken = res.body.token;
  });

  it('returns 400 for duplicate email', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Duplicate',
      email: testEmail,
      password: testPassword,
    });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBeDefined();
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/auth/register').send({ name: 'No Email' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation failed');
  });

  it('returns 400 for short password', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Short PW',
      email: 'short@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBeDefined();
  });
});

describe('POST /auth/login', () => {
  it('returns JWT for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testEmail,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: testPassword,
    });
    expect(res.status).toBe(401);
  });
});

describe('Protected routes', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/projects');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/projects')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
