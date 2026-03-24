import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Download, Database, AlertCircle, Loader2 } from 'lucide-react';
import { ORGANISMS, DATA_TYPES, getDataUrl, normalizeData, parseHeaderMetadata } from '../config/data';

export default function DataViewer() {
  const { organism, dataType } = useParams();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const orgMeta = ORGANISMS[organism];
  const dtMeta = DATA_TYPES[dataType];

  // Fetch data
  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(1);
    setQuery('');

    const url = getDataUrl(organism, dataType);
    if (!url) {
      setError('Invalid organism or data type.');
      setLoading(false);
      return;
    }

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        let arr = normalizeData(json);

        // Handle 2D codon-usage arrays
        if (dataType === 'codon-usage' && arr.length > 0 && Array.isArray(arr[0])) {
          const header = arr[0].map(String);
          arr = arr.slice(1).map((row) => {
            const obj = {};
            header.forEach((h, i) => (obj[h.trim()] = row[i]));
            return obj;
          });
        }

        // Handle 2D gene-aliases arrays
        if (dataType === 'gene-aliases' && arr.length > 0 && Array.isArray(arr[0])) {
          arr = arr.map((row) => ({ aliases: Array.isArray(row) ? row : [row] }));
        }

        setRawData(arr);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [organism, dataType]);

  // Search / filter
  const filtered = useMemo(() => {
    if (!query.trim()) return rawData;
    const q = query.toLowerCase();
    return rawData.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [rawData, query]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!orgMeta || !dtMeta) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Dataset Not Found</h2>
        <p className="text-slate-500 mt-2">The organism or data type is not recognized.</p>
        <Link to="/organisms" className="inline-flex items-center gap-2 mt-6 text-primary-600 hover:text-primary-700 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Organisms
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link to="/organisms" className="hover:text-primary-600 transition-colors">Organisms</Link>
        <span>/</span>
        <Link to={`/organisms?selected=${organism}`} className="hover:text-primary-600 transition-colors">
          <em>{orgMeta.shortName}</em>
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{dtMeta.label}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dtMeta.label}</h1>
          <p className="text-sm text-slate-500 mt-1">
            <em>{orgMeta.name}</em> — {loading ? '...' : `${filtered.length.toLocaleString()} records`}
          </p>
        </div>

        {/* Search within dataset */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={`Search within ${dtMeta.label.toLowerCase()}...`}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Loading dataset...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-red-700">Failed to load data</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* Data Cards */}
      {!loading && !error && (
        <>
          {paged.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No records found</p>
              {query && <p className="text-sm text-slate-400 mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {paged.map((item, i) => (
                <RecordCard
                  key={i}
                  item={item}
                  index={(page - 1) * PAGE_SIZE + i}
                  dataType={dataType}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Showing {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-600 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========== Record Card ========== */
function RecordCard({ item, index, dataType }) {
  const [expanded, setExpanded] = useState(false);

  // Extract a display title depending on data type
  const title = getRecordTitle(item, dataType, index);
  const parsed = parseHeaderMetadata(item.raw_header || item.header || '');
  const metaFields = buildMetaFields(item, parsed, dataType);
  const sequence = item.sequence || item.compressed_sequence || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md shrink-0">
            #{index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
              {title}
            </p>
            {metaFields.subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{metaFields.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {metaFields.badge && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700">
              {metaFields.badge}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-5 animate-fade-in-up">
          {/* Metadata Grid */}
          {metaFields.fields.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Metadata</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                {metaFields.fields.map(([label, value]) => (
                  <div key={label} className="flex items-baseline gap-2 py-1">
                    <span className="text-xs font-medium text-slate-400 shrink-0">{label}:</span>
                    <span className="text-sm text-slate-700 break-all">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GFF Attributes */}
          {item.attributes && typeof item.attributes === 'object' && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Attributes</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                {Object.entries(item.attributes).map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-2 py-1">
                    <span className="text-xs font-medium text-slate-400 shrink-0">{k}:</span>
                    <span className="text-sm text-slate-700 break-all">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sequence */}
          {sequence && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Sequence ({sequence.length.toLocaleString()} {dataType === 'protein' ? 'aa' : 'bp'})
              </h4>
              <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-auto border border-slate-100">
                <p className="sequence-text">{sequence}</p>
              </div>
            </div>
          )}

          {/* All Other Fields (for generic data) */}
          {dataType === 'codon-usage' && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Codon Usage Statistics</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">{k}</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gene Aliases */}
          {dataType === 'gene-aliases' && item.aliases && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Aliases</h4>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(item.aliases) ? item.aliases : Object.values(item)).map((a, i) => (
                  <span key={i} className="text-sm font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                    {String(a)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========== Helper Functions ========== */

function getRecordTitle(item, dataType, index) {
  if (!item || typeof item !== 'object') return `Record ${index + 1}`;
  // Try common ID fields
  const candidates = [
    item.transcript_id, item.protein_id, item.id,
    item.gene_id, item.sequence_id, item.seqid, item.accession,
  ];
  for (const c of candidates) {
    if (c) return String(c);
  }

  // Try header prefix
  const header = item.raw_header || item.header || '';
  const match = header.match(/^([^|]+)/);
  if (match && match[1].trim()) return match[1].trim();

  // Codon usage
  if (item.CODON) return `Codon: ${item.CODON} → ${item.AA || '?'}`;

  // GFF feature
  if (item.type && item.seqid) return `${item.type}: ${item.seqid}`;

  return `Record ${index + 1}`;
}

function buildMetaFields(item, parsed, dataType) {
  const fields = [];
  let subtitle = '';
  let badge = '';

  const add = (label, value) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'N/A') {
      fields.push([label, value]);
    }
  };

  // Common fields from parsed header
  const p = { ...parsed };
  const geneId = item.gene_id || p.gene || p.Gene || (item.attributes?.gene) || '';
  const product = item.gene_product || p.gene_product || p.Gene_product || item.product || (item.attributes?.product) || '';
  const organism = p.organism || item.organism || '';
  const location = p.location || item.location || (item.attributes?.location) || '';
  const lengthVal = item.length || p.length || (item.sequence ? item.sequence.length : '');

  add('Gene ID', geneId);
  add('Product', product);
  add('Organism', organism);
  add('Location', location);

  if (lengthVal) {
    add('Length', `${lengthVal} ${dataType === 'protein' ? 'aa' : 'bp'}`);
    badge = `${Number(lengthVal).toLocaleString()} ${dataType === 'protein' ? 'aa' : 'bp'}`;
  }

  // GFF-specific
  if (dataType === 'full-gff') {
    add('Source', item.source);
    add('Type', item.type);
    add('Start', item.start);
    add('End', item.end);
    add('Strand', item.strand);
    add('Score', item.score);
    add('Phase', item.phase);
    subtitle = item.source || '';
  }

  // SO fields
  add('Sequence SO', item.sequence_SO || p.sequence_SO);
  add('SO', item.SO || p.SO);
  add('Is Pseudo', typeof item.is_pseudo !== 'undefined' ? String(item.is_pseudo) : (p.is_pseudo || ''));

  if (product) subtitle = product;
  else if (geneId) subtitle = geneId;

  return { fields, subtitle, badge };
}
