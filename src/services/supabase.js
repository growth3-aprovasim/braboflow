import { createClient } from '@supabase/supabase-js';

const runtimeEnv = typeof window !== 'undefined' && window.__ENV__ ? window.__ENV__ : {};
const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = runtimeEnv.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
