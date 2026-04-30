const fs = require('fs');

const data = fs.readFileSync('ips.txt', 'utf-8');
const lines = data.split('\n');

const categories = [];
let currentCategory = null;

for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
        currentCategory = {
            id: line.replace('#', '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: line.replace('#', '').trim(),
            entries: []
        };
        categories.push(currentCategory);
    } else {
        const parts = line.split(' ');
        if (parts.length === 2 && currentCategory) {
            currentCategory.entries.push({ ip: parts[0], domain: parts[1] });
        }
    }
}

fs.writeFileSync('ips.json', JSON.stringify(categories, null, 2));
