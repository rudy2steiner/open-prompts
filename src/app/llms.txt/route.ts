import { llmsTxt } from '~/lib/geo/llms';

export function GET() {
  return new Response(llmsTxt(), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
