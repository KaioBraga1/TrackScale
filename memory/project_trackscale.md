---
name: project-trackscale
description: TrackScale — smart links de campanha para a Osten Company; projeto criado do zero em Next.js 14
metadata:
  type: project
---

Projeto criado do zero em `/Users/kaiojbraga/Downloads/trackscale-app`.

Stack: Next.js 14 (App Router) + Prisma + PostgreSQL + NextAuth v5 (JWT, sem adapter) + Tailwind CSS.

**Status**: scaffold completo com TypeScript sem erros. Falta conectar um banco Postgres e rodar `prisma db push`.

**Etapas concluídas**:
1. Autenticação email+senha (bcrypt 12, rate limiting, IDOR checks)
2. CRUD de smart link (criar, editar, ativar/desativar, deletar)
3. Separação clara de pixel vs destinos de streaming no formulário
4. Rate limiting em login, registro e `/api/click`
5. Headers de segurança no next.config.js
6. AES-256-GCM para tokens Spotify
7. Spotify OAuth (start + callback)
8. Landing page pública `/l/[slug]` com tracking fail-safe
9. Dashboard com stats e bot-score filter
10. SECURITY.md com testes documentados

**Próximas etapas**:
- Etapa 5 do plano: testes de segurança avançados (fuzzing, CSRF, headers)
- Upload de imagem de capa (S3/Cloudflare R2)
- Testes unitários

**Why:** Produto interno da Osten Company para criar e gerenciar smart links de campanhas musicais.
**How to apply:** Ao continuar, sempre verificar `link.userId === session.user.id` antes de qualquer mutação.
