import { handleAnalyticsEvent } from '~/lib/analytics/record';

export async function POST(request: Request): Promise<Response> {
  return handleAnalyticsEvent(request);
}
