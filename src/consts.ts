// Dados centrais do site. Alterar aqui atualiza todas as páginas.

// Domínio final ainda por definir: trocar antes de publicar.
export const SITE_URL = 'https://wavestudio.pt';

export const BRAND = {
  name: 'Wave Studio',
  tagline: 'Built in the North. Made for business.',
  description:
    'Agência digital no Norte de Portugal. Gravamos no seu espaço, criamos o conteúdo e publicamos por si: redes sociais, websites e tráfego pago.',
  city: 'Póvoa de Varzim',
  region: 'Porto',
  country: 'PT',
};

// Número em formato internacional, sem espaços nem "+" (formato exigido pelo wa.me).
export const PHONE_E164 = '351936018970';
export const PHONE_DISPLAY = '936 018 970';

export const SOCIAL = {
  instagram: 'https://www.instagram.com/wavestudio.pt/',
  facebook: 'https://www.facebook.com/profile.php?id=61594986029085',
};

// Mensagens pré-escritas por origem do clique (API click-to-chat do WhatsApp).
export const WA_MESSAGES = {
  geral: 'Olá Wave Studio, gostava de saber mais sobre os vossos serviços.',
  'servico-redes': 'Olá! Tenho interesse na gestão de redes sociais para o meu negócio.',
  'servico-sites': 'Olá! Gostava de pedir orçamento para um website.',
  'servico-trafego': 'Olá! Quero saber mais sobre anúncios e tráfego pago.',
} as const;

export type WaOrigin = keyof typeof WA_MESSAGES;

export function waLink(text: string): string {
  return `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(text)}`;
}
