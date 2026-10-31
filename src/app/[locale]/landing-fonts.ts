import { DM_Sans, Playfair_Display } from 'next/font/google';

export const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  // 慢线路优先传输 HTML 和封面，字体在需要时按普通优先级加载。
  preload: false,
  variable: '--font-playfair',
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  // 慢线路优先传输 HTML 和封面，字体在需要时按普通优先级加载。
  preload: false,
  variable: '--font-dm-sans',
});

export const landingFontClassName = `${playfairDisplay.variable} ${dmSans.variable} op-landing-root`;
