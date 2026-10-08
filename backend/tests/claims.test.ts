import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/services/db.service';

describe('Ownership Claims & Verification Workflow', () => {
  let finderToken: string;
  let claimantToken: string;
  let thirdPartyToken: string;
  let foundItemId: string;

  beforeEach(async () => {
    db.clearAll();

    // Finder User
    const uFinder = await request(app).post('/api/auth/register').send({
      email: 'finder@university.edu',
      password: 'password123',
      name: 'Sam Finder',
    });
    finderToken = uFinder.body.data.token;

    // Claimant User
    const uClaimant = await request(app).post('/api/auth/register').send({
      email: 'claimant@university.edu',
      password: 'password123',
      name: 'Alex Claimant',
    });
    claimantToken = uClaimant.body.data.token;

    // Third party
    const uThird = await request(app).post('/api/auth/register').send({
      email: 'thirdparty@university.edu',
      password: 'password123',
      name: 'Third Party',
    });
    thirdPartyToken = uThird.body.data.token;

    // Finder reports a found item
    const foundItem = await request(app)
      .post('/api/items/found')
      .set('Authorization', `Bearer ${finderToken}`)
      .send({
        title: 'Sony WH-1000XM4 Headphones',
        description: 'Black noise cancelling headphones found in Music Room 102',
        category: 'electronics',
        color: ['black'],
        features: ['Scratch on right cup'],
        location: 'Music Room 102',
        eventDate: new Date().toISOString(),
        storageLocation: 'Security Desk Block B',
      });
    foundItemId = foundItem.body.data.item.id;
  });

  describe('Submitting Ownership Claims', () => {
    it('should submit a claim with verification proof successfully', async () => {
      const res = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${claimantToken}`)
        .send({
          itemId: foundItemId,
          verificationDetails: {
            proofDescription: 'I left them on the piano bench after orchestra rehearsal.',
            uniqueIdentifiers: 'Serial number starts with S01-99812; bluetooth name is Alex-Sony-XM4',
            secretDetails: 'A small yellow guitar pick is stored inside the carrying case mesh pocket',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.status).toBe('submitted');

      // Verify item status advanced to verification_pending
      const item = await db.getItemById(foundItemId);
      expect(item?.status).toBe('verification_pending');
    });

    it('should prevent finder from claiming their own found item (Self-claim forbidden)', async () => {
      const res = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${finderToken}`)
        .send({
          itemId: foundItemId,
          verificationDetails: {
            proofDescription: 'Attempting to claim an item I found myself',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SELF_CLAIM_FORBIDDEN');
    });

    it('should prevent duplicate active claims from the same claimant', async () => {
      // First claim
      await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${claimantToken}`)
        .send({
          itemId: foundItemId,
          verificationDetails: {
            proofDescription: 'First legitimate claim submission with proof',
          },
        });

      // Second duplicate claim attempt
      const res = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${claimantToken}`)
        .send({
          itemId: foundItemId,
          verificationDetails: {
            proofDescription: 'Duplicate claim attempt for the same item',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_CLAIM');
    });
  });

  describe('Reviewing Claims & Status Transitions', () => {
    let claimId: string;

    beforeEach(async () => {
      const claimRes = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${claimantToken}`)
        .send({
          itemId: foundItemId,
          verificationDetails: {
            proofDescription: 'Detailed verification proof with serial number',
          },
        });
      claimId = claimRes.body.data.claim.id;
    });

    it('CRITICAL: Claimant must NOT be allowed to review their own claim', async () => {
      const res = await request(app)
        .patch(`/api/claims/${claimId}/review`)
        .set('Authorization', `Bearer ${claimantToken}`)
        .send({
          status: 'approved',
          reviewNotes: 'Self-approving my claim',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Finder is authorized to review and approve claim', async () => {
      const res = await request(app)
        .patch(`/api/claims/${claimId}/review`)
        .set('Authorization', `Bearer ${finderToken}`)
        .send({
          status: 'approved',
          reviewNotes: 'Serial number and unique pick description matched perfectly.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.status).toBe('approved');

      // Verify item transitioned to confirmed_match
      const item = await db.getItemById(foundItemId);
      expect(item?.status).toBe('confirmed_match');
    });

    it('Unauthorized third party cannot access or review the claim', async () => {
      const viewRes = await request(app)
        .get(`/api/claims/${claimId}`)
        .set('Authorization', `Bearer ${thirdPartyToken}`);

      expect(viewRes.status).toBe(403);
      expect(viewRes.body.error.code).toBe('FORBIDDEN');
    });
  });
});
