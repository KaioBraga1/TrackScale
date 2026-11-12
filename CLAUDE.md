# TrackScale (TrackScaler)

Smart links para campanhas de música (Osten Company): link único que detecta o dispositivo, redireciona ao player de streaming e registra cliques com score de bot, consentimento LGPD e envio ao Meta CAPI.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript `strict`
- Prisma 5 + PostgreSQL (Neon) — `prisma-client-js`
- NextAuth v5 beta (Credentials, sessão JWT, sem adapter) + bcryptjs
- Tailwind CSS 3, validação com Zod
- Stripe (billing), Resend (email), Spotify/Meta OAuth, Odesli
- Deploy na Vercel (cron diário em `vercel.json`)

## Comandos

- `npm run dev` / `npm run build` (já roda `prisma generate`)
- `npm run db:push` · `db:studio` · `db:generate`
- Sem testes nem linter configurados; valide com `npx tsc --noEmit`.

## Estrutura

- `app/(auth)/` — login, registro, esqueci/redefinir senha
- `app/(dashboard)/` — área logada (dashboard, links, artists, settings, tracking…); cada rota tem `page.tsx` + `actions.ts` (Server Actions)
- `app/[slug]/` — página pública do smart link (na raiz do domínio, não em `/l/`)
- `app/api/` — route handlers: auth, click, consent, links, stripe, spotify, cron, visitors, register
- `components/` — UI reutilizável; `components/motion/` animações
- `lib/` — integrações e utilitários server-side (auth, prisma, stripe, spotify, meta-capi, crypto, rate-limit, bot-detection, geo, email, odesli)
- `prisma/schema.prisma` — schema único do banco
- `types/` — extensões de tipos (ex.: `next-auth.d.ts`)
- `public/track.js` — script de tracking do lado do visitante
- `middleware.ts` — protege rotas do dashboard via `auth`
- `memory/`, `.taste-skill/`, `assets/`, `.firecrawl/`, `trackscaleV2.zip` — material de apoio, não é código do app

## Convenções de código

- Imports com alias `@/` (raiz do projeto); sem ponto-e-vírgula, aspas simples, 2 espaços.
- Mutações via Server Actions (`'use server'`) em `actions.ts` ao lado da página; endpoints externos/webhooks em `app/api/**/route.ts`.
- Todo input é validado com schemas Zod (`safeParse`) antes de tocar no banco.
- Toda mutação confere ownership: `link.userId === session.user.id` (evita IDOR). Obtenha o usuário com `auth()` de `@/lib/auth`.
- Prisma sempre pelo singleton `@/lib/prisma`; use `select` explícito em dados sensíveis.
- Rate limit com `rateLimit(key, limit, windowMs)` de `lib/rate-limit.ts` (in-memory; só vale por instância).
- Slugs: regex em `links/actions.ts` + lista `RESERVED_SLUGS` — ao criar nova rota na raiz, adicione-a lá.
- Interface do app em inglês (traduzida); comentários internos e docs misturam português/inglês.
- Tokens de terceiros (Spotify) são criptografados com AES-256-GCM via `lib/crypto.ts`.
- `prisma/migrations` está no `.gitignore`: o fluxo é `db push`, não migrations versionadas.
- Cliques só vão ao CAPI com `consentGranted = true`; `botScore > 0.6` = filtrado.
- Ao mudar a estrutura de pastas ou rotas públicas, o README está desatualizado (cita `/l/[slug]`) — atualize junto.

## Nunca faça sem perguntar

Peça confirmação explícita antes de alterar, apagar ou rodar comandos que afetem:

- **`prisma/schema.prisma`** e qualquer `db push`/`migrate` — o banco Neon (`.neon` aponta para `production`) pode ser o de produção.
- **Autenticação:** `lib/auth.ts`, `middleware.ts`, `types/next-auth.d.ts`, `app/api/auth/**`, `app/api/register`, fluxo de reset de senha, `lib/rate-limit.ts`.
- **Pagamentos:** `lib/stripe.ts`, `app/api/stripe/**` (webhook, checkout, portal), `components/BillingPanel.tsx`, `BillingAddress` e campos de plano em `User`.
- **Segredos e criptografia:** `.env`, `.env.example`, `lib/crypto.ts`, `ENCRYPTION_KEY` (trocar invalida tokens Spotify salvos). Nunca leia, imprima ou commite valores de `.env`.
- **Infra/config:** `vercel.json` (cron), `next.config.js` (headers de segurança), `neon.ts`, `.neon`, `.gitignore`.
- **Privacidade/tracking:** `lib/meta-capi.ts`, `app/api/consent`, `app/api/click` (consentimento LGPD e bot detection).
- **Ações destrutivas:** `git push`, `git reset --hard`, deletar `.next`/`node_modules`, qualquer comando contra o banco real.
- Atualizar dependências principais (`next`, `next-auth`, `prisma`, `stripe`) — há versões beta e patches de segurança fixados.
