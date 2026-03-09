import { FlaskConical, Github, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">AmoebaDB</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              A comprehensive genomics resource for <em>Entamoeba</em> species,
              providing access to annotated genomes, transcriptomes, proteomes,
              and more from AmoebaDB Release 68.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://amoebadb.org" target="_blank" rel="noopener noreferrer"
                   className="hover:text-primary-400 transition-colors inline-flex items-center gap-1">
                  AmoebaDB Official <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://veupathdb.org" target="_blank" rel="noopener noreferrer"
                   className="hover:text-primary-400 transition-colors inline-flex items-center gap-1">
                  VEuPathDB <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://www.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer"
                   className="hover:text-primary-400 transition-colors inline-flex items-center gap-1">
                  NCBI <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Data Info */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Data Source</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              All genomic data is sourced from AmoebaDB Release 68, part of the
              VEuPathDB Bioinformatics Resource Center, funded by NIAID/NIH and
              the Wellcome Trust.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AmoebaDB Browser &mdash; BTP Project. Data from VEuPathDB.
          </p>
          <p className="text-xs text-slate-500">
            Built with React + Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
