# SECURITY.md — TrackScale

Documento de postura de segurança, testes realizados e controles implementados.

---

## Controles implementados

### Autenticação
- Senhas com bcrypt (custo 12), nunca em texto puro
- JWT httpOnly gerenciado pelo NextAuth v5
- Rate limit de login: 5 tentativas por 15 minutos por IP+email
- Sem enumeração de usuários: resposta genérica em caso de email já cadastrado

### Autorização (IDOR)
- Todas as rotas de dashboard verificam `link.userId === session.user.id` antes de ler/editar/deletar
- Middleware NextAuth protege todas as rotas `/dashboard` e `/links`

### Validação de input
- Zod em todos os endpoints e server actions
- Slugs: regex restritiva `[a-z0-9][a-z0-9-]*`
- Meta Pixel ID: regex `\d{10,20}` — apenas numérico
- URLs de plataforma: `z.string().url()` antes de salvar no banco

### Injeção SQL
- Prisma Client usa queries parametrizadas; zero raw SQL no código
- Nenhum input de usuário é concatenado em queries

### XSS
- React escapa automaticamente todo output
- `dangerouslySetInnerHTML` não é usado em nenhum componente
- Meta Pixel carregado via `document.createElement('script')` com ID validado (somente numérico)

### CSRF
- Server Actions do Next.js têm proteção CSRF nativa (origin check + SameSite)
- NextAuth gerencia CSRF para rotas `/api/auth/*`
- `/api/click` é endpoint público intencional; rate limiting por IP

### Rate limiting
- Login: 5 req / 15 min por IP+email
- Registro: 5 req / hora por IP
- `/api/click`: 60 req / min por IP e 10 req / 10 s por fingerprint
- `/api/consent`: 30 req / min por IP
- Limites são em memória por processo; em produção com múltiplas instâncias, configurar Redis/Upstash

### Verificação de tráfego e consentimento
- Score de confiança humana combina sinais client-side (60%) e server-side (40%); eventos abaixo de 55/100 são filtrados
- User-Agent e flag `hosting` do ip-api.com entram na camada server-side; consulta de geolocalização tem cache local de 15 minutos e timeout de 2 s
- Eventos suspeitos são persistidos com `Click.isFiltered = true` e excluídos das métricas reais
- `Visitor.botScore`/`Click.botScore` permanecem como risco inverso (0 = humano, 1 = bot); métricas também mantêm o corte legado `< 0.5` para preservar o filtro de dados antigos
- Pixels Meta só carregam após verificação bem-sucedida e consentimento explícito
- Recusar consentimento não bloqueia o link musical; IP e fingerprint não são persistidos sem consentimento
- A preferência é salva em `localStorage` e no modelo `Visitor`; `Click.consentGranted` registra o estado por evento
- Requer aplicar o schema atualizado antes de executar a aplicação: `npx prisma db push`
- Playlist Followers: permitir `playlist-read-private` e `playlist-read-collaborative` no Spotify OAuth; configurar `CRON_SECRET` e chamar `POST /api/cron/playlist-followers` diariamente (UTC). É possível sincronizar manualmente pela página de stats.

### Headers de segurança (`next.config.js`)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy`: default-src 'self'; whitelist mínimo para Meta Pixel
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, mic e geolocation desabilitados

### Criptografia de tokens do Spotify
- Tokens em repouso com AES-256-GCM (via `lib/crypto.ts`)
- IV aleatório de 96 bits por operação
- Auth tag de 128 bits
- Chave nunca commitada — apenas em `.env` (listado no `.gitignore`)

### Variáveis de ambiente
- `.env` no `.gitignore`
- `.env.example` com placeholders — sem valores reais

---

## Testes realizados

### 1. SQL Injection

**Alvo**: formulário de criação de link (campo `slug`, `title`, `artist`)  
**Payload**: `'; DROP TABLE links; --`, `" OR "1"="1`  
**Resultado**: ✅ PASSOU — Zod rejeita com erro de validação antes de chegar ao Prisma. Prisma usa queries parametrizadas.

**Alvo**: `/api/click` — campo `slug`  
**Payload**: `test'; SELECT * FROM users; --`  
**Resultado**: ✅ PASSOU — regex `/^[a-z0-9-]+$/` rejeita no Zod. Status 400 retornado.

---

### 2. XSS (Cross-Site Scripting)

**Alvo**: campos `title`, `artist`, `slug` salvos e renderizados no dashboard e landing page  
**Payload**: `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`  
**Resultado**: ✅ PASSOU — React escapa todo output. Payload armazenado como string literal inofensiva.

**Alvo**: Meta Pixel ID  
**Payload**: `1234'; document.cookie`  
**Resultado**: ✅ PASSOU — regex `\d{10,20}` bloqueia no Zod antes de salvar. O ID só é passado para `fbq('init', pixelId)` após validação numérica.

---

### 3. Força bruta no login

**Cenário**: 10 tentativas sequenciais com senha errada para o mesmo email/IP  
**Resultado**: ✅ PASSOU — a partir da 6ª tentativa, `authorize()` retorna `null` silenciosamente (rate limit `login:{ip}:{email}`, 5/15min). O usuário vê a mesma mensagem "Email ou senha inválidos" sem indicação de bloqueio (sem enumeração de estado).

---

### 4. IDOR (Insecure Direct Object Reference)

**Cenário**: Usuário A tenta acessar `/links/{id_do_link_de_B}`  
**Resultado**: ✅ PASSOU — `notFound()` é chamado quando `link.userId !== session.user.id`. HTTP 404 retornado; nenhum dado vazado.

**Cenário**: Usuário A tenta editar link de B via POST da server action  
**Resultado**: ✅ PASSOU — `updateLink` verifica `link.userId !== userId` antes de qualquer escrita.

---

### 5. Acesso não autenticado a rotas protegidas

**Cenário**: GET `/dashboard` sem cookie de sessão  
**Resultado**: ✅ PASSOU — middleware redireciona para `/login`.

---

## Testes pendentes (etapa 2)

- [ ] Fuzzing nos endpoints com payloads malformados (ferramentas: ffuf, Burp Suite)
- [ ] Teste de CSRF nas rotas autenticadas (verificar se requisição cross-origin é rejeitada)
- [ ] Verificação automatizada de headers (`npx security-headers` ou `curl -I`)
- [ ] Revisão de vazamento de dados cross-user em `/api/click`
- [ ] Teste de timing attack no endpoint de login

---

## Como gerar as chaves de ambiente

```bash
# AUTH_SECRET (NextAuth)
openssl rand -base64 32

# ENCRYPTION_KEY (AES-256 para tokens Spotify)
openssl rand -hex 32
```
