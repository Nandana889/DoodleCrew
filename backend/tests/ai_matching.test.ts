import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/services/db.service';
import { aiService } from '../src/services/ai.service';
import { aiResponseSchema } from '../src/validators/ai.validator';

describe('AI Matching Engine Integration & Evaluation', () => {
  let userToken: string;
  let otherToken: string;

  beforeEach(async () => {
    db.clearAll();

    const u1 = await request(app).post('/api/auth/register').send({
      email: 'student1@university.edu',
      password: 'password123',
      name: 'Student One',
    });
    userToken = u1.body.data.token;

    const u2 = await request(app).post('/api/auth/register').send({
      email: 'student2@university.edu',
      password: 'password123',
      name: 'Student Two',
    });
    otherToken = u2.body.data.token;
  });

  describe('AI Matching Algorithm Evaluation', () => {
    it('should generate high similarity score for compatible items with matching attributes', async () => {
      const lostItem = await db.createItem({
        type: 'lost',
        title: 'Black Lenovo ThinkPad T14',
        description: 'Black laptop with red TrackPoint nub and Linux penguin sticker',
        category: 'electronics',
        color: ['black'],
        features: ['red trackpoint', 'linux sticker', '14 inch screen'],
        location: 'Engineering Building Room 204',
        eventDate: new Date().toISOString(),
        userId: 'u1',
      });

      const foundItem = await db.createItem({
        type: 'found',
        title: 'Lenovo ThinkPad Laptop Found',
        description: 'Black Lenovo laptop found with stickers on back',
        category: 'electronics',
        color: ['black'],
        features: ['linux sticker', 'red trackpoint'],
        location: 'Engineering Building',
        eventDate: new Date().toISOString(),
        userId: 'u2',
      });

      const matchResult = await aiService.matchItems(lostItem, foundItem);

      expect(matchResult.similarityScore).toBeGreaterThanOrEqual(70);
      expect(['medium', 'high']).toContain(matchResult.confidence);
      expect(matchResult.matchedAttributes).toContain('category');
      expect(matchResult.matchedAttributes).toContain('color');
      expect(matchResult.matchedAttributes).toContain('features');
      expect(matchResult.reasons.length).toBeGreaterThan(0);
    });

    it('should return minimal score for mismatched categories', async () => {
      const lostItem = await db.createItem({
        type: 'lost',
        title: 'Brown Leather Wallet',
        description: 'Lost wallet with credit cards',
        category: 'wallets',
        color: ['brown'],
        features: [],
        location: 'Library',
        eventDate: new Date().toISOString(),
        userId: 'u1',
      });

      const foundItem = await db.createItem({
        type: 'found',
        title: 'Set of Brass Keys',
        description: '3 brass keys on a lanyard',
        category: 'keys',
        color: ['gold'],
        features: [],
        location: 'Library',
        eventDate: new Date().toISOString(),
        userId: 'u2',
      });

      const matchResult = await aiService.matchItems(lostItem, foundItem);
      expect(matchResult.similarityScore).toBeLessThan(20);
      expect(matchResult.confidence).toBe('low');
    });
  });

  describe('Untrusted AI Schema Validation', () => {
    it('should accept well-structured AI outputs', () => {
      const validAiOutput = {
        similarityScore: 88.5,
        confidence: 'high',
        matchedAttributes: ['category', 'color', 'features'],
        reasons: ['Both refer to black headphones', 'Both have wireless bluetooth'],
        modelMetadata: {
          model: 'campusfind-gemma-2b',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      const parsed = aiResponseSchema.safeParse(validAiOutput);
      expect(parsed.success).toBe(true);
    });

    it('should reject malformed or out-of-range AI outputs', () => {
      const invalidAiOutput = {
        similarityScore: 150, // out of range (> 100)
        confidence: 'super-certain', // invalid enum
      };

      const parsed = aiResponseSchema.safeParse(invalidAiOutput);
      expect(parsed.success).toBe(false);
    });
  });

  describe('POST /api/matches/evaluate (Pipeline Integration)', () => {
    it('should evaluate match between two registered items via API', async () => {
      const lost = await request(app)
        .post('/api/items/lost')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Sony WF-1000XM4 Earbuds',
          description: 'Silver earbuds in charging case',
          category: 'electronics',
          color: ['silver'],
          features: ['silicone tips'],
          location: 'Library Cafeteria',
          eventDate: new Date().toISOString(),
        });

      const found = await request(app)
        .post('/api/items/found')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Sony Earbuds In Case',
          description: 'Silver wireless earbuds found on table',
          category: 'electronics',
          color: ['silver'],
          features: ['silicone tips'],
          location: 'Cafeteria',
          eventDate: new Date().toISOString(),
        });

      const evalRes = await request(app)
        .post('/api/matches/evaluate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lostItemId: lost.body.data.item.id,
          foundItemId: found.body.data.item.id,
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.data.matchEvaluation).toBeDefined();
      expect(evalRes.body.data.matchEvaluation.similarityScore).toBeGreaterThanOrEqual(50);
    });
  });
});
