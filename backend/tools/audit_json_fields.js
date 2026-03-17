const fs = require('fs');
const path = require('path');

const dataRoot = path.join(__dirname, '..', '..', 'public', 'Data');

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(listFiles(full));
    else if (e.isFile() && e.name.endsWith('.json')) results.push(full);
  }
  return results;
}

function sampleArray(arr, n = 20) {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= n) return arr;
  return arr.slice(0, n);
}

function analyzeFile(file) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { file, error: 'parse-error', message: err.message };
  }
  let records = [];
  if (Array.isArray(raw)) records = raw;
  else if (Array.isArray(raw.records)) records = raw.records;
  else if (Array.isArray(raw.features)) records = raw.features;
  else if (Array.isArray(raw.data)) records = raw.data;
  else {
    // try to find first array property
    for (const k of Object.keys(raw)) if (Array.isArray(raw[k])) { records = raw[k]; break; }
  }

  records = records || [];
  const sample = sampleArray(records, 40);

  const stats = {
    file,
    total: records.length,
    sampleCount: sample.length,
    found_sequence_SO_top: 0,
    found_sequence_SO_attrs: 0,
    found_SO_top: 0,
    found_SO_attrs: 0,
    found_raw_header: 0,
    found_header: 0
  };

  sample.forEach(rec => {
    if (rec.sequence_SO) stats.found_sequence_SO_top++;
    if (rec.SO) stats.found_SO_top++;
    if (rec.raw_header) stats.found_raw_header++;
    if (rec.header) stats.found_header++;
    if (rec.attributes && rec.attributes.sequence_SO) stats.found_sequence_SO_attrs++;
    if (rec.attributes && rec.attributes.SO) stats.found_SO_attrs++;
  });

  return stats;
}

function main() {
  const files = listFiles(dataRoot).sort();
  const results = [];
  for (const f of files) {
    results.push(analyzeFile(f));
  }
  console.log('Audit report: fields presence in sample records (counts in sample)');
  results.forEach(r => {
    if (r.error) {
      console.log(`${r.file}: ERROR ${r.message}`);
      return;
    }
    console.log('\n' + r.file);
    console.log(`  total records: ${r.total}, sample: ${r.sampleCount}`);
    console.log(`  sequence_SO top-level: ${r.found_sequence_SO_top}`);
    console.log(`  sequence_SO in attributes: ${r.found_sequence_SO_attrs}`);
    console.log(`  SO top-level: ${r.found_SO_top}`);
    console.log(`  SO in attributes: ${r.found_SO_attrs}`);
    console.log(`  raw_header present: ${r.found_raw_header}`);
    console.log(`  header present: ${r.found_header}`);
  });
}

main();
