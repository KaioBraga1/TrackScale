import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { MOCK_RELEASES } from "../data/mock";
import { createInMemoryRepository, type ReleaseRepository } from "../search/releaseSearch";
import { CURRENT_USER_ID, type ClickEvent, type Smartlink } from "./types";

interface State {
  smartlinks: Smartlink[];
  clicks: ClickEvent[];
}

type Action =
  | { type: "addSmartlink"; smartlink: Smartlink }
  | { type: "deleteSmartlink"; id: string }
  | { type: "addClick"; click: ClickEvent };

const KEY = "trackscale:v1";

const seed = (): State => ({
  smartlinks: MOCK_RELEASES.map((r) => ({
    ...r,
    links: [
      { platform: "Spotify", url: "https://open.spotify.com" },
      { platform: "Apple Music", url: "https://music.apple.com" },
    ],
  })),
  clicks: [],
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>;
      return { smartlinks: s.smartlinks ?? seed().smartlinks, clicks: s.clicks ?? [] };
    }
  } catch {
    /* storage indisponível ou corrompido: cai no seed */
  }
  return seed();
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "addSmartlink":
      return { ...s, smartlinks: [a.smartlink, ...s.smartlinks] };
    case "deleteSmartlink": // soft delete, igual ao deleted_at do song.so
      return {
        ...s,
        smartlinks: s.smartlinks.map((l) =>
          l.id === a.id ? { ...l, deletedAt: new Date().toISOString() } : l,
        ),
      };
    case "addClick":
      return { ...s, clicks: [a.click, ...s.clicks] };
  }
}

interface StoreValue extends State {
  repo: ReleaseRepository;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state]);

  const repo = useMemo(() => createInMemoryRepository(state.smartlinks), [state.smartlinks]);
  const value = useMemo(() => ({ ...state, repo, dispatch }), [state, repo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore fora do StoreProvider");
  return v;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function useMySmartlinks() {
  const { smartlinks } = useStore();
  return useMemo(
    () => smartlinks.filter((s) => s.userId === CURRENT_USER_ID && s.deletedAt === null),
    [smartlinks],
  );
}
