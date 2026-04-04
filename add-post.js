#!/usr/bin/env node
/**
 * add-post.js — Add a new post to posts.json and sitemap.xml
 *
 * Usage:
 *   node add-post.js \
 *     --slug "/blog/my-post/" \
 *     --title "My Post Title" \
 *     --excerpt "Short description shown on blog index." \
 *     --date "April 5, 2026" \
 *     --read-time "5 min read" \
 *     --icon "🔐" \
 *     [--new] \
 *     [--featured]
 *
 * Flags:
 *   --new        Mark post with the green "New" badge
 *   --featured   Make this the featured post on blog/index.html
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_FILE = path.join(ROOT, 'posts.json');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const slug     = getArg('slug');
const title    = getArg('title');
const excerpt  = getArg('excerpt');
const date     = getArg('date') || '';
const readTime = getArg('read-time') || '5 min read';
const icon     = getArg('icon') || '📝';
const isNew    = hasFlag('new');
const featured = hasFlag('featured');

if (!slug || !title || !excerpt) {
  console.error('Error: --slug, --title, and --excerpt are required.\n');
  console.error('Example:');
  console.error('  node add-post.js \\');
  console.error('    --slug "/blog/my-post/" \\');
  console.error('    --title "My Post Title" \\');
  console.error('    --excerpt "Short description." \\');
  console.error('    --date "April 5, 2026" \\');
  console.error('    --read-time "5 min read" \\');
  console.error('    --icon "🔐" \\');
  console.error('    --new --featured');
  process.exit(1);
}

// ── Update posts.json ────────────────────────────────────────────────────────
const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));

// Remove any existing entry with the same slug (deduplicates on re-run)
const existing = posts.findIndex(p => p.slug === slug);
if (existing !== -1) {
  posts.splice(existing, 1);
  console.log(`  Removed existing entry for ${slug}`);
}

// If --featured, unflag all existing featured posts
if (featured) {
  posts.forEach(p => { p.featured = false; });
}

const newPost = { slug, title, excerpt, date, readTime, icon, isNew, featured };
posts.unshift(newPost);

fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + '\n');
console.log(`✓ Added to posts.json: "${title}"`);

// ── Update sitemap.xml ───────────────────────────────────────────────────────
const sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');
const fullUrl = `https://aetherum.ai${slug}`;

if (sitemap.includes(fullUrl)) {
  console.log(`  sitemap.xml already contains ${fullUrl} — skipped`);
} else {
  const entry = `  <url>
    <loc>${fullUrl}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  const updated = sitemap.replace('</urlset>', entry + '</urlset>');
  fs.writeFileSync(SITEMAP_FILE, updated);
  console.log(`✓ Added to sitemap.xml: ${fullUrl}`);
}

// ── Done ─────────────────────────────────────────────────────────────────────
console.log('\nNext steps:');
console.log(`  1. Create blog/index.html auto-renders from posts.json — nothing to do there.`);
console.log(`  2. If you want a card on the homepage, manually add it to index.html blog grid.`);
console.log(`  3. git add posts.json sitemap.xml && git commit -m "feat: add post" && git push`);
