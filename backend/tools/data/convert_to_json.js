#!/usr/bin/env node
/**
 * ============================================================================
 *  AmoebaDB Release 68 — Raw → JSON Converter
 * ============================================================================
 *  Converts every downloaded file in AmoebaDB_Release68/ into chunked JSON
 *  stored in AmoebaDB_JSON/.
 *
 *  Structure produced:
 *    AmoebaDB_JSON/
 *      <Organism>/
 *        <originalFileName>/          ← directory per source file
 *          meta.json                  ← { total, columns, sourceFile, fileSize, chunkSize, chunks }
 *          chunk_0.json               ← first CHUNK_SIZE records
 *          chunk_1.json               ← next CHUNK_SIZE records
 *          …
 *
 *  Usage:
 *    node backend/tools/data/convert_to_json.js            — convert all files
 *    node backend/tools/data/convert_to_json.js --force    — re-convert even if already done
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');

// ─── Configuration ──────────────────────────────────────────────────────────
const ROOT_DIR   = path.join(__dirname, '..', '..', '..');
const SRC_DIR    = path.join(ROOT_DIR, 'AmoebaDB_Release68');
const OUT_DIR    = path.join(ROOT_DIR, 'AmoebaDB_JSON');
const CHUNK_SIZE = 1000;          // records per chunk file (non-FASTA)
const FASTA_CHUNK = 200;          // smaller chunks for FASTA (full sequences are large)
const FORCE      = process.argv.includes('--force');

// ─── Helpers ────────────────────────────────────────────────────────────────
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

function createLineReader(filePath, isGz) {
    let input = fs.createReadStream(filePath);
    if (isGz) input = input.pipe(zlib.createGunzip());
    return readline.createInterface({ input, crlfDelay: Infinity });
}

function writeChunk(outDir, chunkIdx, records) {
    const chunkPath = path.join(outDir, `chunk_${chunkIdx}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(records));
}

function writeMeta(outDir, meta) {
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
}

// ─── FASTA Parser ───────────────────────────────────────────────────────────
function convertFasta(filePath, outDir) {
    return new Promise((resolve, reject) => {
        mkdirp(outDir);
        const rl = createLineReader(filePath, false);
        const columns = ['id', 'organism', 'product', 'location', 'length', 'SO', 'sequence'];
        let current = null;
        let count = 0;
        let chunkIdx = 0;
        let chunkBuf = [];

        function flushRecord() {
            if (!current) return;
            count++;
            // Build full sequence
            current.sequence = current._seq.join('');
            delete current._seq;
            chunkBuf.push(current);
            if (chunkBuf.length >= FASTA_CHUNK) {
                writeChunk(outDir, chunkIdx++, chunkBuf);
                chunkBuf = [];
            }
        }

        rl.on('line', (line) => {
            if (line.startsWith('>')) {
                flushRecord();
                // Parse header: >ID | key=value | key=value …
                const parts = line.substring(1).split('|').map(s => s.trim());
                const meta = {};
                for (let i = 1; i < parts.length; i++) {
                    const eq = parts[i].indexOf('=');
                    if (eq > 0) meta[parts[i].substring(0, eq).trim()] = parts[i].substring(eq + 1).trim();
                }
                current = {
                    id: parts[0] || '',
                    organism: meta.organism || '',
                    product: meta.product || '',
                    location: meta.location || '',
                    length: meta.length || '',
                    SO: meta.SO || '',
                    _seq: [],
                };
            } else if (current) {
                current._seq.push(line.trim());
            }
        });

        rl.on('close', () => {
            flushRecord(); // last record
            if (chunkBuf.length > 0) writeChunk(outDir, chunkIdx++, chunkBuf);
            writeMeta(outDir, {
                total: count, columns, sourceFile: path.basename(filePath),
                fileSize: fs.statSync(filePath).size, chunkSize: FASTA_CHUNK, chunks: chunkIdx,
            });
            resolve(count);
        });
        rl.on('error', reject);
    });
}

// ─── GFF Parser ─────────────────────────────────────────────────────────────
function convertGff(filePath, outDir) {
    return new Promise((resolve, reject) => {
        mkdirp(outDir);
        const rl = createLineReader(filePath, false);
        const BASE_COLS = ['seqid', 'source', 'type', 'start', 'end', 'score', 'strand', 'phase', 'attributes'];
        const allColsSet = new Set(BASE_COLS);
        let count = 0, chunkIdx = 0, chunkBuf = [];

        rl.on('line', (line) => {
            if (line.startsWith('#') || !line.trim()) return;
            if (line === '##FASTA') { rl.close(); return; }

            const cols = line.split('\t');
            const rec = {};
            BASE_COLS.forEach((c, i) => rec[c] = cols[i] || '');

            // Parse attributes
            if (rec.attributes) {
                const parts = rec.attributes.split(';');
                for (const ap of parts) {
                    const eq = ap.indexOf('=');
                    if (eq > 0) {
                        const k = ap.substring(0, eq).trim();
                        rec[k] = decodeURIComponent(ap.substring(eq + 1).trim());
                        allColsSet.add(k);
                    }
                }
            }

            count++;
            chunkBuf.push(rec);
            if (chunkBuf.length >= CHUNK_SIZE) {
                writeChunk(outDir, chunkIdx++, chunkBuf);
                chunkBuf = [];
            }
        });

        rl.on('close', () => {
            if (chunkBuf.length > 0) writeChunk(outDir, chunkIdx++, chunkBuf);
            writeMeta(outDir, {
                total: count, columns: [...allColsSet], sourceFile: path.basename(filePath),
                fileSize: fs.statSync(filePath).size, chunkSize: CHUNK_SIZE, chunks: chunkIdx,
            });
            resolve(count);
        });
        rl.on('error', reject);
    });
}

// ─── GAF Parser ─────────────────────────────────────────────────────────────
function convertGaf(filePath, outDir, isGz) {
    return new Promise((resolve, reject) => {
        mkdirp(outDir);
        const rl = createLineReader(filePath, isGz);
        const GAF_COLS = [
            'DB', 'DB_Object_ID', 'DB_Object_Symbol', 'Qualifier',
            'GO_ID', 'DB_Reference', 'Evidence_Code', 'With_From',
            'Aspect', 'DB_Object_Name', 'DB_Object_Synonym', 'DB_Object_Type',
            'Taxon', 'Date', 'Assigned_By', 'Annotation_Extension', 'Gene_Product_Form_ID',
        ];
        let count = 0, chunkIdx = 0, chunkBuf = [];

        rl.on('line', (line) => {
            if (line.startsWith('!') || !line.trim()) return;
            const cols = line.split('\t');
            const rec = {};
            GAF_COLS.forEach((c, i) => rec[c] = cols[i] || '');
            count++;
            chunkBuf.push(rec);
            if (chunkBuf.length >= CHUNK_SIZE) {
                writeChunk(outDir, chunkIdx++, chunkBuf);
                chunkBuf = [];
            }
        });

        rl.on('close', () => {
            if (chunkBuf.length > 0) writeChunk(outDir, chunkIdx++, chunkBuf);
            writeMeta(outDir, {
                total: count, columns: GAF_COLS, sourceFile: path.basename(filePath),
                fileSize: isGz ? 0 : fs.statSync(filePath).size, chunkSize: CHUNK_SIZE, chunks: chunkIdx,
            });
            resolve(count);
        });
        rl.on('error', (err) => {
            // Some .gz files may be corrupt/empty
            if (chunkBuf.length > 0) writeChunk(outDir, chunkIdx++, chunkBuf);
            writeMeta(outDir, {
                total: count, columns: GAF_COLS, sourceFile: path.basename(filePath),
                fileSize: 0, chunkSize: CHUNK_SIZE, chunks: chunkIdx, note: 'Partial (read error)',
            });
            resolve(count);
        });
    });
}

// ─── TSV / TXT / TAB Parser ────────────────────────────────────────────────
function convertTsv(filePath, outDir) {
    return new Promise((resolve, reject) => {
        mkdirp(outDir);
        const rl = createLineReader(filePath, false);
        let columns = [];
        let headerDone = false;
        let count = 0, chunkIdx = 0, chunkBuf = [];

        rl.on('line', (line) => {
            if (!line.trim()) return;
            const cols = line.split('\t');
            if (!headerDone) {
                columns = cols.map(c => c.trim());
                headerDone = true;
                return;
            }
            const rec = {};
            columns.forEach((c, i) => rec[c] = cols[i] || '');
            count++;
            chunkBuf.push(rec);
            if (chunkBuf.length >= CHUNK_SIZE) {
                writeChunk(outDir, chunkIdx++, chunkBuf);
                chunkBuf = [];
            }
        });

        rl.on('close', () => {
            if (chunkBuf.length > 0) writeChunk(outDir, chunkIdx++, chunkBuf);
            writeMeta(outDir, {
                total: count, columns, sourceFile: path.basename(filePath),
                fileSize: fs.statSync(filePath).size, chunkSize: CHUNK_SIZE, chunks: chunkIdx,
            });
            resolve(count);
        });
        rl.on('error', reject);
    });
}

// ─── XML Parser (LinkOut) ───────────────────────────────────────────────────
function convertXml(filePath, outDir) {
    return new Promise((resolve, reject) => {
        mkdirp(outDir);
        const rl = createLineReader(filePath, false);
        let currentLink = null;
        let allColsSet = new Set();
        let count = 0, chunkIdx = 0, chunkBuf = [];

        rl.on('line', (line) => {
            const trimmed = line.trim();
            if (trimmed === '<Link>') {
                currentLink = {};
            } else if (trimmed === '</Link>') {
                if (currentLink) {
                    count++;
                    Object.keys(currentLink).forEach(k => allColsSet.add(k));
                    chunkBuf.push(currentLink);
                    if (chunkBuf.length >= CHUNK_SIZE) {
                        writeChunk(outDir, chunkIdx++, chunkBuf);
                        chunkBuf = [];
                    }
                }
                currentLink = null;
            } else if (currentLink) {
                const m = trimmed.match(/^<(\w+)>([^<]*)<\/\1>$/);
                if (m) currentLink[m[1]] = m[2];
            }
        });

        rl.on('close', () => {
            if (chunkBuf.length > 0) writeChunk(outDir, chunkIdx++, chunkBuf);
            const columns = allColsSet.size > 0
                ? [...allColsSet]
                : ['LinkId', 'Database', 'Query', 'Base'];
            writeMeta(outDir, {
                total: count, columns, sourceFile: path.basename(filePath),
                fileSize: fs.statSync(filePath).size, chunkSize: CHUNK_SIZE, chunks: chunkIdx,
            });
            resolve(count);
        });
        rl.on('error', reject);
    });
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────
function convertFile(filePath, outDir) {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath).toLowerCase();

    if (ext === '.fasta' || ext === '.fa' || ext === '.fna' || ext === '.faa') {
        return convertFasta(filePath, outDir);
    } else if (ext === '.gff' || ext === '.gff3') {
        return convertGff(filePath, outDir);
    } else if (ext === '.gz' && base.includes('.gaf')) {
        return convertGaf(filePath, outDir, true);
    } else if (ext === '.gaf') {
        return convertGaf(filePath, outDir, false);
    } else if (ext === '.txt' || ext === '.tab' || ext === '.tsv') {
        return convertTsv(filePath, outDir);
    } else if (ext === '.xml') {
        return convertXml(filePath, outDir);
    } else {
        return Promise.resolve(0);
    }
}

// ─── Walk & Convert ─────────────────────────────────────────────────────────
async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   AmoebaDB Release 68 — Raw → Chunked JSON Converter       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    if (!fs.existsSync(SRC_DIR)) {
        console.error(`❌ Source directory not found: ${SRC_DIR}`);
        process.exit(1);
    }

    mkdirp(OUT_DIR);

    // Collect all raw files
    const organisms = fs.readdirSync(SRC_DIR).filter(f =>
        fs.statSync(path.join(SRC_DIR, f)).isDirectory()
    );
    console.log(`📂 Found ${organisms.length} organism folders\n`);

    let totalFiles = 0, totalRecords = 0, skipped = 0, failed = 0;
    const startTime = Date.now();
    const summary = { fasta: 0, gff: 0, gaf: 0, txt: 0, xml: 0 };

    for (const org of organisms) {
        const orgSrc = path.join(SRC_DIR, org);
        const orgOut = path.join(OUT_DIR, org);

        // Find all files recursively
        const files = [];
        function walk(dir) {
            for (const entry of fs.readdirSync(dir)) {
                const full = path.join(dir, entry);
                if (fs.statSync(full).isDirectory()) walk(full);
                else files.push(full);
            }
        }
        walk(orgSrc);

        if (files.length === 0) continue;

        for (const filePath of files) {
            // Build output directory name from the relative path
            const relPath = path.relative(orgSrc, filePath);         // e.g. fasta/data/File.fasta
            const baseName = path.basename(filePath, path.extname(filePath));
            // Handle double extensions like .gaf.gz
            const cleanBase = baseName.replace(/\.gaf$/, '_gaf');
            const relDir = path.dirname(relPath);                    // e.g. fasta/data
            const outDir = path.join(orgOut, relDir, cleanBase);

            // Skip if already converted (unless --force)
            const metaPath = path.join(outDir, 'meta.json');
            if (!FORCE && fs.existsSync(metaPath)) {
                skipped++;
                continue;
            }

            try {
                const ext = path.extname(filePath).toLowerCase();
                const fSize = fs.statSync(filePath).size;
                const sizeMB = (fSize / (1024 * 1024)).toFixed(1);
                process.stdout.write(`  [${org}] ${path.basename(filePath)} (${sizeMB} MB) ... `);

                const recordCount = await convertFile(filePath, outDir);
                totalFiles++;
                totalRecords += recordCount;

                // Track by type
                if (ext === '.fasta' || ext === '.fa') summary.fasta++;
                else if (ext === '.gff' || ext === '.gff3') summary.gff++;
                else if (ext === '.gz' || ext === '.gaf') summary.gaf++;
                else if (ext === '.txt' || ext === '.tab') summary.txt++;
                else if (ext === '.xml') summary.xml++;

                console.log(`✅ ${recordCount.toLocaleString()} records`);
            } catch (err) {
                failed++;
                console.log(`❌ ${err.message}`);
            }
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Calculate output size
    let outSize = 0;
    function calcSize(dir) {
        for (const e of fs.readdirSync(dir)) {
            const f = path.join(dir, e);
            if (fs.statSync(f).isDirectory()) calcSize(f);
            else outSize += fs.statSync(f).size;
        }
    }
    if (fs.existsSync(OUT_DIR)) calcSize(OUT_DIR);

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`✅ Conversion complete in ${elapsed}s`);
    console.log(`   Files converted : ${totalFiles}`);
    console.log(`   Files skipped   : ${skipped} (already done)`);
    console.log(`   Files failed    : ${failed}`);
    console.log(`   Total records   : ${totalRecords.toLocaleString()}`);
    console.log(`   Output size     : ${(outSize / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`   Breakdown       : FASTA ${summary.fasta}, GFF ${summary.gff}, GAF ${summary.gaf}, TXT ${summary.txt}, XML ${summary.xml}`);
    console.log(`   Output folder   : ${OUT_DIR}`);
    console.log('══════════════════════════════════════════════════════════════');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
