import React from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  noindex?: boolean;
  lang?: string;
  themeColor?: string;
  structuredData?: Record<string, unknown>;
  breadcrumbs?: Array<{ name: string; item: string }>;
}

/**
 * SEO Component for React 19 Metadata Hoisting
 * Upgraded for 2026 SEO Standards (GEO/AI Discovery & structured data)
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
  const fullTitle = title
    ? `${title} | ${siteTitle}`
    : `${siteTitle} - Free Bitcoin Survival Game 🚀`;
  const defaultDescription =
    '🎮 Crypto Survivors: Free browser game with real-time Bitcoin price action! Vampire Survivors meets crypto trading. Play now - no download required!';
  const baseUrl = 'https://crypto-survivors.com';

  const cleanPath = canonicalPath?.startsWith('/')
    ? canonicalPath
    : `/${canonicalPath ?? ''}`;
  const canonicalUrl =
    canonicalPath === '/' ? baseUrl : `${baseUrl}${cleanPath === '/' ? '' : cleanPath}`;

  // Generate Breadcrumb Schema if provided
  const breadcrumbSchema = breadcrumbs
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item.startsWith('http') ? crumb.item : `${baseUrl}${crumb.item}`,
        })),
      }
    : null;

  return (
    <>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description ?? defaultDescription} />
      <meta name="author" content="Crypto Survivors Team" />
      <meta name="theme-color" content={themeColor} />
      <link rel="canonical" href={canonicalUrl} />

      {/* 2026 AI Discovery (GEO) Meta Tags */}
      <meta name="ai-discovery" content="indexed" />
      <meta name="sge-content" content="authorized" />

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
      <meta property="og:description" content={description ?? defaultDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage ?? `${baseUrl}/icons/icon-512.png`} />
      <meta property="og:type" content="website" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description ?? defaultDescription} />
      <meta name="twitter:image" content={ogImage ?? `${baseUrl}/icons/icon-512.png`} />

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
