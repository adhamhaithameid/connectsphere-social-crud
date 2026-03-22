export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function splitSearchTokens(query: string | null | undefined): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return [];
  }

  return normalized.split(" ");
}

export function matchesSearchQuery(
  values: Array<string | null | undefined>,
  query: string | null | undefined
): boolean {
  const tokens = splitSearchTokens(query);

  if (tokens.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(values.filter((value): value is string => Boolean(value)).join(" "));
  if (!haystack) {
    return false;
  }

  return tokens.every((token) => haystack.includes(token));
}
