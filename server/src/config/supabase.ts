import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Admin client — uses the service role key.
 * Has full DB access and bypasses Row Level Security.
 * Only use on the server, NEVER expose to the browser.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Public client — uses the anon key.
 * Respects Row Level Security policies.
 * Use when acting on behalf of an unauthenticated user.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
