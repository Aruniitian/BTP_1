const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const D = path.join(ROOT_DIR, 'AmoebaDB_JSON');

function classify(f) {
    if (/_Genome\.fasta$/i.test(f)) return 'Genome';
    if (/Orf50\.gff$/i.test(f)) return 'Orf50';
    if (/Isolates\.fasta$/i.test(f)) return 'Isolates';
    if (/ESTs\.fasta$/i.test(f)) return 'ESTs';
    return 'other';
}

const c = { Genome: 0, Orf50: 0, Isolates: 0, ESTs: 0 };
const ds = { Genome: 0, Orf50: 0, Isolates: 0, ESTs: 0 };
const det = { Genome: [], Orf50: [], Isolates: [], ESTs: [] };

function walk(dir) {
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of items) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name === 'meta.json') {
            try {
                const m = JSON.parse(fs.readFileSync(full, 'utf8'));
                const cat = classify(m.sourceFile || '');
                if (cat !== 'other') {
                    c[cat] += m.total || 0;
                    ds[cat]++;
                    det[cat].push({ s: m.sourceFile, t: m.total });
                }
            } catch {}
        }
    }
}

walk(D);

console.log('========================================');
console.log('  Records by skipped category');
console.log('========================================');
for (const k of ['Genome', 'Orf50', 'Isolates', 'ESTs']) {
    console.log(`  ${k}: ${c[k].toLocaleString()} records (${ds[k]} datasets)`);
}
console.log();
console.log(`Total ALL skipped: ${(c.Genome + c.Orf50 + c.Isolates + c.ESTs).toLocaleString()}`);
console.log(`Un-skip Genome+Isolates+ESTs (keep Orf50 skipped): ${(c.Genome + c.Isolates + c.ESTs).toLocaleString()}`);
console.log();
console.log('--- Genome datasets ---');
det.Genome.forEach(d => console.log(`  ${d.s}: ${d.t.toLocaleString()}`));
console.log('--- Isolates datasets ---');
det.Isolates.forEach(d => console.log(`  ${d.s}: ${d.t.toLocaleString()}`));
console.log('--- ESTs datasets ---');
det.ESTs.forEach(d => console.log(`  ${d.s}: ${d.t.toLocaleString()}`));

// Also write to file
const lines = [];
lines.push('========================================');
lines.push('  Records by skipped category');
lines.push('========================================');
for (const k of ['Genome', 'Orf50', 'Isolates', 'ESTs']) {
    lines.push(`  ${k}: ${c[k]} records (${ds[k]} datasets)`);
}
lines.push('');
lines.push(`Total ALL skipped: ${c.Genome + c.Orf50 + c.Isolates + c.ESTs}`);
lines.push(`Un-skip Genome+Isolates+ESTs (keep Orf50 skipped): ${c.Genome + c.Isolates + c.ESTs}`);
lines.push('');
lines.push('--- Genome datasets ---');
det.Genome.forEach(d => lines.push(`  ${d.s}: ${d.t}`));
lines.push('--- Isolates datasets ---');
det.Isolates.forEach(d => lines.push(`  ${d.s}: ${d.t}`));
lines.push('--- ESTs datasets ---');
det.ESTs.forEach(d => lines.push(`  ${d.s}: ${d.t}`));
const artifactsDir = path.join(ROOT_DIR, 'tests', 'artifacts');
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(path.join(artifactsDir, 'count_result.txt'), lines.join('\n'), 'utf8');
