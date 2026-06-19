#!/usr/bin/env node
/**
 * gen-product-pdf-local.js
 * Renders product.html (local file) via Puppeteer → aetherum-product.pdf
 */
const puppeteer = require('puppeteer');
const path = require('path');

const SRC = 'file://' + path.resolve(__dirname, '..', 'product.html');
const OUT = path.resolve(__dirname, '..', 'aetherum-product.pdf');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  console.log('Loading product.html (local) ...');
  await page.goto(SRC, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 3000));

  await page.evaluate(() => {
    document.querySelectorAll('nav, .nav, .topnav, .controls, .hint').forEach(el => el.remove());
    document.querySelectorAll('*').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.visibility = 'visible';
    });
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (let i = rules.length - 1; i >= 0; i--) {
          if (rules[i].type === CSSRule.MEDIA_RULE && rules[i].conditionText === 'print') {
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
