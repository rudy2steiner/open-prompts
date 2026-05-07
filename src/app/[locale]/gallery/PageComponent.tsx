'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import HeadInfo from '~/components/HeadInfo';
import { PROMPT_GALLERY, type PromptGalleryItem } from '~/data/promptGallery';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import { PromptGalleryCard } from '~/components/prompt-gallery/PromptGalleryCard';
import { languages, locales } from '~/config';
import {useTranslations} from 'next-intl';

type Props = {
  locale: string;
  indexLanguageText: any;
  footerLanguageText: any;
};

const PAGE_SIZE = 18;

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function PageComponent({ locale, indexLanguageText, footerLanguageText }: Props) {
  const t = useTranslations('OpenPrompts');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [model, setModel] = useState<string>('all');
  const [tag, setTag] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [autoLoading, setAutoLoading] = useState(false);
  const [ratioById, setRatioById] = useState<Record<string, string>>({});
  const [ratioMetaById, setRatioMetaById] = useState<Record<string, { w: number; h: number }>>({});
  const [ratioByImageKey, setRatioByImageKey] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('op_theme') || 'light';
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [langOpen, setLangOpen] = useState(false);
  const langWrapRef = useRef<HTMLDivElement | null>(null);

  const models = useMemo(
    () => ['all', ...uniq(PROMPT_GALLERY.map((p) => p.model)).sort((a, b) => a.localeCompare(b))],
    []
  );
  const tags = useMemo(
    () => ['all', ...uniq(PROMPT_GALLERY.flatMap((p) => p.tags)).sort((a, b) => a.localeCompare(b))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROMPT_GALLERY.filter((p) => {
      if (model !== 'all' && p.model !== model) return false;
      if (tag !== 'all' && !p.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, model, tag]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const hasMore = visible.length < filtered.length;

  const [active, setActive] = useState<PromptGalleryItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerStripRef = useRef<HTMLDivElement | null>(null);
  const viewerThumbRef = useRef<HTMLDivElement | null>(null);
  const viewerProgrammaticScrollRef = useRef(false);

  const imgKey = (promptId: string, src: string) => `${promptId}::${src}`;

  const getAuthorUrl = (item: PromptGalleryItem): string | undefined => {
    if (item.sourceUrl) return item.sourceUrl;
    const h = item.authorHandle?.trim();
    if (!h) return undefined;
    const handle = h.startsWith('@') ? h.slice(1) : h;
    if (!handle) return undefined;
    // Default to X profile if only handle exists.
    return `https://x.com/${encodeURIComponent(handle)}`;
  };

  const formatAspectTag = (id: string): string | null => {
    const meta = ratioMetaById[id];
    if (!meta || meta.w <= 0 || meta.h <= 0) return null;
    const r = meta.w / meta.h;

    const COMMON: Array<[string, number]> = [
      ['1:1', 1],
      ['4:3', 4 / 3],
      ['3:4', 3 / 4],
      ['16:9', 16 / 9],
      ['9:16', 9 / 16],
      ['3:2', 3 / 2],
      ['2:3', 2 / 3],
      ['5:4', 5 / 4],
      ['4:5', 4 / 5],
    ];

    let best: { label: string; diff: number } | null = null;
    for (const [label, val] of COMMON) {
      const diff = Math.abs(r - val);
      if (!best || diff < best.diff) best = { label, diff };
    }
    if (best && best.diff < 0.03) return `${best.label}`;

    const gcd = (a: number, b: number): number => {
      let x = Math.abs(a);
      let y = Math.abs(b);
      while (y) {
        const t = x % y;
        x = y;
        y = t;
      }
      return x || 1;
    };
    const g = gcd(meta.w, meta.h);
    const sw = Math.round(meta.w / g);
    const sh = Math.round(meta.h / g);
    if (sw <= 30 && sh <= 30) return `${sw}:${sh}`;

    // Fallback: approximate ratio as a small integer fraction (always show a:b).
    const approx = (() => {
      const maxDen = 30;
      const maxIter = 12;
      let x = r;
      let a0 = Math.floor(x);
      let p0 = 1,
        q0 = 0;
      let p1 = a0,
        q1 = 1;
      for (let i = 0; i < maxIter; i++) {
        const frac = x - Math.floor(x);
        if (frac === 0) break;
        x = 1 / frac;
        const a = Math.floor(x);
        const p2 = a * p1 + p0;
        const q2 = a * q1 + q0;
        if (q2 > maxDen) break;
        p0 = p1;
        q0 = q1;
        p1 = p2;
        q1 = q2;
      }
      const num = Math.max(1, Math.round(p1));
      const den = Math.max(1, Math.round(q1));
      return [num, den] as const;
    })();

    return `${approx[0]}:${approx[1]}`;
  };

  const openViewer = (item: PromptGalleryItem, idx: number) => {
    setActive(item);
    setDetailOpen(false);
    setViewerIndex(idx);
    setViewerOpen(true);
    viewerProgrammaticScrollRef.current = true;
  };

  useEffect(() => {
    if (!viewerOpen) return;
    const el = viewerStripRef.current;
    if (!el) return;
    if (!viewerProgrammaticScrollRef.current) return;
    viewerProgrammaticScrollRef.current = false;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: viewerIndex * w, behavior: 'smooth' });
  }, [viewerOpen, viewerIndex]);

  useEffect(() => {
    if (!viewerOpen) return;
    const el = viewerThumbRef.current;
    if (!el) return;
    const child = el.children.item(viewerIndex) as HTMLElement | null;
    if (!child) return;
    child.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
  }, [viewerOpen, viewerIndex]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewerOpen(false);
        return;
      }
      if (!active || active.images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        viewerProgrammaticScrollRef.current = true;
        setViewerIndex((v) => Math.max(0, v - 1));
      } else if (e.key === 'ArrowRight') {
        viewerProgrammaticScrollRef.current = true;
        setViewerIndex((v) => Math.min(active.images.length - 1, v + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerOpen, active]);

  useEffect(() => {
    if (!detailOpen) return;
    if (viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDetailOpen(false);
      setActive(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailOpen, viewerOpen]);

  useEffect(() => {
    if (!promptCopied) return;
    const t = window.setTimeout(() => setPromptCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [promptCopied]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Infinite scroll: auto-load when sentinel becomes visible.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMore) return;
        if (autoLoading) return;

        setAutoLoading(true);
        setLimit((v) => Math.min(filtered.length, v + PAGE_SIZE));
      },
      { root: null, rootMargin: '600px 0px', threshold: 0.01 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, autoLoading, filtered.length]);

  useEffect(() => {
    // When new items are revealed or filters change, unlock next auto-load.
    setAutoLoading(false);
  }, [limit, query, model, tag]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('op_theme', theme);
  }, [theme]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = langWrapRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setLangOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const localeMeta = useMemo(() => {
    const l = languages.find((x) => x.lang === locale);
    return l ?? { lang: locale, language: locale.toUpperCase() };
  }, [locale]);

  const navItems = useMemo(() => {
    return [
      {
        key: 'gallery',
        label: t('nav.gallery'),
        href: `/${locale}`,
      },
      {
        key: 'create',
        label: t('nav.create'),
        href: `/${locale}/create`,
      },
      { key: 'rank', label: t('nav.rank'), href: '#' },
      { key: 'docs', label: t('nav.docs'), href: '#' },
    ] as const;
  }, [t, locale]);

  return (
    <>
      <HeadInfo
        title="Open Prompts"
        description="Prompt gallery + template image generation"
        keywords="prompts,gpt image"
        locale={locale}
        page=""
      />

      <style jsx global>{`
        :root {
          --bg: #0e0d0b;
          --surface: #1f1d18;
          --surface2: rgba(255, 255, 255, 0.05);
          --border: rgba(255, 255, 255, 0.1);
          --border2: rgba(255, 255, 255, 0.15);
          --text: #f0ebe0;
          --text2: #a09a8e;
          --text3: #6b6560;
          --amber: #e8a020;
          --amber2: #f0b840;
          --ctl-bg: rgba(255, 255, 255, 0.06);
          --ctl-border: rgba(255, 255, 255, 0.14);
          --ctl-hover: rgba(255, 255, 255, 0.1);
          --panel-bg: rgba(31, 29, 24, 0.98);
        }
        [data-theme='light'] {
          --bg: #ffffff;
          --surface: #ffffff;
          --surface2: rgba(0, 0, 0, 0.05);
          --border: rgba(0, 0, 0, 0.1);
          --border2: rgba(0, 0, 0, 0.14);
          --text: #1a1814;
          --text2: #5a5650;
          --text3: #9a9590;
          --amber: #c87010;
          --amber2: #d98020;
          --ctl-bg: rgba(0, 0, 0, 0.04);
          --ctl-border: rgba(0, 0, 0, 0.12);
          --ctl-hover: rgba(0, 0, 0, 0.07);
          --panel-bg: rgba(255, 255, 255, 0.98);
        }
      `}</style>

      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
            <a href={`/${locale}`} className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg">
                <Image
                  src="/logo.png"
                  alt="Open Prompts"
                  fill
                  sizes="32px"
                  className="object-contain"
                  priority
                />
              </span>
              <span>
                Open <span className="italic text-[var(--amber2)]">Prompts</span>
              </span>
            </a>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    item.key === 'gallery'
                      ? 'bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-[var(--amber2)]'
                      : 'text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.key === 'create' ? `✦ ${item.label}` : item.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] text-[var(--text2)] shadow-sm hover:bg-[var(--ctl-hover)] hover:text-[var(--text)]"
                title={theme === 'dark' ? t('header.themeToLight') : t('header.themeToDark')}
                onClick={() => {
                  const next = theme === 'dark' ? 'light' : 'dark';
                  setTheme(next);
                  try {
                    localStorage.setItem('op_theme', next);
                  } catch {}
                  document.documentElement.setAttribute('data-theme', next);
                }}
              >
                {theme === 'dark' ? '☾' : '☀︎'}
              </button>

              <div className="relative" ref={langWrapRef}>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] text-[var(--text2)] shadow-sm hover:bg-[var(--ctl-hover)] hover:text-[var(--text)]"
                  onClick={(e) => {
                    setLangOpen((v) => !v);
                  }}
                  title={t('header.language')}
                >
                  <span className="text-[12px] font-semibold tracking-tight leading-none">文A</span>
                </button>
                {langOpen ? (
                  <div
                    className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-[var(--ctl-border)] bg-[var(--panel-bg)] p-1 shadow-xl"
                  >
                    {locales.map((l) => {
                      const meta = languages.find((x) => x.lang === l) ?? { lang: l, language: l.toUpperCase() };
                      const label =
                        l === 'en' ? 'English' : l === 'zh' ? '中文' : l === 'ja' ? '日本語' : meta.language;
                      return (
                        <a
                          key={l}
                          href={`/${l}`}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                            l === locale
                              ? 'text-[var(--text)]'
                              : 'text-[var(--text)] hover:bg-[var(--surface2)]'
                          }`}
                        >
                          <span>{label}</span>
                          {l === locale ? <span className="text-[12px] text-[var(--amber)]">✓</span> : null}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <button className="rounded-lg border border-[var(--border2)] px-3 py-1.5 text-xs text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]">
                {t('nav.submitCta')}
              </button>
            </div>
          </div>
        </header>

        <main className="w-full">
          <section className="px-6 pb-10 pt-16 text-center">
            <div className="mx-auto w-full max-w-7xl">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--amber)_30%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,transparent)] px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[var(--amber)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)]" />
              {t('hero.eyebrow')}
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              {t('hero.h1Prefix')} <span className="italic text-[var(--amber2)]">{t('hero.h1Em')}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--text2)] sm:text-base">
              {t('hero.desc')}
            </p>

            <div className="mx-auto mt-8 flex max-w-xl overflow-hidden rounded-xl border border-[var(--border2)] bg-[var(--surface)]">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder={t('hero.searchPlaceholder')}
                className="w-full bg-transparent px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
              />
              <button className="min-w-[92px] whitespace-nowrap bg-[var(--amber)] px-6 text-sm font-semibold text-[var(--bg)] hover:bg-[var(--amber2)]">
                {t('hero.searchButton')}
              </button>
            </div>

            <div className="mx-auto mt-8 flex max-w-3xl justify-center gap-8 text-center">
              {[
                ['12,400+', t('stats.prompts')],
                ['38', t('stats.models')],
                ['6,200+', t('stats.members')],
                [t('stats.daily'), t('stats.source')],
              ].map(([num, label]) => (
                <div key={label}>
                  <div className="text-xl font-semibold text-[var(--amber2)]">{num}</div>
                  <div className="mt-1 text-[11px] tracking-[0.14em] text-[var(--text3)]">{label}</div>
                </div>
              ))}
            </div>
            </div>
          </section>

          <section className="px-6 pb-6">
            <div className="mx-auto w-full max-w-7xl">
            <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m);
                    setLimit(PAGE_SIZE);
                  }}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs transition ${
                    model === m
                      ? 'border-[color-mix(in_oklab,var(--amber)_40%,transparent)] bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-[var(--amber2)]'
                      : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]'
                  }`}
                >
                  {m === 'all' ? t('filters.allModels') : m}
                </button>
              ))}
            </div>
            </div>
          </section>

          <section className="px-6 pb-4">
            <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 12).map((tagLabel) => (
                  <button
                    key={tagLabel}
                    onClick={() => {
                      setTag(tagLabel);
                      setLimit(PAGE_SIZE);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      tag === tagLabel
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tagLabel === 'all' ? t('filters.allTags') : tagLabel}
                  </button>
                ))}
              </div>
              <div className="text-xs text-[var(--text3)]">
                {t('gallery.showing', {shown: visible.length, total: filtered.length})}
              </div>
            </div>
            </div>
          </section>

          <section className="px-6 pb-6">
            <div className="mx-auto w-full max-w-7xl">
            <div className="mb-4 flex items-center gap-3 text-[11px] tracking-[0.18em] text-[var(--text3)]">
              <span className="h-1 w-1 rounded-full bg-[var(--amber)]" />
              {t('section.latest')}
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {visible.map((p) => (
                <PromptGalleryCard
                  key={p.id}
                  item={p}
                  coverSrc={p.images[0]}
                  coverSizes="(max-width: 1024px) 100vw, 33vw"
                  coverAspectRatio={ratioById[p.id] ?? '16 / 10'}
                  modelBadge={p.model}
                  description={p.description}
                  tags={p.tags}
                  aspectTag={formatAspectTag(p.id)}
                  authorLabel={p.authorHandle ?? t('card.community')}
                  authorUrl={getAuthorUrl(p) ?? null}
                  primaryCtaLabel={t('card.generate')}
                  coverErrorText={t('gallery.coverLoadFailed')}
                  onMeta={({ width, height }) => {
                    const ar = `${width} / ${height}`;
                    setRatioById((prev) => (prev[p.id] === ar ? prev : { ...prev, [p.id]: ar }));
                    setRatioMetaById((prev) =>
                      prev[p.id]?.w === width && prev[p.id]?.h === height ? prev : { ...prev, [p.id]: { w: width, h: height } }
                    );
                  }}
                  onCardClick={() => {
                    setActive(p);
                    setDetailOpen(true);
                    setViewerOpen(false);
                  }}
                  onImageClick={() => openViewer(p, 0)}
                  onCtaClick={() => {
                    router.push(`/${locale}/create?template=${encodeURIComponent(p.id)}`);
                  }}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="mt-8 flex justify-center">
              {hasMore ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)]" />
                  <span>{t('gallery.loadMore')}</span>
                </div>
              ) : (
                <div className="text-xs text-[var(--text3)]">{t('gallery.noMore')}</div>
              )}
            </div>
            </div>
          </section>
        </main>

        <footer className="mt-10 border-t border-[var(--border)] px-6 py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="text-sm text-[var(--text2)]">{t('footer.tagline')}</div>
            <div className="flex flex-wrap gap-5 text-xs text-[var(--text3)]">
              {[
                { label: t('footer.links.github'), href: 'https://github.com/rudy2steiner/open-prompts' },
                { label: t('footer.links.docs'), href: '#' },
                { label: t('footer.links.deploy'), href: '#' },
                { label: t('footer.links.pricing'), href: '#' },
                { label: t('footer.links.privacy'), href: `/${locale}/privacy-policy` },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="hover:text-[var(--text2)]"
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {active && detailOpen && !viewerOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDetailOpen(false);
            setActive(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex w-full max-w-2xl max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-stone-200 bg-stone-50">
              <button
                className="absolute right-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-1 text-sm font-semibold text-stone-800"
                onClick={() => {
                  setDetailOpen(false);
                  setActive(null);
                }}
              >
                ✕
              </button>
              <div className="p-3 sm:p-4">
                <div className="flex w-full snap-x snap-mandatory items-center overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {active.images.map((src, idx) => {
                    const key = imgKey(active.id, src);
                    const ar = ratioByImageKey[key] ?? '16 / 9';
                    return (
                      <div key={src} className="flex w-full shrink-0 snap-center items-center justify-center px-2">
                        <div
                          id={`img-${encodeURIComponent(key)}`}
                          className="relative h-[48vh] max-h-[420px] w-auto overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200"
                          style={{ aspectRatio: ar }}
                        >
                          <CoverImage
                            src={src}
                            alt={`${active.title} ${idx + 1}`}
                            sizes="(max-width: 1024px) 100vw, 768px"
                            className="object-contain"
                            priority={idx === 0}
                            errorText={t('gallery.coverLoadFailed')}
                            onMeta={({ width, height }) => {
                              const nextAr = `${width} / ${height}`;
                              setRatioByImageKey((prev) =>
                                prev[key] === nextAr ? prev : { ...prev, [key]: nextAr }
                              );
                              if (idx === 0) {
                                setRatioById((prev) =>
                                  prev[active.id] === nextAr ? prev : { ...prev, [active.id]: nextAr }
                                );
                              }
                            }}
                          />
                          {active.images.length > 1 ? (
                            <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white">
                              {idx + 1}/{active.images.length}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-lg font-semibold text-stone-900">{active.title}</div>
              <div className="mt-1 text-sm text-stone-600">{active.description}</div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold tracking-wide text-stone-500">{t('modal.promptLabel')}</div>
                  <button
                    className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
                    onClick={async () => {
                      const text = active.prompt ?? '';
                      try {
                        await navigator.clipboard.writeText(text);
                        setPromptCopied(true);
                      } catch {
                        try {
                          const ta = document.createElement('textarea');
                          ta.value = text;
                          ta.style.position = 'fixed';
                          ta.style.left = '-9999px';
                          document.body.appendChild(ta);
                          ta.focus();
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                          setPromptCopied(true);
                        } catch {
                          // no-op
                        }
                      }
                    }}
                    title={t('modal.copy')}
                  >
                    {promptCopied ? t('modal.copied') : t('modal.copy')}
                  </button>
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                  {active.prompt}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {active.tags.map((t) => (
                  <span key={t} className="rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-700">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-stone-500">
                  {active.authorHandle ? `${t('modal.from')} ${active.authorHandle}` : null}
                  {active.sourceUrl ? (
                    <>
                      {' '}
                      ·{' '}
                      <a className="text-orange-700 underline" href={active.sourceUrl} target="_blank" rel="noreferrer">
                        {t('modal.viewSource')} ↗
                      </a>
                    </>
                  ) : null}
                </div>
                <button
                  className="rounded-lg bg-[var(--amber)] px-4 py-2 text-sm font-semibold text-[var(--bg)] hover:bg-[var(--amber2)]"
                  onClick={() => {
                    router.push(`/${locale}/create?template=${encodeURIComponent(active.id)}`);
                  }}
                >
                  🚀 {t('modal.generateNow')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {active && viewerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/55"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewerOpen(false)}
        >
          <button
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-black/50"
            onClick={() => setViewerOpen(false)}
          >
            ✕
          </button>

          {active.images.length > 1 ? (
            <>
              <button
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/20 hover:bg-black/50"
                onClick={(e) => {
                  e.stopPropagation();
                  viewerProgrammaticScrollRef.current = true;
                  setViewerIndex((v) => Math.max(0, v - 1));
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/20 hover:bg-black/50"
                onClick={(e) => {
                  e.stopPropagation();
                  viewerProgrammaticScrollRef.current = true;
                  setViewerIndex((v) => Math.min(active.images.length - 1, v + 1));
                }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            className="flex h-full w-full flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={viewerStripRef}
              className="flex w-full flex-1 snap-x snap-mandatory items-center overflow-x-auto scroll-smooth px-6 pt-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(e) => {
                const el = e.currentTarget;
                const w = el.clientWidth || 1;
                const next = Math.round(el.scrollLeft / w);
                viewerProgrammaticScrollRef.current = false;
                if (next !== viewerIndex) setViewerIndex(next);
              }}
            >
              {active.images.map((src, idx) => {
                const key = imgKey(active.id, src);
                const ar = ratioByImageKey[key] ?? '16 / 9';
                return (
                  <div key={src} className="flex w-full shrink-0 snap-center items-center justify-center">
                    <div
                      className="relative mx-auto h-[56vh] max-h-[520px] w-auto"
                      style={{ aspectRatio: ar }}
                    >
                      <CoverImage
                        src={src}
                        alt={`${active.title} view ${idx + 1}`}
                        sizes="(max-width: 1024px) 100vw, 1024px"
                        className="object-contain"
                        priority={idx === viewerIndex}
                        errorText={t('gallery.coverLoadFailed')}
                        onMeta={({ width, height }) => {
                          const nextAr = `${width} / ${height}`;
                          setRatioByImageKey((prev) =>
                            prev[key] === nextAr ? prev : { ...prev, [key]: nextAr }
                          );
                        }}
                      />
                      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
                        {idx + 1}/{active.images.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {active.images.length > 1 ? (
              <div className="-mt-2 pb-4">
                <div
                  ref={viewerThumbRef}
                  className="mx-auto flex max-w-3xl items-center justify-center gap-2 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {active.images.map((src, idx) => {
                    const key = imgKey(active.id, src);
                    const ar = ratioByImageKey[key] ?? '16 / 9';
                    const activeThumb = idx === viewerIndex;
                    return (
                      <button
                        key={src}
                        type="button"
                        className={`relative h-12 w-auto shrink-0 overflow-hidden rounded-none bg-black/25 ring-2 transition ${
                          activeThumb ? 'ring-white/90' : 'ring-white/25 hover:ring-white/45'
                        }`}
                        style={{ aspectRatio: ar }}
                        onClick={() => {
                          viewerProgrammaticScrollRef.current = true;
                          setViewerIndex(idx);
                        }}
                      >
                        <CoverImage
                          src={src}
                          alt={`${active.title} thumb ${idx + 1}`}
                          sizes="64px"
                          className="object-contain"
                          errorText={t('gallery.coverLoadFailed')}
                          onMeta={({ width, height }) => {
                            const nextAr = `${width} / ${height}`;
                            setRatioByImageKey((prev) =>
                              prev[key] === nextAr ? prev : { ...prev, [key]: nextAr }
                            );
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

