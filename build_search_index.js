#!/usr/bin/env node
/**
 * build_search_index.js
 * Scans all AmoebaDB_JSON chunks and builds a lightweight search index.
 * Output: AmoebaDB_JSON/_search_index.json
 *
 * Format: { strings: [...], entries: [[idIdx, prodIdx, orgIdx, datasetIdx, srcIdx, type?]] }
 * Uses string interning to dramatically reduce size.
 */
const fs = require('fs');
const path = require('path');

const JSON_DIR = path.join(__dirname, 'AmoebaDB_JSON');
const INDEX_PATH = path.join(JSON_DIR, '_search_index.json');

// Fields to extract for search
const ID_FIELDS = ['id', 'ID', 'gene_id', 'DB_Object_ID', 'Name', 'seqid'];
const PRODUCT_FIELDS = ['product', 'description', 'DB_Object_Name', 'Note', 'DB_Object_Symbol'];

// Skip only Orf50.gff (~18M auto-generated ORF features, no meaningful search hits)
// Genome, Isolates, ESTs are now indexed — they have meaningful IDs (e.g. DS571621)
const SKIP_PATTERNS = [/Orf50\.gff$/i];

function shouldSkip(sourceFile) {
    return SKIP_PATTERNS.some(p => p.test(sourceFile));
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   AmoebaDB Search Index Builder                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

const startTime = Date.now();

// String interning table
const stringMap = new Map();  // string -> index
const strings = [];
function intern(s) {
    if (!s) return -1;
    s = String(s);
    if (stringMap.has(s)) return stringMap.get(s);
    const idx = strings.length;
    strings.push(s);
    stringMap.set(s, idx);
    return idx;
}

const entries = [];   // each: [idIdx, prodIdx, orgIdx, datasetIdx, srcIdx, typeStr]
let filesProcessed = 0;
let chunksRead = 0;
let recordsScanned = 0;
let skippedDatasets = 0;

const orgDirs = fs.readdirSync(JSON_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);

console.log(`📂 Found ${orgDirs.length} organism folders\n`);

for (const orgDir of orgDirs) {
    const orgPath = path.join(JSON_DIR, orgDir);
    const metaFiles = [];

    function findMetas(dir) {
        let items;
        try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of items) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) findMetas(full);
            else if (e.name === 'meta.json') metaFiles.push(full);
        }
    }
    findMetas(orgPath);

    let orgRecords = 0;
    for (const metaPath of metaFiles) {
        let meta;
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { continue; }

        if (shouldSkip(meta.sourceFile || '')) {
            skippedDatasets++;
            continue;
        }

        const datasetDir = path.dirname(metaPath);
        const relDataset = path.relative(JSON_DIR, datasetDir).replace(/\\/g, '/');
        const orgIdx = intern(orgDir);
        const dsIdx = intern(relDataset);
        const srcIdx = intern(meta.sourceFile || '');
        filesProcessed++;

        for (let ci = 0; ci < (meta.chunks || 0); ci++) {
            const chunkPath = path.join(datasetDir, `chunk_${ci}.json`);
            let records;
            try { records = JSON.parse(fs.readFileSync(chunkPath, 'utf8')); } catch { continue; }
            if (!Array.isArray(records)) continue;
            chunksRead++;

            for (const rec of records) {
                recordsScanned++;

                // Extract display ID
                let displayId = '';
                for (const f of ID_FIELDS) {
                    if (rec[f]) { displayId = String(rec[f]); break; }
                }
                if (!displayId) continue;

                // Extract product/description
                let displayProduct = '';
                for (const f of PRODUCT_FIELDS) {
                    if (rec[f]) { displayProduct = String(rec[f]); break; }
                }

                const idIdx = intern(displayId);
                const prodIdx = intern(displayProduct);
                const typeStr = rec.type || '';

                entries.push([idIdx, prodIdx, orgIdx, dsIdx, srcIdx, typeStr]);
                orgRecords++;
            }
        }
    }
    if (orgRecords > 0) {
        process.stdout.write(`  [${orgDir}] ${orgRecords.toLocaleString()} indexed entries\n`);
    }
}

// Write index
console.log(`\n📝 Writing search index...`);
const indexData = { strings, entries };
fs.writeFileSync(INDEX_PATH, JSON.stringify(indexData));
const indexSize = fs.statSync(INDEX_PATH).size;

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Search index built successfully!`);
console.log(`   Entries:    ${entries.length.toLocaleString()}`);
console.log(`   Strings:    ${strings.length.toLocaleString()} unique`);
console.log(`   Index size: ${(indexSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`   Files:      ${filesProcessed} datasets (${skippedDatasets} skipped)`);
console.log(`   Chunks:     ${chunksRead.toLocaleString()} read`);
console.log(`   Records:    ${recordsScanned.toLocaleString()} scanned`);
console.log(`   Time:       ${elapsed}s`);
