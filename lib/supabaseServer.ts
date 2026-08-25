import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Builds a Supabase client scoped to the calling user's session (forwarded
// via the Authorization header), so Row Level Security policies evaluate
// the real caller's auth.uid() instead of an anonymous, unauthenticated
// request. Use this in API routes instead of the shared anon-key client
// whenever the route reads/writes RLS-protected tables.
export function supabaseForRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
