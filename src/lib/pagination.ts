export function readPagination(url: string, defaultLimit = 20) {
  const params = new URL(url).searchParams;
  const limit = params.has('limit') ? Number(params.get('limit')) : defaultLimit;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isSafeInteger(offset) || offset < 0) return null;
  return { limit, offset };
}
