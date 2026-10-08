import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/services/db.service';

describe('Security, IDOR Protection & Authorization Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;
  let userAItemId: string;

  beforeEach(async () => {
    db.clearAll();

    // Register User A
    const uA = await request(app).post('/api/auth/register').send({
      email: 'usera@university.edu',
      password: 'passwordA123',
      name: 'User A',
      role: 'student',
    });
    userAToken = uA.body.data.token;

    // Register User B
    const uB = await request(app).post('/api/auth/register').send({
      email: 'userb@university.edu',
      password: 'passwordB123',
      name: 'User B',
      role: 'student',
    });
    userBToken = uB.body.data.token;

    // Register Admin
    const uAdmin = await request(app).post('/api/auth/register').send({
      email: 'admin@university.edu',
      password: 'adminPassword123',
      name: 'System Admin',
      role: 'admin',
    });
    adminToken = uAdmin.body.data.token;

    // User A reports a lost item
    const item = await request(app)
      .post('/api/items/lost')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'User A Leather Wallet',
        description: 'Brown leather wallet with driver license',
        category: 'wallets',
        color: ['brown'],
        location: 'Cafeteria',
        eventDate: new Date().toISOString(),
        contactInfo: 'Private: call +1-555-0001',
      });
    userAItemId = item.body.data.item.id;
  });

  describe('IDOR Prevention: Item Modification', () => {
    it('CRITICAL: User B must NOT be able to modify User A item (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Malicious Hijacked Wallet Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Verify item was not altered in DB
      const itemInDb = await db.getItemById(userAItemId);
      expect(itemInDb?.title).toBe('User A Leather Wallet');
    });

    it('CRITICAL: User B must NOT be able to cancel or delete User A item (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');

      // Verify item remains open and reported
      const itemInDb = await db.getItemById(userAItemId);
      expect(itemInDb?.status).toBe('reported');
    });

    it('Owner (User A) is allowed to modify their own item report', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'User A Updated Wallet Title',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item.title).toBe('User A Updated Wallet Title');
    });

    it('Admin is authorized to update or override items', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin verified title',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.item.title).toBe('Admin verified title');
    });
  });

  describe('State Machine & Status Transitions', () => {
    it('should reject arbitrary leap to confirmed_match or returned by normal users', async () => {
      const res = await request(app)
        .patch(`/api/items/${userAItemId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'returned',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('Admin Role-Based Access Control', () => {
    it('should block non-admin users from accessing /api/admin/stats (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should permit admin users to access /api/admin/stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.totalItems).toBe(1);
    });
  });
});
