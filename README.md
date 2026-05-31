# Rumo ao Naval — Painel de Estudos CPACN/2026

Painel de acompanhamento de estudos para o concurso do Colégio Naval (prova 1–2 de agosto de 2026).
React + Vite, publicado no Vercel, com banco compartilhado no Supabase.

Usado por 3 pessoas, principalmente no **celular**:
- **Aluno** — registra e edita tudo.
- **Responsável** e **Pai** — acompanham (somente leitura).

Os três logam de aparelhos diferentes e veem **os mesmos dados**.

## Abas
- **Painel:** resumo do dia/semana, checklist da semana atual, questões por matéria. No modo Acompanhamento mostra um resumo de status.
- **Registrar:** loga questões feitas, acertos, minutos e observações (só Aluno).
- **Progresso:** gráficos de questões/dia, % de acerto e total por matéria.
- **Simulados:** registra acertos por matéria e mostra a evolução. Nota projetada do Dia 1 = (mat + ing) × 2,5.
- **Plano:** as 9 semanas com prioridade por cor (Fechar / Pincelar / Mínimo).

A semana ativa avança **sozinha pela data local** (vira à meia-noite do Brasil).

## Arquitetura

```
Celular ──► App (Vercel, estático)
               │  fetch
               ▼
        Edge Function `api` (Supabase)  ──►  Postgres (Supabase)
        login por PIN + permissão real        tabelas com RLS
```

- **Front:** `src/App.jsx`. A camada de dados fica isolada no objeto `db` (topo do arquivo) e em `src/config.js`.
  `db.get`/`db.set` só fazem `fetch` para a Edge Function — o resto do app não mudou.
- **Backend (API):** `supabase/functions/api/index.ts`. Lê/grava as três coleções
  (`cn:logs`, `cn:sims`, `cn:tasks`) e faz a autenticação.
- **Banco:** tabelas `app_users` (perfis + PIN), `sessions` (login) e `collections` (os dados).
  RLS ativo: ninguém acessa os dados com a chave pública — só a Edge Function (service role).

### Autenticação e permissão (de verdade)
- Login por **PIN**, um por perfil. O front guarda um token de sessão.
- **Escrita exige perfil `editor`** (aluno). Responsável e pai (`viewer`) recebem **403** ao tentar gravar/apagar —
  não é só esconder botão no front, é bloqueio no backend.
- Cada registro de log/simulado guarda o campo `author` (quem criou), carimbado no servidor.

## Rodar local
```bash
npm install
npm run dev
```
As chaves públicas do Supabase já estão em `src/config.js`. A `service_role` **não** fica no repositório —
ela é injetada automaticamente na Edge Function pelo Supabase.

## Deploy
- **Front:** Vercel (framework Vite, build `npm run build`, output `dist`).
- **API + banco:** Supabase (projeto `rumo-ao-naval`, região `sa-east-1`).
  Function: `supabase functions deploy api --no-verify-jwt`.

## Trocar PINs
Os PINs ficam na tabela `app_users` do Supabase (coluna `pin`). Para trocar, basta atualizar a linha do perfil.
