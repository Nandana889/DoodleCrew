import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials in backend.');
}

// We use the service role key in the backend for admin tasks, 
// but auth middleware will verify user JWTs.
export const supabase = createClient(supabaseUrl, supabaseKey);
