#!/usr/bin/env node
/**
 * gen-deck-pdf-local.js
 * Captures each .slide from deck/index.html locally → deck/aetherum-deck.pdf
 * Approach: pin each slide to the viewport, screenshot it, then assemble into PDF.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const SRC = 'file://' + path.resolve(__dirname, '..', 'deck', 'index.html');
const OUT = path.resolve(__dirname, '..', 'deck', 'aetherum-deck.pdf');
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  console.log('Loading deck/index.html (local) ...');
  await page.goto(SRC, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 3000));
  console.log('Page loaded.');

  // Count slides
  const slideCount = await page.evaluate(() =>
    document.querySelectorAll('#deck .slide').length
  );
  console.log(`Found ${slideCount} slides.`);

  // Remove nav/controls/hint so they don't overlay slides
  await page.evaluate(() => {
    document.querySelectorAll('.topnav, .controls, .hint').forEach(el => el.remove());
    // Force all elements visible
    document.querySelectorAll('*').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.visibility = 'visible';
    });
    // Hide all slides initially
    document.querySelectorAll('#deck .slide').forEach(s => { s.style.display = 'none'; });
  });

  const screenshots = [];
  for (let idx = 0; idx < slideCount; idx++) {
    await page.evaluate((i) => {
      // Hide all slides
      document.querySelectorAll('#deck .slide').forEach(s => { s.style.display = 'none'; });
      // Pin the target slide to fill viewport
      const slide = document.querySelectorAll('#deck .slide')[i];
      if (slide) {
        slide.style.display = 'flex';
        slide.style.position = 'fixed';
        slide.style.top = '0';
        slide.style.left = '0';
        slide.style.width = '100vw';
        slide.style.height = '100vh';
        slide.style.maxHeight = '100vh';
        slide.style.overflow = 'hidden';
        slide.style.zIndex = '9999';
        slide.style.transform = 'none';
      }
    }, idx);

    await new Promise(r => setTimeout(r, 300));
    const buf = await page.screenshot({ type: 'png' });
    screenshots.push(buf);
    console.log(`  captured slide ${idx + 1}/${slideCount}`);

    // Unpin slide
    await page.evaluate((i) => {
      const slide = document.querySelectorAll('#deck .slide')[i];
      if (slide) {
        slide.style.display = 'none';
        slide.style.position = '';
        slide.style.top = '';
        slide.style.left = '';
        slide.style.width = '';
        slide.style.height = '';
        slide.style.maxHeight = '';
        slide.style.overflow = '';
        slide.style.zIndex = '';
      }
    }, idx);
  }

  // Assemble screenshots into multi-page PDF
  const imgTags = screenshots.map(buf => {
    const b64 = buf.toString('base64');
    return `<div class="slide"><img src="data:image/png;base64,${b64}"></div>`;
  }).join('\n');

  const assemblyHtml = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; }
  @page { size: 1280px 720px; margin: 0; }
  .slide { width: 1280px; height: 720px; page-break-after: always; overflow: hidden; }
  .slide:last-child { page-break-after: auto; }
  .slide img { width: 100%; height: 100%; display: block; }
</style></head><body>${imgTags}</body></html>`;

  const pdfPage = await browser.newPage();
  await pdfPage.setContent(assemblyHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await pdfPage.pdf({
    path: OUT,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log(`\nPDF saved: ${OUT} (${slideCount} pages)`);
})();
