import { describe, expect, it } from "vitest";
import { MOCK_RELEASES } from "../data/mock";
import { filterByText } from "./clientFilter";
import { createInMemoryRepository, recentReleases, searchReleases } from "./releaseSearch";
import { sanitizeTerm } from "./sanitizeTerm";

describe("sanitizeTerm", () => {
  it("troca , ( ) % por espaço", () => {
    expect(sanitizeTerm("a,b(c)d%e")).toBe("a b c d e");
  });
  it("extrai o slug de uma URL colada", () => {
    expect(sanitizeTerm("https://song.so/meu-slug?utm=x")).toBe("meu-slug");
    expect(sanitizeTerm("song.so/meu-slug/extra")).toBe("meu-slug");
  });
  it("mantém texto comum", () => {
    expect(sanitizeTerm("  Luna Reis ")).toBe("Luna Reis");
  });
});

describe("searchReleases", () => {
  const repo = createInMemoryRepository(MOCK_RELEASES);

  it("busca em título, artista e slug, ordenado por mais recente", async () => {
    const r = await searchReleases(repo, "u1", "luna");
    expect(r.map((x) => x.id)).toEqual(["1", "3"]);
  });
  it("ignora deletados, outros tipos e outros usuários", async () => {
    const ids = (await recentReleases(repo, "u1")).map((x) => x.id);
    expect(ids).toEqual(["1", "2", "3"]);
  });
  it("aceita URL colada", async () => {
    const r = await searchReleases(repo, "u1", "https://trackscale.app/caio-mare-alta");
    expect(r.map((x) => x.id)).toEqual(["2"]);
  });
});

describe("filterByText", () => {
  const items = [{ n: "Alpha", s: "ACTIVE" }, { n: "Beta", s: "PAUSED" }];
  it("filtra por substring em vários campos", () => {
    expect(filterByText(items, "paus", (i) => [i.n, i.s])).toEqual([items[1]]);
  });
  it("sem termo devolve tudo", () => {
    expect(filterByText(items, "  ", (i) => [i.n])).toEqual(items);
  });
});
