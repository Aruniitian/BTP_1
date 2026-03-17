#!/usr/bin/env node
/**
 * AmoebaDB Release 68 — Bulk Data Downloader
 * ============================================
 * Downloads ALL 265 files from https://amoebadb.org/common/downloads/release-68/
 *
 * Data types per organism:
 *   fasta/data/  — Genome, AnnotatedCDSs, AnnotatedProteins, AnnotatedTranscripts
 *   gff/data/    — GFF genome annotations, Orf50
 *   gaf/         — GO Annotation Files (curated & computed)
 *   txt/         — Codon usage, Gene aliases
 *   xml/         — NCBI Linkout (Nucleotide, Protein)
 *
 * Family-level folders (Entamoebidae, Ehistolytica, etc.) have ESTs / Isolates.
 *
 * Usage:
 *   node backend/tools/data/download_release68.js                  # download everything
 *   node backend/tools/data/download_release68.js --dry-run        # list files without downloading
 *   node backend/tools/data/download_release68.js --organism Ehist # filter by organism prefix
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

// ── Configuration ──────────────────────────────────────────────────────────────
const BASE_URL   = 'https://amoebadb.org/common/downloads/release-68/';
const ROOT_DIR   = path.join(__dirname, '..', '..', '..');
const OUT_DIR    = path.join(ROOT_DIR, 'AmoebaDB_Release68');
const CONCURRENT = 3;          // parallel downloads
const RETRY_MAX  = 3;          // retries per file
const RETRY_DELAY = 2000;      // ms between retries
const TIMEOUT    = 120_000;    // 2 min per request

// ── CLI args ───────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const orgIdx  = args.indexOf('--organism');
const ORG_FILTER = orgIdx !== -1 ? args[orgIdx + 1]?.toLowerCase() : null;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fetch a URL and return the body as a string */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: TIMEOUT }, (res) => {
      // Follow redirects
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        return fetchPage(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

/** Parse Apache directory listing HTML and return {name, isDir} entries */
function parseDirectoryListing(html, baseUrl) {
  // Ensure baseUrl ends with /
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  const entries = [];
  // Match href links in the Apache auto-index page
  const regex = /href="([^"?]+)"/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    // Skip sorting links, icons, fragments
    if (href.startsWith('?') || href.startsWith('#') || href.startsWith('/icons/')) continue;
    // Skip parent-navigation links
    if (href === '/' || href === '../' || href === './' || href === '.') continue;

    // Resolve to full URL
    const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;

    // CRITICAL: only accept links that are CHILDREN of the current baseUrl
    // This prevents following parent-directory links and causing infinite recursion
    if (!fullUrl.startsWith(baseUrl) || fullUrl === baseUrl) continue;

    const isDir = fullUrl.endsWith('/');
    // Extract just the leaf name (last segment)
    const relToBase = fullUrl.slice(baseUrl.length).replace(/\/$/, '');
    const name = decodeURIComponent(relToBase.split('/').pop());

    if (!name || name === 'Parent Directory') continue;

    entries.push({ name, isDir, url: fullUrl });
  }
  // Deduplicate by URL
  const seen = new Set();
  return entries.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}

/** Recursively crawl a directory URL and collect all file URLs */
async function crawl(dirUrl) {
  const files = [];
  let html;
  try {
    html = await fetchPage(dirUrl);
  } catch (err) {
    console.error(`  ⚠ Could not list ${dirUrl}: ${err.message}`);
    return files;
  }

  const entries = parseDirectoryListing(html, dirUrl);
  for (const entry of entries) {
    if (entry.isDir) {
      const subFiles = await crawl(entry.url);
      files.push(...subFiles);
    } else {
      // Skip Build_number and CURRENT symlinks (duplicates of versioned files)
      const skip = ['Build_number'];
      if (skip.includes(entry.name)) continue;
      if (entry.name.includes('-CURRENT_')) continue;   // skip AmoebaDB-CURRENT_ duplicates
      files.push(entry.url);
    }
  }
  return files;
}

/** Download a single file with retry logic and progress display */
function downloadFile(url, destPath, attempt = 1) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // Check if already downloaded (resume support)
    let startByte = 0;
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      startByte = stat.size;
    }

    const opts = { timeout: TIMEOUT };
    if (startByte > 0) {
      opts.headers = { Range: `bytes=${startByte}-` };
    }

    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, opts, (res) => {
      // Follow redirects
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        return downloadFile(res.headers.location, destPath, attempt).then(resolve, reject);
      }

      // If we requested a range and server says 416 (range not satisfiable), file is complete
      if (res.statusCode === 416) {
        return resolve();
      }

      if (res.statusCode !== 200 && res.statusCode !== 206) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const flags = res.statusCode === 206 ? 'a' : 'w'; // append if partial
      const totalSize = res.headers['content-length']
        ? parseInt(res.headers['content-length'], 10) + (res.statusCode === 206 ? startByte : 0)
        : null;

      const ws = fs.createWriteStream(destPath, { flags });
      let downloaded = res.statusCode === 206 ? startByte : 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize) {
          const pct = ((downloaded / totalSize) * 100).toFixed(1);
          const mb  = (downloaded / 1048576).toFixed(1);
          const tot = (totalSize / 1048576).toFixed(1);
          process.stdout.write(`\r    ${mb}/${tot} MB (${pct}%)   `);
        }
      });

      res.pipe(ws);
      ws.on('finish', () => {
        process.stdout.write('\r');
        resolve();
      });
      ws.on('error', reject);
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  }).catch(async (err) => {
    if (attempt < RETRY_MAX) {
      console.warn(`    ↻ Retry ${attempt}/${RETRY_MAX} for ${path.basename(destPath)}: ${err.message}`);
      await sleep(RETRY_DELAY * attempt);
      return downloadFile(url, destPath, attempt + 1);
    }
    throw err;
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Convert a URL to a local file path under OUT_DIR */
function urlToLocalPath(fileUrl) {
  const rel = fileUrl.replace(BASE_URL, '');
  return path.join(OUT_DIR, ...rel.split('/').map(decodeURIComponent));
}

/** Pretty-print file size */
function fmtSize(bytes) {
  if (bytes > 1e9)  return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes > 1e6)  return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes > 1e3)  return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   AmoebaDB Release 68 — Bulk Downloader                    ║');
  console.log('║   Source: https://amoebadb.org/common/downloads/release-68/ ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // Step 1: Get top-level organism directories
  console.log('📂 Crawling top-level release-68 directory...');
  let topHtml;
  try {
    topHtml = await fetchPage(BASE_URL);
  } catch (err) {
    console.error(`❌ Failed to reach AmoebaDB: ${err.message}`);
    process.exit(1);
  }

  const topEntries = parseDirectoryListing(topHtml, BASE_URL)
    .filter((e) => e.isDir);

  console.log(`   Found ${topEntries.length} organism/family folders\n`);

  // Apply organism filter if specified
  let filteredEntries = topEntries;
  if (ORG_FILTER) {
    filteredEntries = topEntries.filter((e) => e.name.toLowerCase().includes(ORG_FILTER));
    console.log(`   🔍 Filtered to ${filteredEntries.length} folders matching "${ORG_FILTER}"\n`);
    if (filteredEntries.length === 0) {
      console.log('   Available folders:');
      topEntries.forEach((e) => console.log(`     • ${e.name}`));
      process.exit(0);
    }
  }

  // Step 2: Crawl each organism folder to find all downloadable files
  console.log('🔍 Discovering all files (crawling subdirectories)...\n');
  const allFiles = [];
  for (let i = 0; i < filteredEntries.length; i++) {
    const org = filteredEntries[i];
    process.stdout.write(`  [${i + 1}/${filteredEntries.length}] ${org.name} ...`);
    const orgFiles = await crawl(org.url);
    allFiles.push(...orgFiles);
    console.log(` ${orgFiles.length} files`);
  }

  console.log(`\n✅ Total files discovered: ${allFiles.length}\n`);

  // Categorize for summary
  const categories = { fasta: 0, gff: 0, gaf: 0, txt: 0, xml: 0, other: 0 };
  for (const url of allFiles) {
    if (url.includes('/fasta/'))     categories.fasta++;
    else if (url.includes('/gff/'))  categories.gff++;
    else if (url.includes('/gaf/'))  categories.gaf++;
    else if (url.includes('/txt/'))  categories.txt++;
    else if (url.includes('/xml/'))  categories.xml++;
    else                             categories.other++;
  }
  console.log('📊 File breakdown:');
  Object.entries(categories).forEach(([cat, count]) => {
    if (count > 0) console.log(`   ${cat.toUpperCase().padEnd(6)} ${count} files`);
  });
  console.log();

  if (DRY_RUN) {
    console.log('📋 Dry-run file list:\n');
    allFiles.forEach((url, i) => {
      const rel = url.replace(BASE_URL, '');
      console.log(`  ${(i + 1).toString().padStart(3)}. ${rel}`);
    });
    console.log(`\n🏁 Dry run complete — ${allFiles.length} files would be downloaded to:\n   ${OUT_DIR}`);
    return;
  }

  // Step 3: Download all files
  console.log(`📥 Downloading to: ${OUT_DIR}\n`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let completed = 0;
  let failed    = 0;
  let skipped   = 0;
  const failures = [];
  const startTime = Date.now();

  // Process in batches of CONCURRENT
  for (let i = 0; i < allFiles.length; i += CONCURRENT) {
    const batch = allFiles.slice(i, i + CONCURRENT);
    const tasks = batch.map(async (url) => {
      const destPath = urlToLocalPath(url);
      const relPath  = url.replace(BASE_URL, '');

      // Skip if file already fully downloaded
      if (fs.existsSync(destPath)) {
        const stat = fs.statSync(destPath);
        if (stat.size > 0) {
          skipped++;
          completed++;
          console.log(`  ✔ [${completed}/${allFiles.length}] ${relPath} (already exists, ${fmtSize(stat.size)})`);
          return;
        }
      }

      try {
        console.log(`  ⬇ [${completed + 1}/${allFiles.length}] ${relPath}`);
        await downloadFile(url, destPath);
        completed++;
        const stat = fs.statSync(destPath);
        console.log(`  ✔ [${completed}/${allFiles.length}] ${relPath} (${fmtSize(stat.size)})`);
      } catch (err) {
        failed++;
        completed++;
        failures.push({ url, error: err.message });
        console.error(`  ✖ [${completed}/${allFiles.length}] ${relPath} — ${err.message}`);
      }
    });
    await Promise.all(tasks);
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('\n' + '═'.repeat(62));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('═'.repeat(62));
  console.log(`  Total files:    ${allFiles.length}`);
  console.log(`  Downloaded:     ${allFiles.length - failed - skipped}`);
  console.log(`  Already cached: ${skipped}`);
  console.log(`  Failed:         ${failed}`);
  console.log(`  Time:           ${elapsed}s`);
  console.log(`  Saved to:       ${OUT_DIR}`);

  if (failures.length > 0) {
    console.log('\n⚠ Failed downloads:');
    failures.forEach((f) => console.log(`  • ${f.url}\n    ${f.error}`));
  }

  // Calculate total download size
  let totalBytes = 0;
  function calcDirSize(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) calcDirSize(full);
      else totalBytes += fs.statSync(full).size;
    }
  }
  calcDirSize(OUT_DIR);
  console.log(`\n  Total size on disk: ${fmtSize(totalBytes)}`);
  console.log('═'.repeat(62));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
