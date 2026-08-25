/**
 * Public Supabase connection values.
 *
 * The URL and anon key are PUBLIC by design — they ship to every visitor's
 * browser and data is protected by Row Level Security — so they are safe to
 * commit as defaults. This means Vercel doesn't need the NEXT_PUBLIC_* vars.
 * An env var still overrides the default if the project/key is ever rotated.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://wrmbeimjdjmbnxfyufib.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybWJlaW1qZGptYm54Znl1ZmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTk0ODYsImV4cCI6MjEwMzE3NTQ4Nn0.TZ1tZJttgL-zssNUQu_EWaQ8n361a0dwt43hlZ182KQ";
