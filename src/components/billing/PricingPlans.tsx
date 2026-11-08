'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { queuePricingClick } from '~/lib/analytics/events';
import { checkoutQuote, PURCHASABLE_PLANS, savingsVersusStarter, type PaymentMethod, type PurchasablePlan } from '~/lib/billing/catalog';
import { approximateImageCount, STARTER_CREDIT_MATRIX } from '~/lib/billing/quotes';

const PLAN_NAME: Record<PurchasablePlan['id'], 'planStarter' | 'planPopular' | 'planPlus' | 'planMonthly'> = {
  'one-time': 'planStarter',
  'one-time-9': 'planPopular',
  'one-time-19': 'planPlus',
  monthly: 'planMonthly',
};

export function PricingPlans({ locale }: { locale: string }) {
  const t = useTranslations('OpenPrompts');
  const { status } = useSession();
  const [tab, setTab] = useState<'one_time' | 'monthly'>('one_time');
  const [selectedId, setSelectedId] = useState<PurchasablePlan['id']>('one-time-9');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ planId: PurchasablePlan['id']; paymentMethod: PaymentMethod } | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const plans = PURCHASABLE_PLANS.filter((plan) => plan.kind === tab);

  useEffect(() => {
    if (!pendingPurchase) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingPurchase(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pendingPurchase]);

  const buy = async (planId: string, paymentMethod: PaymentMethod) => {
    setError(null);
    setBusyId(`${planId}:${paymentMethod}`);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId, locale, paymentMethod }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.url !== 'string') {
        setError(t('pricingPage.checkoutError'));
        setBusyId(null);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError(t('pricingPage.checkoutError'));
      setBusyId(null);
    }
  };

  const startPurchase = (planId: PurchasablePlan['id'], paymentMethod: PaymentMethod) => {
    const plan = PURCHASABLE_PLANS.find((item) => item.id === planId);
    const quote = plan ? checkoutQuote(plan, paymentMethod) : null;
    if (plan && quote) {
      queuePricingClick({
        planId: plan.id,
        price: quote.currency === 'cny' ? `¥${quote.amount / 100}` : `$${(quote.amount / 100).toFixed(2)}`,
        locale: document.documentElement.lang || locale,
        page: window.location.pathname,
        billingType: plan.kind,
        paymentMethod,
        currency: quote.currency,
      });
    }
    setSelectedId(planId);
    if (status === 'authenticated') {
      void buy(planId, paymentMethod);
      return;
    }
    setPendingPurchase({ planId, paymentMethod });
  };

  const loginWithGoogle = async () => {
    setLoginPending(true);
    setError(null);
    try {
      await signIn('google', { callbackUrl: window.location.href });
    } catch {
      setLoginPending(false);
      setError(t('pricingPage.checkoutError'));
    }
  };
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 md:px-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{t('pricingPage.title')}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text3)]">{t('pricingPage.description')}</p>
      </div>
      <div className="mx-auto mt-8 flex w-max max-w-full gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-1" role="group" aria-label={t('pricingPage.title')}>
        {(['one_time', 'monthly'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            className={`min-w-28 rounded-md px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)]'}`}
            onClick={() => {
              setTab(value);
              setSelectedId(value === 'monthly' ? 'monthly' : 'one-time-9');
            }}
          >
            <span>{value === 'one_time' ? t('pricingPage.oneTime') : t('pricingPage.monthlyTab')}</span>
            {value === 'monthly' ? (
              <span className="ml-2 rounded-full bg-[color-mix(in_oklab,var(--amber)_18%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--amber2)]">
                {t('pricingPage.subscriptionSave')}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className={`mx-auto mt-7 grid max-w-5xl gap-6 ${plans.length === 1 ? 'max-w-sm' : 'md:grid-cols-3'}`} role="radiogroup" aria-label={t('pricingPage.title')}>
        {plans.map((plan) => {
          const selected = selectedId === plan.id;
          const recommended = plan.id === 'one-time-9' || plan.id === 'monthly';
          return (
            <article
              key={plan.id}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => setSelectedId(plan.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedId(plan.id);
                }
              }}
              className={`relative flex cursor-pointer flex-col rounded-lg border bg-[var(--surface)] p-7 ${selected ? 'border-[var(--amber)] shadow-[0_0_0_2px_color-mix(in_oklab,var(--amber)_18%,transparent)]' : recommended ? 'border-[var(--text)] shadow-md' : 'border-[var(--border)]'}`}
            >
              {recommended ? <span className="absolute right-4 top-4 rounded-full bg-[var(--text)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--bg)]">{t('pricingPage.recommended')}</span> : null}
              <h2 className="text-xl font-semibold text-[var(--text)]">{t(`pricingPage.${PLAN_NAME[plan.id]}`)}</h2>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
                ${(plan.amount / 100).toFixed(2)}
                {plan.kind === 'monthly' ? <span className="text-base font-medium text-[var(--text3)]">{t('pricingPage.perMonth')}</span> : null}
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">{t('pricingPage.credits', { count: plan.credits })}</p>
              <p className="mt-1 text-sm text-[var(--text3)]">{t('pricingPage.approxImages', { count: approximateImageCount(plan.credits) })}</p>
              <ul className="my-6 grid flex-1 gap-2 text-sm text-[var(--text)]">
                {plan.id === 'monthly' ? (
                  <li className="font-medium text-[var(--amber)]">{t('pricingPage.monthlyBonus')}</li>
                ) : savingsVersusStarter(plan) > 0 ? (
                  <li className="font-medium text-[var(--amber)]">{t('pricingPage.save', { percent: savingsVersusStarter(plan) })}</li>
                ) : null}
                <li>{t('pricingPage.allTemplates')}</li>
                <li>{plan.downloadLimit === null ? t('pricingPage.batchDownloadUnlimited') : t('pricingPage.batchDownload', { count: plan.downloadLimit })}</li>
              </ul>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={busyId === `${plan.id}:card`}
                  className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold ${selected ? 'bg-[var(--amber)] text-[var(--bg)]' : 'border border-[var(--border2)] bg-transparent text-[var(--text)]'}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    startPurchase(plan.id, 'card');
                  }}
                >
                  {busyId === `${plan.id}:card` ? '…' : plan.kind === 'monthly' ? t('pricingPage.subscribe') : t('pricingPage.buy')}
                </button>
                {locale === 'zh' && plan.kind === 'one_time' && plan.cnyAmount !== null ? (
                  <button
                    type="button"
                    disabled={busyId === `${plan.id}:wechat_pay`}
                    className="w-full rounded-md border border-[var(--border2)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      startPurchase(plan.id, 'wechat_pay');
                    }}
                  >
                    {busyId === `${plan.id}:wechat_pay` ? '…' : t('pricingPage.wechatPay')}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-5 text-[var(--text3)]">{t('pricingPage.note')}</p>
      {error ? <p className="mt-3 text-center text-sm text-red-600" role="alert">{error}</p> : null}
      <section className="mx-auto mt-14 max-w-3xl border-t border-[var(--border)] pt-8">
        <h2 className="text-xl font-semibold text-[var(--text)]">{t('pricingPage.rateTitle')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text3)]">{t('pricingPage.rateNote')}</p>
        <table className="mt-5 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text3)]">
              <th className="py-3 font-medium">{t('pricingPage.rateModel')}</th>
              <th className="py-3 text-right font-medium">{t('pricingPage.rateText')}</th>
              <th className="py-3 text-right font-medium">{t('pricingPage.rateReference')}</th>
              <th className="py-3 text-right font-medium">{t('pricingPage.rateEdit')}</th>
            </tr>
          </thead>
          <tbody>
            {STARTER_CREDIT_MATRIX.map((row) => (
              <tr key={row.model} className="border-b border-[var(--border)] last:border-0">
                <th className="py-3 font-medium">{row.model}</th>
                <td className="py-3 text-right">{row.text}</td>
                <td className="py-3 text-right">{row.reference}</td>
                <td className="py-3 text-right">{row.edit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {pendingPurchase && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/45 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setPendingPurchase(null); }}>
          <section className="relative w-full max-w-[430px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-7 text-left text-[var(--text)] shadow-[0_24px_70px_rgba(17,17,17,0.27)]" role="dialog" aria-modal="true" aria-labelledby="pricing-auth-title">
            <button type="button" className="absolute right-4 top-3.5 h-8 w-8 text-2xl leading-none text-[var(--text3)]" aria-label={t('pricingPage.dialogClose')} onClick={() => setPendingPurchase(null)}>×</button>
            <h2 id="pricing-auth-title" className="pr-10 text-[23px] font-semibold leading-tight">{t('pricingPage.dialogTitle')}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--text3)]">{t('pricingPage.dialogBody')}</p>
            <div className="mt-6 grid gap-2.5">
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border2)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold" disabled={loginPending} onClick={() => void loginWithGoogle()}>
                <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
                </svg>
                {loginPending ? '…' : t('pricingPage.dialogLogin')}
              </button>
              <button type="button" className="w-full rounded-md border border-[var(--border2)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold" disabled={loginPending} onClick={() => { const purchase = pendingPurchase; setPendingPurchase(null); void buy(purchase.planId, purchase.paymentMethod); }}>{t('pricingPage.dialogGuest')}</button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </main>
  );
}
