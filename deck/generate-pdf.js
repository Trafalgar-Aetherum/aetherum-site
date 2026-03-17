#!/usr/bin/env node
/**
 * generate-pdf.js — Capture each deck section as a 1280×720 viewport
 * screenshot and combine them into deck.pdf (one section per page).
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

const SECTIONS = [
  '#hero',
  '#problem',
  '#solution',
  '#market',
  '#traction',
  '#revenue',
  '#team',
  '#ask',
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const htmlPath = 'file://' + path.resolve(__dirname, 'index.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for Google Fonts
  await page.evaluate(() => document.fonts.ready);

  // Force all fade-in / animated elements visible
  await page.evaluate(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    document.querySelectorAll(
      '.hero-eyebrow, .hero-title, .hero-sub, .hero-stats, .scroll-hint'
    ).forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.animation = 'none';
    });
    // Hide the fixed nav so it doesn't overlay every slide
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
  });

  // Force every section to exactly one viewport height so each is one "slide"
  await page.evaluate((vh) => {
    document.querySelectorAll('section').forEach(sec => {
      sec.style.minHeight = vh + 'px';
      sec.style.maxHeight = vh + 'px';
      sec.style.height = vh + 'px';
      sec.style.overflow = 'hidden';
    });
    // Hide footer so it doesn't bleed into the last section
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
  }, VIEWPORT.height);

  // Screenshot each section at exactly the viewport size
  const screenshots = [];
  for (const selector of SECTIONS) {
    // Scroll section to the top of the viewport
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) window.scrollTo(0, el.offsetTop);
    }, selector);

    // Wait for repaint
    await new Promise(r => setTimeout(r, 300));

    const buf = await page.screenshot({ type: 'png' });
    screenshots.push(buf);
    console.log(`  captured ${selector}`);
  }

  // Build a temporary HTML page with each screenshot as a full-bleed page
  const imgTags = screenshots
    .map((buf) => {
      const b64 = buf.toString('base64');
      return `<div class="slide"><img src="data:image/png;base64,${b64}"></div>`;
    })
    .join('\n');

  const assemblyHtml = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  @page { size: 1280px 720px; margin: 0; }
  .slide { width: 1280px; height: 720px; page-break-after: always; overflow: hidden; }
  .slide:last-child { page-break-after: auto; }
  .slide img { width: 100%; height: 100%; display: block; }
</style></head><body>
${imgTags}
</body></html>`;

  // Open a new page and print the assembled slides as PDF
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(assemblyHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const outPath = path.resolve(__dirname, 'deck.pdf');
  await pdfPage.pdf({
    path: outPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log(`\nPDF saved: ${outPath} (${SECTIONS.length} pages)`);
})();
