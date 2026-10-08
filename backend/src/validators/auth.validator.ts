import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid institutional or personal email is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(100),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['student', 'staff', 'admin']).optional().default('student'),
  department: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  department: z.string().max(100).optional(),
});
