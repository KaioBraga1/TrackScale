// Mesma regra observada em song.so: aceita URL colada (usa só o slug) e
// troca `, ( ) %` por espaço, caracteres que quebram filtros `.or()`/LIKE.
const URL_WITH_PATH = /^(https?:\/\/)?[^/\s]+\.[^/\s]+\//i;

export function sanitizeTerm(input: string): string {
  const raw = input.trim();
  const base = URL_WITH_PATH.test(raw)
    ? raw.replace(/^(https?:\/\/)?[^/]+\//i, "").split(/[?#/]/)[0]
    : raw;
  return base.replace(/[,()%]/g, " ").trim();
}
