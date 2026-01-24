import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";

interface SupabaseContext {
  client: SupabaseClient;
}

const createSupabaseServerClient = (): SupabaseContext => {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase is not configured");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return { client };
};

export { createSupabaseServerClient };
