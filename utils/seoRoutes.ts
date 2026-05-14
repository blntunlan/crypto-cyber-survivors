import {
  DEFAULT_LANGUAGE,
  ROUTE_LANGUAGES,
  SUPPORTED_LANGUAGES,
  isRouteLanguage,
  type Language,
  type RouteLanguage,
} from '../contexts/LanguageConstants';

export const SEO_BASE_URL = 'https://crypto-survivors.com';

export const PUBLIC_ROUTE_PATHS = ['/', '/privacy', '/terms', '/docs'] as const;
export type PublicRoutePath = (typeof PUBLIC_ROUTE_PATHS)[number];

export interface LanguageRouteInfo {
  language: Language;
  languagePrefix: RouteLanguage | null;
  routePath: string;
  hasLanguagePrefix: boolean;
  hasUnsupportedLanguagePrefix: boolean;
}

const PUBLIC_ROUTE_PATH_SET = new Set<string>(PUBLIC_ROUTE_PATHS);

export const normalizeRoutePath = (pathname: string): string => {
  const [pathOnly = '/'] = pathname.split(/[?#]/);
  const prefixedPath = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const singleSlashPath = prefixedPath.replace(/\/+/g, '/');

  if (singleSlashPath === '/') {
    return '/';
  }

  return singleSlashPath.replace(/\/+$/, '');
};

const looksLikeLanguagePrefix = (value: string | undefined): value is string =>
  typeof value === 'string' && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(value);

export const getLanguageRouteInfo = (pathname: string): LanguageRouteInfo => {
  const normalizedPath = normalizeRoutePath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);
  const [firstSegment] = segments;

  if (firstSegment && isRouteLanguage(firstSegment)) {
    const restSegments = segments.slice(1);
    const routePath =
      restSegments.length > 0 ? normalizeRoutePath(`/${restSegments.join('/')}`) : '/';

    return {
      language: firstSegment,
      languagePrefix: firstSegment,
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
      languagePrefix: null,
      routePath,
      hasLanguagePrefix: false,
      hasUnsupportedLanguagePrefix: true,
    };
  }

  const hasUnsupportedLanguagePrefix =
    looksLikeLanguagePrefix(firstSegment) && firstSegment !== DEFAULT_LANGUAGE;

  return {
    language: DEFAULT_LANGUAGE,
    languagePrefix: null,
    routePath: normalizedPath,
    hasLanguagePrefix: false,
    hasUnsupportedLanguagePrefix,
  };
};

export const isPublicRoutePath = (routePath: string): routePath is PublicRoutePath =>
  PUBLIC_ROUTE_PATH_SET.has(normalizeRoutePath(routePath));

export const getPublicRoutePath = (pathname: string): PublicRoutePath | null => {
  const { routePath } = getLanguageRouteInfo(pathname);
  return isPublicRoutePath(routePath) ? routePath : null;
};

export const getLanguageFromPathname = (pathname: string): Language | null => {
  const { hasLanguagePrefix, language } = getLanguageRouteInfo(pathname);
  return hasLanguagePrefix ? language : null;
};

export const getLocalizedPath = (
  routePath: PublicRoutePath,
  language: Language
): string => {
  if (language === DEFAULT_LANGUAGE) {
    return routePath;
  }

  if (routePath === '/') {
    return `/${language}/`;
  }

  return `/${language}${routePath}`;
};

export const toAbsoluteSeoUrl = (path: string): string => {
  if (path === '/') {
    return `${SEO_BASE_URL}/`;
  }

  return `${SEO_BASE_URL}${path}`;
};

export const getCanonicalUrl = (
  routePath: PublicRoutePath,
  language: Language
): string => toAbsoluteSeoUrl(getLocalizedPath(routePath, language));

export const getHreflangAlternates = (
  routePath: PublicRoutePath
): Array<{ hreflang: Language | 'x-default'; href: string }> => {
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
};

export const getUnsupportedLanguageRedirectPath = (
  pathname: string
): PublicRoutePath | '/' | null => {
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
};

export { ROUTE_LANGUAGES, SUPPORTED_LANGUAGES };
