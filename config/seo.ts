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
      title: 'Crypto Survivors - Ucretsiz Bitcoin Hayatta Kalma Oyunu',
      description:
        'Crypto Survivors oyna: canli Bitcoin piyasa volatilitesinin dusman dalgalarini, odulleri ve rogue-lite stratejiyi sekillendirdigi ucretsiz tarayici oyunu.',
    },
    hi: {
      title: 'Crypto Survivors - Muft Bitcoin Survival Game',
      description:
        'Crypto Survivors khelen, ek muft browser survival game jahan live Bitcoin market volatility enemy waves, rewards aur rogue-lite strategy ko shape karti hai.',
    },
    vi: {
      title: 'Crypto Survivors - Game Sinh Ton Bitcoin Mien Phi',
      description:
        'Choi Crypto Survivors, game sinh ton mien phi tren trinh duyet noi bien dong Bitcoin truc tiep dinh hinh dot quai, phan thuong va chien luoc rogue-lite.',
    },
    es: {
      title: 'Crypto Survivors - Juego Gratis de Supervivencia Bitcoin',
      description:
        'Juega Crypto Survivors, un juego gratuito de supervivencia en navegador donde la volatilidad real de Bitcoin cambia oleadas enemigas, recompensas y estrategia rogue-lite.',
    },
    pt: {
      title: 'Crypto Survivors - Jogo Gratis de Sobrevivencia Bitcoin',
      description:
        'Jogue Crypto Survivors, um jogo gratis de sobrevivencia no navegador em que a volatilidade ao vivo do Bitcoin molda ondas inimigas, recompensas e estrategia rogue-lite.',
    },
    zh: {
      title: 'Crypto Survivors - Mianfei Bitcoin Shengcun Youxi',
      description:
        'Play Crypto Survivors, mianfei liulanqi shengcun youxi, live Bitcoin shichang bodong hui yingxiang diren bolang, jiangli he rogue-lite celue.',
    },
    ru: {
      title: 'Crypto Survivors - Besplatnaya Bitcoin Survival Igra',
      description:
        'Igraite v Crypto Survivors: besplatnaya browser survival igra, gde zhivaya volatilnost Bitcoin menyaet volny vragov, nagrady i rogue-lite strategiyu.',
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy | Crypto Survivors',
      description:
        'Privacy Policy for Crypto Survivors. Learn how we collect, use, and protect game data, account data, and local preferences.',
    },
    tr: {
      title: 'Gizlilik Politikasi | Crypto Survivors',
      description:
        'Crypto Survivors gizlilik politikasi. Oyun verilerini, hesap verilerini ve yerel tercihleri nasil topladigimizi, kullandigimizi ve korudugumuzu ogrenin.',
    },
    hi: {
      title: 'Privacy Policy | Crypto Survivors',
      description:
        'Crypto Survivors ki privacy policy. Game data, account data aur local preferences ko collect, use aur protect karne ka tarika dekhen.',
    },
    vi: {
      title: 'Chinh Sach Bao Mat | Crypto Survivors',
      description:
        'Chinh sach bao mat Crypto Survivors. Tim hieu cach chung toi thu thap, su dung va bao ve du lieu game, tai khoan va tuy chon cuc bo.',
    },
    es: {
      title: 'Politica de Privacidad | Crypto Survivors',
      description:
        'Politica de privacidad de Crypto Survivors. Conoce como recopilamos, usamos y protegemos datos del juego, cuenta y preferencias locales.',
    },
    pt: {
      title: 'Politica de Privacidade | Crypto Survivors',
      description:
        'Politica de privacidade do Crypto Survivors. Saiba como coletamos, usamos e protegemos dados do jogo, conta e preferencias locais.',
    },
    zh: {
      title: 'Yinsi Zhengce | Crypto Survivors',
      description:
        'Crypto Survivors yinsi zhengce. Liaojie women ruhe shouji, shiyong he baohu youxi shuju, zhanghu shuju he bendi pianhao.',
    },
    ru: {
      title: 'Politika Konfidencialnosti | Crypto Survivors',
      description:
        'Politika konfidencialnosti Crypto Survivors. Uznayte, kak my sobiraem, ispolzuem i zashchishchaem dannye igry, akkaunta i lokalnye nastroiki.',
    },
  },
  terms: {
    en: {
      title: 'Terms of Service | Crypto Survivors',
      description:
        'Terms of Service for Crypto Survivors, including gameplay rules, anti-cheat expectations, account usage, and intellectual property.',
    },
    tr: {
      title: 'Kullanim Sartlari | Crypto Survivors',
      description:
        'Crypto Survivors kullanim sartlari: oynanis kurallari, hile karsiti beklentiler, hesap kullanimi ve fikri mulkiyet kosullari.',
    },
    hi: {
      title: 'Terms of Service | Crypto Survivors',
      description:
        'Crypto Survivors ke terms: gameplay rules, anti-cheat expectations, account usage aur intellectual property conditions.',
    },
    vi: {
      title: 'Dieu Khoan Dich Vu | Crypto Survivors',
      description:
        'Dieu khoan dich vu Crypto Survivors, gom quy tac choi, yeu cau chong gian lan, su dung tai khoan va quyen so huu tri tue.',
    },
    es: {
      title: 'Terminos de Servicio | Crypto Survivors',
      description:
        'Terminos de servicio de Crypto Survivors, con reglas de juego, expectativas anti-trampas, uso de cuenta y propiedad intelectual.',
    },
    pt: {
      title: 'Termos de Servico | Crypto Survivors',
      description:
        'Termos de servico do Crypto Survivors, incluindo regras de jogo, expectativas anti-cheat, uso de conta e propriedade intelectual.',
    },
    zh: {
      title: 'Fuwu Tiaokuan | Crypto Survivors',
      description:
        'Crypto Survivors fuwu tiaokuan, baokuo youxi guize, fang zuobi yaoqiu, zhanghu shiyong he zhishi chanquan.',
    },
    ru: {
      title: 'Usloviya Ispolzovaniya | Crypto Survivors',
      description:
        'Usloviya ispolzovaniya Crypto Survivors: pravila igry, anti-cheat ozhidaniya, ispolzovanie akkaunta i intellektualnaya sobstvennost.',
    },
  },
  docs: {
    en: {
      title: 'Documentation | Crypto Survivors',
      description:
        'Official Crypto Survivors documentation covering the game engine, market mechanics, architecture, and player systems.',
    },
    tr: {
      title: 'Dokumantasyon | Crypto Survivors',
      description:
        'Oyun motoru, piyasa mekanikleri, mimari ve oyuncu sistemlerini kapsayan resmi Crypto Survivors dokumantasyonu.',
    },
    hi: {
      title: 'Documentation | Crypto Survivors',
      description:
        'Official Crypto Survivors documentation: game engine, market mechanics, architecture aur player systems ke liye guide.',
    },
    vi: {
      title: 'Tai Lieu | Crypto Survivors',
      description:
        'Tai lieu chinh thuc Crypto Survivors ve game engine, co che thi truong, kien truc va he thong nguoi choi.',
    },
    es: {
      title: 'Documentacion | Crypto Survivors',
      description:
        'Documentacion oficial de Crypto Survivors sobre motor del juego, mecanicas de mercado, arquitectura y sistemas de jugador.',
    },
    pt: {
      title: 'Documentacao | Crypto Survivors',
      description:
        'Documentacao oficial do Crypto Survivors sobre motor do jogo, mecanicas de mercado, arquitetura e sistemas do jogador.',
    },
    zh: {
      title: 'Wendang | Crypto Survivors',
      description:
        'Crypto Survivors guanfang wendang, fugai youxi yinqing, shichang jizhi, jiagou he wanjia xitong.',
    },
    ru: {
      title: 'Dokumentaciya | Crypto Survivors',
      description:
        'Oficialnaya dokumentaciya Crypto Survivors po igrovomu dvizhku, rynochnym mekhanikam, arhitekture i sistemam igroka.',
    },
  },
};

export const getSeoContent = (
  surface: PublicSeoSurface,
  language: Language
): SeoContent => PUBLIC_SEO_CONTENT[surface][language];
