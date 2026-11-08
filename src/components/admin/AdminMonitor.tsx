import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { adminCopy } from '~/lib/admin/copy';
import type { AdminEventRow, AdminGenerationRow, AdminSummary, AdminTab, AdminUserRow } from '~/lib/admin/monitor';

function href(locale: string, tab: AdminTab, page = 1) {
  const base = locale === 'en' ? '/admin' : `/${locale}/admin`;
  const query = new URLSearchParams({ tab });
  if (page > 1) query.set('page', String(page));
  return `${base}?${query}`;
}

function when(value: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function person(email: string | null, guest: string) {
  return email?.trim() || guest;
}

export type AdminMonitorProps = {
  locale: string;
  tab: AdminTab;
  page: number;
  summary: AdminSummary;
  users: AdminUserRow[];
  generations: AdminGenerationRow[];
  events: AdminEventRow[];
  hasNext: boolean;
  onNavigate?: (tab: AdminTab, page: number) => void;
  refreshing?: boolean;
  refreshFailed?: boolean;
};

export function AdminMonitor({
  locale,
  tab,
  page,
  summary,
  users,
  generations,
  events,
  hasNext,
  onNavigate,
  refreshing = false,
  refreshFailed = false,
}: AdminMonitorProps) {
  const copy = adminCopy(locale);
  const reviewHref = locale === 'en' ? '/admin/review' : `/${locale}/admin/review`;
  const templatesHref = locale === 'en' ? '/admin/prompts' : `/${locale}/admin/prompts`;
  const tabs: AdminTab[] = ['users', 'generations', 'events'];
  const counts = [
    { label: copy.summaryUsers, value: summary.users },
    { label: copy.summarySpent, value: summary.spent },
    { label: copy.summaryGenerations, value: summary.generations },
    { label: copy.summaryEvents, value: summary.events },
  ];
  const rows = tab === 'users' ? users : tab === 'generations' ? generations : events;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="account" langPathSuffix="/admin" />
      <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text3)]">Open Prompts</p>
            <h1 className="mt-1 text-3xl font-semibold">{copy.title}</h1>
          </div>
          <div className="flex gap-4">
            <a href={templatesHref} className="text-sm text-[var(--text2)] underline-offset-4 hover:text-[var(--text)] hover:underline">{copy.templates}</a>
            <a href={reviewHref} className="text-sm text-[var(--text2)] underline-offset-4 hover:text-[var(--text)] hover:underline">{copy.review}</a>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {counts.map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="text-xs text-[var(--text3)]">{item.label}</div>
              <div className="mt-1 text-2xl font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
        <nav className="mt-6 flex gap-2" aria-label={copy.title}>
          {tabs.map((item) => (
            onNavigate ? (
              <button type="button" key={item} onClick={() => onNavigate(item, 1)} aria-current={tab === item ? 'page' : undefined} className={`rounded-full px-4 py-1.5 text-sm ${tab === item ? 'bg-[var(--amber)] text-[var(--bg)]' : 'border border-[var(--border)] text-[var(--text2)]'}`}>
                {copy[item]}
              </button>
            ) : (
              <a key={item} href={href(locale, item)} aria-current={tab === item ? 'page' : undefined} className={`rounded-full px-4 py-1.5 text-sm ${tab === item ? 'bg-[var(--amber)] text-[var(--bg)]' : 'border border-[var(--border)] text-[var(--text2)]'}`}>
                {copy[item]}
              </a>
            )
          ))}
        </nav>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            {tab === 'users' ? (
              <>
                <thead className="border-b border-[var(--border)] text-xs text-[var(--text3)]">
                  <tr><th className="px-4 py-3 font-medium">{copy.user}</th><th className="px-4 py-3 font-medium">{copy.type}</th><th className="px-4 py-3 font-medium">{copy.balance}</th><th className="px-4 py-3 font-medium">{copy.spent}</th><th className="px-4 py-3 font-medium">{copy.created}</th></tr>
                </thead>
                <tbody>
                  {users.map((row) => (
                    <tr key={row.ownerId} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3"><strong>{person(row.email, copy.guest)}</strong>{row.name && row.email ? <div className="text-xs text-[var(--text3)]">{row.name}</div> : null}</td>
                      <td className="px-4 py-3">{row.email ? copy.member : copy.guest}</td>
                      <td className="px-4 py-3">{copy.purchased} {row.purchasedBalance} · {copy.monthly} {row.monthlyBalance}</td>
                      <td className="px-4 py-3">{row.spent}</td>
                      <td className="px-4 py-3">{when(row.createdAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : null}
            {tab === 'generations' ? (
              <>
                <thead className="border-b border-[var(--border)] text-xs text-[var(--text3)]">
                  <tr><th className="px-4 py-3 font-medium">{copy.user}</th><th className="px-4 py-3 font-medium">{copy.model}</th><th className="px-4 py-3 font-medium">{copy.credits}</th><th className="px-4 py-3 font-medium">{copy.status}</th><th className="px-4 py-3 font-medium">{copy.created}</th></tr>
                </thead>
                <tbody>
                  {generations.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3">{person(row.email, copy.guest)}</td>
                      <td className="px-4 py-3">{row.model}</td>
                      <td className="px-4 py-3">{row.credits}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">{when(row.createdAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : null}
            {tab === 'events' ? (
              <>
                <thead className="border-b border-[var(--border)] text-xs text-[var(--text3)]">
                  <tr><th className="px-4 py-3 font-medium">{copy.plan}</th><th className="px-4 py-3 font-medium">{copy.user}</th><th className="px-4 py-3 font-medium">{copy.page}</th><th className="px-4 py-3 font-medium">{copy.created}</th></tr>
                </thead>
                <tbody>
                  {events.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3"><strong>{row.subject}</strong>{row.price ? <div className="text-xs text-[var(--text3)]">{row.price}</div> : null}</td>
                      <td className="px-4 py-3">{person(row.email, copy.guest)}</td>
                      <td className="px-4 py-3">{row.page}</td>
                      <td className="px-4 py-3">{when(row.createdAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : null}
          </table>
          {rows.length === 0 ? <div className="px-4 py-10 text-center text-sm text-[var(--text3)]">{copy.empty}</div> : null}
        </div>
        <div className="mt-2 min-h-5 text-xs text-[var(--text3)]" aria-live="polite">
          {refreshFailed ? 'Could not refresh. Showing the latest available data.' : refreshing ? 'Updating…' : null}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="text-[var(--text3)]">{copy.perPage}</span>
          {page > 1 ? (onNavigate ? <button type="button" onClick={() => onNavigate(tab, page - 1)}>{copy.previous}</button> : <a href={href(locale, tab, page - 1)}>{copy.previous}</a>) : <span className="text-[var(--text3)]">{copy.previous}</span>}
          <strong>{page}</strong>
          {hasNext ? (onNavigate ? <button type="button" onClick={() => onNavigate(tab, page + 1)}>{copy.next}</button> : <a href={href(locale, tab, page + 1)}>{copy.next}</a>) : <span className="text-[var(--text3)]">{copy.next}</span>}
        </div>
      </main>
      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
