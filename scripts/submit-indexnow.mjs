/* global fetch, console */
import { readFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

export const DEFAULT_HOST = 'crypto-survivors.com';
export const DEFAULT_KEY_FILE = 'public/7f74f2a3a02f4e1b8e9a6c5d4b3a2190.txt';
export const DEFAULT_SITEMAP = 'public/sitemap.xml';
export const MAX_URLS_PER_REQUEST = 10000;
export const DEFAULT_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://yandex.com/indexnow',
];

export const readArg = (argv, name) => {
  const prefix = `--${name}=`;
  const arg = argv.find(value => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
};

const hasFlag = (argv, name) => argv.includes(`--${name}`);

export const parseEndpointList = value => {
  const endpoints = value
    .split(',')
    .map(endpoint => endpoint.trim())
    .filter(Boolean);

  if (endpoints.length === 0) {
    throw new Error('INDEXNOW_ENDPOINTS must include at least one endpoint.');
  }

  return endpoints;
};

export const parseCliOptions = (argv = process.argv, env = process.env) => {
  const args = argv.slice(2);
  const submitAll = hasFlag(args, 'all');
  const urlsArg = readArg(args, 'urls');

  if (submitAll && urlsArg !== undefined) {
    throw new Error('Use either --all or --urls=..., not both.');
  }

  return {
    host: readArg(args, 'host') ?? env.INDEXNOW_HOST ?? DEFAULT_HOST,
    keyFile: readArg(args, 'key-file') ?? env.INDEXNOW_KEY_FILE ?? DEFAULT_KEY_FILE,
    sitemapPath: readArg(args, 'sitemap') ?? env.INDEXNOW_SITEMAP ?? DEFAULT_SITEMAP,
    endpoints: parseEndpointList(env.INDEXNOW_ENDPOINTS ?? DEFAULT_ENDPOINTS.join(',')),
    mode: urlsArg === undefined ? 'all' : 'urls',
    urlsArg,
  };
};

export const extractSitemapUrls = sitemap => {
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
};

const parseUrlsArg = urlsArg => {
  if (urlsArg === undefined) {
    return [];
  }

  return urlsArg
    .split(',')
    .map(url => url.trim())
    .filter(Boolean);
};

export const validateKey = key => {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
    throw new Error(
      'IndexNow key must be 8-128 characters and contain only letters, numbers, or dashes.'
    );
  }

  return key;
};

export const normalizeUrlList = (rawUrls, { host, maxUrls = MAX_URLS_PER_REQUEST }) => {
  if (rawUrls.length === 0) {
    throw new Error('IndexNow submission requires at least one URL.');
  }

  const urlList = [];
  const seen = new Set();

  for (const rawUrl of rawUrls) {
    const value = rawUrl.trim();
    if (!value) {
      continue;
    }

    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Invalid IndexNow URL: ${value}`);
    }

    if (url.protocol !== 'https:') {
      throw new Error(`IndexNow URL must use HTTPS: ${value}`);
    }

    if (url.hostname !== host) {
      throw new Error(`IndexNow URL host must match ${host}: ${value}`);
    }

    const normalizedUrl = url.href;
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      urlList.push(normalizedUrl);
    }
  }

  if (urlList.length === 0) {
    throw new Error('IndexNow submission requires at least one URL.');
  }

  if (urlList.length > maxUrls) {
    throw new Error(
      `IndexNow supports at most ${maxUrls.toLocaleString('en-US')} URLs per request.`
    );
  }

  return urlList;
};

export const loadUrlList = ({ mode, urlsArg, sitemapPath, host, cwd }) => {
  const rawUrls =
    mode === 'urls'
      ? parseUrlsArg(urlsArg)
      : extractSitemapUrls(readFileSync(join(cwd, sitemapPath), 'utf8'));

  return normalizeUrlList(rawUrls, { host });
};

export const buildPayload = ({ host, key, keyFile, urlList }) => {
  return {
    host,
    key: validateKey(key),
    keyLocation: `https://${host}/${basename(keyFile)}`,
    urlList,
  };
};

export const submitIndexNow = async ({ endpoints, payload, fetchImpl, log }) => {
  const results = [];

  for (const endpoint of endpoints) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok && response.status !== 202) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `IndexNow submission failed for ${endpoint}: ${response.status} ${body}`
      );
    }

    const result = {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      urlCount: payload.urlList.length,
    };
    results.push(result);
    log(
      `Submitted ${result.urlCount} URLs to ${endpoint}: ${response.status} ${response.statusText}`
    );
  }

  return results;
};

export const main = async ({
  argv = process.argv,
  env = process.env,
  cwd = process.cwd(),
  fetchImpl = fetch,
  log = console.log,
} = {}) => {
  const options = parseCliOptions(argv, env);
  const key = readFileSync(join(cwd, options.keyFile), 'utf8').trim();
  const urlList = loadUrlList({ ...options, cwd });
  const payload = buildPayload({
    host: options.host,
    key,
    keyFile: options.keyFile,
    urlList,
  });

  log(
    `Submitting ${urlList.length} IndexNow URL${urlList.length === 1 ? '' : 's'} from ${options.mode === 'urls' ? '--urls' : options.sitemapPath}.`
  );

  return submitIndexNow({
    endpoints: options.endpoints,
    payload,
    fetchImpl,
    log,
  });
};

const isMainModule = () => {
  const entrypoint = process.argv[1];
  return entrypoint ? fileURLToPath(import.meta.url) === resolve(entrypoint) : false;
};

if (isMainModule()) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
