const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    console.log('Testing Story Tab dynamic level switcher...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'load' });

    // Dismiss Welcome Portal
    await page.click('#welcomeOptionSandbox');
    await new Promise(r => setTimeout(r, 500));

    // 1. Switch to How It Works tab
    await page.evaluate(() => {
        const items = document.querySelectorAll('.nav-item');
        for (let item of items) {
            if (item.dataset.tab === 'story') {
                item.click();
                break;
            }
        }
    });
    await new Promise(r => setTimeout(r, 500));

    // Verify default state (Simple Mode)
    let simpleVisible = await page.evaluate(() => {
        const simpleDivs = document.querySelectorAll('.simple-only');
        const academicDivs = document.querySelectorAll('.academic-only');
        
        // Check computed display style of first element
        const sDisplay = window.getComputedStyle(simpleDivs[0]).display;
        const aDisplay = window.getComputedStyle(academicDivs[0]).display;
        
        return { simple: sDisplay !== 'none', academic: aDisplay !== 'none' };
    });
    console.log('Default (Simple Mode) visibility:', simpleVisible);
    if (!simpleVisible.simple || simpleVisible.academic) {
        console.error('FAIL: Simple Mode element visibility incorrect.');
        process.exit(1);
    }

    // 2. Click Academic Details
    await page.click('#btnToggleAcademic');
    await new Promise(r => setTimeout(r, 500));

    // Verify toggled state (Academic Details)
    let academicVisible = await page.evaluate(() => {
        const simpleDivs = document.querySelectorAll('.simple-only');
        const academicDivs = document.querySelectorAll('.academic-only');
        
        const sDisplay = window.getComputedStyle(simpleDivs[0]).display;
        const aDisplay = window.getComputedStyle(academicDivs[0]).display;
        
        return { simple: sDisplay !== 'none', academic: aDisplay !== 'none' };
    });
    console.log('Toggled (Academic Details) visibility:', academicVisible);
    if (academicVisible.simple || !academicVisible.academic) {
        console.error('FAIL: Academic Details element visibility incorrect.');
        process.exit(1);
    }

    console.log('SUCCESS: How It Works tab dynamic level switcher works perfectly!');
    await browser.close();
}
run();
