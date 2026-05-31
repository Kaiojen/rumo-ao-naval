// Configuração do backend (Supabase).
// Estes valores são PÚBLICOS por natureza (URL do projeto e chave anon) e
// podem ficar no front com segurança. As tabelas têm RLS ativo: ninguém lê/grava
// direto com a chave anon; quem acessa os dados é a Edge Function (service role).
// A autenticação real (PIN + permissão de leitor/editor) é feita na Edge Function.
export const SUPABASE_URL = "https://rsckcvgnrujztbrprkts.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_5w7q1V8GFG_z4Lbm0Dn3Tg_NQbBkZHb";

// Base das "API routes" (Edge Function `api`).
export const API_BASE = `${SUPABASE_URL}/functions/v1/api`;
