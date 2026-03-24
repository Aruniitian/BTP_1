import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, FileText, Dna, Code, BarChart, FlaskConical,
  ArrowRight, Microscope, BookOpen, Users, ShieldCheck,
  HardDrive, FolderOpen, Download, RefreshCw, Loader2,
  Search, ChevronRight, Layers, Globe, X,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const IMAGES = [
  { src: '/Entamoeba_images/Entamoeba_histolytica_trophozoite.png', caption: 'E. histolytica trophozoite' },
  { src: '/Entamoeba_images/ijms-24-11755-g001.png', caption: 'Molecular overview' },
  { src: '/Entamoeba_images/kvir_a_2158656_f0001_oc.jpg', caption: 'Virulence factors' },
];

export default function Home() {
  const [stats, setStats] = useState(null);
  const [organisms, setOrganisms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [orgError, setOrgError] = useState(false);

  const fetchStats = useCallback(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { if (data.success) { setStats(data); setStatsError(false); } })
      .catch(() => { setStatsError(true); })
      .finally(() => setLoading(false));
  }, []);

  const fetchOrganisms = useCallback(() => {
    fetch('/api/organisms')
      .then(r => r.json())
      .then(data => { if (data.success) { setOrganisms(data.organisms); setOrgError(false); } })
      .catch(() => { setOrgError(true); })
      .finally(() => setOrgLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    fetchOrganisms();
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, [fetchStats, fetchOrganisms]);

  const isDownloading = stats?.download?.progress?.running;
  const dlProgress = stats?.download?.progress;

  const totalRecords = organisms.reduce((sum, org) => {
    return sum + (org.dataTypes || []).reduce((s, dt) => {
      return s + (dt.files || []).reduce((fs, f) => fs + (f.records || 0), 0);
    }, 0);
  }, 0);

  const STATS_CARDS = [
    { label: 'Total Organisms', value: stats ? stats.download.organismsOnDisk : '—', icon: Microscope, color: 'from-teal-500 to-emerald-600' },
    { label: 'Total Files', value: stats ? stats.download.filesOnDisk.toLocaleString() : '—', icon: FolderOpen, color: 'from-blue-500 to-indigo-600' },
    { label: 'Total Records', value: totalRecords ? `${(totalRecords / 1e6).toFixed(1)}M` : '—', icon: Database, color: 'from-purple-500 to-violet-600' },
    { label: 'Disk Usage', value: stats ? formatBytes(stats.totalDiskUsage) : '—', icon: HardDrive, color: 'from-amber-500 to-orange-600' },
    { label: 'Data Types', value: stats?.dataTypes ?? '—', icon: Layers, color: 'from-rose-500 to-pink-600' },
    { label: 'Release', value: stats?.release ?? '68', icon: BookOpen, color: 'from-cyan-500 to-sky-600' },
  ];

  const filteredOrganisms = organisms.filter(org => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return org.name.toLowerCase().includes(q) || org.shortName.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* ========== Hero Section ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-700/40 rounded-full text-primary-200 text-xs font-medium mb-6 border border-primary-600/30">
              <FlaskConical className="w-3.5 h-3.5" />
              AmoebaDB Release 68 — Comprehensive Genomics
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              <em>Entamoeba</em>{' '}
              <span className="text-primary-300">Genomics</span>{' '}
              Resource
            </h1>
            <p className="mt-6 text-lg text-primary-100/80 leading-relaxed max-w-2xl">
              Access annotated genomes, transcriptomes, proteomes, gene models,
              and functional annotations for <em>Entamoeba</em> and related Amoebozoa species.
              Powered by data from VEuPathDB/AmoebaDB Release 68.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/organisms"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-800 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-primary-50 transition-all"
              >
                Browse Organisms <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 px-6 py-3 border border-primary-400/30 text-primary-200 font-medium rounded-xl hover:bg-primary-800/50 transition-all"
              >
                Learn More
              </Link>
              <a
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 border border-primary-400/30 text-primary-200 font-medium rounded-xl hover:bg-primary-800/50 transition-all"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Stats Bar ========== */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Download progress banner */}
          {isDownloading && dlProgress && (
            <div className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-semibold text-sm">
                    Downloading Release 68 — {dlProgress.phase}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {dlProgress.completed} / {dlProgress.totalFiles} files
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5">
                <div
                  className="bg-white rounded-full h-2.5 transition-all duration-500"
                  style={{
                    width: `${dlProgress.totalFiles ? Math.round((dlProgress.completed / dlProgress.totalFiles) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {STATS_CARDS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 text-center hover:shadow-xl transition-shadow group"
              >
                <div className={`w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{loading ? '…' : stat.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== All Organisms Grid ========== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">All Organisms</h2>
            <p className="mt-2 text-slate-500">
              Browse {organisms.length} organisms with genomic datasets. Click any organism to explore its data.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search organisms..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
        </div>
        {orgLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <span className="ml-3 text-slate-500">Loading organisms...</span>
          </div>
        ) : filteredOrganisms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No organisms match your search</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrganisms.map((org) => (
              <Link key={org.key} to={`/organisms?selected=${org.key}`}
                className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    org.curated
                      ? 'bg-emerald-100 text-emerald-600 group-hover:bg-primary-100 group-hover:text-primary-600'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                  }`}>
                    <Microscope className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 group-hover:text-primary-700 transition-colors truncate">
                      <em>{org.shortName}</em>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{org.name}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {org.curated && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Curated</span>
                      )}
                      <span className="text-[10px] text-slate-400">{org.totalFiles} file{org.totalFiles !== 1 ? 's' : ''}</span>
                      {org.totalSize > 0 && (
                        <span className="text-[10px] text-slate-400">· {formatBytes(org.totalSize)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ========== Image Gallery ========== */}
      <section className="bg-slate-100/60 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Featured Images</h2>
            <p className="mt-3 text-slate-500">Microscopy and molecular visualizations of <em>Entamoeba</em> species</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {IMAGES.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(img)}
                className="group text-left bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-primary-300"
              >
                <div className="aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 p-3">
                  <img
                    src={img.src}
                    alt={img.caption}
                    className="w-full h-full object-contain rounded-xl bg-white shadow-sm group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">{img.caption}</p>
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-md">View full</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Image Lightbox ========== */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setActiveImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-6xl mx-auto h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 text-slate-700 hover:bg-white transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <div className="w-full max-h-full bg-white rounded-2xl shadow-2xl p-3 sm:p-5">
              <div className="h-[65vh] sm:h-[75vh] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src={activeImage.src}
                  alt={activeImage.caption}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base font-medium text-slate-700">{activeImage.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========== About Preview ========== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-primary-800 to-primary-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold">About <em>Entamoeba</em></h2>
            <p className="mt-4 text-primary-100/80 leading-relaxed">
              Parasites of the genus <em>Entamoeba</em> are single-celled eukaryotes
              that infect all classes of vertebrates. <em>E.&nbsp;histolytica</em> is
              the third leading cause of parasitic disease mortality, responsible for
              50,000–100,000 deaths annually. Understanding their genomes is crucial for
              diagnosis, drug development, and epidemiology.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white text-primary-800 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
            >
              Read More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
