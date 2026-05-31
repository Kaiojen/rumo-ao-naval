# Rumo ao Naval — Painel de Estudos CPACN/2026

Painel de acompanhamento de estudos para o concurso do Colégio Naval (prova 1–2 de agosto de 2026). React + Vite, pronto pra publicar no Vercel.

## O que ele faz
- **Painel:** resumo do dia/semana, checklist da semana atual, questões por matéria.
- **Registrar:** loga questões feitas, acertos, minutos e observações (modo Aluno).
- **Progresso:** gráficos de questões/dia, % de acerto e total por matéria.
- **Simulados:** registra acertos por matéria e mostra a evolução.
- **Plano:** as 9 semanas com prioridade por cor (Fechar / Pincelar / Mínimo).

A semana ativa avança **sozinha pela data** (vira na meia-noite local). Sem ajuste manual.

## Rodar local
```bash
npm install
npm run dev
```

## Subir no GitHub (repositório já criado)
Dentro da pasta `rumo-ao-naval`:
```bash
git init
git add .
git commit -m "Painel de estudos CPACN/2026"
git branch -M main
git remote add origin https://github.com/Kaiojen/rumo-ao-naval.git
git push -u origin main
```

## Publicar no Vercel
1. Vercel → New Project → importe o repositório `rumo-ao-naval`.
2. Framework: **Vite** (detectado automaticamente). Build: `npm run build`. Output: `dist`.
3. Deploy.

## IMPORTANTE — persistência
Hoje os dados ficam no **localStorage do navegador** (por dispositivo). Aluno, você e o pai
veem dados separados, cada um no seu aparelho.

Para compartilhar de verdade entre os três, é preciso um backend (banco). O ponto de troca está
isolado no objeto `db` no topo de `src/App.jsx` — basta trocar o corpo de `db.get` e `db.set`
por chamadas à sua API (ex.: Vercel Postgres / KV). O resto do app não muda.

O modo **Acompanhamento** só esconde os formulários de edição; não é segurança real.
Controle de acesso por pessoa exige autenticação no backend.
