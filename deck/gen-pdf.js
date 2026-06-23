const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  const htmlPath = 'file://' + path.resolve('/Users/trafalgar17/aetherum/aetherum-site/deck/index.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle' });

  const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log(`Found ${slideCount} slides`);

  const tmpDir = '/tmp/aetherum-slides';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const slidePdfs = [];
  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((idx) => {
      const deck = document.querySelector('.deck');
      deck.style.transition = 'none';
      deck.style.transform = `translateX(-${idx * 100}vw)`;
      document.querySelectorAll('.slide .inner > *').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.transition = 'none';
      });
      document.querySelectorAll('.topnav, .controls, .hint, .nav-logo').forEach(el => {
        el.style.display = 'none';
      });
    }, i);

    await page.waitForTimeout(200);

    const outPath = `${tmpDir}/slide-${String(i).padStart(2, '0')}.pdf`;
    await page.pdf({
      path: outPath,
      width: '1280px',
      height: '720px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    slidePdfs.push(outPath);
    console.log(`Captured slide ${i + 1}/${slideCount}`);
  }

  await browser.close();

  // Merge with pdf-lib
  const merged = await PDFDocument.create();
  for (const f of slidePdfs) {
    const doc = await PDFDocument.load(fs.readFileSync(f));
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  const outPdf = path.resolve(__dirname, 'deck.pdf');
  fs.writeFileSync(outPdf, await merged.save());
  console.log(`Done — ${merged.getPageCount()} pages → ${outPdf}`);
})();
