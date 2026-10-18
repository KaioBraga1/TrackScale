import type { Targeting } from "../meta/types";

const listOf = (items: string[], max: number, sep: string) =>
  items.length > max ? `${items.slice(0, max).join(sep)} +${items.length - max}` : items.join(sep);

/** Nome automático do conjunto: países | interesses | idade (+ gênero). */
export function adsetName(t: Targeting): string {
  const geo = t.countries.length ? listOf(t.countries.map((c) => c.id), 3, ",") : "—";
  const ints = t.interests.length ? listOf(t.interests.map((i) => i.name), 2, ", ") : "Amplo";
  const g = t.gender === "men" ? " H" : t.gender === "women" ? " M" : "";
  return `${geo} | ${ints} | ${t.ageMin}-${t.ageMax}${g}`;
}

export const campaignName = (artist: string, title: string) => `${artist} - ${title}`;
