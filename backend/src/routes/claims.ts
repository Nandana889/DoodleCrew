import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const claimSchema = z.object({
  match_id: z.string().uuid(),
  proof_text: z.string().min(5),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { match_id, proof_text } = claimSchema.parse(req.body);

    const { data, error } = await supabase
      .from('claims')
      .insert([{ match_id, user_id: userId, proof_text }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to submit claim', details: err.message });
  }
});

router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('claims')
      .select('*, match:match_id(*)')
      .eq('user_id', userId);

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch claims', details: err.message });
  }
});

export default router;
