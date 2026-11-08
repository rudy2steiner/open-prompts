import { SUPPORT_EMAIL } from '~/lib/support/email';

export type SupportPageType = 'help' | 'contact' | 'community' | 'privacy' | 'terms' | 'cookies';

type SupportDocument = {
  title: string;
  description: string;
  updated: string;
  intro: string;
  sections: { title: string; body: string }[];
};

const zh: Record<SupportPageType, SupportDocument> = {
  help: {
    title: '帮助中心',
    description: '如何浏览提示词、购买积分和生成图片。',
    updated: '更新日期：2026 年 11 月 7 日',
    intro: 'Open Prompts 提供可免费查看的提示词模板，以及按积分计费的图片生成。',
    sections: [
      { title: '查看模板', body: '图片提示词和动效提示词都可以打开、复制。全站提示词模板免费使用，不消耗积分。' },
      { title: '生成图片', body: '生成按钮会显示本次消耗的积分。没有报价的模型、质量或尺寸不能提交，也不会扣费。自带 AtlasCloud 或 Replicate 密钥时，不扣本站积分。' },
      { title: '积分与账单', body: '首次登录赠送 3 积分，只送一次。不登录也可以在当前浏览器购买。订单、积分和生成记录在账单页。月度积分到期后不再可用，购买积分会保留。' },
    ],
  },
  contact: {
    title: '联系我们',
    description: '支付、积分、生成或隐私问题的联系方式。',
    updated: '更新日期：2026 年 11 月 7 日',
    intro: `支付、积分、生成或隐私问题，请发送邮件至 ${SUPPORT_EMAIL}。`,
    sections: [
      { title: '写清楚问题', body: '请附上订单编号或生成任务编号、发生时间、所在页面和问题描述。截图有助于排查。不要发送密码、完整银行卡号、验证码或 API 密钥。' },
      { title: '邮箱', body: SUPPORT_EMAIL },
    ],
  },
  community: {
    title: '社区',
    description: '如何分享提示词，以及生成记录是否公开。',
    updated: '更新日期：2026 年 11 月 7 日',
    intro: '可以提交你有权公开的提示词模板。生成记录不会自动公开。',
    sections: [
      { title: '提交提示词', body: '使用站内提交页分享模板。公开内容需要审核后才会出现在提示词库。请只提交你有权公开的文字和图片。' },
      { title: '生成记录', body: '你的生成记录只在自己的账单里。生成一张图片不会把它发到公共社区。' },
    ],
  },
  privacy: {
    title: '隐私说明',
    description: 'Open Prompts 如何处理账户、生成和购买信息。',
    updated: '更新日期：2026 年 11 月 7 日',
    intro: '本说明描述 open-prompts.com 在账户、图片生成和购买中处理的信息。',
    sections: [
      { title: '处理的信息', body: '包括访客标识、登录后的 Google 账户标识与邮箱和头像、生成任务状态和结果、订单与积分流水，以及运行、安全和访问统计所需的技术信息。' },
      { title: '生成与支付', body: '使用本站积分生成时，提示词和参考图会经本站发送给 AtlasCloud 及对应模型服务。支付由 Stripe 处理，本站不保存完整卡号。' },
      { title: '你的选择', body: `可以停止使用、清理浏览器数据，或发邮件到 ${SUPPORT_EMAIL} 申请访问、更正或删除账户相关数据。处理前可能需要核对身份。` },
    ],
  },
  terms: {
    title: '使用条款',
    description: '使用 Open Prompts 或购买积分前请阅读。',
    updated: '更新日期：2026 年 11 月 7 日',
    intro: '结账页展示的价格、积分和订阅条件适用于当次购买。',
    sections: [
      { title: '服务', body: 'Open Prompts 提供提示词模板和图片生成。模板可免费查看和复制。生成按提交前显示的积分扣费，失败会退回本次预扣积分。' },
      { title: '账户与素材', body: '可以访客身份使用，也可以用 Google 登录。请只上传你有权使用的图片和文字。清理访客 Cookie 或更换浏览器，可能无法再访问该浏览器上的订单和积分。' },
      { title: '付款', body: 'Stripe 处理付款。一次性积分在支付成功后记入购买余额。月度积分在对应账单支付成功后发放，并在周期结束时失效。' },
    ],
  },
  cookies: {
    title: 'Cookie 政策',
    description: 'Open Prompts 使用的 Cookie 和浏览器存储。',
    updated: '更新日期：2026 年 11 月 7 日',
    intro: '本站用 Cookie 维持身份、语言和登录安全。',
    sections: [
      { title: '必要 Cookie', body: 'op_guest 用于识别访客，约 90 天，只在服务端保存其哈希。登录会话、状态和 CSRF Cookie 用于登录安全。NEXT_LOCALE 用于记住语言。' },
      { title: '统计', body: '页面会加载 Pageview 统计脚本。该请求可能按其自身规则处理设备、网络和访问数据。' },
      { title: '如何管理', body: '可以在浏览器里查看、阻止或删除 Cookie。清除 op_guest 后，可能失去当前浏览器上的访客订单、积分和图片入口。建议先登录，把购买记录合并到账户。' },
    ],
  },
};

const en: Record<SupportPageType, SupportDocument> = {
  help: {
    title: 'Help Center',
    description: 'How to browse prompts, buy credits, and generate images.',
    updated: 'Updated November 7, 2026',
    intro: 'Open Prompts offers prompt templates you can read for free, and image generation billed in credits.',
    sections: [
      { title: 'Browse templates', body: 'Image prompts and motion prompts can be opened and copied. Every prompt template on the site is free to use and does not spend credits.' },
      { title: 'Generate an image', body: 'The generate button shows the credits for that request. A model, quality, or size without a price cannot be submitted and is not charged. Sending your own AtlasCloud or Replicate key does not spend site credits.' },
      { title: 'Credits and billing', body: 'The first sign-in grants 3 credits once. You can also buy in the current browser without an account. Orders, credits, and generations are on the billing page. Monthly credits expire at the end of their period. Purchased credits remain.' },
    ],
  },
  contact: {
    title: 'Contact',
    description: 'How to reach us about payments, credits, generation, or privacy.',
    updated: 'Updated November 7, 2026',
    intro: `For payment, credit, generation, or privacy questions, email ${SUPPORT_EMAIL}.`,
    sections: [
      { title: 'What to include', body: 'Include the order or generation id, the time, the page, and a description. Screenshots help. Do not send passwords, full card numbers, verification codes, or API keys.' },
      { title: 'Email', body: SUPPORT_EMAIL },
    ],
  },
  community: {
    title: 'Community',
    description: 'How to share a prompt, and whether generations are public.',
    updated: 'Updated November 7, 2026',
    intro: 'You can submit a prompt template you have the right to publish. Generations are not published automatically.',
    sections: [
      { title: 'Submit a prompt', body: 'Use the submit page to share a template. Public entries appear in the library after review. Submit only text and images you have the right to share.' },
      { title: 'Generations', body: 'Your generation history stays on your billing page. Generating an image does not post it to a public community.' },
    ],
  },
  privacy: {
    title: 'Privacy',
    description: 'How Open Prompts handles accounts, generation, and purchases.',
    updated: 'Updated November 7, 2026',
    intro: 'This notice describes information processed for accounts, image generation, and purchases on open-prompts.com.',
    sections: [
      { title: 'Information processed', body: 'This includes a guest identifier, Google account id, email, and avatar after sign-in, generation status and results, orders and credit entries, and technical data needed to run, secure, and measure the site.' },
      { title: 'Generation and payments', body: 'When you generate with site credits, the prompt and reference images are sent through this site to AtlasCloud and the model provider. Stripe processes payments. Full card numbers are not stored here.' },
      { title: 'Your choices', body: `You can stop using the site, clear browser data, or email ${SUPPORT_EMAIL} to access, correct, or delete account data. Identity may be checked first.` },
    ],
  },
  terms: {
    title: 'Terms',
    description: 'Read these terms before using Open Prompts or buying credits.',
    updated: 'Updated November 7, 2026',
    intro: 'The price, credits, and subscription conditions shown at checkout apply to that purchase.',
    sections: [
      { title: 'The service', body: 'Open Prompts provides prompt templates and image generation. Templates are free to view and copy. Generation spends the credits shown before submit. A failed generation returns the reserved credits.' },
      { title: 'Accounts and material', body: 'You can continue as a guest or sign in with Google. Upload only images and text you have the right to use. Clearing the guest cookie or changing browsers can remove access to orders and credits stored on that browser.' },
      { title: 'Payments', body: 'Stripe processes payments. One-time credits are added to the purchased balance after a successful payment. Monthly credits are granted when the invoice is paid and expire at the end of that period.' },
    ],
  },
  cookies: {
    title: 'Cookies',
    description: 'Cookies and browser storage used by Open Prompts.',
    updated: 'Updated November 7, 2026',
    intro: 'The site uses cookies to keep identity, language, and sign-in security.',
    sections: [
      { title: 'Essential cookies', body: 'op_guest identifies a guest for about 90 days. Only its hash is stored on the server. Session, state, and CSRF cookies support sign-in. NEXT_LOCALE remembers the language.' },
      { title: 'Analytics', body: 'Pages load the Pageview analytics script. That request may process device, network, and visit data under its own rules.' },
      { title: 'Your controls', body: 'Your browser can inspect, block, or delete cookies. Clearing op_guest can remove access to guest orders, credits, and images in that browser. Sign in first if you want purchases merged into an account.' },
    ],
  },
};

export function supportDocument(locale: string, type: SupportPageType): SupportDocument {
  return (locale === 'zh' ? zh : en)[type];
}
