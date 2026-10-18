import { useCallback, useState } from "react";
import { useAsyncSearch } from "../search/useAsyncSearch";

interface Option {
  id: string;
  name: string;
}

interface Props<T extends Option> {
  selected: T[];
  onChange: (next: T[]) => void;
  search: (q: string) => Promise<T[]>;
  placeholder: string;
  /** song.so usa 2 para interesses; 1 para países/idiomas. */
  minLength?: number;
}

/** Autocomplete com chips: debounce 300 ms, exclui já escolhidos, descarta respostas atrasadas. */
export function MultiSearchSelect<T extends Option>({ selected, onChange, search, placeholder, minLength = 1 }: Props<T>) {
  const [query, setQuery] = useState("");
  const run = useCallback(
    async (q: string) => (await search(q)).filter((r) => !selected.some((s) => s.id === r.id)),
    [search, selected],
  );
  const { results, loading } = useAsyncSearch(query, run, { minLength });
  const showResults = query.trim().length >= minLength && !loading;

  return (
    <div className="mss">
      <div className="search__field">
        <SearchIcon />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        {loading && <span className="search__spinner" aria-label="Buscando" />}
      </div>

      {showResults && (
        <div className="chips chips--results">
          {results.length === 0 && <span className="muted">Nenhum resultado para "{query.trim()}"</span>}
          {results.map((h) => (
            <button
              key={h.id}
              type="button"
              className="chip"
              onClick={() => {
                onChange([...selected, h]);
                setQuery("");
              }}
            >
              + {h.name}
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="chips">
          {selected.map((s) => (
            <span key={s.id} className="chip chip--on">
              {s.name}
              <button type="button" aria-label={`Remover ${s.name}`} onClick={() => onChange(selected.filter((x) => x.id !== s.id))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
