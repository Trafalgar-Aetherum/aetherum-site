#!/usr/bin/env node
/**
 * generate-product-pdf.js
 * Renders product.html locally via Puppeteer and saves product-overview.pdf.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const SRC = 'file://' + path.resolve(__dirname, '..', 'product.html');
const OUT = path.resolve(__dirname, '..', 'product-overview.pdf');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  console.log('Loading product.html ...');
  await page.goto(SRC, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);

  await page.evaluate(() => {
    // Hide nav and sticky header
    document.querySelectorAll('nav, .nav').forEach(el => el.remove());

    // Kill animations
    document.querySelectorAll('*').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.visibility = 'visible';
    });

    // Remove @media print rules that might fight the PDF output
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (let i = rules.length - 1; i >= 0; i--) {
          if (
            rules[i].type === CSSRule.MEDIA_RULE &&
            rules[i].conditionText === 'print'
          ) {
            sheet.deleteRule(i);
          }
        }
      } catch (_) {}
    }
  });

  await page.pdf({
    path: OUT,
    format: 'Letter',
    landscape: false,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: false,
    displayHeaderFooter: false,
  });

  console.log(`PDF saved: ${OUT}`);
  await browser.close();
})();
