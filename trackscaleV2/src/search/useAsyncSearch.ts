import { useEffect, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

interface Options {
  delayMs?: number;
  /** Mínimo de caracteres para disparar (song.so usa 2 em interesses). */
  minLength?: number;
}

/**
 * Busca assíncrona com debounce, mínimo de caracteres e descarte de
 * respostas atrasadas (flag `stopped` equivalente ao do app original).
 */
export function useAsyncSearch<T>(
  query: string,
  search: (term: string) => Promise<T[]>,
  { delayMs = 300, minLength = 1 }: Options = {},
) {
  const debounced = useDebouncedValue(query.trim(), delayMs);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debounced.length < minLength) {
      setResults([]);
      setLoading(false);
      return;
    }
    let stopped = false;
    setLoading(true);
    search(debounced)
      .then((r) => !stopped && setResults(r))
      .catch(() => !stopped && setResults([]))
      .finally(() => !stopped && setLoading(false));
    return () => {
      stopped = true;
    };
  }, [debounced, minLength, search]);

  // `pending` cobre a janela entre digitar e o debounce disparar.
  const pending = query.trim().length >= minLength && query.trim() !== debounced;
  return { results, loading: loading || pending };
}
