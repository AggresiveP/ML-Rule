const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
const content = fs.readFileSync(appJsPath, 'utf8');
const lines = content.split('\n');

console.log('=== Matches for "targetCameraLookAt" in app.js: ===');
lines.forEach((line, index) => {
    if (line.includes('targetCameraLookAt')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
