/** 只改变列表请求，原图数组和详情内容保持原样；X medium 最长边 1200px。 */
export function galleryCoverUrl(source: string | undefined): string | undefined {
  if (!source) return source;
  try {
    const url = new URL(source);
    if (url.protocol === 'https:' && url.hostname === 'pbs.twimg.com' && url.pathname.startsWith('/media/')) {
      url.searchParams.set('name', 'medium');
      return url.toString();
    }
  } catch { /* data URI、本地路径及未知资源沿用原值。 */ }
  return source;
}
