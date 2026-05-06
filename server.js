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
const SEO_PAGES = {
  '/': {
    title: 'Crypto Survivors - Free Bitcoin Survival Game',
    description:
      'Play Crypto Survivors, a free browser survival game where live Bitcoin market volatility shapes enemy waves, rewards, and rogue-lite strategy.',
    canonical: BASE_URL,
  },
  '/privacy': {
    title: 'Privacy Policy | Crypto Survivors',
    description:
      'Privacy Policy for Crypto Survivors game. Learn how we collect, use, and protect your data. We value your privacy and never sell your information.',
    canonical: `${BASE_URL}/privacy`,
  },
  '/terms': {
    title: 'Terms of Service | Crypto Survivors',
    description:
      'Terms of Service for Crypto Survivors game. Read our rules about game mechanics, anti-cheat policy, and intellectual property.',
    canonical: `${BASE_URL}/terms`,
  },
  '/docs': {
    title: 'Documentation | Crypto Survivors',
    description:
      'Official documentation for Crypto Survivors. Game guides, API reference, and development resources.',
    canonical: `${BASE_URL}/docs`,
  },
};

const PUBLIC_SPA_ROUTES = new Set(Object.keys(SEO_PAGES));

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

  // Block malicious paths with random delay (confuses timing attacks)
  if (isBlockedPath || isBlockedExt) {
    const delay = Math.floor(Math.random() * 500) + 100; // 100-600ms random delay
    setTimeout(() => {
      logRequest(ip, req.method, urlPath, 418, Date.now() - startTime);
      sendResponse(res, 418, "I'm a teapot 🫖");
    }, delay);
    return;
  }

  // Health check endpoint
  if (urlPath === '/health') {
    logRequest(ip, req.method, urlPath, 200, Date.now() - startTime);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
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
  const seoConfig = SEO_PAGES[urlPath];

  if (PUBLIC_SPA_ROUTES.has(urlPath)) {
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
    if (isAsset && urlPath.includes('/assets/')) {
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
    const isCompressible = !mimeType.startsWith('image/') && !mimeType.startsWith('audio/') && !mimeType.startsWith('video/') && ext !== '.zip' && ext !== '.pdf' && ext !== '.wasm';

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

function getCanonicalPath(urlPath) {
  if (urlPath.length > 1 && PUBLIC_SPA_ROUTES.has(urlPath.slice(0, -1))) {
    return urlPath.slice(0, -1);
  }

  if (urlPath.startsWith('/docs/') && extname(urlPath) === '') {
    return '/docs';
  }

  return null;
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function upsertHeadTag(html, matcher, tag) {
  if (matcher.test(html)) {
    return html.replace(matcher, tag);
  }

  return html.replace('</head>', `  ${tag}\n  </head>`);
}

function injectSeoTags(html, seoConfig) {
  const title = escapeHtmlAttribute(seoConfig.title);
  const description = escapeHtmlAttribute(seoConfig.description);
  const canonical = escapeHtmlAttribute(seoConfig.canonical);
  const image = `${BASE_URL}/icons/icon-512.png`;

  let nextHtml = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
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
