import { createClient } from "@supabase/supabase-js";

// Create and export Supabase client (used everywhere in React)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);