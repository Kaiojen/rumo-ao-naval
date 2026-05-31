// Configuração do backend (Supabase).
// Estes valores são PÚBLICOS por natureza (URL do projeto e chave anon) e
// podem ficar no front com segurança. As tabelas têm RLS ativo: ninguém lê/grava
// direto com a chave anon; quem acessa os dados é a Edge Function (service role).
// A autenticação real (PIN + permissão de leitor/editor) é feita na Edge Function.
export const SUPABASE_URL = "https://rsckcvgnrujztbrprkts.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_rPh2aERLOFBJS7qRKRSdVQ_9oHmK7Kr";

// Base das "API routes" (Edge Function `api`).
export const API_BASE = `${SUPABASE_URL}/functions/v1/api`;
