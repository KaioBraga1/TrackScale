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
