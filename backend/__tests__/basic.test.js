import request from 'supertest';
import app from '../src/index.js';

describe('기본 라우트', () => {
  test('GET / 는 200과 message 필드를 반환한다', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Study Tracker API');
  });

  test('존재하지 않는 라우트는 404를 반환한다', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });
});
