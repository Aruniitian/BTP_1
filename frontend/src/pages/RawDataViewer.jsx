import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Search, ChevronDown, ChevronUp, Download,
  Database, AlertCircle, Loader2, FileText, HardDrive,
  Copy, Check, Maximize2, Minimize2,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const PAGE_SIZE = 50;

export default function RawDataViewer() {
  const [searchParams] = useSearchParams();
  const organism = searchParams.get('organism') || '';
  const file = searchParams.get('file') || '';
  const orgName = searchParams.get('name') || organism;
  const highlight = searchParams.get('highlight') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(highlight);

  // Fetch data from server parser
  useEffect(() => {
    if (!organism || !file) {
      setError('Missing organism or file parameter');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      organism,
      file,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (highlight) params.set('search', highlight);

    fetch(`/api/raw-data?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [organism, file, page, highlight]);

  // Local search filter
  const filteredRecords = data?.records?.filter((rec) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return JSON.stringify(rec).toLowerCase().includes(q);
  }) || [];

  const fileName = file.split('/').pop();
  const ext = fileName.split('.').pop().toLowerCase();
  const typeLabel = {
    fasta: 'FASTA Sequences', fa: 'FASTA Sequences', fna: 'FASTA Sequences', faa: 'FASTA Protein Sequences',
    gff: 'GFF Annotations', gff3: 'GFF Annotations',
    gaf: 'GO Associations (GAF)', gz: 'GO Associations (GAF)',
    txt: 'Text Data', tab: 'Tab-Separated Data', tsv: 'Tab-Separated Data',
    xml: 'XML Linkout Data',
  }[ext] || 'Data File';

  const totalRecords = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link to="/organisms" className="hover:text-primary-600 transition-colors">Organisms</Link>
        <span>/</span>
        <Link
          to={`/organisms?selected=${organism}`}
          className="hover:text-primary-600 transition-colors"
        >
          <em>{orgName}</em>
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium truncate">{fileName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={highlight ? `/search?q=${encodeURIComponent(highlight)}` : `/organisms?selected=${organism}`}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 break-all">{fileName}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" /> {typeLabel}
            </span>
            {data?.fileSize > 0 && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-4 h-4" /> {formatBytes(data.fileSize)}
              </span>
            )}
            {!loading && (
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4" /> {totalRecords.toLocaleString()} records
              </span>
            )}
            {data?.source && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${data.source === 'json' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {data.source === 'json' ? '⚡ JSON Cache' : '📄 Raw Parse'}
              </span>
            )}
          </div>
          {data?.note && (
            <p className="text-sm text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg inline-block">
              ⚠ {data.note}
            </p>
          )}
        </div>

        {/* Search + Download */}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in results..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
            />
          </div>
          <a
            href={`/raw/${organism}/${file}`}
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Parsing file...</p>
            <p className="text-xs text-slate-400 mt-1">Large files may take a moment</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-red-700">Failed to parse file</p>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && data && (
        <>
          {filteredRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No records found</p>
              {query && <p className="text-sm text-slate-400 mt-1">Try a different search term</p>}
            </div>
          ) : (
            <>
              {/* Determine display mode based on file type */}
              {(ext === 'fasta' || ext === 'fa' || ext === 'fna' || ext === 'faa') ? (
                <FastaDisplay records={filteredRecords} page={page} />
              ) : (ext === 'txt' || ext === 'tab' || ext === 'tsv') ? (
                <TableDisplay records={filteredRecords} columns={data.columns} page={page} />
              ) : (ext === 'xml') ? (
                <TableDisplay records={filteredRecords} columns={data.columns} page={page} />
              ) : (ext === 'gff' || ext === 'gff3') ? (
                <GffDisplay records={filteredRecords} page={page} />
              ) : (ext === 'gz' && data.columns?.length > 0) ? (
                <TableDisplay records={filteredRecords} columns={data.columns} page={page} />
              ) : (
                <GenericDisplay records={filteredRecords} page={page} />
              )}
            </>
          )}

          {/* Server-side Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages.toLocaleString()} · {totalRecords.toLocaleString()} total records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  First
                </button>
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
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========== FASTA Display ========== */
function FastaDisplay({ records, page }) {
  return (
    <div className="space-y-3">
      {records.map((rec, i) => (
        <FastaCard key={i} rec={rec} index={(page - 1) * PAGE_SIZE + i} />
      ))}
    </div>
  );
}

function FastaCard({ rec, index }) {
  const [expanded, setExpanded] = useState(false);
  const [seqExpanded, setSeqExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const seqLen = rec.sequence ? rec.sequence.length : 0;

  const copySeq = async () => {
    if (!rec.sequence) return;
    await navigator.clipboard.writeText(rec.sequence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
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
              {rec.id}
            </p>
            {rec.product && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{rec.product}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {seqLen > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700">
              {seqLen.toLocaleString()} bp
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-4 animate-fade-in-up">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Metadata</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {rec.organism && <MetaField label="Organism" value={rec.organism} />}
              {rec.product && <MetaField label="Product" value={rec.product} />}
              {rec.location && <MetaField label="Location" value={rec.location} />}
              {rec.length && <MetaField label="Length" value={`${rec.length} bp`} />}
              {rec.SO && <MetaField label="SO" value={rec.SO} />}
              {rec.id && <MetaField label="ID" value={rec.id} />}
            </div>
          </div>
          {rec.sequence && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Full Sequence ({seqLen.toLocaleString()} bp)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copySeq}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {seqLen > 500 && (
                    <button
                      onClick={() => setSeqExpanded(!seqExpanded)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      {seqExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      {seqExpanded ? 'Collapse' : 'Expand All'}
                    </button>
                  )}
                </div>
              </div>
              <div className={`bg-slate-50 rounded-xl p-4 overflow-auto border border-slate-100 transition-all ${seqExpanded ? 'max-h-none' : 'max-h-64'}`}>
                <p className="font-mono text-xs text-slate-700 break-all leading-relaxed">{rec.sequence}</p>
              </div>
              {!seqExpanded && seqLen > 500 && (
                <p className="text-xs text-slate-400 mt-2 text-center">Click "Expand All" to see full sequence</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========== GFF Display ========== */
function GffDisplay({ records, page }) {
  return (
    <div className="space-y-3">
      {records.map((rec, i) => (
        <GffCard key={i} rec={rec} index={(page - 1) * PAGE_SIZE + i} />
      ))}
    </div>
  );
}

function GffCard({ rec, index }) {
  const [expanded, setExpanded] = useState(false);
  const title = rec.ID || rec.Name || `${rec.type}: ${rec.seqid}`;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
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
            <p className="text-xs text-slate-400 mt-0.5">
              {rec.type} · {rec.seqid}:{rec.start}–{rec.end} ({rec.strand})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
            {rec.type}
          </span>
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-5 animate-fade-in-up">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">All Attributes</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {Object.entries(rec).map(([k, v]) =>
              v && k !== 'attributes' ? <MetaField key={k} label={k} value={v} /> : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== Table Display (TXT/TSV/XML) ========== */
function TableDisplay({ records, columns, page }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
              {columns.map((col) => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((rec, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                  {(page - 1) * PAGE_SIZE + i + 1}
                </td>
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-slate-700 max-w-xs truncate" title={String(rec[col] || '')}>
                    {rec[col] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== Generic Display ========== */
function GenericDisplay({ records, page }) {
  return (
    <div className="space-y-3">
      {records.map((rec, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
            #{(page - 1) * PAGE_SIZE + i + 1}
          </span>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 mt-3">
            {Object.entries(rec).map(([k, v]) => (
              <MetaField key={k} label={k} value={v} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ========== MetaField ========== */
function MetaField({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-xs font-medium text-slate-400 shrink-0">{label}:</span>
      <span className="text-sm text-slate-700 break-all">{String(value)}</span>
    </div>
  );
}
