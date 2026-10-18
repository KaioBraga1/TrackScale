import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal__box glow-border ${wide ? "modal__box--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row row--between">
          <h2>{title}</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Barras de equalizador animadas (estado ocioso/carregando, como o "reco-idle" do song.so). */
export function Equalizer({ active = true }: { active?: boolean }) {
  return (
    <span className={`eq ${active ? "eq--on" : ""}`} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}

/** Barra de progresso com varredura de brilho (como o "opt-sweep"). */
export function Progress({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const done = value >= total;
  return (
    <div className={`progress ${done ? "progress--done" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
      {!done && <span className="progress__sweep" />}
    </div>
  );
}
