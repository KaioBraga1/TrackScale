import { useCallback, useState } from "react";
import { useAsyncSearch } from "../search/useAsyncSearch";
import {
  recentReleases,
  searchReleases,
  type Release,
  type ReleaseRepository,
} from "../search/releaseSearch";

interface Props {
  repo: ReleaseRepository;
  userId: string;
  onPick: (release: Release) => void;
}

export function ReleaseSearchBox({ repo, userId, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<Release[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);

  const search = useCallback(
    (term: string) => searchReleases(repo, userId, term),
    [repo, userId],
  );
  const { results, loading } = useAsyncSearch(query, search);

  const hasQuery = query.trim().length > 0;
  const items = hasQuery ? results : recents;
  const busy = hasQuery ? loading : loadingRecents;

  const loadRecents = async () => {
    setLoadingRecents(true);
    try {
      setRecents(await recentReleases(repo, userId));
    } finally {
      setLoadingRecents(false);
    }
  };

  return (
    <div className="search">
      <div className="search__field">
        <input
          type="text"
          value={query}
          placeholder="Busque por artista, faixa ou cole o link…"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            if (recents.length === 0) void loadRecents();
          }}
          // atraso para o clique no item acontecer antes do menu fechar
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {busy && <span className="search__spinner" aria-label="Buscando" />}
      </div>

      {open && !busy && (
        <div className="search__dropdown" role="listbox">
          {items.length > 0 ? (
            <>
              {!hasQuery && <div className="search__heading">Lançamentos recentes</div>}
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  className="search__item"
                  // mouseDown + preventDefault: seleciona antes do blur
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(r);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {r.coverImage && <img src={r.coverImage} alt="" />}
                  <span>
                    <strong>
                      {r.artistName} — {r.title}
                    </strong>
                    <small>trackscale.app/{r.slug}</small>
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="search__empty">
              {hasQuery
                ? "Nenhum lançamento encontrado"
                : "Nenhum lançamento ainda — crie um primeiro"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
