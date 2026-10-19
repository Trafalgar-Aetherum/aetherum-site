const {chromium}=require('playwright');
const {PDFDocument}=require('pdf-lib');
const fs=require('fs'),path=require('path');
// One renderer for the HTML source and checked-in downloads. No provider calls.
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||chromium.executablePath(),args:['--no-sandbox']});try{
const qaDir=process.env.PUBLIC_MATERIALS_QA_DIR||path.resolve('tmp/public-materials-qa');fs.mkdirSync(qaDir,{recursive:true});
for(const [src,out] of [['product.html','aetherum-product.pdf'],['deck/index.html','deck/aetherum-deck.pdf']]){
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
await page.goto('file://'+path.resolve(src),{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
const count=await page.locator('.slide').count();if(count!==11)throw Error(src+' expected 11 slides, got '+count);
const pdf=await PDFDocument.create();
await page.addStyleTag({content:'.topnav,.controls,.hint,.brand,.brand-link,.back,body>a{display:none!important}.deck{transform:none!important;width:1440px!important;height:auto!important;display:block!important}.slide{display:none!important;width:1440px!important;height:auto!important;min-height:900px!important;max-height:none!important;overflow:visible!important;position:static!important;padding:60px 80px!important}.slide.rendering{display:flex!important}.slide .inner>*{opacity:1!important;transform:none!important;transition:none!important}'});
for(let i=0;i<count;i++){
await page.evaluate(i=>{document.querySelectorAll('.slide').forEach((s,j)=>s.classList.toggle('rendering',i===j));},i);
const el=page.locator('.slide').nth(i);const box=await el.boundingBox();if(!box||box.height>2000)throw Error('Unexpected slide bounds '+src+' '+i+' '+JSON.stringify(box));
const png=await el.screenshot({animations:'disabled'});fs.writeFileSync(qaDir+'/'+(src.startsWith('deck')?'deck':'product')+'-'+(i+1)+'.png',png);
const img=await pdf.embedPng(png);const ph=960*box.height/box.width;const pp=pdf.addPage([960,ph]);pp.drawImage(img,{x:0,y:0,width:960,height:ph});
console.log(src,'slide',i+1,Math.round(box.height));
}
fs.writeFileSync(out,await pdf.save());await page.close();
}
const page=await browser.newPage({viewport:{width:1000,height:1400}});await page.goto('file://'+path.resolve('docs/institutional-control-plane-overview.html'),{waitUntil:'networkidle'});await page.pdf({path:'docs/institutional-control-plane-overview.pdf',format:'A4',printBackground:true,margin:{top:'15mm',bottom:'15mm',left:'16mm',right:'16mm'}});await page.screenshot({path:path.join(qaDir,'overview.png'),fullPage:true});
for(const [file,w,h] of [['company-banner',1128,191],['personal-banner',1584,396],['control-plane-card',1200,627]]){
await page.setViewportSize({width:w,height:h});await page.goto('file://'+path.resolve('assets/social/'+file+'.html'),{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'assets/social/'+file+'.png'});
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
