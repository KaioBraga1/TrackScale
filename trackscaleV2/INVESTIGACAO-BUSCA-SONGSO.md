# Investigação: como funciona a busca em app.song.so/campaigns

Data: 2026-10-14 · Método: análise estática dos bundles JS públicos servidos pelo próprio site
(sem login, sem chamadas à API deles, sem uso de chaves/tokens encontrados no bundle).

## 1. Arquitetura geral

| Item | Evidência |
|---|---|
| SPA React + Vite (code-splitting) | `index.html` referencia `/assets/main-*.js`, `vendor-react-*.js`, `vendor-router-*.js` |
| Backend = Supabase (Postgres via PostgREST) | `main-*.js` e `supabase-*.js` contêm `https://eqdwatemkcuetdnntvra.supabase.co` |
| Página `/campaigns` é um chunk lazy | `App-SU-4TejO.js` importa `assets/Campaigns-Dqm-wdpl.js` (417 KB) |
| Integração Meta Ads via Edge Functions | `metaCampaigns-*.js`: mapa `FN_BY_ACTION` → `meta-ads-api`, `meta-ads-structure`, `meta-ads-insights`, `meta-ads-create` |

Existem **três** buscas distintas na página, cada uma com uma estratégia diferente.

## 2. Busca A — Seletor de release/smartlink (a principal)

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

## 3. Busca B — Direcionamento Meta (interesses/países)

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

## 4. Busca C — Filtros 100 % no cliente

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

## 5. Transporte para a Meta (contexto)

`call({action, ...})` roteia por `FN_BY_ACTION` para uma Edge Function (`/functions/v1/<fn>`).
`search_targeting` → `meta-ads-api`. Não inspecionei a implementação das funções (código server-side não é público).

## 6. Limites da investigação (honestidade)

- Análise **estática** do bundle minificado; não executei o app logado, então não observei payloads reais.
- Não sei os índices do Postgres (ex.: `pg_trgm`) nem as regras de RLS; o que se vê é só o cliente.
- O bundle contém uma anon key pública do Supabase; **não foi usada**.
- Não afirmo nada sobre ranking além de `created_at desc` (não há relevância/fuzzy no cliente).

## 7. Funcionalidades completas da página (inventário do bundle)

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

## 8. O que foi implementado no seu projeto

Mapeamento 1:1 (ver `README.md` do projeto):

| song.so | Seu projeto |
|---|---|
| Busca A (servidor) | `src/search/releaseSearch.ts` + `sanitizeTerm.ts` + `ReleaseSearchBox.tsx` |
| debounce 300 ms | `src/search/useDebouncedValue.ts` |
| Busca C (cliente) | `src/search/clientFilter.ts` |
| Busca B (autocomplete mín. 2) | `useAsyncSearch` com `minLength` |
