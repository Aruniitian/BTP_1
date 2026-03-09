import { BookOpen, Microscope, FlaskConical, Pill, AlertTriangle, ExternalLink } from 'lucide-react';

const SECTIONS = [
  {
    id: 'overview',
    title: 'What is VEuPathDB?',
    icon: BookOpen,
    content: `VEuPathDB (Eukaryotic Pathogen, Vector, and Host Informatics Resource) is an integrated
      online database — a one-stop-shop for scientists to access, mine, and visualize massive amounts
      of "omics" data (genomic, transcriptomic, proteomic, etc.) related to infectious diseases.
      It allows researchers to ask complex biological questions and form new hypotheses by exploring
      and connecting different types of data. Funded by the NIH/NIAID and the Wellcome Trust.`,
  },
  {
    id: 'entamoeba',
    title: 'About Entamoeba',
    icon: Microscope,
    content: `Parasites assigned to the genus Entamoeba are single-celled eukaryotes that infect all classes
      of vertebrates. All species have a simple life cycle consisting of an infective cyst stage and a
      multiplying trophozoite stage. Transmission occurs via ingestion of cysts in faecally contaminated
      food or water.

      Entamoeba histolytica is the third leading cause of morbidity and mortality due to parasitic disease
      in humans (after malaria and schistosomiasis), responsible for 50,000–100,000 deaths annually.
      Infection can lead to amoebic dysentery and amoebic liver abscess.

      Recent research has revealed that what was previously called "E. histolytica" actually comprises two
      morphologically identical species: E. histolytica (capable of causing invasive disease) and E. dispar
      (non-pathogenic). A third species, E. moshkovskii, has also been found to be more common in humans
      than previously thought.`,
  },
  {
    id: 'data-types',
    title: 'Data Types Available',
    icon: FlaskConical,
    content: null,
    list: [
      { term: 'Genomics', desc: 'Complete genome sequences, gene annotations, gene models, and comparative genomics.' },
      { term: 'Transcriptomics', desc: 'RNA-Seq and microarray data showing gene expression across conditions and life cycle stages, including single-cell RNA-Seq.' },
      { term: 'Proteomics', desc: 'Mass spectrometry evidence of protein expression, post-translational modifications, and AlphaFold predicted structures.' },
      { term: 'Population Genetics', desc: 'SNPs and indels from different strains and clinical isolates for tracking drug resistance.' },
      { term: 'Metabolic Pathways', desc: 'Curated pathways showing the metabolic capabilities of organisms.' },
      { term: 'Epidemiological Data', desc: 'Geographic locations, insecticide resistance monitoring, and clinical study results.' },
    ],
  },
  {
    id: 'diagnosis',
    title: 'Diagnosis & Treatment',
    icon: Pill,
    content: `Only one class of drugs is used to treat invasive E. histolytica disease: the 5-nitroimidazoles,
      of which metronidazole (Flagyl) is most widely available. Differentiation among Entamoeba species is
      critical for accurate diagnosis and to prevent unnecessary chemotherapy. The two species E. histolytica
      and E. dispar are morphologically identical; differentiation relies on isoenzyme, antigen, and/or DNA
      analyses. Commercial kits are available for differentiation directly from faecal samples.`,
  },
  {
    id: 'importance',
    title: 'Research Importance',
    icon: AlertTriangle,
    content: `We may be one drug-resistance mutation away from a catastrophe. To date, no evidence of
      resistance to metronidazole has emerged, but the reliance on a single drug class makes this a
      critical area of concern. Priority research areas include improved diagnostic methods appropriate
      for developing countries, accurate prevalence data, molecular epidemiological studies, and data
      on asymptomatic carriers and their likelihood of progression to invasive disease.`,
  },
];

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Title */}
      <div className="text-center mb-14">
        <h1 className="text-3xl font-bold text-slate-900">
          About <em>Entamoeba</em> &amp; VEuPathDB
        </h1>
        <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
          Understanding the genomics, biology, and clinical significance of <em>Entamoeba</em> parasites
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map((sec) => (
          <section
            key={sec.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <sec.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{sec.title}</h2>
                {sec.content && (
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </p>
                )}
                {sec.list && (
                  <dl className="mt-4 space-y-3">
                    {sec.list.map((li) => (
                      <div key={li.term}>
                        <dt className="text-sm font-semibold text-slate-700">{li.term}</dt>
                        <dd className="text-sm text-slate-500 leading-relaxed">{li.desc}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* External Links */}
      <div className="mt-12 p-6 bg-primary-50 rounded-2xl border border-primary-100">
        <h3 className="font-bold text-primary-800 mb-4">External Resources</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'AmoebaDB', url: 'https://amoebadb.org' },
            { label: 'VEuPathDB', url: 'https://veupathdb.org' },
            { label: 'NCBI', url: 'https://www.ncbi.nlm.nih.gov' },
            { label: 'WHO Amoebiasis', url: 'https://www.who.int/health-topics/amoebiasis' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-primary-200 rounded-xl text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
            >
              {link.label} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
