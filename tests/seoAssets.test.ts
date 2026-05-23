import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const readProjectFile = (path: string): string =>
  readFileSync(join(process.cwd(), path), 'utf8');

describe('SEO crawl assets', () => {
  it('keeps only canonical public URLs in the sitemap', () => {
    const sitemap = readProjectFile('public/sitemap.xml');
    const xml = new DOMParser().parseFromString(sitemap, 'application/xml');
    const parseError = xml.querySelector('parsererror');

    expect(sitemap).toContain('<loc>https://crypto-survivors.com/</loc>');
    expect(sitemap).toContain('<loc>https://crypto-survivors.com/tr/</loc>');
    expect(sitemap).toContain('<loc>https://crypto-survivors.com/docs</loc>');
    expect(sitemap).toContain('<loc>https://crypto-survivors.com/tr/docs</loc>');
    expect(sitemap).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://crypto-survivors.com/docs" />'
    );
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(sitemap).not.toContain('?lang=');
    expect(parseError).toBeNull();
  });

  it('does not block render-critical assets in robots.txt', () => {
    const robots = readProjectFile('public/robots.txt');

    expect(robots).not.toContain('Disallow: /a/');
    expect(robots).not.toContain('Disallow: /*.json$');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Disallow: /health');
    expect(robots).not.toContain('Clean-param:');
    expect(robots).not.toContain('Crawl-delay:');
    expect(robots).toContain('Allow: /locales/');
    expect(robots).toContain('Sitemap: https://crypto-survivors.com/sitemap.xml');
  });

  it('guards public SPA routes and raw data resources on the production server', () => {
    const server = readProjectFile('server.js');

    expect(server).toContain('PUBLIC_SPA_ROUTES');
    expect(server).toContain('getHreflangAlternates');
    expect(server).toContain('getCanonicalOriginRedirect');
    expect(server).toContain("urlPath.startsWith('/docs/')");
    expect(server).toContain("'X-Robots-Tag'");
  });

  it('does not ship unsupported AI discovery meta tags in base HTML', () => {
    const html = readProjectFile('index.html');

    expect(html).toContain('<html lang="en">');
    expect(html).toContain(
      '<link rel="alternate" hreflang="tr" href="https://crypto-survivors.com/tr/" />'
    );
    expect(html).toContain('"applicationCategory": "GameApplication"');
    expect(html).not.toContain('name="ai-discovery"');
    expect(html).not.toContain('name="sge-content"');
    expect(html).not.toContain('name="answerengine"');
  });

  it('publishes an IndexNow verification key and submit script', () => {
    const keyPath = 'public/7f74f2a3a02f4e1b8e9a6c5d4b3a2190.txt';
    const key = readProjectFile(keyPath).trim();
    const packageJson = readProjectFile('package.json');

    expect(existsSync(join(process.cwd(), 'scripts/submit-indexnow.mjs'))).toBe(true);
    expect(key).toBe('7f74f2a3a02f4e1b8e9a6c5d4b3a2190');
    expect(packageJson).toContain('"indexnow:submit"');
  });

  it('publishes the Bing Webmaster Tools verification file', () => {
    const verification = readProjectFile('public/BingSiteAuth.xml');

    expect(verification).toContain('<user>7C7BD0FE9B61F343A5E14971C00A449B</user>');
  });
});
