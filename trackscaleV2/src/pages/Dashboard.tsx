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
