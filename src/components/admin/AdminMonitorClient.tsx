'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminMonitor } from './AdminMonitor';
import { createAdminMonitorCache, createLatestAdminRequest, type AdminMonitorData } from '~/lib/admin/client-cache';
import type { AdminTab } from '~/lib/admin/monitor';
import { localeApiPath } from '~/lib/locale-api-path';

export function AdminMonitorClient({
  locale,
  initialTab,
  initialPage,
  initialData,
}: {
  locale: string;
  initialTab: AdminTab;
  initialPage: number;
  initialData: AdminMonitorData;
}) {
  const cacheRef = useRef<ReturnType<typeof createAdminMonitorCache>>();
  if (!cacheRef.current) cacheRef.current = createAdminMonitorCache();
  const requestRef = useRef<ReturnType<typeof createLatestAdminRequest>>();
  if (!requestRef.current) requestRef.current = createLatestAdminRequest();
  const seededRef = useRef(false);
  if (!seededRef.current) {
    cacheRef.current.write(initialTab, initialPage, initialData);
    seededRef.current = true;
  }
  const [tab, setTab] = useState(initialTab);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const refresh = useCallback(async (nextTab: AdminTab, nextPage: number) => {
    const cached = cacheRef.current?.read(nextTab, nextPage);
    if (cached) setData(cached);
    const generation = requestRef.current!.begin();
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const query = new URLSearchParams({ tab: nextTab, page: String(nextPage) });
      const response = await fetch(localeApiPath(locale, `/api/admin/monitor?${query}`), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as AdminMonitorData;
      if (!requestRef.current!.isCurrent(generation)) return;
      cacheRef.current?.write(nextTab, nextPage, payload);
      setData(payload);
    } catch {
      if (requestRef.current!.isCurrent(generation)) setRefreshFailed(true);
    } finally {
      if (requestRef.current!.isCurrent(generation)) setRefreshing(false);
    }
  }, [locale]);

  useEffect(() => {
    void refresh(tab, page);
  }, [page, refresh, tab]);

  const navigate = (nextTab: AdminTab, nextPage: number) => {
    setTab(nextTab);
    setPage(nextPage);
    const base = locale === 'en' ? '/admin' : `/${locale}/admin`;
    const query = new URLSearchParams({ tab: nextTab });
    if (nextPage > 1) query.set('page', String(nextPage));
    window.history.replaceState(null, '', `${base}?${query}`);
  };

  return <AdminMonitor
    locale={locale}
    tab={tab}
    page={page}
    {...data}
    onNavigate={navigate}
    refreshing={refreshing}
    refreshFailed={refreshFailed}
  />;
}
