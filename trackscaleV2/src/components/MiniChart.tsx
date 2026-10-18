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
