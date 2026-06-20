import { type Language } from '../contexts/LanguageConstants';
import { type PublicRoutePath } from '../utils/seoRoutes';

export type PublicSeoSurface = 'home' | 'privacy' | 'terms' | 'docs';

export interface SeoContent {
  title: string;
  description: string;
}

export const PUBLIC_SURFACE_PATHS: Record<PublicSeoSurface, PublicRoutePath> = {
  home: '/',
  privacy: '/privacy',
  terms: '/terms',
  docs: '/docs',
};

export const PUBLIC_ROUTE_SURFACES: Record<PublicRoutePath, PublicSeoSurface> = {
  '/': 'home',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/docs': 'docs',
};

export const PUBLIC_SEO_CONTENT: Record<
  PublicSeoSurface,
  Record<Language, SeoContent>
> = {
  home: {
    en: {
      title: 'Crypto Survivors - Free Bitcoin Survival Game',
      description:
        'Play Crypto Survivors, a free browser survival game where live Bitcoin market volatility shapes enemy waves, rewards, and rogue-lite strategy.',
    },
    tr: {
      title: 'Crypto Survivors - Ücretsiz Bitcoin Hayatta Kalma Oyunu',
      description:
        'Crypto Survivors oynayın: canlı Bitcoin piyasa volatilitesinin düşman dalgalarını, ödülleri ve rogue-lite stratejiyi şekillendirdiği ücretsiz tarayıcı oyunu.',
    },
    hi: {
      title: 'Crypto Survivors - मुफ्त बिटकॉइन सर्वाइवल गेम',
      description:
        'Crypto Survivors खेलें, एक मुफ्त ब्राउज़र सर्वाइवल गेम जहाँ लाइव बिटकॉइन बाजार की अस्थिरता दुश्मन की लहरों, पुरस्कारों और दुष्ट-लाइट (rogue-lite) रणनीति को आकार देती है।',
    },
    vi: {
      title: 'Crypto Survivors - Game Sinh Tồn Bitcoin Miễn Phí',
      description:
        'Chơi Crypto Survivors, game sinh tồn miễn phí trên trình duyệt nơi biến động thị trường Bitcoin trực tiếp định hình các đợt quái vật, phần thưởng và chiến lược rogue-lite.',
    },
    es: {
      title: 'Crypto Survivors - Juego Gratis de Supervivencia Bitcoin',
      description:
        'Juega Crypto Survivors, un juego gratuito de supervivencia en navegador donde la volatilidad en tiempo real de Bitcoin define las oleadas enemigas, las recompensas y la estrategia rogue-lite.',
    },
    pt: {
      title: 'Crypto Survivors - Jogo Grátis de Sobrevivência Bitcoin',
      description:
        'Jogue Crypto Survivors, um jogo grátis de sobrevivência no navegador onde a volatilidade em tempo real do Bitcoin molda as ondas de inimigos, recompensas e estratégia rogue-lite.',
    },
    zh: {
      title: 'Crypto Survivors - 免费比特币生存游戏',
      description:
        '玩 Crypto Survivors：一款免费的浏览器生存游戏，实时比特币市场波动将直接决定敌人的波次、奖励和 rogue-lite 战斗策略。',
    },
    ru: {
      title: 'Crypto Survivors - Бесплатная игра на выживание с Биткоином',
      description:
        'Играйте в Crypto Survivors: бесплатная браузерная игра на выживание, где волатильность курса Биткоина в реальном времени определяет волны врагов, награды и rogue-lite стратегию.',
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy | Crypto Survivors',
      description:
        'Privacy Policy for Crypto Survivors. Learn how we collect, use, and protect game data, account data, and local preferences.',
    },
    tr: {
      title: 'Gizlilik Politikası | Crypto Survivors',
      description:
        'Crypto Survivors gizlilik politikası. Oyun verilerini, hesap verilerini ve yerel tercihleri nasıl topladığımızı, kullandığımızı ve koruduğumuzu öğrenin.',
    },
    hi: {
      title: 'गोपनीयता नीति | Crypto Survivors',
      description:
        'Crypto Survivors गोपनीयता नीति। जानें कि हम खेल डेटा, खाता डेटा और स्थानीय प्राथमिकताओं को कैसे एकत्र, उपयोग और सुरक्षित करते हैं।',
    },
    vi: {
      title: 'Chính Sách Bảo Mật | Crypto Survivors',
      description:
        'Chính sách bảo mật của Crypto Survivors. Tìm hiểu cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu trò chơi, dữ liệu tài khoản và các thiết lập cục bộ.',
    },
    es: {
      title: 'Política de Privacidad | Crypto Survivors',
      description:
        'Política de privacidad de Crypto Survivors. Conoce cómo recopilamos, usamos y protegemos los datos del juego, de la cuenta y las preferencias locales.',
    },
    pt: {
      title: 'Política de Privacidade | Crypto Survivors',
      description:
        'Política de privacidade do Crypto Survivors. Saiba como coletamos, usamos e protegemos dados do jogo, da conta e preferências locais.',
    },
    zh: {
      title: '隐私政策 | Crypto Survivors',
      description:
        'Crypto Survivors 隐私政策。了解我们如何收集、使用和保护游戏数据、账户信息以及本地偏好设置。',
    },
    ru: {
      title: 'Политика конфиденциальности | Crypto Survivors',
      description:
        'Политика конфиденциальности Crypto Survivors. Узнайте, как мы собираем, используем и защищаем игровые данные, данные аккаунта и локальные настройки.',
    },
  },
  terms: {
    en: {
      title: 'Terms of Service | Crypto Survivors',
      description:
        'Terms of Service for Crypto Survivors, including gameplay rules, anti-cheat expectations, account usage, and intellectual property.',
    },
    tr: {
      title: 'Kullanım Şartları | Crypto Survivors',
      description:
        'Crypto Survivors kullanım şartları: oynanış kuralları, hile karşıtı beklentiler, hesap kullanımı ve fikri mülkiyet koşulları.',
    },
    hi: {
      title: 'सेवा की शर्तें | Crypto Survivors',
      description:
        'Crypto Survivors सेवा की शर्तें, जिसमें गेमप्ले नियम, एंटी-चीट उम्मीदें, खाता उपयोग और बौद्धिक संपदा शामिल हैं।',
    },
    vi: {
      title: 'Điều Khoản Dịch Vụ | Crypto Survivors',
      description:
        'Điều khoản dịch vụ của Crypto Survivors, bao gồm các quy tắc chơi game, quy định chống gian lận, sử dụng tài khoản và sở hữu trí tuệ.',
    },
    es: {
      title: 'Términos de Servicio | Crypto Survivors',
      description:
        'Términos de servicio de Crypto Survivors, que incluyen reglas de juego, expectativas anti-trampas, uso de cuenta y propiedad intelectual.',
    },
    pt: {
      title: 'Termos de Serviço | Crypto Survivors',
      description:
        'Termos de serviço do Crypto Survivors, incluindo regras do jogo, diretrizes anti-trapaça, uso de conta e propriedade intelectual.',
    },
    zh: {
      title: '服务条款 | Crypto Survivors',
      description:
        'Crypto Survivors 服务条款，包含游戏规则、反作弊规范、账户使用守则及知识产权声明。',
    },
    ru: {
      title: 'Условия использования | Crypto Survivors',
      description:
        'Условия использования Crypto Survivors, включая правила геймплея, требования по борьбе с читерством, использование аккаунтов и интеллектуальную собственность.',
    },
  },
  docs: {
    en: {
      title: 'Documentation | Crypto Survivors',
      description:
        'Official Crypto Survivors documentation covering the game engine, market mechanics, architecture, and player systems.',
    },
    tr: {
      title: 'Dokümantasyon | Crypto Survivors',
      description:
        'Oyun motoru, piyasa mekanikleri, mimari ve oyuncu sistemlerini kapsayan resmi Crypto Survivors dokümantasyonu.',
    },
    hi: {
      title: 'दस्तावेज़ीकरण | Crypto Survivors',
      description:
        'गेम इंजन, मार्केट मैकेनिक्स, आर्किтеक्चर और प्लेयर सिस्टम को कवर करने वाला आधिकारिक Crypto Survivors दस्तावेज़ीकरण।',
    },
    vi: {
      title: 'Tài Liệu Hướng Dẫn | Crypto Survivors',
      description:
        'Tài liệu chính thức của Crypto Survivors về engine trò chơi, cơ chế thị trường, kiến trúc và hệ thống người chơi.',
    },
    es: {
      title: 'Documentación | Crypto Survivors',
      description:
        'Documentación oficial de Crypto Survivors sobre el motor del juego, las mecánicas de mercado, la arquitectura y los sistemas del jugador.',
    },
    pt: {
      title: 'Documentação | Crypto Survivors',
      description:
        'Documentação oficial do Crypto Survivors sobre o motor de jogo, mecânicas de mercado, arquitetura e sistemas de jogadores.',
    },
    zh: {
      title: '官方文档 | Crypto Survivors',
      description:
        'Crypto Survivors 官方技术文档，涵盖游戏引擎、市场行情对接机制、架构设计 and 玩家系统。',
    },
    ru: {
      title: 'Документация | Crypto Survivors',
      description:
        'Официальная документация Crypto Survivors, посвященная игровому движку, рыночной механике, архитектуре и игровым системам.',
    },
  },
};

export const getSeoContent = (
  surface: PublicSeoSurface,
  language: Language
): SeoContent => PUBLIC_SEO_CONTENT[surface][language];
