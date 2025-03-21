import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// These will be provided by the Supabase connection setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create a client even without proper credentials
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};