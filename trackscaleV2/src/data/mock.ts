import type { Release } from "../search/releaseSearch";

const base = {
  userId: "u1",
  deletedAt: null,
} as const;

export const MOCK_RELEASES: Release[] = [
  { ...base, id: "1", type: "smartlink", title: "Noite Azul", artistName: "Luna Reis", slug: "luna-noite-azul", createdAt: "2026-10-01T10:00:00Z" },
  { ...base, id: "2", type: "presave", title: "Maré Alta", artistName: "Caio Ventura", slug: "caio-mare-alta", createdAt: "2026-09-20T10:00:00Z" },
  { ...base, id: "3", type: "smartlink", title: "Fogo Lento", artistName: "Luna Reis", slug: "luna-fogo-lento", createdAt: "2026-08-11T10:00:00Z" },
  { ...base, id: "4", type: "smartlink", title: "Apagado", artistName: "Caio Ventura", slug: "caio-apagado", createdAt: "2026-07-01T10:00:00Z", deletedAt: "2026-07-02T00:00:00Z" },
  { ...base, id: "5", type: "other", title: "Merch Drop", artistName: "Luna Reis", slug: "luna-merch", createdAt: "2026-06-01T10:00:00Z" },
  { ...base, id: "6", userId: "u2", type: "smartlink", title: "Outro Usuário", artistName: "Fulano", slug: "fulano", createdAt: "2026-05-01T10:00:00Z" },
];
