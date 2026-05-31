'use client';

import './account-page.css';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  accountPanelHref,
  type ResolvedAccountPanel,
} from '~/lib/account/account-path';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { resolveUserAvatarUrl } from '~/lib/auth/default-user-avatar';
import { localeApiPath } from '~/lib/locale-api-path';
import {
  PromptTemplateDetailDialog,
  templateRecordToDetailItem,
  type PromptDetailItem,
} from '~/components/prompt-gallery/PromptTemplateDetailDialog';
import type { AdminTemplateRecord, TemplateRecord } from '~/lib/prompts/template-types';
import type { AdminUserDetail, AdminUserSummary } from '~/lib/users/admin-user-record';
import {
  ADMIN_USER_TREND_RANGES,
  type DailyCountPoint,
  type AdminUserTrendRange,
} from '~/lib/users/admin-user-trend';
import { submitEditorHref } from '~/lib/prompts/submit-editor-path';

type Panel = ResolvedAccountPanel;

type Props = {
  locale: string;
  isAdmin: boolean;
  initialPanel: Panel;
  user: { id: string; email: string; name: string | null; image: string | null };
  initialAdmin?: {
    items: AdminTemplateRecord[];
    total: number | null;
    hasMore: boolean;
    pendingCount: number;
    promptsDailyTrend: DailyCountPoint[];
  } | null;
};

function homeHref(locale: string) {
  return locale === 'en' ? '/' : `/${locale}`;
}

function formatJoinedAt(iso: string, locale: string): string {
  const tag = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';
  return new Date(iso).toLocaleString(tag, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatReviewDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const tag = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';
  return d.toLocaleDateString(tag, { month: '2-digit', day: '2-digit' });
}

function formatProviderLabels(providers: string[]): string {
  return providers
    .map((p) => (p === 'github' ? 'GitHub' : p === 'google' ? 'Google' : p))
    .join(', ');
}

function trendDayLabel(date: string, locale: string): string {
  const tag = locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';
  return new Date(`${date}T12:00:00.000Z`).toLocaleDateString(tag, {
    month: 'numeric',
    day: 'numeric',
  });
}

function smoothTrendPath(coords: { x: number; y: number }[], tension = 0.35): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  if (coords.length === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(i - 1, 0)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(i + 2, coords.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function parseAdminUserStats(raw: Record<string, unknown>): {
  totalUsers: number;
  activeToday: number;
  newToday: number;
  usersDailyTrend: DailyCountPoint[];
} | null {
  const s = (raw.stats ?? raw) as Record<string, unknown>;
  const totalRaw = s.totalUsers;
  if (totalRaw == null || totalRaw === '') return null;
  const totalUsers = Number(totalRaw);
  if (!Number.isFinite(totalUsers)) return null;

  let usersDailyTrend: DailyCountPoint[] = [];
  if (Array.isArray(s.usersDailyTrend)) {
    usersDailyTrend = s.usersDailyTrend as DailyCountPoint[];
  } else if (Array.isArray(s.dailyTrend)) {
    usersDailyTrend = (s.dailyTrend as { date: string; newUsers?: number; count?: number }[]).map(
      (p) => ({ date: p.date, count: Number(p.newUsers ?? p.count ?? 0) }),
    );
  }

  return {
    totalUsers,
    activeToday: Number(s.activeToday ?? 0),
    newToday: Number(s.newToday ?? 0),
    usersDailyTrend,
  };
}


type DisplayStatusKey = 'pub' | 'draft' | 'priv' | 'pending' | 'rejected';

/** UI badge: review `status` + `visibility` (see resolveStatusForVisibility on create). */
function displayStatus(item: TemplateRecord): DisplayStatusKey {
  if (item.status === 'rejected') return 'rejected';
  if (item.status === 'pending') return 'pending';
  if (item.visibility === 'draft') return 'draft';
  if (item.visibility === 'private') return 'priv';
  return 'pub';
}

export default function PageComponent({ locale, isAdmin, initialPanel, user, initialAdmin }: Props) {
  const t = useTranslations('OpenPrompts.accountPage');
  const router = useRouter();
  const adminLoadGen = useRef(0);
  const adminItemsCountRef = useRef(initialAdmin?.items.length ?? 0);
  const adminPrefetchedRef = useRef(Boolean(initialAdmin?.items.length));

  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [adminItems, setAdminItems] = useState<AdminTemplateRecord[]>(initialAdmin?.items ?? []);
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [myPendingCount, setMyPendingCount] = useState<number | null>(null);
  const [adminPendingCount, setAdminPendingCount] = useState<number | null>(
    initialAdmin?.pendingCount ?? null,
  );
  const [myLoading, setMyLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [myStatusFilter, setMyStatusFilter] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(20);
  const [adminTotal, setAdminTotal] = useState<number | null>(initialAdmin?.total ?? null);
  const [adminHasMore, setAdminHasMore] = useState(initialAdmin?.hasMore ?? false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLoadError, setAdminLoadError] = useState<string | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<Set<number>>(() => new Set());
  const [bulkReviewBusy, setBulkReviewBusy] = useState(false);
  const [userItems, setUserItems] = useState<AdminUserSummary[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(20);
  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [usersPlatformTotal, setUsersPlatformTotal] = useState<number | null>(null);
  const [usersActiveToday, setUsersActiveToday] = useState<number | null>(null);
  const [usersNewToday, setUsersNewToday] = useState<number | null>(null);
  const [usersDailyTrend, setUsersDailyTrend] = useState<DailyCountPoint[]>([]);
  const [usersTrendDays, setUsersTrendDays] = useState<AdminUserTrendRange>(30);
  const [adminPromptsDailyTrend, setAdminPromptsDailyTrend] = useState<DailyCountPoint[]>(
    initialAdmin?.promptsDailyTrend ?? [],
  );
  const [adminTrendDays, setAdminTrendDays] = useState<AdminUserTrendRange>(30);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);

  const ADMIN_PAGE_SIZES = [10, 20, 50, 100] as const;
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PromptDetailItem | null>(null);
  const [detailMeta, setDetailMeta] = useState<{
    statusKey: DisplayStatusKey;
    owner?: string | null;
    admin?: boolean;
    source?: TemplateRecord | AdminTemplateRecord;
  } | null>(null);

  const statusLabel = (key: DisplayStatusKey) => t(`status.${key}`);

  useEffect(() => {
    adminItemsCountRef.current = adminItems.length;
  }, [adminItems.length]);

  const navigatePanel = (next: Panel) => {
    if (next === 'admin-denied') return;
    router.push(accountPanelHref(locale, next), { scroll: false });
  };

  useEffect(() => {
    setPanel(initialPanel);
  }, [initialPanel]);

  const panelTitle = useMemo(() => {
    const map: Record<Panel, string> = {
      overview: t('panels.overview'),
      prompts: t('panels.prompts'),
      admin: t('panels.admin'),
      'admin-denied': t('admin.forbiddenTitle'),
      users: t('panels.users'),
      credits: t('panels.credits'),
      subscription: t('panels.subscription'),
    };
    return map[panel];
  }, [panel, t]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(localeApiPath(locale, '/api/my/templates/stats'), { cache: 'no-store' });
      if (!res.ok) {
        setTemplateCount(null);
        setMyPendingCount(null);
        return;
      }
      const data = (await res.json()) as { templateCount?: number; pendingCount?: number };
      setTemplateCount(typeof data.templateCount === 'number' ? data.templateCount : 0);
      setMyPendingCount(typeof data.pendingCount === 'number' ? data.pendingCount : 0);
    } catch {
      setTemplateCount(null);
      setMyPendingCount(null);
    }
  }, [locale]);

  const loadMyTemplates = useCallback(async () => {
    setMyLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set('q', search.trim());
      if (myStatusFilter) q.set('status', myStatusFilter);
      q.set('limit', '50');
      const res = await fetch(localeApiPath(locale, `/api/my/templates?${q}`), { cache: 'no-store' });
      const data = (await res.json()) as { items?: TemplateRecord[] };
      if (res.ok) setTemplates(data.items ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setMyLoading(false);
    }
  }, [locale, search, myStatusFilter]);

  const loadAdminTemplates = useCallback(async () => {
    const gen = ++adminLoadGen.current;
    setAdminLoading(true);
    setAdminLoadError(null);

    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), 60_000);

    try {
      const q = new URLSearchParams();
      if (adminSearch.trim()) q.set('q', adminSearch.trim());
      if (adminStatusFilter) q.set('status', adminStatusFilter);
      q.set('limit', String(adminPageSize));
      q.set('offset', String((adminPage - 1) * adminPageSize));
      q.set('trendDays', String(adminTrendDays));
      const res = await fetch(localeApiPath(locale, `/api/admin/templates?${q}`), {
        cache: 'no-store',
        signal: ac.signal,
      });
      const data = (await res.json()) as {
        items?: AdminTemplateRecord[];
        total?: number | null;
        hasMore?: boolean;
        pendingCount?: number;
        promptsDailyTrend?: DailyCountPoint[];
        error?: string;
      };
      if (gen !== adminLoadGen.current) return;
      if (res.ok) {
        setAdminItems(data.items ?? []);
        setAdminTotal(typeof data.total === 'number' ? data.total : null);
        setAdminHasMore(Boolean(data.hasMore));
        if (typeof data.pendingCount === 'number') setAdminPendingCount(data.pendingCount);
        setAdminPromptsDailyTrend(
          Array.isArray(data.promptsDailyTrend) ? data.promptsDailyTrend : [],
        );
      } else {
        if (res.status === 403) {
          setAdminLoadError(t('admin.forbiddenBody', { email: user.email || '—' }));
        } else {
          setAdminLoadError(data.error ?? `HTTP ${res.status}`);
        }
        if (!adminItemsCountRef.current) {
          setAdminItems([]);
          setAdminTotal(null);
          setAdminHasMore(false);
          setAdminPromptsDailyTrend([]);
        }
      }
    } catch (e: unknown) {
      if (gen !== adminLoadGen.current) return;
      if (e instanceof DOMException && e.name === 'AbortError') {
        if (!adminItemsCountRef.current) {
          setAdminLoadError(t('admin.loadTimeout'));
        }
        return;
      }
      const msg = e instanceof Error ? e.message : 'Network error';
      setAdminLoadError(msg);
      if (!adminItemsCountRef.current) {
        setAdminItems([]);
        setAdminTotal(null);
        setAdminHasMore(false);
        setAdminPromptsDailyTrend([]);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (gen === adminLoadGen.current) setAdminLoading(false);
    }
  }, [locale, adminSearch, adminStatusFilter, adminPage, adminPageSize, adminTrendDays, user.email]);

  const loadAdminUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersLoadError(null);

    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), 25_000);

    try {
      const q = new URLSearchParams();
      if (usersSearch.trim()) q.set('q', usersSearch.trim());
      q.set('limit', String(usersPageSize));
      q.set('offset', String((usersPage - 1) * usersPageSize));
      q.set('trendDays', String(usersTrendDays));
      const res = await fetch(localeApiPath(locale, `/api/admin/users?${q}`), {
        cache: 'no-store',
        signal: ac.signal,
      });
      const data = (await res.json()) as Record<string, unknown> & {
        items?: AdminUserSummary[];
        total?: number;
        hasMore?: boolean;
        error?: string;
      };
      if (res.ok) {
        setUserItems(data.items ?? []);
        setUsersTotal(typeof data.total === 'number' ? data.total : null);
        setUsersHasMore(Boolean(data.hasMore));
        const parsedStats = parseAdminUserStats(data);
        if (parsedStats) {
          setUsersPlatformTotal(parsedStats.totalUsers);
          setUsersActiveToday(parsedStats.activeToday);
          setUsersNewToday(parsedStats.newToday);
          setUsersDailyTrend(parsedStats.usersDailyTrend);
        }
      } else {
        setUserItems([]);
        setUsersTotal(null);
        setUsersPlatformTotal(null);
        setUsersActiveToday(null);
        setUsersNewToday(null);
        setUsersDailyTrend([]);
        setUsersHasMore(false);
        setUsersLoadError(data.error ?? `HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      setUserItems([]);
      setUsersTotal(null);
      setUsersPlatformTotal(null);
      setUsersActiveToday(null);
      setUsersNewToday(null);
      setUsersDailyTrend([]);
      setUsersHasMore(false);
      const msg = e instanceof Error ? e.message : 'Network error';
      setUsersLoadError(
        e instanceof DOMException && e.name === 'AbortError' ? t('adminUsers.loadTimeout') : msg,
      );
    } finally {
      window.clearTimeout(timeoutId);
      setUsersLoading(false);
    }
  }, [locale, usersSearch, usersPage, usersPageSize, usersTrendDays, t]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch, adminStatusFilter, adminPageSize, adminTrendDays]);

  useEffect(() => {
    setUsersPage(1);
  }, [usersSearch, usersPageSize, usersTrendDays]);

  useEffect(() => {
    if (panel === 'overview') void loadStats();
  }, [panel, loadStats]);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      try {
        const res = await fetch(localeApiPath(locale, '/api/admin/templates?limit=1'), { cache: 'no-store' });
        const data = (await res.json()) as { pendingCount?: number };
        if (res.ok && typeof data.pendingCount === 'number') setAdminPendingCount(data.pendingCount);
      } catch {
        /* optional nav badge */
      }
    })();
  }, [isAdmin, locale]);

  useEffect(() => {
    if (panel === 'prompts') void loadMyTemplates();
  }, [panel, loadMyTemplates]);

  useEffect(() => {
    if (panel !== 'admin' || !isAdmin) return;
    if (adminPrefetchedRef.current) {
      adminPrefetchedRef.current = false;
      return;
    }
    void loadAdminTemplates();
  }, [panel, isAdmin, loadAdminTemplates]);

  useEffect(() => {
    setSelectedAdminIds(new Set());
  }, [adminPage, adminPageSize, adminStatusFilter, adminSearch]);

  useEffect(() => {
    if (panel === 'users' && isAdmin) void loadAdminUsers();
  }, [panel, isAdmin, loadAdminUsers]);

  const openEdit = (item: TemplateRecord) => {
    router.push(submitEditorHref(locale, { editId: item.id }));
  };

  const openDetail = (
    item: TemplateRecord | AdminTemplateRecord,
    opts: { admin?: boolean },
  ) => {
    const owner =
      opts.admin && 'submitterEmail' in item
        ? item.submitterEmail ?? t('table.ownerAnonymous')
        : null;
    setDetailItem(templateRecordToDetailItem(item));
    setDetailMeta({
      statusKey: displayStatus(item),
      owner,
      admin: opts.admin,
      source: item,
    });
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
    setDetailMeta(null);
  };

  const removeTemplate = async (id: number) => {
    if (!window.confirm(t('table.confirmDelete'))) return;
    await fetch(localeApiPath(locale, `/api/my/templates/${id}`), { method: 'DELETE' });
    void loadMyTemplates();
    void loadStats();
  };

  const review = async (id: number, status: 'approved' | 'rejected') => {
    await fetch(localeApiPath(locale, `/api/admin/templates/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSelectedAdminIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    void loadAdminTemplates();
    void loadStats();
  };

  const bulkReview = async (status: 'approved' | 'rejected') => {
    const ids = Array.from(selectedAdminIds);
    if (!ids.length) return;
    const confirmKey = status === 'approved' ? 'admin.bulkConfirmApprove' : 'admin.bulkConfirmReject';
    if (!window.confirm(t(confirmKey, { count: ids.length }))) return;

    setBulkReviewBusy(true);
    try {
      const res = await fetch(localeApiPath(locale, '/api/admin/templates/bulk'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      if (res.ok) {
        setSelectedAdminIds(new Set());
        void loadAdminTemplates();
        void loadStats();
      }
    } finally {
      setBulkReviewBusy(false);
    }
  };

  const toggleAdminSelection = (id: number) => {
    setSelectedAdminIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAdminSelectAll = (items: AdminTemplateRecord[]) => {
    const pageIds = items.map((item) => item.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedAdminIds.has(id));
    setSelectedAdminIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const adminTotalPages =
    adminTotal != null && adminTotal >= 0 ? Math.max(1, Math.ceil(adminTotal / adminPageSize)) : null;

  const openUserDetail = async (summary: AdminUserSummary) => {
    setUserDetailOpen(true);
    setUserDetail(null);
    setUserDetailError(null);
    setUserDetailLoading(true);
    try {
      const res = await fetch(localeApiPath(locale, `/api/admin/users/${summary.id}`), {
        cache: 'no-store',
      });
      const data = (await res.json()) as { item?: AdminUserDetail; error?: string };
      if (res.ok && data.item) {
        setUserDetail(data.item);
      } else {
        setUserDetailError(data.error ?? `HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      setUserDetailError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setUserDetailLoading(false);
    }
  };

  const closeUserDetail = () => {
    setUserDetailOpen(false);
    setUserDetail(null);
    setUserDetailError(null);
  };

  const renderPagination = (opts: {
    page: number;
    setPage: (fn: (p: number) => number) => void;
    pageSize: number;
    setPageSize: (n: number) => void;
    total: number | null;
    hasMore: boolean;
    loading: boolean;
  }) => {
    const totalPages =
      opts.total != null && opts.total >= 0 ? Math.max(1, Math.ceil(opts.total / opts.pageSize)) : null;
    const canPrev = opts.page > 1;
    const canNext = totalPages != null ? opts.page < totalPages : opts.hasMore;

    return (
      <div className="op-account-pagination">
        <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
          <span>{t('admin.pagination.pageSize')}</span>
          <select
            className="op-account-select"
            value={opts.pageSize}
            onChange={(e) => opts.setPageSize(Number(e.target.value))}
            disabled={opts.loading}
          >
            {ADMIN_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-[var(--text3)]">
          {opts.total != null
            ? t('admin.pagination.total', { count: opts.total })
            : t('admin.pagination.totalUnknown')}
          {' · '}
          {totalPages != null
            ? t('admin.pagination.pageOf', { page: opts.page, total: totalPages })
            : t('admin.pagination.pageOnly', { page: opts.page })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="op-account-btn"
            disabled={!canPrev || opts.loading}
            onClick={() => opts.setPage((p) => Math.max(1, p - 1))}
          >
            {t('admin.pagination.prev')}
          </button>
          <button
            type="button"
            className="op-account-btn"
            disabled={!canNext || opts.loading}
            onClick={() => opts.setPage((p) => p + 1)}
          >
            {t('admin.pagination.next')}
          </button>
        </div>
      </div>
    );
  };

  const renderAdminPagination = () =>
    renderPagination({
      page: adminPage,
      setPage: setAdminPage,
      pageSize: adminPageSize,
      setPageSize: setAdminPageSize,
      total: adminTotal,
      hasMore: adminHasMore,
      loading: adminLoading,
    });

  const renderUsersPagination = () =>
    renderPagination({
      page: usersPage,
      setPage: setUsersPage,
      pageSize: usersPageSize,
      setPageSize: setUsersPageSize,
      total: usersTotal,
      hasMore: usersHasMore,
      loading: usersLoading,
    });

  const renderTrendLineChart = (title: string, points: DailyCountPoint[]) => {
    const W = 320;
    const H = 120;
    const pad = { top: 12, right: 8, bottom: 22, left: 8 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const values = points.map((p) => p.count);
    const max = Math.max(1, ...values);
    const n = points.length;

    const coords = points.map((p, i) => {
      const x = pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = pad.top + innerH - (p.count / max) * innerH;
      return { x, y, p, v: p.count };
    });

    const linePath = smoothTrendPath(coords);
    const labelStep = n <= 7 ? 1 : n <= 31 ? Math.ceil(n / 6) : Math.ceil(n / 5);
    const labelIndices = new Set<number>();
    labelIndices.add(0);
    labelIndices.add(n - 1);
    for (let i = labelStep; i < n - 1; i += labelStep) labelIndices.add(i);

    return (
      <div className="op-account-trend-card">
        <div className="op-account-trend-title">{title}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="op-account-trend-line-svg"
          role="img"
          aria-label={title}
        >
          <line
            x1={pad.left}
            y1={pad.top + innerH}
            x2={pad.left + innerW}
            y2={pad.top + innerH}
            className="op-account-trend-axis"
          />
          {coords.length > 1 ? (
            <path d={linePath} className="op-account-trend-line" fill="none" />
          ) : null}
          {coords.map(({ x, y, p, v }, i) => (
            <g key={p.date}>
              <circle cx={x} cy={y} r={n > 31 ? 2 : 3} className="op-account-trend-dot">
                <title>{`${p.date}: ${v}`}</title>
              </circle>
              {labelIndices.has(i) ? (
                <text
                  x={x}
                  y={H - 4}
                  textAnchor="middle"
                  className="op-account-trend-xlabel"
                >
                  {trendDayLabel(p.date, locale)}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderDailyTrendPanel = (opts: {
    points: DailyCountPoint[];
    loading: boolean;
    trendDays: AdminUserTrendRange;
    setTrendDays: (d: AdminUserTrendRange) => void;
    hintKey: 'adminUsers.trendDaysHint' | 'admin.trendDaysHint';
    titleKey: 'adminUsers.trendUsersTitle' | 'admin.trendPromptsTitle';
  }) => {
    if (!opts.points.length && opts.loading) {
      return <div className="op-account-empty mb-4 text-sm">{t('loading')}</div>;
    }
    if (!opts.points.length) return null;
    return (
      <div className="mb-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-[var(--text3)]">{t(opts.hintKey)}</p>
          <div className="flex gap-1">
            {ADMIN_USER_TREND_RANGES.map((d) => (
              <button
                key={d}
                type="button"
                className={`op-account-trend-range-btn${opts.trendDays === d ? ' active' : ''}`}
                onClick={() => opts.setTrendDays(d)}
              >
                {t(
                  d === 7
                    ? 'adminUsers.trendRange7'
                    : d === 30
                      ? 'adminUsers.trendRange30'
                      : 'adminUsers.trendRange90',
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="op-account-trend-grid op-account-trend-grid-single">
          {renderTrendLineChart(t(opts.titleKey), opts.points)}
        </div>
      </div>
    );
  };

  const renderUsersDailyTrend = () =>
    renderDailyTrendPanel({
      points: usersDailyTrend,
      loading: usersLoading,
      trendDays: usersTrendDays,
      setTrendDays: setUsersTrendDays,
      hintKey: 'adminUsers.trendDaysHint',
      titleKey: 'adminUsers.trendUsersTitle',
    });

  const renderAdminPromptsTrend = () =>
    renderDailyTrendPanel({
      points: adminPromptsDailyTrend,
      loading: adminLoading,
      trendDays: adminTrendDays,
      setTrendDays: setAdminTrendDays,
      hintKey: 'admin.trendDaysHint',
      titleKey: 'admin.trendPromptsTitle',
    });

  const renderUsersTable = () => {
    if (usersLoading) return <div className="op-account-empty">{t('loading')}</div>;
    if (!userItems.length) {
      return <div className="op-account-empty">{t('adminUsers.empty')}</div>;
    }

    return (
      <div className="op-account-card op-account-table-wrap">
        <table className="op-account-table">
          <thead>
            <tr>
              <th>{t('adminUsers.colUser')}</th>
              <th>{t('adminUsers.colRole')}</th>
              <th>{t('adminUsers.colProvider')}</th>
              <th>{t('adminUsers.colJoined')}</th>
              <th className="op-account-th-actions">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {userItems.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer"
                onClick={() => void openUserDetail(item)}
              >
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="op-account-avatar h-8 w-8 shrink-0 overflow-hidden rounded-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveUserAvatarUrl(item.image, item.email || item.id)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--text)]">
                        {item.name || item.email}
                      </div>
                      <div className="truncate text-[10px] text-[var(--text3)]">{item.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {item.isEnvAdmin ? (
                    <span className="op-account-status pub">{t('adminUsers.envAdmin')}</span>
                  ) : (
                    <span className="text-[11px] text-[var(--text3)]">{t('adminUsers.member')}</span>
                  )}
                </td>
                <td className="text-[11px] text-[var(--text3)]">
                  {item.providers.length
                    ? formatProviderLabels(item.providers)
                    : t('adminUsers.providerEmail')}
                </td>
                <td className="text-[11px] text-[var(--text3)]">
                  {formatJoinedAt(item.createdAt, locale)}
                </td>
                <td className="op-account-td-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="op-account-row-actions">
                    <button
                      type="button"
                      className="op-account-row-btn"
                      onClick={() => void openUserDetail(item)}
                    >
                      {t('table.view')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTable = (
    items: TemplateRecord[] | AdminTemplateRecord[],
    opts: {
      admin?: boolean;
      emptyMessage?: string;
      loading?: boolean;
      selection?: {
        selected: Set<number>;
        onToggle: (id: number) => void;
        onToggleAll: (items: AdminTemplateRecord[]) => void;
      };
    },
  ) => {
    const openRowDetail = (item: TemplateRecord | AdminTemplateRecord) =>
      openDetail(item, { admin: opts.admin });
    const tableLoading =
      opts.admin === true ? opts.loading === true : opts.loading !== undefined ? opts.loading : myLoading;
    if (tableLoading) return <div className="op-account-empty">{t('loading')}</div>;
    if (!items.length) {
      const emptyMsg =
        opts.emptyMessage ??
        (opts.admin ? t('admin.empty') : t('table.empty'));
      return <div className="op-account-empty">{emptyMsg}</div>;
    }

    const adminItemsOnPage = opts.admin ? (items as AdminTemplateRecord[]) : [];
    const pageIds = adminItemsOnPage.map((item) => item.id);
    const allPageSelected =
      opts.selection && pageIds.length > 0 && pageIds.every((id) => opts.selection!.selected.has(id));
    const somePageSelected =
      opts.selection && pageIds.some((id) => opts.selection!.selected.has(id));
    const isReviewQueue = Boolean(opts.admin && opts.selection);

    const renderAdminActions = (item: TemplateRecord | AdminTemplateRecord) => (
      <div className="op-account-row-actions">
        <button type="button" className="op-account-row-btn" onClick={() => openRowDetail(item)}>
          {t('table.view')}
        </button>
        {item.status === 'pending' ? (
          <>
            <button
              type="button"
              className="op-account-row-btn approve"
              onClick={() => void review(item.id, 'approved')}
            >
              {t('table.approve')}
            </button>
            <button
              type="button"
              className="op-account-row-btn reject"
              onClick={() => void review(item.id, 'rejected')}
            >
              {t('table.reject')}
            </button>
          </>
        ) : null}
        {item.status === 'approved' ? (
          <button
            type="button"
            className="op-account-row-btn reject"
            onClick={() => void review(item.id, 'rejected')}
          >
            {t('table.revoke')}
          </button>
        ) : null}
        {item.status === 'rejected' ? (
          <button
            type="button"
            className="op-account-row-btn approve"
            onClick={() => void review(item.id, 'approved')}
          >
            {t('table.reapprove')}
          </button>
        ) : null}
      </div>
    );

    if (isReviewQueue) {
      return (
        <div className="op-account-card op-account-table-wrap op-account-table-scroll">
          <table className="op-account-table op-account-table-admin">
            <colgroup>
              <col className="op-account-col-check" />
              <col className="op-account-col-template" />
              <col className="op-account-col-status" />
              <col className="op-account-col-date" />
              <col className="op-account-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th className="op-account-th-check">
                  <input
                    type="checkbox"
                    className="op-account-check"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = Boolean(somePageSelected && !allPageSelected);
                    }}
                    aria-label={t('admin.selectAll')}
                    onChange={() => opts.selection!.onToggleAll(adminItemsOnPage)}
                  />
                </th>
                <th>{t('table.template')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.updated')}</th>
                <th className="op-account-th-actions">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const st = displayStatus(item);
                const thumb = item.images[0];
                const ownerLabel =
                  'submitterEmail' in item
                    ? item.submitterEmail ?? t('table.ownerAnonymous')
                    : t('table.ownerAnonymous');
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer${opts.selection?.selected.has(item.id) ? ' op-account-row-selected' : ''}`}
                    onClick={() => openRowDetail(item)}
                  >
                    <td className="op-account-td-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="op-account-check"
                        checked={opts.selection!.selected.has(item.id)}
                        aria-label={item.title}
                        onChange={() => opts.selection!.onToggle(item.id)}
                      />
                    </td>
                    <td className="op-account-td-template">
                      <div className="op-account-cell-template">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="op-account-thumb" />
                        ) : (
                          <div className="op-account-thumb flex items-center justify-center text-sm">🖼</div>
                        )}
                        <div className="op-account-cell-template-body">
                          <button
                            type="button"
                            className="op-account-cell-title"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRowDetail(item);
                            }}
                          >
                            {item.title}
                          </button>
                          <div className="op-account-cell-template-meta">
                            <span>#{item.id}</span>
                            <span className="op-account-cell-sep" aria-hidden>
                              ·
                            </span>
                            <span className="op-account-cell-owner" title={ownerLabel}>
                              {ownerLabel}
                            </span>
                            {item.model ? (
                              <>
                                <span className="op-account-cell-sep op-account-cell-sep-model" aria-hidden>
                                  ·
                                </span>
                                <span className="op-account-cell-model" title={item.model}>
                                  {item.model}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="op-account-td-status">
                      <span className={`op-account-status ${st}`}>{statusLabel(st)}</span>
                    </td>
                    <td className="op-account-td-date">{formatReviewDate(item.updatedAt, locale)}</td>
                    <td className="op-account-td-actions" onClick={(e) => e.stopPropagation()}>
                      {renderAdminActions(item)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="op-account-card op-account-table-wrap">
        <table className="op-account-table">
          <thead>
            <tr>
              {opts.selection ? (
                <th className="op-account-th-check">
                  <input
                    type="checkbox"
                    className="op-account-check"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = Boolean(somePageSelected && !allPageSelected);
                    }}
                    aria-label={t('admin.selectAll')}
                    onChange={() => opts.selection!.onToggleAll(adminItemsOnPage)}
                  />
                </th>
              ) : null}
              <th>{t('table.template')}</th>
              {opts.admin ? <th>{t('table.owner')}</th> : null}
              <th>{t('table.status')}</th>
              <th>{t('table.model')}</th>
              <th>{t('table.updated')}</th>
              <th className="op-account-th-actions">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const st = displayStatus(item);
              const thumb = item.images[0];
              const ownerLabel =
                opts.admin && 'submitterEmail' in item
                  ? item.submitterEmail ?? t('table.ownerAnonymous')
                  : null;
              return (
                <tr
                  key={item.id}
                  className={`cursor-pointer${opts.selection?.selected.has(item.id) ? ' op-account-row-selected' : ''}`}
                  onClick={() => openRowDetail(item)}
                >
                  {opts.selection ? (
                    <td className="op-account-td-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="op-account-check"
                        checked={opts.selection.selected.has(item.id)}
                        aria-label={item.title}
                        onChange={() => opts.selection!.onToggle(item.id)}
                      />
                    </td>
                  ) : null}
                  <td>
                    <div className="flex items-center gap-2.5">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="op-account-thumb" />
                      ) : (
                        <div className="op-account-thumb flex items-center justify-center text-sm">🖼</div>
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="truncate text-left font-medium text-[var(--text)] hover:text-[var(--amber2)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRowDetail(item);
                          }}
                        >
                          {item.title}
                        </button>
                        <div className="text-[10px] text-[var(--text3)]">#{item.id}</div>
                      </div>
                    </div>
                  </td>
                  {opts.admin ? (
                    <td className="max-w-[140px] truncate text-[11px] text-[var(--text2)]" title={ownerLabel ?? ''}>
                      {ownerLabel}
                    </td>
                  ) : null}
                  <td>
                    <span className={`op-account-status ${st}`}>{statusLabel(st)}</span>
                  </td>
                  <td className="text-[var(--text2)]">{item.model}</td>
                  <td className="text-[11px] text-[var(--text3)]">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="op-account-td-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="op-account-row-actions">
                      <button
                        type="button"
                        className="op-account-row-btn"
                        onClick={() => openRowDetail(item)}
                      >
                        {t('table.view')}
                      </button>
                      {opts.admin ? (
                        <>
                          {item.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                className="op-account-row-btn approve"
                                onClick={() => void review(item.id, 'approved')}
                              >
                                {t('table.approve')}
                              </button>
                              <button
                                type="button"
                                className="op-account-row-btn reject"
                                onClick={() => void review(item.id, 'rejected')}
                              >
                                {t('table.reject')}
                              </button>
                            </>
                          ) : null}
                          {item.status === 'approved' ? (
                            <button
                              type="button"
                              className="op-account-row-btn reject"
                              onClick={() => void review(item.id, 'rejected')}
                            >
                              {t('table.revoke')}
                            </button>
                          ) : null}
                          {item.status === 'rejected' ? (
                            <button
                              type="button"
                              className="op-account-row-btn approve"
                              onClick={() => void review(item.id, 'approved')}
                            >
                              {t('table.reapprove')}
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <button type="button" className="op-account-row-btn" onClick={() => openEdit(item)}>
                            {t('table.edit')}
                          </button>
                          <button
                            type="button"
                            className="op-account-row-btn reject"
                            onClick={() => void removeTemplate(item.id)}
                          >
                            {t('table.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const accountLangSuffix = useMemo(() => {
    if (panel === 'overview') return '/account';
    if (panel === 'admin-denied') return '/account/admin';
    return accountPanelHref('en', panel);
  }, [panel]);

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader
        locale={locale}
        activeNav="account"
        langPathSuffix={accountLangSuffix}
      />
      <main className="w-full">
        <div className="op-account-shell relative">
          <div className="mx-auto w-full max-w-7xl px-6 py-6">
            <div className="op-account-layout">
              <aside className="op-account-sidebar">
                <div className="op-account-sidebar-user">
            <div className="op-account-avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveUserAvatarUrl(user.image, user.email || user.id)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium">{user.name || user.email || '—'}</div>
              {user.name && user.email ? (
                <div className="truncate text-[11px] text-[var(--text3)]">{user.email}</div>
              ) : null}
              {isAdmin ? (
                <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] text-[var(--amber)] bg-[var(--amber-dim)] border border-[rgba(232,160,32,0.2)]">
                  {t('sidebar.adminBadge')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="op-account-nav-section">
            <div className="op-account-nav-label">{t('sidebar.overview')}</div>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'overview' ? ' active' : ''}`}
              onClick={() => navigatePanel('overview')}
            >
              {t('nav.overview')}
            </button>
          </div>

          <div className="op-account-nav-section">
            <div className="op-account-nav-label">{t('sidebar.content')}</div>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'prompts' ? ' active' : ''}`}
              onClick={() => navigatePanel('prompts')}
            >
              {t('nav.prompts')}
              <span className="op-account-nav-badge">{templateCount}</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                className={`op-account-nav-item${panel === 'admin' ? ' active' : ''}`}
                onClick={() => navigatePanel('admin')}
              >
                {t('nav.adminReview')}
                {adminPendingCount != null && adminPendingCount > 0 ? (
                  <span className="op-account-nav-badge warn">{adminPendingCount}</span>
                ) : null}
              </button>
            ) : null}
            {isAdmin ? (
              <button
                type="button"
                className={`op-account-nav-item${panel === 'users' ? ' active' : ''}`}
                onClick={() => navigatePanel('users')}
              >
                {t('nav.users')}
              </button>
            ) : null}
          </div>

          <div className="op-account-nav-section">
            <div className="op-account-nav-label">{t('sidebar.account')}</div>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'credits' ? ' active' : ''}`}
              onClick={() => navigatePanel('credits')}
            >
              {t('nav.credits')}
            </button>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'subscription' ? ' active' : ''}`}
              onClick={() => navigatePanel('subscription')}
            >
              {t('nav.subscription')}
            </button>
          </div>
              </aside>

              <div className="op-account-main">
                <header className="op-account-topbar">
                  <div className="op-account-topbar-title">{panelTitle}</div>
                </header>

          <div className="op-account-content">
            <div className={`op-account-panel${panel === 'admin-denied' ? ' active' : ''}`}>
              <div className="op-account-card p-4 text-sm text-[var(--text2)]">
                <p className="font-medium text-[var(--text)]">{t('admin.forbiddenTitle')}</p>
                <p className="mt-2">{t('admin.forbiddenBody', { email: user.email || '—' })}</p>
                <p className="mt-2 text-xs text-[var(--text3)]">{t('admin.forbiddenHint')}</p>
                <p className="mt-3 text-xs text-[var(--text3)]">{t('admin.forbiddenMyTemplatesHint')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="op-account-btn" onClick={() => navigatePanel('overview')}>
                    {t('nav.overview')}
                  </button>
                  <button type="button" className="op-account-btn primary" onClick={() => navigatePanel('prompts')}>
                    {t('nav.prompts')}
                  </button>
                </div>
              </div>
            </div>
            <div className={`op-account-panel${panel === 'overview' ? ' active' : ''}`}>
              <div className="op-account-metrics">
                <div className="op-account-metric">
                  <div className="op-account-metric-label">{t('metrics.templates')}</div>
                  <div className="op-account-metric-value">
                    {templateCount == null ? '…' : templateCount}
                  </div>
                </div>
                <div className="op-account-metric">
                  <div className="op-account-metric-label">{t('metrics.pending')}</div>
                  <div className="op-account-metric-value">
                    {myPendingCount == null ? '…' : myPendingCount}
                  </div>
                </div>
                <div className="op-account-metric">
                  <div className="op-account-metric-label">{t('metrics.credits')}</div>
                  <div className="op-account-metric-value">—</div>
                </div>
                <div className="op-account-metric">
                  <div className="op-account-metric-label">{t('metrics.generations')}</div>
                  <div className="op-account-metric-value">—</div>
                </div>
              </div>
              <div className="op-account-card">
                <p className="mb-3 text-sm text-[var(--text2)]">{t('overview.hint')}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="op-account-btn primary" onClick={() => navigatePanel('prompts')}>
                    {t('overview.manage')}
                  </button>
                  <Link href={submitEditorHref(locale)} className="op-account-btn">
                    {t('overview.submit')}
                  </Link>
                </div>
              </div>
            </div>

            <div className={`op-account-panel${panel === 'prompts' ? ' active' : ''}`}>
              <div className="op-account-toolbar">
                <input
                  className="op-account-search"
                  placeholder={t('toolbar.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadMyTemplates();
                  }}
                />
                <select
                  className="op-account-select"
                  value={myStatusFilter}
                  onChange={(e) => setMyStatusFilter(e.target.value)}
                >
                  <option value="">{t('toolbar.allStatus')}</option>
                  <option value="pending">{t('status.pending')}</option>
                  <option value="approved">{t('status.pub')}</option>
                  <option value="rejected">{t('status.rejected')}</option>
                </select>
                <button type="button" className="op-account-btn" onClick={() => void loadMyTemplates()}>
                  {t('toolbar.refresh')}
                </button>
                <Link href={submitEditorHref(locale, { visibility: 'private' })} className="op-account-btn primary">
                  {t('topbar.newTemplate')}
                </Link>
              </div>
              {renderTable(templates, {
                emptyMessage:
                  myStatusFilter.trim() !== ''
                    ? t('table.emptyFiltered')
                    : `${t('table.empty')} ${t('table.emptyAdminHint')}`,
              })}
            </div>

            {isAdmin ? (
              <div className={`op-account-panel${panel === 'admin' ? ' active' : ''}`}>
                <p className="mb-3 text-sm text-[var(--text2)]">{t('admin.hint')}</p>
                <p className="mb-3 text-xs text-[var(--text3)]">{t('admin.hintActions')}</p>
                {adminLoadError ? (
                  <p className="mb-3 text-sm text-[var(--coral)]">{t('admin.loadError', { message: adminLoadError })}</p>
                ) : null}
                {renderAdminPromptsTrend()}
                <div className="op-account-toolbar">
                  <input
                    className="op-account-search"
                    placeholder={t('toolbar.search')}
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void loadAdminTemplates();
                    }}
                  />
                  <select
                    className="op-account-select"
                    value={adminStatusFilter}
                    onChange={(e) => setAdminStatusFilter(e.target.value)}
                  >
                    <option value="">{t('toolbar.allStatus')}</option>
                    <option value="pending">{t('status.pending')}</option>
                    <option value="approved">{t('status.pub')}</option>
                    <option value="rejected">{t('status.rejected')}</option>
                  </select>
                  <button type="button" className="op-account-btn" onClick={() => void loadAdminTemplates()}>
                    {t('toolbar.refresh')}
                  </button>
                </div>
                {renderAdminPagination()}
                {selectedAdminIds.size > 0 ? (
                  <div className="op-account-bulk-bar">
                    <span className="text-xs text-[var(--text2)]">
                      {t('admin.selectedCount', { count: selectedAdminIds.size })}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="op-account-btn primary"
                        disabled={bulkReviewBusy}
                        onClick={() => void bulkReview('approved')}
                      >
                        {t('admin.approveSelected')}
                      </button>
                      <button
                        type="button"
                        className="op-account-btn reject"
                        disabled={bulkReviewBusy}
                        onClick={() => void bulkReview('rejected')}
                      >
                        {t('admin.rejectSelected')}
                      </button>
                      <button
                        type="button"
                        className="op-account-btn"
                        disabled={bulkReviewBusy}
                        onClick={() => setSelectedAdminIds(new Set())}
                      >
                        {t('admin.clearSelection')}
                      </button>
                    </div>
                  </div>
                ) : null}
                {renderTable(adminItems, {
                  admin: true,
                  loading: adminLoading,
                  selection: {
                    selected: selectedAdminIds,
                    onToggle: toggleAdminSelection,
                    onToggleAll: toggleAdminSelectAll,
                  },
                  emptyMessage:
                    adminStatusFilter === 'pending' ? t('admin.emptyPending') : t('admin.empty'),
                })}
              </div>
            ) : null}

            {isAdmin ? (
              <div className={`op-account-panel${panel === 'users' ? ' active' : ''}`}>
                <p className="mb-3 text-sm text-[var(--text2)]">{t('adminUsers.hint')}</p>
                <div className="op-account-metrics mb-4">
                  <div className="op-account-metric">
                    <div className="op-account-metric-label">{t('adminUsers.metricTotal')}</div>
                    <div className="op-account-metric-value">
                      {usersLoading && usersPlatformTotal == null ? '…' : (usersPlatformTotal ?? '—')}
                    </div>
                  </div>
                  <div className="op-account-metric">
                    <div className="op-account-metric-label">{t('adminUsers.metricActiveToday')}</div>
                    <div className="op-account-metric-value">
                      {usersLoading && usersActiveToday == null ? '…' : (usersActiveToday ?? '—')}
                    </div>
                  </div>
                  <div className="op-account-metric">
                    <div className="op-account-metric-label">{t('adminUsers.metricNewToday')}</div>
                    <div className="op-account-metric-value">
                      {usersLoading && usersNewToday == null ? '…' : (usersNewToday ?? '—')}
                    </div>
                  </div>
                </div>
                {renderUsersDailyTrend()}
                {usersLoadError ? (
                  <p className="mb-3 text-sm text-[var(--coral)]">
                    {t('adminUsers.loadError', { message: usersLoadError })}
                  </p>
                ) : null}
                <div className="op-account-toolbar">
                  <input
                    className="op-account-search"
                    placeholder={t('adminUsers.searchPlaceholder')}
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void loadAdminUsers();
                    }}
                  />
                  <button type="button" className="op-account-btn" onClick={() => void loadAdminUsers()}>
                    {t('toolbar.refresh')}
                  </button>
                </div>
                {renderUsersPagination()}
                {renderUsersTable()}
              </div>
            ) : null}

            <div className={`op-account-panel${panel === 'credits' ? ' active' : ''}`}>
              <div className="op-account-card">
                <p className="text-sm text-[var(--text2)]">{t('placeholders.credits')}</p>
              </div>
            </div>

            <div className={`op-account-panel${panel === 'subscription' ? ' active' : ''}`}>
              <div className="op-account-card">
                <p className="text-sm text-[var(--text2)]">{t('placeholders.subscription')}</p>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      <OpenPromptsSiteFooter locale={locale} />

      <PromptTemplateDetailDialog
        open={detailOpen}
        item={detailItem}
        locale={locale}
        onClose={closeDetail}
        showGenerate={detailMeta?.statusKey === 'pub'}
        footerExtra={
          detailMeta ? (
            <>
              <span className={`op-account-status ${detailMeta.statusKey}`}>
                {statusLabel(detailMeta.statusKey)}
              </span>
              {detailMeta.owner ? (
                <span className="text-xs text-stone-600">
                  {t('table.owner')}: {detailMeta.owner}
                </span>
              ) : null}
              {!detailMeta.admin && detailMeta.source ? (
                <button
                  type="button"
                  className="op-account-row-btn"
                  onClick={() => {
                    closeDetail();
                    openEdit(detailMeta.source as TemplateRecord);
                  }}
                >
                  {t('table.edit')}
                </button>
              ) : null}
            </>
          ) : null
        }
      />
      {userDetailOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeUserDetail}
        >
          <div
            className="op-account-card max-h-[85vh] w-full max-w-md overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-[var(--text)]">{t('adminUsers.detailTitle')}</h2>
              <button type="button" className="op-account-row-btn" onClick={closeUserDetail}>
                {t('adminUsers.close')}
              </button>
            </div>
            {userDetailLoading ? (
              <p className="text-sm text-[var(--text2)]">{t('loading')}</p>
            ) : userDetailError ? (
              <p className="text-sm text-[var(--coral)]">{userDetailError}</p>
            ) : userDetail ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--text3)]">
                    {t('adminUsers.colUser')}
                  </dt>
                  <dd className="mt-0.5 font-medium">{userDetail.name || userDetail.email}</dd>
                  <dd className="text-xs text-[var(--text2)]">{userDetail.email}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--text3)]">
                    {t('adminUsers.colRole')}
                  </dt>
                  <dd className="mt-0.5">
                    {userDetail.isEnvAdmin ? t('adminUsers.envAdmin') : t('adminUsers.member')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--text3)]">
                    {t('adminUsers.providers')}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text2)]">
                    {userDetail.providers.length
                      ? formatProviderLabels(userDetail.providers)
                      : t('adminUsers.noProviders')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--text3)]">
                    {t('adminUsers.templateCount')}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text2)]">{userDetail.templateCount}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-[var(--text3)]">
                    {t('adminUsers.colJoined')}
                  </dt>
                  <dd className="mt-0.5 text-[var(--text2)]">
                    {formatJoinedAt(userDetail.createdAt, locale)}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
