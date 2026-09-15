import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias. Configure server/.env (veja server/.env.example).",
  );
}

/**
 * Cliente "anônimo", sem sessão persistida — usado só pra validar tokens
 * de acesso (auth.getUser) recebidos do frontend.
 */
export const supabaseAnon: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Cliente escopado ao usuário dono do `accessToken`: o token é repassado
 * como Authorization header em toda chamada PostgREST, então o Supabase
 * resolve auth.uid() a partir dele e as políticas de RLS se aplicam
 * normalmente — sem precisar de service role key.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
