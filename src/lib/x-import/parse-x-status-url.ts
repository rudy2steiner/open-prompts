/** Match x.com / twitter.com status URLs; returns handle + numeric status id. */
export function parseXStatusUrl(raw: string): { screenName: string; statusId: string } | null {
  const u = raw.trim();
  const standard = u.match(
    /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,30})\/status(?:es)?\/(\d+)/i
  );
  if (standard) return { screenName: standard[1], statusId: standard[2] };

  const iStatus = u.match(
    /(?:https?:\/\/)?(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/i\/(?:web\/)?status\/(\d+)/i
  );
  if (iStatus) return { screenName: '_', statusId: iStatus[1] };

  return null;
}
