// Quick script to check if DS571621 is in the search index
const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

console.log('Loading index...');
const raw = fs.readFileSync(path.join(ROOT_DIR, 'AmoebaDB_JSON', '_search_index.json'), 'utf8');
const idx = JSON.parse(raw);
console.log(`Strings: ${idx.strings.length}, Entries: ${idx.entries.length}`);

// Check if "DS571621" is in the strings array
const target = 'DS571621';
const strIdx = idx.strings.indexOf(target);
console.log(`\n"${target}" in strings array: index=${strIdx}`);

if (strIdx === -1) {
    // Check partial matches
    const partials = idx.strings.filter(s => s && s.includes('DS571')).slice(0, 10);
    console.log(`Partial "DS571" matches in strings: ${partials.length}`);
    partials.forEach(s => console.log(`  "${s}"`));
} else {
    // Find entries that reference this string index
    let count = 0;
    for (const e of idx.entries) {
        if (e[0] === strIdx) {
            const org = idx.strings[e[2]] || '';
            const ds = idx.strings[e[3]] || '';
            console.log(`  Entry: id="${target}" org="${org}" dataset="${ds}" type="${e[5]}"`);
            count++;
            if (count >= 5) break;
        }
    }
    console.log(`Found ${count} entries with id="${target}"`);
}

// Also check EHI_151530A for comparison
const target2 = 'EHI_151530A';
const strIdx2 = idx.strings.indexOf(target2);
console.log(`\n"${target2}" in strings array: index=${strIdx2}`);
