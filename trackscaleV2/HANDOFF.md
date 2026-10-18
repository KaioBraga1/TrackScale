# TrackScale V2 — Handoff completo

> Documento autocontido para levar este trabalho a outro sistema (outro repositório, outra equipe
> ou outro agente de IA). Explica o que foi analisado, o que foi construído, como as peças
> funcionam, o que é real e o que é simulado, e como portar.
>
> Data: 2026-10-14 · Stack: React 18 + TypeScript + Vite 5 + Vitest · Estado: protótipo funcional (Meta simulada)

---

## 1. Resumo em 30 segundos

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

## 2. O que foi analisado (song.so)

### Método
Análise **estática** dos arquivos públicos do site (`index.html` → `main-*.js` → `App-*.js` →
chunk lazy `Campaigns-Dqm-wdpl.js`, com 417 KB, mais `metaCampaigns-*.js` e os CSS), sem login e
sem chamar a API deles. O bundle contém uma anon key pública do Supabase, que **não foi usada**.

### Arquitetura deles
- SPA React + Vite, hospedada em Netlify/Cloudflare.
- Backend **Supabase** (Postgres/PostgREST + Edge Functions).
- Integração com a Meta via Edge Functions `meta-ads-api`, `meta-ads-structure`, `meta-ads-insights` e
  `meta-ads-create`, roteadas por um mapa `FN_BY_ACTION` no cliente.

### As três buscas
| Busca | Onde roda | Regras |
|---|---|---|
| Seletor de release | Servidor (PostgREST) | Debounce 300 ms. `title/artist_name/slug ILIKE %t%` combinados por OR. Filtra `user_id`, `type in (smartlink, presave)`, `deleted_at is null`. Ordena por `created_at desc`, limite 10. Aceita URL colada (usa o slug). Remove `, ( ) %`. Campo vazio mostra "Recent releases". Item selecionado com `onMouseDown` + `preventDefault`. |
| Interesses e países | Edge Function → Meta | Debounce 300 ms, mínimo de 2 caracteres, descarta resposta atrasada (flag `stopped`), exclui os já escolhidos. |
| Filtros locais | Cliente | Substring case-insensitive sobre vários campos unidos. Sem termo, mostra só os objetivos sugeridos. |

### Inventário funcional (do bundle)
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

### Linguagem visual
- Fundo escuro, neon `#12fb9b`, fonte **Space Mono**.
- Classes `cyber-button`, `cyber-input-glow`, `glow-text` e `glow-border`.
- Animações: `glow`, `pulse-glow`, `shimmer`, `shine` e `blob`, mais as inline `reco-idle` (equalizador),
  `reco-glow` (brilho radial) e `opt-sweep` (varredura do progresso).
- **Tudo foi recriado com CSS próprio.** Nenhum asset, logo ou arquivo do song.so foi copiado.

Evidências completas, com trechos de código extraídos: **`INVESTIGACAO-BUSCA-SONGSO.md`**.

---

## 3. Como rodar

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

## 4. Arquitetura

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

### Mapa de arquivos
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

## 5. Modelo de domínio

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

### Esquema SQL sugerido (Postgres/Supabase)
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

## 6. Algoritmos

### Métricas (`metrics.ts`)
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

### Automação (`optimizer.ts`, função pura)
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

### Job de lançamento (`plan.ts`)
Passos: `upload` (só vídeos enviados) → `campaign` → `adset` (um por conjunto) → `creative` (um por
criativo) → `ad` (conjunto × criativo). Cada passo grava `results[key] = idCriado`; os passos seguintes
referenciam essas chaves. Execução sequencial, retomável e cancelável. Hoje roda no cliente a cada
450 ms; em produção deve ser uma fila no servidor (equivalente ao `meta_campaign_job_*` do song.so).

### Simulação (`simulate.ts`)
PRNG determinístico por `(adId, data)`, com uma "qualidade" fixa por anúncio, para que o otimizador
tenha diferenças reais entre anúncios. A frequência cresce com a idade do anúncio (fadiga).
`advance()` gera os dias pulados para anúncios que estavam rodando. O botão **Simular +1 dia** adianta
o relógio (`clockOffset`). **Substituir por `get_insights` em produção.**

---

## 7. API (`server/index.mjs`)

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

## 8. Design system

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

## 9. Persistência atual (localStorage)

| Chave | Conteúdo |
|---|---|
| `trackscale:v1` | Smartlinks e cliques |
| `trackscale:ads:v1` | Conexão, campanhas, conjuntos, anúncios (com histórico), jobs, regras, log, relógio simulado |
| `trackscale:wizard-draft` | Rascunho do wizard |

Para reiniciar a demo: `localStorage.clear()` no console do navegador.

---

## 10. Status

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

## 11. Próximos passos (ordem sugerida)

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

## 12. Como levar para outro sistema

- **Repositório inteiro:** copie a pasta sem `node_modules/` e `dist/`, depois rode `npm install`.
- **Só a lógica:** `src/search/*`, `src/campaigns/{metrics,optimizer,plan,naming,dates,series,simulate,format}.ts`,
  `src/meta/{types,presets}.ts` e os testes `*.test.ts`. São TypeScript puro e só dependem de `vitest` nos testes.
- **Só a UI:** `src/components/*`, `src/pages/*` e `src/styles.css` dependem de React 18 + react-router 6.
- **Para outro agente de IA:** entregue este arquivo e o `INVESTIGACAO-BUSCA-SONGSO.md`. Juntos, eles
  descrevem o comportamento esperado; os testes servem de especificação executável.
