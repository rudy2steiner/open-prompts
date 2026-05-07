'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PROMPT_GALLERY } from '~/data/promptGallery';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import { PromptGalleryCard } from '~/components/prompt-gallery/PromptGalleryCard';
import { PROVIDER_CAPABILITIES } from '~/lib/generation/capabilities';

type Props = { locale: string };
type UiState = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';
type HistoryEntry = {
  id: string;
  createdAt: number;
  providerJobId: string | null;
  prompt: string;
  model: string;
  provider: string;
  aspectRatio: string;
  quality: string;
  count: number;
  images: string[];
};

export default function PageComponent({ locale }: Props) {
  const t = useTranslations('OpenPrompts');
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [langOpen, setLangOpen] = useState(false);
  const langWrapRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(PROMPT_GALLERY[0]?.id ?? '');
  const [ratioById, setRatioById] = useState<Record<string, string>>({});
  const item = useMemo(() => {
    const found = PROMPT_GALLERY.find((p) => p.id === selectedId);
    return found ?? PROMPT_GALLERY[0];
  }, [selectedId]);

  useEffect(() => {
    if (!searchParams) return;
    const idFromUrl = searchParams.get('template') || searchParams.get('templateId') || searchParams.get('id');
    if (!idFromUrl) return;
    const exists = PROMPT_GALLERY.some((p) => p.id === idFromUrl);
    if (!exists) return;
    setSelectedId(idFromUrl);
    const el = document.getElementById('op-create-prompt');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchParams]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROMPT_GALLERY;
    return PROMPT_GALLERY.filter((p) => {
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.tags.some((x) => x.toLowerCase().includes(q))
      );
    });
  }, [query]);

  const [promptText, setPromptText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>('internal');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [quality, setQuality] = useState<string>('1k');
  const [count, setCount] = useState<number>(1);
  const [apiKeyByProvider, setApiKeyByProvider] = useState<Record<string, string>>({});
  const apiKeyByProviderRef = useRef<Record<string, string>>({});
  const prevProviderRef = useRef<string>(provider);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyDialogProvider, setKeyDialogProvider] = useState<string>(provider);
  const [keyDraft, setKeyDraft] = useState('');

  const capabilities = useMemo(() => {
    if (provider !== 'internal') {
      return PROVIDER_CAPABILITIES[provider] || PROVIDER_CAPABILITIES.atlascloud;
    }
    const all = Object.values(PROVIDER_CAPABILITIES);
    const aspectRatios = Array.from(new Set(all.flatMap((c: any) => c.aspectRatios || [])));
    const qualities = Array.from(new Set(all.flatMap((c: any) => c.qualities || [])));
    const maxCount = Math.max(1, ...all.map((c: any) => Number(c.maxCount || 1)));
    return { aspectRatios, qualities, maxCount } as (typeof PROVIDER_CAPABILITIES)[keyof typeof PROVIDER_CAPABILITIES];
  }, [provider]);

  const [uiState, setUiState] = useState<UiState>('idle');
  const [providerJobId, setProviderJobId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [ratioByUrl, setRatioByUrl] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const lastSavedJobRef = useRef<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (list: string[], idx: number) => {
    setViewerImages(list);
    setViewerIndex(Math.max(0, Math.min(idx, Math.max(0, list.length - 1))));
    setViewerOpen(true);
  };

  useEffect(() => {
    const saved = (localStorage.getItem('op_theme') || 'light') as 'light' | 'dark';
    const next = saved === 'dark' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('op_theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      const providers = ['atlascloud', 'replicate'];
      const map: Record<string, string> = {};
      for (const p of providers) map[p] = localStorage.getItem(`op_apiKey_${p}`) || '';
      setApiKeyByProvider(map);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    apiKeyByProviderRef.current = apiKeyByProvider;
  }, [apiKeyByProvider]);

  const getApiKeyOverride = (p: string) => (apiKeyByProviderRef.current[p] || '').trim();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('op_create_history');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const cleaned: HistoryEntry[] = parsed
        .filter((x) => x && typeof x === 'object')
        .map((x: any) => ({
          id: String(x.id || ''),
          createdAt: Number(x.createdAt || Date.now()),
          providerJobId: x.providerJobId ? String(x.providerJobId) : null,
          prompt: String(x.prompt || ''),
          model: String(x.model || ''),
          provider: String(x.provider || ''),
          aspectRatio: String(x.aspectRatio || ''),
          quality: String(x.quality || ''),
          count: Number(x.count || 1),
          images: Array.isArray(x.images) ? x.images.filter((u: any) => typeof u === 'string') : [],
        }))
        .filter((x) => x.id && x.prompt);
      if (cleaned.length) setHistory(cleaned.slice(0, 30));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('op_create_history', JSON.stringify(history.slice(0, 30)));
    } catch {
      // ignore
    }
  }, [history]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerOpen(false);
      if (e.key === 'ArrowLeft') setViewerIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setViewerIndex((i) => Math.min(viewerImages.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerOpen, viewerImages.length]);

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

  useEffect(() => {
    // reset when switching prompt
    setPromptText(item?.prompt ?? '');
    setError(null);
    setUiState('idle');
    setProviderJobId(null);
    setImages([]);
  }, [selectedId, item?.prompt]);

  useEffect(() => {
    if (uiState !== 'succeeded') return;
    if (!images.length) return;
    const jobKey = providerJobId ?? '__no_job__';
    if (lastSavedJobRef.current === jobKey) return;
    lastSavedJobRef.current = jobKey;

    const entry: HistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      providerJobId,
      prompt: promptText,
      model: item?.model ?? 'GPT Image 2',
      provider,
      aspectRatio,
      quality,
      count,
      images,
    };

    setHistory((prev) => [entry, ...prev].slice(0, 30));
  }, [
    uiState,
    images,
    providerJobId,
    promptText,
    provider,
    aspectRatio,
    quality,
    count,
    item?.model,
  ]);

  useEffect(() => {
    if (!providerJobId) return;
    if (uiState !== 'queued' && uiState !== 'running') return;

    let cancelled = false;
    const tick = async () => {
      try {
        const encoded = providerJobId || '';
        const p = encoded.includes(':') ? encoded.slice(0, encoded.indexOf(':')) : provider;
        const key = getApiKeyOverride(p);
        const res = await fetch(`/${locale}/api/generations/${encodeURIComponent(providerJobId)}`, {
          cache: 'no-store',
          headers: key ? { 'x-op-api-key': key } : undefined,
        }).then((r) => r.json());
        if (cancelled) return;
        if (res?.status === 'running' || res?.status === 'queued') {
          setUiState(res.status);
          return;
        }
        if (res?.status === 'succeeded') {
          setUiState('succeeded');
          setImages(Array.isArray(res.images) ? res.images : []);
          return;
        }
        setUiState('failed');
        setError(res?.error || t('gen.generationFailed'));
      } catch (e: any) {
        if (cancelled) return;
        setUiState('failed');
        setError(e?.message || t('gen.pollingFailed'));
      }
    };

    const interval = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [locale, providerJobId, uiState, t]);

  const canGenerate = uiState === 'idle' || uiState === 'failed' || uiState === 'succeeded';

  const hero = useMemo(() => {
    if (locale === 'zh') {
      return {
        title: '用模板快速生成更好的图片提示词',
        subtitle: '选模板 → 改描述 → 点生成。结果与历史都在同一个工作台。',
        featuresTitle: 'Features',
        features: [
          { t: '模板驱动', d: '先锁定结构，再替换变量（人物/场景/风格）。' },
          { t: '参数胶囊条', d: '比例、质量、数量、提供方一行完成。' },
          { t: '结果 + 历史', d: '右侧即时预览，点击历史一键回填复用。' },
        ],
        howTitle: 'How it works',
        howSteps: ['从左侧选择模板', '在中间输入框微调描述', '选择比例/质量/数量并生成', '在右侧查看结果并复用历史'],
        whyTitle: 'Why users choose Open Prompts',
        whyPoints: ['不需要从零写 prompt', '结构更稳定，出图更一致', '一页完成：编辑、生成、对比、复用'],
        sayTitle: 'What users say',
        says: [
          { q: '模板帮我把 prompt 写得更像“专业配方”。', a: '创作者' },
          { q: '参数一行搞定，生成完还能直接回填对比。', a: '设计师' },
          { q: '历史记录太好用了，改两句话就能出一套风格。', a: '产品团队' },
        ],
        faqTitle: 'FAQs',
        faqs: [
          { q: '我应该从哪里开始？', a: '从左侧选一个接近你需求的模板，然后只替换主体/场景/风格。' },
          { q: '提示词写多长合适？', a: '先写清楚主体与风格，再补充光照、材质、镜头与背景即可。' },
          { q: '如何更稳定地复现风格？', a: '尽量复用模板结构与关键风格词，只改变量部分。' },
        ],
        ctaTitle: '准备好开始创作了吗？',
        ctaSubtitle: '把想法写进输入框，点击生成。',
        ctaButton: '去生成',
      };
    }
    if (locale === 'ja') {
      return {
        title: 'テンプレートで画像プロンプトを素早く作成',
        subtitle: 'テンプレ → 調整 → 生成。結果と履歴を1つのワークスペースで。',
        featuresTitle: 'Features',
        features: [
          { t: 'テンプレート駆動', d: '骨格を固定して、変数だけ差し替え。' },
          { t: 'パラメータが一行', d: '比率・品質・枚数・プロバイダを集約。' },
          { t: '結果 + 履歴', d: '右側で確認し、履歴クリックで即再利用。' },
        ],
        howTitle: 'How it works',
        howSteps: ['左のテンプレートを選ぶ', '中央で説明を調整', '比率/品質/枚数を選んで生成', '右側で結果を見て履歴から復元'],
        whyTitle: 'Why users choose Open Prompts',
        whyPoints: ['ゼロから書かなくていい', '構造が安定しやすい', '編集・生成・比較・再利用が1画面'],
        sayTitle: 'What users say',
        says: [
          { q: 'テンプレがあるだけで書くスピードが段違い。', a: 'クリエイター' },
          { q: 'パラメータが整理されていて迷わない。', a: 'デザイナー' },
          { q: '履歴を使って微調整→比較がとても楽。', a: 'チーム' },
        ],
        faqTitle: 'FAQs',
        faqs: [
          { q: 'まず何をすればいい？', a: '左から近いテンプレを選び、被写体/場所/スタイルだけ置き換えます。' },
          { q: 'プロンプトはどれくらい書く？', a: '被写体とスタイルを明確にして、光・質感・背景を少し足すのがコツ。' },
          { q: 'スタイルを安定させるには？', a: 'テンプレ構造と重要なスタイル語を固定し、変数だけ変更。' },
        ],
        ctaTitle: 'さあ、作り始めよう',
        ctaSubtitle: '入力して生成ボタンを押すだけ。',
        ctaButton: '生成へ',
      };
    }
    return {
      title: 'Create better image prompts, fast',
      subtitle: 'Pick a template, tweak the description, then generate. Results and history live in one workspace.',
      featuresTitle: 'Features',
      features: [
        { t: 'Template-first', d: 'Start with a proven structure, then swap variables.' },
        { t: 'One-line params', d: 'Provider, ratio, quality, count in a compact pill bar.' },
        { t: 'Results + history', d: 'Preview outputs and rehydrate any run with one click.' },
      ],
      howTitle: 'How it works',
      howSteps: ['Select a template', 'Refine the description', 'Choose ratio/quality/count and generate', 'Review results and reuse from history'],
      whyTitle: 'Why users choose Open Prompts',
      whyPoints: ['Less blank-page time', 'More consistent structure', 'Edit, generate, compare, reuse in one screen'],
      sayTitle: 'What users say',
      says: [
        { q: 'Templates made my prompts look like a recipe.', a: 'Creator' },
        { q: 'Everything I need is in one line—super fast.', a: 'Designer' },
        { q: 'History saves me hours when iterating styles.', a: 'Team' },
      ],
      faqTitle: 'FAQs',
      faqs: [
        { q: 'Where should I start?', a: 'Pick the closest template and replace subject/location/style first.' },
        { q: 'How long should a prompt be?', a: 'Be specific about subject and style, then add lighting/composition details.' },
        { q: 'How do I keep results consistent?', a: 'Keep the template structure and key style terms stable; change variables only.' },
      ],
      ctaTitle: 'Ready to create?',
      ctaSubtitle: 'Write your idea and hit Generate.',
      ctaButton: 'Generate',
    };
  }, [locale]);

  const onGenerate = async () => {
    const p = promptText.trim();
    if (!p) {
      setError(t('gen.missingPrompt'));
      return;
    }
    setError(null);
    setUiState('queued');
    setImages([]);
    try {
      const res = await fetch(`/${locale}/api/generations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: provider === 'internal' ? undefined : provider,
          prompt: p,
          apiKey: provider === 'internal' ? undefined : getApiKeyOverride(provider) || undefined,
          model: item?.model ?? 'GPT Image 2',
          aspectRatio,
          quality,
          count,
        }),
      }).then((r) => r.json());

      if (res?.error) throw new Error(res.error);
      setProviderJobId(res.providerJobId);
      setUiState(res.status || 'queued');
    } catch (e: any) {
      setUiState('failed');
      setError(e?.message || t('gen.createFailed'));
    }
  };

  return (
    <>
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
          --bg: #f7f5f0;
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
        html,
        body {
          height: 100%;
          overflow: hidden;
        }
      `}</style>

      <div className="flex h-screen w-full flex-col bg-[var(--bg)] text-[var(--text)]">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
            <a href={`/${locale}`} className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg">
                <Image src="/logo.png" alt="Open Prompts" fill sizes="32px" className="object-contain" priority />
              </span>
              <span>
                Open <span className="italic text-[var(--amber2)]">Prompts</span>
              </span>
            </a>
            <nav className="hidden items-center gap-1 md:flex">
              {[
                { key: 'gallery', label: t('nav.gallery'), href: `/${locale}` },
                { key: 'create', label: t('nav.create'), href: `/${locale}/create` },
                { key: 'rank', label: t('nav.rank'), href: '#' },
                { key: 'docs', label: t('nav.docs'), href: '#' },
              ].map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    item.key === 'create'
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
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? '☾' : '☀︎'}
              </button>

              <div className="relative" ref={langWrapRef}>
                <button
                  className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] text-[var(--text2)] shadow-sm hover:bg-[var(--ctl-hover)] hover:text-[var(--text)]"
                  onClick={() => setLangOpen((v) => !v)}
                  title={t('header.language')}
                >
                  <span className="text-[12px] font-semibold tracking-tight leading-none">文A</span>
                </button>
                {langOpen ? (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-[var(--ctl-border)] bg-[var(--panel-bg)] p-1 shadow-xl">
                    {(['en', 'zh', 'ja'] as const).map((l) => {
                      const label = l === 'en' ? 'English' : l === 'zh' ? '中文' : '日本語';
                      return (
                        <a
                          key={l}
                          href={`/${l}/create`}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface2)]"
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
                {t('nav.submitCta')} →
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto min-h-0 h-[calc(100vh-56px-73px)] w-full max-w-7xl overflow-hidden rounded-none border-x border-[var(--border2)] shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
          <div className="grid min-h-0 h-full w-full grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr] lg:grid-cols-[320px_1fr_360px]">
            {/* Left rail */}
            <aside className="hidden min-h-0 flex-col border-r border-[var(--border2)] bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] md:flex shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="text-[11px] font-medium tracking-[0.08em] text-[var(--text2)]">TEMPLATES</div>
              <a href={`/${locale}`} className="text-[11px] text-[var(--amber)] hover:underline">
                + My templates
              </a>
            </div>
            <div className="border-b border-[var(--border)] p-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates…"
                className="w-full rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-2">
                {filteredTemplates.map((p) => {
                  const selected = p.id === selectedId;
                  const src = p.images?.[0];
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedId(p.id);
                      }}
                      className={`group relative w-full overflow-hidden rounded-lg border transition ${
                        selected
                          ? 'border-[var(--amber)] shadow-[0_0_0_2px_color-mix(in_oklab,var(--amber)_30%,transparent)]'
                          : 'border-[var(--border)] hover:border-[var(--border2)]'
                      }`}
                      title={p.title}
                    >
                      <div
                        className="w-full bg-[var(--surface2)]"
                        style={{ aspectRatio: ratioById[p.id] ?? '4 / 3' }}
                      >
                        {src ? (
                          <CoverImage
                            src={src}
                            alt={p.title}
                            sizes="280px"
                            className="object-contain"
                            errorText={t('gallery.coverLoadFailed')}
                            onMeta={({ width, height }) => {
                              const ar = `${width} / ${height}`;
                              setRatioById((prev) => (prev[p.id] === ar ? prev : { ...prev, [p.id]: ar }));
                            }}
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-[var(--text3)]">—</div>
                        )}
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[var(--border)] p-3">
              <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-medium tracking-[0.08em] text-[var(--text2)]">ORIGINAL PROMPT</div>
                  <button
                    className="text-[11px] text-[var(--text3)] hover:text-[var(--amber)]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(item?.prompt ?? '');
                        setCopied(true);
                      } finally {
                        window.setTimeout(() => setCopied(false), 900);
                      }
                    }}
                  >
                    {copied ? t('modal.copied') : t('modal.copy')}
                  </button>
                </div>
                <div className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--text2)]">
                  {item?.prompt ?? ''}
                </div>
              </div>
            </div>
            </aside>

            {/* Center */}
            <main className="flex min-h-0 flex-col overflow-hidden bg-[var(--surface)]">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <section className="py-6">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--amber)_30%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,transparent)] px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[var(--amber)]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--amber)]" />
                    {locale === 'zh' ? 'WORKSPACE' : locale === 'ja' ? 'WORKSPACE' : 'WORKSPACE'}
                  </div>
                  <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-full border border-dashed border-[var(--border2)] bg-[var(--surface2)] text-xl text-[var(--text3)]">
                    ✦
                  </div>
                  <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
                    {hero.title}
                  </h1>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text2)] sm:text-base">
                    {hero.subtitle}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {PROMPT_GALLERY.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-3 py-1.5 text-xs text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]"
                        onClick={() => setSelectedId(p.id)}
                        title={p.title}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-[var(--border2)] bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] shadow-sm">
                <div className="border-b border-[var(--border)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-medium tracking-[0.08em] text-[var(--text2)]">PROMPT</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 py-1.5 text-[11px] text-[var(--text2)] hover:text-[var(--text)]"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(promptText);
                            setCopied(true);
                          } finally {
                            window.setTimeout(() => setCopied(false), 900);
                          }
                        }}
                      >
                        {copied ? t('modal.copied') : t('modal.copy')}
                      </button>
                      <button
                        className="rounded-lg border border-[color-mix(in_oklab,var(--amber)_35%,transparent)] bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] px-3 py-1.5 text-[11px] text-[var(--amber2)]"
                        onClick={() => setPromptText((x) => x.trim() + (x.includes('highly detailed') ? '' : ', highly detailed'))}
                      >
                        ✨ Enhance
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="op-create-prompt"
                    className="h-48 w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-4 text-[12.5px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={locale === 'zh' ? '描述你想生成的图片…' : locale === 'ja' ? '生成したい画像を説明…' : 'Describe the image you want to generate…'}
                  />

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text3)]">
                    <span>{promptText.length} / 2000</span>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 rounded-full border border-[var(--ctl-border)] bg-[var(--ctl-bg)] px-3 text-[12px] text-[var(--text2)] outline-none hover:bg-[var(--ctl-hover)]"
                      value={provider}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === 'internal') {
                          setKeyDialogOpen(false);
                          setProvider('internal');
                          return;
                        }
                        prevProviderRef.current = provider;
                        setProvider(next);
                        setKeyDialogProvider(next);
                        setKeyDraft(apiKeyByProviderRef.current[next] || '');
                        setKeyDialogOpen(true);
                      }}
                      title={t('gen.provider')}
                    >
                      <option value="internal">internal</option>
                      <option value="atlascloud">atlascloud</option>
                      <option value="replicate">replicate</option>
                    </select>

                  <span className="rounded-full border border-[var(--ctl-border)] bg-[var(--ctl-bg)] px-3 py-2 text-[12px] text-[var(--text2)]">
                    {item?.model ?? 'GPT Image 2'}
                  </span>

                  <select
                    className="h-9 rounded-full border border-[var(--ctl-border)] bg-[var(--ctl-bg)] px-3 text-[12px] text-[var(--text2)] outline-none hover:bg-[var(--ctl-hover)]"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    title={t('gen.aspectRatio')}
                  >
                    {capabilities.aspectRatios.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-full border border-[var(--ctl-border)] bg-[var(--ctl-bg)] px-3 text-[12px] text-[var(--text2)] outline-none hover:bg-[var(--ctl-hover)]"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    title={t('gen.quality')}
                  >
                    {capabilities.qualities.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>

                  <select
                    className="h-9 rounded-full border border-[var(--ctl-border)] bg-[var(--ctl-bg)] px-3 text-[12px] text-[var(--text2)] outline-none hover:bg-[var(--ctl-hover)]"
                    value={String(count)}
                    onChange={(e) => setCount(Number(e.target.value))}
                    title={t('gen.count')}
                  >
                    {Array.from({ length: capabilities.maxCount }, (_, i) => String(i + 1)).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>

                  <button
                    disabled={!canGenerate}
                    onClick={onGenerate}
                    className="ml-auto h-9 rounded-full bg-[var(--amber)] px-5 text-[12px] font-semibold text-[var(--bg)] disabled:opacity-50"
                  >
                    {uiState === 'queued' || uiState === 'running' ? t('gen.generating') : t('gen.generate')}
                  </button>
                  </div>
                </div>
              </div>

              {uiState === 'failed' ? (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {t('gen.failedPrefix')}
                  {error || t('gen.tryAgain')}
                </div>
              ) : null}

              <section className="mt-10">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-[var(--text)]">
                      {locale === 'zh' ? '热门模板' : locale === 'ja' ? '人気テンプレート' : 'Popular AI Templates'}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text2)]">
                      {locale === 'zh'
                        ? '用模板更快开始，点击即可套用到生成器。'
                        : locale === 'ja'
                          ? 'テンプレートから素早く開始。クリックで生成器に適用。'
                          : 'Start faster with a template. Click to apply.'}
                    </div>
                  </div>
                  <a
                    href={`/${locale}`}
                    className="text-xs text-[var(--text3)] hover:text-[var(--amber)]"
                    title="All Templates"
                  >
                    {locale === 'zh' ? '全部模板 →' : locale === 'ja' ? 'すべて →' : 'All Templates →'}
                  </a>
                </div>

                <div className="mt-4 columns-1 gap-4 sm:columns-2">
                  {PROMPT_GALLERY.slice(0, 50).map((p) => {
                    const src = p.images?.[0];
                    return (
                      <PromptGalleryCard
                        key={p.id}
                        item={p}
                        coverSrc={src}
                        coverSizes="(max-width: 1024px) 100vw, 600px"
                        coverAspectRatio={ratioById[p.id] ?? '4 / 3'}
                        modelBadge={p.model}
                        showModelBadge={false}
                        showDescription={false}
                        showTags={false}
                        showAuthor={false}
                        description={''}
                        tags={[]}
                        aspectTag={null}
                        authorLabel={null}
                        authorUrl={null}
                        coverErrorText={t('gallery.coverLoadFailed')}
                        onMeta={({ width, height }) => {
                          const ar = `${width} / ${height}`;
                          setRatioById((prev) => (prev[p.id] === ar ? prev : { ...prev, [p.id]: ar }));
                        }}
                        onCardClick={() => {
                          setSelectedId(p.id);
                          const el = document.getElementById('op-create-prompt');
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        onImageClick={() => {
                          setSelectedId(p.id);
                          const el = document.getElementById('op-create-prompt');
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      />
                    );
                  })}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-center text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">{hero.featuresTitle}</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-3">
                  {hero.features.map((f) => (
                    <div key={f.t}>
                      <div className="text-base font-semibold text-[var(--text)]">{f.t}</div>
                      <div className="mt-2 text-sm leading-relaxed text-[var(--text2)]">{f.d}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-center text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">{hero.howTitle}</h2>
                <ol className="mt-4 grid gap-3 text-sm text-[var(--text2)]">
                  {hero.howSteps.map((s, i) => (
                    <li key={s} className="flex gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border2)] bg-[var(--surface2)] text-xs text-[var(--text)]">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-10">
                <h2 className="text-center text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">{hero.whyTitle}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {hero.whyPoints.map((p) => (
                    <div key={p} className="flex gap-2 text-sm text-[var(--text2)]">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--amber)]" />
                      <span className="leading-relaxed">{p}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-center text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">{hero.sayTitle}</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-3">
                  {hero.says.map((x) => (
                    <figure key={x.q} className="text-sm text-[var(--text2)]">
                      <blockquote className="leading-relaxed">“{x.q}”</blockquote>
                      <figcaption className="mt-2 text-xs text-[var(--text3)]">— {x.a}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-center text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">{hero.faqTitle}</h2>
                <div className="mt-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  {hero.faqs.map((f) => (
                    <details key={f.q} className="group px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text)]">
                        <div className="flex items-center justify-between gap-3">
                          <span>{f.q}</span>
                          <span className="text-[var(--text3)] group-open:rotate-90 transition">›</span>
                        </div>
                      </summary>
                      <div className="mt-2 text-sm leading-relaxed text-[var(--text2)]">{f.a}</div>
                    </details>
                  ))}
                </div>
              </section>

              <section className="mt-10 rounded-2xl border border-[color-mix(in_oklab,var(--amber)_25%,var(--border))] bg-[color-mix(in_oklab,var(--amber)_10%,transparent)] p-6">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">{hero.ctaTitle}</div>
                    <div className="mt-1 text-sm text-[var(--text2)]">{hero.ctaSubtitle}</div>
                  </div>
                  <button
                    className="h-10 rounded-full bg-[var(--amber)] px-5 text-sm font-semibold text-[var(--bg)]"
                    onClick={() => {
                      const el = document.getElementById('op-create-prompt');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    {hero.ctaButton}
                  </button>
                </div>
              </section>

            </div>
            </main>

            {/* Right rail */}
            <aside className="hidden min-h-0 flex-col border-l border-[var(--border2)] bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] lg:flex shadow-[inset_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <div className="text-[11px] font-medium tracking-[0.08em] text-[var(--text2)]">RESULT & HISTORY</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-center justify-between text-[10px] tracking-[0.08em] text-[var(--text3)]">
                  <span>CURRENT</span>
                  <span className="font-mono text-[10px] text-[var(--text3)]">{providerJobId ?? '—'}</span>
                </div>
                <div className="mt-2">
                  {uiState === 'queued' || uiState === 'running' ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 w-full animate-pulse rounded-lg bg-[var(--surface2)]" />
                      ))}
                    </div>
                  ) : images.length ? (
                    <div className="flex flex-col gap-2">
                      {images.map((u, idx) => (
                        <div key={u} className="w-full">
                          <button
                            type="button"
                            onClick={() => openViewer(images, idx)}
                            className="group relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-left"
                            title="Fullscreen"
                            style={{ aspectRatio: ratioByUrl[u] ?? '4 / 3' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u}
                              alt=""
                              className="h-full w-full object-contain"
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                const w = img.naturalWidth || 0;
                                const h = img.naturalHeight || 0;
                                if (w > 0 && h > 0) {
                                  const ar = `${w} / ${h}`;
                                  setRatioByUrl((prev) => (prev[u] === ar ? prev : { ...prev, [u]: ar }));
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                              <a
                                href={u}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="grid h-7 w-7 place-items-center rounded-md bg-black/55 text-white/90 hover:bg-black/70"
                                title="Download"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path
                                    d="M12 3v10m0 0l4-4m-4 4l-4-4M4 17v3h16v-3"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </a>
                              <span className="grid h-7 w-7 place-items-center rounded-md bg-black/55 text-white/90">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path
                                    d="M9 3H3v6m18 0V3h-6M3 15v6h6m12-6v6h-6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </div>
                          </button>
                          <div className="mt-1 text-[10px] text-[var(--text3)]">
                            {idx + 1}/{images.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3 text-xs text-[var(--text3)]">
                      {uiState === 'failed' ? t('gen.tryAgain') : '—'}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[10px] font-medium tracking-[0.08em] text-[var(--text3)]">HISTORY</div>
                {history.length ? (
                  <div className="flex flex-col gap-3">
                    {history.map((h) => (
                      <div key={h.id} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                              setProvider(h.provider);
                              setAspectRatio(h.aspectRatio);
                              setQuality(h.quality);
                              setCount(h.count);
                              setPromptText(h.prompt);
                              setImages(h.images);
                              setProviderJobId(h.providerJobId);
                              setUiState(h.images.length ? 'succeeded' : 'idle');
                            }}
                            title={new Date(h.createdAt).toLocaleString()}
                          >
                            <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--text2)]">{h.prompt}</div>
                            <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-[var(--text3)]">
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5">
                                {h.provider}
                              </span>
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5">
                                {h.model}
                              </span>
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5">
                                {h.aspectRatio}
                              </span>
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5">
                                {h.quality}
                              </span>
                              <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5">
                                ×{h.count}
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-red-400"
                            title="Delete"
                            onClick={() => setHistory((prev) => prev.filter((x) => x.id !== h.id))}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path
                                d="M4 7h16M10 11v6m4-6v6M9 7l1-2h4l1 2m-9 0l1 14h10l1-14"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>

                        {h.images?.length ? (
                          <div className="mt-3 flex flex-col gap-2">
                            {h.images.map((u, idx) => (
                              <div key={u} className="w-full">
                                <button
                                  type="button"
                                  onClick={() => openViewer(h.images, idx)}
                                  className="group relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-left"
                                  title="Fullscreen"
                                  style={{ aspectRatio: ratioByUrl[u] ?? '4 / 3' }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={u}
                                    alt=""
                                    className="h-full w-full object-contain"
                                    onLoad={(e) => {
                                      const img = e.currentTarget;
                                      const w = img.naturalWidth || 0;
                                      const h2 = img.naturalHeight || 0;
                                      if (w > 0 && h2 > 0) {
                                        const ar = `${w} / ${h2}`;
                                        setRatioByUrl((prev) => (prev[u] === ar ? prev : { ...prev, [u]: ar }));
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                                  <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                    <a
                                      href={u}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      className="grid h-7 w-7 place-items-center rounded-md bg-black/55 text-white/90 hover:bg-black/70"
                                      title="Download"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path
                                          d="M12 3v10m0 0l4-4m-4 4l-4-4M4 17v3h16v-3"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </a>
                                    <span className="grid h-7 w-7 place-items-center rounded-md bg-black/55 text-white/90">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path
                                          d="M9 3H3v6m18 0V3h-6M3 15v6h6m12-6v6h-6"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </span>
                                  </div>
                                </button>
                                <div className="mt-1 text-[10px] text-[var(--text3)]">
                                  {idx + 1}/{h.images.length}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3 text-xs text-[var(--text3)]">
                    No history yet.
                  </div>
                )}
              </div>
            </div>
            </aside>
          </div>
        </div>

        <footer className="border-t border-[var(--border)] px-6 py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="text-sm text-[var(--text2)]">{t('footer.tagline')}</div>
            <div className="flex flex-wrap gap-5 text-xs text-[var(--text3)]">
              {[
                t('footer.links.github'),
                t('footer.links.docs'),
                t('footer.links.deploy'),
                t('footer.links.pricing'),
                t('footer.links.privacy'),
              ].map((label) => (
                <a key={label} href="#" className="hover:text-[var(--text2)]">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {viewerOpen && viewerImages.length ? (
        <div
          className="fixed inset-0 z-50 bg-black/80"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewerOpen(false)}
        >
          <div
            className="relative flex h-full w-full flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
              <div className="text-xs text-white/70">
                {viewerIndex + 1}/{viewerImages.length}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewerImages[viewerIndex]}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15"
                  title="Download"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 3v10m0 0l4-4m-4 4l-4-4M4 17v3h16v-3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15"
                  onClick={() => setViewerOpen(false)}
                  title="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid flex-1 place-items-center px-4 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewerImages[viewerIndex]}
                alt=""
                className="max-h-[calc(100vh-56px-56px)] w-auto max-w-[100vw] object-contain"
              />
            </div>

            {viewerImages.length > 1 ? (
              <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
                <button
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:opacity-40"
                  disabled={viewerIndex <= 0}
                  onClick={() => setViewerIndex((i) => Math.max(0, i - 1))}
                >
                  ← Prev
                </button>
                <button
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:opacity-40"
                  disabled={viewerIndex >= viewerImages.length - 1}
                  onClick={() => setViewerIndex((i) => Math.min(viewerImages.length - 1, i + 1))}
                >
                  Next →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {keyDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setKeyDialogOpen(false);
            setProvider(prevProviderRef.current);
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">API Key for {keyDialogProvider}</div>
              <div className="mt-1 text-xs text-[var(--text2)]">
                Leave empty to use the internal server key.
              </div>
            </div>

            <div className="p-4">
              <input
                autoFocus
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="Paste your API key (optional)"
                className="h-10 w-full rounded-xl border border-[var(--border2)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="h-9 rounded-xl border border-[var(--border2)] px-4 text-sm text-[var(--text2)] hover:text-[var(--text)]"
                  onClick={() => {
                    setKeyDialogOpen(false);
                    setProvider(prevProviderRef.current);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="h-9 rounded-xl border border-[var(--border2)] px-4 text-sm text-[var(--text2)] hover:text-[var(--text)]"
                  onClick={() => {
                    const p = keyDialogProvider;
                    try {
                      localStorage.removeItem(`op_apiKey_${p}`);
                    } catch {
                      // ignore
                    }
                    setApiKeyByProvider((prev) => ({ ...prev, [p]: '' }));
                    setKeyDialogOpen(false);
                  }}
                >
                  Use internal
                </button>
                <button
                  className="h-9 rounded-xl bg-[var(--amber)] px-4 text-sm font-semibold text-[var(--bg)]"
                  onClick={() => {
                    const p = keyDialogProvider;
                    const v = keyDraft.trim();
                    try {
                      if (v) localStorage.setItem(`op_apiKey_${p}`, v);
                      else localStorage.removeItem(`op_apiKey_${p}`);
                    } catch {
                      // ignore
                    }
                    setApiKeyByProvider((prev) => ({ ...prev, [p]: v }));
                    setKeyDialogOpen(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
}

