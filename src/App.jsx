import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { SUPABASE_ANON_KEY, API_BASE } from "./config.js";

/* ============================================================
   PAINEL DE ESTUDOS — COLÉGIO NAVAL (CPACN/2026)
   ------------------------------------------------------------
   CAMADA DE DADOS ISOLADA (db).
   Antes usava localStorage (por aparelho). Agora fala com a
   Edge Function `api` do Supabase via fetch, pra que aluno,
   responsável e pai vejam os MESMOS dados de aparelhos diferentes.
   Só o corpo de db.get/db.set mudou — o resto do app é igual.
   ============================================================ */

/* ---------- SESSÃO / AUTENTICAÇÃO ---------- */
const auth = {
  get token() { try { return localStorage.getItem("cn:token") || ""; } catch { return ""; } },
  get user() { try { return JSON.parse(localStorage.getItem("cn:user") || "null"); } catch { return null; } },
  save(token, user) {
    try { localStorage.setItem("cn:token", token); localStorage.setItem("cn:user", JSON.stringify(user)); } catch { /* noop */ }
  },
  clear() {
    try { localStorage.removeItem("cn:token"); localStorage.removeItem("cn:user"); } catch { /* noop */ }
  },
};

function authHeaders(extra) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "x-cn-token": auth.token,
    ...(extra || {}),
  };
}

const db = {
  async get(key, fallback) {
    try {
      const r = await fetch(`${API_BASE}/kv?key=${encodeURIComponent(key)}`, { headers: authHeaders() });
      if (!r.ok) return fallback;
      const j = await r.json();
      return (j && j.value != null) ? j.value : fallback;
    } catch (e) { return fallback; }
  },
  async set(key, value) {
    try {
      const r = await fetch(`${API_BASE}/kv`, {
        method: "POST",
        headers: authHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ key, value }),
      });
      return r.ok;
    } catch (e) { return false; }
  },
};

async function apiLogin(username, pin) {
  const r = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ username, pin }),
  });
  if (!r.ok) throw new Error("login");
  return r.json();
}

/* ---------- TEMA ---------- */
const T = {
  bg: "#0A1622",
  bg2: "#0E1F30",
  card: "#12273B",
  cardHi: "#173050",
  line: "#1E3A55",
  ink: "#EAF1F8",
  sub: "#8AA4BC",
  gold: "#CDA349",
  goldSoft: "#3a3320",
  green: "#4FB477",
  red: "#D9695E",
};

const SUBJECTS = [
  { id: "mat", name: "Matemática", short: "Mat", color: "#CDA349" },
  { id: "ing", name: "Inglês", short: "Ing", color: "#49B6CF" },
  { id: "por", name: "Português", short: "Por", color: "#E0788E" },
  { id: "fis", name: "Física", short: "Fís", color: "#9A8CF0" },
  { id: "qui", name: "Química", short: "Quí", color: "#5FC089" },
  { id: "soc", name: "Est. Sociais", short: "Soc", color: "#E0954A" },
  { id: "red", name: "Redação", short: "Red", color: "#46C6B0" },
  { id: "prov", name: "Provas antigas", short: "Prov", color: "#C77DFF" },
];
const SUBJ = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
const PR = { F: { t: "Fechar", c: "#4FB477" }, P: { t: "Pincelar", c: "#CDA349" }, X: { t: "Mínimo", c: "#7E93A6" } };

const EXAM = new Date("2026-08-01T08:00:00");

/* ---------- PLANO 9 SEMANAS ---------- */
const WEEKS = [
  { n: 1, start: "2026-05-30", end: "2026-06-07", focus: "Diagnóstico + base crítica (fração e potenciação)",
    tasks: [
      { s: "mat", p: "F", t: "Aplicar 1 prova antiga COMPLETA cronometrada (diagnóstico)" },
      { s: "mat", p: "F", t: "Frações: operações, simplificação, equações" },
      { s: "mat", p: "P", t: "Potenciação e radiciação (só base)" },
      { s: "ing", p: "F", t: "Murphy Units 1–14 (Simple / Continuous)" },
      { s: "por", p: "F", t: "Faça e Passe: acentuação (Cap 1.3) + iniciar morfologia (Cap 2)" },
    ] },
  { n: 2, start: "2026-06-08", end: "2026-06-14", focus: "Divisibilidade + fim da base",
    tasks: [
      { s: "mat", p: "F", t: "Divisibilidade, MDC, MMC, congruência, módulo" },
      { s: "mat", p: "F", t: "Números racionais e frações: fechar de vez" },
      { s: "ing", p: "F", t: "Murphy Units 15–25 (Present Perfect, Future)" },
      { s: "por", p: "F", t: "Morfologia: substantivo, adjetivo, pronome, verbo (Cap 2.2)" },
    ] },
  { n: 3, start: "2026-06-15", end: "2026-06-21", focus: "Início da geometria + funções",
    tasks: [
      { s: "mat", p: "F", t: "Geometria: triângulos, semelhança, ângulos" },
      { s: "mat", p: "F", t: "Funções 1º/2º grau, domínio, inequações" },
      { s: "ing", p: "F", t: "Morfologia: countable/uncountable, pronomes (61–76)" },
      { s: "por", p: "F", t: "Morfologia: verbo + advérbio/preposição/conjunção (2.2.6–2.2.7)" },
      { s: "fis", p: "F", t: "Cinemática (Vol.1)" },
      { s: "prov", p: "F", t: "Dissecar 1 prova antiga do CN: anotar cada pegadinha no caderno da banca" },
    ] },
  { n: 4, start: "2026-06-22", end: "2026-06-28", focus: "Geometria pesada + sistemas",
    tasks: [
      { s: "mat", p: "F", t: "Geometria: círculo, ângulo inscrito, áreas" },
      { s: "mat", p: "F", t: "Equações e sistemas lineares" },
      { s: "ing", p: "F", t: "Comparativos/superlativos; question formation" },
      { s: "por", p: "F", t: "Sintaxe: termos da oração — sujeito, predicado, complementos (Cap 3.1)" },
      { s: "por", p: "P", t: "Interpretação: manter volume pelas provas antigas" },
      { s: "fis", p: "F", t: "Dinâmica: Newton, atrito, plano inclinado (Vol.1)" },
      { s: "prov", p: "F", t: "Dissecar mais 1 prova; cruzar pegadinhas que se repetem" },
    ] },
  { n: 5, start: "2026-06-29", end: "2026-07-05", focus: "Geometria avançada + simulado semanal",
    tasks: [
      { s: "mat", p: "F", t: "Geometria: polígonos regulares, áreas compostas" },
      { s: "mat", p: "P", t: "Proporção, porcentagem, juros simples" },
      { s: "ing", p: "P", t: "Modais; voz passiva" },
      { s: "por", p: "F", t: "Sintaxe: orações coordenadas e subordinadas (3.2); crase (4.1)" },
      { s: "por", p: "P", t: "Interpretação: manter volume pelas provas" },
      { s: "fis", p: "F", t: "Termologia (Vol.2)" },
      { s: "qui", p: "P", t: "Atomística e funções inorgânicas" },
    ] },
  { n: 6, start: "2026-07-06", end: "2026-07-12", focus: "Consolidação + redação entra",
    tasks: [
      { s: "mat", p: "P", t: "Progressões (fórmulas), estatística básica" },
      { s: "mat", p: "F", t: "Revisão geral de geometria" },
      { s: "ing", p: "P", t: "Relativos, preposições + revisão" },
      { s: "por", p: "F", t: "Concordância e regência verbal/nominal (Cap 3.3–3.4)" },
      { s: "red", p: "F", t: "1 redação dissertativa" },
      { s: "fis", p: "P", t: "Circuitos e eletrostática (Vol.3)" },
      { s: "soc", p: "P", t: "História colonial/império; geografia econômica" },
    ] },
  { n: 7, start: "2026-07-13", end: "2026-07-19", focus: "Simulados + redação semanal",
    tasks: [
      { s: "mat", p: "F", t: "Bateria por tópico FECHAR (focar erros do Simulado 2)" },
      { s: "ing", p: "F", t: "Revisão ativa: tempos verbais e morfologia" },
      { s: "por", p: "F", t: "Revisar crase/pontuação + 1 redação; interpretação pelas provas" },
      { s: "red", p: "F", t: "1 redação" },
      { s: "fis", p: "P", t: "Ondas; Química: estequiometria/equilíbrio" },
      { s: "soc", p: "P", t: "1ª República, Vargas; agropecuária, urbanização" },
    ] },
  { n: 8, start: "2026-07-20", end: "2026-07-26", focus: "Reta final — refazer as 10 provas até dominar",
    tasks: [
      { s: "prov", p: "F", t: "Refazer as 10 provas do CN até dominar; fechar o caderno de pegadinhas da banca" },
      { s: "mat", p: "F", t: "Refazer toda geometria errada das provas até sair no automático" },
      { s: "por", p: "F", t: "2 redações na semana + revisão de morfologia/sintaxe nos erros" },
      { s: "ing", p: "F", t: "Fechar pontos fáceis: gramática recorrente e química perto de 100%" },
    ] },
  { n: 9, start: "2026-07-27", end: "2026-08-01", focus: "Ajuste fino e descanso estratégico",
    tasks: [
      { s: "mat", p: "P", t: "1 simulado leve no início; depois só revisão" },
      { s: "por", p: "P", t: "Revisar morfologia, sintaxe, crase e acentuação (resumos)" },
      { s: "ing", p: "P", t: "Revisão leve" },
      { s: "prov", p: "P", t: "Reler o caderno de pegadinhas — não cair de novo no que já mapeou" },
    ] },
];

const SIM_PLAN = {
  3: "Simulado 1", 4: "Simulado 2", 5: "Simulado 3", 6: "Simulado 4", 7: "Simulado 5", 8: "Simulados 6 e 7", 9: "Simulado 8 (leve)",
};

// Meta de ritmo: ~25 questões/dia útil x5 + ~70/dia no fim de semana x2
const WEEKLY_TARGET = 250;

/* ---------- HELPERS ---------- */
// todayISO usa horário LOCAL de propósito: a virada de semana acontece à
// meia-noite do Brasil, não cedo demais por causa do fuso (UTC). Não trocar por UTC.
const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};
const fmtBR = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}`; };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function currentWeek() {
  const t = todayISO();
  for (const w of WEEKS) if (t >= w.start && t <= w.end) return w;
  if (t < WEEKS[0].start) return WEEKS[0];
  return WEEKS[WEEKS.length - 1];
}

const PROFILES = [
  { id: "aluno", label: "Aluno", desc: "Registra e edita tudo" },
  { id: "responsavel", label: "Responsável", desc: "Acompanha (somente leitura)" },
  { id: "pai", label: "Pai", desc: "Acompanha (somente leitura)" },
];

/* ============================================================ */
export default function App() {
  const [session, setSession] = useState(() => auth.user);
  const canEdit = session?.role === "editor";

  // mode: 'aluno' (edição) | 'acomp' (acompanhamento, só leitura)
  const [mode, setMode] = useState(() => (auth.user?.role === "editor" ? "aluno" : "acomp"));
  const [tab, setTab] = useState("painel");
  const [logs, setLogs] = useState([]);
  const [sims, setSims] = useState([]);
  const [done, setDone] = useState({}); // tarefas concluídas {"w1-2": true}
  const [loaded, setLoaded] = useState(false);

  // viewers nunca ficam no modo edição
  useEffect(() => { if (!canEdit && mode !== "acomp") setMode("acomp"); }, [canEdit, mode]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    (async () => {
      const [l, s, d] = await Promise.all([
        db.get("cn:logs", []),
        db.get("cn:sims", []),
        db.get("cn:tasks", {}),
      ]);
      if (!alive) return;
      setLogs(Array.isArray(l) ? l : []);
      setSims(Array.isArray(s) ? s : []);
      setDone(d && typeof d === "object" ? d : {});
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [session]);

  useEffect(() => { if (loaded && canEdit) db.set("cn:logs", logs); }, [logs, loaded, canEdit]);
  useEffect(() => { if (loaded && canEdit) db.set("cn:sims", sims); }, [sims, loaded, canEdit]);
  useEffect(() => { if (loaded && canEdit) db.set("cn:tasks", done); }, [done, loaded, canEdit]);

  function logout() {
    auth.clear();
    setSession(null);
    setLoaded(false);
    setLogs([]); setSims([]); setDone({});
    setTab("painel");
  }

  const week = currentWeek();
  const diasProva = Math.max(0, daysBetween(new Date(todayISO()), new Date("2026-08-01")));

  /* ---- métricas ---- */
  const m = useMemo(() => {
    const t = todayISO();
    const hoje = logs.filter((l) => l.date === t);
    const qHoje = hoje.reduce((a, l) => a + (+l.done || 0), 0);
    const wlogs = logs.filter((l) => l.date >= week.start && l.date <= week.end);
    const qSem = wlogs.reduce((a, l) => a + (+l.done || 0), 0);
    const totDone = logs.reduce((a, l) => a + (+l.done || 0), 0);
    const totCorr = logs.reduce((a, l) => a + (+l.correct || 0), 0);
    const acerto = totDone ? Math.round((totCorr / totDone) * 100) : 0;
    // streak
    const dset = new Set(logs.map((l) => l.date));
    let streak = 0; let d = new Date(todayISO());
    while (dset.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
    const diasSemana = new Set(wlogs.map((l) => l.date)).size;
    const metaPct = Math.round((qSem / WEEKLY_TARGET) * 100);
    const weak = SUBJECTS.map((x) => {
      const ls = logs.filter((l) => l.subject === x.id && l.correct !== "");
      const dd = ls.reduce((a, l) => a + (+l.done || 0), 0);
      const cc = ls.reduce((a, l) => a + (+l.correct || 0), 0);
      return { name: x.name, acc: dd ? Math.round((cc / dd) * 100) : null, n: dd };
    }).filter((x) => x.acc !== null && x.n >= 10 && x.acc < 60);
    let lastSim = null;
    if (sims.length) {
      const sm = [...sims].sort((a, b) => a.date.localeCompare(b.date))[sims.length - 1];
      lastSim = { label: sm.label, nota: Math.round((sm.scores.mat + sm.scores.ing) * 2.5) };
    }
    return { qHoje, qSem, totDone, acerto, streak, wlogs, diasSemana, metaPct, weak, lastSim };
  }, [logs, sims, week]);

  if (!session) return <Login onLogin={(data) => { auth.save(data.token, data); setSession(data); setMode(data.role === "editor" ? "aluno" : "acomp"); }} />;

  if (!loaded) return <div style={{ background: T.bg, color: T.sub, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Archivo, sans-serif" }}>Carregando painel…</div>;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.ink, fontFamily: "Archivo, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Archivo:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body { margin:0; max-width:100%; overflow-x:hidden; }
        ::selection { background:${T.gold}; color:#0A1622; }
        .fade { animation: fade .5s ease both; }
        @keyframes fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
        /* font-size 16px nos inputs evita o zoom automático do iOS ao focar */
        input, select, textarea { font-family: Archivo, sans-serif; font-size: 16px; }
        .num { font-variant-numeric: tabular-nums; }
        .disp { font-family: 'Fraunces', Georgia, serif; }
        .tab:hover { color:${T.ink} !important; }
        .row:hover { background:${T.cardHi} !important; }
        button { cursor:pointer; }
        .chk { transition: all .15s; }
        .navwrap { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .navwrap::-webkit-scrollbar { display: none; }
        @media (max-width: 560px) {
          .hdr-title { font-size: 17px !important; }
        }
      `}</style>

      {/* TOPO */}
      <header style={{ borderBottom: `1px solid ${T.line}`, background: T.bg2, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: `linear-gradient(135deg,${T.gold},#9c7d2e)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#0A1622", fontWeight: 700, flexShrink: 0 }} className="disp">⚓</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div className="disp hdr-title" style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>Painel CPACN/2026</div>
            <div style={{ fontSize: 11.5, color: T.sub, marginTop: 3 }}>Semana {week.n} de 9 · prova 1–2 de agosto</div>
          </div>

          {/* Editor pode alternar a visão (preview do acompanhamento); leitor fica travado */}
          {canEdit ? (
            <div style={{ display: "flex", background: T.card, borderRadius: 8, padding: 3, border: `1px solid ${T.line}` }}>
              {[["aluno", "Aluno"], ["acomp", "Acompanhamento"]].map(([k, lb]) => (
                <button key={k} onClick={() => setMode(k)} style={{ border: "none", background: mode === k ? T.gold : "transparent", color: mode === k ? "#0A1622" : T.sub, fontWeight: 600, fontSize: 12.5, padding: "9px 12px", minHeight: 40, borderRadius: 6 }}>{lb}</button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.gold, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", fontWeight: 600 }}>Acompanhamento</div>
          )}

          <div style={{ textAlign: "right", paddingLeft: 4 }}>
            <div className="num disp" style={{ fontSize: 22, fontWeight: 700, color: T.gold, lineHeight: 1 }}>{diasProva}</div>
            <div style={{ fontSize: 10.5, color: T.sub }}>dias p/ prova</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
            <span style={{ fontSize: 12, color: T.sub, whiteSpace: "nowrap" }}>{session.display_name}</span>
            <button onClick={logout} title="Sair" style={{ border: `1px solid ${T.line}`, background: T.card, color: T.sub, borderRadius: 8, padding: "8px 12px", minHeight: 40, fontSize: 12.5, fontWeight: 600 }}>Sair</button>
          </div>
        </div>
        {/* NAV */}
        <div className="navwrap" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 8px", display: "flex", gap: 2, overflowX: "auto" }}>
          {[["painel", "Painel"], ["registrar", "Registrar"], ["progresso", "Progresso"], ["simulados", "Simulados"], ["plano", "Plano"]]
            .filter(([k]) => !(mode === "acomp" && k === "registrar"))
            .map(([k, lb]) => (
              <button key={k} className="tab" onClick={() => setTab(k)} style={{ border: "none", background: "transparent", color: tab === k ? T.gold : T.sub, fontWeight: 600, fontSize: 14, padding: "13px 14px", minHeight: 46, whiteSpace: "nowrap", borderBottom: tab === k ? `2px solid ${T.gold}` : "2px solid transparent" }}>{lb}</button>
            ))}
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 16px 64px" }} className="fade" key={tab}>
        {tab === "painel" && <Painel m={m} week={week} done={done} setDone={setDone} mode={mode} />}
        {tab === "registrar" && mode === "aluno" && <Registrar logs={logs} setLogs={setLogs} />}
        {tab === "progresso" && <Progresso logs={logs} week={week} />}
        {tab === "simulados" && <Simulados sims={sims} setSims={setSims} mode={mode} />}
        {tab === "plano" && <Plano week={week} done={done} setDone={setDone} mode={mode} />}
      </main>
    </div>
  );
}

/* ---------- LOGIN ---------- */
function Login({ onLogin }) {
  const [profile, setProfile] = useState("aluno");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function entrar(e) {
    e && e.preventDefault();
    if (!pin) return;
    setBusy(true); setErr("");
    try {
      const data = await apiLogin(profile, pin);
      onLogin(data);
    } catch (e) {
      setErr("PIN incorreto. Tente de novo.");
      setBusy(false);
    }
  }

  return (
    <div style={{ background: `radial-gradient(1200px 600px at 50% -10%, ${T.bg2}, ${T.bg})`, minHeight: "100vh", color: T.ink, fontFamily: "Archivo, system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Archivo:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body { margin:0; max-width:100%; overflow-x:hidden; }
        input { font-size: 16px; font-family: Archivo, sans-serif; }
        button { cursor: pointer; }
        .disp { font-family: 'Fraunces', Georgia, serif; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 380, background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: `linear-gradient(135deg,${T.gold},#9c7d2e)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#0A1622", fontWeight: 700, fontSize: 20 }} className="disp">⚓</div>
          <div>
            <div style={{ color: T.gold, fontWeight: 800, letterSpacing: 1, fontSize: 12 }}>RUMO AO NAVAL</div>
            <div className="disp" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>Painel CPACN/2026</div>
          </div>
        </div>

        <form onSubmit={entrar}>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: .4 }}>Quem é você?</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {PROFILES.map((p) => {
              const on = profile === p.id;
              return (
                <button type="button" key={p.id} onClick={() => { setProfile(p.id); setErr(""); }} style={{ textAlign: "left", border: `1px solid ${on ? T.gold : T.line}`, background: on ? T.cardHi : T.bg, color: T.ink, borderRadius: 10, padding: "12px 14px", minHeight: 48 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>

          <label style={{ fontSize: 12, color: T.sub, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: .4 }}>PIN de acesso</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setErr(""); }}
            placeholder="••••"
            style={{ width: "100%", background: T.bg, border: `1px solid ${err ? T.red : T.line}`, color: T.ink, borderRadius: 10, padding: "13px 14px", letterSpacing: 4, textAlign: "center" }}
          />
          {err && <div style={{ color: T.red, fontSize: 12.5, marginTop: 8 }}>{err}</div>}

          <button type="submit" disabled={busy || !pin} style={{ width: "100%", marginTop: 16, background: (busy || !pin) ? T.line : T.gold, color: (busy || !pin) ? T.sub : "#0A1622", border: "none", borderRadius: 10, padding: "14px", minHeight: 50, fontWeight: 800, fontSize: 15 }}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
          Os 3 perfis veem os mesmos dados. Só o Aluno registra e edita.
        </div>
      </div>
    </div>
  );
}

/* ---------- COMPONENTES UI ---------- */
function Card({ children, style }) {
  return <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16, ...style }}>{children}</div>;
}
function Stat({ label, value, sub, color }) {
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11.5, color: T.sub, textTransform: "uppercase", letterSpacing: .5 }}>{label}</div>
      <div className="num disp" style={{ fontSize: 30, fontWeight: 700, color: color || T.ink, lineHeight: 1.1, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 3 }}>{sub}</div>}
    </Card>
  );
}
function Tag({ p }) {
  const x = PR[p];
  return <span style={{ fontSize: 10, fontWeight: 700, color: x.c, border: `1px solid ${x.c}`, borderRadius: 5, padding: "1px 6px", textTransform: "uppercase", letterSpacing: .4 }}>{x.t}</span>;
}
function SubjDot({ id }) {
  const s = SUBJ[id]; if (!s) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.ink }}><span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />{s.name}</span>;
}

/* ---------- RESUMO (acompanhamento) ---------- */
function Resumo({ m, week, doneCount, totalTasks }) {
  let cor = T.gold, rotulo = "Atenção", txt = "";
  const semDados = m.qSem === 0 && m.diasSemana === 0;
  if (semDados) { cor = T.sub; rotulo = "Sem registros"; txt = "Nenhum estudo registrado nesta semana ainda."; }
  else if (m.diasSemana >= 5 && m.acerto >= 70 && m.metaPct >= 80) { cor = T.green; rotulo = "No caminho"; txt = "Ritmo e acerto dentro do esperado. Mantendo o plano."; }
  else if (m.diasSemana < 3 || (m.acerto > 0 && m.acerto < 55) || m.metaPct < 40) { cor = T.red; rotulo = "Precisa de atenção"; txt = m.diasSemana < 3 ? "Poucos dias de estudo nesta semana." : m.metaPct < 40 ? "Volume de questões abaixo do necessário." : "Acerto baixo — está errando muito."; }
  else { cor = T.gold; rotulo = "Parcial"; txt = "Estudando, mas ainda fora do ritmo ou do acerto ideal."; }
  const linha = `Esta semana: estudou em ${m.diasSemana} de 7 dias, fez ${m.qSem} questões (${m.metaPct}% da meta) com ${m.acerto}% de acerto. Cumpriu ${doneCount} de ${totalTasks} tarefas do plano.`;
  return (
    <div style={{ background: T.card, border: `1px solid ${cor}`, borderRadius: 12, padding: 16, borderLeft: `5px solid ${cor}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: cor }} />
        <span className="disp" style={{ fontSize: 17, fontWeight: 700, color: cor }}>{rotulo}</span>
        <span style={{ fontSize: 12, color: T.sub }}>· Semana {week.n} de 9</span>
      </div>
      <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{txt}</div>
      {!semDados && <div style={{ fontSize: 12.5, color: T.sub, marginTop: 6, lineHeight: 1.5 }}>{linha}</div>}
      {m.lastSim && (
        <div style={{ fontSize: 12.5, color: T.ink, marginTop: 8 }}>
          Último simulado ({m.lastSim.label}) — nota projetada no Dia 1: <b style={{ color: m.lastSim.nota >= 70 ? T.green : m.lastSim.nota >= 50 ? T.gold : T.red }}>{m.lastSim.nota}/100</b>
        </div>
      )}
      {m.weak.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: T.ink }}>
          <span style={{ color: T.red, fontWeight: 700 }}>Pontos fracos:</span> {m.weak.map((w) => `${w.name} (${w.acc}%)`).join(" · ")}
        </div>
      )}
    </div>
  );
}

/* ---------- PAINEL ---------- */
function Painel({ m, week, done, setDone, mode }) {
  // questões por matéria nesta semana
  const porMat = SUBJECTS.map((s) => ({
    ...s, q: m.wlogs.filter((l) => l.subject === s.id).reduce((a, l) => a + (+l.done || 0), 0),
  })).filter((x) => x.q > 0);
  const totalTasks = week.tasks.length;
  const doneCount = week.tasks.filter((_, i) => done[`w${week.n}-${i}`]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {mode === "acomp" && <Resumo m={m} week={week} doneCount={doneCount} totalTasks={totalTasks} />}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="Questões hoje" value={m.qHoje} color={T.gold} />
        <Stat label="Questões na semana" value={m.qSem} sub={`meta ~${WEEKLY_TARGET} (${m.metaPct}%)`} color={m.metaPct >= 90 ? T.green : m.metaPct >= 60 ? T.gold : T.red} />
        <Stat label="Acerto geral" value={`${m.acerto}%`} color={m.acerto >= 70 ? T.green : m.acerto > 0 ? T.gold : T.sub} sub="meta: 80% p/ avançar" />
        <Stat label="Dias na semana" value={`${m.diasSemana}/7`} sub={`sequência: ${m.streak}`} color={m.diasSemana >= 6 ? T.green : m.diasSemana >= 4 ? T.gold : T.red} />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 6 }}>
          <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>Semana {week.n} · {fmtBR(week.start)}–{fmtBR(week.end)}</div>
          <div style={{ fontSize: 12, color: T.sub }}>{doneCount}/{totalTasks} tarefas</div>
        </div>
        <div style={{ fontStyle: "italic", color: T.gold, fontSize: 13.5, marginBottom: 4 }}>{week.focus}</div>
        {SIM_PLAN[week.n] && <div style={{ fontSize: 12.5, color: T.red, fontWeight: 600, marginBottom: 8 }}>⚑ {SIM_PLAN[week.n]} esta semana</div>}
        <div style={{ height: 6, background: T.bg, borderRadius: 4, overflow: "hidden", margin: "8px 0 14px" }}>
          <div style={{ width: `${totalTasks ? (doneCount / totalTasks) * 100 : 0}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.green})`, transition: "width .3s" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {week.tasks.map((tk, i) => {
            const key = `w${week.n}-${i}`; const ch = !!done[key];
            return (
              <label key={i} className="row chk" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 8px", borderRadius: 8, minHeight: 44, cursor: mode === "aluno" ? "pointer" : "default" }}>
                <input type="checkbox" checked={ch} disabled={mode !== "aluno"} onChange={() => setDone({ ...done, [key]: !ch })} style={{ marginTop: 2, accentColor: T.gold, width: 20, height: 20, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <SubjDot id={tk.s} /><Tag p={tk.p} />
                  </span>
                  <span style={{ display: "block", fontSize: 13.5, color: ch ? T.sub : T.ink, textDecoration: ch ? "line-through" : "none", marginTop: 2 }}>{tk.t}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Questões por matéria — esta semana</div>
        {porMat.length === 0 ? <Empty txt="Sem registros nesta semana ainda." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {porMat.sort((a, b) => b.q - a.q).map((s) => {
              const max = Math.max(...porMat.map((x) => x.q));
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 92, fontSize: 12.5, color: T.sub, flexShrink: 0 }}>{s.name}</div>
                  <div style={{ flex: 1, background: T.bg, borderRadius: 5, height: 22, overflow: "hidden" }}>
                    <div style={{ width: `${(s.q / max) * 100}%`, height: "100%", background: s.color, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, borderRadius: 5 }}>
                      <span className="num" style={{ fontSize: 12, fontWeight: 700, color: "#0A1622" }}>{s.q}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------- REGISTRAR ---------- */
function Registrar({ logs, setLogs }) {
  const [f, setF] = useState({ date: todayISO(), subject: "mat", topic: "", done: "", correct: "", minutes: "", notes: "" });
  const set = (k, v) => setF({ ...f, [k]: v });

  const add = () => {
    if (!f.done || +f.done <= 0) return;
    const correct = f.correct === "" ? "" : Math.min(+f.correct, +f.done);
    setLogs([{ id: uid(), ...f, done: +f.done, correct: correct === "" ? "" : +correct, minutes: f.minutes === "" ? "" : +f.minutes }, ...logs]);
    setF({ ...f, topic: "", done: "", correct: "", minutes: "", notes: "" });
  };
  const del = (id) => setLogs(logs.filter((l) => l.id !== id));

  const inputS = { background: T.bg, border: `1px solid ${T.line}`, color: T.ink, borderRadius: 8, padding: "12px 12px", fontSize: 16, width: "100%", minHeight: 46 };
  const lbl = { fontSize: 11.5, color: T.sub, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: .4 };

  const recent = logs.slice(0, 12);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div className="disp" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Registrar estudo do dia</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          <div><label style={lbl}>Data</label><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} style={inputS} /></div>
          <div><label style={lbl}>Matéria</label>
            <select value={f.subject} onChange={(e) => set("subject", e.target.value)} style={inputS}>
              {SUBJECTS.map((s) => <option key={s.id} value={s.id} style={{ background: T.bg2 }}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Tópico (opcional)</label><input value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder="ex: geometria — ângulo inscrito" style={inputS} /></div>
          <div><label style={lbl}>Questões feitas</label><input type="number" inputMode="numeric" min="0" value={f.done} onChange={(e) => set("done", e.target.value)} placeholder="0" style={inputS} /></div>
          <div><label style={lbl}>Acertos</label><input type="number" inputMode="numeric" min="0" value={f.correct} onChange={(e) => set("correct", e.target.value)} placeholder="0" style={inputS} /></div>
          <div><label style={lbl}>Minutos</label><input type="number" inputMode="numeric" min="0" value={f.minutes} onChange={(e) => set("minutes", e.target.value)} placeholder="opcional" style={inputS} /></div>
        </div>
        <div style={{ marginTop: 12 }}><label style={lbl}>Observações</label><input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="onde travou, o que revisar…" style={inputS} /></div>
        <button onClick={add} disabled={!f.done || +f.done <= 0} style={{ marginTop: 14, background: (!f.done || +f.done <= 0) ? T.line : T.gold, color: (!f.done || +f.done <= 0) ? T.sub : "#0A1622", border: "none", borderRadius: 8, padding: "13px 20px", minHeight: 48, fontWeight: 700, fontSize: 15 }}>+ Adicionar registro</button>
      </Card>

      <Card>
        <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Registros recentes</div>
        {recent.length === 0 ? <Empty txt="Nenhum registro ainda." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recent.map((l) => {
              const s = SUBJ[l.subject]; const acc = l.correct !== "" && l.done ? Math.round((l.correct / l.done) * 100) : null;
              return (
                <div key={l.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 8, borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s?.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: T.ink }}>{s?.name}{l.topic ? <span style={{ color: T.sub }}> · {l.topic}</span> : null}</div>
                    <div style={{ fontSize: 11.5, color: T.sub }}>{fmtBR(l.date)} · {l.done} questões{acc !== null ? ` · ${acc}% acerto` : ""}{l.minutes ? ` · ${l.minutes}min` : ""}</div>
                  </div>
                  <button onClick={() => del(l.id)} aria-label="Apagar registro" style={{ background: "transparent", border: "none", color: T.sub, fontSize: 22, width: 44, height: 44, flexShrink: 0, lineHeight: 1 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------- PROGRESSO ---------- */
function Progresso({ logs, week }) {
  // últimos 14 dias
  const days = useMemo(() => {
    const arr = []; const d = new Date(todayISO());
    for (let i = 13; i >= 0; i--) { const dd = new Date(d); dd.setDate(d.getDate() - i); const iso = dd.toISOString().slice(0, 10); arr.push({ iso, label: fmtBR(iso), q: logs.filter((l) => l.date === iso).reduce((a, l) => a + (+l.done || 0), 0) }); }
    return arr;
  }, [logs]);

  const porMat = SUBJECTS.map((s) => {
    const ls = logs.filter((l) => l.subject === s.id);
    const d = ls.reduce((a, l) => a + (+l.done || 0), 0);
    const c = ls.reduce((a, l) => a + (l.correct === "" ? 0 : +l.correct), 0);
    const cd = ls.filter((l) => l.correct !== "").reduce((a, l) => a + (+l.done || 0), 0);
    return { ...s, q: d, acc: cd ? Math.round((c / cd) * 100) : 0, hasAcc: cd > 0 };
  });
  const comAcc = porMat.filter((s) => s.hasAcc);
  const comQ = porMat.filter((s) => s.q > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Questões por dia — últimos 14 dias</div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={days} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.line} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: T.sub, fontSize: 10 }} axisLine={{ stroke: T.line }} tickLine={false} interval="preserveStartEnd" minTickGap={6} />
            <YAxis tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip contentStyle={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8, color: T.ink }} cursor={{ fill: "#ffffff08" }} labelStyle={{ color: T.sub }} />
            <Bar dataKey="q" radius={[4, 4, 0, 0]} fill={T.gold} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
        <Card>
          <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>% de acerto por matéria</div>
          {comAcc.length === 0 ? <Empty txt="Registre acertos pra ver o acerto por matéria." /> : (
            <ResponsiveContainer width="100%" height={Math.max(160, comAcc.length * 42)}>
              <BarChart layout="vertical" data={comAcc} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="short" tick={{ fill: T.sub, fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8 }} formatter={(v) => [`${v}%`, "acerto"]} cursor={{ fill: "#ffffff08" }} />
                <Bar dataKey="acc" radius={[0, 4, 4, 0]}>
                  {comAcc.map((s) => <Cell key={s.id} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Total de questões por matéria</div>
          {comQ.length === 0 ? <Empty txt="Sem registros ainda." /> : (
            <ResponsiveContainer width="100%" height={Math.max(160, comQ.length * 42)}>
              <BarChart layout="vertical" data={comQ} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line} horizontal={false} />
                <XAxis type="number" tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="short" tick={{ fill: T.sub, fontSize: 11 }} axisLine={false} tickLine={false} width={34} />
                <Tooltip contentStyle={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8 }} cursor={{ fill: "#ffffff08" }} />
                <Bar dataKey="q" radius={[0, 4, 4, 0]}>
                  {comQ.map((s) => <Cell key={s.id} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- SIMULADOS ---------- */
function Simulados({ sims, setSims, mode }) {
  const blank = { label: SIM_PLAN[currentWeek().n] || "Simulado", date: todayISO(),
    mat: "", ing: "", por: "", fis: "", qui: "", soc: "" };
  const [f, setF] = useState(blank);
  const set = (k, v) => setF({ ...f, [k]: v });

  // dia1: mat(20)+ing(20)=40 q ; dia2: 50 q (port+sociais+ciências)
  const add = () => {
    const entry = { id: uid(), label: f.label, date: f.date,
      scores: { mat: +f.mat || 0, ing: +f.ing || 0, por: +f.por || 0, fis: +f.fis || 0, qui: +f.qui || 0, soc: +f.soc || 0 } };
    setSims([...sims, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setF(blank);
  };
  const del = (id) => setSims(sims.filter((s) => s.id !== id));

  const chart = sims.map((s) => {
    const dia1 = s.scores.mat + s.scores.ing; // /40
    const tot = Object.values(s.scores).reduce((a, b) => a + b, 0);
    return { label: fmtBR(s.date), dia1, tot, mat: s.scores.mat, ing: s.scores.ing };
  });

  const inputS = { background: T.bg, border: `1px solid ${T.line}`, color: T.ink, borderRadius: 8, padding: "12px 12px", fontSize: 16, width: "100%", minHeight: 46 };
  const lbl = { fontSize: 11, color: T.sub, marginBottom: 4, display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Evolução nos simulados</div>
        {chart.length === 0 ? <Empty txt="Nenhum simulado registrado. A partir da Semana 5 começam." /> : (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chart} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} />
              <XAxis dataKey="label" tick={{ fill: T.sub, fontSize: 10 }} axisLine={{ stroke: T.line }} tickLine={false} minTickGap={6} />
              <YAxis tick={{ fill: T.sub, fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="dia1" name="Dia 1 (Mat+Ing /40)" stroke={T.gold} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="tot" name="Total de acertos" stroke={T.green} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {mode === "aluno" && (
        <Card>
          <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Registrar simulado</div>
          <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 12 }}>Acertos por matéria. Dia 1: Mat (20) + Inglês (20). Dia 2: Português, Est. Sociais e Ciências (Fís/Quí).</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 160 }}><label style={lbl}>Nome</label><input value={f.label} onChange={(e) => set("label", e.target.value)} style={inputS} /></div>
              <div style={{ flex: 1, minWidth: 130 }}><label style={lbl}>Data</label><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} style={inputS} /></div>
            </div>
            {[["mat", "Matemática /20"], ["ing", "Inglês /20"], ["por", "Português"], ["fis", "Física"], ["qui", "Química"], ["soc", "Est. Sociais"]].map(([k, lb]) => (
              <div key={k}><label style={lbl}>{lb}</label><input type="number" inputMode="numeric" min="0" value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder="0" style={inputS} /></div>
            ))}
          </div>
          <button onClick={add} style={{ marginTop: 14, background: T.gold, color: "#0A1622", border: "none", borderRadius: 8, padding: "13px 20px", minHeight: 48, fontWeight: 700, fontSize: 15 }}>+ Salvar simulado</button>
        </Card>
      )}

      {sims.length > 0 && (
        <Card>
          <div className="disp" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Histórico</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[...sims].reverse().map((s) => {
              const tot = Object.values(s.scores).reduce((a, b) => a + b, 0);
              return (
                <div key={s.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 8, borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.label} <span style={{ color: T.sub, fontWeight: 400 }}>· {fmtBR(s.date)}</span></div>
                    <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
                      Mat {s.scores.mat} · Ing {s.scores.ing} · Por {s.scores.por} · Fís {s.scores.fis} · Quí {s.scores.qui} · Soc {s.scores.soc}
                    </div>
                  </div>
                  <div className="num disp" style={{ fontSize: 20, fontWeight: 700, color: T.gold }}>{tot}</div>
                  {mode === "aluno" && <button onClick={() => del(s.id)} aria-label="Apagar simulado" style={{ background: "transparent", border: "none", color: T.sub, fontSize: 22, width: 44, height: 44, flexShrink: 0, lineHeight: 1 }}>×</button>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- PLANO ---------- */
function Plano({ week, done, setDone, mode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {WEEKS.map((w) => {
        const isNow = w.n === week.n;
        const dc = w.tasks.filter((_, i) => done[`w${w.n}-${i}`]).length;
        return (
          <Card key={w.n} style={{ borderColor: isNow ? T.gold : T.line, borderWidth: isNow ? 2 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: isNow ? T.gold : T.ink }}>
                Semana {w.n} {isNow && <span style={{ fontSize: 11, color: T.gold }}>· agora</span>}
              </div>
              <div style={{ fontSize: 12, color: T.sub }}>{fmtBR(w.start)}–{fmtBR(w.end)} · {dc}/{w.tasks.length}</div>
            </div>
            <div style={{ fontStyle: "italic", color: T.sub, fontSize: 13, margin: "3px 0 6px" }}>{w.focus}</div>
            {SIM_PLAN[w.n] && <div style={{ fontSize: 12, color: T.red, fontWeight: 600, marginBottom: 8 }}>⚑ {SIM_PLAN[w.n]}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {w.tasks.map((tk, i) => {
                const key = `w${w.n}-${i}`; const ch = !!done[key];
                return (
                  <label key={i} className="chk" style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 4px", minHeight: 44, cursor: mode === "aluno" ? "pointer" : "default" }}>
                    <input type="checkbox" checked={ch} disabled={mode !== "aluno"} onChange={() => setDone({ ...done, [key]: !ch })} style={{ marginTop: 2, accentColor: T.gold, width: 20, height: 20, flexShrink: 0 }} />
                    <span style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <SubjDot id={tk.s} /><Tag p={tk.p} />
                      <span style={{ fontSize: 13, color: ch ? T.sub : T.ink, textDecoration: ch ? "line-through" : "none", flexBasis: "100%" }}>{tk.t}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Empty({ txt }) {
  return <div style={{ padding: "24px 0", textAlign: "center", color: T.sub, fontSize: 13 }}>{txt}</div>;
}
