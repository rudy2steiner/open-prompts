export type AccountBillingCopy = {
  title: string;
  description: string;
  available: string;
  monthly: string;
  purchased: string;
  manage: string;
  orders: string;
  credits: string;
  generations: string;
  emptyOrders: string;
  emptyCredits: string;
  emptyGenerations: string;
  product: string;
  amount: string;
  status: string;
  date: string;
  change: string;
  balance: string;
  model: string;
  cost: string;
  download: string;
  previous: string;
  next: string;
  page: string;
  kinds: Record<string, string>;
};

const en: AccountBillingCopy = {
  title: 'Credits and purchases',
  description: 'See your available credits and recent orders.',
  available: 'Available credits',
  monthly: 'Monthly credits',
  purchased: 'Purchased credits',
  manage: 'Manage subscription',
  orders: 'Orders',
  credits: 'Credit history',
  generations: 'Generations',
  emptyOrders: 'No purchases yet.',
  emptyCredits: 'No credit changes yet.',
  emptyGenerations: 'No generations yet.',
  product: 'Product',
  amount: 'Amount',
  status: 'Status',
  date: 'Date',
  change: 'Change',
  balance: 'Balance',
  model: 'Model',
  cost: 'Credits',
  download: 'Download',
  previous: 'Previous',
  next: 'Next',
  page: 'Page',
  kinds: { purchase: 'Purchase', signup: 'Signup', reserve: 'Generation', refund: 'Refund', merge: 'Merge' },
};

const copy: Record<string, AccountBillingCopy> = {
  en,
  zh: {
    ...en,
    title: '积分与购买记录',
    description: '查看可用积分和最近订单。',
    available: '可用积分',
    monthly: '月度积分',
    purchased: '购买积分',
    manage: '管理订阅',
    orders: '订单记录',
    credits: '积分记录',
    generations: '生成记录',
    emptyOrders: '还没有购买记录。',
    emptyCredits: '还没有积分变动。',
    emptyGenerations: '还没有生成记录。',
    product: '商品',
    amount: '金额',
    status: '状态',
    date: '日期',
    change: '变动',
    balance: '余额',
    model: '模型',
    cost: '消耗积分',
    download: '下载',
    previous: '上一页',
    next: '下一页',
    page: '页码',
    kinds: { purchase: '购买', signup: '注册赠送', reserve: '生成', refund: '退回', merge: '合并' },
  },
  ja: { ...en, title: 'クレジットと購入履歴', description: '使えるクレジットと最近の注文を確認できます。', available: '利用可能クレジット', monthly: '月額クレジット', purchased: '購入クレジット', manage: 'サブスクリプション管理', orders: '注文', credits: 'クレジット履歴', generations: '生成記録', emptyOrders: '購入はまだありません。', emptyCredits: 'クレジットの変動はまだありません。', emptyGenerations: '生成記録はまだありません。', product: '商品', amount: '金額', status: '状態', date: '日付', change: '変動', balance: '残高', model: 'モデル', cost: '消費', download: 'ダウンロード', previous: '前へ', next: '次へ', page: 'ページ', kinds: { purchase: '購入', signup: '登録', reserve: '生成', refund: '返金', merge: '統合' } },
  ko: { ...en, title: '크레딧과 구매 기록', description: '사용할 수 있는 크레딧과 최근 주문을 확인하세요.', available: '사용 가능 크레딧', monthly: '월간 크레딧', purchased: '구매 크레딧', manage: '구독 관리', orders: '주문', credits: '크레딧 기록', generations: '생성 기록', emptyOrders: '구매 기록이 없습니다.', emptyCredits: '크레딧 변동이 없습니다.', emptyGenerations: '생성 기록이 없습니다.', product: '상품', amount: '금액', status: '상태', date: '날짜', change: '변동', balance: '잔액', model: '모델', cost: '사용', download: '다운로드', previous: '이전', next: '다음', page: '페이지', kinds: { purchase: '구매', signup: '가입', reserve: '생성', refund: '환불', merge: '병합' } },
  fr: { ...en, title: 'Crédits et achats', description: 'Consultez vos crédits disponibles et vos commandes récentes.', available: 'Crédits disponibles', monthly: 'Crédits mensuels', purchased: 'Crédits achetés', manage: 'Gérer l’abonnement', orders: 'Commandes', credits: 'Historique', generations: 'Générations', emptyOrders: 'Aucun achat.', emptyCredits: 'Aucun mouvement de crédits.', emptyGenerations: 'Aucune génération.', product: 'Produit', amount: 'Montant', status: 'Statut', date: 'Date', change: 'Variation', balance: 'Solde', model: 'Modèle', cost: 'Crédits', download: 'Télécharger', previous: 'Précédent', next: 'Suivant', page: 'Page', kinds: { purchase: 'Achat', signup: 'Inscription', reserve: 'Génération', refund: 'Remboursement', merge: 'Fusion' } },
  de: { ...en, title: 'Credits und Käufe', description: 'Verfügbare Credits und letzte Bestellungen.', available: 'Verfügbare Credits', monthly: 'Monatliche Credits', purchased: 'Gekaufte Credits', manage: 'Abo verwalten', orders: 'Bestellungen', credits: 'Credit-Verlauf', generations: 'Generierungen', emptyOrders: 'Noch keine Käufe.', emptyCredits: 'Noch keine Credit-Bewegung.', emptyGenerations: 'Noch keine Generierungen.', product: 'Produkt', amount: 'Betrag', status: 'Status', date: 'Datum', change: 'Änderung', balance: 'Saldo', model: 'Modell', cost: 'Credits', download: 'Download', previous: 'Zurück', next: 'Weiter', page: 'Seite', kinds: { purchase: 'Kauf', signup: 'Registrierung', reserve: 'Generierung', refund: 'Erstattung', merge: 'Zusammenführung' } },
  es: { ...en, title: 'Créditos y compras', description: 'Consulta tus créditos disponibles y los pedidos recientes.', available: 'Créditos disponibles', monthly: 'Créditos mensuales', purchased: 'Créditos comprados', manage: 'Gestionar suscripción', orders: 'Pedidos', credits: 'Historial', generations: 'Generaciones', emptyOrders: 'Todavía no hay compras.', emptyCredits: 'Todavía no hay movimientos.', emptyGenerations: 'Todavía no hay generaciones.', product: 'Producto', amount: 'Importe', status: 'Estado', date: 'Fecha', change: 'Cambio', balance: 'Saldo', model: 'Modelo', cost: 'Créditos', download: 'Descargar', previous: 'Anterior', next: 'Siguiente', page: 'Página', kinds: { purchase: 'Compra', signup: 'Registro', reserve: 'Generación', refund: 'Reembolso', merge: 'Fusión' } },
  pt: { ...en, title: 'Créditos e compras', description: 'Veja seus créditos disponíveis e os pedidos recentes.', available: 'Créditos disponíveis', monthly: 'Créditos mensais', purchased: 'Créditos comprados', manage: 'Gerenciar assinatura', orders: 'Pedidos', credits: 'Histórico', generations: 'Gerações', emptyOrders: 'Ainda não há compras.', emptyCredits: 'Ainda não há movimentos.', emptyGenerations: 'Ainda não há gerações.', product: 'Produto', amount: 'Valor', status: 'Estado', date: 'Data', change: 'Variação', balance: 'Saldo', model: 'Modelo', cost: 'Créditos', download: 'Baixar', previous: 'Anterior', next: 'Próxima', page: 'Página', kinds: { purchase: 'Compra', signup: 'Cadastro', reserve: 'Geração', refund: 'Reembolso', merge: 'Fusão' } },
};

export function accountBillingCopy(locale: string): AccountBillingCopy {
  return copy[locale] ?? en;
}
