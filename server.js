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

const PORT = process.env.PORT || 3000;
const DIST_DIR = join(process.cwd(), 'dist');

// =============================================================================
// SECURITY: Blocked Paths (WordPress vulnerability scanners, bots, etc.)
// =============================================================================
const BLOCKED_PATHS = [
  // WordPress
  '/wp-admin', '/wp-login.php', '/wp-content', '/wp-includes', '/wordpress',
  '/xmlrpc.php', '/wlwmanifest.xml', '/wp-config', '/wp-json',
  // Environment/Config files
  '/.env', '/.git', '/.svn', '/.htaccess', '/.htpasswd',
  '/config.php', '/config.json', '/config.yml', '/configuration.php',
  '/settings.php', '/settings.json', '/web.config',
  // Admin panels
  '/admin.php', '/admin/', '/administrator/', '/panel/', '/cpanel/',
  '/webadmin/', '/sysadmin/', '/manage/', '/manager/',
  // Shell/Backdoors
  '/shell', '/c99', '/r57', '/b374k', '/alfa', '/cmd', '/eval',
  '/exec', '/backdoor', '/webshell', '/upload.php',
  // Database
  '/phpmyadmin', '/pma', '/myadmin', '/mysql', '/db', '/sql', '/database',
  '/adminer', '/dbadmin', '/sqladmin',
  // Backups
  '/backup', '/backups', '/bak', '/old', '/temp', '/tmp', '/cache',
  '/dump', '/export', '/import',
  // API probing
  '/api/v1', '/api/v2', '/graphql', '/rest/', '/soap/',
  // Common CMS
  '/joomla', '/drupal', '/magento', '/prestashop', '/opencart',
  // Source maps (production)
  '.map',
  // Debug endpoints
  '/debug', '/trace', '/test', '/phpinfo', '/info.php',
  // Actuator endpoints (Spring Boot)
  '/actuator', '/jolokia', '/metrics',
];

// Blocked file extensions (source code, configs)
const BLOCKED_EXTENSIONS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl',
  '.py', '.rb', '.sh', '.bash', '.ps1',
  '.bak', '.old', '.orig', '.swp', '.swo',
  '.sql', '.sqlite', '.db', '.mdb',
  '.log', '.ini', '.conf', '.cfg',
];

// =============================================================================
// SEO: Dynamic Meta Tags for Legal Pages
// =============================================================================
const SEO_PAGES = {
  '/privacy': {
    title: 'Privacy Policy | Crypto Survivors',
    description:
      'Privacy Policy for Crypto Survivors game. Learn how we collect, use, and protect your data. We value your privacy and never sell your information.',
    canonical: 'https://crypto-survivors.com/privacy',
  },
  '/terms': {
    title: 'Terms of Service | Crypto Survivors',
    description:
      'Terms of Service for Crypto Survivors game. Read our rules about game mechanics, anti-cheat policy, and intellectual property.',
    canonical: 'https://crypto-survivors.com/terms',
  },
  '/docs': {
    title: 'Documentation | Crypto Survivors',
    description:
      'Official documentation for Crypto Survivors. Game guides, API reference, and development resources.',
    canonical: 'https://crypto-survivors.com/docs',
  },
};

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
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
    // HSTS (2 years with preload)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    // Prevent DNS prefetch to third parties
    'X-DNS-Prefetch-Control': 'off',
    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Hide server info
    'X-Powered-By': '',
    'Server': '',
  };

  // Add CSP for HTML pages only (stricter - no unsafe-eval)
  if (!isAsset) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' wss://stream.binance.com wss://ws-feed.exchange.coinbase.com https://*.supabase.co https://*.workers.dev",
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
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
  let urlPath;
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    urlPath = decodeURIComponent(url.pathname);
  } catch {
    sendResponse(res, 400, 'Bad Request');
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

    // Inject dynamic SEO meta tags for legal/doc pages
    if (seoConfig && ext === '.html') {
      let html = content.toString('utf-8');

      // Replace default meta tags with page-specific ones
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${seoConfig.title}</title>`);
      html = html.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${seoConfig.description}" />`
      );
      html = html.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:title" content="${seoConfig.title}" />`
      );
      html = html.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:description" content="${seoConfig.description}" />`
      );
      html = html.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:url" content="${seoConfig.canonical}" />`
      );
      // Add canonical link if not present
      if (!html.includes('rel="canonical"')) {
        html = html.replace(
          '</head>',
          `  <link rel="canonical" href="${seoConfig.canonical}" />\n  </head>`
        );
      }

      content = Buffer.from(html, 'utf-8');
    }

    const headers = {
      'Content-Type': mimeType,
      'Content-Length': content.length,
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
