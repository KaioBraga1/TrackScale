# TrackScale V2 — Arquivo completo

Gerado em 2026-10-14 17:38. Contém, nesta ordem: (1) Handoff, (2) Investigação do song.so com evidências, (3) README, (4) todo o código-fonte (48 arquivos).
Para recriar o projeto: crie cada arquivo da Parte 4 no caminho indicado, rode `npm install` e `npm run dev`.

## Índice do código-fonte

- `index.html` (15 linhas)
- `package.json` (24 linhas)
- `server/index.mjs` (167 linhas)
- `src/App.tsx` (54 linhas)
- `src/campaigns/adsStore.tsx` (356 linhas)
- `src/campaigns/campaigns.test.ts` (127 linhas)
- `src/campaigns/dates.ts` (30 linhas)
- `src/campaigns/format.ts` (6 linhas)
- `src/campaigns/metrics.ts` (62 linhas)
- `src/campaigns/naming.ts` (14 linhas)
- `src/campaigns/optimizer.ts` (165 linhas)
- `src/campaigns/plan.ts` (86 linhas)
- `src/campaigns/series.ts` (22 linhas)
- `src/campaigns/simulate.ts` (24 linhas)
- `src/components/MiniChart.tsx` (91 linhas)
- `src/components/Modal.tsx` (51 linhas)
- `src/components/MultiSearchSelect.tsx` (78 linhas)
- `src/components/ReleaseSearchBox.tsx` (99 linhas)
- `src/data/mock.ts` (15 linhas)
- `src/lib/store.tsx` (95 linhas)
- `src/lib/types.ts` (21 linhas)
- `src/main.tsx` (10 linhas)
- `src/meta/presets.ts` (56 linhas)
- `src/meta/provider.ts` (122 linhas)
- `src/meta/rng.ts` (21 linhas)
- `src/meta/seed.ts` (47 linhas)
- `src/meta/types.ts` (98 linhas)
- `src/pages/Analytics.tsx` (58 linhas)
- `src/pages/Dashboard.tsx` (42 linhas)
- `src/pages/SmartlinkPublic.tsx` (36 linhas)
- `src/pages/Smartlinks.tsx` (93 linhas)
- `src/pages/campaigns/AdSetEditor.tsx` (95 linhas)
- `src/pages/campaigns/AutomationModal.tsx` (101 linhas)
- `src/pages/campaigns/CampaignTable.tsx` (243 linhas)
- `src/pages/campaigns/CampaignWizard.tsx` (332 linhas)
- `src/pages/campaigns/CampaignsPage.tsx` (100 linhas)
- `src/pages/campaigns/ConnectionCard.tsx` (144 linhas)
- `src/pages/campaigns/ImportModal.tsx` (77 linhas)
- `src/pages/campaigns/JobCards.tsx` (54 linhas)
- `src/search/clientFilter.ts` (16 linhas)
- `src/search/releaseSearch.ts` (64 linhas)
- `src/search/sanitizeTerm.ts` (11 linhas)
- `src/search/search.test.ts` (45 linhas)
- `src/search/useAsyncSearch.ts` (43 linhas)
- `src/search/useDebouncedValue.ts` (10 linhas)
- `src/styles.css` (268 linhas)
- `tsconfig.json` (14 linhas)
- `vite.config.ts` (10 linhas)

---

# PARTE: HANDOFF.md

## TrackScale V2 — Handoff completo

> Documento autocontido para levar este trabalho a outro sistema (outro repositório, outra equipe
> ou outro agente de IA). Explica o que foi analisado, o que foi construído, como as peças
> funcionam, o que é real e o que é simulado, e como portar.
>
> Data: 2026-10-14 · Stack: React 18 + TypeScript + Vite 5 + Vitest · Estado: protótipo funcional (Meta simulada)

---

### 1. Resumo em 30 segundos

- **Produto:** plataforma para músicos com **smartlinks** (uma página por lançamento, com botões para
  Spotify, Apple Music…) e **campanhas Meta Ads otimizadas pelo custo real por clique nas plataformas (RCPR)**.
- **Referência:** `app.song.so/campaigns`, analisado a partir dos bundles JS e CSS públicos (seção 2).
- **Construído:** app React completo com dashboard, smartlinks, página pública com tracking, wizard de
  campanha em 5 passos, job de lançamento em fases, tabela de métricas com gráficos, automação com log,
  importação de campanhas e um proxy Node para a Meta Graph API.
- **Simulado:** toda a Meta (contas, métricas, criação). O proxy real existe, mas **não foi testado
  com credenciais** e **a UI ainda não chama as escritas dele**.
- **Verificado:** 20 testes passam, `tsc` sem erros, build ok, e o fluxo completo foi rodado em
  navegador headless sem erros no console.

---

### 2. O que foi analisado (song.so)

#### Método
Análise **estática** dos arquivos públicos do site (`index.html` → `main-*.js` → `App-*.js` →
chunk lazy `Campaigns-Dqm-wdpl.js`, com 417 KB, mais `metaCampaigns-*.js` e os CSS), sem login e
sem chamar a API deles. O bundle contém uma anon key pública do Supabase, que **não foi usada**.

#### Arquitetura deles
- SPA React + Vite, hospedada em Netlify/Cloudflare.
- Backend **Supabase** (Postgres/PostgREST + Edge Functions).
- Integração com a Meta via Edge Functions `meta-ads-api`, `meta-ads-structure`, `meta-ads-insights` e
  `meta-ads-create`, roteadas por um mapa `FN_BY_ACTION` no cliente.

#### As três buscas
| Busca | Onde roda | Regras |
|---|---|---|
| Seletor de release | Servidor (PostgREST) | Debounce 300 ms. `title/artist_name/slug ILIKE %t%` combinados por OR. Filtra `user_id`, `type in (smartlink, presave)`, `deleted_at is null`. Ordena por `created_at desc`, limite 10. Aceita URL colada (usa o slug). Remove `, ( ) %`. Campo vazio mostra "Recent releases". Item selecionado com `onMouseDown` + `preventDefault`. |
| Interesses e países | Edge Function → Meta | Debounce 300 ms, mínimo de 2 caracteres, descarta resposta atrasada (flag `stopped`), exclui os já escolhidos. |
| Filtros locais | Cliente | Substring case-insensitive sobre vários campos unidos. Sem termo, mostra só os objetivos sugeridos. |

#### Inventário funcional (do bundle)
- **Actions da Meta:** `list_business_managers, list_ad_accounts, list_pixels, list_pages, resolve_page_ig,
  list_instagram_accounts, search_targeting, list_custom_audiences, create_custom_audience, list_page_reels,
  list_ig_media, list_all_campaigns, list_campaign_structure, get_adset_creatives, get_adset_details,
  get_video_sources, get_ad_insights, create_campaign, create_adset, create_ad_creative, create_ad,
  create_flexible_ad, update_ad_status, update_adset_targeting, upload_video, video_status,
  stage_creative, marketing_api_request, save/get_default_assets, smartlink_campaign_status`.
- **Tabelas:** `smartlinks, meta_ads_campaigns, meta_ads_connections, meta_ads_cache, meta_ad_interests,
  meta_campaign_jobs, meta_campaign_steps, meta_upload_jobs, meta_optimization_rules,
  meta_ads_optimization_log, meta_optimize_progress, creative_projects, creative_bulk_items, platforms`.
- **RPCs:** `meta_campaign_job_start/resume/cancel, meta_ads_song_clicks, meta_ads_tour_clicks,
  meta_ads_resolve_smartlink`.
- **Telas:** abas Release/Tour; ativos padrão; wizard com rascunho; presets de país; artistas similares;
  público incluir/excluir; criativos por upload, Reels ou clipes renderizados; job no servidor; tabela de
  métricas; automação com log; importar, remover e excluir.

#### Linguagem visual
- Fundo escuro, neon `#12fb9b`, fonte **Space Mono**.
- Classes `cyber-button`, `cyber-input-glow`, `glow-text` e `glow-border`.
- Animações: `glow`, `pulse-glow`, `shimmer`, `shine` e `blob`, mais as inline `reco-idle` (equalizador),
  `reco-glow` (brilho radial) e `opt-sweep` (varredura do progresso).
- **Tudo foi recriado com CSS próprio.** Nenhum asset, logo ou arquivo do song.so foi copiado.

Evidências completas, com trechos de código extraídos: **`INVESTIGACAO-BUSCA-SONGSO.md`**.

---

### 3. Como rodar

```bash
npm install
npm run dev        # http://localhost:5173 (Meta simulada)
npm test           # 20 testes
npm run build      # tsc --noEmit && vite build
```

**Roteiro de demonstração:**
1. Em `/campaigns`, escolha os ativos e clique em **Conectar**.
2. Em **Importar**, traga duas campanhas.
3. Expanda as linhas para ver conjuntos, anúncios e gráficos.
4. Clique em **Otimizar agora** e veja o resultado em **Automação → Log**.
5. Use **Simular +1 dia** para gerar mais um dia de métricas e disparar a automação.
6. Em `/campaigns/new`, percorra o wizard, clique em **Criar campanha** e acompanhe o job.

**Meta real:**
```bash
META_ACCESS_TOKEN=<token System User> node server/index.mjs   # :8787
VITE_META_MODE=http npm run dev                                 # o Vite repassa /api para :8787
```
Permissões do token: `ads_management, ads_read, business_management, pages_read_engagement,
instagram_basic`. A versão da Graph API vem de `META_API_VERSION` (padrão `v23.0`); confira a vigente.

---

### 4. Arquitetura

```
src/
  search/        busca (pura + hooks)             → portável para qualquer front React
  campaigns/     domínio de campanhas (puro)      → portável; adsStore.tsx é a cola React
  meta/          tipos, presets, provider, seed   → trocar mock por API real aqui
  lib/           store de smartlinks/cliques       → trocar localStorage por backend
  components/    UI reutilizável (busca, gráfico, modal, progresso)
  pages/         telas
server/index.mjs proxy da Graph API (Node puro, sem dependências)
```

**Princípio de portabilidade:** a regra de negócio está em funções puras e testadas, sem React e sem I/O:
`sanitizeTerm`, `filterByText`, `derive`, `sumStats`, `optimize`, `planSteps`, `jobPhases`, `adsetName` e
`simulateDay`. Elas podem ser copiadas como estão para um backend (Node/Deno/Edge Functions).

#### Mapa de arquivos
| Arquivo | Papel |
|---|---|
| `src/search/sanitizeTerm.ts` | URL colada → slug; remove `, ( ) %` |
| `src/search/useDebouncedValue.ts`, `useAsyncSearch.ts` | Debounce 300 ms, `minLength`, descarta resposta atrasada |
| `src/search/releaseSearch.ts` | Contrato `ReleaseRepository` + implementação em memória (equivalente ao ILIKE) |
| `src/search/clientFilter.ts` | Filtro local com vários campos |
| `src/campaigns/metrics.ts` | Totais e métricas derivadas (RCPR, CPR, CPC, CTR, frequência, play, conversão) |
| `src/campaigns/optimizer.ts` | Regras padrão + `optimize()`, que devolve ações com motivo |
| `src/campaigns/plan.ts` | `planSteps()` do job de lançamento + `jobPhases()` |
| `src/campaigns/simulate.ts` | Métricas diárias determinísticas (substituir por insights reais) |
| `src/campaigns/dates.ts`, `series.ts`, `naming.ts`, `format.ts` | Períodos, série diária para gráfico, nome automático, formatação pt-BR |
| `src/campaigns/adsStore.tsx` | Reducer de campanhas: conexão, job, simulação, automação agendada, log, persistência |
| `src/meta/types.ts` | Modelo de domínio (seção 5) |
| `src/meta/provider.ts` | Interface `MetaProvider` + `mockMeta` + `httpMeta` (seleção por `VITE_META_MODE`) |
| `src/meta/presets.ts`, `seed.ts` | Países, presets, idiomas, interesses, públicos; campanhas "já existentes" na conexão |
| `src/lib/store.tsx`, `types.ts` | Smartlinks e cliques (localStorage) |
| `src/components/ReleaseSearchBox.tsx` | Busca A (dropdown, recentes, estados vazios) |
| `src/components/MultiSearchSelect.tsx` | Autocomplete com chips (busca B) |
| `src/components/MiniChart.tsx` | Gráfico de linha de uma série com crosshair, tooltip e tabela |
| `src/components/Modal.tsx` | Modal, `Equalizer` (animação) e `Progress` (varredura) |
| `src/pages/campaigns/*` | Página, tabela, wizard, editor de conjunto, importação, automação, conexão, jobs |
| `server/index.mjs` | Proxy `{action, ...params}` → Graph API |

---

### 5. Modelo de domínio

```ts
Campaign { id, name, adAccountId, objective: OUTCOME_SALES|TRAFFIC|AWARENESS|ENGAGEMENT,
           status: ACTIVE|PAUSED, smartlinkId|null, tracked: boolean, rcprTarget|null,
           startDate|null, endDate|null, createdAt }
AdSet    { id, campaignId, name, status, dailyBudget (R$), targeting: Targeting, createdAt }
Targeting{ countries[], languages[], interests[], includeAudiences[], excludeAudiences[],
           ageMin, ageMax, gender: all|men|women }        // itens = { id, name, type }
Ad       { id, adsetId, campaignId, name, status, creative: {kind, source: upload|ig_reel, label, primaryText},
           createdAt, history: DailyStat[], removedByAutomation }
DailyStat{ date, spend, impressions, reach, linkClicks, results, plays3s, platformClicks }
Smartlink{ id, userId, type: smartlink|presave|other, title, artistName, slug, links[{platform,url}],
           createdAt, deletedAt|null }
ClickEvent{ id, smartlinkId, platform, at, campaignId? }  // campaignId vem de ?tsc= no link
Job      { id, status: running|paused|done|cancelled, input: LaunchInput, steps: JobStep[], results: {key→id} }
LogEntry { id, at, trigger: manual|schedule, campaignId, adsetId, adId|null, action: on|off|kept, reason, rcpr, frequency, impressions }
```

`tracked=false` significa que a campanha existe na Meta mas não é acompanhada no TrackScale (aparece em "Importar").
**Remover** volta `tracked` para `false`. **Excluir** apaga a campanha (na Meta: pausa e arquiva).

#### Esquema SQL sugerido (Postgres/Supabase)
```sql
create table smartlinks (id uuid primary key, user_id uuid not null, type text not null,
  title text, artist_name text, slug text unique, links jsonb, created_at timestamptz default now(), deleted_at timestamptz);
create index on smartlinks using gin (title gin_trgm_ops, artist_name gin_trgm_ops, slug gin_trgm_ops); -- pg_trgm
create table clicks (id uuid primary key, smartlink_id uuid references smartlinks, platform text,
  campaign_id text, at timestamptz default now());
create table meta_connections (user_id uuid primary key, business_id text, ad_account_id text,
  pixel_id text, page_id text, ig_username text, token_ref text);   -- token num cofre, nunca em coluna aberta
create table campaigns (id text primary key, user_id uuid, ad_account_id text, smartlink_id uuid,
  tracked bool default true, rcpr_target numeric, created_at timestamptz);
create table insights_daily (ad_id text, date date, spend numeric, impressions int, reach int,
  link_clicks int, results int, plays3s int, primary key (ad_id, date));
create table optimization_rules (user_id uuid primary key, rules jsonb);
create table optimization_log (id uuid primary key, user_id uuid, at timestamptz, trigger text,
  campaign_id text, adset_id text, ad_id text, action text, reason text, rcpr numeric, frequency numeric, impressions int);
create table campaign_jobs (id uuid primary key, user_id uuid, status text, input jsonb, results jsonb, created_at timestamptz);
create table campaign_job_steps (job_id uuid references campaign_jobs, key text, kind text, status text, error text, primary key (job_id, key));
```
`platformClicks` por anúncio/dia deve vir da junção de `clicks` (atribuídos por UTM ou `tsc`) com o anúncio.

---

### 6. Algoritmos

#### Métricas (`metrics.ts`)
| Métrica | Fórmula |
|---|---|
| RCPR | `spend / platformClicks` |
| CPR | `spend / results` |
| CPC | `spend / linkClicks` |
| CTR | `linkClicks / impressions` |
| Frequência | `impressions / reach` |
| Play 3s | `plays3s / impressions` |
| Conversão | `platformClicks / linkClicks` (referência 60%) |

Denominador 0 → `null` (exibido como "—"). Na tabela, o RCPR fica verde se ≤ meta, amarelo até
meta × (1 + tolerância) e vermelho acima disso.

#### Automação (`optimizer.ts`, função pura)
Regras padrão: `schedule 1h, defaultRcpr 1.5, analyzeAfterImpressions 1000, threshold 0.3,
maxFrequency 3, preventCampaignDeath true, minActiveAds 1, analyzeAdsets true`.

Para cada conjunto ativo de campanha ativa e acompanhada (meta = `rcprTarget ?? defaultRcpr`):
1. Anúncio ativo com ≥ N impressões:
   - frequência ≥ máx. → `off_frequency`;
   - senão, RCPR > meta × (1 + tolerância) (sem cliques: gasto > limite) → `off_expensive`;
   - senão, frequência ≥ 80% do máx. → `kept_frequency_warning`.
2. Cada anúncio desligado abre vaga para um pausado **não testado** → `on_untested`.
3. Com `preventCampaignDeath`, se sobrarem menos ativos que o mínimo: primeiro desfaz o desligamento
   do menos ruim (`kept_prevent_death`), depois religa o pausado com menor RCPR (`on_min_active`).
   Isso evita o liga-desliga a cada rodada.
4. Com `analyzeAdsets` e 0 ativos, desliga o conjunto (`adset_off`).

Quem chama aplica as ações e grava no log (limite de 200).

#### Job de lançamento (`plan.ts`)
Passos: `upload` (só vídeos enviados) → `campaign` → `adset` (um por conjunto) → `creative` (um por
criativo) → `ad` (conjunto × criativo). Cada passo grava `results[key] = idCriado`; os passos seguintes
referenciam essas chaves. Execução sequencial, retomável e cancelável. Hoje roda no cliente a cada
450 ms; em produção deve ser uma fila no servidor (equivalente ao `meta_campaign_job_*` do song.so).

#### Simulação (`simulate.ts`)
PRNG determinístico por `(adId, data)`, com uma "qualidade" fixa por anúncio, para que o otimizador
tenha diferenças reais entre anúncios. A frequência cresce com a idade do anúncio (fadiga).
`advance()` gera os dias pulados para anúncios que estavam rodando. O botão **Simular +1 dia** adianta
o relógio (`clockOffset`). **Substituir por `get_insights` em produção.**

---

### 7. API (`server/index.mjs`)

Contrato: `POST /api/meta` com corpo `{ "action": "...", ...params }`. Resposta `{ data }` ou `{ error }`.

| Action | Endpoint da Graph API |
|---|---|
| `list_business_managers` | `GET me/businesses` |
| `list_ad_accounts {business_id}` | `GET {bm}/owned_ad_accounts` + `client_ad_accounts` |
| `list_pixels {ad_account_id}` | `GET act_{id}/adspixels` |
| `list_pages` | `GET me/accounts` |
| `resolve_page_ig {page_id}` | `GET {page}?fields=instagram_business_account{username}` |
| `search_targeting {type: interest/country/locale, q, limit}` | `GET search?type=adinterest/adgeolocation/adlocale` |
| `list_custom_audiences {ad_account_id}` | `GET act_{id}/customaudiences` |
| `list_page_reels {page_id}` | `GET {ig}/media` filtrado por `REELS` |
| `get_insights {object_id, date_preset, level}` | `GET {id}/insights` com `time_increment=1` |
| `create_campaign` | `POST act_{id}/campaigns` (PAUSED) |
| `create_adset` | `POST act_{id}/adsets` (PAUSED; orçamento em centavos; `OFFSITE_CONVERSIONS` + pixel) |
| `upload_video {file_url}` | `POST act_{id}/advideos` |
| `create_ad_creative` | `POST act_{id}/adcreatives` (vídeo com CTA `LISTEN_NOW` ou `source_instagram_media_id`) |
| `create_ad` | `POST act_{id}/ads` (PAUSED) |
| `update_status {ids, status}` | `POST {id}` com status |

**Antes de usar em produção:**
- Validar o formato do `targeting` (converter `Targeting` para `geo_locations`, `interests`, `locales`,
  `custom_audiences`, `excluded_custom_audiences`, `age_min`, `age_max` e `genders`).
- Validar `promoted_object`/`custom_event_type` para o objetivo escolhido.
- Adicionar autenticação de usuário no proxy (hoje não há nenhuma).
- Fazer upload de vídeo em partes (chunked) para arquivos grandes.
- Tratar rate limit e paginação (`paging.next`).

---

### 8. Design system

| Token | Valor |
|---|---|
| `--bg` / `--surface` / `--surface-2` | `#08080c` / `#121219` / `#181821` |
| `--neon` | `#12fb9b`. Acentos de UI: texto com brilho, bordas, foco |
| `--chart-mark` | `#0aa86a`. Linhas de gráfico (validado: luminosidade e contraste no fundo escuro; o neon puro reprovou) |
| `--good` / `--warn` / `--bad` | `#3ddc84` / `#f5c451` / `#ff6b6b` |
| Fontes | Space Mono (UI), Inter (reserva) |

**Animações** (`styles.css`): `glow`, `pulse-glow`, `sweep` (progresso), `eq` (equalizador),
`hero-glow`, `shine` (botão de lançar e links públicos), `blob` (fundo), `fade-up` e `spin`.
Todas são desligadas com `prefers-reduced-motion`.

**Gráficos:** uma série por gráfico, nunca eixo duplo; linha de 2px; crosshair + tooltip; "Ver tabela"
como alternativa acessível.

---

### 9. Persistência atual (localStorage)

| Chave | Conteúdo |
|---|---|
| `trackscale:v1` | Smartlinks e cliques |
| `trackscale:ads:v1` | Conexão, campanhas, conjuntos, anúncios (com histórico), jobs, regras, log, relógio simulado |
| `trackscale:wizard-draft` | Rascunho do wizard |

Para reiniciar a demo: `localStorage.clear()` no console do navegador.

---

### 10. Status

| Área | Status |
|---|---|
| Buscas A, B e C | ✅ completas (A em memória; o SQL equivalente está no README) |
| Smartlinks + página pública + atribuição `?tsc=` | ✅ (cliques só no mesmo navegador) |
| Wizard (5 passos, vários conjuntos, presets, públicos, upload/Reels, rascunho) | ✅ |
| Job em fases (pausar, retomar, cancelar, sobrevive a reload) | ✅ local |
| Tabela de métricas, períodos, gráficos, meta de RCPR, toggles | ✅ com dados simulados |
| Automação + log + agendamento | ✅ no cliente (deveria ser no servidor) |
| Importar / remover / excluir | ✅ local |
| Proxy da Graph API | ⚠️ escrito e com sintaxe validada; **não testado com a Meta**; sem autenticação |
| Job e tabela usando a API real | ❌ falta ligar |
| Banco, autenticação, multiusuário | ❌ |
| Campanhas de turnê, renderização de clipes, artistas similares, Multi Ad, posts do FB, e-mail | ❌ |

---

### 11. Próximos passos (ordem sugerida)

1. **Backend e banco:** criar o esquema da seção 5; trocar `lib/store` e `adsStore` por chamadas à API;
   implementar o `ReleaseRepository` com `ILIKE`/`pg_trgm`.
2. **Autenticação:** login, proxy autenticado, token da Meta guardado em cofre por usuário (OAuth da Meta
   ou System User).
3. **Job no servidor:** fila (pg-boss, Supabase Queues, BullMQ…) que executa `planSteps()` chamando as
   `create_*`, grava `results` e `campaign_job_steps` e suporta retomar/cancelar.
4. **Insights reais:** rotina que busca `get_insights` diariamente e grava `insights_daily`; juntar os
   cliques atribuídos para obter `platformClicks`; remover `simulate.ts` e o botão "Simular +1 dia".
5. **Automação no servidor:** cron conforme `schedule`, rodando `optimize()` (copiar o arquivo como está)
   e aplicando com `update_status`.
6. **Atribuição:** gravar a UTM/`tsc` do anúncio no link do criativo e registrar o clique no servidor
   (não no localStorage).
7. **Recursos faltantes** da lista da seção 10.

---

### 12. Como levar para outro sistema

- **Repositório inteiro:** copie a pasta sem `node_modules/` e `dist/`, depois rode `npm install`.
- **Só a lógica:** `src/search/*`, `src/campaigns/{metrics,optimizer,plan,naming,dates,series,simulate,format}.ts`,
  `src/meta/{types,presets}.ts` e os testes `*.test.ts`. São TypeScript puro e só dependem de `vitest` nos testes.
- **Só a UI:** `src/components/*`, `src/pages/*` e `src/styles.css` dependem de React 18 + react-router 6.
- **Para outro agente de IA:** entregue este arquivo e o `INVESTIGACAO-BUSCA-SONGSO.md`. Juntos, eles
  descrevem o comportamento esperado; os testes servem de especificação executável.

---

# PARTE: INVESTIGACAO-BUSCA-SONGSO.md

## Investigação: como funciona a busca em app.song.so/campaigns

Data: 2026-10-14 · Método: análise estática dos bundles JS públicos servidos pelo próprio site
(sem login, sem chamadas à API deles, sem uso de chaves/tokens encontrados no bundle).

### 1. Arquitetura geral

| Item | Evidência |
|---|---|
| SPA React + Vite (code-splitting) | `index.html` referencia `/assets/main-*.js`, `vendor-react-*.js`, `vendor-router-*.js` |
| Backend = Supabase (Postgres via PostgREST) | `main-*.js` e `supabase-*.js` contêm `https://eqdwatemkcuetdnntvra.supabase.co` |
| Página `/campaigns` é um chunk lazy | `App-SU-4TejO.js` importa `assets/Campaigns-Dqm-wdpl.js` (417 KB) |
| Integração Meta Ads via Edge Functions | `metaCampaigns-*.js`: mapa `FN_BY_ACTION` → `meta-ads-api`, `meta-ads-structure`, `meta-ads-insights`, `meta-ads-create` |

Existem **três** buscas distintas na página, cada uma com uma estratégia diferente.

### 2. Busca A — Seletor de release/smartlink (a principal)

Campo "Search by artist or track name…" no wizard de criação de campanha.

**Servidor (Supabase/PostgREST), com debounce de 300 ms**, trecho extraído de `Campaigns-Dqm-wdpl.js`:

```js
useEffect(() => {
  if (!smartlinkQuery.trim() || selectedSmartlink) return;
  const t = setTimeout(async () => {
    setSearchingSmartlinks(true);
    const raw = smartlinkQuery.trim(),
      smartlinkTerm = (/^(https?:\/\/)?[^/\s]+\.[^/\s]+\//i.test(raw)
          ? raw.replace(/^(https?:\/\/)?[^/]+\//i, "").split(/[?#/]/)[0]
          : raw).replace(/[,()%]/g, " ").trim();
    try {
      const { data } = await supabase.from("smartlinks")
        .select("id,title,artist_name,slug,cover_image")
        .or(`title.ilike.%${smartlinkTerm}%,artist_name.ilike.%${smartlinkTerm}%,slug.ilike.%${smartlinkTerm}%`)
        .eq("user_id", user?.id)
        .in("type", ["smartlink", "presave"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      setSmartlinkResults(data ?? []);
    } catch (e) { setSmartlinkResults([]); }
    finally { setSearchingSmartlinks(false); }
  }, 300);
  return () => clearTimeout(t);          // cancela a busca anterior
}, [smartlinkQuery, selectedSmartlink]);
```

Comportamentos observados:

1. **Debounce 300 ms** com cancelamento via cleanup do `useEffect`.
2. **Busca em 3 colunas** com `ILIKE %termo%` (título, artista, slug) combinadas por `OR`.
3. **Aceita URL colada**: se o texto parece `song.so/meu-slug?utm=…`, extrai só o primeiro segmento do path (o slug).
4. **Sanitização**: troca `, ( ) %` por espaço — são caracteres que quebrariam a sintaxe do filtro `.or()` do PostgREST (e `%` é curinga do LIKE).
5. **Escopo e segurança de dados**: só releases do usuário (`user_id`), só tipos `smartlink`/`presave`, ignora soft-deleted (`deleted_at IS NULL`).
6. **Ordenação** por `created_at desc` e **limite 10**.
7. **Sem busca (campo vazio)**: ao focar, carrega "Recent releases" (mesma query sem `OR`, limit 10), título do dropdown "Recent releases".
8. **UX do dropdown**:
   - abre no `onFocus`; fecha no `onBlur` com `setTimeout(…, 200)`;
   - o item usa `onMouseDown` + `preventDefault()` (seleciona antes do blur fechar o menu);
   - spinner (`Loader2`) enquanto busca; dropdown fica oculto durante o loading;
   - estados vazios: `"No smartlinks found"` (com termo) e `"No releases yet — create a smartlink first"` (sem releases);
   - cada item: capa 36×36, `artista — título`, `song.so/<slug>`.
9. Ao escolher: preenche nome da campanha (`"{artist} - {title}"`) e URL (`https://song.so/{slug}`).

### 3. Busca B — Direcionamento Meta (interesses/países)

Autocomplete que consulta a **Meta Marketing API via Edge Function**:

```js
searchTargeting = params => call({ action: "search_targeting", params })   // → função "meta-ads-api"

// interesses
if (q.length < 2) { setHits([]); return }            // mínimo 2 caracteres
setTimeout(async () => {
  const r = await searchTargeting({ type: "adinterest", q, limit: 10 });
  setHits(r.data.data.filter(h => !selected.some(s => s.id === h.id)));   // remove já escolhidos
}, 300);

// países
searchTargeting({ type: "adgeolocation", location_types: ["country"], q })
  → filtra país "AU"; mapeia { key: country_code ?? key, name }
```

Detalhes: debounce 300 ms, mínimo de 2 chars, flag `stopped` para ignorar resposta atrasada,
resultados já selecionados são excluídos, timers por card (`searchTimers.current["i_"+cardId]`).

### 4. Busca C — Filtros 100 % no cliente

Usada em listas já carregadas (modal "Import campaigns" e seletor de criativos).

```js
// Import de campanhas Meta
q ? allCampaigns.filter(matchesImportStatus)
        .filter(c => [c.name, objectiveLabel(c.objective), c.objective, STATUS_LABELS[c.effective_status]]
                      .join(" ").toLowerCase().includes(q))
  : allCampaigns.filter(c => SUGGESTED_OBJECTIVES.has(c.objective) && matchesImportStatus(c));

// Criativos: filtro por tipo (all/bulk/single) + texto em hook e nome do batch
f.hook.toLowerCase().includes(q) || f.batchName.toLowerCase().includes(q)
```

Detalhes: `useMemo` sobre `[lista, query, filtro]`, busca por substring case-insensitive,
junção de vários campos em uma string, **sem debounce** (é local), chips de filtro com `aria-pressed`,
sem termo = lista "sugerida" (filtra por objetivos recomendados).

### 5. Transporte para a Meta (contexto)

`call({action, ...})` roteia por `FN_BY_ACTION` para uma Edge Function (`/functions/v1/<fn>`).
`search_targeting` → `meta-ads-api`. Não inspecionei a implementação das funções (código server-side não é público).

### 6. Limites da investigação (honestidade)

- Análise **estática** do bundle minificado; não executei o app logado, então não observei payloads reais.
- Não sei os índices do Postgres (ex.: `pg_trgm`) nem as regras de RLS; o que se vê é só o cliente.
- O bundle contém uma anon key pública do Supabase; **não foi usada**.
- Não afirmo nada sobre ranking além de `created_at desc` (não há relevância/fuzzy no cliente).

### 7. Funcionalidades completas da página (inventário do bundle)

Extraído dos textos de interface, das chamadas `supabase.from(...)`/`rpc(...)` e do mapa `FN_BY_ACTION`.

**Actions da Meta (Edge Functions):** `status, list_ad_accounts, list_business_managers, list_pages,
list_instagram_accounts, list_pixels, search_targeting, save_default_assets, get_default_assets,
list_campaign_structure, list_all_campaigns, list_page_reels, list_ig_media, get_adset_creatives,
get_adset_details, get_video_sources, smartlink_campaign_status, get_ad_insights, create_campaign,
create_adset, create_ad_creative, create_ad, create_flexible_ad, update_ad_status, upload_video,
video_status, stage_creative, marketing_api_request, list_custom_audiences, create_custom_audience,
update_adset_targeting, resolve_page_ig`.

**Tabelas:** `smartlinks, meta_ads_campaigns, meta_ad_interests, meta_optimize_progress, platforms,
meta_campaign_jobs, meta_campaign_steps, meta_ads_connections, meta_ads_cache, creative_projects,
meta_upload_jobs, meta_optimization_rules, meta_ads_optimization_log, creative_bulk_items, …`
**RPCs:** `meta_campaign_job_start/resume/cancel, meta_ads_song_clicks, meta_ads_tour_clicks, meta_ads_resolve_smartlink`.

**Telas e recursos:**
- Abas *Release Campaigns* / *Tour Campaigns*; conexão com Business Manager e ativos padrão (conta, pixel, página, IG).
- Wizard com rascunho salvo: smartlink → nome automático → início/fim; países com presets
  (Tier 1/2/3, Balanced, GSA, France, países de língua espanhola/portuguesa), idiomas, interesses,
  artistas similares (Deezer/Spotify → interesses), idade, gênero, públicos incluir/excluir, vários ad sets.
- Criativos: upload MP4/MOV ≤ 100 MB (Stories + Reels 9:16), Reels do IG, posts da página, "Multi Ad Creatives",
  renderização de clipes (hooks, letras, overlay).
- Lançamento como job no servidor com fases: Render videos → Upload → Create campaign → creatives → ad sets → ads.
- Tabela: Name, Status, RCPR target, RCPR, Impressions, song.so Clicks, CPR, Link Clicks, CPC, Freq., CTR,
  3s Play Rate, Conv. Rate (referência 60%), períodos Today/This month/Last month/Max, "cheapest".
- Automação: Default RCPR, Analyze after impressions, Threshold, Max frequency, Prevent campaign death,
  Analyze ad sets, Optimize multi ads, agendamento (1h/6h/12h/diário/off), e-mail, log com motivos.
- Remover do song.so (não mexe na Meta) vs. Excluir (pausa + arquiva na Meta).

**Linguagem visual (CSS):** fundo escuro, neon `#12fb9b`, fonte Space Mono; classes `cyber-button`,
`cyber-input-glow`, `glow-text`, `glow-border`; animações `glow`, `pulse-glow`, `shimmer`, `shine`, `blob`,
`cyber-spin`, e inline no JSX `reco-idle` (equalizador), `reco-glow` (brilho radial), `opt-sweep` (varredura do progresso).
Foram recriadas com CSS próprio. Nenhum asset, logo ou arquivo de estilo do song.so foi copiado.

**Não implementado no TrackScale:** campanhas de turnê, renderização de clipes, artistas similares,
Multi Ad Creatives/flexible ads, posts do Facebook como criativo e e-mail de notificações.

### 8. O que foi implementado no seu projeto

Mapeamento 1:1 (ver `README.md` do projeto):

| song.so | Seu projeto |
|---|---|
| Busca A (servidor) | `src/search/releaseSearch.ts` + `sanitizeTerm.ts` + `ReleaseSearchBox.tsx` |
| debounce 300 ms | `src/search/useDebouncedValue.ts` |
| Busca C (cliente) | `src/search/clientFilter.ts` |
| Busca B (autocomplete mín. 2) | `useAsyncSearch` com `minLength` |

---

# PARTE: README.md

## TrackScale V2

Smartlinks + campanhas Meta Ads otimizadas pelo **custo real por clique nas plataformas** (RCPR),
inspirado em `app.song.so/campaigns`. Investigação: [INVESTIGACAO-BUSCA-SONGSO.md](INVESTIGACAO-BUSCA-SONGSO.md).

```bash
npm install
npm run dev     # http://localhost:5173 — Meta simulada, sem credenciais
npm test        # métricas, otimizador, plano do job, buscas
npm run build
```

### Telas

| Rota | O que faz |
|---|---|
| `/dashboard` | Smartlinks, campanhas ativas, gasto e RCPR do mês |
| `/smartlinks` | Criar, listar e excluir (soft delete) |
| `/s/:slug` | Página pública; registra o clique (com `?tsc=<campanha>` para atribuição) |
| `/campaigns` | Conexão Meta → tabela de campanhas › conjuntos › anúncios com métricas, gráficos, toggles, meta de RCPR, importar, remover/excluir, automação |
| `/campaigns/new` | Wizard: Campanha → Público (vários conjuntos) → Orçamento → Anúncios → Revisão; vira um job com progresso por fase |
| `/analytics` | Cliques por smartlink/plataforma + gráfico de 14 dias |

### Métricas

| Coluna | Fórmula |
|---|---|
| RCPR | gasto ÷ cliques nas plataformas |
| CPR / CPC | gasto ÷ resultados Meta / gasto ÷ cliques no link |
| Freq. | impressões ÷ alcance |
| CTR / Play 3s | cliques no link ÷ impressões / plays 3s ÷ impressões |
| Conv. | cliques nas plataformas ÷ cliques no link (referência 60%) |

### Automação (`src/campaigns/optimizer.ts`)

A cada execução, por conjunto ativo de campanha ativa:

1. Anúncios com ≥ *N* impressões: desliga se frequência ≥ máx. ou RCPR > meta × (1 + tolerância).
2. Cada desligado abre vaga para um anúncio pausado **não testado**.
3. *Evitar que a campanha morra*: se sobrar menos que o mínimo, mantém o menos ruim ligado.
4. *Analisar conjuntos*: sem anúncio viável, desliga o conjunto.

Tudo vai para o log (últimas 200 ações) com o motivo. Na Meta simulada, use **Simular +1 dia**
para gerar mais um dia de métricas e disparar a automação.

### Meta real

A simulação fica em `src/meta/provider.ts` (`mockMeta`). Para usar a Graph API:

```bash
META_ACCESS_TOKEN=<token de System User> node server/index.mjs   # proxy em :8787
VITE_META_MODE=http npm run dev                                    # o Vite repassa /api para o proxy
```

O proxy (`server/index.mjs`, sem dependências) implementa as leituras usadas pela UI
(businesses, contas, pixels, páginas, Instagram, busca de targeting, públicos, reels) e as
escritas (campanha, conjunto, vídeo, criativo, anúncio, status, insights), sempre criando **pausado**.

**Ainda não ligado:** o job de lançamento e a tabela usam o estado local. Para produção falta
fazer o job chamar `create_*` do proxy e trocar `simulateDay` por `get_insights`, além de
persistência em banco e execução da automação no servidor. O proxy não foi testado contra a
Meta real (precisa de credenciais).

---

# PARTE: CÓDIGO-FONTE

## `index.html`

````html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TrackScale</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
````

## `package.json`

````json
{
  "name": "trackscale-v2",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.6"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
````

## `server/index.mjs`

````js
// Proxy da Meta Marketing API (Graph API). Mesmo papel das Edge Functions
// "meta-ads-*" do song.so: o navegador manda { action, ...params } e o
// servidor chama a Graph API com o token, que nunca vai para o front.
//
//   META_ACCESS_TOKEN=... node server/index.mjs
//
// Variáveis: META_ACCESS_TOKEN (obrigatória), META_API_VERSION (padrão v23.0), PORT (padrão 8787).

import { createServer } from "node:http";

const TOKEN = process.env.META_ACCESS_TOKEN;
const VERSION = process.env.META_API_VERSION ?? "v23.0";
const PORT = Number(process.env.PORT ?? 8787);
const GRAPH = `https://graph.facebook.com/${VERSION}`;

if (!TOKEN) {
  console.error("Defina META_ACCESS_TOKEN (token de System User com ads_management, ads_read, business_management, pages_read_engagement, instagram_basic).");
  process.exit(1);
}

async function graph(method, path, params = {}) {
  const url = new URL(`${GRAPH}/${path}`);
  const body = new URLSearchParams();
  const target = method === "GET" ? url.searchParams : body;
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) target.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  target.set("access_token", TOKEN);
  const res = await fetch(url, method === "GET" ? undefined : { method, body });
  const json = await res.json();
  if (!res.ok || json.error) {
    const err = new Error(json.error?.error_user_msg ?? json.error?.message ?? `Graph HTTP ${res.status}`);
    err.status = res.status === 200 ? 400 : res.status;
    throw err;
  }
  return json;
}

const act = (id) => (String(id).startsWith("act_") ? id : `act_${id}`);
const pick = (rows) => (rows.data ?? []).map((r) => ({ id: r.id, name: r.name }));
const TARGETING_TYPE = { interest: "adinterest", country: "adgeolocation", locale: "adlocale" };

const actions = {
  // ---------- leitura ----------
  list_business_managers: async () => pick(await graph("GET", "me/businesses", { fields: "id,name" })),

  list_ad_accounts: async ({ business_id }) => {
    const fields = "id,name,currency";
    const [owned, client] = await Promise.all([
      graph("GET", `${business_id}/owned_ad_accounts`, { fields }),
      graph("GET", `${business_id}/client_ad_accounts`, { fields }).catch(() => ({ data: [] })),
    ]);
    return [...owned.data, ...client.data].map((a) => ({ id: a.id, name: a.name, currency: a.currency }));
  },

  list_pixels: async ({ ad_account_id }) => pick(await graph("GET", `${act(ad_account_id)}/adspixels`, { fields: "id,name" })),

  list_pages: async () => pick(await graph("GET", "me/accounts", { fields: "id,name" })),

  resolve_page_ig: async ({ page_id }) => {
    const r = await graph("GET", page_id, { fields: "instagram_business_account{username}" });
    return r.instagram_business_account?.username ?? null;
  },

  search_targeting: async ({ type, q, limit = 10 }) => {
    const graphType = TARGETING_TYPE[type];
    if (!graphType) throw Object.assign(new Error(`type inválido: ${type}`), { status: 400 });
    const r = await graph("GET", "search", {
      type: graphType, q, limit,
      ...(type === "country" ? { location_types: ["country"] } : {}),
    });
    return (r.data ?? []).map((x) => ({
      id: String(type === "country" ? x.country_code ?? x.key : type === "locale" ? x.key : x.id),
      name: x.name,
      type,
    }));
  },

  list_custom_audiences: async ({ ad_account_id }) =>
    (await graph("GET", `${act(ad_account_id)}/customaudiences`, { fields: "id,name", limit: 200 })).data.map((a) => ({ id: a.id, name: a.name, type: "audience" })),

  list_page_reels: async ({ page_id }) => {
    const page = await graph("GET", page_id, { fields: "instagram_business_account" });
    const ig = page.instagram_business_account?.id;
    if (!ig) return [];
    const media = await graph("GET", `${ig}/media`, { fields: "id,caption,media_product_type,timestamp", limit: 50 });
    return media.data
      .filter((m) => m.media_product_type === "REELS")
      .map((m) => ({ id: m.id, name: (m.caption ?? "Reel").slice(0, 80), date: m.timestamp.slice(0, 10) }));
  },

  get_insights: async ({ object_id, date_preset = "maximum", level = "ad" }) =>
    (await graph("GET", `${object_id}/insights`, {
      level, date_preset, time_increment: 1, limit: 500,
      fields: "ad_id,adset_id,campaign_id,spend,impressions,reach,inline_link_clicks,actions,date_start",
    })).data,

  // ---------- escrita (tudo nasce PAUSADO; ative depois pela UI) ----------
  create_campaign: async ({ ad_account_id, name, objective = "OUTCOME_SALES" }) =>
    graph("POST", `${act(ad_account_id)}/campaigns`, {
      name, objective, status: "PAUSED", special_ad_categories: [], buying_type: "AUCTION",
    }),

  create_adset: async ({ ad_account_id, campaign_id, name, daily_budget, targeting, pixel_id, start_time, end_time }) =>
    graph("POST", `${act(ad_account_id)}/adsets`, {
      name, campaign_id, status: "PAUSED",
      daily_budget: Math.round(Number(daily_budget) * 100), // em centavos
      billing_event: "IMPRESSIONS",
      optimization_goal: "OFFSITE_CONVERSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      promoted_object: { pixel_id, custom_event_type: "OTHER" },
      targeting, start_time, end_time,
    }),

  upload_video: async ({ ad_account_id, file_url, name }) =>
    graph("POST", `${act(ad_account_id)}/advideos`, { file_url, name }),

  create_ad_creative: async ({ ad_account_id, name, page_id, ig_user_id, video_id, link, message, source_instagram_media_id }) =>
    graph("POST", `${act(ad_account_id)}/adcreatives`, source_instagram_media_id
      ? { name, object_id: page_id, instagram_user_id: ig_user_id, source_instagram_media_id }
      : {
          name,
          object_story_spec: {
            page_id,
            instagram_user_id: ig_user_id,
            video_data: { video_id, message, call_to_action: { type: "LISTEN_NOW", value: { link } } },
          },
        }),

  create_ad: async ({ ad_account_id, adset_id, creative_id, name }) =>
    graph("POST", `${act(ad_account_id)}/ads`, { name, adset_id, creative: { creative_id }, status: "PAUSED" }),

  update_status: async ({ ids, status }) => {
    if (!["ACTIVE", "PAUSED", "ARCHIVED"].includes(status)) throw Object.assign(new Error("status inválido"), { status: 400 });
    return Promise.all(ids.map((id) => graph("POST", id, { status })));
  },
};

createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST" || req.url !== "/api/meta") return send(404, { error: "not found" });

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1e6) return send(413, { error: "payload grande demais" });
  }
  let payload;
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    return send(400, { error: "JSON inválido" });
  }
  const { action, ...params } = payload;
  const fn = actions[action];
  if (!fn) return send(400, { error: `action desconhecida: ${action}` });

  try {
    send(200, { data: await fn(params) });
  } catch (e) {
    console.error(`[${action}]`, e.message);
    send(e.status ?? 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`Meta proxy em http://localhost:${PORT}/api/meta (Graph ${VERSION})`));
````

## `src/App.tsx`

````tsx
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdsProvider } from "./campaigns/adsStore";
import { StoreProvider } from "./lib/store";
import { Analytics } from "./pages/Analytics";
import { CampaignWizard } from "./pages/campaigns/CampaignWizard";
import { CampaignsPage } from "./pages/campaigns/CampaignsPage";
import { Dashboard } from "./pages/Dashboard";
import { SmartlinkPublic } from "./pages/SmartlinkPublic";
import { Smartlinks } from "./pages/Smartlinks";

function Layout() {
  return (
    <div className="shell">
      <div className="bg-blobs" aria-hidden="true">
        <span /><span /><span />
      </div>
      <nav className="nav">
        <Link to="/dashboard" className="brand">
          <span className="brand__mark" aria-hidden="true" />TrackScale
        </Link>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/smartlinks">Smartlinks</NavLink>
        <NavLink to="/campaigns" end={false}>Campanhas</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
      </nav>
      <main className="page page--wide">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <AdsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/s/:slug" element={<SmartlinkPublic />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/smartlinks" element={<Smartlinks />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/new" element={<CampaignWizard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<h1>Página não encontrada</h1>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AdsProvider>
    </StoreProvider>
  );
}
````

## `src/campaigns/adsStore.tsx`

````tsx
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { uid } from "../lib/store";
import { buildRemoteSeed } from "../meta/seed";
import type { Ad, AdSet, Business, Campaign, Status } from "../meta/types";
import { addDays, daysBetween, today } from "./dates";
import { derive, sumStats } from "./metrics";
import { adsetName } from "./naming";
import { DEFAULT_RULES, optimize, SCHEDULE_MS, type Reason, type Rules } from "./optimizer";
import { planSteps, type JobStep, type LaunchInput } from "./plan";
import { simulateDay } from "./simulate";

export interface Connection {
  connected: boolean;
  business: Business | null;
  adAccountId: string | null;
  adAccountName: string | null;
  pixelId: string | null;
  pageId: string | null;
  pageName: string | null;
  igUsername: string | null;
}

export interface Job {
  id: string;
  status: "running" | "paused" | "done" | "cancelled";
  createdAt: string;
  input: LaunchInput;
  steps: JobStep[];
  results: Record<string, string>;
}

export interface LogEntry {
  id: string;
  at: string;
  trigger: "manual" | "schedule";
  campaignId: string;
  adsetId: string;
  adId: string | null;
  action: "on" | "off" | "kept";
  reason: Reason;
  rcpr: number | null;
  frequency: number | null;
  impressions: number;
}

export interface AdsState {
  connection: Connection;
  campaigns: Campaign[];
  adsets: AdSet[];
  ads: Ad[];
  jobs: Job[];
  rules: Rules;
  log: LogEntry[];
  lastOptimizationAt: string | null;
  /** Último dia já simulado. */
  simulatedThrough: string | null;
  /** Dias adiantados pelo botão "Simular +1 dia". */
  clockOffset: number;
}

export type Level = "campaign" | "adset" | "ad";

type Action =
  | { type: "connect"; connection: Connection }
  | { type: "disconnect" }
  | { type: "advanceDay" }
  | { type: "startJob"; input: LaunchInput }
  | { type: "runJobStep"; jobId: string }
  | { type: "setJobStatus"; jobId: string; status: Job["status"] }
  | { type: "dismissJob"; jobId: string }
  | { type: "setStatus"; level: Level; id: string; status: Status }
  | { type: "setRcprTarget"; campaignId: string; value: number | null }
  | { type: "importCampaign"; campaignId: string; smartlinkId: string | null }
  | { type: "linkSmartlink"; campaignId: string; smartlinkId: string | null }
  | { type: "untrackCampaign"; campaignId: string }
  | { type: "deleteCampaign"; campaignId: string }
  | { type: "runOptimization"; trigger: LogEntry["trigger"] }
  | { type: "setRules"; rules: Rules };

const KEY = "trackscale:ads:v1";

const EMPTY_CONNECTION: Connection = {
  connected: false, business: null, adAccountId: null, adAccountName: null,
  pixelId: null, pageId: null, pageName: null, igUsername: null,
};

const initial = (): AdsState => ({
  connection: EMPTY_CONNECTION,
  campaigns: [], adsets: [], ads: [], jobs: [],
  rules: DEFAULT_RULES, log: [],
  lastOptimizationAt: null, simulatedThrough: null, clockOffset: 0,
});

export const nowDate = (s: AdsState) => today(s.clockOffset);
const nowIso = (s: AdsState) => new Date(Date.now() + s.clockOffset * 864e5).toISOString();

/** Gera os dias (from, to] para os anúncios que estavam rodando. */
function advance(s: AdsState, from: string, to: string, only?: Set<string>): Ad[] {
  const camps = new Map(s.campaigns.map((c) => [c.id, c]));
  const sets = new Map(s.adsets.map((a) => [a.id, a]));
  const ads = s.ads.map((a) => (only && !only.has(a.id) ? a : { ...a, history: [...a.history] }));

  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
    const live = ads.filter((a) => {
      if (only && !only.has(a.id)) return false;
      const set = sets.get(a.adsetId);
      const c = camps.get(a.campaignId);
      return (
        a.status === "ACTIVE" && set?.status === "ACTIVE" && c?.status === "ACTIVE" &&
        a.createdAt.slice(0, 10) <= d &&
        (!c.startDate || c.startDate <= d) && (!c.endDate || d <= c.endDate)
      );
    });
    const perSet = new Map<string, number>();
    live.forEach((a) => perSet.set(a.adsetId, (perSet.get(a.adsetId) ?? 0) + 1));
    for (const a of live) {
      const budget = sets.get(a.adsetId)!.dailyBudget / perSet.get(a.adsetId)!;
      a.history.push(simulateDay(a.id, d, budget, daysBetween(a.createdAt.slice(0, 10), d)));
    }
  }
  return ads;
}

function catchUp(s: AdsState): AdsState {
  const now = nowDate(s);
  if (!s.simulatedThrough) return { ...s, simulatedThrough: now };
  if (s.simulatedThrough >= now) return s;
  return { ...s, ads: advance(s, s.simulatedThrough, now), simulatedThrough: now };
}

const lifetime = (ad: Ad, now: string) => derive(sumStats(ad.history, "max", now));

function runOptimization(s: AdsState, trigger: LogEntry["trigger"]): AdsState {
  const now = nowDate(s);
  const actions = optimize(s.campaigns, s.adsets, s.ads, s.rules, (ad) => lifetime(ad, now));
  const at = nowIso(s);

  const adChanges = new Map(actions.filter((a) => a.level === "ad" && a.action !== "kept").map((a) => [a.id, a.action]));
  const setOffs = new Set(actions.filter((a) => a.level === "adset").map((a) => a.id));

  const entries: LogEntry[] = actions.map((a) => ({
    id: uid(), at, trigger, campaignId: a.campaignId, adsetId: a.adsetId,
    adId: a.level === "ad" ? a.id : null, action: a.action, reason: a.reason,
    rcpr: a.rcpr, frequency: a.frequency, impressions: a.impressions,
  }));

  return {
    ...s,
    ads: s.ads.map((ad) => {
      const ch = adChanges.get(ad.id);
      if (!ch) return ad;
      return { ...ad, status: ch === "on" ? "ACTIVE" : "PAUSED", removedByAutomation: ch === "off" };
    }),
    adsets: s.adsets.map((a) => (setOffs.has(a.id) ? { ...a, status: "PAUSED" } : a)),
    log: [...entries, ...s.log].slice(0, 200),
    lastOptimizationAt: new Date().toISOString(),
  };
}

function runJobStep(s: AdsState, jobId: string): AdsState {
  const job = s.jobs.find((j) => j.id === jobId);
  if (!job || job.status !== "running") return s;
  const idx = job.steps.findIndex((st) => st.status === "pending");
  if (idx < 0) return updateJob(s, { ...job, status: "done" });

  const step = job.steps[idx];
  const input = job.input;
  const results = { ...job.results };
  const createdAt = nowIso(s);
  let next = s;

  switch (step.kind) {
    case "upload":
    case "creative":
      results[step.key] = `${step.kind}_${uid()}`;
      break;
    case "campaign": {
      const id = `cmp_${uid()}`;
      results.campaign = id;
      next = {
        ...next,
        campaigns: [
          {
            id, name: input.campaignName, adAccountId: input.adAccountId, objective: input.objective,
            status: input.activate ? "ACTIVE" : "PAUSED", smartlinkId: input.smartlinkId, tracked: true,
            rcprTarget: null, startDate: input.startDate, endDate: input.endDate, createdAt,
          },
          ...next.campaigns,
        ],
      };
      break;
    }
    case "adset": {
      const w = input.adsets.find((x) => x.key === step.adsetKey)!;
      const id = `as_${uid()}`;
      results[step.key] = id;
      next = {
        ...next,
        adsets: [...next.adsets, {
          id, campaignId: results.campaign, name: adsetName(w.targeting), status: "ACTIVE",
          dailyBudget: w.dailyBudget, targeting: w.targeting, createdAt,
        }],
      };
      break;
    }
    case "ad": {
      const c = input.creatives.find((x) => x.key === step.creativeKey)!;
      const adsetId = results[`adset:${step.adsetKey}`];
      const n = next.ads.filter((x) => x.adsetId === adsetId).length + 1;
      next = {
        ...next,
        ads: [...next.ads, {
          id: `ad_${uid()}`, adsetId, campaignId: results.campaign, name: `${n}`, status: "ACTIVE",
          creative: { kind: c.source === "upload" ? "video" : "post", source: c.source, label: c.label, primaryText: input.primaryText },
          createdAt, history: [], removedByAutomation: false,
        }],
      };
      break;
    }
  }

  const steps = job.steps.map((st, i) => (i === idx ? { ...st, status: "done" as const } : st));
  const done = steps.every((st) => st.status === "done");
  return updateJob(next, { ...job, steps, results, status: done ? "done" : "running" });
}

const updateJob = (s: AdsState, job: Job): AdsState => ({
  ...s,
  jobs: s.jobs.map((j) => (j.id === job.id ? job : j)),
});

const mapById = <T extends { id: string }>(list: T[], id: string, fn: (x: T) => T) =>
  list.map((x) => (x.id === id ? fn(x) : x));

function reducer(prev: AdsState, a: Action): AdsState {
  const s = catchUp(prev);
  switch (a.type) {
    case "connect": {
      const seed = buildRemoteSeed(a.connection.adAccountId!, nowDate(s));
      const known = new Set(s.campaigns.map((c) => c.id));
      const campaigns = seed.campaigns.filter((c) => !known.has(c.id));
      const ids = new Set(campaigns.map((c) => c.id));
      const adsets = seed.adsets.filter((x) => ids.has(x.campaignId));
      const ads = seed.ads.filter((x) => ids.has(x.campaignId));
      const merged: AdsState = {
        ...s,
        connection: a.connection,
        campaigns: [...s.campaigns, ...campaigns],
        adsets: [...s.adsets, ...adsets],
        ads: [...s.ads, ...ads],
      };
      // histórico retroativo das campanhas que já rodavam na Meta
      const earliest = campaigns.reduce((m, c) => (c.createdAt < m ? c.createdAt : m), nowIso(s)).slice(0, 10);
      return { ...merged, ads: advance(merged, addDays(earliest, -1), merged.simulatedThrough!, new Set(ads.map((x) => x.id))) };
    }
    case "disconnect":
      return { ...s, connection: EMPTY_CONNECTION };
    case "advanceDay": {
      const moved = catchUp({ ...s, clockOffset: s.clockOffset + 1 });
      return moved.rules.schedule === "off" ? moved : runOptimization(moved, "schedule");
    }
    case "startJob":
      return {
        ...s,
        jobs: [{ id: uid(), status: "running", createdAt: nowIso(s), input: a.input, steps: planSteps(a.input), results: {} }, ...s.jobs],
      };
    case "runJobStep":
      return runJobStep(s, a.jobId);
    case "setJobStatus":
      return { ...s, jobs: mapById(s.jobs, a.jobId, (j) => ({ ...j, status: a.status })) };
    case "dismissJob":
      return { ...s, jobs: s.jobs.filter((j) => j.id !== a.jobId) };
    case "setStatus":
      if (a.level === "campaign") return { ...s, campaigns: mapById(s.campaigns, a.id, (c) => ({ ...c, status: a.status })) };
      if (a.level === "adset") return { ...s, adsets: mapById(s.adsets, a.id, (x) => ({ ...x, status: a.status })) };
      return { ...s, ads: mapById(s.ads, a.id, (x) => ({ ...x, status: a.status, removedByAutomation: false })) };
    case "setRcprTarget":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, rcprTarget: a.value })) };
    case "importCampaign":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, tracked: true, smartlinkId: a.smartlinkId })) };
    case "linkSmartlink":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, smartlinkId: a.smartlinkId })) };
    case "untrackCampaign":
      return { ...s, campaigns: mapById(s.campaigns, a.campaignId, (c) => ({ ...c, tracked: false })) };
    case "deleteCampaign":
      return {
        ...s,
        campaigns: s.campaigns.filter((c) => c.id !== a.campaignId),
        adsets: s.adsets.filter((x) => x.campaignId !== a.campaignId),
        ads: s.ads.filter((x) => x.campaignId !== a.campaignId),
      };
    case "runOptimization":
      return runOptimization(s, a.trigger);
    case "setRules":
      return { ...s, rules: a.rules };
  }
}

function load(): AdsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return catchUp({ ...initial(), ...(JSON.parse(raw) as AdsState) });
  } catch {
    /* storage indisponível ou corrompido */
  }
  return catchUp(initial());
}

interface AdsValue {
  state: AdsState;
  now: string;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<AdsValue | null>(null);

export function AdsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state]);

  // Job de lançamento: um passo por vez. Sobrevive a reload (retoma sozinho).
  const runningJob = state.jobs.find((j) => j.status === "running");
  useEffect(() => {
    if (!runningJob) return;
    const t = setTimeout(() => dispatch({ type: "runJobStep", jobId: runningJob.id }), 450);
    return () => clearTimeout(t);
  }, [runningJob]);

  // Automação agendada (no song.so roda no servidor; aqui roda com o app aberto).
  const period = SCHEDULE_MS[state.rules.schedule];
  useEffect(() => {
    if (!period || !state.connection.connected) return;
    const check = () => {
      const last = state.lastOptimizationAt ? Date.parse(state.lastOptimizationAt) : 0;
      if (Date.now() - last >= period) dispatch({ type: "runOptimization", trigger: "schedule" });
    };
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [period, state.lastOptimizationAt, state.connection.connected]);

  const value = useMemo(() => ({ state, now: nowDate(state), dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAds() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAds fora do AdsProvider");
  return v;
}
````

## `src/campaigns/campaigns.test.ts`

````ts
import { describe, expect, it } from "vitest";
import { countryOption, INTERESTS } from "../meta/presets";
import { emptyTargeting, type Ad, type AdSet, type Campaign } from "../meta/types";
import { addDays, inRange } from "./dates";
import { derive, sumStats, ZERO, type Metrics } from "./metrics";
import { adsetName } from "./naming";
import { DEFAULT_RULES, optimize, type Rules } from "./optimizer";
import { jobPhases, planSteps, type LaunchInput } from "./plan";
import { simulateDay } from "./simulate";

const campaign: Campaign = {
  id: "c1", name: "C", adAccountId: "act", objective: "OUTCOME_SALES", status: "ACTIVE", smartlinkId: null,
  tracked: true, rcprTarget: 0.5, startDate: null, endDate: null, createdAt: "2026-10-01T00:00:00Z",
};
const adset: AdSet = { id: "s1", campaignId: "c1", name: "S", status: "ACTIVE", dailyBudget: 20, targeting: emptyTargeting(), createdAt: "" };
const ad = (id: string, status: Ad["status"] = "ACTIVE"): Ad => ({
  id, adsetId: "s1", campaignId: "c1", name: id, status,
  creative: { kind: "video", source: "upload", label: id, primaryText: "" }, createdAt: "", history: [], removedByAutomation: false,
});
const m = (p: Partial<Metrics>): Metrics => ({ ...derive(ZERO), ...p });
const rules: Rules = { ...DEFAULT_RULES, analyzeAfterImpressions: 1000, threshold: 0.3, maxFrequency: 3 };

describe("métricas", () => {
  it("RCPR = gasto ÷ cliques nas plataformas; sem denominador vira null", () => {
    const x = derive({ ...ZERO, spend: 10, platformClicks: 20, linkClicks: 40, impressions: 4000, reach: 2000 });
    expect(x.rcpr).toBe(0.5);
    expect(x.convRate).toBe(0.5);
    expect(x.frequency).toBe(2);
    expect(derive(ZERO).rcpr).toBeNull();
  });
  it("filtra por período", () => {
    const stats = [
      { date: "2026-09-30", spend: 1, impressions: 0, reach: 0, linkClicks: 0, results: 0, plays3s: 0, platformClicks: 0 },
      { date: "2026-10-14", spend: 2, impressions: 0, reach: 0, linkClicks: 0, results: 0, plays3s: 0, platformClicks: 0 },
    ];
    expect(sumStats(stats, "today", "2026-10-14").spend).toBe(2);
    expect(sumStats(stats, "last_month", "2026-10-14").spend).toBe(1);
    expect(sumStats(stats, "max", "2026-10-14").spend).toBe(3);
  });
  it("mês passado atravessa a virada do ano", () => {
    expect(inRange("2025-12-31", "last_month", "2026-01-05")).toBe(true);
  });
});

describe("otimizador", () => {
  it("desliga anúncio caro e dá chance a um não testado", () => {
    const ads = [ad("a"), ad("b"), ad("c", "PAUSED")];
    const metrics: Record<string, Metrics> = {
      a: m({ impressions: 5000, rcpr: 1.2, frequency: 1.5, spend: 12 }),
      b: m({ impressions: 5000, rcpr: 0.4, frequency: 1.5, spend: 8 }),
      c: m({ impressions: 0 }),
    };
    const out = optimize([campaign], [adset], ads, rules, (x) => metrics[x.id]);
    expect(out.map((o) => [o.id, o.action, o.reason])).toEqual([
      ["c", "on", "on_untested"],
      ["a", "off", "off_expensive"],
    ]);
  });

  it("desliga por frequência", () => {
    const out = optimize([campaign], [adset], [ad("a"), ad("b")], rules, (x) =>
      x.id === "a" ? m({ impressions: 5000, rcpr: 0.3, frequency: 3.4 }) : m({ impressions: 5000, rcpr: 0.3, frequency: 1 }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "a", action: "off", reason: "off_frequency" });
  });

  it("evitar morte: mantém o menos ruim quando todos são caros", () => {
    const out = optimize([campaign], [adset], [ad("a"), ad("b")], rules, (x) =>
      m({ impressions: 5000, rcpr: x.id === "a" ? 2 : 1, frequency: 1 }),
    );
    expect(out.find((o) => o.id === "b")).toMatchObject({ action: "kept", reason: "kept_prevent_death" });
    expect(out.find((o) => o.id === "a")).toMatchObject({ action: "off" });
  });

  it("sem evitar morte: desliga o conjunto quando não sobra anúncio", () => {
    const out = optimize([campaign], [adset], [ad("a")], { ...rules, preventCampaignDeath: false }, () =>
      m({ impressions: 5000, rcpr: 3, frequency: 1 }),
    );
    expect(out.map((o) => o.reason)).toEqual(["off_expensive", "adset_off"]);
  });

  it("ignora campanhas pausadas ou não acompanhadas", () => {
    const bad = () => m({ impressions: 5000, rcpr: 9, frequency: 9 });
    expect(optimize([{ ...campaign, status: "PAUSED" }], [adset], [ad("a")], rules, bad)).toEqual([]);
    expect(optimize([{ ...campaign, tracked: false }], [adset], [ad("a")], rules, bad)).toEqual([]);
  });
});

describe("plano do job", () => {
  const input: LaunchInput = {
    campaignName: "X", smartlinkId: "1", adAccountId: "act", objective: "OUTCOME_SALES",
    startDate: null, endDate: null, primaryText: "", activate: true,
    adsets: [{ key: "s1", dailyBudget: 10, targeting: emptyTargeting() }, { key: "s2", dailyBudget: 10, targeting: emptyTargeting() }],
    creatives: [{ key: "v1", source: "upload", label: "a.mp4" }, { key: "r1", source: "ig_reel", label: "reel" }],
  };
  it("um anúncio por (conjunto × criativo), upload só para vídeos enviados", () => {
    const phases = Object.fromEntries(jobPhases(planSteps(input)).map((p) => [p.label, p.total]));
    expect(phases).toEqual({
      "Enviar vídeos para a Meta": 1,
      "Criar campanha": 1,
      "Criar conjuntos de anúncios": 2,
      "Criar criativos": 2,
      "Criar anúncios": 4,
    });
  });
  it("campanha vem antes dos conjuntos, que vêm antes dos anúncios", () => {
    const kinds = planSteps(input).map((s) => s.kind);
    expect(kinds.indexOf("campaign")).toBeLessThan(kinds.indexOf("adset"));
    expect(kinds.lastIndexOf("adset")).toBeLessThan(kinds.indexOf("ad"));
  });
});

describe("nome do conjunto e simulação", () => {
  it("monta países | interesses | idade", () => {
    const t = { ...emptyTargeting(), countries: ["BR", "PT", "AO", "MZ"].map(countryOption), interests: INTERESTS.slice(0, 3), gender: "women" as const };
    expect(adsetName(t)).toBe(`BR,PT,AO +1 | ${INTERESTS[0].name}, ${INTERESTS[1].name} +1 | 18-44 M`);
    expect(adsetName(emptyTargeting())).toBe("— | Amplo | 18-44");
  });
  it("simulação é determinística e consistente", () => {
    const a = simulateDay("ad1", "2026-10-01", 20, 3);
    expect(simulateDay("ad1", "2026-10-01", 20, 3)).toEqual(a);
    expect(a.platformClicks).toBeLessThanOrEqual(a.linkClicks);
    expect(a.reach).toBeLessThanOrEqual(a.impressions);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
````

## `src/campaigns/dates.ts`

````ts
export type Range = "today" | "this_month" | "last_month" | "max";

export const RANGE_LABEL: Record<Range, string> = {
  today: "Hoje",
  this_month: "Este mês",
  last_month: "Mês passado",
  max: "Máx.",
};

export const toDate = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toDate(d);
}

export const today = (offsetDays = 0) => addDays(toDate(new Date()), offsetDays);

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}

export function inRange(date: string, range: Range, now: string): boolean {
  if (range === "max") return true;
  if (range === "today") return date === now;
  if (range === "this_month") return date.slice(0, 7) === now.slice(0, 7);
  const prev = addDays(`${now.slice(0, 7)}-01`, -1);
  return date.slice(0, 7) === prev.slice(0, 7);
}
````

## `src/campaigns/format.ts`

````ts
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const money = (v: number | null) => (v === null ? "—" : brl.format(v));
export const int = (v: number) => v.toLocaleString("pt-BR");
export const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
export const num = (v: number | null, digits = 2) => (v === null ? "—" : v.toFixed(digits));
````

## `src/campaigns/metrics.ts`

````ts
import type { DailyStat } from "../meta/types";
import { inRange, type Range } from "./dates";

export interface Totals {
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  results: number;
  plays3s: number;
  platformClicks: number;
}

export interface Metrics extends Totals {
  /** Custo real por resultado: gasto ÷ cliques nas plataformas (Spotify, Apple Music…). */
  rcpr: number | null;
  /** Custo por resultado da Meta. */
  cpr: number | null;
  cpc: number | null;
  ctr: number | null;
  frequency: number | null;
  playRate: number | null;
  /** Conversão real: cliques nas plataformas ÷ cliques no link. */
  convRate: number | null;
}

export const ZERO: Totals = {
  spend: 0, impressions: 0, reach: 0, linkClicks: 0, results: 0, plays3s: 0, platformClicks: 0,
};

export function addTotals(a: Totals, b: Totals): Totals {
  return {
    spend: a.spend + b.spend,
    impressions: a.impressions + b.impressions,
    reach: a.reach + b.reach,
    linkClicks: a.linkClicks + b.linkClicks,
    results: a.results + b.results,
    plays3s: a.plays3s + b.plays3s,
    platformClicks: a.platformClicks + b.platformClicks,
  };
}

export function sumStats(stats: DailyStat[], range: Range, now: string): Totals {
  return stats.filter((s) => inRange(s.date, range, now)).reduce<Totals>(addTotals, ZERO);
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);

export function derive(t: Totals): Metrics {
  return {
    ...t,
    rcpr: div(t.spend, t.platformClicks),
    cpr: div(t.spend, t.results),
    cpc: div(t.spend, t.linkClicks),
    ctr: div(t.linkClicks, t.impressions),
    frequency: div(t.impressions, t.reach),
    playRate: div(t.plays3s, t.impressions),
    convRate: div(t.platformClicks, t.linkClicks),
  };
}

export const CONV_BENCHMARK = 0.6;
````

## `src/campaigns/naming.ts`

````ts
import type { Targeting } from "../meta/types";

const listOf = (items: string[], max: number, sep: string) =>
  items.length > max ? `${items.slice(0, max).join(sep)} +${items.length - max}` : items.join(sep);

/** Nome automático do conjunto: países | interesses | idade (+ gênero). */
export function adsetName(t: Targeting): string {
  const geo = t.countries.length ? listOf(t.countries.map((c) => c.id), 3, ",") : "—";
  const ints = t.interests.length ? listOf(t.interests.map((i) => i.name), 2, ", ") : "Amplo";
  const g = t.gender === "men" ? " H" : t.gender === "women" ? " M" : "";
  return `${geo} | ${ints} | ${t.ageMin}-${t.ageMax}${g}`;
}

export const campaignName = (artist: string, title: string) => `${artist} - ${title}`;
````

## `src/campaigns/optimizer.ts`

````ts
import type { Ad, AdSet, Campaign } from "../meta/types";
import type { Metrics } from "./metrics";

export type Schedule = "1h" | "6h" | "12h" | "24h" | "off";

export const SCHEDULE_LABEL: Record<Schedule, string> = {
  "1h": "A cada hora",
  "6h": "A cada 6 horas",
  "12h": "A cada 12 horas",
  "24h": "Uma vez por dia",
  off: "Desligado",
};

export const SCHEDULE_MS: Record<Schedule, number> = {
  "1h": 3600e3,
  "6h": 6 * 3600e3,
  "12h": 12 * 3600e3,
  "24h": 24 * 3600e3,
  off: 0,
};

export interface Rules {
  schedule: Schedule;
  /** Meta de RCPR usada quando a campanha não define a sua. */
  defaultRcpr: number;
  /** Só julga um anúncio depois de N impressões. */
  analyzeAfterImpressions: number;
  /** Tolerância acima da meta antes de desligar (0.3 = 30%). */
  threshold: number;
  maxFrequency: number;
  /** Nunca deixa um conjunto ativo sem anúncios. */
  preventCampaignDeath: boolean;
  minActiveAds: number;
  /** Desliga o conjunto quando não sobra anúncio viável. */
  analyzeAdsets: boolean;
  emailNotifications: boolean;
}

export const DEFAULT_RULES: Rules = {
  schedule: "1h",
  defaultRcpr: 1.5,
  analyzeAfterImpressions: 1000,
  threshold: 0.3,
  maxFrequency: 3,
  preventCampaignDeath: true,
  minActiveAds: 1,
  analyzeAdsets: true,
  emailNotifications: false,
};

export type Reason =
  | "off_frequency"
  | "off_expensive"
  | "kept_frequency_warning"
  | "kept_prevent_death"
  | "on_untested"
  | "on_min_active"
  | "adset_off";

export const REASON_LABEL: Record<Reason, string> = {
  off_frequency: "Desligado – limite de frequência atingido",
  off_expensive: "Desligado – RCPR acima da meta",
  kept_frequency_warning: "Mantido – alerta de frequência",
  kept_prevent_death: "Mantido – evita que o conjunto fique sem anúncios",
  on_untested: "Ligado – anúncio não testado recebe uma chance",
  on_min_active: "Ligado – mantém o mínimo de anúncios ativos",
  adset_off: "Conjunto desligado – nenhum anúncio viável",
};

export interface OptAction {
  level: "ad" | "adset";
  id: string;
  campaignId: string;
  adsetId: string;
  action: "on" | "off" | "kept";
  reason: Reason;
  rcpr: number | null;
  frequency: number | null;
  impressions: number;
}

export function isExpensive(m: Metrics, target: number, threshold: number): boolean {
  const limit = target * (1 + threshold);
  // sem nenhum clique nas plataformas, compara o gasto com o que uma conversão poderia custar
  return m.rcpr !== null ? m.rcpr > limit : m.spend > limit;
}

const byRcpr = (metricsOf: (ad: Ad) => Metrics) => (a: Ad, b: Ad) =>
  (metricsOf(a).rcpr ?? Infinity) - (metricsOf(b).rcpr ?? Infinity);

/** Uma rodada de otimização. Função pura: devolve as ações, quem chama aplica. */
export function optimize(
  campaigns: Campaign[],
  adsets: AdSet[],
  ads: Ad[],
  rules: Rules,
  metricsOf: (ad: Ad) => Metrics,
): OptAction[] {
  const out: OptAction[] = [];

  for (const c of campaigns) {
    if (!c.tracked || c.status !== "ACTIVE") continue;
    const target = c.rcprTarget ?? rules.defaultRcpr;

    for (const s of adsets) {
      if (s.campaignId !== c.id || s.status !== "ACTIVE") continue;
      const own = ads.filter((a) => a.adsetId === s.id);
      const push = (ad: Ad, action: OptAction["action"], reason: Reason) => {
        const m = metricsOf(ad);
        out.push({
          level: "ad", id: ad.id, campaignId: c.id, adsetId: s.id, action, reason,
          rcpr: m.rcpr, frequency: m.frequency, impressions: m.impressions,
        });
      };

      const active = own.filter((a) => a.status === "ACTIVE");
      const offs: { ad: Ad; reason: Reason }[] = [];
      for (const ad of active) {
        const m = metricsOf(ad);
        if (m.impressions < rules.analyzeAfterImpressions) continue;
        const freq = m.frequency ?? 0;
        if (freq >= rules.maxFrequency) offs.push({ ad, reason: "off_frequency" });
        else if (isExpensive(m, target, rules.threshold)) offs.push({ ad, reason: "off_expensive" });
        else if (freq >= rules.maxFrequency * 0.8) push(ad, "kept", "kept_frequency_warning");
      }

      const paused = own.filter((a) => a.status === "PAUSED");
      const untested = paused.filter((a) => metricsOf(a).impressions < rules.analyzeAfterImpressions);
      let activeCount = active.length - offs.length;

      // cada anúncio desligado abre vaga para um não testado
      const used = new Set<string>();
      for (const ad of untested.slice(0, offs.length)) {
        push(ad, "on", "on_untested");
        used.add(ad.id);
        activeCount++;
      }

      if (rules.preventCampaignDeath) {
        // primeiro desfaz desligamentos (o menos ruim fica), depois religa pausados
        offs.sort((a, b) => byRcpr(metricsOf)(a.ad, b.ad));
        while (activeCount < rules.minActiveAds && offs.length > 0) {
          push(offs.shift()!.ad, "kept", "kept_prevent_death");
          activeCount++;
        }
        const rest = paused.filter((a) => !used.has(a.id)).sort(byRcpr(metricsOf));
        for (const ad of rest) {
          if (activeCount >= rules.minActiveAds) break;
          push(ad, "on", "on_min_active");
          activeCount++;
        }
      }

      for (const o of offs) push(o.ad, "off", o.reason);

      if (rules.analyzeAdsets && activeCount === 0 && own.length > 0) {
        out.push({
          level: "adset", id: s.id, campaignId: c.id, adsetId: s.id, action: "off",
          reason: "adset_off", rcpr: null, frequency: null, impressions: 0,
        });
      }
    }
  }
  return out;
}
````

## `src/campaigns/plan.ts`

````ts
import type { Objective, Targeting } from "../meta/types";

export interface WizardAdSet {
  key: string;
  dailyBudget: number;
  targeting: Targeting;
}

export interface WizardCreative {
  key: string;
  source: "upload" | "ig_reel";
  label: string;
  sizeMb?: number;
}

export interface LaunchInput {
  campaignName: string;
  smartlinkId: string;
  adAccountId: string;
  objective: Objective;
  startDate: string | null;
  endDate: string | null;
  primaryText: string;
  activate: boolean;
  adsets: WizardAdSet[];
  creatives: WizardCreative[];
}

export type StepKind = "upload" | "campaign" | "adset" | "creative" | "ad";

export interface JobStep {
  key: string;
  kind: StepKind;
  label: string;
  status: "pending" | "done";
  adsetKey?: string;
  creativeKey?: string;
}

/**
 * Mesmo desenho do job do song.so: uploads → campanha → conjuntos → criativos →
 * um anúncio para cada (conjunto × criativo).
 */
export function planSteps(input: LaunchInput): JobStep[] {
  const steps: JobStep[] = [];
  for (const c of input.creatives) {
    if (c.source === "upload") {
      steps.push({ key: `upload:${c.key}`, kind: "upload", label: `Enviar ${c.label}`, status: "pending", creativeKey: c.key });
    }
  }
  steps.push({ key: "campaign", kind: "campaign", label: `Criar campanha "${input.campaignName}"`, status: "pending" });
  input.adsets.forEach((s, i) =>
    steps.push({ key: `adset:${s.key}`, kind: "adset", label: `Criar conjunto ${i + 1}`, status: "pending", adsetKey: s.key }),
  );
  input.creatives.forEach((c, i) =>
    steps.push({ key: `creative:${c.key}`, kind: "creative", label: `Criar criativo ${i + 1}`, status: "pending", creativeKey: c.key }),
  );
  input.adsets.forEach((s, ai) =>
    input.creatives.forEach((c, ci) =>
      steps.push({
        key: `ad:${s.key}:${c.key}`,
        kind: "ad",
        label: `Anúncio ${ci + 1} no conjunto ${ai + 1}`,
        status: "pending",
        adsetKey: s.key,
        creativeKey: c.key,
      }),
    ),
  );
  return steps;
}

const PHASES: { kind: StepKind; label: string }[] = [
  { kind: "upload", label: "Enviar vídeos para a Meta" },
  { kind: "campaign", label: "Criar campanha" },
  { kind: "adset", label: "Criar conjuntos de anúncios" },
  { kind: "creative", label: "Criar criativos" },
  { kind: "ad", label: "Criar anúncios" },
];

export function jobPhases(steps: JobStep[]) {
  return PHASES.map((p) => {
    const of = steps.filter((s) => s.kind === p.kind);
    return { label: p.label, value: of.filter((s) => s.status === "done").length, total: of.length };
  }).filter((p) => p.total > 0);
}
````

## `src/campaigns/series.ts`

````ts
import type { Point } from "../components/MiniChart";
import type { Ad } from "../meta/types";
import { addDays, inRange, type Range } from "./dates";
import type { Totals } from "./metrics";

/** Série diária somando os anúncios dados; dias sem gasto entram como zero. */
export function dailySeries(ads: Ad[], key: keyof Totals, range: Range, now: string): Point[] {
  const byDay = new Map<string, number>();
  for (const ad of ads) {
    for (const s of ad.history) {
      if (!inRange(s.date, range, now)) continue;
      byDay.set(s.date, (byDay.get(s.date) ?? 0) + s[key]);
    }
  }
  if (byDay.size === 0) return [];
  const dates = [...byDay.keys()].sort();
  const out: Point[] = [];
  for (let d = dates[0]; d <= dates[dates.length - 1]; d = addDays(d, 1)) {
    out.push({ date: d, value: byDay.get(d) ?? 0 });
  }
  return out;
}
````

## `src/campaigns/simulate.ts`

````ts
import { between, rng } from "../meta/rng";
import type { DailyStat } from "../meta/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Gera as métricas de um dia de um anúncio. Determinístico por (adId, data):
 * cada anúncio tem uma "qualidade" fixa, então uns performam melhor que outros
 * de forma consistente, o que dá ao otimizador algo real para decidir.
 * A frequência cresce com a idade do anúncio (fadiga).
 */
export function simulateDay(adId: string, date: string, budget: number, dayIndex: number): DailyStat {
  const quality = between(rng(adId), 0.4, 1.6);
  const r = rng(`${adId}:${date}`);
  const spend = round2(budget * between(r, 0.85, 1.05));
  const impressions = Math.round((spend / between(r, 4, 11)) * 1000);
  const reach = Math.round(impressions / (1.15 + dayIndex * 0.12 * between(r, 0.8, 1.2)));
  const linkClicks = Math.round(impressions * 0.012 * quality * between(r, 0.8, 1.2));
  const results = Math.round(linkClicks * between(r, 0.7, 0.9));
  const conv = Math.min(0.85, 0.5 * quality * between(r, 0.8, 1.2));
  const platformClicks = Math.round(linkClicks * conv);
  const plays3s = Math.round(impressions * between(r, 0.2, 0.45));
  return { date, spend, impressions, reach, linkClicks, results, plays3s, platformClicks };
}
````

## `src/components/MiniChart.tsx`

````tsx
import { useState } from "react";

export interface Point {
  date: string;
  value: number;
}

interface Props {
  title: string;
  data: Point[];
  format: (v: number) => string;
}

const W = 300;
const H = 80;
const PAD = 4;

/**
 * Linha de uma única série com crosshair + tooltip. Duas medidas de escalas
 * diferentes viram dois MiniCharts lado a lado (nunca eixo duplo).
 */
export function MiniChart({ title, data, format }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <figure className="mini">
        <figcaption>{title}</figcaption>
        <div className="mini__empty">Sem dados no período</div>
      </figure>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  const step = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const x = (i: number) => (data.length > 1 ? PAD + i * step : W / 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1).toFixed(1)},${H - PAD}L${x(0).toFixed(1)},${H - PAD}Z`;
  const total = data.reduce((s, d) => s + d.value, 0);
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="mini">
      <figcaption>
        {title} <strong>{format(total)}</strong>
      </figcaption>
      <div className="mini__plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${title}: ${format(total)} no período`}>
          <line x1={0} x2={W} y1={H - PAD} y2={H - PAD} className="mini__base" />
          <line x1={0} x2={W} y1={y(max)} y2={y(max)} className="mini__grid" />
          <path d={area} className="mini__area" />
          <path d={line} className="mini__line" vectorEffect="non-scaling-stroke" />
          {h && hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} className="mini__cross" vectorEffect="non-scaling-stroke" />
          )}
          {/* alvos de hover maiores que a marca */}
          {data.map((d, i) => (
            <rect
              key={d.date}
              x={x(i) - Math.max(step, 8) / 2}
              y={0}
              width={Math.max(step, 8)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {h && hover !== null && (
          <div className="mini__tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <span>{h.date.slice(8, 10)}/{h.date.slice(5, 7)}</span> <strong>{format(h.value)}</strong>
          </div>
        )}
      </div>
      <details className="mini__table">
        <summary>Ver tabela</summary>
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
````

## `src/components/Modal.tsx`

````tsx
import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal__box glow-border ${wide ? "modal__box--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row row--between">
          <h2>{title}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Barras de equalizador animadas (estado ocioso/carregando, como o "reco-idle" do song.so). */
export function Equalizer({ active = true }: { active?: boolean }) {
  return (
    <span className={`eq ${active ? "eq--on" : ""}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

/** Barra de progresso com varredura de brilho (como o "opt-sweep"). */
export function Progress({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const done = value >= total;
  return (
    <div className={`progress ${done ? "progress--done" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
      {!done && <span className="progress__sweep" />}
    </div>
  );
}
````

## `src/components/MultiSearchSelect.tsx`

````tsx
import { useCallback, useState } from "react";
import { useAsyncSearch } from "../search/useAsyncSearch";

interface Option {
  id: string;
  name: string;
}

interface Props<T extends Option> {
  selected: T[];
  onChange: (next: T[]) => void;
  search: (q: string) => Promise<T[]>;
  placeholder: string;
  /** song.so usa 2 para interesses; 1 para países/idiomas. */
  minLength?: number;
}

/** Autocomplete com chips: debounce 300 ms, exclui já escolhidos, descarta respostas atrasadas. */
export function MultiSearchSelect<T extends Option>({ selected, onChange, search, placeholder, minLength = 1 }: Props<T>) {
  const [query, setQuery] = useState("");
  const run = useCallback(
    async (q: string) => (await search(q)).filter((r) => !selected.some((s) => s.id === r.id)),
    [search, selected],
  );
  const { results, loading } = useAsyncSearch(query, run, { minLength });
  const showResults = query.trim().length >= minLength && !loading;

  return (
    <div className="mss">
      <div className="search__field">
        <SearchIcon />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        {loading && <span className="search__spinner" aria-label="Buscando" />}
      </div>

      {showResults && (
        <div className="chips chips--results">
          {results.length === 0 && <span className="muted">Nenhum resultado para "{query.trim()}"</span>}
          {results.map((h) => (
            <button
              key={h.id}
              type="button"
              className="chip"
              onClick={() => {
                onChange([...selected, h]);
                setQuery("");
              }}
            >
              + {h.name}
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="chips">
          {selected.map((s) => (
            <span key={s.id} className="chip chip--on">
              {s.name}
              <button type="button" aria-label={`Remover ${s.name}`} onClick={() => onChange(selected.filter((x) => x.id !== s.id))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
````

## `src/components/ReleaseSearchBox.tsx`

````tsx
import { useCallback, useState } from "react";
import { useAsyncSearch } from "../search/useAsyncSearch";
import {
  recentReleases,
  searchReleases,
  type Release,
  type ReleaseRepository,
} from "../search/releaseSearch";

interface Props {
  repo: ReleaseRepository;
  userId: string;
  onPick: (release: Release) => void;
}

export function ReleaseSearchBox({ repo, userId, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<Release[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);

  const search = useCallback(
    (term: string) => searchReleases(repo, userId, term),
    [repo, userId],
  );
  const { results, loading } = useAsyncSearch(query, search);

  const hasQuery = query.trim().length > 0;
  const items = hasQuery ? results : recents;
  const busy = hasQuery ? loading : loadingRecents;

  const loadRecents = async () => {
    setLoadingRecents(true);
    try {
      setRecents(await recentReleases(repo, userId));
    } finally {
      setLoadingRecents(false);
    }
  };

  return (
    <div className="search">
      <div className="search__field">
        <input
          type="text"
          value={query}
          placeholder="Busque por artista, faixa ou cole o link…"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            if (recents.length === 0) void loadRecents();
          }}
          // atraso para o clique no item acontecer antes do menu fechar
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {busy && <span className="search__spinner" aria-label="Buscando" />}
      </div>

      {open && !busy && (
        <div className="search__dropdown" role="listbox">
          {items.length > 0 ? (
            <>
              {!hasQuery && <div className="search__heading">Lançamentos recentes</div>}
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  className="search__item"
                  // mouseDown + preventDefault: seleciona antes do blur
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(r);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {r.coverImage && <img src={r.coverImage} alt="" />}
                  <span>
                    <strong>
                      {r.artistName} — {r.title}
                    </strong>
                    <small>trackscale.app/{r.slug}</small>
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="search__empty">
              {hasQuery
                ? "Nenhum lançamento encontrado"
                : "Nenhum lançamento ainda — crie um primeiro"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
````

## `src/data/mock.ts`

````ts
import type { Release } from "../search/releaseSearch";

const base = {
  userId: "u1",
  deletedAt: null,
} as const;

export const MOCK_RELEASES: Release[] = [
  { ...base, id: "1", type: "smartlink", title: "Noite Azul", artistName: "Luna Reis", slug: "luna-noite-azul", createdAt: "2026-10-01T10:00:00Z" },
  { ...base, id: "2", type: "presave", title: "Maré Alta", artistName: "Caio Ventura", slug: "caio-mare-alta", createdAt: "2026-09-20T10:00:00Z" },
  { ...base, id: "3", type: "smartlink", title: "Fogo Lento", artistName: "Luna Reis", slug: "luna-fogo-lento", createdAt: "2026-08-11T10:00:00Z" },
  { ...base, id: "4", type: "smartlink", title: "Apagado", artistName: "Caio Ventura", slug: "caio-apagado", createdAt: "2026-07-01T10:00:00Z", deletedAt: "2026-07-02T00:00:00Z" },
  { ...base, id: "5", type: "other", title: "Merch Drop", artistName: "Luna Reis", slug: "luna-merch", createdAt: "2026-06-01T10:00:00Z" },
  { ...base, id: "6", userId: "u2", type: "smartlink", title: "Outro Usuário", artistName: "Fulano", slug: "fulano", createdAt: "2026-05-01T10:00:00Z" },
];
````

## `src/lib/store.tsx`

````tsx
import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { MOCK_RELEASES } from "../data/mock";
import { createInMemoryRepository, type ReleaseRepository } from "../search/releaseSearch";
import { CURRENT_USER_ID, type ClickEvent, type Smartlink } from "./types";

interface State {
  smartlinks: Smartlink[];
  clicks: ClickEvent[];
}

type Action =
  | { type: "addSmartlink"; smartlink: Smartlink }
  | { type: "deleteSmartlink"; id: string }
  | { type: "addClick"; click: ClickEvent };

const KEY = "trackscale:v1";

const seed = (): State => ({
  smartlinks: MOCK_RELEASES.map((r) => ({
    ...r,
    links: [
      { platform: "Spotify", url: "https://open.spotify.com" },
      { platform: "Apple Music", url: "https://music.apple.com" },
    ],
  })),
  clicks: [],
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>;
      return { smartlinks: s.smartlinks ?? seed().smartlinks, clicks: s.clicks ?? [] };
    }
  } catch {
    /* storage indisponível ou corrompido: cai no seed */
  }
  return seed();
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "addSmartlink":
      return { ...s, smartlinks: [a.smartlink, ...s.smartlinks] };
    case "deleteSmartlink": // soft delete, igual ao deleted_at do song.so
      return {
        ...s,
        smartlinks: s.smartlinks.map((l) =>
          l.id === a.id ? { ...l, deletedAt: new Date().toISOString() } : l,
        ),
      };
    case "addClick":
      return { ...s, clicks: [a.click, ...s.clicks] };
  }
}

interface StoreValue extends State {
  repo: ReleaseRepository;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state]);

  const repo = useMemo(() => createInMemoryRepository(state.smartlinks), [state.smartlinks]);
  const value = useMemo(() => ({ ...state, repo, dispatch }), [state, repo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore fora do StoreProvider");
  return v;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function useMySmartlinks() {
  const { smartlinks } = useStore();
  return useMemo(
    () => smartlinks.filter((s) => s.userId === CURRENT_USER_ID && s.deletedAt === null),
    [smartlinks],
  );
}
````

## `src/lib/types.ts`

````ts
import type { Release } from "../search/releaseSearch";

export interface SmartlinkLink {
  platform: string;
  url: string;
}

export interface Smartlink extends Release {
  links: SmartlinkLink[];
}

export interface ClickEvent {
  id: string;
  smartlinkId: string;
  platform: string;
  at: string;
  /** Campanha de origem (parâmetro `tsc` no link rastreado). */
  campaignId?: string;
}

export const CURRENT_USER_ID = "u1";
````

## `src/main.tsx`

````tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
````

## `src/meta/presets.ts`

````ts
import type { TargetingOption } from "./types";

export const COUNTRIES: [string, string][] = [
  ["US", "Estados Unidos"], ["GB", "Reino Unido"], ["CA", "Canadá"], ["AU", "Austrália"],
  ["NZ", "Nova Zelândia"], ["IE", "Irlanda"], ["DE", "Alemanha"], ["AT", "Áustria"],
  ["CH", "Suíça"], ["FR", "França"], ["BE", "Bélgica"], ["NL", "Holanda"], ["SE", "Suécia"],
  ["NO", "Noruega"], ["DK", "Dinamarca"], ["FI", "Finlândia"], ["ES", "Espanha"],
  ["IT", "Itália"], ["PT", "Portugal"], ["PL", "Polônia"], ["CZ", "Tchéquia"], ["JP", "Japão"],
  ["KR", "Coreia do Sul"], ["BR", "Brasil"], ["MX", "México"], ["AR", "Argentina"],
  ["CO", "Colômbia"], ["CL", "Chile"], ["PE", "Peru"], ["UY", "Uruguai"], ["EC", "Equador"],
  ["IN", "Índia"], ["ID", "Indonésia"], ["PH", "Filipinas"], ["TR", "Turquia"],
  ["ZA", "África do Sul"], ["AO", "Angola"], ["MZ", "Moçambique"],
];

export const countryOption = (code: string): TargetingOption => ({
  id: code,
  name: COUNTRIES.find(([c]) => c === code)?.[1] ?? code,
  type: "country",
});

export const COUNTRY_PRESETS: { label: string; codes: string[] }[] = [
  { label: "Tier 1", codes: ["US", "GB", "CA", "AU", "NZ", "IE", "DE", "AT", "CH", "FR", "BE", "NL", "SE", "NO", "DK", "FI"] },
  { label: "Tier 2", codes: ["ES", "IT", "PT", "PL", "CZ", "JP", "KR"] },
  { label: "Tier 3", codes: ["BR", "MX", "AR", "CO", "CL", "PE", "IN", "ID", "PH", "TR", "ZA"] },
  { label: "Equilibrado", codes: ["US", "GB", "DE", "FR", "BR", "MX", "ES", "IT"] },
  { label: "GSA (DACH)", codes: ["DE", "AT", "CH"] },
  { label: "França", codes: ["FR"] },
  { label: "Língua espanhola", codes: ["ES", "MX", "AR", "CO", "CL", "PE", "UY", "EC"] },
  { label: "Língua portuguesa", codes: ["BR", "PT", "AO", "MZ"] },
];

export const LANGUAGES: TargetingOption[] = [
  "Português (Brasil)", "Português (Portugal)", "Inglês (EUA)", "Inglês (Reino Unido)",
  "Espanhol", "Francês", "Alemão", "Italiano", "Japonês",
].map((name, i) => ({ id: `loc_${i + 1}`, name, type: "locale" }));

export const GENRES = [
  "Pop", "Rap/R&B", "Eletrônica", "Rock/Alt", "Indie", "Latina", "Afro", "Reggae", "Jazz",
  "Clássica", "Country/Blues", "Sertanejo", "Funk", "MPB",
];

export const INTERESTS: TargetingOption[] = [
  "Electronic music", "House music", "Techno", "Drum and bass", "Hip hop music", "Trap music",
  "Rhythm and blues", "Pop music", "K-pop", "Indie rock", "Indie pop", "Alternative rock",
  "Heavy metal", "Punk rock", "Funk", "Brazilian funk", "Sertanejo", "Samba", "Pagode", "MPB",
  "Bossa nova", "Forró", "Reggaeton", "Latin music", "Afrobeats", "Amapiano", "Reggae",
  "Jazz", "Blues", "Classical music", "Lo-fi music", "Music festivals", "Concerts",
  "Live music", "Disc jockey", "Spotify", "Apple Music", "SoundCloud", "Shazam",
  "Recording studio", "Music production", "Guitar", "Vinyl records", "TikTok",
].map((name, i) => ({ id: String(6003100000 + i * 7919), name, type: "interest" }));

export const AUDIENCES: TargetingOption[] = [
  "Visitantes do smartlink (30 dias)", "Cliques em plataformas (60 dias)",
  "Engajamento no Instagram (365 dias)", "Assistiram 50% dos vídeos (30 dias)",
  "Lookalike 1% – Cliques em plataformas (BR)", "Lista de e-mail de fãs",
].map((name, i) => ({ id: `aud_${i + 1}`, name, type: "audience" }));
````

## `src/meta/provider.ts`

````ts
import { AUDIENCES, COUNTRIES, INTERESTS, LANGUAGES, countryOption } from "./presets";
import type {
  AdAccount,
  Business,
  FbPage,
  OptionType,
  Pixel,
  Reel,
  TargetingOption,
} from "./types";

/**
 * Operações de leitura que o app precisa da Meta. Os nomes espelham as
 * "actions" do song.so (list_business_managers, list_ad_accounts, list_pixels,
 * list_pages, resolve_page_ig, search_targeting, list_custom_audiences,
 * list_page_reels). A escrita (criar campanha/conjunto/anúncio, mudar status)
 * acontece no job de lançamento.
 *
 * Duas implementações:
 *  - `mockMeta` (padrão): dados locais, sem rede.
 *  - `httpMeta`: chama o servidor em `server/` que fala com a Graph API.
 */
export interface MetaProvider {
  listBusinessManagers(): Promise<Business[]>;
  listAdAccounts(businessId: string): Promise<AdAccount[]>;
  listPixels(adAccountId: string): Promise<Pixel[]>;
  listPages(): Promise<FbPage[]>;
  resolvePageIg(pageId: string): Promise<string | null>;
  searchTargeting(type: Exclude<OptionType, "audience">, q: string, limit?: number): Promise<TargetingOption[]>;
  listCustomAudiences(adAccountId: string): Promise<TargetingOption[]>;
  listPageReels(pageId: string): Promise<Reel[]>;
}

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const search = (list: TargetingOption[], q: string, limit: number) => {
  const t = q.trim().toLowerCase();
  return list.filter((o) => o.name.toLowerCase().includes(t) || o.id.toLowerCase() === t).slice(0, limit);
};

const PAGES: (FbPage & { ig: string })[] = [
  { id: "pg_1", name: "Luna Reis", ig: "lunareis" },
  { id: "pg_2", name: "Caio Ventura", ig: "caioventura" },
];

export const mockMeta: MetaProvider = {
  async listBusinessManagers() {
    await wait();
    return [
      { id: "bm_1", name: "Minha Gravadora" },
      { id: "bm_2", name: "Selo Independente" },
    ];
  },
  async listAdAccounts(businessId) {
    await wait();
    return [
      { id: `act_${businessId}_1`, name: "Conta principal", currency: "BRL" },
      { id: `act_${businessId}_2`, name: "Conta de testes", currency: "BRL" },
    ];
  },
  async listPixels(adAccountId) {
    await wait();
    return [{ id: `px_${adAccountId}`, name: "Pixel TrackScale" }];
  },
  async listPages() {
    await wait();
    return PAGES.map(({ id, name }) => ({ id, name }));
  },
  async resolvePageIg(pageId) {
    await wait(700);
    return PAGES.find((p) => p.id === pageId)?.ig ?? null;
  },
  async searchTargeting(type, q, limit = 10) {
    await wait(150);
    if (type === "country") return search(COUNTRIES.map(([c]) => countryOption(c)), q, limit);
    if (type === "locale") return search(LANGUAGES, q, limit);
    return search(INTERESTS, q, limit);
  },
  async listCustomAudiences() {
    await wait();
    return AUDIENCES;
  },
  async listPageReels(pageId) {
    await wait(400);
    const who = PAGES.find((p) => p.id === pageId)?.name ?? "Artista";
    return [
      "Trecho do refrão", "Bastidores do clipe", "Ao vivo no estúdio",
      "Dueto com fãs", "Teaser do lançamento", "Letra na tela",
    ].map((t, i) => ({
      id: `reel_${pageId}_${i + 1}`,
      name: `${who} – ${t}`,
      date: new Date(Date.now() - (i + 1) * 3 * 864e5).toISOString().slice(0, 10),
    }));
  },
};

/** Chama o servidor proxy (`server/index.mjs`), que guarda o token da Meta. */
export function httpMeta(baseUrl = "/api/meta"): MetaProvider {
  const call = async <T,>(action: string, params: Record<string, unknown> = {}): Promise<T> => {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json.data as T;
  };
  return {
    listBusinessManagers: () => call("list_business_managers"),
    listAdAccounts: (business_id) => call("list_ad_accounts", { business_id }),
    listPixels: (ad_account_id) => call("list_pixels", { ad_account_id }),
    listPages: () => call("list_pages"),
    resolvePageIg: (page_id) => call("resolve_page_ig", { page_id }),
    searchTargeting: (type, q, limit = 10) => call("search_targeting", { type, q, limit }),
    listCustomAudiences: (ad_account_id) => call("list_custom_audiences", { ad_account_id }),
    listPageReels: (page_id) => call("list_page_reels", { page_id }),
  };
}

export const meta: MetaProvider =
  import.meta.env.VITE_META_MODE === "http" ? httpMeta() : mockMeta;
````

## `src/meta/rng.ts`

````ts
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32): mesma semente, mesma sequência. */
export function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: () => number, min: number, max: number) => min + r() * (max - min);
````

## `src/meta/seed.ts`

````ts
import { addDays } from "../campaigns/dates";
import { adsetName } from "../campaigns/naming";
import { countryOption, INTERESTS } from "./presets";
import { emptyTargeting, type Ad, type AdSet, type Campaign, type Objective, type Status } from "./types";

/**
 * Campanhas que "já existem na Meta" quando a conta é conectada.
 * Entram como não acompanhadas (tracked=false) e aparecem em "Importar".
 */
export function buildRemoteSeed(adAccountId: string, now: string) {
  const campaigns: Campaign[] = [];
  const adsets: AdSet[] = [];
  const ads: Ad[] = [];

  const defs: { name: string; objective: Objective; status: Status; age: number; countries: string[]; interests: number[]; ads: number }[] = [
    { name: "Noite Azul – Teste BR", objective: "OUTCOME_SALES", status: "ACTIVE", age: 21, countries: ["BR"], interests: [0, 1], ads: 4 },
    { name: "Maré Alta – Lusófonos", objective: "OUTCOME_TRAFFIC", status: "ACTIVE", age: 12, countries: ["BR", "PT"], interests: [17, 19], ads: 3 },
    { name: "Reconhecimento Q3", objective: "OUTCOME_AWARENESS", status: "PAUSED", age: 40, countries: ["BR"], interests: [], ads: 2 },
    { name: "Engajamento Reels", objective: "OUTCOME_ENGAGEMENT", status: "PAUSED", age: 60, countries: ["US", "GB"], interests: [7], ads: 2 },
  ];

  defs.forEach((d, ci) => {
    const created = `${addDays(now, -d.age)}T12:00:00.000Z`;
    const cid = `${adAccountId}_rc${ci + 1}`;
    campaigns.push({
      id: cid, name: d.name, adAccountId, objective: d.objective, status: d.status,
      smartlinkId: null, tracked: false, rcprTarget: null, startDate: null, endDate: null, createdAt: created,
    });
    const targeting = {
      ...emptyTargeting(),
      countries: d.countries.map(countryOption),
      interests: d.interests.map((i) => INTERESTS[i]),
    };
    const sid = `${cid}_as1`;
    adsets.push({ id: sid, campaignId: cid, name: adsetName(targeting), status: "ACTIVE", dailyBudget: 30, targeting, createdAt: created });
    for (let i = 0; i < d.ads; i++) {
      ads.push({
        id: `${sid}_ad${i + 1}`, adsetId: sid, campaignId: cid, name: `${i + 1}`,
        status: i < 2 ? "ACTIVE" : "PAUSED",
        creative: { kind: "video", source: "upload", label: `video_${i + 1}.mp4`, primaryText: "" },
        createdAt: created, history: [], removedByAutomation: false,
      });
    }
  });

  return { campaigns, adsets, ads };
}
````

## `src/meta/types.ts`

````ts
export type Status = "ACTIVE" | "PAUSED";
export type Objective = "OUTCOME_SALES" | "OUTCOME_TRAFFIC" | "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT";

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  OUTCOME_SALES: "Vendas",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_ENGAGEMENT: "Engajamento",
};

export interface Business { id: string; name: string }
export interface AdAccount { id: string; name: string; currency: string }
export interface Pixel { id: string; name: string }
export interface FbPage { id: string; name: string }
export interface Reel { id: string; name: string; date: string }

export type OptionType = "country" | "locale" | "interest" | "audience";
export interface TargetingOption { id: string; name: string; type: OptionType }

export type Gender = "all" | "men" | "women";

export interface Targeting {
  countries: TargetingOption[];
  languages: TargetingOption[];
  interests: TargetingOption[];
  includeAudiences: TargetingOption[];
  excludeAudiences: TargetingOption[];
  ageMin: number;
  ageMax: number;
  gender: Gender;
}

export const emptyTargeting = (): Targeting => ({
  countries: [],
  languages: [],
  interests: [],
  includeAudiences: [],
  excludeAudiences: [],
  ageMin: 18,
  ageMax: 44,
  gender: "all",
});

/** Métricas de um anúncio em um dia (o que a Meta + o tracking do smartlink devolvem). */
export interface DailyStat {
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  results: number; // resultado otimizado pela Meta
  plays3s: number;
  platformClicks: number; // cliques para Spotify/Apple Music… no smartlink
}

export interface Campaign {
  id: string;
  name: string;
  adAccountId: string;
  objective: Objective;
  status: Status;
  smartlinkId: string | null;
  /** false = existe na Meta mas não é acompanhada no TrackScale (aparece em "Importar"). */
  tracked: boolean;
  rcprTarget: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  status: Status;
  dailyBudget: number;
  targeting: Targeting;
  createdAt: string;
}

export interface Creative {
  kind: "video" | "post";
  source: "upload" | "ig_reel";
  label: string;
  primaryText: string;
}

export interface Ad {
  id: string;
  adsetId: string;
  campaignId: string;
  name: string;
  status: Status;
  creative: Creative;
  createdAt: string;
  history: DailyStat[];
  removedByAutomation: boolean;
}
````

## `src/pages/Analytics.tsx`

````tsx
import { useMemo } from "react";
import { addDays } from "../campaigns/dates";
import { int } from "../campaigns/format";
import { MiniChart, type Point } from "../components/MiniChart";
import { useMySmartlinks, useStore } from "../lib/store";

export function Analytics() {
  const links = useMySmartlinks();
  const { clicks } = useStore();

  const rows = useMemo(
    () =>
      links.map((l) => {
        const mine = clicks.filter((c) => c.smartlinkId === l.id);
        const byPlatform = mine.reduce<Record<string, number>>((acc, c) => {
          acc[c.platform] = (acc[c.platform] ?? 0) + 1;
          return acc;
        }, {});
        return { link: l, total: mine.length, byPlatform };
      }),
    [links, clicks],
  );

  // últimos 14 dias de cliques diretos, todos os smartlinks
  const series = useMemo<Point[]>(() => {
    const end = new Date().toISOString().slice(0, 10);
    const out: Point[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = addDays(end, -i);
      out.push({ date, value: clicks.filter((c) => c.at.slice(0, 10) === date).length });
    }
    return out;
  }, [clicks]);

  return (
    <>
      <h1>Analytics</h1>
      <div className="charts">
        <MiniChart title="Cliques nas plataformas (14 dias)" data={series} format={int} />
      </div>
      <ul className="list">
        {rows.map(({ link, total, byPlatform }) => (
          <li key={link.id} className="card row row--between">
            <span>
              <strong>{link.artistName} — {link.title}</strong>
              <br />
              <span className="muted">
                {Object.entries(byPlatform).map(([p, n]) => `${p}: ${n}`).join(" · ") || "sem cliques"}
              </span>
            </span>
            <strong>{total}</strong>
          </li>
        ))}
        {rows.length === 0 && <li className="muted">Sem dados.</li>}
      </ul>
    </>
  );
}
````

## `src/pages/Dashboard.tsx`

````tsx
import { Link } from "react-router-dom";
import { useAds } from "../campaigns/adsStore";
import { money } from "../campaigns/format";
import { addTotals, derive, sumStats, ZERO } from "../campaigns/metrics";
import { useMySmartlinks, useStore } from "../lib/store";

export function Dashboard() {
  const links = useMySmartlinks();
  const { clicks } = useStore();
  const { state, now } = useAds();
  const tracked = new Set(state.campaigns.filter((c) => c.tracked).map((c) => c.id));
  const active = state.campaigns.filter((c) => c.tracked && c.status === "ACTIVE").length;
  const month = derive(
    state.ads.filter((a) => tracked.has(a.campaignId)).map((a) => sumStats(a.history, "this_month", now)).reduce(addTotals, ZERO),
  );

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <Stat label="Smartlinks" value={String(links.length)} />
        <Stat label="Campanhas ativas" value={String(active)} />
        <Stat label="Gasto no mês" value={money(month.spend)} />
        <Stat label="RCPR no mês" value={money(month.rcpr)} hint="Gasto ÷ cliques nas plataformas" />
        <Stat label="Cliques diretos no smartlink" value={String(clicks.length)} />
      </div>
      <p className="row">
        <Link className="btn" to="/smartlinks">Criar smartlink</Link>
        <Link className="btn btn--ghost" to="/campaigns/new">Nova campanha</Link>
      </p>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <div className="stat__value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
````

## `src/pages/SmartlinkPublic.tsx`

````tsx
import { useParams, useSearchParams } from "react-router-dom";
import { uid, useStore } from "../lib/store";

/** Página pública do smartlink: registra o clique (com a campanha de origem) e abre a plataforma. */
export function SmartlinkPublic() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const campaignId = params.get("tsc") ?? undefined;
  const { smartlinks, dispatch } = useStore();
  const link = smartlinks.find((s) => s.slug === slug && s.deletedAt === null);

  if (!link) return <main className="page public"><h1>Link não encontrado</h1></main>;

  const go = (platform: string, url: string) => {
    dispatch({
      type: "addClick",
      click: { id: uid(), smartlinkId: link.id, platform, at: new Date().toISOString(), campaignId },
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="page public">
      <div className="public__cover glow-border" aria-hidden="true">
        <span className="eq eq--on eq--big"><span /><span /><span /><span /><span /></span>
      </div>
      <h1 className="glow-text">{link.title}</h1>
      <p className="muted">{link.artistName}</p>
      {link.links.map((l) => (
        <button key={l.platform} className="btn btn--block btn--shine" onClick={() => go(l.platform, l.url)}>
          Ouvir no {l.platform}
        </button>
      ))}
    </main>
  );
}
````

## `src/pages/Smartlinks.tsx`

````tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { uid, useMySmartlinks, useStore } from "../lib/store";
import { CURRENT_USER_ID } from "../lib/types";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const PLATFORMS = ["Spotify", "Apple Music", "YouTube Music", "Deezer"];

export function Smartlinks() {
  const links = useMySmartlinks();
  const { smartlinks, dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const slug = slugify(`${artist}-${title}`);
    if (!title.trim() || !artist.trim()) return setError("Informe artista e título.");
    if (smartlinks.some((s) => s.slug === slug && s.deletedAt === null))
      return setError("Já existe um smartlink com esse slug.");
    const platformLinks = PLATFORMS.filter((p) => urls[p]?.trim()).map((p) => ({
      platform: p,
      url: urls[p].trim(),
    }));
    if (platformLinks.some((l) => !/^https?:\/\//i.test(l.url)))
      return setError("As URLs precisam começar com http:// ou https://");
    if (platformLinks.length === 0) return setError("Adicione ao menos um link de plataforma.");

    dispatch({
      type: "addSmartlink",
      smartlink: {
        id: uid(),
        userId: CURRENT_USER_ID,
        type: "smartlink",
        title: title.trim(),
        artistName: artist.trim(),
        slug,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        links: platformLinks,
      },
    });
    setTitle("");
    setArtist("");
    setUrls({});
    setError("");
  };

  return (
    <>
      <h1>Smartlinks</h1>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artista" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da faixa" />
        </div>
        {PLATFORMS.map((p) => (
          <input
            key={p}
            value={urls[p] ?? ""}
            onChange={(e) => setUrls({ ...urls, [p]: e.target.value })}
            placeholder={`URL ${p} (opcional)`}
          />
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Criar smartlink</button>
      </form>

      <ul className="list">
        {links.map((l) => (
          <li key={l.id} className="card row row--between">
            <span>
              <strong>{l.artistName} — {l.title}</strong>
              <br />
              <Link to={`/s/${l.slug}`}>/s/{l.slug}</Link>
            </span>
            <button
              className="btn btn--ghost"
              onClick={() => dispatch({ type: "deleteSmartlink", id: l.id })}
            >
              Excluir
            </button>
          </li>
        ))}
        {links.length === 0 && <li className="muted">Nenhum smartlink ainda.</li>}
      </ul>
    </>
  );
}
````

## `src/pages/campaigns/AdSetEditor.tsx`

````tsx
import { useCallback } from "react";
import { adsetName } from "../../campaigns/naming";
import { MultiSearchSelect } from "../../components/MultiSearchSelect";
import { COUNTRY_PRESETS, countryOption } from "../../meta/presets";
import { meta } from "../../meta/provider";
import type { Gender, Targeting, TargetingOption } from "../../meta/types";

const searchCountries = (q: string) => meta.searchTargeting("country", q);
const searchLanguages = (q: string) => meta.searchTargeting("locale", q);
const searchInterests = (q: string) => meta.searchTargeting("interest", q);

interface Props {
  index: number;
  value: Targeting;
  onChange: (t: Targeting) => void;
  onRemove?: () => void;
  adAccountId: string;
}

export function AdSetEditor({ index, value, onChange, onRemove, adAccountId }: Props) {
  const set = (patch: Partial<Targeting>) => onChange({ ...value, ...patch });

  const searchAudiences = useCallback(
    async (q: string): Promise<TargetingOption[]> => {
      const all = await meta.listCustomAudiences(adAccountId);
      const t = q.trim().toLowerCase();
      return all.filter((a) => a.name.toLowerCase().includes(t));
    },
    [adAccountId],
  );

  const addPreset = (codes: string[]) => {
    const have = new Set(value.countries.map((c) => c.id));
    set({ countries: [...value.countries, ...codes.filter((c) => !have.has(c)).map(countryOption)] });
  };

  return (
    <div className="card adset">
      <div className="row row--between">
        <strong>Conjunto {index + 1}</strong>
        <span className="row">
          <span className="muted mono">{adsetName(value)}</span>
          {onRemove && <button className="btn btn--ghost btn--sm" onClick={onRemove}>Remover conjunto</button>}
        </span>
      </div>

      <label>Países</label>
      <div className="chips">
        {COUNTRY_PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => addPreset(p.codes)} title={p.codes.join(", ")}>
            + {p.label}
          </button>
        ))}
        {value.countries.length > 0 && (
          <button type="button" className="chip" onClick={() => set({ countries: [] })}>Limpar</button>
        )}
      </div>
      <MultiSearchSelect selected={value.countries} onChange={(countries) => set({ countries })} search={searchCountries} placeholder="Buscar países…" />

      <label>Idiomas <span className="muted">(vazio = todos, recomendado)</span></label>
      <MultiSearchSelect selected={value.languages} onChange={(languages) => set({ languages })} search={searchLanguages} placeholder="Restringir a idiomas…" />

      <label>Interesses <span className="muted">(opcional — vazio = público amplo)</span></label>
      <MultiSearchSelect selected={value.interests} onChange={(interests) => set({ interests })} search={searchInterests} placeholder="Buscar interesses, ex.: house music" minLength={2} />

      <div className="grid2">
        <div>
          <label>Idade</label>
          <div className="row">
            <input className="w-small" type="number" min={13} max={65} value={value.ageMin} onChange={(e) => set({ ageMin: Number(e.target.value) })} aria-label="Idade mínima" />
            <span className="muted">até</span>
            <input className="w-small" type="number" min={13} max={65} value={value.ageMax} onChange={(e) => set({ ageMax: Number(e.target.value) })} aria-label="Idade máxima" />
          </div>
          {value.ageMin > value.ageMax && <p className="error">A idade mínima é maior que a máxima.</p>}
        </div>
        <div>
          <label>Gênero</label>
          <div className="chips">
            {([["all", "Todos"], ["men", "Homens"], ["women", "Mulheres"]] as [Gender, string][]).map(([g, l]) => (
              <button key={g} type="button" aria-pressed={value.gender === g} className={`chip ${value.gender === g ? "chip--on" : ""}`} onClick={() => set({ gender: g })}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <details className="more">
        <summary>Públicos personalizados (opcional)</summary>
        <label>Incluir</label>
        <MultiSearchSelect selected={value.includeAudiences} onChange={(includeAudiences) => set({ includeAudiences })} search={searchAudiences} placeholder="Buscar públicos para incluir…" />
        <label>Excluir</label>
        <MultiSearchSelect selected={value.excludeAudiences} onChange={(excludeAudiences) => set({ excludeAudiences })} search={searchAudiences} placeholder="Buscar públicos para excluir…" />
      </details>
    </div>
  );
}
````

## `src/pages/campaigns/AutomationModal.tsx`

````tsx
import { useState, type ReactNode } from "react";
import { useAds } from "../../campaigns/adsStore";
import { money, num } from "../../campaigns/format";
import { DEFAULT_RULES, REASON_LABEL, SCHEDULE_LABEL, type Rules, type Schedule } from "../../campaigns/optimizer";
import { Modal } from "../../components/Modal";

export function AutomationModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAds();
  const [tab, setTab] = useState<"rules" | "log">("rules");
  const r = state.rules;
  const set = (patch: Partial<Rules>) => dispatch({ type: "setRules", rules: { ...r, ...patch } });

  const nameOf = (id: string | null, list: { id: string; name: string }[]) => list.find((x) => x.id === id)?.name ?? "—";

  return (
    <Modal title="Automação" onClose={onClose} wide>
      <div className="row">
        <button aria-pressed={tab === "rules"} className={`chip ${tab === "rules" ? "chip--on" : ""}`} onClick={() => setTab("rules")}>Regras</button>
        <button aria-pressed={tab === "log"} className={`chip ${tab === "log" ? "chip--on" : ""}`} onClick={() => setTab("log")}>Log de otimização</button>
      </div>

      {tab === "rules" && (
        <>
          <div className="grid2">
            <Field label="Frequência da execução">
              <select value={r.schedule} onChange={(e) => set({ schedule: e.target.value as Schedule })}>
                {Object.entries(SCHEDULE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Meta de RCPR padrão (R$)" hint="Usada quando a campanha não define a sua.">
              <input type="number" step="0.05" min="0.05" value={r.defaultRcpr} onChange={(e) => set({ defaultRcpr: Number(e.target.value) })} />
            </Field>
            <Field label="Analisar após (impressões)" hint="Anúncios com menos impressões ainda não são julgados.">
              <input type="number" step="100" min="0" value={r.analyzeAfterImpressions} onChange={(e) => set({ analyzeAfterImpressions: Number(e.target.value) })} />
            </Field>
            <Field label="Tolerância acima da meta (%)">
              <input type="number" step="5" min="0" value={Math.round(r.threshold * 100)} onChange={(e) => set({ threshold: Number(e.target.value) / 100 })} />
            </Field>
            <Field label="Frequência máxima">
              <input type="number" step="0.1" min="1" value={r.maxFrequency} onChange={(e) => set({ maxFrequency: Number(e.target.value) })} />
            </Field>
            <Field label="Mínimo de anúncios ativos por conjunto">
              <input type="number" min="1" value={r.minActiveAds} onChange={(e) => set({ minActiveAds: Math.max(1, Number(e.target.value)) })} />
            </Field>
          </div>
          <Check label="Evitar que a campanha morra (nunca deixa um conjunto sem anúncios)" checked={r.preventCampaignDeath} onChange={(v) => set({ preventCampaignDeath: v })} />
          <Check label="Analisar conjuntos (desliga o conjunto quando não sobra anúncio viável)" checked={r.analyzeAdsets} onChange={(v) => set({ analyzeAdsets: v })} />
          <Check label="Notificações por e-mail (requer backend)" checked={r.emailNotifications} onChange={(v) => set({ emailNotifications: v })} />
          <div className="row">
            <button className="btn btn--ghost" onClick={() => dispatch({ type: "setRules", rules: DEFAULT_RULES })}>Restaurar padrões</button>
            <button className="btn" onClick={() => dispatch({ type: "runOptimization", trigger: "manual" })}>Otimizar agora</button>
          </div>
          <p className="muted">
            Última execução: {state.lastOptimizationAt ? new Date(state.lastOptimizationAt).toLocaleString("pt-BR") : "nunca"}.
            {" "}Aqui a automação roda com o app aberto; em produção ela deve rodar no servidor.
          </p>
        </>
      )}

      {tab === "log" && (
        <>
          <p className="muted">Toda vez que a automação ligou ou desligou um anúncio ou conjunto, e por quê. Últimas 200 ações.</p>
          <ul className="log">
            {state.log.map((e) => (
              <li key={e.id} className={`log__item log__item--${e.action}`}>
                <span className="log__when">
                  {new Date(e.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {e.trigger === "manual" && " · execução manual"}
                </span>
                <strong>{REASON_LABEL[e.reason]}</strong>
                <span className="muted">
                  {nameOf(e.campaignId, state.campaigns)} › {nameOf(e.adsetId, state.adsets)}
                  {e.adId && ` › Anúncio ${nameOf(e.adId, state.ads)}`}
                  {e.adId && ` · RCPR ${money(e.rcpr)} · freq. ${num(e.frequency)} · ${e.impressions.toLocaleString("pt-BR")} impr.`}
                </span>
              </li>
            ))}
            {state.log.length === 0 && <li className="muted">Nenhuma ação automática ainda.</li>}
          </ul>
        </>
      )}
    </Modal>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label title={hint}>{label}</label>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
````

## `src/pages/campaigns/CampaignTable.tsx`

````tsx
import { Fragment, useMemo, useState } from "react";
import { useAds, type Level } from "../../campaigns/adsStore";
import { inRange, type Range } from "../../campaigns/dates";
import { int, money, num, pct } from "../../campaigns/format";
import { addTotals, CONV_BENCHMARK, derive, sumStats, ZERO, type Metrics, type Totals } from "../../campaigns/metrics";
import { dailySeries } from "../../campaigns/series";
import { MiniChart } from "../../components/MiniChart";
import { useStore } from "../../lib/store";
import { OBJECTIVE_LABEL, type Ad, type Campaign, type Status } from "../../meta/types";

interface Props {
  campaigns: Campaign[];
  range: Range;
}

const COLS: { key: string; label: string; hint?: string }[] = [
  { key: "name", label: "Nome" },
  { key: "status", label: "Status" },
  { key: "target", label: "Meta RCPR", hint: "Custo real por resultado desejado. Usa o padrão da automação se vazio." },
  { key: "rcpr", label: "RCPR", hint: "Custo real por resultado — gasto ÷ cliques nas plataformas" },
  { key: "spend", label: "Gasto" },
  { key: "impr", label: "Impressões" },
  { key: "pc", label: "Cliques TS", hint: "Cliques para Spotify, Apple Music… no smartlink, atribuídos por campanha" },
  { key: "cpr", label: "CPR", hint: "Custo por resultado da Meta" },
  { key: "lc", label: "Cliques no link" },
  { key: "cpc", label: "CPC" },
  { key: "freq", label: "Freq.", hint: "Impressões ÷ alcance — média de vezes que cada pessoa viu" },
  { key: "ctr", label: "CTR", hint: "Cliques no link ÷ impressões" },
  { key: "play", label: "Play 3s", hint: "Reproduções de 3 segundos ÷ impressões" },
  { key: "conv", label: "Conv.", hint: `Conversão real — cliques TS ÷ cliques no link. Referência: ${CONV_BENCHMARK * 100}%` },
  { key: "actions", label: "Ações" },
];

export function CampaignTable({ campaigns, range }: Props) {
  const { state, now, dispatch } = useAds();
  const { clicks, smartlinks } = useStore();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ id: string; kind: "remove" | "delete" } | null>(null);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const adTotals = (ad: Ad) => sumStats(ad.history, range, now);
  const sum = (ads: Ad[]): Totals => ads.map(adTotals).reduce(addTotals, ZERO);

  // cliques reais vindos do link rastreado (?tsc=<campanha>)
  const realClicks = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clicks) {
      if (c.campaignId && inRange(c.at.slice(0, 10), range, now)) m.set(c.campaignId, (m.get(c.campaignId) ?? 0) + 1);
    }
    return m;
  }, [clicks, range, now]);

  const setStatus = (level: Level, id: string, status: Status) => dispatch({ type: "setStatus", level, id, status });

  if (campaigns.length === 0) return <p className="muted">Nenhuma campanha ainda.</p>;

  return (
    <div className="table-wrap">
      <table className="ctable">
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} title={c.hint}>{c.label}{c.hint && <span className="hint">?</span>}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const ads = state.ads.filter((a) => a.campaignId === c.id);
            const totals = sum(ads);
            const m = derive({ ...totals, platformClicks: totals.platformClicks + (realClicks.get(c.id) ?? 0) });
            const target = c.rcprTarget ?? state.rules.defaultRcpr;
            const isOpen = open.has(c.id);
            const sl = smartlinks.find((s) => s.id === c.smartlinkId);
            return (
              <Fragment key={c.id}>
                <tr className="ctable__campaign">
                  <td>
                    <button className="expander" aria-expanded={isOpen} onClick={() => toggle(c.id)}>{isOpen ? "▾" : "▸"}</button>
                    <span className="cell-name">
                      {c.name}
                      <small>{OBJECTIVE_LABEL[c.objective]}{sl ? ` · ${sl.artistName} — ${sl.title}` : " · sem smartlink"}</small>
                    </span>
                  </td>
                  <td><StatusToggle status={c.status} onChange={(s) => setStatus("campaign", c.id, s)} /></td>
                  <td>
                    <input
                      className="cell-input"
                      type="number"
                      step="0.05"
                      min="0"
                      placeholder={num(state.rules.defaultRcpr)}
                      value={c.rcprTarget ?? ""}
                      onChange={(e) => dispatch({ type: "setRcprTarget", campaignId: c.id, value: e.target.value === "" ? null : Number(e.target.value) })}
                      aria-label="Meta de RCPR"
                    />
                  </td>
                  <MetricCells m={m} target={target} threshold={state.rules.threshold} />
                  <td className="cell-actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => setConfirm({ id: c.id, kind: "remove" })} title="Remove do TrackScale; a campanha continua intacta na Meta">Remover</button>
                    <button className="btn btn--danger btn--sm" onClick={() => setConfirm({ id: c.id, kind: "delete" })} title="Pausa e arquiva na Meta e remove do TrackScale">Excluir</button>
                  </td>
                </tr>

                {confirm?.id === c.id && (
                  <tr className="ctable__confirm">
                    <td colSpan={COLS.length}>
                      <span>
                        {confirm.kind === "remove"
                          ? "Remover do TrackScale? A campanha NÃO é excluída e continua intacta na Meta."
                          : "Excluir esta campanha? Ela será pausada e arquivada na Meta e removida do TrackScale."}
                      </span>{" "}
                      <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(null)}>Cancelar</button>{" "}
                      <button
                        className={`btn btn--sm ${confirm.kind === "delete" ? "btn--danger" : ""}`}
                        onClick={() => {
                          dispatch(confirm.kind === "remove" ? { type: "untrackCampaign", campaignId: c.id } : { type: "deleteCampaign", campaignId: c.id });
                          setConfirm(null);
                        }}
                      >
                        {confirm.kind === "remove" ? "Remover" : "Excluir"}
                      </button>
                    </td>
                  </tr>
                )}

                {isOpen && (
                  <>
                    <tr className="ctable__charts">
                      <td colSpan={COLS.length}>
                        <div className="charts">
                          <MiniChart title="Gasto por dia" data={dailySeries(ads, "spend", range, now)} format={money} />
                          <MiniChart title="Cliques nas plataformas por dia" data={dailySeries(ads, "platformClicks", range, now)} format={int} />
                        </div>
                        {sl && (
                          <p className="muted">
                            Link rastreado: <code>{`${location.origin}/s/${sl.slug}?tsc=${c.id}`}</code>
                          </p>
                        )}
                      </td>
                    </tr>
                    {state.adsets.filter((s) => s.campaignId === c.id).map((s) => {
                      const sAds = ads.filter((a) => a.adsetId === s.id);
                      const sm = derive(sum(sAds));
                      const setOpenKey = `set:${s.id}`;
                      const setIsOpen = open.has(setOpenKey);
                      const cheapest = sAds
                        .map((a) => ({ a, m: derive(adTotals(a)) }))
                        .filter((x) => x.m.rcpr !== null)
                        .sort((x, y) => x.m.rcpr! - y.m.rcpr!)[0]?.a.id;
                      return (
                        <Fragment key={s.id}>
                          <tr className="ctable__adset">
                            <td>
                              <button className="expander expander--l1" aria-expanded={setIsOpen} onClick={() => toggle(setOpenKey)}>{setIsOpen ? "▾" : "▸"}</button>
                              <span className="cell-name">
                                {s.name}
                                <small>Conjunto · {money(s.dailyBudget)}/dia</small>
                              </span>
                            </td>
                            <td><StatusToggle status={s.status} onChange={(st) => setStatus("adset", s.id, st)} /></td>
                            <td />
                            <MetricCells m={sm} target={target} threshold={state.rules.threshold} />
                            <td />
                          </tr>
                          {setIsOpen && sAds.map((a) => {
                            const am = derive(adTotals(a));
                            return (
                              <tr key={a.id} className="ctable__ad">
                                <td>
                                  <span className="cell-name cell-name--l2">
                                    Anúncio {a.name} · {a.creative.label}
                                    <small>
                                      {a.creative.source === "ig_reel" ? "Post existente" : "Vídeo"}
                                      {a.id === cheapest && <span className="badge badge--good">mais barato</span>}
                                      {a.removedByAutomation && a.status === "PAUSED" && <span className="badge">desligado pela automação</span>}
                                    </small>
                                  </span>
                                </td>
                                <td><StatusToggle status={a.status} onChange={(st) => setStatus("ad", a.id, st)} /></td>
                                <td />
                                <MetricCells m={am} target={target} threshold={state.rules.threshold} />
                                <td />
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MetricCells({ m, target, threshold }: { m: Metrics; target: number; threshold: number }) {
  const tone = m.rcpr === null ? "" : m.rcpr <= target ? "good" : m.rcpr > target * (1 + threshold) ? "bad" : "warn";
  return (
    <>
      <td className={`num tone-${tone}`}>
        {money(m.rcpr)}
        {tone && <span className="sr-only">{tone === "good" ? " (dentro da meta)" : tone === "bad" ? " (acima da meta)" : " (perto do limite)"}</span>}
      </td>
      <td className="num">{money(m.spend)}</td>
      <td className="num">{int(m.impressions)}</td>
      <td className="num">{int(m.platformClicks)}</td>
      <td className="num">{money(m.cpr)}</td>
      <td className="num">{int(m.linkClicks)}</td>
      <td className="num">{money(m.cpc)}</td>
      <td className="num">{num(m.frequency)}</td>
      <td className="num">{pct(m.ctr)}</td>
      <td className="num">{pct(m.playRate)}</td>
      <td className={`num ${m.convRate !== null && m.convRate >= CONV_BENCHMARK ? "tone-good" : ""}`}>{pct(m.convRate)}</td>
    </>
  );
}

function StatusToggle({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  const on = status === "ACTIVE";
  return (
    <button
      className={`toggle ${on ? "toggle--on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(on ? "PAUSED" : "ACTIVE")}
      title={on ? "Ativo — clique para pausar" : "Pausado — clique para ativar"}
    >
      <span className="toggle__knob" />
      <span className="toggle__label">{on ? "Ativo" : "Pausado"}</span>
    </button>
  );
}
````

## `src/pages/campaigns/CampaignWizard.tsx`

````tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAds } from "../../campaigns/adsStore";
import { money } from "../../campaigns/format";
import { adsetName, campaignName } from "../../campaigns/naming";
import type { WizardAdSet, WizardCreative } from "../../campaigns/plan";
import { Equalizer } from "../../components/Modal";
import { ReleaseSearchBox } from "../../components/ReleaseSearchBox";
import { uid, useStore } from "../../lib/store";
import { CURRENT_USER_ID } from "../../lib/types";
import { countryOption } from "../../meta/presets";
import { meta } from "../../meta/provider";
import { emptyTargeting, type Reel } from "../../meta/types";
import { AdSetEditor } from "./AdSetEditor";

const STEPS = ["Campanha", "Público", "Orçamento", "Anúncios", "Revisão"];
const DRAFT_KEY = "trackscale:wizard-draft";
const MAX_MB = 100;
const MIN_BUDGET = 5;

interface Draft {
  step: number;
  smartlinkId: string | null;
  name: string;
  nameTouched: boolean;
  startDate: string;
  endDate: string;
  adsets: WizardAdSet[];
  mode: "upload" | "reels";
  creatives: WizardCreative[];
  primaryText: string;
  activate: boolean;
}

const newAdSet = (): WizardAdSet => ({
  key: uid(),
  dailyBudget: 20,
  targeting: { ...emptyTargeting(), countries: [countryOption("BR")] },
});

const blank = (): Draft => ({
  step: 0, smartlinkId: null, name: "", nameTouched: false, startDate: "", endDate: "",
  adsets: [newAdSet()], mode: "upload", creatives: [], primaryText: "", activate: true,
});

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...blank(), ...(JSON.parse(raw) as Draft) };
  } catch {
    /* ignora */
  }
  return blank();
}

export function CampaignWizard() {
  const { state, dispatch } = useAds();
  const { repo, smartlinks } = useStore();
  const navigate = useNavigate();
  const [d, setD] = useState<Draft>(loadDraft);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [reels, setReels] = useState<Reel[] | null>(null);
  const conn = state.connection;

  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));

  // rascunho salvo a cada mudança ("o progresso é salvo como rascunho")
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignora */
    }
  }, [d]);

  useEffect(() => {
    if (d.mode !== "reels" || reels || !conn.pageId) return;
    let stopped = false;
    void meta.listPageReels(conn.pageId).then((r) => !stopped && setReels(r));
    return () => {
      stopped = true;
    };
  }, [d.mode, reels, conn.pageId]);

  if (!conn.connected || !conn.adAccountId) {
    return (
      <>
        <h1>Nova campanha</h1>
        <div className="card">
          <p>Conecte sua conta da Meta e escolha os ativos padrão antes de criar campanhas.</p>
          <Link className="btn" to="/campaigns">Ir para Campanhas</Link>
        </div>
      </>
    );
  }

  const release = smartlinks.find((s) => s.id === d.smartlinkId) ?? null;
  const totalBudget = d.adsets.reduce((s, a) => s + a.dailyBudget, 0);
  const adCount = d.adsets.length * d.creatives.length;

  const canNext = [
    release !== null && d.name.trim() !== "" && (!d.startDate || !d.endDate || d.startDate <= d.endDate),
    d.adsets.every((a) => a.targeting.countries.length > 0 && a.targeting.ageMin <= a.targeting.ageMax),
    d.adsets.every((a) => a.dailyBudget >= MIN_BUDGET),
    d.creatives.length > 0,
    true,
  ][d.step];

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const errors: string[] = [];
    const ok: WizardCreative[] = [];
    for (const f of Array.from(files)) {
      if (!/\.(mp4|mov)$/i.test(f.name)) errors.push(`${f.name}: só MP4 ou MOV`);
      else if (f.size > MAX_MB * 1024 * 1024) errors.push(`${f.name}: maior que ${MAX_MB} MB`);
      else ok.push({ key: uid(), source: "upload", label: f.name, sizeMb: Math.round((f.size / 1048576) * 10) / 10 });
    }
    setUploadErrors(errors);
    patch({ creatives: [...d.creatives.filter((c) => c.source === "upload"), ...ok] });
  };

  const toggleReel = (r: Reel) => {
    const has = d.creatives.some((c) => c.key === r.id);
    patch({
      creatives: has
        ? d.creatives.filter((c) => c.key !== r.id)
        : [...d.creatives.filter((c) => c.source === "ig_reel"), { key: r.id, source: "ig_reel", label: r.name }],
    });
  };

  const launch = () => {
    if (!release) return;
    dispatch({
      type: "startJob",
      input: {
        campaignName: d.name.trim(),
        smartlinkId: release.id,
        adAccountId: conn.adAccountId!,
        objective: "OUTCOME_SALES",
        startDate: d.startDate || null,
        endDate: d.endDate || null,
        primaryText: d.primaryText,
        activate: d.activate,
        adsets: d.adsets,
        creatives: d.creatives,
      },
    });
    localStorage.removeItem(DRAFT_KEY);
    navigate("/campaigns");
  };

  return (
    <>
      <div className="row row--between">
        <h1>Nova campanha</h1>
        <button className="btn btn--ghost btn--sm" onClick={() => { setD(blank()); setReels(null); setUploadErrors([]); }} title="Descartar rascunho e recomeçar">
          Descartar rascunho
        </button>
      </div>

      <ol className="stepper">
        {STEPS.map((s, i) => (
          <li key={s} className={i === d.step ? "stepper__on" : i < d.step ? "stepper__done" : ""}>
            <button type="button" disabled={i > d.step} onClick={() => patch({ step: i })}>
              <span className="stepper__n">{i < d.step ? "✓" : i + 1}</span> {s}
            </button>
          </li>
        ))}
      </ol>
      <p className="muted">· o progresso é salvo como rascunho</p>

      {d.step === 0 && (
        <section className="card">
          <label>Smartlink</label>
          {release ? (
            <div className="row row--between picked">
              <span><strong>{release.artistName} — {release.title}</strong><br /><span className="muted">/s/{release.slug}</span></span>
              <button className="btn btn--ghost btn--sm" onClick={() => patch({ smartlinkId: null })}>Trocar</button>
            </div>
          ) : (
            <ReleaseSearchBox
              repo={repo}
              userId={CURRENT_USER_ID}
              onPick={(r) => patch({ smartlinkId: r.id, name: d.nameTouched ? d.name : campaignName(r.artistName, r.title) })}
            />
          )}
          <label>Nome da campanha <span className="muted">(preenchido a partir do smartlink)</span></label>
          <input value={d.name} onChange={(e) => patch({ name: e.target.value, nameTouched: true })} />
          <div className="grid2">
            <div><label>Início (opcional)</label><input type="date" value={d.startDate} onChange={(e) => patch({ startDate: e.target.value })} /></div>
            <div><label>Fim (opcional)</label><input type="date" value={d.endDate} onChange={(e) => patch({ endDate: e.target.value })} /></div>
          </div>
          {d.startDate && d.endDate && d.startDate > d.endDate && <p className="error">A data de fim é anterior ao início.</p>}
          <p className="muted">Campanha · Vendas · Leilão · Pixel {conn.pixelId} · Conta {conn.adAccountName}</p>
        </section>
      )}

      {d.step === 1 && (
        <section>
          {d.adsets.map((a, i) => (
            <AdSetEditor
              key={a.key}
              index={i}
              value={a.targeting}
              adAccountId={conn.adAccountId!}
              onChange={(targeting) => patch({ adsets: d.adsets.map((x) => (x.key === a.key ? { ...x, targeting } : x)) })}
              onRemove={d.adsets.length > 1 ? () => patch({ adsets: d.adsets.filter((x) => x.key !== a.key) }) : undefined}
            />
          ))}
          <button
            className="btn btn--ghost"
            onClick={() => {
              const last = d.adsets[d.adsets.length - 1];
              patch({ adsets: [...d.adsets, { key: uid(), dailyBudget: last.dailyBudget, targeting: { ...last.targeting, interests: [] } }] });
            }}
          >
            + Adicionar conjunto (duplica o último com novos interesses)
          </button>
        </section>
      )}

      {d.step === 2 && (
        <section className="card">
          {d.adsets.map((a, i) => (
            <div key={a.key} className="row row--between budget">
              <span><strong>Conjunto {i + 1}</strong> <span className="muted mono">{adsetName(a.targeting)}</span></span>
              <span className="row">
                <span className="muted">R$</span>
                <input
                  type="number"
                  min={MIN_BUDGET}
                  value={a.dailyBudget}
                  onChange={(e) => patch({ adsets: d.adsets.map((x) => (x.key === a.key ? { ...x, dailyBudget: Number(e.target.value) } : x)) })}
                  aria-label={`Orçamento diário do conjunto ${i + 1}`}
                  className="w-small"
                />
                <span className="muted">/dia</span>
              </span>
            </div>
          ))}
          {d.adsets.some((a) => a.dailyBudget < MIN_BUDGET) && <p className="error">Orçamento mínimo: {money(MIN_BUDGET)}/dia por conjunto.</p>}
          <p>Total diário: <strong>{money(totalBudget)}</strong> · estimado em 30 dias: {money(totalBudget * 30)}</p>
        </section>
      )}

      {d.step === 3 && (
        <section className="card">
          <label>Como você quer criar os anúncios?</label>
          <div className="chips">
            <button aria-pressed={d.mode === "upload"} className={`chip ${d.mode === "upload" ? "chip--on" : ""}`} onClick={() => patch({ mode: "upload", creatives: d.creatives.filter((c) => c.source === "upload") })}>Enviar vídeos</button>
            <button aria-pressed={d.mode === "reels"} className={`chip ${d.mode === "reels" ? "chip--on" : ""}`} onClick={() => patch({ mode: "reels", creatives: d.creatives.filter((c) => c.source === "ig_reel") })}>Reels do Instagram</button>
          </div>

          {d.mode === "upload" ? (
            <>
              <label className="dropzone">
                <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" multiple onChange={(e) => onFiles(e.target.files)} />
                <strong>Escolher vídeos</strong>
                <span className="muted">MP4 ou MOV, até {MAX_MB} MB cada. Vários arquivos permitidos. Posicionamentos: Stories + Reels (9:16).</span>
              </label>
              {uploadErrors.map((e) => <p key={e} className="error">{e}</p>)}
            </>
          ) : reels === null ? (
            <p className="muted row"><Equalizer /> Carregando reels…</p>
          ) : (
            <div className="reels">
              {reels.map((r) => {
                const on = d.creatives.some((c) => c.key === r.id);
                return (
                  <button key={r.id} type="button" className={`reel ${on ? "reel--on" : ""}`} aria-pressed={on} onClick={() => toggleReel(r)}>
                    <span className="reel__thumb" aria-hidden="true" />
                    <span>{r.name}</span>
                    <small className="muted">{r.date}</small>
                  </button>
                );
              })}
            </div>
          )}

          {d.creatives.length > 0 && (
            <ul className="list">
              {d.creatives.map((c, i) => (
                <li key={c.key} className="row row--between creative">
                  <span>{i + 1}. {c.label} {c.sizeMb !== undefined && <span className="muted">({c.sizeMb} MB)</span>}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => patch({ creatives: d.creatives.filter((x) => x.key !== c.key) })}>Remover</button>
                </li>
              ))}
            </ul>
          )}

          <label>Texto principal (opcional) <span className="muted">— exibido acima do criativo</span></label>
          <textarea value={d.primaryText} onChange={(e) => patch({ primaryText: e.target.value })} rows={3} />
          <label className="check">
            <input type="checkbox" checked={d.activate} onChange={(e) => patch({ activate: e.target.checked })} /> Ativar a campanha ao criar
          </label>
        </section>
      )}

      {d.step === 4 && release && (
        <section className="card review">
          <h2>{d.name}</h2>
          <p className="muted">{release.artistName} — {release.title} · Vendas · {d.activate ? "será ativada" : "será criada pausada"}</p>
          {(d.startDate || d.endDate) && <p className="muted">Período: {d.startDate || "agora"} → {d.endDate || "sem fim"}</p>}
          <ul className="list">
            {d.adsets.map((a, i) => (
              <li key={a.key} className="row row--between">
                <span>Conjunto {i + 1}: <span className="mono">{adsetName(a.targeting)}</span></span>
                <span>{money(a.dailyBudget)}/dia</span>
              </li>
            ))}
          </ul>
          <div className="summary">
            <span><strong>1</strong> campanha</span>
            <span><strong>{d.adsets.length}</strong> conjunto(s)</span>
            <span><strong>{d.creatives.length}</strong> criativo(s)</span>
            <span><strong>{adCount}</strong> anúncio(s)</span>
            <span><strong>{money(totalBudget)}</strong>/dia</span>
          </div>
        </section>
      )}

      <div className="row wizard-nav">
        {d.step > 0 && <button className="btn btn--ghost" onClick={() => patch({ step: d.step - 1 })}>Voltar</button>}
        {d.step < STEPS.length - 1 ? (
          <button className="btn" disabled={!canNext} onClick={() => patch({ step: d.step + 1 })}>Continuar</button>
        ) : (
          <button className="btn btn--launch" onClick={launch}>Criar campanha</button>
        )}
      </div>
    </>
  );
}
````

## `src/pages/campaigns/CampaignsPage.tsx`

````tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAds } from "../../campaigns/adsStore";
import { RANGE_LABEL, type Range } from "../../campaigns/dates";
import { SCHEDULE_LABEL } from "../../campaigns/optimizer";
import { SearchIcon } from "../../components/MultiSearchSelect";
import { AutomationModal } from "./AutomationModal";
import { CampaignTable } from "./CampaignTable";
import { ConnectionCard } from "./ConnectionCard";
import { ImportModal } from "./ImportModal";
import { JobCards } from "./JobCards";

export function CampaignsPage() {
  const { state, now, dispatch } = useAds();
  const [tab, setTab] = useState<"release" | "tour">("release");
  const [range, setRange] = useState<Range>("max");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<null | "import" | "automation">(null);
  const conn = state.connection;

  const tracked = state.campaigns.filter((c) => c.tracked && c.adAccountId === conn.adAccountId);
  const q = query.trim().toLowerCase();
  // "Buscar campanhas, conjuntos ou contas de anúncio…"
  const visible = q
    ? tracked.filter((c) =>
        [c.name, conn.adAccountName ?? "", ...state.adsets.filter((s) => s.campaignId === c.id).map((s) => s.name)]
          .join(" ").toLowerCase().includes(q))
    : tracked;

  return (
    <>
      <header className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <span className="badge badge--new">Novo recurso</span>
        <h1 className="glow-text">Campanhas Meta Ads</h1>
        <p className="muted">Configuração automatizada: crie, acompanhe e otimize campanhas pelo custo real de cada clique nas plataformas.</p>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "release"} className={`tab ${tab === "release" ? "tab--on" : ""}`} onClick={() => setTab("release")}>Campanhas de lançamento</button>
        <button role="tab" aria-selected={tab === "tour"} className={`tab ${tab === "tour" ? "tab--on" : ""}`} onClick={() => setTab("tour")}>Campanhas de turnê</button>
      </div>

      {tab === "tour" ? (
        <div className="card"><p className="muted">Campanhas de turnê (links por data/cidade) ainda não foram implementadas.</p></div>
      ) : (
        <>
          <ConnectionCard />
          <JobCards />

          {conn.connected && (
            <>
              <div className="toolbar">
                <div className="row">
                  {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                    <button key={r} aria-pressed={range === r} className={`chip ${range === r ? "chip--on" : ""}`} onClick={() => setRange(r)}>{RANGE_LABEL[r]}</button>
                  ))}
                </div>
                <div className="search__field grow">
                  <SearchIcon />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campanhas, conjuntos ou contas de anúncio…" />
                </div>
                <div className="row">
                  <Link className="btn" to="/campaigns/new">+ Nova campanha</Link>
                  <button className="btn btn--ghost" onClick={() => setModal("import")}>Importar</button>
                  <button className="btn btn--ghost" onClick={() => setModal("automation")}>
                    Automação <span className={`dot ${state.rules.schedule === "off" ? "" : "dot--on"}`} />
                  </button>
                </div>
              </div>

              <div className="row row--between sim">
                <span className="muted">
                  Hoje (simulado): {now.split("-").reverse().join("/")} · Automação: {SCHEDULE_LABEL[state.rules.schedule]}
                </span>
                <span className="row">
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "runOptimization", trigger: "manual" })} title="Roda uma rodada de otimização agora para todas as campanhas desta conta">
                    Otimizar agora
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "advanceDay" })} title="Avança o relógio da simulação: gera métricas de mais um dia e roda a automação">
                    Simular +1 dia
                  </button>
                </span>
              </div>

              {visible.length === 0 && q ? (
                <p className="muted">Nenhum resultado para "{query}"</p>
              ) : (
                <CampaignTable campaigns={visible} range={range} />
              )}
            </>
          )}
        </>
      )}

      {modal === "import" && <ImportModal onClose={() => setModal(null)} />}
      {modal === "automation" && <AutomationModal onClose={() => setModal(null)} />}
    </>
  );
}
````

## `src/pages/campaigns/ConnectionCard.tsx`

````tsx
import { useEffect, useState } from "react";
import { Equalizer } from "../../components/Modal";
import { useAds, type Connection } from "../../campaigns/adsStore";
import { meta } from "../../meta/provider";
import type { AdAccount, Business, FbPage, Pixel } from "../../meta/types";

export function ConnectionCard() {
  const { state, dispatch } = useAds();
  const c = state.connection;
  const [editing, setEditing] = useState(false);

  if (c.connected && !editing) {
    return (
      <div className="card card--conn">
        <div className="row row--between">
          <span>
            <span className="dot dot--on" /> Conectado a <strong>{c.business?.name}</strong>
            <div className="muted">
              Conta: {c.adAccountName} · Pixel: {c.pixelId} · Página: {c.pageName}
              {c.igUsername ? ` · IG @${c.igUsername}` : ""}
            </div>
          </span>
          <span className="row">
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>Alterar ativos padrão</button>
            <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "disconnect" })}>Desconectar</button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <AssetPicker
      initial={c}
      onCancel={c.connected ? () => setEditing(false) : undefined}
      onSave={(connection) => {
        dispatch({ type: "connect", connection });
        setEditing(false);
      }}
    />
  );
}

function AssetPicker({ initial, onSave, onCancel }: { initial: Connection; onSave: (c: Connection) => void; onCancel?: () => void }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [pages, setPages] = useState<FbPage[]>([]);
  const [businessId, setBusinessId] = useState(initial.business?.id ?? "");
  const [accountId, setAccountId] = useState(initial.adAccountId ?? "");
  const [pixelId, setPixelId] = useState(initial.pixelId ?? "");
  const [pageId, setPageId] = useState(initial.pageId ?? "");
  const [ig, setIg] = useState<string | null>(initial.igUsername);
  const [resolvingIg, setResolvingIg] = useState(false);

  useEffect(() => {
    void meta.listBusinessManagers().then(setBusinesses);
    void meta.listPages().then(setPages);
  }, []);

  useEffect(() => {
    setAccounts([]);
    if (businessId) void meta.listAdAccounts(businessId).then(setAccounts);
  }, [businessId]);

  useEffect(() => {
    setPixels([]);
    if (accountId) void meta.listPixels(accountId).then(setPixels);
  }, [accountId]);

  useEffect(() => {
    if (!pageId) return;
    let stopped = false;
    setResolvingIg(true);
    void meta.resolvePageIg(pageId).then((u) => {
      if (!stopped) {
        setIg(u);
        setResolvingIg(false);
      }
    });
    return () => {
      stopped = true;
    };
  }, [pageId]);

  const business = businesses.find((b) => b.id === businessId) ?? null;
  const ready = business && accountId && pixelId && pageId && !resolvingIg;

  return (
    <div className="card glow-border">
      <div className="row row--between">
        <strong>Meta Business Manager</strong>
        <span className="badge">Conexão simulada</span>
      </div>
      <p className="muted">Selecione os ativos padrão usados ao criar campanhas.</p>
      <div className="grid2">
        <Select label="Business" value={businessId} onChange={(v) => { setBusinessId(v); setAccountId(""); setPixelId(""); }} options={businesses} placeholder="Escolha um business" />
        <Select label="Conta de anúncios" value={accountId} onChange={(v) => { setAccountId(v); setPixelId(""); }} options={accounts} placeholder={businessId ? "Escolha a conta" : "Escolha o business primeiro"} />
        <Select label="Pixel / Dataset" value={pixelId} onChange={setPixelId} options={pixels} placeholder={accountId ? "Escolha o pixel" : "Escolha a conta primeiro"} />
        <Select label="Página do Facebook" value={pageId} onChange={setPageId} options={pages} placeholder="Escolha a página" />
      </div>
      {pageId && (
        <p className="muted row">
          {resolvingIg ? (<><Equalizer /> Buscando conta do Instagram…</>) : ig ? `Instagram: @${ig}` : "Nenhuma conta do Instagram vinculada"}
        </p>
      )}
      <div className="row">
        {onCancel && <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>}
        <button
          className="btn"
          disabled={!ready}
          onClick={() =>
            onSave({
              connected: true,
              business,
              adAccountId: accountId,
              adAccountName: accounts.find((a) => a.id === accountId)?.name ?? accountId,
              pixelId,
              pageId,
              pageName: pages.find((p) => p.id === pageId)?.name ?? pageId,
              igUsername: ig,
            })
          }
        >
          {initial.connected ? "Salvar ativos" : "Conectar"}
        </button>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: { id: string; name: string }[]; placeholder: string;
}) {
  return (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={options.length === 0}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
````

## `src/pages/campaigns/ImportModal.tsx`

````tsx
import { useState } from "react";
import { useAds } from "../../campaigns/adsStore";
import { money } from "../../campaigns/format";
import { sumStats } from "../../campaigns/metrics";
import { Modal } from "../../components/Modal";
import { SearchIcon } from "../../components/MultiSearchSelect";
import { useMySmartlinks } from "../../lib/store";
import { OBJECTIVE_LABEL, type Objective } from "../../meta/types";

const SUGGESTED = new Set<Objective>(["OUTCOME_SALES", "OUTCOME_TRAFFIC"]);
const STATUS_LABEL = { ACTIVE: "Ativa", PAUSED: "Pausada" } as const;
type StatusFilter = "all" | "active" | "paused";

/** Busca C do song.so: filtro local por nome + objetivo + status; sem termo mostra só objetivos sugeridos. */
export function ImportModal({ onClose }: { onClose: () => void }) {
  const { state, now, dispatch } = useAds();
  const links = useMySmartlinks();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [linkFor, setLinkFor] = useState<Record<string, string>>({});

  const all = state.campaigns.filter((c) => !c.tracked && c.adAccountId === state.connection.adAccountId);
  const matchesStatus = (s: string) => status === "all" || (status === "active" ? s === "ACTIVE" : s === "PAUSED");

  const q = query.trim().toLowerCase();
  const visible = q
    ? all.filter((c) => matchesStatus(c.status)).filter((c) =>
        [c.name, OBJECTIVE_LABEL[c.objective], c.objective, STATUS_LABEL[c.status]].join(" ").toLowerCase().includes(q))
    : all.filter((c) => SUGGESTED.has(c.objective) && matchesStatus(c.status));

  const hidden = all.length - all.filter((c) => SUGGESTED.has(c.objective)).length;

  return (
    <Modal title="Importar campanhas existentes" onClose={onClose} wide>
      <p className="muted">Escolha uma campanha existente para acompanhá-la aqui. Nada é alterado na Meta.</p>
      <div className="row">
        {(["all", "active", "paused"] as StatusFilter[]).map((f) => (
          <button key={f} aria-pressed={status === f} className={`chip ${status === f ? "chip--on" : ""}`} onClick={() => setStatus(f)}>
            {f === "all" ? "Todas" : f === "active" ? "Ativas" : "Pausadas"}
          </button>
        ))}
        <div className="search__field grow">
          <SearchIcon />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar todas as campanhas — nome, objetivo ou status…" />
        </div>
      </div>
      {!query.trim() && hidden > 0 && (
        <p className="muted">{hidden} campanha(s) com outros objetivos ocultas — busque para vê-las.</p>
      )}
      <ul className="list">
        {visible.map((c) => {
          const spend = state.ads.filter((a) => a.campaignId === c.id).reduce((s, a) => s + sumStats(a.history, "max", now).spend, 0);
          return (
            <li key={c.id} className="card row row--between">
              <span>
                <strong>{c.name}</strong>
                <div className="muted">{OBJECTIVE_LABEL[c.objective]} · {STATUS_LABEL[c.status]} · gasto total {money(spend)}</div>
              </span>
              <span className="row">
                <select value={linkFor[c.id] ?? ""} onChange={(e) => setLinkFor({ ...linkFor, [c.id]: e.target.value })} aria-label="Smartlink">
                  <option value="">Sem smartlink</option>
                  {links.map((l) => <option key={l.id} value={l.id}>{l.artistName} — {l.title}</option>)}
                </select>
                <button className="btn btn--sm" onClick={() => dispatch({ type: "importCampaign", campaignId: c.id, smartlinkId: linkFor[c.id] || null })}>
                  Importar
                </button>
              </span>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="muted">{all.length === 0 ? "Todas as campanhas desta conta já estão no TrackScale." : `Nenhum resultado para "${query}"`}</li>
        )}
      </ul>
    </Modal>
  );
}
````

## `src/pages/campaigns/JobCards.tsx`

````tsx
import { useAds } from "../../campaigns/adsStore";
import { jobPhases } from "../../campaigns/plan";
import { Equalizer, Progress } from "../../components/Modal";

const STATUS_LABEL = { running: "Executando", paused: "Pausado", done: "Concluído", cancelled: "Cancelado" };

export function JobCards() {
  const { state, dispatch } = useAds();
  if (state.jobs.length === 0) return null;

  return (
    <div className="jobs">
      {state.jobs.slice(0, 3).map((job) => {
        const phases = jobPhases(job.steps);
        const current = job.steps.find((s) => s.status === "pending");
        return (
          <div key={job.id} className={`card job ${job.status === "running" ? "job--running" : ""}`}>
            <div className="row row--between">
              <span className="row">
                {job.status === "running" && <Equalizer />}
                <strong>{job.input.campaignName}</strong>
                <span className={`badge badge--${job.status}`}>{STATUS_LABEL[job.status]}</span>
              </span>
              <span className="row">
                {job.status === "running" && (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "setJobStatus", jobId: job.id, status: "paused" })}>Pausar</button>
                )}
                {job.status === "paused" && (
                  <button className="btn btn--sm" onClick={() => dispatch({ type: "setJobStatus", jobId: job.id, status: "running" })}>Retomar</button>
                )}
                {(job.status === "running" || job.status === "paused") && (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "setJobStatus", jobId: job.id, status: "cancelled" })}>Cancelar</button>
                )}
                {(job.status === "done" || job.status === "cancelled") && (
                  <button className="btn btn--ghost btn--sm" onClick={() => dispatch({ type: "dismissJob", jobId: job.id })}>Ok</button>
                )}
              </span>
            </div>
            {phases.map((p) => (
              <div key={p.label} className="phase">
                <span className="phase__label">{p.label}</span>
                <Progress value={p.value} total={p.total} />
                <span className="muted">{p.value}/{p.total}</span>
              </div>
            ))}
            {job.status === "running" && current && (
              <p className="muted">{current.label}… · roda em segundo plano, você pode recarregar a página.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
````

## `src/search/clientFilter.ts`

````ts
/** Busca C do song.so: substring case-insensitive sobre vários campos unidos. */
export function filterByText<T>(
  items: T[],
  query: string,
  fields: (item: T) => Array<string | null | undefined>,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) =>
    fields(i)
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}
````

## `src/search/releaseSearch.ts`

````ts
import { sanitizeTerm } from "./sanitizeTerm";

export interface Release {
  id: string;
  userId: string;
  type: "smartlink" | "presave" | "other";
  title: string;
  artistName: string;
  slug: string;
  coverImage?: string;
  createdAt: string; // ISO
  deletedAt: string | null;
}

export interface ReleaseQuery {
  userId: string;
  /** Termo já sanitizado; vazio = "recentes". */
  term: string;
  limit: number;
}

/**
 * Contrato do backend. Num Supabase real seria:
 *   .from("releases").select(...)
 *   .or(`title.ilike.%t%,artist_name.ilike.%t%,slug.ilike.%t%`)
 *   .eq("user_id", userId).in("type", ["smartlink","presave"])
 *   .is("deleted_at", null).order("created_at", {ascending:false}).limit(10)
 */
export interface ReleaseRepository {
  query(q: ReleaseQuery): Promise<Release[]>;
}

const SEARCHABLE_TYPES = new Set<Release["type"]>(["smartlink", "presave"]);

export function createInMemoryRepository(data: Release[]): ReleaseRepository {
  return {
    async query({ userId, term, limit }) {
      const t = term.toLowerCase();
      return data
        .filter((r) => r.userId === userId)
        .filter((r) => SEARCHABLE_TYPES.has(r.type))
        .filter((r) => r.deletedAt === null)
        .filter(
          (r) =>
            !t ||
            r.title.toLowerCase().includes(t) ||
            r.artistName.toLowerCase().includes(t) ||
            r.slug.toLowerCase().includes(t),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}

export const RESULT_LIMIT = 10;

export function searchReleases(repo: ReleaseRepository, userId: string, rawQuery: string) {
  return repo.query({ userId, term: sanitizeTerm(rawQuery), limit: RESULT_LIMIT });
}

export function recentReleases(repo: ReleaseRepository, userId: string) {
  return repo.query({ userId, term: "", limit: RESULT_LIMIT });
}
````

## `src/search/sanitizeTerm.ts`

````ts
// Mesma regra observada em song.so: aceita URL colada (usa só o slug) e
// troca `, ( ) %` por espaço, caracteres que quebram filtros `.or()`/LIKE.
const URL_WITH_PATH = /^(https?:\/\/)?[^/\s]+\.[^/\s]+\//i;

export function sanitizeTerm(input: string): string {
  const raw = input.trim();
  const base = URL_WITH_PATH.test(raw)
    ? raw.replace(/^(https?:\/\/)?[^/]+\//i, "").split(/[?#/]/)[0]
    : raw;
  return base.replace(/[,()%]/g, " ").trim();
}
````

## `src/search/search.test.ts`

````ts
import { describe, expect, it } from "vitest";
import { MOCK_RELEASES } from "../data/mock";
import { filterByText } from "./clientFilter";
import { createInMemoryRepository, recentReleases, searchReleases } from "./releaseSearch";
import { sanitizeTerm } from "./sanitizeTerm";

describe("sanitizeTerm", () => {
  it("troca , ( ) % por espaço", () => {
    expect(sanitizeTerm("a,b(c)d%e")).toBe("a b c d e");
  });
  it("extrai o slug de uma URL colada", () => {
    expect(sanitizeTerm("https://song.so/meu-slug?utm=x")).toBe("meu-slug");
    expect(sanitizeTerm("song.so/meu-slug/extra")).toBe("meu-slug");
  });
  it("mantém texto comum", () => {
    expect(sanitizeTerm("  Luna Reis ")).toBe("Luna Reis");
  });
});

describe("searchReleases", () => {
  const repo = createInMemoryRepository(MOCK_RELEASES);

  it("busca em título, artista e slug, ordenado por mais recente", async () => {
    const r = await searchReleases(repo, "u1", "luna");
    expect(r.map((x) => x.id)).toEqual(["1", "3"]);
  });
  it("ignora deletados, outros tipos e outros usuários", async () => {
    const ids = (await recentReleases(repo, "u1")).map((x) => x.id);
    expect(ids).toEqual(["1", "2", "3"]);
  });
  it("aceita URL colada", async () => {
    const r = await searchReleases(repo, "u1", "https://trackscale.app/caio-mare-alta");
    expect(r.map((x) => x.id)).toEqual(["2"]);
  });
});

describe("filterByText", () => {
  const items = [{ n: "Alpha", s: "ACTIVE" }, { n: "Beta", s: "PAUSED" }];
  it("filtra por substring em vários campos", () => {
    expect(filterByText(items, "paus", (i) => [i.n, i.s])).toEqual([items[1]]);
  });
  it("sem termo devolve tudo", () => {
    expect(filterByText(items, "  ", (i) => [i.n])).toEqual(items);
  });
});
````

## `src/search/useAsyncSearch.ts`

````ts
import { useEffect, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

interface Options {
  delayMs?: number;
  /** Mínimo de caracteres para disparar (song.so usa 2 em interesses). */
  minLength?: number;
}

/**
 * Busca assíncrona com debounce, mínimo de caracteres e descarte de
 * respostas atrasadas (flag `stopped` equivalente ao do app original).
 */
export function useAsyncSearch<T>(
  query: string,
  search: (term: string) => Promise<T[]>,
  { delayMs = 300, minLength = 1 }: Options = {},
) {
  const debounced = useDebouncedValue(query.trim(), delayMs);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debounced.length < minLength) {
      setResults([]);
      setLoading(false);
      return;
    }
    let stopped = false;
    setLoading(true);
    search(debounced)
      .then((r) => !stopped && setResults(r))
      .catch(() => !stopped && setResults([]))
      .finally(() => !stopped && setLoading(false));
    return () => {
      stopped = true;
    };
  }, [debounced, minLength, search]);

  // `pending` cobre a janela entre digitar e o debounce disparar.
  const pending = query.trim().length >= minLength && query.trim() !== debounced;
  return { results, loading: loading || pending };
}
````

## `src/search/useDebouncedValue.ts`

````ts
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
````

## `src/styles.css`

````css
/* ---------- tokens ---------- */
:root {
  color-scheme: dark;
  --bg: #08080c;
  --surface: #121219;
  --surface-2: #181821;
  --line: rgba(255, 255, 255, 0.1);
  --line-2: rgba(255, 255, 255, 0.18);
  --text: #f4f4f6;
  --muted: rgba(244, 244, 246, 0.5);
  --neon: #12fb9b;
  --neon-a10: rgba(18, 251, 155, 0.1);
  --neon-a20: rgba(18, 251, 155, 0.2);
  --neon-a40: rgba(18, 251, 155, 0.4);
  /* cor de marca de gráfico: validada (banda de luminosidade + contraste) no fundo escuro */
  --chart-mark: #0aa86a;
  --good: #3ddc84;
  --warn: #f5c451;
  --bad: #ff6b6b;
  --mono: "Space Mono", ui-monospace, Menlo, monospace;
  --sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  --radius: 8px;
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--mono); font-size: 14px; }
a { color: var(--neon); }
h1 { font-size: 24px; margin: 8px 0 16px; }
h2 { font-size: 16px; margin: 0; }
label { display: block; font-size: 12px; color: var(--muted); margin: 16px 0 6px; }
code, .mono { font-family: var(--mono); font-size: 12px; }
.muted { color: var(--muted); font-size: 12px; }
.error { color: var(--bad); font-size: 13px; margin: 6px 0; }
.grow { flex: 1; min-width: 220px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

input, select, textarea {
  width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 9px 12px; color: var(--text); font: inherit; outline: 0; transition: border-color .2s, box-shadow .3s;
}
input:focus, select:focus, textarea:focus { border-color: var(--neon-a40); box-shadow: 0 0 10px rgba(18, 251, 155, .15), inset 0 0 8px rgba(18, 251, 155, .08); }
input[type="checkbox"] { width: auto; accent-color: var(--neon); }
select:disabled { opacity: .5; }
.w-small { width: 110px; }

/* ---------- animações (recriadas a partir do comportamento observado) ---------- */
@keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }
@keyframes pulse-glow {
  0% { box-shadow: 0 0 15px rgba(18, 251, 155, .25), inset 0 0 10px rgba(18, 251, 155, .12); }
  100% { box-shadow: 0 0 22px rgba(18, 251, 155, .35), inset 0 0 15px rgba(18, 251, 155, .2); }
}
@keyframes sweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }
@keyframes eq { 0%, 100% { transform: scaleY(.15); } 50% { transform: scaleY(.9); } }
@keyframes hero-glow { 0%, 100% { opacity: .6; } 50% { opacity: 1; } }
@keyframes shine { 0% { transform: translateX(-150%) rotate(25deg); } 40%, 100% { transform: translateX(250%) rotate(25deg); } }
@keyframes blob {
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(.9); }
  100% { transform: translate(0, 0) scale(1); }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.glow-text { color: var(--neon); text-shadow: 0 0 10px rgba(18, 251, 155, .5); animation: glow 2s ease-in-out infinite; }
.glow-border { border: 1px solid rgba(18, 251, 155, .5) !important; box-shadow: 0 0 15px rgba(18, 251, 155, .3), inset 0 0 10px rgba(18, 251, 155, .1); animation: pulse-glow 3s ease-in-out infinite alternate; }

/* ---------- layout ---------- */
.shell { position: relative; min-height: 100vh; overflow-x: hidden; }
.bg-blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.bg-blobs span { position: absolute; width: 380px; height: 380px; border-radius: 50%; filter: blur(90px); opacity: .12; animation: blob 7s infinite; }
.bg-blobs span:nth-child(1) { background: var(--neon); top: -120px; left: -80px; }
.bg-blobs span:nth-child(2) { background: #3b82f6; top: 30%; right: -120px; animation-delay: 2s; }
.bg-blobs span:nth-child(3) { background: #a855f7; bottom: -140px; left: 30%; animation-delay: 4s; }
.nav { position: sticky; top: 0; z-index: 20; display: flex; flex-wrap: wrap; gap: 18px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--line); background: rgba(8, 8, 12, .8); backdrop-filter: blur(10px); }
.nav a { color: var(--muted); text-decoration: none; transition: color .2s; }
.nav a:hover, .nav a.active { color: var(--text); }
.nav a.active { text-shadow: 0 0 8px rgba(18, 251, 155, .4); }
.brand { display: flex; align-items: center; gap: 8px; color: var(--neon) !important; font-weight: 700; margin-right: 8px; }
.brand__mark { width: 14px; height: 14px; border-radius: 3px; background: var(--neon); box-shadow: 0 0 12px var(--neon); }
.page { position: relative; z-index: 1; width: 100%; max-width: 760px; margin: 28px auto; padding: 0 16px; animation: fade-up .3s ease-out; }
.page--wide { max-width: 1280px; }
.public { max-width: 420px; text-align: center; padding-top: 40px; }
.public__cover { width: 180px; height: 180px; margin: 0 auto 20px; border-radius: 12px; background: linear-gradient(135deg, var(--neon-a20), transparent); display: grid; place-items: center; }

.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.row--between { justify-content: space-between; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 16px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; margin: 12px 0; }
.list { list-style: none; padding: 0; margin: 12px 0; display: grid; gap: 8px; }
.list .card { margin: 0; }

/* ---------- botões ---------- */
.btn {
  position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px;
  background: var(--neon-a20); border: 1px solid rgba(18, 251, 155, .3); color: var(--text);
  border-radius: var(--radius); padding: 8px 14px; font: inherit; cursor: pointer; text-decoration: none;
  transition: background .2s, border-color .2s, box-shadow .2s;
}
.btn::before { content: ""; position: absolute; inset: 0; opacity: .3; background: linear-gradient(45deg, transparent 0%, rgba(18, 251, 155, .15) 50%, transparent 100%); pointer-events: none; }
.btn:hover { background: rgba(18, 251, 155, .3); border-color: rgba(18, 251, 155, .5); box-shadow: 0 0 12px rgba(18, 251, 155, .2); }
.btn:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
.btn--ghost { background: transparent; border-color: var(--line-2); }
.btn--ghost::before { display: none; }
.btn--ghost:hover { background: rgba(255, 255, 255, .05); border-color: var(--line-2); box-shadow: none; }
.btn--danger { background: rgba(255, 107, 107, .12); border-color: rgba(255, 107, 107, .4); }
.btn--danger::before { display: none; }
.btn--danger:hover { background: rgba(255, 107, 107, .22); border-color: rgba(255, 107, 107, .6); box-shadow: none; }
.btn--sm { padding: 4px 10px; font-size: 12px; }
.btn--block { display: flex; justify-content: center; width: 100%; margin: 10px 0; padding: 12px; }
.btn--shine::after, .btn--launch::after { content: ""; position: absolute; top: -50%; width: 30%; height: 200%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .25), transparent); animation: shine 3.5s ease-in-out infinite; }
.btn--launch { animation: pulse-glow 2s ease-in-out infinite alternate; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.chip { background: transparent; border: 1px solid var(--line-2); color: var(--text); border-radius: 999px; padding: 4px 11px; font: inherit; font-size: 12px; cursor: pointer; transition: all .15s; }
.chip:hover { border-color: var(--neon-a40); }
.chip--on { background: rgba(18, 251, 155, .15); border-color: var(--neon-a40); color: var(--neon); font-weight: 700; }
.chip button { background: none; border: 0; color: inherit; cursor: pointer; margin-left: 4px; font: inherit; }
.chips--results .chip { animation: fade-up .15s ease-out; }

.badge { display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--muted); margin-left: 6px; }
.badge--new { color: var(--neon); border-color: var(--neon-a40); margin: 0; }
.badge--good { color: var(--good); border-color: rgba(61, 220, 132, .4); }
.badge--running { color: var(--neon); border-color: var(--neon-a40); }
.badge--done { color: var(--good); border-color: rgba(61, 220, 132, .4); }
.badge--cancelled { color: var(--bad); border-color: rgba(255, 107, 107, .4); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--muted); margin-right: 6px; }
.dot--on { background: var(--neon); box-shadow: 0 0 8px var(--neon); animation: glow 2s infinite; }
.check { display: flex; gap: 8px; align-items: center; color: var(--text); font-size: 13px; margin: 10px 0; }

/* ---------- busca ---------- */
.search { position: relative; }
.search__field { display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, .3); border: 1px solid var(--line); border-radius: var(--radius); padding: 0 12px; transition: border-color .2s, box-shadow .3s; }
.search__field:focus-within { border-color: var(--neon-a40); box-shadow: 0 0 10px rgba(18, 251, 155, .15); }
.search__field input { border: 0; background: transparent; padding: 9px 0; box-shadow: none !important; }
.icon { color: var(--muted); flex: none; }
.search__spinner { flex: none; width: 14px; height: 14px; border: 2px solid var(--neon-a20); border-top-color: var(--neon); border-radius: 50%; animation: spin .7s linear infinite; }
.search__dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 4px); background: var(--surface-2); border: 1px solid var(--line-2); border-radius: var(--radius); box-shadow: 0 12px 30px rgba(0, 0, 0, .55); padding: 4px 0; z-index: 30; animation: fade-up .15s ease-out; }
.search__heading { padding: 4px 12px; font-size: 12px; color: var(--muted); border-bottom: 1px solid var(--line); margin-bottom: 4px; }
.search__item { display: flex; gap: 12px; align-items: center; width: 100%; padding: 8px 12px; background: none; border: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.search__item:hover { background: rgba(18, 251, 155, .12); }
.search__item img { width: 36px; height: 36px; border-radius: 4px; object-fit: cover; }
.search__item strong { display: block; font-weight: 400; }
.search__item small { color: var(--muted); font-size: 12px; }
.search__empty { padding: 8px 12px; font-size: 12px; color: var(--muted); }

/* ---------- dashboard ---------- */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; }
.stat__value { font-size: 26px; font-weight: 700; }

/* ---------- campanhas ---------- */
.hero { position: relative; padding: 24px 0 8px; }
.hero h1 { margin: 10px 0 6px; font-size: 28px; }
.hero__glow { position: absolute; inset: -40px -20px auto; height: 220px; background: radial-gradient(60% 80% at 30% 0%, rgba(18, 251, 155, .12), transparent 70%); animation: hero-glow 3s ease-in-out infinite; pointer-events: none; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line); margin: 16px 0; }
.tab { background: none; border: 0; border-bottom: 2px solid transparent; color: var(--muted); font: inherit; padding: 10px 14px; cursor: pointer; }
.tab--on { color: var(--neon); border-bottom-color: var(--neon); }
.card--conn { background: linear-gradient(90deg, rgba(18, 251, 155, .06), var(--surface) 40%); }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 16px 0 8px; }
.sim { padding: 8px 12px; border: 1px dashed var(--line-2); border-radius: var(--radius); margin-bottom: 12px; }

.jobs { display: grid; gap: 8px; }
.job--running { border-color: var(--neon-a40); }
.phase { display: grid; grid-template-columns: 200px 1fr 50px; gap: 12px; align-items: center; margin: 8px 0; font-size: 12px; }
@media (max-width: 560px) { .phase { grid-template-columns: 1fr 50px; } .phase__label { grid-column: 1 / -1; } }
.progress { position: relative; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, .08); overflow: hidden; }
.progress__fill { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); border-radius: inherit; transition: width .4s ease; }
.progress__sweep { position: absolute; inset: 0 auto 0 0; width: 25%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .5), transparent); animation: sweep 1.4s ease-in-out infinite; }
.progress--done .progress__fill { background: var(--good); box-shadow: none; }

.eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 14px; }
.eq span { width: 3px; height: 100%; background: var(--neon); border-radius: 1px; transform: scaleY(.15); transform-origin: bottom; }
.eq--on span { animation: eq .9s ease-in-out infinite; }
.eq--big { height: 60px; gap: 6px; }
.eq--big span { width: 10px; border-radius: 3px; }

.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.ctable { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
.ctable th { position: sticky; top: 0; background: var(--surface-2); color: var(--muted); font-weight: 400; text-align: left; padding: 10px; border-bottom: 1px solid var(--line); }
.ctable td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.ctable th:first-child, .ctable td:first-child { position: sticky; left: 0; background: inherit; min-width: 260px; white-space: normal; }
.ctable tr { background: var(--surface); }
.ctable__campaign:hover, .ctable__adset:hover, .ctable__ad:hover { background: #16161f; }
.ctable__adset { background: #0f0f15; }
.ctable__ad { background: #0c0c11; }
.ctable__charts td, .ctable__confirm td { background: #0f0f15; white-space: normal; }
/* a linha de gráficos ocupa só a área visível da tabela, mesmo com rolagem horizontal */
.ctable__charts td > * { position: sticky; left: 10px; max-width: min(1220px, calc(100vw - 72px)); }
.expander + .cell-name { max-width: calc(100% - 48px); }
.ctable__confirm td { color: var(--warn); }
.hint { display: inline-grid; place-items: center; width: 12px; height: 12px; margin-left: 4px; border: 1px solid var(--line-2); border-radius: 50%; font-size: 8px; cursor: help; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.tone-good { color: var(--good); }
.tone-warn { color: var(--warn); }
.tone-bad { color: var(--bad); }
.cell-name { display: inline-flex; flex-direction: column; vertical-align: middle; }
.cell-name small { color: var(--muted); font-size: 11px; }
.cell-name--l2 { padding-left: 46px; }
.cell-input { width: 80px; padding: 4px 6px; font-size: 12px; }
.cell-actions { display: flex; gap: 6px; }
.expander { background: none; border: 0; color: var(--muted); cursor: pointer; font-size: 12px; width: 20px; }
.expander--l1 { margin-left: 22px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; color: var(--muted); font: inherit; font-size: 11px; cursor: pointer; padding: 0; }
.toggle__knob { position: relative; width: 28px; height: 16px; border-radius: 999px; background: rgba(255, 255, 255, .15); transition: background .2s; }
.toggle__knob::after { content: ""; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; transition: transform .2s; }
.toggle--on { color: var(--text); }
.toggle--on .toggle__knob { background: var(--neon); box-shadow: 0 0 8px rgba(18, 251, 155, .5); }
.toggle--on .toggle__knob::after { transform: translateX(12px); background: #062; }

/* ---------- gráfico ---------- */
.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin: 4px 0 8px; }
.mini { margin: 0; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; }
.mini figcaption { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.mini figcaption strong { color: var(--text); margin-left: 6px; }
.mini__plot { position: relative; height: 80px; }
.mini__plot svg { width: 100%; height: 100%; display: block; overflow: visible; }
.mini__line { fill: none; stroke: var(--chart-mark); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.mini__area { fill: var(--chart-mark); opacity: .12; }
.mini__base { stroke: var(--line-2); stroke-width: 1; vector-effect: non-scaling-stroke; }
.mini__grid { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
.mini__cross { stroke: var(--text); stroke-width: 1; opacity: .4; }
.mini__tip { position: absolute; top: 2px; transform: translateX(-50%); background: #000; border: 1px solid var(--line-2); border-radius: 6px; padding: 3px 8px; font-size: 11px; white-space: nowrap; pointer-events: none; }
.mini__tip span { color: var(--muted); }
.mini__empty { height: 80px; display: grid; place-items: center; color: var(--muted); font-size: 12px; }
.mini__table summary { font-size: 11px; color: var(--muted); cursor: pointer; margin-top: 6px; }
.mini__table table { font-size: 11px; margin-top: 4px; }
.mini__table td { padding: 1px 10px 1px 0; }

/* ---------- wizard ---------- */
.stepper { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; padding: 0; margin: 8px 0 0; }
.stepper button { display: flex; align-items: center; gap: 8px; background: none; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font: inherit; font-size: 12px; padding: 5px 12px 5px 5px; cursor: pointer; }
.stepper button:disabled { cursor: default; }
.stepper__n { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: rgba(255, 255, 255, .08); font-size: 11px; }
.stepper__on button { color: var(--neon); border-color: var(--neon-a40); box-shadow: 0 0 10px rgba(18, 251, 155, .15); }
.stepper__on .stepper__n { background: var(--neon); color: #000; }
.stepper__done button { color: var(--text); }
.stepper__done .stepper__n { background: var(--neon-a20); color: var(--neon); }
.adset { animation: fade-up .2s ease-out; }
.more summary { cursor: pointer; color: var(--muted); font-size: 12px; margin-top: 14px; }
.picked { padding: 10px 12px; border: 1px solid var(--neon-a40); border-radius: var(--radius); background: var(--neon-a10); }
.budget { padding: 8px 0; border-bottom: 1px solid var(--line); }
.dropzone { display: grid; gap: 6px; place-items: center; text-align: center; border: 1px dashed var(--neon-a40); border-radius: var(--radius); padding: 24px; margin: 12px 0; color: var(--text); cursor: pointer; background: var(--neon-a10); transition: background .2s; }
.dropzone:hover { background: rgba(18, 251, 155, .16); }
.dropzone input { display: none; }
.reels { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin: 12px 0; }
.reel { display: grid; gap: 6px; text-align: left; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius); color: var(--text); font: inherit; font-size: 12px; padding: 8px; cursor: pointer; transition: border-color .2s, box-shadow .2s; }
.reel--on { border-color: var(--neon); box-shadow: 0 0 12px rgba(18, 251, 155, .25); }
.reel__thumb { aspect-ratio: 9 / 16; max-height: 140px; width: 100%; border-radius: 6px; background: linear-gradient(160deg, rgba(18, 251, 155, .25), rgba(168, 85, 247, .2)); }
.creative { padding: 6px 0; border-bottom: 1px solid var(--line); }
.summary { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.summary strong { color: var(--neon); font-size: 18px; margin-right: 4px; }
.wizard-nav { margin: 16px 0 40px; }

/* ---------- modal + log ---------- */
.modal { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, .65); backdrop-filter: blur(4px); animation: fade-up .15s ease-out; }
.modal__box { width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto; background: var(--surface); border-radius: 12px; padding: 18px 20px; }
.modal__box--wide { max-width: 820px; }
.log { list-style: none; padding: 0; margin: 8px 0; display: grid; gap: 6px; max-height: 420px; overflow-y: auto; }
.log__item { display: grid; gap: 2px; padding: 8px 10px; border-left: 3px solid var(--line-2); background: var(--surface-2); border-radius: 0 6px 6px 0; font-size: 12px; animation: fade-up .2s ease-out; }
.log__item--on { border-left-color: var(--good); }
.log__item--off { border-left-color: var(--bad); }
.log__item--kept { border-left-color: var(--warn); }
.log__when { color: var(--muted); font-size: 11px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
````

## `tsconfig.json`

````json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
````

## `vite.config.ts`

````ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // usado quando VITE_META_MODE=http (ver server/index.mjs)
    proxy: { "/api": "http://localhost:8787" },
  },
});
````
