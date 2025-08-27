// 測試指紋採集功能
const puppeteer = require('puppeteer');

async function testFingerprint() {
    console.log('啟動瀏覽器測試...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // 設定視窗大小
        await page.setViewport({ width: 1280, height: 720 });
        
        // 前往測試網站
        console.log('前往測試網站...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // 等待頁面載入
        await page.waitForSelector('#collectBtn');
        
        console.log('點擊採集指紋按鈕...');
        await page.click('#collectBtn');
        
        // 等待採集完成
        await page.waitForTimeout(3000);
        
        // 檢查結果
        const resultText = await page.$eval('#result', el => el.textContent);
        const userStatusText = await page.$eval('#userStatusText', el => el.textContent);
        
        console.log('採集結果:', resultText);
        console.log('使用者狀態:', userStatusText);
        
        // 等待一下讓使用者看到結果
        await page.waitForTimeout(2000);
        
    } catch (error) {
        console.error('測試失敗:', error);
    } finally {
        await browser.close();
        console.log('測試完成');
    }
}

// 如果直接執行此檔案
if (require.main === module) {
    testFingerprint().catch(console.error);
}

module.exports = { testFingerprint };
