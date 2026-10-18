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
