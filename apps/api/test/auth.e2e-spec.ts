import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  getTestPrisma,
  truncateTables,
  disconnectTestDb,
} from './helpers/test-db';

/**
 * E2E tests for the Auth API.
 *
 * These spin up a full NestJS app (in memory) connected to the test database,
 * and use Supertest to make real HTTP requests through the entire pipeline:
 *   HTTP request → middleware → guard → controller → service → DB → response
 *
 * Run: pnpm test:e2e  (requires `pnpm db:test:up` first)
 */
describe('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getTestPrisma())
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  beforeEach(async () => {
    await truncateTables();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDb();
  });

  // ----------- Helper to extract refresh cookie from response ----------------
  function extractRefreshCookie(res: request.Response): string | undefined {
    const cookies: string[] = res.headers['set-cookie'] ?? [];
    const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
      (c: string) => c.startsWith('refresh_token='),
    );
    if (!refreshCookie) return undefined;
    return refreshCookie.split(';')[0].replace('refresh_token=', '');
  }

  // ===========================================================================
  // POST /auth/guest
  // ===========================================================================
  describe('POST /auth/guest', () => {
    it('201 - should create guest and return access token + set refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');

      const refreshToken = extractRefreshCookie(res);
      expect(refreshToken).toBeDefined();
    });

    it('201 - should return valid JWT with userId in payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      // The access token should be a valid JWT
      const parts = res.body.accessToken.split('.');
      expect(parts).toHaveLength(3);

      // Decode the payload
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString(),
      );
      expect(payload).toHaveProperty('sub');
      expect(payload.isGuest).toBe(true);
    });
  });

  // ===========================================================================
  // POST /auth/register
  // ===========================================================================
  describe('POST /auth/register', () => {
    it('201 - should register new user with email+password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('201 - should upgrade guest to registered user (keeping same userId)', async () => {
      // Create a guest first
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      const guestPayload = JSON.parse(
        Buffer.from(guestRes.body.accessToken.split('.')[1], 'base64').toString(),
      );
      const guestUserId = guestPayload.sub;

      // Register with the guest token
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${guestRes.body.accessToken}`)
        .send({ email: 'upgraded@test.com', password: 'password123' })
        .expect(201);

      // The new token should contain the SAME userId
      const regPayload = JSON.parse(
        Buffer.from(
          registerRes.body.accessToken.split('.')[1],
          'base64',
        ).toString(),
      );
      expect(regPayload.sub).toBe(guestUserId);
      expect(regPayload.isGuest).toBe(false);
    });

    it('400 - should reject missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('400 - should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('400 - should reject weak password (min 8 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: 'short' })
        .expect(400);
    });

    it('409 - should reject duplicate email', async () => {
      // Register first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'taken@test.com', password: 'password123' })
        .expect(201);

      // Try to register with the same email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'taken@test.com', password: 'password456' })
        .expect(409);
    });
  });

  // ===========================================================================
  // POST /auth/login
  // ===========================================================================
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a registered user for login tests
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'login@test.com', password: 'password123' });
    });

    it('200 - should login with valid credentials and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'password123' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('200 - should set httpOnly refresh token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'password123' })
        .expect(200);

      const cookies: string[] = res.headers['set-cookie'] ?? [];
      const refreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).find(
        (c: string) => c.includes('refresh_token'),
      );
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('401 - should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('401 - should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
        .expect(401);
    });
  });

  // ===========================================================================
  // POST /auth/refresh
  // ===========================================================================
  describe('POST /auth/refresh', () => {
    it('200 - should return new tokens from valid refresh cookie', async () => {
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      const refreshToken = extractRefreshCookie(guestRes);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('200 - should rotate refresh token (old cookie becomes invalid)', async () => {
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      const oldRefreshToken = extractRefreshCookie(guestRes);

      // Refresh once — should work
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${oldRefreshToken}`)
        .expect(200);

      // Try to use the OLD token again — should fail (it was rotated)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${oldRefreshToken}`)
        .expect(401);
    });

    it('401 - should reject missing refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });
  });

  // ===========================================================================
  // POST /auth/logout
  // ===========================================================================
  describe('POST /auth/logout', () => {
    it('200 - should invalidate refresh token and clear cookie', async () => {
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      const refreshToken = extractRefreshCookie(guestRes);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${guestRes.body.accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);

      expect(res.body.message).toBe('Logged out');

      // The refresh token should now be invalid
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(401);
    });

    it('401 - should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  // ===========================================================================
  // GET /users/me
  // ===========================================================================
  describe('GET /users/me', () => {
    it('200 - should return user data for authenticated user', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'me@test.com', password: 'password123' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'me@test.com', password: 'password123' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'me@test.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('200 - should return isGuest=true for guest user', async () => {
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${guestRes.body.accessToken}`)
        .expect(200);

      expect(res.body.isGuest).toBe(true);
    });

    it('200 - should return isGuest=false for registered user', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'reg@test.com', password: 'password123' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'reg@test.com', password: 'password123' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      expect(res.body.isGuest).toBe(false);
    });

    it('401 - should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });

  // ===========================================================================
  // Full guest-to-registered flow
  // ===========================================================================
  describe('Guest-to-Registered flow (e2e)', () => {
    it('full flow: create guest -> register -> login -> refresh -> logout', async () => {
      // 1. Create guest
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);
      const guestToken = guestRes.body.accessToken;
      let refreshToken = extractRefreshCookie(guestRes)!;

      // 2. Register (upgrade guest)
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ email: 'flow@test.com', password: 'password123' })
        .expect(201);
      refreshToken = extractRefreshCookie(regRes)!;

      // 3. Login
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'flow@test.com', password: 'password123' })
        .expect(200);
      const accessToken = loginRes.body.accessToken;
      refreshToken = extractRefreshCookie(loginRes)!;

      // 4. Refresh
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);
      refreshToken = extractRefreshCookie(refreshRes)!;

      // 5. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(200);

      // 6. Verify refresh token is now invalid
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .expect(401);
    });

    it('guest data preserved after registration (same userId)', async () => {
      // Create guest
      const guestRes = await request(app.getHttpServer())
        .post('/auth/guest')
        .expect(201);

      // Get guest userId
      const guestMeRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${guestRes.body.accessToken}`)
        .expect(200);
      const guestUserId = guestMeRes.body.id;

      // Register (upgrade)
      const regRes = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${guestRes.body.accessToken}`)
        .send({ email: 'same@test.com', password: 'password123' })
        .expect(201);

      // Get registered user and verify same ID
      const regMeRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${regRes.body.accessToken}`)
        .expect(200);

      expect(regMeRes.body.id).toBe(guestUserId);
      expect(regMeRes.body.isGuest).toBe(false);
      expect(regMeRes.body.email).toBe('same@test.com');
    });
  });
});
