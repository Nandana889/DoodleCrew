import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConnections() {
  console.log('--- Testing Connections ---');
  let allGood = true;

  // 1. Test Supabase
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing from .env');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    // Try to fetch one row from items to verify DB access
    const { data, error } = await supabase.from('items').select('id').limit(1);
    
    if (error) {
      console.error('❌ Supabase Connection Failed:', error.message);
      allGood = false;
    } else {
      console.log('✅ Supabase Connection: SUCCESS (Tables exist and are accessible)');
    }
  } catch (err: any) {
    console.error('❌ Supabase Setup Error:', err.message);
    allGood = false;
  }

  // 2. Test Gemini
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing from .env');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Send a minimal ping to verify the key
    const result = await model.generateContent('Say exactly: "pong"');
    const text = result.response.text();
    
    if (text.toLowerCase().includes('pong')) {
      console.log('✅ Gemini API Connection: SUCCESS (Generated response correctly)');
    } else {
      console.warn('⚠️ Gemini responded, but unexpected text:', text);
    }
  } catch (err: any) {
    console.error('❌ Gemini API Connection Failed:', err.message);
    allGood = false;
  }

  if (allGood) {
    console.log('\nAll APIs are configured correctly! You are ready to proceed.');
    process.exit(0);
  } else {
    console.log('\nThere were errors configuring the APIs. Please check the logs.');
    process.exit(1);
  }
}

testConnections();
