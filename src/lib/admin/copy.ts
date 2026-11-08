export type AdminCopy = {
  title: string;
  users: string;
  generations: string;
  events: string;
  review: string;
  templates: string;
  empty: string;
  previous: string;
  next: string;
  perPage: string;
  user: string;
  type: string;
  balance: string;
  spent: string;
  created: string;
  model: string;
  credits: string;
  status: string;
  plan: string;
  page: string;
  guest: string;
  member: string;
  purchased: string;
  monthly: string;
  summaryUsers: string;
  summarySpent: string;
  summaryGenerations: string;
  summaryEvents: string;
};

const en: AdminCopy = {
  title: 'Admin',
  users: 'Users & credits',
  generations: 'Generations',
  events: 'Pricing clicks',
  review: 'Review queue',
  templates: 'My templates',
  empty: 'No records yet',
  previous: 'Previous',
  next: 'Next',
  perPage: '20 / page',
  user: 'User',
  type: 'Type',
  balance: 'Balance',
  spent: 'Spent',
  created: 'Created',
  model: 'Model',
  credits: 'Credits',
  status: 'Status',
  plan: 'Plan',
  page: 'Page',
  guest: 'Guest',
  member: 'User',
  purchased: 'Purchased',
  monthly: 'Monthly',
  summaryUsers: 'Users',
  summarySpent: 'Credits spent',
  summaryGenerations: 'Generations',
  summaryEvents: 'Pricing clicks',
};

const copy: Record<string, AdminCopy> = {
  en,
  zh: {
    ...en,
    title: '管理后台',
    users: '用户与积分',
    generations: '生成记录',
    events: '定价点击',
    review: '审核队列',
    templates: '提示词模板',
    empty: '暂无记录',
    previous: '上一页',
    next: '下一页',
    perPage: '每页 20 条',
    user: '用户',
    type: '类型',
    balance: '余额',
    spent: '已消耗',
    created: '时间',
    model: '模型',
    credits: '积分',
    status: '状态',
    plan: '套餐',
    page: '页面',
    guest: '访客',
    member: '用户',
    purchased: '购买',
    monthly: '月度',
    summaryUsers: '用户',
    summarySpent: '已消耗积分',
    summaryGenerations: '生成',
    summaryEvents: '定价点击',
  },
  ja: { ...en, title: '管理画面', users: 'ユーザーとクレジット', generations: '生成記録', events: '料金クリック', review: '審査', templates: 'マイテンプレート', empty: '記録はまだありません', previous: '前へ', next: '次へ', user: 'ユーザー', type: '種類', balance: '残高', spent: '消費', created: '日時', model: 'モデル', credits: 'クレジット', status: '状態', plan: 'プラン', page: 'ページ', guest: 'ゲスト', member: 'ユーザー', purchased: '購入', monthly: '月額', summaryUsers: 'ユーザー', summarySpent: '消費クレジット', summaryGenerations: '生成', summaryEvents: '料金クリック' },
  ko: { ...en, title: '관리자', users: '사용자와 크레딧', generations: '생성 기록', events: '요금 클릭', review: '검토', templates: '내 템플릿', empty: '기록이 없습니다', previous: '이전', next: '다음', user: '사용자', type: '유형', balance: '잔액', spent: '사용', created: '시간', model: '모델', credits: '크레딧', status: '상태', plan: '요금제', page: '페이지', guest: '게스트', member: '사용자', purchased: '구매', monthly: '월간', summaryUsers: '사용자', summarySpent: '사용한 크레딧', summaryGenerations: '생성', summaryEvents: '요금 클릭' },
  fr: { ...en, title: 'Administration', users: 'Utilisateurs et crédits', generations: 'Générations', events: 'Clics tarif', review: 'File de revue', templates: 'Mes modèles', empty: 'Aucun enregistrement', previous: 'Précédent', next: 'Suivant', user: 'Utilisateur', type: 'Type', balance: 'Solde', spent: 'Consommé', created: 'Date', model: 'Modèle', credits: 'Crédits', status: 'Statut', plan: 'Offre', page: 'Page', guest: 'Invité', member: 'Utilisateur', purchased: 'Achat', monthly: 'Mensuel', summaryUsers: 'Utilisateurs', summarySpent: 'Crédits consommés', summaryGenerations: 'Générations', summaryEvents: 'Clics tarif' },
  de: { ...en, title: 'Verwaltung', users: 'Nutzer und Credits', generations: 'Generierungen', events: 'Preis-Klicks', review: 'Prüfung', templates: 'Meine Vorlagen', empty: 'Noch keine Einträge', previous: 'Zurück', next: 'Weiter', user: 'Nutzer', type: 'Typ', balance: 'Guthaben', spent: 'Verbraucht', created: 'Zeit', model: 'Modell', credits: 'Credits', status: 'Status', plan: 'Paket', page: 'Seite', guest: 'Gast', member: 'Nutzer', purchased: 'Kauf', monthly: 'Monatlich', summaryUsers: 'Nutzer', summarySpent: 'Verbrauchte Credits', summaryGenerations: 'Generierungen', summaryEvents: 'Preis-Klicks' },
  es: { ...en, title: 'Administración', users: 'Usuarios y créditos', generations: 'Generaciones', events: 'Clics de precio', review: 'Revisión', templates: 'Mis plantillas', empty: 'Sin registros', previous: 'Anterior', next: 'Siguiente', user: 'Usuario', type: 'Tipo', balance: 'Saldo', spent: 'Consumido', created: 'Fecha', model: 'Modelo', credits: 'Créditos', status: 'Estado', plan: 'Plan', page: 'Página', guest: 'Invitado', member: 'Usuario', purchased: 'Compra', monthly: 'Mensual', summaryUsers: 'Usuarios', summarySpent: 'Créditos consumidos', summaryGenerations: 'Generaciones', summaryEvents: 'Clics de precio' },
  pt: { ...en, title: 'Administração', users: 'Usuários e créditos', generations: 'Gerações', events: 'Cliques de preço', review: 'Revisão', templates: 'Meus modelos', empty: 'Sem registros', previous: 'Anterior', next: 'Próxima', user: 'Usuário', type: 'Tipo', balance: 'Saldo', spent: 'Consumido', created: 'Data', model: 'Modelo', credits: 'Créditos', status: 'Estado', plan: 'Plano', page: 'Página', guest: 'Convidado', member: 'Usuário', purchased: 'Compra', monthly: 'Mensal', summaryUsers: 'Usuários', summarySpent: 'Créditos consumidos', summaryGenerations: 'Gerações', summaryEvents: 'Cliques de preço' },
};

export function adminCopy(locale: string): AdminCopy {
  return copy[locale] ?? en;
}
