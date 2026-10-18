const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const money = (v: number | null) => (v === null ? "—" : brl.format(v));
export const int = (v: number) => v.toLocaleString("pt-BR");
export const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
export const num = (v: number | null, digits = 2) => (v === null ? "—" : v.toFixed(digits));
