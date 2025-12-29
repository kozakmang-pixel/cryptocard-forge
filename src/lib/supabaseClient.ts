import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// We always export something so imports never crash the app.
let client: SupabaseClient | any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
      'Auth-related features (email change, reset password) will not work until you configure them.'
  );

  client = {
    auth: {
      async setSession() {
        return {
          data: { session: null },
          error: new Error('Supabase is not configured'),
        };
      },
      async updateUser() {
        return {
          data: null,
          error: new Error('Supabase is not configured'),
        };
      },
      async resetPasswordForEmail() {
        return {
          data: null,
          error: new Error('Supabase is not configured'),
        };
      },
      async getUser() {
        return {
          data: { user: null },
          error: new Error('Supabase is not configured'),
        };
      },
    },
  } as any;
} else {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabaseClient: SupabaseClient = client;
