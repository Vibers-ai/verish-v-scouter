import { createClient } from '@supabase/supabase-js';

// Vite uses VITE_ prefix for env variables, but your .env has REACT_APP_ prefix
// We'll check for both to maintain compatibility
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.REACT_APP_SUPABASE_URL ||
  'https://kygjewfpclmjupygwbiw.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.REACT_APP_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Z2pld2ZwY2xtanVweWd3Yml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NDg0NTMsImV4cCI6MjA3NDAyNDQ1M30.dvhIil8z3P62a20zquIjRrtt5rpMTZs_29K-sMN2w9I';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not found in env, using defaults'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'influencer-management',
      'Prefer': 'return=representation',
    },
  },
});

export const TABLES = {
  INFLUENCERS: 'influencers',
  TAGS: 'influencer_tags',
  CONTACT_STATUSES: 'contact_statuses',
  SUMMARY_VIEW: 'influencer_summary',
  LIKES: 'influencer_likes',
};

export const CONTACT_STATUS_OPTIONS = {
  none: { label: '미연락', color: '#6b7280', bgColor: '#f3f4f6' },
  contacted: { label: '연락했음', color: '#3b82f6', bgColor: '#dbeafe' },
  no_response: { label: '회신 안옴', color: '#f97316', bgColor: '#fed7aa' },
  responded: { label: '회신 옴', color: '#059669', bgColor: '#a7f3d0' },
  rejected: { label: '거절', color: '#ef4444', bgColor: '#fee2e2' },
};

export default supabase;
