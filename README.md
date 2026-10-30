# TrackScale

**Smart links para campanhas de música. Analytics em tempo real. Detecção de bots incluída.**

Desenvolvido pela [Osten Company](https://osten.com.br).

---

## O que é

TrackScale é uma plataforma de smart links para artistas e labels. Um único link universal detecta o dispositivo do visitante e redireciona para a plataforma de streaming preferida — Spotify, Apple Music, YouTube Music, Deezer, Amazon Music e mais de 50 outros players.

Cada acesso é registrado com país, cidade, dispositivo, plataforma escolhida e score de bot. Dados limpos, em tempo real, sem depender de pixels de terceiros.

---

## Funcionalidades

### Smart Links
- Cole qualquer URL de streaming — título, artista e capa são buscados automaticamente via Odesli
- Slug customizável (`trackscale.app/l/nome-da-musica`)
- Deeplink para abrir diretamente no app instalado
- Temas customizáveis por link
- Ativo/inativo com um clique

### Analytics
- Cliques em tempo real por plataforma, país e dispositivo
- Separação de tráfego pago vs. orgânico (UTM params)
- Gráficos de série temporal
- Export CSV dos dados do link

### Detecção de Bots
- Score de 0–1 calculado por IP, user-agent, fingerprint e padrão de acesso
- Cliques com `botScore > 0.6` são marcados como filtrados
- Dados de bots isolados — não contaminam as métricas reais
- Detecção de datacenter via `isDatacenter`

### Artistas
- Cadastro de artistas com integração Spotify
- Múltiplos links por artista
- Pixels Meta vinculados por artista ou por link

### Meta Pixel & CAPI
- Pixels configuráveis no dashboard
- Eventos enviados via Conversions API (server-side)
- Suporte a `fbclid` e `gclid` para atribuição
- Event Match Quality otimizado

### Consent Manager
- Banner LGPD/GDPR integrado em cada smart link
- Status por visitante: `PENDING | GRANTED | DENIED`
- Cliques só são enviados ao CAPI com `consentGranted = true`

### Spotify
- Conexão OAuth por artista
- Monitoramento de seguidores de playlist
- Snapshots diários via cron job
- "Night vision" — salvar taxa por link

### Autenticação
- Login com email/senha (bcrypt)
- Registro com validação
- Esqueci a senha (email + token seguro com expiração)
- Redefinição de senha

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 App Router |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL via Neon |
| ORM | Prisma |
| Auth | NextAuth.js (credentials) |
| Estilo | Tailwind CSS |
| Email | Configurável (lib/email.ts) |
| Deploy | Vercel |

---

## Estrutura do Projeto

```
trackscale-app/
├── app/
│   ├── (auth)/             # Login, register, forgot/reset password
│   ├── (dashboard)/        # Dashboard, links, artistas, settings, tracking
│   │   ├── dashboard/      # Visão geral com stats
│   │   ├── links/          # CRUD de smart links + analytics por link
│   │   ├── artists/        # Gerenciamento de artistas
│   │   ├── settings/       # Conta, pixels, integrações
│   │   └── tracking/       # Visitantes e eventos de rastreamento
│   ├── l/[slug]/           # Página pública do smart link
│   ├── api/
│   │   ├── auth/           # NextAuth + forgot/reset + Spotify OAuth
│   │   ├── click/          # Registro de cliques + bot detection
│   │   ├── consent/        # Atualização de consentimento LGPD
│   │   ├── links/          # Export CSV, followers
│   │   ├── cron/           # Snapshot diário de seguidores
│   │   └── visitors/       # Detalhes de visitante individual
│   ├── LandingPage.tsx     # Landing page pública
│   └── page.tsx            # Root: redireciona para dashboard ou landing
├── components/             # UI reutilizável
├── lib/
│   ├── auth.ts             # Config NextAuth
│   ├── bot-detection.ts    # Algoritmo de score de bot
│   ├── email.ts            # Envio de email (reset de senha)
│   ├── geo.ts              # Geolocalização por IP
│   ├── meta-capi.ts        # Conversions API Meta
│   ├── odesli.ts           # Fetch de metadados de música
│   ├── prisma.ts           # Client Prisma singleton
│   ├── rate-limit.ts       # Rate limiting de API
│   └── spotify.ts          # Spotify API client
└── prisma/
    └── schema.prisma       # Schema do banco de dados
```

---

## Banco de Dados

### Modelos principais

```
User          → tem Links, Artists, Pixels, SpotifyConnections
Link          → tem Platforms, Visitors, Clicks, Pixels, Artists
Artist        → tem Links, Pixels
Pixel         → vinculado a Links e/ou Artists
Visitor       → registrado por acesso ao smart link
Click         → evento de clique em plataforma específica
Platform      → URL de cada plataforma no link
SpotifyConnection → OAuth token do artista
PlaylistFollowerSnapshot → histórico diário de seguidores
PasswordResetToken → tokens de redefinição de senha
```

### Campos de analytics no Visitor

| Campo | Descrição |
|---|---|
| `country`, `city`, `region` | Geo via IP |
| `device`, `browser`, `os` | User-agent |
| `botScore` | 0.0 (humano) → 1.0 (bot) |
| `isDatacenter` | IP de datacenter |
| `fingerprint` | Hash para deduplicação |
| `utmSource/Medium/Campaign` | Parâmetros de campanha |
| `fbclid`, `gclid` | IDs de atribuição |
| `consentStatus` | PENDING / GRANTED / DENIED |

---

## Variáveis de Ambiente

```env
# Banco de dados (Neon)
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://seudominio.com

# Spotify
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=https://seudominio.com/api/auth/spotify/callback

# Email (ex: Resend)
RESEND_API_KEY=...
EMAIL_FROM=noreply@seudominio.com

# Meta CAPI (opcional)
META_ACCESS_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=https://seudominio.com
CRON_SECRET=...
```

---

## Instalação Local

```bash
git clone https://github.com/osten/trackscale-app
cd trackscale-app
npm install

# Configure o .env com as variáveis acima
cp .env.example .env

# Migre o banco
npx prisma migrate dev

# Inicie o servidor
npm run dev
```

Acesse `http://localhost:3000`.

---

## Deploy (Vercel)

1. Importe o repositório no Vercel
2. Configure todas as variáveis de ambiente
3. O `vercel.json` já está configurado para rotear `/l/[slug]` corretamente
4. Cron job de seguidores de playlist: configure em Vercel Cron ou externo apontando para `/api/cron/playlist-followers` com o header `Authorization: Bearer $CRON_SECRET`

---

## Roadmap

- [ ] OG meta tags dinâmicas no smart link (capa + artista para preview social)
- [ ] Página 404 customizada
- [ ] Página de preços
- [ ] Onboarding do primeiro link
- [ ] Verificação de email no cadastro
- [ ] Exportação de analytics em PDF
- [ ] Suporte a domínio customizado
- [ ] TikTok Events API
- [ ] PWA / app mobile

---

## Licença

Proprietário — Osten Company. Todos os direitos reservados.
