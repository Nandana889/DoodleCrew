import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/services/db.service';

describe('Auth API Endpoints', () => {
  beforeEach(() => {
    db.clearAll();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@university.edu',
          password: 'securepassword123',
          name: 'Jane Student',
          role: 'student',
          department: 'Computer Science',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('student@university.edu');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never leak passwords or hashes!
    });

    it('should reject registration if email already exists', async () => {
      await request(app).post('/api/auth/register').send({
        email: 'duplicate@university.edu',
        password: 'password123',
        name: 'First User',
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'duplicate@university.edu',
        password: 'anotherpassword',
        name: 'Second User',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'password123',
        name: 'Jane Doe',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        email: 'loginuser@university.edu',
        password: 'correctpassword',
        name: 'Login User',
      });
    });

    it('should authenticate user with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'loginuser@university.edu',
        password: 'correctpassword',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('loginuser@university.edu');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'loginuser@university.edu',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@university.edu',
        password: 'anypassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return profile for authenticated user', async () => {
      const reg = await request(app).post('/api/auth/register').send({
        email: 'me@university.edu',
        password: 'password123',
        name: 'Me User',
      });
      const token = reg.body.data.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me@university.edu');
    });

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
