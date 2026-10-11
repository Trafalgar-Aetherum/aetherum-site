const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });
    await page.goto('file://' + path.resolve(__dirname, 'index.html'), {
      waitUntil: 'load'
    });
    await page.evaluate(() => document.fonts.ready);
    const count = await page.locator('.slide').count();
    if (count !== 11) throw new Error('Expected 11 slides; found ' + count);
    const pdf = await PDFDocument.create();
    for (let i = 0; i < count; i++) {
      await page.evaluate(idx => {
        document.querySelectorAll('.topnav, .controls, .hint, .nav-logo').forEach(el => el.style.display = 'none');
        const deck = document.querySelector('.deck');
        deck.style.transition = 'none';
        deck.style.transform = 'translateX(-' + (idx * 100) + 'vw)';
        document.querySelectorAll('.slide .inner > *').forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.transition = 'none';
          el.style.animation = 'none';
        });
      }, i);
      const png = await page.screenshot({ type: 'png' });
      const img = await pdf.embedPng(png);
      const slide = pdf.addPage([960, 540]);
      slide.drawImage(img, { x: 0, y: 0, width: 960, height: 540 });
      console.log('Rendered slide ' + (i + 1) + '/' + count);
    }
    const output = path.resolve(__dirname, 'aetherum-deck.pdf');
    fs.writeFileSync(output, await pdf.save());
    console.log('Saved ' + output);
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
