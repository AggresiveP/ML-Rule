const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    console.log('Launching browser at 1440x900...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    let hasErrors = false;

    // Log console messages
    page.on('console', msg => {
        console.log(`[BROWSER LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
        if (msg.type() === 'error') {
            hasErrors = true;
        }
    });

    // Log page errors (exceptions)
    page.on('pageerror', err => {
        console.error(`[BROWSER ERROR] EXCEPTION:`, err.message, err.stack);
        hasErrors = true;
    });

    const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
    console.log(`Opening URL: ${fileUrl}`);

    try {
        await page.goto(fileUrl, { waitUntil: 'load' });
        console.log('Page loaded.');
        await new Promise(r => setTimeout(r, 1000));

        // Take initial screenshot of home page
        const homePath = path.resolve(__dirname, 'initial_state.png');
        await page.screenshot({ path: homePath });
        console.log(`Saved screenshot to ${homePath}`);

        // Dismiss Welcome Portal
        console.log('--- Action: Clicking LAUNCH SANDBOX on Welcome Portal ---');
        await page.click('#welcomeOptionSandbox');
        await new Promise(r => setTimeout(r, 1000));

        // 1. Switch to Playground
        console.log('--- Action: Clicking on Playground tab ---');
        await page.evaluate(() => {
            const items = document.querySelectorAll('.nav-item');
            for (let item of items) {
                if (item.dataset.tab === 'playground') {
                    item.click();
                    break;
                }
            }
        });
        await new Promise(r => setTimeout(r, 1500));

        // 2. Click Real Tabular
        console.log('--- Action: Clicking Real Tabular button ---');
        await page.click('#toggleTabular');
        await new Promise(r => setTimeout(r, 1500));

        // Take screenshot of tabular view
        const tabularPath = path.resolve(__dirname, 'tabular_state.png');
        await page.screenshot({ path: tabularPath });
        console.log(`Saved screenshot to ${tabularPath}`);

        // 3. Select a tabular point (click first row in the grid table)
        console.log('--- Action: Clicking on a row in the tabular grid ---');
        const rowsCount = await page.evaluate(() => {
            const rows = document.querySelectorAll('.data-grid-table tr');
            if (rows.length > 1) {
                rows[1].click(); // click first data row
                return rows.length;
            }
            return 0;
        });
        console.log(`Found ${rowsCount} rows in tabular grid. Clicked first data row.`);
        await new Promise(r => setTimeout(r, 1500));

        // Take screenshot after point selection
        const selectionPath = path.resolve(__dirname, 'tabular_selected_state.png');
        await page.screenshot({ path: selectionPath });
        console.log(`Saved screenshot to ${selectionPath}`);

        // 4. Click through the pipeline tabs
        const stages = ['surrogate', 'anchors', 'rulefit', 'governance'];
        for (let stage of stages) {
            console.log(`--- Action: Clicking on Explanation Stage: ${stage} ---`);
            await page.evaluate((st) => {
                const btnId = 'btnEngine' + st.charAt(0).toUpperCase() + st.slice(1);
                const btn = document.getElementById(btnId);
                if (btn) btn.click();
            }, stage);
            await new Promise(r => setTimeout(r, 800));
        }

        // 5. Navigate to Instructions tab
        console.log('--- Action: Clicking on Instructions tab ---');
        await page.evaluate(() => {
            const items = document.querySelectorAll('.nav-item');
            for (let item of items) {
                if (item.dataset.tab === 'instructions') {
                    item.click();
                    break;
                }
            }
        });
        await new Promise(r => setTimeout(r, 1200));

        // Take screenshot of Instructions page
        const instructionsPath = path.resolve(__dirname, 'instructions_state.png');
        await page.screenshot({ path: instructionsPath });
        console.log(`Saved screenshot to ${instructionsPath}`);

        // 6. Navigate to Home tab
        console.log('--- Action: Clicking on Home tab ---');
        await page.evaluate(() => {
            const items = document.querySelectorAll('.nav-item');
            for (let item of items) {
                if (item.dataset.tab === 'home') {
                    item.click();
                    break;
                }
            }
        });
        await new Promise(r => setTimeout(r, 1500));

        // Take screenshot of Home page
        const homeStatePath = path.resolve(__dirname, 'home_state.png');
        await page.screenshot({ path: homeStatePath });
        console.log(`Saved screenshot to ${homeStatePath}`);

        console.log('Browser testing completed.');

    } catch (err) {
        console.error('Error during browser testing:', err);
        hasErrors = true;
    } finally {
        await browser.close();
        console.log('Browser closed.');
        if (hasErrors) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}

run();
