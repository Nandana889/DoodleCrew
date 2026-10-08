import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { z } from 'zod';
import { processAIMatching } from '../services/aiService';

const itemSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string(),
  color: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  location: z.string(),
  approximate_time: z.string(),
  image_url: z.string().url().optional(),
});

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const validatedData = itemSchema.parse(req.body);

    const { data, error } = await supabase
      .from('items')
      .insert([{ ...validatedData, user_id: userId }])
      .select()
      .single();

    if (error) throw error;

    // Trigger AI Matching asynchronously
    processAIMatching(data);

    res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    } else {
      res.status(500).json({ error: 'Failed to create item', details: err.message });
    }
  }
};

export const getMyItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch items', details: err.message });
  }
};

export const getActiveItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch items', details: err.message });
  }
};
