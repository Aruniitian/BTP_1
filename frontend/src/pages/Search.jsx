import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search as SearchIcon, Loader2, Database, ArrowRight,
  Microscope, FileText, Filter, X, Dna, BookOpen,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, Code, BarChart, Tags, Layers, List, ExternalLink,
  HardDrive, FolderOpen, Download,
} from 'lucide-react';

const PAGE_SIZE = 50;

const CATEGORY_ICON_MAP = {
  'Annotated Transcripts': { Icon: FileText, color: 'text-blue-600' },
  'Annotated Proteins':    { Icon: Dna,      color: 'text-purple-600' },
  'Annotated CDS':         { Icon: Code,     color: 'text-emerald-600' },
  'Genome Sequences':      { Icon: Database,  color: 'text-teal-600' },
  'GFF Annotations':       { Icon: List,      color: 'text-slate-600' },
  'ORF50 Predictions':     { Icon: Layers,    color: 'text-indigo-600' },
  'Codon Usage':           { Icon: BarChart,   color: 'text-amber-600' },
  'Gene Aliases':          { Icon: Tags,       color: 'text-rose-600' },
  'Curated GO (GAF)':      { Icon: BookOpen,   color: 'text-emerald-600' },
  'GO Associations (GAF)': { Icon: BookOpen,   color: 'text-lime-600' },
  'NCBI Linkout — Nucleotide': { Icon: ExternalLink, color: 'text-sky-600' },
  'NCBI Linkout — Protein':    { Icon: ExternalLink, color: 'text-cyan-600' },
  'FASTA Sequences':       { Icon: Dna,        color: 'text-blue-600' },
  'Text Data':             { Icon: FileText,   color: 'text-amber-600' },
  'XML / Linkout':         { Icon: ExternalLink, color: 'text-sky-600' },
};

function CategoryIcon({ category }) {
  const entry = CATEGORY_ICON_MAP[category] || { Icon: FileText, color: 'text-slate-500' };
  return <entry.Icon className={`w-4 h-4 ${entry.color}`} />;
}

// Icon map for dataset categories (by key)
const DATASET_ICON_MAP = {
  fasta: { Icon: Dna,          bg: 'bg-blue-50',    border: 'border-blue-200',  iconColor: 'text-blue-600',   headerBg: 'bg-blue-50' },
  gff:   { Icon: List,         bg: 'bg-slate-50',   border: 'border-slate-200', iconColor: 'text-slate-600',  headerBg: 'bg-slate-50' },
  gaf:   { Icon: BookOpen,     bg: 'bg-lime-50',    border: 'border-lime-200',  iconColor: 'text-lime-600',   headerBg: 'bg-lime-50' },
  txt:   { Icon: FileText,     bg: 'bg-amber-50',   border: 'border-amber-200', iconColor: 'text-amber-600',  headerBg: 'bg-amber-50' },
  xml:   { Icon: ExternalLink, bg: 'bg-sky-50',     border: 'border-sky-200',   iconColor: 'text-sky-600',    headerBg: 'bg-sky-50' },
};

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[i]}`;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchMeta, setSearchMeta] = useState(null);
  const [orgFilter, setOrgFilter] = useState(searchParams.get('organism') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [organismCounts, setOrganismCounts] = useState([]);
  const [collapsedOrgs, setCollapsedOrgs] = useState(new Set());
  const [orgDatasets, setOrgDatasets] = useState(null);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  const performSearch = useCallback(async (q, pg = 1, orgF = '') => {
    if (!q || !q.trim()) return;
    setSearching(true);
    setSearched(true);
    setCollapsedOrgs(new Set());

    try {
      let url = `/api/search?q=${encodeURIComponent(q.trim())}&page=${pg}&pageSize=${PAGE_SIZE}`;
      if (orgF) url += `&organism=${encodeURIComponent(orgF)}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.success) {
        setResults(json.results || []);
        setOrganismCounts(json.organismCounts || []);
        setSearchMeta({
          total: json.total,
          totalUnfiltered: json.totalUnfiltered || json.total,
          page: json.page,
          pageSize: json.pageSize,
          totalPages: json.totalPages,
          query: json.query,
          timeMs: json.timeMs,
          activeOrgFilter: json.activeOrgFilter || null,
        });
        setPage(json.page);
        setOrgFilter(json.activeOrgFilter || '');
      } else {
        setResults([]);
        setOrganismCounts([]);
        setSearchMeta({ total: 0, error: json.error });
      }
    } catch (err) {
      setResults([]);
      setOrganismCounts([]);
      setSearchMeta({ total: 0, error: err.message });
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    const pg = parseInt(searchParams.get('page')) || 1;
    const orgF = searchParams.get('organism') || '';
    if (q) {
      setQuery(q);
      performSearch(q, pg, orgF);
    }
  }, [searchParams, performSearch]);

  // Fetch organism dataset overview when an organism filter is active
  useEffect(() => {
    if (!orgFilter) {
      setOrgDatasets(null);
      return;
    }
    let cancelled = false;
    setLoadingDatasets(true);
    fetch(`/api/organism-datasets/${encodeURIComponent(orgFilter)}`)
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json.success) setOrgDatasets(json);
        else if (!cancelled) setOrgDatasets(null);
      })
      .catch(() => { if (!cancelled) setOrgDatasets(null); })
      .finally(() => { if (!cancelled) setLoadingDatasets(false); });
    return () => { cancelled = true; };
  }, [orgFilter]);

  function goToPage(pg) {
    const q = searchParams.get('q') || query;
    const params = { q, page: String(pg) };
    if (orgFilter) params.organism = orgFilter;
    setSearchParams(params);
  }

  function setOrgFilterNav(org) {
    const q = searchParams.get('q') || query;
    const params = { q, page: '1' };
    if (org) params.organism = org;
    setSearchParams(params);
  }

  function toggleOrg(org) {
    setCollapsedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(org)) next.delete(org); else next.add(org);
      return next;
    });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim(), page: '1' });
  };

  // Compute unique organisms and types for filter dropdowns
  const uniqueOrgs = [...new Set(results.map(r => r.organism))].sort();
  const uniqueTypes = [...new Set(results.map(r => r.type))].sort();

  // Organism filtering is server-side; only type filter is client-side
  const filteredResults = results.filter(r => {
    if (typeFilter && r.type !== typeFilter) return false;
    return true;
  });

  // Group filtered results by organism, then sub-group by dataCategory
  const groupedByOrg = useMemo(() => {
    const groups = [];
    const map = new Map();
    for (const r of filteredResults) {
      if (!map.has(r.organism)) {
        const group = { organism: r.organism, items: [], subGroups: [] };
        map.set(r.organism, group);
        groups.push(group);
      }
      map.get(r.organism).items.push(r);
    }
    // Build sub-groups by dataCategory within each organism
    for (const group of groups) {
      const catMap = new Map();
      for (const item of group.items) {
        const cat = item.dataCategory || 'Other';
        if (!catMap.has(cat)) {
          catMap.set(cat, { category: cat, items: [] });
        }
        catMap.get(cat).items.push(item);
      }
      group.subGroups = [...catMap.values()];
    }
    return groups;
  }, [filteredResults]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Global Search</h1>
        <p className="text-slate-500">
          Search across all 56 organisms and 272 datasets — genes, proteins, transcripts, annotations, and more.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-10">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by gene ID (EHI_151530A), protein name, product, GO term..."
            className="w-full pl-12 pr-32 py-4 text-base bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 shadow-sm transition"
          />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {['EHI_151530A', 'hypothetical protein', 'protein_coding_gene', 'tRNA'].map(ex => (
            <button
              key={ex}
              type="button"
              onClick={() => { setQuery(ex); setSearchParams({ q: ex, page: '1' }); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              Try: <span className="font-medium">{ex}</span>
            </button>
          ))}
        </div>
      </form>

      {/* Loading */}
      {searching && (
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Searching across all organisms and datasets...</p>
            <p className="text-xs text-slate-400 mt-1">This may take a moment for the first search</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!searching && searched && (
        <div>
          {/* Results header with count and filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <p className="text-sm text-slate-500">
              Found <strong className="text-slate-700">{searchMeta?.total?.toLocaleString()}</strong>
              {' '}result{searchMeta?.total !== 1 ? 's' : ''}{' '}
              {searchMeta?.activeOrgFilter && searchMeta.totalUnfiltered !== searchMeta.total && (
                <span className="text-slate-400">(of {searchMeta.totalUnfiltered?.toLocaleString()} total) </span>
              )}
              for &ldquo;<strong className="text-slate-700">{searchMeta?.query || searchParams.get('q')}</strong>&rdquo;
              {searchMeta?.totalPages > 1 && (
                <span className="text-primary-600 ml-2">
                  — page {searchMeta.page} of {searchMeta.totalPages}
                </span>
              )}
              {searchMeta?.timeMs != null && (
                <span className="text-slate-400 ml-2">({searchMeta.timeMs}ms)</span>
              )}
            </p>

            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-400"
                >
                  <option value="">All Types ({uniqueTypes.length})</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {(orgFilter || typeFilter) && (
                  <button
                    onClick={() => { setOrgFilterNav(''); setTypeFilter(''); }}
                    className="text-xs px-2 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {searchMeta?.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <p className="text-sm text-red-600">{searchMeta.error}</p>
            </div>
          )}

          {/* Active organism filter banner */}
          {orgFilter && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl">
              <Microscope className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-800">
                Filtered to: {orgFilter}
              </span>
              <span className="text-xs text-primary-500">({searchMeta?.total?.toLocaleString()} results)</span>
              <button
                onClick={() => setOrgFilterNav('')}
                className="ml-auto text-xs px-2 py-1 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Show all organisms
              </button>
            </div>
          )}

          {/* Organism summary bar (from full search, not just current page) */}
          {organismCounts.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Results by Organism ({organismCounts.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {organismCounts.map(oc => (
                  <button
                    key={oc.organism}
                    onClick={() => setOrgFilterNav(orgFilter === oc.organism ? '' : oc.organism)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      orgFilter === oc.organism
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-primary-50 hover:border-primary-300'
                    }`}
                  >
                    {oc.organism} <span className="font-bold ml-1">{oc.count.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Organism Dataset Overview (shown when organism filter is active) ── */}
          {orgFilter && (loadingDatasets || orgDatasets) && (
            <div className="mb-6">
              {loadingDatasets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin mr-2" />
                  <span className="text-sm text-slate-500">Loading dataset overview...</span>
                </div>
              ) : orgDatasets && orgDatasets.categories && orgDatasets.categories.length > 0 ? (
                <div>
                  {/* Organism info header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{orgDatasets.name || orgFilter}</h3>
                      <p className="text-xs text-slate-500">
                        {orgDatasets.totalFiles} file{orgDatasets.totalFiles !== 1 ? 's' : ''} · {formatSize(orgDatasets.totalSize)} total
                      </p>
                    </div>
                  </div>

                  {/* Dataset category cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orgDatasets.categories.map(cat => {
                      const style = DATASET_ICON_MAP[cat.key] || DATASET_ICON_MAP.txt;
                      const CatIcon = style.Icon;
                      return (
                        <div key={cat.key} className={`bg-white border ${style.border} rounded-2xl overflow-hidden hover:shadow-md transition-shadow`}>
                          {/* Category header */}
                          <div className={`flex items-center gap-3 px-4 py-3 ${style.headerBg}`}>
                            <div className={`w-9 h-9 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center`}>
                              <CatIcon className={`w-4.5 h-4.5 ${style.iconColor}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800 text-sm">{cat.label}</h4>
                              <p className="text-[11px] text-slate-500">
                                {cat.fileCount} file{cat.fileCount !== 1 ? 's' : ''} · {formatSize(cat.size)}
                              </p>
                            </div>
                          </div>
                          {/* Individual files */}
                          <div className="divide-y divide-slate-100">
                            {cat.files.map((file, fi) => {
                              const viewUrl = file.jsonReady
                                ? `/raw-view?organism=${encodeURIComponent(orgFilter)}&file=${encodeURIComponent(file.relFile)}&name=${encodeURIComponent(orgDatasets.name || orgFilter)}`
                                : null;
                              return (
                                <div key={fi} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 truncate font-medium" title={file.name}>
                                      {file.displayName || file.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {formatSize(file.size)}
                                      {file.records > 0 && <span className="ml-2">· {file.records.toLocaleString()} records</span>}
                                    </p>
                                  </div>
                                  {viewUrl && (
                                    <Link
                                      to={viewUrl}
                                      className="text-primary-600 hover:text-primary-800 transition-colors opacity-60 group-hover:opacity-100"
                                      title="Browse data"
                                    >
                                      <ArrowRight className="w-4 h-4" />
                                    </Link>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {filteredResults.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No results found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try different keywords, a gene ID, or a shorter search term
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByOrg.map(group => {
                const isCollapsed = collapsedOrgs.has(group.organism);
                return (
                  <div key={group.organism} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {/* Organism group header */}
                    <button
                      onClick={() => toggleOrg(group.organism)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-primary-50 to-white hover:from-primary-100 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                        <Microscope className="w-4 h-4 text-primary-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{group.organism}</p>
                        <p className="text-xs text-slate-500">{group.items.length} result{group.items.length !== 1 ? 's' : ''} on this page</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>

                    {/* Result cards within this organism — grouped by data category */}
                    {!isCollapsed && (
                      <div>
                        {group.subGroups.map(sg => (
                          <div key={sg.category}>
                            {/* Data category sub-header */}
                            <div className="flex items-center gap-2 px-5 py-2 bg-slate-50 border-y border-slate-100">
                              <CategoryIcon category={sg.category} />
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                {sg.category}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({sg.items.length})
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {sg.items.map((r, i) => {
                                const parts = r.dataset.split('/');
                                const orgKey = parts[0];
                                const restPath = parts.slice(1, -1).join('/');
                                const filePath = restPath ? restPath + '/' + r.sourceFile : r.sourceFile;
                                const viewUrl = `/raw-view?organism=${encodeURIComponent(orgKey)}&file=${encodeURIComponent(filePath)}&name=${encodeURIComponent(r.orgName)}&highlight=${encodeURIComponent(r.id)}`;

                                return (
                                  <div
                                    key={i}
                                    className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                                  >
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                                      <CategoryIcon category={r.dataCategory} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-800 text-sm group-hover:text-primary-700 transition-colors">
                                        {r.id}
                                      </p>
                                      {r.product && (
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.product}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                          {r.type}
                                        </span>
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                          <BookOpen className="w-3 h-3" />
                                          {r.sourceFile}
                                        </span>
                                        {r.matchedIn && r.matchedIn !== 'id' && r.matchedIn !== 'ID' && (
                                          <span className="text-[10px] text-slate-400 italic">
                                            matched in: {r.matchedIn}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Link
                                      to={viewUrl}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors shrink-0"
                                    >
                                      View <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Pagination Controls */}
          {searchMeta?.totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Showing {((searchMeta.page - 1) * searchMeta.pageSize) + 1}–{Math.min(searchMeta.page * searchMeta.pageSize, searchMeta.total)} of {searchMeta.total.toLocaleString()} results
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={page <= 1 || searching}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || searching}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page number buttons */}
                {(() => {
                  const pages = [];
                  const tp = searchMeta.totalPages;
                  let startP = Math.max(1, page - 2);
                  let endP = Math.min(tp, page + 2);
                  if (page <= 3) endP = Math.min(tp, 5);
                  if (page >= tp - 2) startP = Math.max(1, tp - 4);

                  if (startP > 1) {
                    pages.push(
                      <button key={1} onClick={() => goToPage(1)}
                        className="w-9 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors">1</button>
                    );
                    if (startP > 2) pages.push(<span key="dots1" className="px-1 text-slate-400">…</span>);
                  }
                  for (let p = startP; p <= endP; p++) {
                    pages.push(
                      <button key={p} onClick={() => goToPage(p)} disabled={p === page}
                        className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-slate-200 text-slate-600 hover:bg-primary-50 hover:text-primary-600'
                        }`}>{p}</button>
                    );
                  }
                  if (endP < tp) {
                    if (endP < tp - 1) pages.push(<span key="dots2" className="px-1 text-slate-400">…</span>);
                    pages.push(
                      <button key={tp} onClick={() => goToPage(tp)}
                        className="w-9 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors">{tp}</button>
                    );
                  }
                  return pages;
                })()}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= searchMeta.totalPages || searching}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPage(searchMeta.totalPages)}
                  disabled={page >= searchMeta.totalPages || searching}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}        </div>
      )}
    </div>
  );
}
