---
description: SEO Optimization (Robots.txt & Sitemap)
---

# 🚀 SEO Optimization Workflow

This workflow ensures that the game is properly indexed by search engines and follows SEO best practices for the `crypto-survivors.com` domain.

## 📋 Steps

### 1. Create Robots.txt
Create a `public/robots.txt` file to guide search engine crawlers.

- Allow all crawlers to the homepage and game.
- Disallow private or debug paths if any.
- Point to the sitemap URL.

### 2. Create Sitemap.xml
Create a `public/sitemap.xml` file listing all navigable pages.

- URL: `https://crypto-survivors.com/`
- Frequency: `daily`
- Priority: `1.0`

### 3. Verify Meta Tags
Check `index.html` for essential SEO tags:
- `title`
- `description`
- `keywords`
- `canonical` link
- Open Graph tags (OG)
- Twitter card tags

### 4. Verification
Run a checks to ensure files are accessible at:
- `https://crypto-survivors.com/robots.txt`
- `https://crypto-survivors.com/sitemap.xml`

// turbo
### 5. Deployment
Push the changes to Railway:
```bash
git add public/robots.txt public/sitemap.xml index.html
git commit -m "feat: add seo metadata (robots and sitemap)"
npm run railway:deploy
```
