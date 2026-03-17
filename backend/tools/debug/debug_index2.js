// Debug: check what datasets are in the index and if any Genome records exist
const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

console.log('Loading index...');
const raw = fs.readFileSync(path.join(ROOT_DIR, 'AmoebaDB_JSON', '_search_index.json'), 'utf8');
const idx = JSON.parse(raw);
console.log(`Strings: ${idx.strings.length}, Entries: ${idx.entries.length}`);

// Find all unique dataset strings (index 3 of each entry)
const dsSet = new Set();
for (const e of idx.entries) {
    dsSet.add(e[3]);
}
console.log(`\nUnique datasets: ${dsSet.size}`);

// Group by sourceFile
const srcCount = {};
for (const e of idx.entries) {
    const src = idx.strings[e[4]] || 'unknown';
    srcCount[src] = (srcCount[src] || 0) + 1;
}

// Sort by count and show top 30
const sorted = Object.entries(srcCount).sort((a, b) => b[1] - a[1]);
console.log('\nTop 30 source files by entry count:');
for (const [src, count] of sorted.slice(0, 30)) {
    console.log(`  ${count.toString().padStart(8)} ${src}`);
}

// Check if any Genome file exists
const genomeSrcs = sorted.filter(([src]) => src.includes('Genome'));
console.log(`\nGenome-related sources: ${genomeSrcs.length}`);
for (const [src, count] of genomeSrcs) {
    console.log(`  ${count.toString().padStart(8)} ${src}`);
}

// Check for Isolates and ESTs too
const isoSrcs = sorted.filter(([src]) => src.includes('Isolate'));
const estSrcs = sorted.filter(([src]) => src.includes('EST'));
console.log(`Isolate sources: ${isoSrcs.length}`);
isoSrcs.forEach(([src, count]) => console.log(`  ${count.toString().padStart(8)} ${src}`));
console.log(`EST sources: ${estSrcs.length}`);
estSrcs.forEach(([src, count]) => console.log(`  ${count.toString().padStart(8)} ${src}`));
