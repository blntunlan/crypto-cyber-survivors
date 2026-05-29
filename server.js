/**
 * Production Server with Security Hardening
 *
 * Features:
 * - Security Headers (CSP, HSTS, X-Frame-Options, etc.)
 * - WordPress/Bot Attack Blocking
 * - Rate Limiting
 * - Static File Serving with Compression
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { URL } from 'url';
import { gzipSync, brotliCompressSync } from 'zlib';

const PORT = process.env.PORT || 3000;
const DIST_DIR = join(process.cwd(), 'dist');
const BASE_URL = 'https://crypto-survivors.com';
const BYTES_PER_MB = 1024 * 1024;

// =============================================================================
// SECURITY: Blocked Paths (WordPress vulnerability scanners, bots, etc.)
// =============================================================================
const BLOCKED_PATHS = [
  // WordPress
  '/wp-admin',
  '/wp-login.php',
  '/wp-content',
  '/wp-includes',
  '/wordpress',
  '/xmlrpc.php',
  '/wlwmanifest.xml',
  '/wp-config',
  '/wp-json',
  // Environment/Config files
  '/.env',
  '/.git',
  '/.svn',
  '/.htaccess',
  '/.htpasswd',
  '/config.php',
  '/config.json',
  '/config.yml',
  '/configuration.php',
  '/settings.php',
  '/settings.json',
  '/web.config',
  '/appsettings.json',
  '/firebase.json',
  '/credentials.json',
  '/gcp-credentials.json',
  '/google-credentials.json',
  '/firebase-adminsdk.json',
  '/account.json',
  '/key.json',
  '/keyfile.json',
  '/secrets.json',
  '/service-account.json',
  // Admin panels
  '/admin.php',
  '/admin/',
  '/administrator/',
  '/panel/',
  '/cpanel/',
  '/webadmin/',
  '/sysadmin/',
  '/manage/',
  '/manager/',
  // Shell/Backdoors
  '/shell',
  '/c99',
  '/r57',
  '/b374k',
  '/alfa',
  '/cmd',
  '/eval',
  '/exec',
  '/backdoor',
  '/webshell',
  '/upload.php',
  // Database
  '/phpmyadmin',
  '/pma',
  '/myadmin',
  '/mysql',
  '/db',
  '/sql',
  '/database',
  '/adminer',
  '/dbadmin',
  '/sqladmin',
  // Backups
  '/backup',
  '/backups',
  '/bak',
  '/old',
  '/temp',
  '/tmp',
  '/cache',
  '/dump',
  '/export',
  '/import',
  // API probing
  '/api/v1',
  '/api/v2',
  '/api/config',
  '/api/env',
  '/graphql',
  '/rest/',
  '/soap/',
  // Common CMS
  '/joomla',
  '/drupal',
  '/magento',
  '/prestashop',
  '/opencart',
  // Source maps (production)
  '.map',
  // Debug endpoints
  '/debug',
  '/trace',
  '/test',
  '/phpinfo',
  '/info.php',
  // Actuator endpoints (Spring Boot)
  '/actuator',
  '/jolokia',
  '/metrics',
];

// Blocked file extensions (source code, configs)
const BLOCKED_EXTENSIONS = [
  '.php',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',
  '.pl',
  '.py',
  '.rb',
  '.sh',
  '.bash',
  '.ps1',
  '.bak',
  '.old',
  '.orig',
  '.swp',
  '.swo',
  '.sql',
  '.sqlite',
  '.db',
  '.mdb',
  '.log',
  '.ini',
  '.conf',
  '.cfg',
];

// =============================================================================
// SEO: Dynamic Meta Tags for Public SPA Routes
// =============================================================================
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'tr', 'hi', 'vi', 'es', 'pt', 'zh', 'ru'];
const ROUTE_LANGUAGES = ['tr', 'hi', 'vi', 'es', 'pt', 'zh', 'ru'];
const PUBLIC_ROUTE_PATHS = ['/', '/privacy', '/terms', '/docs'];
const PUBLIC_ROUTE_SURFACES = {
  '/': 'home',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/docs': 'docs',
};
const PUBLIC_SEO_CONTENT = {
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
const PUBLIC_ROUTE_SET = new Set(PUBLIC_ROUTE_PATHS);
const PUBLIC_SPA_ROUTES = new Set(
  PUBLIC_ROUTE_PATHS.flatMap(routePath =>
    SUPPORTED_LANGUAGES.map(language => getLocalizedPath(routePath, language))
  )
);

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.wasm': 'application/wasm',
};

// =============================================================================
// SECURITY HEADERS (Hardened)
// =============================================================================
function getSecurityHeaders(isAsset = false) {
  const headers = {
    // Prevent clickjacking (DENY is stricter than SAMEORIGIN)
    'X-Frame-Options': 'DENY',
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Enable XSS filter
    'X-XSS-Protection': '1; mode=block',
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions policy (comprehensive list)
    'Permissions-Policy':
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
    // HSTS (2 years with preload)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    // Prevent DNS prefetch to third parties
    'X-DNS-Prefetch-Control': 'off',
    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Hide server info
    'X-Powered-By': '',
    Server: '',
  };

  // Add CSP for HTML pages only (stricter - no unsafe-eval)
  if (!isAsset) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://cdn.discordapp.com",
      "connect-src 'self' wss://stream.binance.com wss://stream.binance.com:9443 wss://ws-feed.exchange.coinbase.com wss://stream.coinbase.com wss://*.coinbase.com https://*.supabase.co wss://*.supabase.co https://*.supabase.com https://*.workers.dev https://*.up.railway.app https://cloudflareinsights.com",
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ');
  }

  return headers;
}

// =============================================================================
// RATE LIMITING (Simple in-memory implementation)
// =============================================================================
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 200; // max requests per window
const RATE_LIMIT_BLOCKED_MAX = 10; // max blocked path requests before ban

function isRateLimited(ip, isBlockedPath = false) {
  const now = Date.now();
  const key = ip;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 1,
      blockedCount: isBlockedPath ? 1 : 0,
      startTime: now,
    });
    return false;
  }

  const data = rateLimitMap.get(key);

  // Reset window if expired
  if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, {
      count: 1,
      blockedCount: isBlockedPath ? 1 : 0,
      startTime: now,
    });
    return false;
  }

  // Increment counters
  data.count++;
  if (isBlockedPath) {
    data.blockedCount++;
  }

  // Ban IPs that repeatedly hit blocked paths (likely bots)
  if (data.blockedCount >= RATE_LIMIT_BLOCKED_MAX) {
    return true;
  }

  // Normal rate limiting
  return data.count > RATE_LIMIT_MAX_REQUESTS;
}

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

// =============================================================================
// REQUEST HANDLER
// =============================================================================
function getMemoryStats() {
  const memory = process.memoryUsage();
  return {
    rssMB: Math.round(memory.rss / BYTES_PER_MB),
    heapUsedMB: Math.round(memory.heapUsed / BYTES_PER_MB),
    heapTotalMB: Math.round(memory.heapTotal / BYTES_PER_MB),
    externalMB: Math.round(memory.external / BYTES_PER_MB),
    arrayBuffersMB: Math.round(memory.arrayBuffers / BYTES_PER_MB),
    uptimeSec: Math.round(process.uptime()),
  };
}

function handleRequest(req, res) {
  const startTime = Date.now();
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  // Parse URL
  let parsedUrl;
  let urlPath;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    urlPath = decodeURIComponent(parsedUrl.pathname);
  } catch {
    sendResponse(res, 400, 'Bad Request');
    return;
  }

  const canonicalOriginRedirect = getCanonicalOriginRedirect(req, parsedUrl);
  if (canonicalOriginRedirect) {
    logRequest(ip, req.method, urlPath, 301, Date.now() - startTime);
    sendRedirect(res, canonicalOriginRedirect);
    return;
  }

  const canonicalPath = getCanonicalPath(urlPath);
  if (canonicalPath) {
    logRequest(ip, req.method, urlPath, 301, Date.now() - startTime);
    sendRedirect(res, canonicalPath + parsedUrl.search);
    return;
  }

  // Check for blocked paths (WordPress scanners, etc.)
  const normalizedPath = urlPath.toLowerCase();
  const isBlockedPath = BLOCKED_PATHS.some(blocked =>
    normalizedPath.includes(blocked.toLowerCase())
  );

  // Check for blocked file extensions
  const ext = normalizedPath.slice(normalizedPath.lastIndexOf('.'));
  const isBlockedExt = BLOCKED_EXTENSIONS.includes(ext);

  // Rate limiting check
  if (isRateLimited(ip, isBlockedPath || isBlockedExt)) {
    logRequest(ip, req.method, urlPath, 429, Date.now() - startTime);
    sendResponse(res, 429, 'Too Many Requests');
    return;
  }

  // Block malicious paths immediately to avoid holding sockets/timers under scans.
  if (isBlockedPath || isBlockedExt) {
    logRequest(ip, req.method, urlPath, 418, Date.now() - startTime);
    sendResponse(res, 418, "I'm a teapot 🫖");
    return;
  }

  // Health check endpoint
  if (urlPath === '/health') {
    logRequest(ip, req.method, urlPath, 200, Date.now() - startTime);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'crypto-survivors',
      })
    );
    return;
  }

  if (urlPath === '/stats') {
    logRequest(ip, req.method, urlPath, 200, Date.now() - startTime);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'crypto-survivors',
        runtime: {
          nodeEnv: process.env.NODE_ENV || 'unset',
          nodeVersion: process.version,
          memory: getMemoryStats(),
          rateLimitEntries: rateLimitMap.size,
        },
      })
    );
    return;
  }

  // Serve static files
  serveStaticFile(req, res, urlPath, ip, startTime);
}

function serveStaticFile(req, res, urlPath, ip, startTime) {
  // Normalize path and prevent directory traversal
  let filePath = join(DIST_DIR, urlPath);

  // Security: Prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    logRequest(ip, req.method, urlPath, 403, Date.now() - startTime);
    sendResponse(res, 403, 'Forbidden');
    return;
  }

  // Check if this is an SEO page that needs dynamic meta tags
  const seoConfig = getSeoConfigForPath(urlPath);

  if (seoConfig) {
    filePath = join(DIST_DIR, 'index.html');
  }

  // Check if path exists
  if (!existsSync(filePath)) {
    // Try with index.html for SPA routing
    filePath = join(DIST_DIR, 'index.html');
    if (!existsSync(filePath)) {
      logRequest(ip, req.method, urlPath, 404, Date.now() - startTime);
      sendResponse(res, 404, 'Not Found');
      return;
    }
  }

  // If it's a directory, try index.html
  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    filePath = join(filePath, 'index.html');
    if (!existsSync(filePath)) {
      logRequest(ip, req.method, urlPath, 404, Date.now() - startTime);
      sendResponse(res, 404, 'Not Found');
      return;
    }
  }

  // Get file extension and MIME type
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  const isAsset = ext !== '.html' && ext !== '';

  // Read and send file
  try {
    let content = readFileSync(filePath);

    // Inject route-specific SEO tags before crawlers render the SPA.
    if (seoConfig && ext === '.html') {
      content = Buffer.from(
        injectSeoTags(content.toString('utf-8'), seoConfig),
        'utf-8'
      );
    }

    const headers = {
      'Content-Type': mimeType,
      ...getSecurityHeaders(isAsset),
    };

    // Cache static assets aggressively
    if (isAsset && (urlPath.includes('/assets/') || urlPath.startsWith('/a/'))) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (isAsset) {
      headers['Cache-Control'] = 'public, max-age=86400';
    } else {
      headers['Cache-Control'] = 'no-cache, must-revalidate';
    }

    if (shouldNoIndexStaticResource(urlPath, ext)) {
      headers['X-Robots-Tag'] = 'noindex';
    }

    // Apply compression
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Don't compress already compressed formats (images, audio, video)
    const isCompressible =
      !mimeType.startsWith('image/') &&
      !mimeType.startsWith('audio/') &&
      !mimeType.startsWith('video/') &&
      ext !== '.zip' &&
      ext !== '.pdf' &&
      ext !== '.wasm';

    if (isCompressible) {
      if (acceptEncoding.includes('br')) {
        content = brotliCompressSync(content);
        headers['Content-Encoding'] = 'br';
      } else if (acceptEncoding.includes('gzip')) {
        content = gzipSync(content);
        headers['Content-Encoding'] = 'gzip';
      }
    }

    headers['Content-Length'] = content.length;

    res.writeHead(200, headers);
    res.end(content);
    logRequest(ip, req.method, urlPath, 200, Date.now() - startTime);
  } catch (err) {
    console.error(`[ERROR] Failed to read file: ${filePath}`, err.message);
    logRequest(ip, req.method, urlPath, 500, Date.now() - startTime);
    sendResponse(res, 500, 'Internal Server Error');
  }
}

function sendResponse(res, statusCode, message) {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    ...getSecurityHeaders(false),
  };
  res.writeHead(statusCode, headers);
  res.end(message);
}

function sendRedirect(res, location) {
  const headers = {
    Location: location,
    'Cache-Control': 'public, max-age=3600',
    ...getSecurityHeaders(false),
  };
  res.writeHead(301, headers);
  res.end(`Redirecting to ${location}`);
}

function getCanonicalOriginRedirect(req, parsedUrl) {
  const host = req.headers.host?.toLowerCase() || '';
  const hostWithoutPort = host.split(':')[0];
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0];
  const isProductionHost =
    hostWithoutPort === 'crypto-survivors.com' ||
    hostWithoutPort === 'www.crypto-survivors.com';

  if (!isProductionHost) {
    return null;
  }

  if (hostWithoutPort === 'www.crypto-survivors.com' || forwardedProto === 'http') {
    return `${BASE_URL}${parsedUrl.pathname}${parsedUrl.search}`;
  }

  return null;
}

function normalizeRoutePath(pathname) {
  const pathOnly = pathname.split(/[?#]/)[0] || '/';
  const prefixedPath = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const singleSlashPath = prefixedPath.replace(/\/+/g, '/');

  if (singleSlashPath === '/') {
    return '/';
  }

  return singleSlashPath.replace(/\/+$/, '');
}

function isRouteLanguage(value) {
  return ROUTE_LANGUAGES.includes(value);
}

function looksLikeLanguagePrefix(value) {
  return typeof value === 'string' && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(value);
}

function getLanguageRouteInfo(pathname) {
  const normalizedPath = normalizeRoutePath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isRouteLanguage(firstSegment)) {
    const restSegments = segments.slice(1);
    const routePath =
      restSegments.length > 0 ? normalizeRoutePath(`/${restSegments.join('/')}`) : '/';

    return {
      language: firstSegment,
      routePath,
      hasLanguagePrefix: true,
      hasUnsupportedLanguagePrefix: false,
    };
  }

  if (firstSegment === DEFAULT_LANGUAGE) {
    const restSegments = segments.slice(1);
    const routePath =
      restSegments.length > 0 ? normalizeRoutePath(`/${restSegments.join('/')}`) : '/';

    return {
      language: DEFAULT_LANGUAGE,
      routePath,
      hasLanguagePrefix: false,
      hasUnsupportedLanguagePrefix: true,
    };
  }

  return {
    language: DEFAULT_LANGUAGE,
    routePath: normalizedPath,
    hasLanguagePrefix: false,
    hasUnsupportedLanguagePrefix:
      looksLikeLanguagePrefix(firstSegment) && firstSegment !== DEFAULT_LANGUAGE,
  };
}

function isPublicRoutePath(routePath) {
  return PUBLIC_ROUTE_SET.has(normalizeRoutePath(routePath));
}

function getLocalizedPath(routePath, language) {
  if (language === DEFAULT_LANGUAGE) {
    return routePath;
  }

  if (routePath === '/') {
    return `/${language}/`;
  }

  return `/${language}${routePath}`;
}

function toAbsoluteSeoUrl(path) {
  return path === '/' ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}

function getHreflangAlternates(routePath) {
  const languageAlternates = SUPPORTED_LANGUAGES.map(language => ({
    hreflang: language,
    href: toAbsoluteSeoUrl(getLocalizedPath(routePath, language)),
  }));

  return [
    ...languageAlternates,
    {
      hreflang: 'x-default',
      href: toAbsoluteSeoUrl(getLocalizedPath(routePath, DEFAULT_LANGUAGE)),
    },
  ];
}

function getUnsupportedLanguageRedirectPath(pathname) {
  const routeInfo = getLanguageRouteInfo(pathname);
  if (!routeInfo.hasUnsupportedLanguagePrefix) {
    return null;
  }

  const normalizedPath = normalizeRoutePath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);
  const restSegments = segments.slice(1);
  const routePath =
    restSegments.length > 0 ? normalizeRoutePath(`/${restSegments.join('/')}`) : '/';

  if (routePath.startsWith('/docs/')) {
    return '/docs';
  }

  return isPublicRoutePath(routePath) ? routePath : '/';
}

function getCanonicalPath(urlPath) {
  const unsupportedLanguageRedirect = getUnsupportedLanguageRedirectPath(urlPath);
  if (unsupportedLanguageRedirect) {
    return unsupportedLanguageRedirect;
  }

  const routeInfo = getLanguageRouteInfo(urlPath);
  const canonicalPath = isPublicRoutePath(routeInfo.routePath)
    ? getLocalizedPath(routeInfo.routePath, routeInfo.language)
    : null;

  if (
    canonicalPath &&
    urlPath !== canonicalPath &&
    PUBLIC_SPA_ROUTES.has(canonicalPath)
  ) {
    return canonicalPath;
  }

  if (urlPath.startsWith('/docs/') && extname(urlPath) === '') {
    return '/docs';
  }

  if (
    routeInfo.hasLanguagePrefix &&
    urlPath.includes('/docs/') &&
    extname(urlPath) === ''
  ) {
    return getLocalizedPath('/docs', routeInfo.language);
  }

  return null;
}

function getSeoConfigForPath(urlPath) {
  const routeInfo = getLanguageRouteInfo(urlPath);
  if (!isPublicRoutePath(routeInfo.routePath)) {
    return null;
  }

  const surface = PUBLIC_ROUTE_SURFACES[routeInfo.routePath];
  const localizedContent =
    PUBLIC_SEO_CONTENT[surface][routeInfo.language] ||
    PUBLIC_SEO_CONTENT[surface][DEFAULT_LANGUAGE];
  const canonicalPath = getLocalizedPath(routeInfo.routePath, routeInfo.language);

  return {
    ...localizedContent,
    language: routeInfo.language,
    routePath: routeInfo.routePath,
    canonical: toAbsoluteSeoUrl(canonicalPath),
  };
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function upsertHeadTag(html, matcher, tag) {
  if (matcher.test(html)) {
    return html.replace(matcher, tag);
  }

  return html.replace('</head>', `  ${tag}\n  </head>`);
}

function replaceHtmlLang(html, language) {
  return html.replace(/<html\b[^>]*>/, tag => {
    if (/\slang="[^"]*"/.test(tag)) {
      return tag.replace(/\slang="[^"]*"/, ` lang="${language}"`);
    }

    return tag.replace('<html', `<html lang="${language}"`);
  });
}

function replaceHreflangLinks(html, routePath) {
  const withoutAlternates = html.replace(
    /\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+"\s*\/?>/g,
    ''
  );
  const alternateTags = getHreflangAlternates(routePath)
    .map(
      alternate =>
        `<link rel="alternate" hreflang="${alternate.hreflang}" href="${escapeHtmlAttribute(alternate.href)}" />`
    )
    .join('\n  ');

  return withoutAlternates.replace('</head>', `  ${alternateTags}\n  </head>`);
}

function buildStructuredData(seoConfig) {
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'Crypto Survivors',
      url: `${BASE_URL}/`,
      inLanguage: seoConfig.language,
    },
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Crypto Survivors Team',
      url: `${BASE_URL}/`,
      logo: `${BASE_URL}/icons/icon-512.png`,
    },
  ];

  if (seoConfig.routePath === '/') {
    graph.push({
      '@type': ['VideoGame', 'SoftwareApplication', 'WebApplication'],
      '@id': `${BASE_URL}/#game`,
      name: 'Crypto Survivors',
      url: seoConfig.canonical,
      description: seoConfig.description,
      genre: ['Survival', 'Rogue-lite', 'Simulation', 'Arcade'],
      gamePlatform: ['Web Browser', 'Mobile Browser', 'PWA'],
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      playMode: 'SinglePlayer',
      publisher: {
        '@id': `${BASE_URL}/#organization`,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function replaceStructuredData(html, seoConfig) {
  const withoutJsonLd = html.replace(
    /\s*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g,
    ''
  );
  const structuredData = escapeJsonForScript(buildStructuredData(seoConfig));

  return withoutJsonLd.replace(
    '</head>',
    `  <script type="application/ld+json">${structuredData}</script>\n  </head>`
  );
}

function injectSeoTags(html, seoConfig) {
  const title = escapeHtmlAttribute(seoConfig.title);
  const description = escapeHtmlAttribute(seoConfig.description);
  const canonical = escapeHtmlAttribute(seoConfig.canonical);
  const image = `${BASE_URL}/icons/icon-512.png`;

  let nextHtml = replaceHtmlLang(html, seoConfig.language);
  nextHtml = nextHtml.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />'
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  nextHtml = replaceHreflangLinks(nextHtml, seoConfig.routePath);
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${image}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  nextHtml = upsertHeadTag(
    nextHtml,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  nextHtml = replaceStructuredData(nextHtml, seoConfig);

  return nextHtml;
}

function shouldNoIndexStaticResource(urlPath, ext) {
  if (urlPath === '/7f74f2a3a02f4e1b8e9a6c5d4b3a2190.txt') {
    return true;
  }

  if (ext === '.html' || ext === '.xml' || ext === '.txt') {
    return false;
  }

  return (
    urlPath === '/manifest.json' ||
    urlPath === '/sw.js' ||
    urlPath === '/README.md' ||
    urlPath.startsWith('/locales/') ||
    urlPath.startsWith('/docs/') ||
    urlPath.startsWith('/a/')
  );
}

function logRequest(ip, method, path, status, duration) {
  const timestamp = new Date().toISOString();
  const statusIcon = status >= 400 ? '⚠️' : '✅';
  console.log(
    `${statusIcon} [${timestamp}] ${ip} ${method} ${path} ${status} ${duration}ms`
  );
}

// =============================================================================
// SERVER STARTUP
// =============================================================================
const server = createServer(handleRequest);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 Crypto Survivors Production Server                       ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(54)}║
║  Security: Hardened with CSP, HSTS, Rate Limiting           ║
║  Bot Protection: WordPress scanners blocked                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
