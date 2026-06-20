import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../contexts/LanguageConstants';
import { PUBLIC_ROUTE_PATHS, getLocalizedPath, SEO_BASE_URL } from '../utils/seoRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEST_FILE = path.resolve(__dirname, '../public/sitemap.xml');

// Use current system date for sitemap lastmod
const lastMod = new Date().toISOString().split('T')[0] || '2026-05-14';

function buildSitemapXml(): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  for (const routePath of PUBLIC_ROUTE_PATHS) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const localizedPath = getLocalizedPath(routePath, lang);
      const url = `${SEO_BASE_URL}${localizedPath}`;

      // Determine change frequency and priority
      let changeFreq = 'monthly';
      let priority = '0.5';

      if (routePath === '/') {
        changeFreq = 'daily';
        priority = '1.0';
      } else if (routePath === '/docs') {
        changeFreq = 'weekly';
        priority = '0.7';
      }

      xml += '  <url>\n';
      xml += `    <loc>${url}</loc>\n`;

      // Hreflang alternates
      for (const alternateLang of SUPPORTED_LANGUAGES) {
        const altPath = getLocalizedPath(routePath, alternateLang);
        const altUrl = `${SEO_BASE_URL}${altPath}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${alternateLang}" href="${altUrl}" />\n`;
      }

      // x-default maps to English
      const xDefaultPath = getLocalizedPath(routePath, DEFAULT_LANGUAGE);
      const xDefaultUrl = `${SEO_BASE_URL}${xDefaultPath}`;
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultUrl}" />\n`;

      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>${changeFreq}</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += '  </url>\n';
    }
  }

  xml += '</urlset>\n';
  return xml;
}

try {
  console.log('Generating dynamic sitemap...');
  const xmlContent = buildSitemapXml();
  fs.writeFileSync(DEST_FILE, xmlContent, 'utf8');
  console.log(`Successfully generated: ${DEST_FILE}`);
} catch (error) {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
}
