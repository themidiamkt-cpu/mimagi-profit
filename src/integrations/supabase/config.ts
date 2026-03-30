const FALLBACK_SUPABASE_URL = 'https://mujaacymoymysjvkvtdm.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11amFhY3ltb3lteXNqdmt2dGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NjY4NjYsImV4cCI6MjA4NTE0Mjg2Nn0.fHUyHc4lHIKHMQ5vjw5PP5sYSUo09oCq4qvLmrNs5uY';

const readEnv = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const SUPABASE_URL =
  readEnv(import.meta.env.VITE_SUPABASE_URL) ?? FALLBACK_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  readEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
);
