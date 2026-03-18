const fs = require('fs');
const readline = require('readline');

async function readLastLines(filepath, numLines) {
    return new Promise((resolve, reject) => {
        const lines = [];
        const rl = readline.createInterface({
            input: fs.createReadStream(filepath),
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            lines.push(line);
            if (lines.length > numLines) {
                lines.shift();
            }
        });

        rl.on('close', () => {
            resolve(lines);
        });

        rl.on('error', reject);
    });
}

async function main() {
    try {
        console.log('=== ERROR.LOG - Últimas 50 líneas ===\n');
        const errorLines = await readLastLines(
            'backend-data-intake/logs/error.log',
            50
        );
        errorLines.forEach(line => console.log(line));

        console.log('\n\n=== COMBINED.LOG - Últimas 30 líneas ===\n');
        const combinedLines = await readLastLines(
            'backend-data-intake/logs/combined.log',
            30
        );
        combinedLines.forEach(line => console.log(line));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
