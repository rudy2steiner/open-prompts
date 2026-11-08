export type PlanKind = 'one_time' | 'monthly';
export type PaymentMethod = 'card' | 'wechat_pay';
export type CheckoutCurrency = 'usd' | 'cny';

export type PurchasablePlan = {
  id: 'one-time' | 'one-time-9' | 'one-time-19' | 'monthly';
  kind: PlanKind;
  amount: number;
  currency: 'usd';
  cnyAmount: number | null;
  credits: number;
  /** null 表示批量下载不限量。 */
  downloadLimit: number | null;
};

/** 入门档：售价的 50% 按 $0.01 实扣换成积分。 */
export function creditsForPriceCents(amountCents: number): number {
  return Math.floor(amountCents * 50 / 100);
}

export const PURCHASABLE_PLANS: PurchasablePlan[] = [
  { id: 'one-time', kind: 'one_time', amount: 490, currency: 'usd', cnyAmount: 3500, credits: 245, downloadLimit: 500 },
  { id: 'one-time-9', kind: 'one_time', amount: 990, currency: 'usd', cnyAmount: 7100, credits: 619, downloadLimit: 1000 },
  { id: 'one-time-19', kind: 'one_time', amount: 1990, currency: 'usd', cnyAmount: 14300, credits: 1499, downloadLimit: null },
  { id: 'monthly', kind: 'monthly', amount: 990, currency: 'usd', cnyAmount: null, credits: 749, downloadLimit: null },
];

export function checkoutQuote(plan: PurchasablePlan, paymentMethod: PaymentMethod): {
  amount: number;
  currency: CheckoutCurrency;
  paymentMethod: PaymentMethod;
} | null {
  if (paymentMethod === 'card') {
    return { amount: plan.amount, currency: plan.currency, paymentMethod };
  }
  if (plan.kind !== 'one_time' || plan.cnyAmount === null) return null;
  return { amount: plan.cnyAmount, currency: 'cny', paymentMethod };
}

/** 一张标准图的美元价格。标准图按 2 积分计。 */
export function imagePrice(plan: PurchasablePlan): string {
  const dollars = Number((plan.amount * 2 / plan.credits / 100).toFixed(3));
  const digits = Number(dollars.toFixed(2)) === dollars ? 2 : 3;
  return `$${dollars.toFixed(digits)}`;
}

/** 每张标准图比入门少付的百分比。入门本身为 0。 */
export function savingsVersusStarter(plan: PurchasablePlan): number {
  const starter = PURCHASABLE_PLANS[0];
  const starterUnit = starter.amount / starter.credits;
  const unit = plan.amount / plan.credits;
  return Math.round((1 - unit / starterUnit) * 100);
}

/** 已购一次性套餐取最高累计额度；有效月订阅参与比较。未购买为 0，不限量为 null。 */
export function downloadLimitForPlans(productIds: readonly string[], monthlyActive: boolean): number | null {
  const owned = new Set(productIds);
  return PURCHASABLE_PLANS.reduce<number | null>((limit, plan) => {
    const included = plan.kind === 'monthly' ? monthlyActive : owned.has(plan.id);
    if (!included || limit === null) return limit;
    return plan.downloadLimit === null ? null : Math.max(limit, plan.downloadLimit);
  }, 0);
}

export function findPurchasablePlan(id: string): PurchasablePlan | null {
  return PURCHASABLE_PLANS.find((plan) => plan.id === id) ?? null;
}
