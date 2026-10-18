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
