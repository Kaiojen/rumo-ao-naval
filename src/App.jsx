import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const T = {
  bg: "#0A1622",
  bg2: "#0E1F30",
  card: "#12273B",
  line: "#1E3A55",
  ink: "#EAF1F8",
  sub: "#8AA4BC",
  gold: "#CDA349",
  green: "#4FB477",
  red: "#D9695E",
};

const SUBJECTS = [
  { id: "mat", name: "Matemática", color: "#CDA349" },
  { id: "por", name: "Português", color: "#E0788E" },
  { id: "ing", name: "Inglês", color: "#49B6CF" },
  { id: "fis", name: "Física", color: "#9A8CF0" },
  { id: "qui", name: "Química", color: "#5FC089" },
  { id: "soc", name: "Est. Sociais", color: "#E0954A" },
  { id: "red", name: "Redação", color: "#46C6B0" },
  { id: "prov", name: "Provas antigas", color: "#C77DFF" },
];

const WEEKS = [
  { n: 1, start: "2026-05-30", end: "2026-06-07", focus: "Diagnóstico + base crítica", tasks: ["Aplicar 1 prova antiga completa", "Frações, potenciação e radiciação", "Murphy Units 1–14", "Acentuação e morfologia"] },
  { n: 2, start: "2026-06-08", end: "2026-06-14", focus: "Divisibilidade + fim da base", tasks: ["Divisibilidade, MDC e MMC", "Números racionais", "Murphy Units 15–25", "Morfologia: classes de palavras"] },
  { n: 3, start: "2026-06-15", end: "2026-06-21", focus: "Geometria + funções", tasks: ["Triângulos e semelhança", "Funções 1º/2º grau", "Cinemática", "Dissecar 1 prova antiga"] },
  { n: 4, start: "2026-06-22", end: "2026-06-28", focus: "Geometria pesada + sistemas", tasks: ["Círculo e áreas", "Equações e sistemas", "Sintaxe", "Dinâmica"] },
  { n: 5, start: "2026-06-29", end: "2026-07-05", focus: "Geometria avançada + simulado", tasks: ["Polígonos e áreas compostas", "Porcentagem e juros simples", "Crase e orações", "Termologia"] },
  { n: 6, start: "2026-07-06", end: "2026-07-12", focus: "Consolidação + redação", tasks: ["Progressões e estatística", "Revisão geral de geometria", "1 redação", "Circuitos e eletrostática"] },
  { n: 7, start: "2026-07-13", end: "2026-07-19", focus: "Simulados + redação semanal", tasks: ["Bateria por tópico", "Revisão ativa de inglês", "Crase e pontuação", "História e geografia"] },
  { n: 8, start: "2026-07-20", end: "2026-07-26", focus: "Reta final", tasks: ["Refazer 10 provas do CN", "Fechar caderno de pegadinhas", "2 redações", "Revisão de pontos fáceis"] },
  { n: 9, start: "2026-07-27", end: "2026-08-01", focus: "Ajuste fino e descanso", tasks: ["Simulado leve", "Revisão de resumos", "Revisão leve de inglês", "Reler caderno de pegadinhas"] },
];

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};
const fmt = (iso) => iso.split("-").reverse().slice(0, 2).join("/");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const get = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));

function currentWeek() {
  const t = todayISO();
  return WEEKS.find((w) => t >= w.start && t <= w.end) || (t < WEEKS[0].start ? WEEKS[0] : WEEKS[WEEKS.length - 1]);
}

function Card({ children }) {
  return <section style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 18, padding: 18 }}>{children}</section>;
}

export default function App() {
  const [tab, setTab] = useState("painel");
  const [logs, setLogs] = useState(() => get("cn:logs", []));
  const [done, setDone] = useState(() => get("cn:tasks", {}));
  const [form, setForm] = useState({ date: todayISO(), subject: "mat", done: "", correct: "", minutes: "", note: "" });
  const week = currentWeek();

  useEffect(() => set("cn:logs", logs), [logs]);
  useEffect(() => set("cn:tasks", done), [done]);

  const metrics = useMemo(() => {
    const today = todayISO();
    const weekLogs = logs.filter((l) => l.date >= week.start && l.date <= week.end);
    const qHoje = logs.filter((l) => l.date === today).reduce((a, l) => a + Number(l.done || 0), 0);
    const qSemana = weekLogs.reduce((a, l) => a + Number(l.done || 0), 0);
    const qTotal = logs.reduce((a, l) => a + Number(l.done || 0), 0);
    const corrTotal = logs.reduce((a, l) => a + Number(l.correct || 0), 0);
    const acc = qTotal ? Math.round((corrTotal / qTotal) * 100) : 0;
    return { qHoje, qSemana, qTotal, acc };
  }, [logs, week]);

  const bySubject = SUBJECTS.map((s) => {
    const rows = logs.filter((l) => l.subject === s.id);
    return { name: s.name, q: rows.reduce((a, l) => a + Number(l.done || 0), 0), color: s.color };
  }).filter((x) => x.q > 0);

  const byDay = Object.values(logs.reduce((acc, l) => {
    acc[l.date] ||= { date: fmt(l.date), q: 0 };
    acc[l.date].q += Number(l.done || 0);
    return acc;
  }, {}));

  function addLog(e) {
    e.preventDefault();
    if (!form.done) return;
    setLogs([{ id: uid(), ...form }, ...logs]);
    setForm({ date: todayISO(), subject: form.subject, done: "", correct: "", minutes: "", note: "" });
  }

  return (
    <main style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${T.bg}, #07111B)`, color: T.ink, fontFamily: "Inter, system-ui, Arial", padding: 18 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: T.gold, fontWeight: 800, letterSpacing: 1 }}>RUMO AO NAVAL</div>
            <h1 style={{ margin: "4px 0 0", fontSize: 30 }}>Painel de Estudos CPACN/2026</h1>
            <p style={{ margin: "6px 0 0", color: T.sub }}>Semana {week.n}: {week.focus} · {fmt(week.start)} a {fmt(week.end)}</p>
          </div>
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["painel", "registrar", "progresso", "plano"].map((x) => (
              <button key={x} onClick={() => setTab(x)} style={{ border: `1px solid ${tab === x ? T.gold : T.line}`, background: tab === x ? T.gold : T.bg2, color: tab === x ? T.bg : T.ink, padding: "10px 14px", borderRadius: 999, fontWeight: 700, textTransform: "capitalize" }}>{x}</button>
            ))}
          </nav>
        </header>

        {tab === "painel" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <Card><div style={{ color: T.sub }}>Questões hoje</div><strong style={{ fontSize: 34 }}>{metrics.qHoje}</strong></Card>
              <Card><div style={{ color: T.sub }}>Questões na semana</div><strong style={{ fontSize: 34 }}>{metrics.qSemana}</strong></Card>
              <Card><div style={{ color: T.sub }}>Total registrado</div><strong style={{ fontSize: 34 }}>{metrics.qTotal}</strong></Card>
              <Card><div style={{ color: T.sub }}>Acerto geral</div><strong style={{ fontSize: 34 }}>{metrics.acc}%</strong></Card>
            </div>
            <Card>
              <h2 style={{ marginTop: 0 }}>Checklist da semana</h2>
              <Checklist week={week} done={done} setDone={setDone} />
            </Card>
          </>
        )}

        {tab === "registrar" && (
          <Card>
            <h2 style={{ marginTop: 0 }}>Registrar estudo</h2>
            <form onSubmit={addLog} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
              <Field label="Data"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Matéria"><select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Questões feitas"><input type="number" value={form.done} onChange={(e) => setForm({ ...form, done: e.target.value })} /></Field>
              <Field label="Acertos"><input type="number" value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} /></Field>
              <Field label="Minutos"><input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></Field>
              <Field label="Observação"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              <button style={{ gridColumn: "1/-1", background: T.gold, color: T.bg, border: 0, borderRadius: 12, padding: 13, fontWeight: 800 }}>Salvar registro</button>
            </form>
          </Card>
        )}

        {tab === "progresso" && (
          <div style={{ display: "grid", gap: 16 }}>
            <Card><h2 style={{ marginTop: 0 }}>Questões por dia</h2><ResponsiveContainer width="100%" height={260}><LineChart data={byDay}><CartesianGrid strokeDasharray="3 3" stroke={T.line} /><XAxis dataKey="date" stroke={T.sub} /><YAxis stroke={T.sub} /><Tooltip /><Line type="monotone" dataKey="q" stroke={T.gold} strokeWidth={3} /></LineChart></ResponsiveContainer></Card>
            <Card><h2 style={{ marginTop: 0 }}>Questões por matéria</h2><ResponsiveContainer width="100%" height={280}><BarChart data={bySubject}><CartesianGrid strokeDasharray="3 3" stroke={T.line} /><XAxis dataKey="name" stroke={T.sub} /><YAxis stroke={T.sub} /><Tooltip /><Bar dataKey="q" fill={T.green} /></BarChart></ResponsiveContainer></Card>
          </div>
        )}

        {tab === "plano" && WEEKS.map((w) => (
          <Card key={w.n}>
            <h2 style={{ margin: 0, color: w.n === week.n ? T.gold : T.ink }}>Semana {w.n}</h2>
            <p style={{ color: T.sub }}>{fmt(w.start)}–{fmt(w.end)} · {w.focus}</p>
            <Checklist week={w} done={done} setDone={setDone} />
          </Card>
        ))}
      </div>
    </main>
  );
}

function Checklist({ week, done, setDone }) {
  return <div style={{ display: "grid", gap: 8 }}>{week.tasks.map((t, i) => {
    const key = `w${week.n}-${i}`;
    return <label key={key} style={{ display: "flex", gap: 10, alignItems: "center", color: done[key] ? T.sub : T.ink }}><input type="checkbox" checked={!!done[key]} onChange={() => setDone({ ...done, [key]: !done[key] })} /> <span style={{ textDecoration: done[key] ? "line-through" : "none" }}>{t}</span></label>;
  })}</div>;
}

function Field({ label, children }) {
  const child = React.cloneElement(children, { style: { width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.line}`, color: T.ink, borderRadius: 10, padding: 11 } });
  return <label style={{ display: "grid", gap: 6, color: T.sub, fontSize: 13 }}>{label}{child}</label>;
}
