import { describe, expect, it } from 'vitest';
import {
  getLanguageRouteInfo,
  getUnsupportedLanguageRedirectPath,
} from '../utils/seoRoutes';

describe('seo route helpers', () => {
  it('normalizes the unsupported /en prefix to the unprefixed English route', () => {
    expect(getLanguageRouteInfo('/en/privacy')).toMatchObject({
      language: 'en',
      routePath: '/privacy',
      hasLanguagePrefix: false,
      hasUnsupportedLanguagePrefix: true,
    });
    expect(getUnsupportedLanguageRedirectPath('/en/privacy')).toBe('/privacy');
  });

  it('redirects region-like unsupported language prefixes to canonical routes', () => {
    expect(getUnsupportedLanguageRedirectPath('/pt-br/docs')).toBe('/docs');
    expect(getUnsupportedLanguageRedirectPath('/en/docs/architecture')).toBe('/docs');
    expect(getUnsupportedLanguageRedirectPath('/fr/unknown')).toBe('/');
  });
});
