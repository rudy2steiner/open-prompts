'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ManageSubscriptionButton } from '~/components/billing/ManageSubscriptionButton';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { accountBillingCopy } from '~/lib/billing/account-copy';
import type { UserBillingSummary, UserBillingTab, UserCreditRow, UserGenerationRow, UserOrderRow } from '~/lib/billing/account-view';
import { createBillingPageCache, createLatestBillingRequest, type BillingPageData } from '~/lib/billing/client-cache';
import { localeApiPath } from '~/lib/locale-api-path';

function pageHref(locale: string, tab: UserBillingTab, page = 1) {
  const base = locale === 'en' ? '/billing' : `/${locale}/billing`;
  const query = new URLSearchParams({ tab });
  if (page > 1) query.set('page', String(page));
  return `${base}?${query}`;
}

function when(value: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

function money(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

export function AccountBilling({
  userId,
  locale,
  tab,
  page,
  summary,
  orders,
  credits,
  generations,
  hasNext,
}: {
  userId: string;
  locale: string;
  tab: UserBillingTab;
  page: number;
  summary: UserBillingSummary;
  orders: UserOrderRow[];
  credits: UserCreditRow[];
  generations: UserGenerationRow[];
  hasNext: boolean;
}) {
  const copy = accountBillingCopy(locale);
  const tabs: UserBillingTab[] = ['orders', 'credits', 'generations'];
  const cacheRef = useRef<ReturnType<typeof createBillingPageCache>>();
  if (!cacheRef.current) cacheRef.current = createBillingPageCache();
  const requestRef = useRef<ReturnType<typeof createLatestBillingRequest>>();
  if (!requestRef.current) requestRef.current = createLatestBillingRequest();
  const initialData: BillingPageData = { summary, orders, credits, generations, hasNext };
  const [activeTab, setActiveTab] = useState(tab);
  const [activePage, setActivePage] = useState(page);
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const userRef = useRef(userId);
  const seededRef = useRef(false);
  if (!seededRef.current) {
    cacheRef.current.write(userId, tab, page, initialData);
    seededRef.current = true;
  }

  useEffect(() => {
    if (userRef.current === userId) return;
    cacheRef.current?.clearForUser(userRef.current);
    userRef.current = userId;
  }, [userId]);

  const refresh = useCallback(async (nextTab: UserBillingTab, nextPage: number) => {
    const cached = cacheRef.current?.read(userId, nextTab, nextPage);
    if (cached) setData(cached);
    const generation = requestRef.current!.begin();
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const query = new URLSearchParams({ tab: nextTab, page: String(nextPage) });
      const response = await fetch(localeApiPath(locale, `/api/account/billing?${query}`), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as BillingPageData;
      if (!requestRef.current!.isCurrent(generation)) return;
      cacheRef.current?.write(userId, nextTab, nextPage, payload);
      setData(payload);
    } catch {
      if (requestRef.current!.isCurrent(generation)) setRefreshFailed(true);
    } finally {
      if (requestRef.current!.isCurrent(generation)) setRefreshing(false);
    }
  }, [locale, userId]);

  useEffect(() => {
    void refresh(activeTab, activePage);
  }, [activePage, activeTab, refresh]);

  const navigate = (nextTab: UserBillingTab, nextPage = 1) => {
    setActiveTab(nextTab);
    setActivePage(nextPage);
    window.history.replaceState(null, '', pageHref(locale, nextTab, nextPage));
  };

  const rows = activeTab === 'orders' ? data.orders : activeTab === 'credits' ? data.credits : data.generations;
  const empty = activeTab === 'orders' ? copy.emptyOrders : activeTab === 'credits' ? copy.emptyCredits : copy.emptyGenerations;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="account" langPathSuffix="/billing" />
      <main className="mx-auto w-full max-w-4xl px-5 py-10 md:px-6">
        <div>
          <h1 className="text-3xl font-semibold">{copy.title}</h1>
          <p className="mt-2 text-sm text-[var(--text3)]">{copy.description}</p>
        </div>
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div>
            <div className="text-xs text-[var(--text3)]">{copy.available}</div>
            <div className="mt-1 text-2xl font-semibold">{data.summary.usable}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--text3)]">
              {copy.monthly}: {data.summary.monthly}{data.summary.monthlyExpiresAt ? ` · ${when(data.summary.monthlyExpiresAt, locale)}` : ''}
              <br />
              {copy.purchased}: {data.summary.purchased}
            </p>
          </div>
          {data.summary.subscription ? <ManageSubscriptionButton label={copy.manage} /> : null}
        </section>
        <nav className="mt-6 flex gap-2" aria-label={copy.title} role="tablist">
          {tabs.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={activeTab === item} onClick={() => navigate(item)} className={`rounded-full px-4 py-1.5 text-sm ${activeTab === item ? 'bg-[var(--amber)] text-[var(--bg)]' : 'border border-[var(--border)] text-[var(--text2)]'}`}>
              {copy[item]}
            </button>
          ))}
        </nav>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          {rows.length === 0 ? <p className="px-4 py-10 text-center text-sm text-[var(--text3)]">{empty}</p> : (
            <table className="w-full min-w-[640px] text-left text-sm">
              {activeTab === 'orders' ? (
                <>
                  <thead className="border-b border-[var(--border)] text-xs text-[var(--text3)]"><tr><th className="px-4 py-3 font-medium">{copy.product}</th><th className="px-4 py-3 font-medium">{copy.cost}</th><th className="px-4 py-3 font-medium">{copy.amount}</th><th className="px-4 py-3 font-medium">{copy.status}</th><th className="px-4 py-3 font-medium">{copy.date}</th></tr></thead>
                  <tbody>{data.orders.map((row) => <tr key={row.orderNo} className="border-b border-[var(--border)] last:border-0"><td className="px-4 py-3">{row.productName}</td><td className="px-4 py-3">{row.credits}</td><td className="px-4 py-3">{money(row.amount, row.currency, locale)}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">{when(row.createdAt, locale)}</td></tr>)}</tbody>
                </>
              ) : null}
              {activeTab === 'credits' ? (
                <>
                  <thead className="border-b border-[var(--border)] text-xs text-[var(--text3)]"><tr><th className="px-4 py-3 font-medium">{copy.change}</th><th className="px-4 py-3 font-medium">{copy.balance}</th><th className="px-4 py-3 font-medium">{copy.date}</th></tr></thead>
                  <tbody>{data.credits.map((row) => <tr key={row.id} className="border-b border-[var(--border)] last:border-0"><td className="px-4 py-3">{copy.kinds[row.kind] ?? row.kind} {row.amount > 0 ? `+${row.amount}` : row.amount}</td><td className="px-4 py-3">{row.balanceAfter}</td><td className="px-4 py-3">{when(row.createdAt, locale)}</td></tr>)}</tbody>
                </>
              ) : null}
              {activeTab === 'generations' ? (
                <>
                  <thead className="border-b border-[var(--border)] text-xs text-[var(--text3)]"><tr><th className="px-4 py-3 font-medium">{copy.model}</th><th className="px-4 py-3 font-medium">{copy.cost}</th><th className="px-4 py-3 font-medium">{copy.status}</th><th className="px-4 py-3 font-medium">{copy.download}</th><th className="px-4 py-3 font-medium">{copy.date}</th></tr></thead>
                  <tbody>{data.generations.map((row) => <tr key={row.id} className="border-b border-[var(--border)] last:border-0"><td className="px-4 py-3">{row.model}</td><td className="px-4 py-3">{row.credits}</td><td className="px-4 py-3">{row.status}</td><td className="px-4 py-3">{row.status === 'succeeded' ? row.images.map((_, index) => <a key={index} className="mr-2 underline" href={`/api/generations/${row.id}/images/${index}`} download>{copy.download}</a>) : '—'}</td><td className="px-4 py-3">{when(row.createdAt, locale)}</td></tr>)}</tbody>
                </>
              ) : null}
            </table>
          )}
        </div>
        <div className="mt-2 min-h-5 text-xs text-[var(--text3)]" aria-live="polite">
          {refreshFailed ? 'Could not refresh. Showing the latest available data.' : refreshing ? 'Updating…' : null}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="text-[var(--text3)]">{copy.page} {activePage}</span>
          {activePage > 1 ? <button type="button" onClick={() => navigate(activeTab, activePage - 1)}>{copy.previous}</button> : <span className="text-[var(--text3)]">{copy.previous}</span>}
          {data.hasNext ? <button type="button" onClick={() => navigate(activeTab, activePage + 1)}>{copy.next}</button> : <span className="text-[var(--text3)]">{copy.next}</span>}
        </div>
      </main>
      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
