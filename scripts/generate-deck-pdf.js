#!/usr/bin/env node
/**
 * generate-deck-pdf.js
 *
 * Loads the live deck at https://aetherum.ai/deck via Puppeteer,
 * injects layout overrides (no @media print reliance), and prints
 * a clean portrait-Letter PDF to deck/deck.pdf.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = path.resolve(__dirname, '..', 'deck', 'deck.pdf');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  // 1. Navigate to the live page
  console.log('Loading https://aetherum.ai/deck ...');
  await page.goto('https://aetherum.ai/deck', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  // 2. Wait 3 seconds for full load
  await new Promise((r) => setTimeout(r, 3000));
  await page.evaluate(() => document.fonts.ready);
  console.log('Page loaded, fonts ready');

  // 3. Inject layout overrides
  await page.evaluate(() => {
    // --- Remove nav/header elements entirely ---
    document
      .querySelectorAll('nav, header, [class*="nav"], [class*="header"]')
      .forEach((el) => el.remove());

    // --- Remove scroll indicator ---
    document
      .querySelectorAll('.scroll-hint, .scroll-indicator, [class*="scroll"]')
      .forEach((el) => el.remove());

    // --- Remove footer ---
    document.querySelectorAll('footer').forEach((el) => el.remove());

    // --- Set all section heights to auto, overflow visible ---
    document.querySelectorAll('section').forEach((sec) => {
      sec.style.minHeight = '0';
      sec.style.height = 'auto';
      sec.style.maxHeight = 'none';
      sec.style.overflow = 'visible';
    });

    // --- Remove ALL page-break and break-after CSS from every element ---
    document.querySelectorAll('*').forEach((el) => {
      el.style.pageBreakBefore = 'auto';
      el.style.pageBreakAfter = 'auto';
      el.style.pageBreakInside = 'auto';
      el.style.breakBefore = 'auto';
      el.style.breakAfter = 'auto';
      el.style.breakInside = 'auto';
    });

    // --- Force opacity/transform/visibility on all elements ---
    document.querySelectorAll('*').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.visibility = 'visible';
      el.style.animation = 'none';
      el.style.transition = 'none';
    });

    // --- Nuke the @media print stylesheet rules so they can't interfere ---
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
      } catch (_) {
        // Cross-origin stylesheets — skip
      }
    }
  });
  console.log('Layout overrides injected');

  // --- Scroll through entire page to trigger lazy loading ---
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = 720;
  for (let y = 0; y < scrollHeight; y += viewportHeight) {
    await page.evaluate((pos) => window.scrollTo(0, pos), y);
    await new Promise((r) => setTimeout(r, 150));
  }
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  console.log('Scrolled through page');

  // 4. Wait 2 more seconds
  await new Promise((r) => setTimeout(r, 2000));

  // 5. Print to PDF
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
