'use client';

import './account-page.css';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { TemplateModal } from './TemplateModal';

type Panel = 'overview' | 'prompts' | 'admin' | 'credits' | 'subscription';

type Props = {
  locale: string;
  isAdmin: boolean;
  user: { id: string; email: string; name: string | null; image: string | null };
};

function homeHref(locale: string) {
  return locale === 'en' ? '/' : `/${locale}`;
}

function submitHref(locale: string) {
  return locale === 'en' ? '/submit' : `/${locale}/submit`;
}

/** UI badge: review `status` + `visibility` (see resolveStatusForVisibility on create). */
function displayStatus(item: TemplateRecord): 'pub' | 'draft' | 'priv' | 'pending' | 'rejected' {
  if (item.status === 'rejected') return 'rejected';
  if (item.status === 'pending') return 'pending';
  if (item.visibility === 'draft') return 'draft';
  if (item.visibility === 'private') return 'priv';
  return 'pub';
}

export default function PageComponent({ locale, isAdmin, user }: Props) {
  const t = useTranslations('OpenPrompts.accountPage');

  const [panel, setPanel] = useState<Panel>('overview');
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [adminItems, setAdminItems] = useState<AdminTemplateRecord[]>([]);
  const [templateCount, setTemplateCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [myLoading, setMyLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [myStatusFilter, setMyStatusFilter] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('');
  const [adminScope, setAdminScope] = useState<'user' | 'all'>('all');
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(20);
  const [adminTotal, setAdminTotal] = useState<number | null>(null);
  const [adminHasMore, setAdminHasMore] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminLoadError, setAdminLoadError] = useState<string | null>(null);

  const ADMIN_PAGE_SIZES = [10, 20, 50, 100] as const;
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<TemplateRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PromptDetailItem | null>(null);
  const [detailMeta, setDetailMeta] = useState<{
    statusKey: string;
    owner?: string | null;
    admin?: boolean;
    source?: TemplateRecord | AdminTemplateRecord;
  } | null>(null);

  const panelTitle = useMemo(() => {
    const map: Record<Panel, string> = {
      overview: t('panels.overview'),
      prompts: t('panels.prompts'),
      admin: t('panels.admin'),
      credits: t('panels.credits'),
      subscription: t('panels.subscription'),
    };
    return map[panel];
  }, [panel, t]);

  const loadStats = useCallback(async () => {
    const res = await fetch(localeApiPath(locale, '/api/my/templates/stats'), { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { templateCount?: number; pendingCount?: number };
    setTemplateCount(data.templateCount ?? 0);
    setPendingCount(data.pendingCount ?? 0);
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
    setAdminLoading(true);
    setAdminLoadError(null);

    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), 25_000);

    try {
      const q = new URLSearchParams();
      if (adminSearch.trim()) q.set('q', adminSearch.trim());
      if (adminStatusFilter) q.set('status', adminStatusFilter);
      q.set('scope', adminScope);
      q.set('limit', String(adminPageSize));
      q.set('offset', String((adminPage - 1) * adminPageSize));
      const res = await fetch(localeApiPath(locale, `/api/admin/templates?${q}`), {
        cache: 'no-store',
        signal: ac.signal,
      });
      const data = (await res.json()) as {
        items?: AdminTemplateRecord[];
        total?: number | null;
        hasMore?: boolean;
        pendingCount?: number;
        error?: string;
      };
      if (res.ok) {
        setAdminItems(data.items ?? []);
        setAdminTotal(typeof data.total === 'number' ? data.total : null);
        setAdminHasMore(Boolean(data.hasMore));
        if (typeof data.pendingCount === 'number') setPendingCount(data.pendingCount);
      } else {
        setAdminItems([]);
        setAdminTotal(null);
        setAdminHasMore(false);
        setAdminLoadError(data.error ?? `HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      setAdminItems([]);
      setAdminTotal(null);
      setAdminHasMore(false);
      const msg = e instanceof Error ? e.message : 'Network error';
      setAdminLoadError(
        e instanceof DOMException && e.name === 'AbortError' ? t('admin.loadTimeout') : msg,
      );
    } finally {
      window.clearTimeout(timeoutId);
      setAdminLoading(false);
    }
  }, [locale, adminSearch, adminStatusFilter, adminScope, adminPage, adminPageSize, t]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch, adminStatusFilter, adminScope, adminPageSize]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (panel === 'prompts') void loadMyTemplates();
  }, [panel, loadMyTemplates]);

  useEffect(() => {
    if (panel === 'admin' && isAdmin) void loadAdminTemplates();
  }, [panel, isAdmin, loadAdminTemplates]);

  const openEdit = (item: TemplateRecord) => {
    setEditItem(item);
    setModalOpen(true);
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
    void loadAdminTemplates();
    void loadStats();
  };

  const adminTotalPages =
    adminTotal != null && adminTotal >= 0 ? Math.max(1, Math.ceil(adminTotal / adminPageSize)) : null;

  const renderAdminPagination = () => {
    const canPrev = adminPage > 1;
    const canNext =
      adminTotalPages != null ? adminPage < adminTotalPages : adminHasMore;

    return (
      <div className="op-account-pagination">
        <label className="flex items-center gap-2 text-xs text-[var(--text2)]">
          <span>{t('admin.pagination.pageSize')}</span>
          <select
            className="op-account-select"
            value={adminPageSize}
            onChange={(e) => setAdminPageSize(Number(e.target.value))}
            disabled={adminLoading}
          >
            {ADMIN_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-[var(--text3)]">
          {adminTotal != null
            ? t('admin.pagination.total', { count: adminTotal })
            : t('admin.pagination.totalUnknown')}
          {' · '}
          {adminTotalPages != null
            ? t('admin.pagination.pageOf', { page: adminPage, total: adminTotalPages })
            : t('admin.pagination.pageOnly', { page: adminPage })}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="op-account-btn"
            disabled={!canPrev || adminLoading}
            onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
          >
            {t('admin.pagination.prev')}
          </button>
          <button
            type="button"
            className="op-account-btn"
            disabled={!canNext || adminLoading}
            onClick={() => setAdminPage((p) => p + 1)}
          >
            {t('admin.pagination.next')}
          </button>
        </div>
      </div>
    );
  };

  const renderTable = (
    items: TemplateRecord[] | AdminTemplateRecord[],
    opts: { admin?: boolean; emptyMessage?: string; loading?: boolean },
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

    return (
      <div className="op-account-card op-account-table-wrap">
        <table className="op-account-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 20 }}>{t('table.template')}</th>
              {opts.admin ? <th>{t('table.owner')}</th> : null}
              <th>{t('table.status')}</th>
              <th>{t('table.model')}</th>
              <th>{t('table.updated')}</th>
              <th style={{ paddingRight: 20 }}>{t('table.actions')}</th>
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
                <tr key={item.id} className="cursor-pointer" onClick={() => openRowDetail(item)}>
                  <td style={{ paddingLeft: 20 }}>
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
                    <span className={`op-account-status ${st}`}>{t(`status.${st}`)}</span>
                  </td>
                  <td className="text-[var(--text2)]">{item.model}</td>
                  <td className="text-[11px] text-[var(--text3)]">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ paddingRight: 20 }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
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

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="account" langPathSuffix="/account" />
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
              <div className="truncate text-[13px] font-medium">{user.name || user.email}</div>
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
              onClick={() => setPanel('overview')}
            >
              {t('nav.overview')}
            </button>
          </div>

          <div className="op-account-nav-section">
            <div className="op-account-nav-label">{t('sidebar.content')}</div>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'prompts' ? ' active' : ''}`}
              onClick={() => setPanel('prompts')}
            >
              {t('nav.prompts')}
              <span className="op-account-nav-badge">{templateCount}</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                className={`op-account-nav-item${panel === 'admin' ? ' active' : ''}`}
                onClick={() => setPanel('admin')}
              >
                {t('nav.adminReview')}
                {pendingCount > 0 ? (
                  <span className="op-account-nav-badge warn">{pendingCount}</span>
                ) : null}
              </button>
            ) : null}
          </div>

          <div className="op-account-nav-section">
            <div className="op-account-nav-label">{t('sidebar.account')}</div>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'credits' ? ' active' : ''}`}
              onClick={() => setPanel('credits')}
            >
              {t('nav.credits')}
            </button>
            <button
              type="button"
              className={`op-account-nav-item${panel === 'subscription' ? ' active' : ''}`}
              onClick={() => setPanel('subscription')}
            >
              {t('nav.subscription')}
            </button>
          </div>
              </aside>

              <div className="op-account-main">
                <header className="op-account-topbar">
                  <div className="op-account-topbar-title">{panelTitle}</div>
                  <Link href={submitHref(locale)} className="op-account-btn primary">
                    {t('topbar.newTemplate')}
                  </Link>
                </header>

          <div className="op-account-content">
            <div className={`op-account-panel${panel === 'overview' ? ' active' : ''}`}>
              <div className="op-account-metrics">
                <div className="op-account-metric">
                  <div className="op-account-metric-label">{t('metrics.templates')}</div>
                  <div className="op-account-metric-value">{templateCount}</div>
                </div>
                <div className="op-account-metric">
                  <div className="op-account-metric-label">{t('metrics.pending')}</div>
                  <div className="op-account-metric-value">{pendingCount}</div>
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
                  <button type="button" className="op-account-btn primary" onClick={() => setPanel('prompts')}>
                    {t('overview.manage')}
                  </button>
                  <Link href={submitHref(locale)} className="op-account-btn">
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
                <Link href={submitHref(locale)} className="op-account-btn primary">
                  {t('topbar.newTemplate')}
                </Link>
              </div>
              {renderTable(templates, {})}
            </div>

            {isAdmin ? (
              <div className={`op-account-panel${panel === 'admin' ? ' active' : ''}`}>
                <p className="mb-3 text-sm text-[var(--text2)]">{t('admin.hintAllUsers')}</p>
                <p className="mb-3 text-xs text-[var(--text3)]">{t('admin.hintActions')}</p>
                {adminLoadError ? (
                  <p className="mb-3 text-sm text-[var(--coral)]">{t('admin.loadError', { message: adminLoadError })}</p>
                ) : null}
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
                    value={adminScope}
                    onChange={(e) => setAdminScope(e.target.value as 'user' | 'all')}
                  >
                    <option value="user">{t('admin.scopeUser')}</option>
                    <option value="all">{t('admin.scopeAll')}</option>
                  </select>
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
                {renderTable(adminItems, {
                  admin: true,
                  loading: adminLoading,
                  emptyMessage:
                    adminStatusFilter === 'pending' ? t('admin.emptyPending') : t('admin.empty'),
                })}
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

      <TemplateModal
        locale={locale}
        open={modalOpen}
        initial={editItem}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void loadMyTemplates();
          void loadStats();
          if (isAdmin) void loadAdminTemplates();
        }}
      />

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
                {t(`status.${detailMeta.statusKey}`)}
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
    </div>
  );
}
