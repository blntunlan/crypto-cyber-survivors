/* global fetch, console */
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import process from 'process';

const DEFAULT_HOST = 'crypto-survivors.com';
const DEFAULT_KEY_FILE = 'public/7f74f2a3a02f4e1b8e9a6c5d4b3a2190.txt';
const DEFAULT_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://yandex.com/indexnow',
];

const readArg = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
};

const host = readArg('host') ?? process.env.INDEXNOW_HOST ?? DEFAULT_HOST;
const keyFile =
  readArg('key-file') ?? process.env.INDEXNOW_KEY_FILE ?? DEFAULT_KEY_FILE;
const sitemapPath =
  readArg('sitemap') ?? process.env.INDEXNOW_SITEMAP ?? 'public/sitemap.xml';
const endpoints = (process.env.INDEXNOW_ENDPOINTS ?? DEFAULT_ENDPOINTS.join(','))
  .split(',')
  .map(endpoint => endpoint.trim())
  .filter(Boolean);

const key = readFileSync(join(process.cwd(), keyFile), 'utf8').trim();
const sitemap = readFileSync(join(process.cwd(), sitemapPath), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => {
  return match[1];
});

if (urlList.length === 0) {
  throw new Error(`No <loc> URLs found in ${sitemapPath}`);
}

const keyLocation = `https://${host}/${basename(keyFile)}`;
const payload = {
  host,
  key,
  keyLocation,
  urlList,
};

for (const endpoint of endpoints) {
  const response = await fetch(endpoint, {
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

  console.log(
    `Submitted ${urlList.length} URLs to ${endpoint}: ${response.status} ${response.statusText}`
  );
}
