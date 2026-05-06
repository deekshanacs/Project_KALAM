import request from 'supertest';
import { createApp } from '../../app';
import { cleanDatabase } from '../helpers/testDb';

const app = createApp();

let adminToken: string;
let tmToken: string;
let jtmId: string;
let tmId: string;

beforeEach(async () => {
  await cleanDatabase();

  // Create admin
  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Admin', email: 'admin@test.com', password: 'Password123!',
  });
  adminToken = (adminRes.body.data as { accessToken: string }).accessToken;

  // Manually set admin role via DB (since register defaults to JUNIOR_MEMBER)
  const { testPrisma } = await import('../helpers/testDb');
  const adminUser = await testPrisma.user.update({
    where: { email: 'admin@test.com' },
    data: { role: 'ADMIN' },
  });

  // Create TM
  const tmRes = await request(app).post('/api/auth/register').send({
    name: 'TM', email: 'tm@test.com', password: 'Password123!',
  });
  tmToken = (tmRes.body.data as { accessToken: string }).accessToken;
  const tmUser = await testPrisma.user.update({
    where: { email: 'tm@test.com' },
    data: { role: 'TEAM_MEMBER', supervisorId: adminUser.id },
  });
  tmId = tmUser.id;

  // Create JTM under TM
  await request(app).post('/api/auth/register').send({
    name: 'JTM', email: 'jtm@test.com', password: 'Password123!',
  });
  const jtmUser = await testPrisma.user.update({
    where: { email: 'jtm@test.com' },
    data: { role: 'JUNIOR_MEMBER', supervisorId: tmId },
  });
  jtmId = jtmUser.id;
});

afterAll(async () => {
  await cleanDatabase();
});

describe('Task Integration', () => {
  it('Admin can create task assigned to anyone → 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test Task', assignedToId: jtmId });
    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Test Task');
  });

  it('TM can assign task to own JTM → 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${tmToken}`)
      .send({ title: 'TM Task', assignedToId: jtmId });
    expect(res.status).toBe(201);
  });

  it('JTM cannot create/assign tasks → 403', async () => {
    const jtmLoginRes = await request(app).post('/api/auth/login').send({
      email: 'jtm@test.com', password: 'Password123!',
    });
    const jtmToken = (jtmLoginRes.body.data as { accessToken: string }).accessToken;

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${jtmToken}`)
      .send({ title: 'JTM Task', assignedToId: tmId });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/tasks/:id/status → 200 updates status', async () => {
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Status Task', assignedToId: jtmId });
    const taskId = (createRes.body.data.task as { id: string }).id;

    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('IN_PROGRESS');
  });
});
