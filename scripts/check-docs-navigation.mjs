import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = filePath =>
  JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'));

const docsNav = readJson('docs/navigation.json');
const publicNav = readJson('public/docs/navigation.json');

const flattenNavLinks = nav =>
  (nav.sidebar ?? []).flatMap(section =>
    (section.items ?? []).map(item => ({
      section: section.text,
      title: item.text,
      link: item.link,
    }))
  );

const walkMarkdown = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkMarkdown(fullPath);
    }

    return entry.name.endsWith('.md') ? [fullPath] : [];
  });

const toDocPath = (baseDirectory, link) =>
  path.join(root, baseDirectory, `${link.replace(/^\/docs\//, '')}.md`);

const isActiveDoc = filePath =>
  !filePath.includes(`${path.sep}archive${path.sep}`) &&
  !filePath.includes(`${path.sep}archived${path.sep}`) &&
  !filePath.includes(`${path.sep}completed${path.sep}`);

const navItems = flattenNavLinks(docsNav);
const publicNavItems = flattenNavLinks(publicNav);
const missingDocs = navItems.filter(
  item => !fs.existsSync(toDocPath('docs', item.link))
);
const missingPublicDocs = navItems.filter(
  item => !fs.existsSync(toDocPath('public/docs', item.link))
);
const archivedLinks = navItems.filter(
  item => item.link.includes('/archived/') || item.link.includes('/completed/')
);
const publicMismatch = JSON.stringify(docsNav) !== JSON.stringify(publicNav);
const activeDocs = walkMarkdown(path.join(root, 'docs')).filter(isActiveDoc);
const activePublicDocs = walkMarkdown(path.join(root, 'public/docs')).filter(
  isActiveDoc
);

const summary = {
  sections: docsNav.sidebar?.length ?? 0,
  navItems: navItems.length,
  publicNavItems: publicNavItems.length,
  activeDocs: activeDocs.length,
  activePublicDocs: activePublicDocs.length,
  missingDocs: missingDocs.length,
  missingPublicDocs: missingPublicDocs.length,
  archivedLinks: archivedLinks.length,
  publicMismatch,
};

const failures = [];

if (missingDocs.length > 0) {
  failures.push({
    check: 'docs/navigation.json links exist in docs/',
    items: missingDocs,
  });
}

if (missingPublicDocs.length > 0) {
  failures.push({
    check: 'docs/navigation.json links exist in public/docs/',
    items: missingPublicDocs,
  });
}

if (archivedLinks.length > 0) {
  failures.push({
    check: 'navigation excludes archived/completed docs',
    items: archivedLinks,
  });
}

if (publicMismatch) {
  failures.push({
    check: 'docs/navigation.json matches public/docs/navigation.json',
  });
}

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}
