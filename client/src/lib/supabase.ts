import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Admin pages import this unconditionally. If the env vars are not set, we still
// create a client with dummy values so `vite build` can succeed.
// At runtime, Supabase calls will fail until you provide real env vars.
const dummyClient: SupabaseClient = createClient('https://invalid.supabase.co', 'invalid-anon-key');

export const supabase: SupabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : dummyClient;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Admin data will not load.');
}

