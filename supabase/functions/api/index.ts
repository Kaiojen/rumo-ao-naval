// ============================================================
// API "Rumo ao Naval" — Edge Function do Supabase
// ------------------------------------------------------------
// Faz o papel das "API routes": lê/grava as três coleções
// (cn:logs, cn:sims, cn:tasks) e cuida da autenticação por PIN.
//
// Permissão REAL no backend:
//   - leitura: exige sessão válida (qualquer perfil logado).
//   - escrita: exige sessão com role 'editor' (só o aluno).
//     Leitor (responsável/pai) recebe 403 — não grava nem apaga.
//
// Usa a service_role key (injetada automaticamente) e as tabelas
// têm RLS ativo, então ninguém acessa os dados sem passar por aqui.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-cn-token, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

function newToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

async function sessionFor(req: Request): Promise<{ username: string; role: string } | null> {
  const t = req.headers.get("x-cn-token");
  if (!t) return null;
  const { data } = await admin.from("sessions").select("username, role").eq("token", t).maybeSingle();
  return data ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  // pathname chega como /api/<rota>; isola a rota final.
  const route = url.pathname.replace(/^.*\/api/, "") || "/";

  try {
    // saúde
    if (route === "/" || route === "/health") return json({ ok: true });

    // ---- LOGIN ----
    if (route === "/login" && req.method === "POST") {
      const { username, pin } = await req.json().catch(() => ({}));
      if (!username || !pin) return json({ error: "missing" }, 400);
      const { data: u } = await admin
        .from("app_users")
        .select("username, display_name, role, pin")
        .eq("username", String(username))
        .maybeSingle();
      if (!u || String(u.pin) !== String(pin)) return json({ error: "invalid" }, 401);
      const token = newToken();
      await admin.from("sessions").insert({ token, username: u.username, role: u.role });
      return json({ token, username: u.username, display_name: u.display_name, role: u.role });
    }

    // ---- LEITURA de uma coleção ----
    if (route === "/kv" && req.method === "GET") {
      const sess = await sessionFor(req);
      if (!sess) return json({ error: "unauthorized" }, 401);
      const key = url.searchParams.get("key");
      if (!key) return json({ error: "missing key" }, 400);
      const { data } = await admin.from("collections").select("value").eq("key", key).maybeSingle();
      return json({ key, value: data?.value ?? null });
    }

    // ---- ESCRITA de uma coleção (só editor) ----
    if (route === "/kv" && req.method === "POST") {
      const sess = await sessionFor(req);
      if (!sess) return json({ error: "unauthorized" }, 401);
      if (sess.role !== "editor") return json({ error: "forbidden" }, 403);
      const { key, value } = await req.json().catch(() => ({}));
      if (!key) return json({ error: "missing key" }, 400);

      // Carimba o autor (quem criou) nos registros novos de logs/sims.
      let v = value;
      if ((key === "cn:logs" || key === "cn:sims") && Array.isArray(v)) {
        v = v.map((item) =>
          item && typeof item === "object" && !item.author
            ? { ...item, author: sess.username }
            : item,
        );
      }

      await admin
        .from("collections")
        .upsert({ key, value: v, updated_at: new Date().toISOString() }, { onConflict: "key" });
      return json({ ok: true, value: v });
    }

    return json({ error: "not found", route }, 404);
  } catch (e) {
    return json({ error: "server", detail: String(e) }, 500);
  }
});
