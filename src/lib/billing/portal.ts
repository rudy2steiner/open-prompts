export async function createPortalLink(input: {
  customerId: string | null;
  returnUrl: string;
  createSession: (customerId: string, returnUrl: string) => Promise<string>;
}): Promise<{ url: string } | 'rejected'> {
  if (!input.customerId) return 'rejected';
  return { url: await input.createSession(input.customerId, input.returnUrl) };
}
