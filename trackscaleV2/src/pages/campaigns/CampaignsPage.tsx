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
