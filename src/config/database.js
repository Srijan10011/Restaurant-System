const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabase = null;

try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && 
      process.env.SUPABASE_URL !== 'your_supabase_url_here' && 
      process.env.SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here') {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log('✅ Using Supabase database');
  } else {
    console.log('📝 Using in-memory storage (configure .env for Supabase)');
  }
} catch (error) {
  console.log('⚠️  Supabase connection failed, using in-memory storage');
  supabase = null;
}

module.exports = { supabase };
