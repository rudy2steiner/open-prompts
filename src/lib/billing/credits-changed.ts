export const CREDITS_CHANGED_EVENT = 'open-prompts:credits-changed';

export function notifyCreditsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}
