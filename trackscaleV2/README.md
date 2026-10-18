# TrackScale V2

Smartlinks + campanhas Meta Ads otimizadas pelo **custo real por clique nas plataformas** (RCPR),
inspirado em `app.song.so/campaigns`. Investigação: [INVESTIGACAO-BUSCA-SONGSO.md](INVESTIGACAO-BUSCA-SONGSO.md).

```bash
npm install
npm run dev     # http://localhost:5173 — Meta simulada, sem credenciais
npm test        # métricas, otimizador, plano do job, buscas
npm run build
```

## Telas

| Rota | O que faz |
|---|---|
| `/dashboard` | Smartlinks, campanhas ativas, gasto e RCPR do mês |
| `/smartlinks` | Criar, listar e excluir (soft delete) |
| `/s/:slug` | Página pública; registra o clique (com `?tsc=<campanha>` para atribuição) |
| `/campaigns` | Conexão Meta → tabela de campanhas › conjuntos › anúncios com métricas, gráficos, toggles, meta de RCPR, importar, remover/excluir, automação |
| `/campaigns/new` | Wizard: Campanha → Público (vários conjuntos) → Orçamento → Anúncios → Revisão; vira um job com progresso por fase |
| `/analytics` | Cliques por smartlink/plataforma + gráfico de 14 dias |

## Métricas

| Coluna | Fórmula |
|---|---|
| RCPR | gasto ÷ cliques nas plataformas |
| CPR / CPC | gasto ÷ resultados Meta / gasto ÷ cliques no link |
| Freq. | impressões ÷ alcance |
| CTR / Play 3s | cliques no link ÷ impressões / plays 3s ÷ impressões |
| Conv. | cliques nas plataformas ÷ cliques no link (referência 60%) |

## Automação (`src/campaigns/optimizer.ts`)

A cada execução, por conjunto ativo de campanha ativa:

1. Anúncios com ≥ *N* impressões: desliga se frequência ≥ máx. ou RCPR > meta × (1 + tolerância).
2. Cada desligado abre vaga para um anúncio pausado **não testado**.
3. *Evitar que a campanha morra*: se sobrar menos que o mínimo, mantém o menos ruim ligado.
4. *Analisar conjuntos*: sem anúncio viável, desliga o conjunto.

Tudo vai para o log (últimas 200 ações) com o motivo. Na Meta simulada, use **Simular +1 dia**
para gerar mais um dia de métricas e disparar a automação.

## Meta real

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
