import React, { useEffect } from 'react';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type Language,
} from '../contexts/LanguageConstants';
import {
  getCanonicalUrl,
  getHreflangAlternates,
  isPublicRoutePath,
  normalizeRoutePath,
  SEO_BASE_URL,
  type PublicRoutePath,
} from '../utils/seoRoutes';

type SEOProps = {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  noindex?: boolean;
  lang?: string;
  themeColor?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  breadcrumbs?: Array<{ name: string; item: string }>;
};

/**
 * SEO Component for React 19 Metadata Hoisting
 * Emits route-level canonical, hreflang, social, robots, and JSON-LD metadata.
 */
export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalPath,
  ogImage,
  noindex,
  lang = 'en',
  themeColor = '#020617',
  structuredData,
  breadcrumbs,
}) => {
  const siteTitle = 'Crypto Survivors';
  const fullTitle = title ?? `${siteTitle} - Free Bitcoin Survival Game`;
  const defaultDescription =
    'Play Crypto Survivors, a free browser survival game where live Bitcoin market volatility shapes enemy waves, rewards, and rogue-lite strategy.';
  const language: Language = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  const normalizedCanonicalPath = normalizeRoutePath(canonicalPath ?? '/');
  const publicRoutePath: PublicRoutePath = isPublicRoutePath(normalizedCanonicalPath)
    ? normalizedCanonicalPath
    : '/';
  const canonicalUrl = getCanonicalUrl(publicRoutePath, language);
  const hreflangAlternates = noindex ? [] : getHreflangAlternates(publicRoutePath);
  const resolvedDescription = description ?? defaultDescription;
  const resolvedOgImage = ogImage ?? `${SEO_BASE_URL}/icons/icon-512.png`;

  // Generate Breadcrumb Schema if provided
  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item.startsWith('http')
            ? crumb.item
            : `${SEO_BASE_URL}${crumb.item}`,
        })),
      }
    : null;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', themeColor);
  }, [themeColor]);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="author" content="Crypto Survivors Team" />
      <link rel="canonical" href={canonicalUrl} />
      {hreflangAlternates.map(alternate => (
        <link
          key={alternate.hreflang}
          rel="alternate"
          hrefLang={alternate.hreflang}
          href={alternate.href}
        />
      ))}

      {/* Robots Control */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* Open Graph */}
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={language} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      )}
    </>
  );
};
