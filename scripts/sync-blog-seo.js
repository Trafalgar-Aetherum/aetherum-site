#!/usr/bin/env node
'use strict';
/**
 * Keep Aetherum's canonical blog sitemap, static Library links and article
 * canonicals synchronized with posts.json. Run after creating an article.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const BASE = 'https://aetherum.ai';
const staticPaths = [
  '/', '/product.html', '/partners/', '/blog/library/',
  '/crypto-backed-loans-credit-unions/',
  '/crypto-compliance-financial-institutions/',
  '/digital-asset-infrastructure-credit-unions/'
];
const escapeHTML = value => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function sync() {
  const postsPath = path.join(root, 'posts.json');
  const sitemapPath = path.join(root, 'sitemap.xml');
  const libraryPath = path.join(root, 'blog/library/index.html');
  const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  const seen = new Set();
  if (!posts.length) throw Error('No blog articles in posts.json');
  for (const post of posts) {
    if (!post.slug || !post.slug.startsWith('/blog/')) {
      throw Error('Invalid blog slug: ' + post.slug);
    }
    if (!post.slug.endsWith('/')) post.slug += '/';
    if (seen.has(post.slug)) throw Error('Duplicate blog slug: ' + post.slug);
    seen.add(post.slug);
    const file = path.join(root, post.slug.slice(1), 'index.html');
    if (!fs.existsSync(file)) throw Error('Missing article page: ' + file);
    let html = fs.readFileSync(file, 'utf8');
    const url = BASE + post.slug;
    const canonicalTag = '<link rel="canonical" href="' + url + '">';
    const oldCanonical = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;
    if (oldCanonical.test(html)) html = html.replace(oldCanonical, canonicalTag);
    else html = html.replace(/<\/head\s*>/i, canonicalTag + '\n</head>');
    if (!html.includes(canonicalTag)) throw Error('Missing <head> in ' + file);
    fs.writeFileSync(file, html);
  }
  posts.forEach((post, index) => { post.isNew = index === 0; });
  if (posts.filter(p => p.featured).length !== 1) {
    posts.forEach((post, index) => { post.featured = index === 0; });
  }
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + '\n');
  const paths = [...staticPaths, ...posts.map(p => p.slug)];
  if (new Set(paths).size !== paths.length) throw Error('Duplicate sitemap URLs');
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const slug of paths) {
    const frequency = slug === '/' || slug === '/blog/library/' ? 'weekly' : 'monthly';
    const priority = slug === '/' ? '1.0' : slug === '/blog/library/' ? '0.9'
      : slug.startsWith('/blog/') ? '0.7' : '0.8';
    sitemap += '  <url>\n    <loc>' + BASE + slug + '</loc>\n';
    sitemap += '    <changefreq>' + frequency + '</changefreq>\n';
    sitemap += '    <priority>' + priority + '</priority>\n  </url>\n';
  }
  sitemap += '</urlset>\n';
  fs.writeFileSync(sitemapPath, sitemap);
  const library = fs.readFileSync(libraryPath, 'utf8');
  const open = '<div class="grid" id="grid">';
  const end = '\n</div>\n</main>';
  const startAt = library.indexOf(open), endAt = library.indexOf(end, startAt);
  if (startAt < 0 || endAt < 0) throw Error('Could not locate static Library grid');
  const cards = posts.map(post => {
    const meta = [post.date, post.readTime].filter(Boolean).join(' · ');
    return '<a class="card" href="' + escapeHTML(post.slug) + '">'
      + '<div class="meta">' + escapeHTML(meta) + '</div>'
      + '<h2>' + escapeHTML(post.icon) + ' ' + escapeHTML(post.title) + '</h2>'
      + '<p>' + escapeHTML(post.excerpt) + '</p>'
      + '<span class="read">Read Article →</span></a>';
  }).join('\n');
  const replacement = open + '\n'
    + '<!-- Search-friendly static article links; JS enhances filtering. -->\n'
    + cards;
  fs.writeFileSync(libraryPath,
    library.slice(0, startAt) + replacement + library.slice(endAt));
  console.log('Blog SEO synchronized: ' + posts.length + ' articles, '
    + paths.length + ' sitemap URLs, static archive links updated.');
}

if (require.main === module) sync();
module.exports = { sync };
