import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

type IndexNowModule = {
  buildPayload: (input: {
    host: string;
    key: string;
    keyFile: string;
    urlList: string[];
  }) => {
    host: string;
    key: string;
    keyLocation: string;
    urlList: string[];
  };
  extractSitemapUrls: (sitemap: string) => string[];
  loadUrlList: (input: {
    mode: 'all' | 'urls';
    urlsArg?: string;
    sitemapPath: string;
    host: string;
    cwd: string;
  }) => string[];
  normalizeUrlList: (
    rawUrls: string[],
    options: { host: string; maxUrls?: number }
  ) => string[];
  parseCliOptions: (
    argv?: string[],
    env?: Record<string, string | undefined>
  ) => {
    host: string;
    keyFile: string;
    sitemapPath: string;
    endpoints: string[];
    mode: 'all' | 'urls';
    urlsArg?: string;
  };
  submitIndexNow: (input: {
    endpoints: string[];
    payload: {
      host: string;
      key: string;
      keyLocation: string;
      urlList: string[];
    };
    fetchImpl: (
      endpoint: string,
      init: RequestInit
    ) => Promise<{
      ok: boolean;
      status: number;
      statusText: string;
      text: () => Promise<string>;
    }>;
    log: (message: string) => void;
  }) => Promise<Array<{ endpoint: string; status: number; urlCount: number }>>;
};

const loadIndexNowModule = async (): Promise<IndexNowModule> => {
  const moduleUrl = pathToFileURL(
    join(process.cwd(), 'scripts/submit-indexnow.mjs')
  ).href;

  return (await import(moduleUrl)) as IndexNowModule;
};

describe('submit-indexnow script', () => {
  it('defaults to full sitemap mode and supports changed URL mode', async () => {
    const { parseCliOptions } = await loadIndexNowModule();

    expect(parseCliOptions(['node', 'script'])).toMatchObject({
      host: 'crypto-survivors.com',
      mode: 'all',
      sitemapPath: 'public/sitemap.xml',
    });
    expect(
      parseCliOptions(['node', 'script', '--urls=https://crypto-survivors.com/'])
    ).toMatchObject({
      mode: 'urls',
      urlsArg: 'https://crypto-survivors.com/',
    });
    expect(() =>
      parseCliOptions([
        'node',
        'script',
        '--all',
        '--urls=https://crypto-survivors.com/',
      ])
    ).toThrow('Use either --all or --urls');
  });

  it('extracts canonical URLs from the sitemap', async () => {
    const { extractSitemapUrls } = await loadIndexNowModule();
    const sitemap = readFileSync(join(process.cwd(), 'public/sitemap.xml'), 'utf8');
    const urls = extractSitemapUrls(sitemap);

    expect(urls).toContain('https://crypto-survivors.com/');
    expect(urls).toContain('https://crypto-survivors.com/terms');
    expect(urls.every(url => url.startsWith('https://crypto-survivors.com'))).toBe(
      true
    );
  });

  it('normalizes, deduplicates, and validates submitted URLs', async () => {
    const { normalizeUrlList } = await loadIndexNowModule();

    expect(
      normalizeUrlList(
        [
          'https://crypto-survivors.com/',
          ' https://crypto-survivors.com/ ',
          'https://crypto-survivors.com/terms',
        ],
        { host: 'crypto-survivors.com' }
      )
    ).toEqual(['https://crypto-survivors.com/', 'https://crypto-survivors.com/terms']);
    expect(() =>
      normalizeUrlList(['http://crypto-survivors.com/'], {
        host: 'crypto-survivors.com',
      })
    ).toThrow('must use HTTPS');
    expect(() =>
      normalizeUrlList(['https://example.com/'], {
        host: 'crypto-survivors.com',
      })
    ).toThrow('host must match crypto-survivors.com');
    expect(() => normalizeUrlList([], { host: 'crypto-survivors.com' })).toThrow(
      'at least one URL'
    );
    expect(() =>
      normalizeUrlList(
        Array.from(
          { length: 10001 },
          (_, index) => `https://crypto-survivors.com/page-${index}`
        ),
        { host: 'crypto-survivors.com' }
      )
    ).toThrow('10,000 URLs');
  });

  it('loads either sitemap URLs or a changed URL list', async () => {
    const { loadUrlList } = await loadIndexNowModule();

    expect(
      loadUrlList({
        mode: 'urls',
        urlsArg: 'https://crypto-survivors.com/, https://crypto-survivors.com/terms',
        sitemapPath: 'public/sitemap.xml',
        host: 'crypto-survivors.com',
        cwd: process.cwd(),
      })
    ).toEqual(['https://crypto-survivors.com/', 'https://crypto-survivors.com/terms']);
    expect(
      loadUrlList({
        mode: 'all',
        sitemapPath: 'public/sitemap.xml',
        host: 'crypto-survivors.com',
        cwd: process.cwd(),
      }).length
    ).toBeGreaterThan(1);
  });

  it('builds the documented payload and posts it to each endpoint', async () => {
    const { buildPayload, submitIndexNow } = await loadIndexNowModule();
    const payload = buildPayload({
      host: 'crypto-survivors.com',
      key: '7f74f2a3a02f4e1b8e9a6c5d4b3a2190',
      keyFile: 'public/7f74f2a3a02f4e1b8e9a6c5d4b3a2190.txt',
      urlList: ['https://crypto-survivors.com/'],
    });
    const requests: Array<{ endpoint: string; payload: unknown }> = [];

    expect(payload).toEqual({
      host: 'crypto-survivors.com',
      key: '7f74f2a3a02f4e1b8e9a6c5d4b3a2190',
      keyLocation: 'https://crypto-survivors.com/7f74f2a3a02f4e1b8e9a6c5d4b3a2190.txt',
      urlList: ['https://crypto-survivors.com/'],
    });

    const results = await submitIndexNow({
      endpoints: ['https://api.indexnow.org/indexnow', 'https://yandex.com/indexnow'],
      payload,
      fetchImpl: async (endpoint, init) => {
        requests.push({
          endpoint,
          payload: JSON.parse(String(init.body)),
        });

        return {
          ok: false,
          status: 202,
          statusText: 'Accepted',
          text: async () => '',
        };
      },
      log: () => undefined,
    });

    expect(results).toEqual([
      {
        endpoint: 'https://api.indexnow.org/indexnow',
        status: 202,
        statusText: 'Accepted',
        urlCount: 1,
      },
      {
        endpoint: 'https://yandex.com/indexnow',
        status: 202,
        statusText: 'Accepted',
        urlCount: 1,
      },
    ]);
    expect(requests).toEqual([
      {
        endpoint: 'https://api.indexnow.org/indexnow',
        payload,
      },
      {
        endpoint: 'https://yandex.com/indexnow',
        payload,
      },
    ]);
  });
});
