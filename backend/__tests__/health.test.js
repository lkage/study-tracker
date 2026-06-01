import { jest } from '@jest/globals';
import request from 'supertest';

// DB 연결을 모킹 (실제 DB 없이 테스트하려고)
jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(() => ({
      query: jest.fn().mockResolvedValue({
        rows: [{ now: new Date().toISOString() }],
      }),
    })),
  },
}));

const { default: app } = await import('../src/index.js');

describe('API 기본 엔드포인트', () => {
  test('GET / 는 API 식별 메시지를 반환한다', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  test('GET /health 는 status ok를 반환한다', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('time');
    expect(res.body).toHaveProperty('uptime');
  });
});
