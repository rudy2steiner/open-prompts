import type { MotionSort } from '~/lib/motion/types';
import { getMotionPage } from '~/lib/motion/catalog';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = params.get('sort');
  const sort: MotionSort = value === 'stars' || value === 'curated' ? value : 'likes';
  return Response.json(getMotionPage({ sort, category: params.get('category') || 'all', model: params.get('model') || 'all', offset: Number(params.get('offset') || 0) }), {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=3600' },
  });
}
