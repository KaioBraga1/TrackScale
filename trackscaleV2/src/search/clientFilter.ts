/** Busca C do song.so: substring case-insensitive sobre vários campos unidos. */
export function filterByText<T>(
  items: T[],
  query: string,
  fields: (item: T) => Array<string | null | undefined>,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) =>
    fields(i)
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}
