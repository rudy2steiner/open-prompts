import { llmsFullTxt } from '~/lib/geo/llms';

export function GET() {
  return new Response(llmsFullTxt(), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
