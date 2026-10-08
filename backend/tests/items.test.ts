import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/services/db.service';

describe('Item API Endpoints (CRUD, Lifecycle, Privacy)', () => {
  let userToken: string;
  let otherUserToken: string;

  beforeEach(async () => {
    db.clearAll();

    const u1 = await request(app).post('/api/auth/register').send({
      email: 'owner@university.edu',
      password: 'password123',
      name: 'Owner User',
    });
    userToken = u1.body.data.token;

    const u2 = await request(app).post('/api/auth/register').send({
      email: 'other@university.edu',
      password: 'password123',
      name: 'Other Student',
    });
    otherUserToken = u2.body.data.token;
  });

  describe('POST /api/items/lost', () => {
    it('should create a lost item report successfully', async () => {
      const res = await request(app)
        .post('/api/items/lost')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Blue Hydro Flask Water Bottle',
          description: 'Left in Library 2nd floor silent study area near window',
          category: 'other',
          color: ['blue'],
          features: ['INIT club sticker', 'dent on lid'],
          location: 'Library 2nd Floor',
          eventDate: new Date().toISOString(),
          contactInfo: 'Call 555-0199 or Room 304',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item.type).toBe('lost');
      expect(res.body.data.item.status).toBe('reported');
      expect(res.body.data.item.title).toBe('Blue Hydro Flask Water Bottle');
    });

    it('should reject invalid input missing required fields', async () => {
      const res = await request(app)
        .post('/api/items/lost')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'No', // too short (< 3 chars)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/items/found', () => {
    it('should create a found item report successfully', async () => {
      const res = await request(app)
        .post('/api/items/found')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Black HP Wireless Mouse',
          description: 'Found under desk B12 in Computer Lab',
          category: 'electronics',
          color: ['black'],
          features: ['HP logo', 'missing battery cover'],
          location: 'Computer Lab 1',
          eventDate: new Date().toISOString(),
          storageLocation: 'Handed to Lab Assistant Desk',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item.type).toBe('found');
      expect(res.body.data.item.status).toBe('reported');
      expect(res.body.data.item.storageLocation).toBe('Handed to Lab Assistant Desk');
    });
  });

  describe('GET /api/items & Privacy Masking', () => {
    let itemId: string;

    beforeEach(async () => {
      const created = await request(app)
        .post('/api/items/lost')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'MacBook Pro 14 inch',
          description: 'Silver MacBook Pro left in Seminar Hall',
          category: 'electronics',
          color: ['silver'],
          features: ['MLH sticker on top lid'],
          location: 'Seminar Hall 3',
          eventDate: new Date().toISOString(),
          contactInfo: 'Private Personal Phone: +1-987-654-3210',
        });
      itemId = created.body.data.item.id;
    });

    it('should mask private contactInfo when viewed by another student', async () => {
      const res = await request(app)
        .get(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.item.title).toBe('MacBook Pro 14 inch');
      expect(res.body.data.item.contactInfo).toBeUndefined(); // MASKED!
      expect(res.body.data.item.isOwner).toBe(false);
    });

    it('should unmask contactInfo when viewed by the item owner', async () => {
      const res = await request(app)
        .get(`/api/items/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.item.contactInfo).toBe('Private Personal Phone: +1-987-654-3210');
      expect(res.body.data.item.isOwner).toBe(true);
    });

    it('should filter items by category and type', async () => {
      const res = await request(app)
        .get('/api/items?category=electronics&type=lost')
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].category).toBe('electronics');
    });
  });
});
