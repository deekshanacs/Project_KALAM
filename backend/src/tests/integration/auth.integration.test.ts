import request from 'supertest';
import { createApp } from '../../app';
import { cleanDatabase } from '../helpers/testDb';

const app = createApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

describe('Auth Integration', () => {
  const testUser = {
    name: 'Integration Test User',
    email: 'integration@test.com',
    password: 'Password123!',
  };

  it('POST /api/auth/register → 201 with user and tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('POST /api/auth/login → 200 with tokens', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('POST /api/auth/login with wrong password → 401', async () => {
    await request(app).post('/api/auth/register').send(testUser);
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('POST /api/auth/refresh → 200 with new tokens', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const { refreshToken } = registerRes.body.data as { refreshToken: string };

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // New refresh token should be different (rotation)
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('POST /api/auth/logout → 200', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const { accessToken, refreshToken } = registerRes.body.data as { accessToken: string; refreshToken: string };

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
  });

  it('GET /api/auth/me → 200 with user', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const { accessToken } = registerRes.body.data as { accessToken: string };

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/auth/me without token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
