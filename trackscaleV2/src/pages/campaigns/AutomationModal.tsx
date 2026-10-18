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
