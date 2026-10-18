import { sanitizeTerm } from "./sanitizeTerm";

export interface Release {
  id: string;
  userId: string;
  type: "smartlink" | "presave" | "other";
  title: string;
  artistName: string;
  slug: string;
  coverImage?: string;
  createdAt: string; // ISO
  deletedAt: string | null;
}

export interface ReleaseQuery {
  userId: string;
  /** Termo já sanitizado; vazio = "recentes". */
  term: string;
  limit: number;
}

/**
 * Contrato do backend. Num Supabase real seria:
 *   .from("releases").select(...)
 *   .or(`title.ilike.%t%,artist_name.ilike.%t%,slug.ilike.%t%`)
 *   .eq("user_id", userId).in("type", ["smartlink","presave"])
 *   .is("deleted_at", null).order("created_at", {ascending:false}).limit(10)
 */
export interface ReleaseRepository {
  query(q: ReleaseQuery): Promise<Release[]>;
}

const SEARCHABLE_TYPES = new Set<Release["type"]>(["smartlink", "presave"]);

export function createInMemoryRepository(data: Release[]): ReleaseRepository {
  return {
    async query({ userId, term, limit }) {
      const t = term.toLowerCase();
      return data
        .filter((r) => r.userId === userId)
        .filter((r) => SEARCHABLE_TYPES.has(r.type))
        .filter((r) => r.deletedAt === null)
        .filter(
          (r) =>
            !t ||
            r.title.toLowerCase().includes(t) ||
            r.artistName.toLowerCase().includes(t) ||
            r.slug.toLowerCase().includes(t),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}

export const RESULT_LIMIT = 10;

export function searchReleases(repo: ReleaseRepository, userId: string, rawQuery: string) {
  return repo.query({ userId, term: sanitizeTerm(rawQuery), limit: RESULT_LIMIT });
}

export function recentReleases(repo: ReleaseRepository, userId: string) {
  return repo.query({ userId, term: "", limit: RESULT_LIMIT });
}
