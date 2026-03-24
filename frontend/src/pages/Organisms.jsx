import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Microscope, ChevronRight, Database, FileText, Dna, Code,
  BarChart, Tags, Layers, List, BookOpen, ExternalLink,
  Search, Loader2, Download, HardDrive, RefreshCw, FolderOpen
} from 'lucide-react';
import { ORGANISMS, DATA_TYPES } from '../config/data';

const ICON_MAP = {
  FileText, Dna, Code, Database, BarChart, Tags, Layers, List, BookOpen, ExternalLink,
};

const COLOR_MAP = {
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  purple:  'bg-purple-50 text-purple-700 border-purple-200',
  green:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  rose:    'bg-rose-50 text-rose-700 border-rose-200',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lime:    'bg-lime-50 text-lime-700 border-lime-200',
  sky:     'bg-sky-50 text-sky-700 border-sky-200',
  cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200',
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/** Friendly display labels for known file-name suffixes */
const FILE_LABELS = {
  AnnotatedCDSs:            'Annotated CDSs',
  AnnotatedProteins:        'Annotated Proteins',
  AnnotatedTranscripts:     'Annotated Transcripts',
  Genome:                   'Genome',
  Curated_GO:               'Curated GO',
  GO:                       'GO Associations',
  CodonUsage:               'Codon Usage',
  GeneAliases:              'Gene Aliases',
  NCBILinkout_Nucleotide:   'NCBI Linkout Nucleotide',
  NCBILinkout_Protein:      'NCBI Linkout Protein',
};

/** Strip the common "AmoebaDB-68_OrganismName_" prefix from raw file names */
function cleanFileName(name) {
  if (!name.startsWith('AmoebaDB')) return name;
  let c = name.replace(/^AmoebaDB-\d+_/, '');
  const dotIdx = c.indexOf('.');
  const ext = dotIdx >= 0 ? c.substring(dotIdx) : '';
  const base = dotIdx >= 0 ? c.substring(0, dotIdx) : c;
  const parts = base.split('_');
  if (parts.length >= 2) {
    parts.shift(); // remove organism name
    const key = parts.join('_');
    if (FILE_LABELS[key]) return FILE_LABELS[key] + ext;
    return parts.join(' ') + ext;
  }
  // No suffix — file is just "AmoebaDB-68_OrgName.gff"
  if (/^[A-Z][a-z].*[A-Z]/.test(base)) return 'Annotations' + ext;
  return base + ext;
}

export default function Organisms() {
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState(searchParams.get('selected') || null);
  const [organisms, setOrganisms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchError, setFetchError] = useState(false);

  const fetchOrganisms = useCallback(() => {
    fetch('/api/organisms')
      .then(r => r.json())
      .then(data => {
        if (data.success) { setOrganisms(data.organisms); setFetchError(false); }
      })
      .catch(() => { setFetchError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrganisms();
    const timer = setInterval(fetchOrganisms, 30000);
    return () => clearInterval(timer);
  }, [fetchOrganisms]);

  useEffect(() => {
    const s = searchParams.get('selected');
    if (s) setSelected(s);
  }, [searchParams]);

  // Filter organisms by search
  const filtered = organisms.filter(org => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.shortName.toLowerCase().includes(q) ||
      org.key.toLowerCase().includes(q)
    );
  });

  const selectedOrg = organisms.find(o => o.key === selected);

  // Check if selected organism has curated data in the old config
  const curatedKey = selected && ORGANISMS[selected] ? selected : null;
  const curatedOrg = curatedKey ? ORGANISMS[curatedKey] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Organism Browser</h1>
            <p className="mt-2 text-slate-500">
              Select an organism to explore its available genomic datasets
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <FolderOpen className="w-4 h-4" />
            <span>{organisms.length} organisms</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-8">
        {/* Sidebar — Organism List */}
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search organisms..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
            />
          </div>

          {/* Organism list */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loading && organisms.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                <span className="ml-2 text-sm text-slate-400">Loading organisms...</span>
              </div>
            ) : fetchError && organisms.length === 0 ? (
              <div className="text-center py-8 text-red-500 text-sm">
                Failed to load organisms. <button onClick={fetchOrganisms} className="underline hover:text-red-700">Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No organisms found
              </div>
            ) : (
              filtered.map((org) => {
                const isSelected = selected === org.key;
                const hasCurated = !!org.curated;
                return (
                  <button
                    key={org.key}
                    onClick={() => setSelected(org.key)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 group ${
                      isSelected
                        ? 'bg-primary-50 border-primary-300 shadow-md'
                        : 'bg-white border-slate-200 hover:border-primary-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : hasCurated
                            ? 'bg-emerald-100 text-emerald-600 group-hover:bg-primary-100 group-hover:text-primary-600'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                        }`}
                      >
                        <Microscope className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${isSelected ? 'text-primary-800' : 'text-slate-700'}`}>
                          <em>{org.shortName}</em>
                        </p>
                        <p className="text-xs text-slate-400 truncate">{org.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {hasCurated && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Curated
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {org.totalFiles} file{org.totalFiles !== 1 ? 's' : ''}
                          </span>
                          {org.totalSize > 0 && (
                            <span className="text-[10px] text-slate-400">
                              · {formatBytes(org.totalSize)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isSelected ? 'text-primary-600 rotate-90' : 'text-slate-300'
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content — Data Types Grid */}
        <div>
          {selectedOrg ? (
            <div className="animate-fade-in-up">
              {/* Organism header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-800">
                    <em>{selectedOrg.shortName}</em>
                  </h2>
                  {selectedOrg.curated && (
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                      ✓ Curated JSON Data
                    </span>
                  )}
                  {selectedOrg.source === 'download' && (
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-200">
                      ⬇ Downloaded
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">{selectedOrg.name}</p>
                {selectedOrg.strain && (
                  <p className="text-xs text-slate-400 mt-0.5">Strain: {selectedOrg.strain}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-4 h-4" /> {selectedOrg.totalFiles} files
                  </span>
                  {selectedOrg.totalSize > 0 && (
                    <span className="flex items-center gap-1">
                      <Download className="w-4 h-4" /> {formatBytes(selectedOrg.totalSize)}
                    </span>
                  )}
                </div>
              </div>

              {/* Curated data types (JSON-based — links to DataViewer) */}
              {curatedOrg && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">
                    📊 Curated Datasets ({curatedOrg.dataTypes.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {curatedOrg.dataTypes.map((dt) => {
                      const meta = DATA_TYPES[dt];
                      if (!meta) return null;
                      const IconComp = ICON_MAP[meta.icon] || Database;
                      const colorClasses = COLOR_MAP[meta.color] || COLOR_MAP.slate;
                      return (
                        <Link
                          key={dt}
                          to={`/organisms/${curatedKey}/${dt}`}
                          className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses}`}>
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800 group-hover:text-primary-700 transition-colors">
                                {meta.label}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">View &amp; explore dataset →</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Raw downloaded data types */}
              {selectedOrg.dataTypes && selectedOrg.dataTypes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">
                    📁 Downloaded Raw Files ({selectedOrg.dataTypes.reduce((s, dt) => s + dt.fileCount, 0)} files)
                  </h3>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {selectedOrg.dataTypes.map((dt) => {
                      const IconComp = ICON_MAP[dt.icon] || Database;
                      const colorClasses = COLOR_MAP[dt.color] || COLOR_MAP.slate;
                      return (
                        <div
                          key={dt.key}
                          className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses}`}>
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800">
                                {dt.label}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {dt.fileCount} file{dt.fileCount !== 1 ? 's' : ''} · {formatBytes(dt.size)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {dt.files.map((file) => {
                              const viewUrl = `/raw-view?organism=${encodeURIComponent(selectedOrg.key)}&file=${encodeURIComponent(file.path.replace('/raw/' + selectedOrg.key + '/', ''))}&name=${encodeURIComponent(selectedOrg.shortName)}`;
                              return (
                                <Link
                                  key={file.path}
                                  to={viewUrl}
                                  className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-primary-50 text-slate-600 hover:text-primary-700 transition-colors group"
                                >
                                  <span className="truncate font-medium">{cleanFileName(file.name)}</span>
                                  <span className="shrink-0 text-slate-400 group-hover:text-primary-500">
                                    {formatBytes(file.size)} →
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No data at all */}
              {(!selectedOrg.dataTypes || selectedOrg.dataTypes.length === 0) && !curatedOrg && (
                <div className="flex items-center justify-center h-40 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-400 text-sm">No data files available yet for this organism</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="text-center">
                <Microscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Select an organism from the sidebar</p>
                <p className="text-sm text-slate-300 mt-1">to view its available datasets</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
